import assert from "node:assert/strict";
import test from "node:test";
import { renderQuotation, sampleCases, sampleQuotation } from "../scripts/pdf-test-support.mjs";
import { displayDate, displayPrice, displayCapacity } from "../src/pdf/documentPresentation.js";

test("PDF presentation formats resolved values without changing calculations or legacy wording", () => {
  assert.equal(displayDate("2026-11-02"), "02.11.2026");
  assert.equal(displayDate(""), "");
  assert.equal(displayDate("Saved date wording"), "Saved date wording");
  assert.equal(displayPrice("₹9,00,000"), "Rs. 9,00,000/-");
  assert.equal(displayPrice("₹0"), "Rs. 0/-");
  assert.equal(displayPrice(""), "");
  assert.equal(displayCapacity("6 Persons - Maximum Load - 408 Kgs"), "6 Persons, 408 Kg");
  assert.equal(displayCapacity("Legacy capacity description"), "Legacy capacity description");
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
    assert.equal(documentData.pages.materials.rows.length, 12);
    assert.equal(JSON.stringify(quotation), original);
  });
}

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
