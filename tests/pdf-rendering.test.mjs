import assert from "node:assert/strict";
import test from "node:test";
import { renderQuotation, sampleCases, sampleQuotation } from "../scripts/pdf-test-support.mjs";
import { displayDate, displayPrice, displayCapacity, displayTravelHeight, displayDimensions, pdfOutputFileName } from "../src/pdf/documentPresentation.js";

test("PDF presentation formats resolved values without changing calculations or legacy wording", () => {
  assert.equal(displayDate("2026-11-02"), "02.11.2026");
  assert.equal(displayDate(""), "");
  assert.equal(displayDate("Saved date wording"), "Saved date wording");
  assert.equal(displayPrice("₹9,00,000"), "Rs. 9,00,000/-");
  assert.equal(displayPrice("₹0"), "Rs. 0/-");
  assert.equal(displayPrice("₹5,00,000 each"), "Rs. 5,00,000/- each");
  assert.equal(displayPrice(""), "");
  assert.equal(displayCapacity("6 Persons - Maximum Load - 408 Kgs"), "6 Persons, 408 Kg");
  assert.equal(displayCapacity("Legacy capacity description"), "Legacy capacity description");
});

test("PDF travel prefix preserves missing values and existing custom wording", () => {
  assert.equal(displayTravelHeight("4"), "G + 4");
  assert.equal(displayTravelHeight(5), "G + 5");
  assert.equal(displayTravelHeight("0"), "G + 0");
  for (const value of ["", " ", null, undefined]) assert.equal(displayTravelHeight(value), "");
  for (const value of ["G + 4", "G+4", "Ground + 4 upper floors", "Custom arrangement"]) assert.equal(displayTravelHeight(value), value);
});

test("PDF dimensions label axes without changing values, units or custom descriptions", () => {
  assert.equal(displayDimensions("1800 × 1650 mm", ["W", "D"]), "W 1800 mm × D 1650 mm");
  assert.equal(displayDimensions("1100 x 1400 x 2100 mm", ["W", "D", "H"]), "W 1100 mm × D 1400 mm × H 2100 mm");
  assert.equal(displayDimensions("1100 x 1400 mm", ["W", "D", "H"]), "W 1100 mm × D 1400 mm");
  assert.equal(displayDimensions("1800.5 x 1650", ["W", "D"]), "W 1800.5 × D 1650");
  for (const value of ["", null, undefined]) assert.equal(displayDimensions(value, ["W", "D"]), "");
  for (const value of ["W 1800 mm × D 1650 mm", "1800 (W) × 1650 (D) mm", "As per site", "1800 x", "180 x 165 cm", "1800 x 1650 x 2100 mm"]) assert.equal(displayDimensions(value, ["W", "D"]), value);
});

for (const [name, quotation] of Object.entries(sampleCases())) {
  test(`${name} quotation renders six actual Letter pages with embedded branding and no region overflow`, async () => {
    const original = JSON.stringify(quotation);
    const { buffer, layout, documentData } = await renderQuotation(quotation);
    const boxes = [...buffer.toString("latin1").matchAll(/\/MediaBox\s*\[([^\]]+)\]/g)].map((match) => match[1].trim().split(/\s+/).map(Number));
    assert.deepEqual(boxes, Array.from({ length: 6 }, () => [0, 0, 612, 792]));
    assert.ok((buffer.toString("latin1").match(/\/Subtype \/Image/g) ?? []).length >= 2);
    assert.ok(buffer.toString("latin1").includes("/Width 1570"), "The complete approved branding lockup is embedded at high resolution");
    assert.equal(layout.children.length, 6);
    assert.equal(documentData.pages.materials.rows.length, 13);
    assert.equal(JSON.stringify(quotation), original);
  });
  test(`${name} print-friendly quotation keeps six pages, body text and signature footers without branding`, async () => {
    const original = JSON.stringify(quotation);
    const { buffer, layout, documentData } = await renderQuotation(quotation, { variant: "printable" });
    assert.equal(layout.children.length, 6);
    assert.equal((buffer.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length, 6);
    assert.equal((buffer.toString("latin1").match(/\/Subtype\s*\/Image/g) ?? []).length, 0);
    const collect = (node) => (node.type === "TEXT_INSTANCE" ? node.value : "") + (node.children ?? []).map(collect).join("");
    const text = collect(layout);
    assert.ok(!text.includes(documentData.pages.cover.company.isoStatement));
    for (const page of layout.children.slice(1)) {
      const pageText = collect(page);
      assert.ok(pageText.includes(documentData.pages.installation.footer.executive));
      assert.ok(pageText.includes(documentData.pages.installation.footer.customer));
      assert.ok(pageText.includes(`Date: ${displayDate(quotation.metadata.date)}`));
    }
    for (const value of [documentData.pages.cover.reference, documentData.pages.installation.quantityAndType, ...documentData.pages.warranty.sections.flat(), ...documentData.pages.materials.rows.map((row) => row.value), ...documentData.pages.obligations.ours, ...documentData.pages.obligations.customer]) assert.ok(text.includes(value));
    assert.equal(JSON.stringify(quotation), original);
  });
}

test("PDF versions have distinct filenames without changing the branded filename", () => {
  assert.equal(pdfOutputFileName("AE-QUO-0001.pdf", "branded"), "AE-QUO-0001.pdf");
  assert.equal(pdfOutputFileName("AE-QUO-0001.pdf", "printable"), "AE-QUO-0001-print-friendly.pdf");
  assert.equal(pdfOutputFileName("AE-QUO-0001.PDF", "printable"), "AE-QUO-0001-print-friendly.pdf");
});

test("excessively long printable content fails explicitly instead of being clipped", async () => {
  const quotation = sampleQuotation();
  quotation.customer.address = Array.from({ length: 40 }, () => "Example address line").join("\n");
  await assert.rejects(renderQuotation(quotation), /Customer address exceeds its printable area/);
});

test("missing rope stays blank in a renderable draft instead of inheriting another model", async () => {
  const { createQuotation, applyConfiguration } = await import("../src/models/quotation/quotation.js");
  const { catalogue } = await import("../scripts/pdf-test-support.mjs");
  const { ALTIS_QUOTATION_TEMPLATE } = await import("../src/templates/altisQuotationTemplate.js");
  const record = catalogue.records.find((item) => String(item.sourceRecordId) === "16");
  const quote = applyConfiguration(createQuotation(ALTIS_QUOTATION_TEMPLATE), record);
  const { documentData } = await renderQuotation(quote);
  assert.ok(documentData.missing.some((entry) => entry.path === "materials.rope"));
  assert.equal(documentData.pages.materials.rows.find((row) => row.key === "rope").value, "");
});

test("a saved team model renders six pages from its snapshot without a server connection", async () => {
  const { applyConfiguration } = await import("../src/models/quotation/quotation.js");
  const { emptySharedModel, sharedModelPayload, sharedModelRecord } = await import("../src/models/catalogue/sharedModels.js");
  const input = { ...emptySharedModel(), quantityType: "Synthetic team configuration", liftType: "Example category", controller: "Example controller", motor: "Example motor", rope: "Example rope" };
  const record = sharedModelRecord(sharedModelPayload(input, "ab000001-1111-4222-8333-000000000001"));
  const { buffer, layout, documentData } = await renderQuotation(applyConfiguration(sampleQuotation(), record));
  assert.equal(layout.children.length, 6);
  assert.equal([...buffer.toString("latin1").matchAll(/\/MediaBox\s*\[([^\]]+)\]/g)].length, 6);
  assert.equal(documentData.pages.installation.quantityType, input.quantityType);
  assert.equal(documentData.pages.materials.rows.find((row) => row.key === "rope").value, input.rope);
});
