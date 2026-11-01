import assert from "node:assert/strict";
import test from "node:test";
import catalogue from "../src/data/catalogue/liftCatalogue.json" with { type: "json" };
import { ALTIS_QUOTATION_TEMPLATE as template } from "../src/templates/altisQuotationTemplate.js";
import { getWorkflowProgress, overallCompletion, workflowSectionForPath } from "../src/models/quotation/workflow.js";
import {
  amountInWords, applyConfiguration, composeAttention, composeCapacity, composeQuantityAndType, composeReference, composeSubject, createQuotation,
  formatDimensions, formatInr, getConfigurationSwitchImpact, isQuotationExportReady, migrateDraft, resolveQuotationDocument, restoreMaterial, restoreTechnical,
  setDimensionValue, setMaterialOverride, setTechnicalOverride, setUpperFloors, suggestFinancialYear,
} from "../src/models/quotation/quotation.js";

const record = catalogue.records[0];
const alternative = catalogue.records[1];
function completeQuote() {
  const quote = applyConfiguration(createQuotation(template), record);
  quote.reference = { quotationNumber: "0691", officeCode: "VJA", financialYear: "2023-24" };
  quote.metadata = { date: "2023-12-23", preparedByName: "Executive" };
  quote.customer = { ...quote.customer, salutation: "Mrs.", address: "Pothineni vari street\nMachavaram\nVijayawada", attentionName: "J. Suseela Rani", projectLocation: "Vijayawada" };
  Object.assign(quote.lift.project, { capacity: "6 Persons - Maximum Load - 408 Kgs", travelHeight: "G + 4", floors: "Ground + 4 Upper landings - 5 Stops", landings: "Ground + 4 Upper landings - 5 Stops", shaftMeasurement: "1600 x 1600 mm", carSize: "1100 x 1100 mm", cabinCutting: "CNC Cutting", cabinOpening: "800 mm" });
  Object.assign(quote.commercial, { priceAmount: "900000", taxDescription: "GST Included", packingForwarding: "4% Included", delivery: "01 month from order confirmation", transportOctroi: "Included" });
  Object.assign(quote.commercial.payment, { advance: "35", dispatch: "55", completion: "10" });
  return quote;
}

test("composes approved structured reference, attention, and subject", () => {
  const quote = completeQuote();
  assert.equal(composeReference(quote.reference, template), "AE/QUO/0691/VJA/2023-24");
  assert.equal(composeAttention(quote.customer), "Mrs. J. Suseela Rani");
  assert.equal(composeSubject(quote.customer), "Quotation for supply of Lift, Vijayawada.");
});
test("catalogue autofill preserves traceability and never mutates source", () => {
  const quote = applyConfiguration(createQuotation(template), record);
  const resolved = resolveQuotationDocument(quote, catalogue, template);
  assert.equal(resolved.provenance.catalogueId, record.sourceRecordId);
  assert.equal(resolved.provenance.catalogueSourceRow, record.sourceRow);
  assert.equal(resolved.pages.installation.technical.speed, record.technical.speed);
  assert.equal(record.technical.speed, catalogue.records[0].technical.speed);
});
test("technical override restores its actual catalogue standard", () => {
  let quote = completeQuote();
  quote = setTechnicalOverride(quote, "speed", "0.75 mtr/sec", catalogue, template);
  assert.equal(resolveQuotationDocument(quote, catalogue, template).pages.installation.technical.speed, "0.75 mtr/sec");
  quote = restoreTechnical(quote, "speed");
  assert.equal(resolveQuotationDocument(quote, catalogue, template).pages.installation.technical.speed, record.technical.speed);
});
test("materials share technical values and template materials remain editable", () => {
  let quote = completeQuote();
  let resolved = resolveQuotationDocument(quote, catalogue, template);
  assert.equal(resolved.pages.materials.rows.find((row) => row.key === "controlPanel").value, record.technical.controller);
  quote = setMaterialOverride(quote, "flooring", "Granite finish", template);
  resolved = resolveQuotationDocument(quote, catalogue, template);
  assert.equal(resolved.pages.materials.rows.find((row) => row.key === "flooring").value, "Granite finish");
});
test("configuration switching requires an explicit choice when customizations exist", () => {
  let quote = completeQuote();
  quote = setTechnicalOverride(quote, "speed", "0.75 mtr/sec", catalogue, template);
  const impact = getConfigurationSwitchImpact(quote, alternative);
  assert.equal(impact.requiresConfirmation, true);
  assert.equal(impact.overrideCount, 1);
  quote = applyConfiguration(quote, alternative, { preserveOverrides: false });
  assert.equal(Object.keys(quote.lift.technicalOverrides).length, 0);
});
test("INR formatting and amount words follow Indian grouping", () => {
  assert.equal(formatInr("900000"), "₹9,00,000");
  assert.equal(amountInWords("900000"), "Rupees Nine Lakh Only");
});
test("resolver exposes missing values instead of inventing fallbacks", () => {
  const resolved = resolveQuotationDocument(createQuotation(template), catalogue, template);
  assert.ok(resolved.missing.some((entry) => entry.path === "lift.project.capacity"));
  assert.equal(resolved.pages.installation.quantityType, "");
});
test("template constants are available in resolved warranty and obligations pages", () => {
  const resolved = resolveQuotationDocument(completeQuote(), catalogue, template);
  assert.equal(resolved.pages.warranty.title, "WARRANTY");
  assert.equal(resolved.pages.obligations.title, "CUSTOMER CONTRACT OBLIGATIONS");
});
test("version one drafts migrate to structured reference and overrides", () => {
  const old = { schemaVersion: 1, quotation: { metadata: { referenceNumber: "AE/QUO/0691/VJA/2023-24", date: "2023-12-23", preparedByName: "Executive" }, customer: { attention: "Mrs. A", address: "Address", projectLocation: "VJA", subject: "Custom" }, lifts: [{ catalogueId: "1", catalogueSourceRow: 4, quantity: "1", specificationOverrides: { speed: "0.7" } }], commercial: { priceAmount: "900000", payment: { advancePercentage: "35", dispatchPercentage: "55", completionPercentage: "10" } } } };
  const migrated = migrateDraft(old, template);
  assert.deepEqual(migrated.reference, { quotationNumber: "0691", officeCode: "VJA", financialYear: "2023-24" });
  assert.equal(migrated.lift.technicalOverrides.speed, "0.7");
});
test("review and resolver use the same effective data", () => {
  const quote = completeQuote();
  const resolved = resolveQuotationDocument(quote, catalogue, template);
  assert.equal(resolved.missing.length, 0);
  assert.equal(resolved.pages.cover.reference, composeReference(quote.reference, template));
});
test("resolved document maps all twelve PDF material rows and commercial output", () => {
  const resolved = resolveQuotationDocument(completeQuote(), catalogue, template);
  assert.equal(resolved.pages.materials.rows.length, 12);
  assert.equal(resolved.pages.materials.rows.find((row) => row.key === "rope").value, record.technical.rope);
  assert.equal(resolved.pages.priceSchedule.price.formatted, "₹9,00,000");
  assert.equal(resolved.pages.priceSchedule.footer.date, "2023-12-23");
});
test("resolver blocks excessive values before they can clip in the PDF", () => {
  const quote = completeQuote();
  quote.customer.address = "A".repeat(301);
  const resolved = resolveQuotationDocument(quote, catalogue, template);
  assert.ok(resolved.missing.some((entry) => entry.path === "customer.address" && entry.label.includes("layout limit")));
});
test("suggests Indian financial years from quotation dates", () => {
  assert.equal(suggestFinancialYear("2026-03-31"), "2025-26");
  assert.equal(suggestFinancialYear("2026-04-01"), "2026-27");
});
test("structured floors and dimensions populate the existing PDF project fields", () => {
  let quote = createQuotation(template);
  quote = setUpperFloors(quote, "4");
  quote = setDimensionValue(quote, "shaft", "width", "1600");
  quote = setDimensionValue(quote, "shaft", "depth", "1500");
  quote = setDimensionValue(quote, "car", "width", "1100");
  quote = setDimensionValue(quote, "car", "depth", "1400");
  quote = setDimensionValue(quote, "car", "height", "2200");
  assert.equal(quote.lift.project.floors, "Ground + 4 Upper landings – 5 Stops");
  assert.equal(quote.lift.project.landings, "Ground + 4 Upper landings – 5 Stops");
  assert.equal(quote.lift.project.shaftMeasurement, "1600 × 1500 mm");
  assert.equal(quote.lift.project.carSize, "1100 × 1400 × 2200 mm");
  assert.equal(formatDimensions(["800", "2100"]), "800 × 2100 mm");
});
test("material restoration returns the approved standard value", () => {
  let quote = setMaterialOverride(createQuotation(template), "flooring", "Granite", template);
  quote = restoreMaterial(quote, "flooring");
  assert.equal(Object.hasOwn(quote.materials.overrides, "flooring"), false);
});
test("version two drafts migrate without dropping legacy project descriptions", () => {
  const current = completeQuote();
  const migrated = migrateDraft({ schemaVersion: 2, quotation: current }, template);
  assert.equal(migrated.lift.installation.floorMode, "custom");
  assert.equal(migrated.lift.project.shaftMeasurement, "1600 x 1600 mm");
  assert.equal(migrated.customer.name, current.customer.name);
});
test("detailed Quantity & Type comes from the selected workbook configuration", () => {
  const quote = completeQuote();
  const resolved = resolveQuotationDocument(quote, catalogue, template);
  assert.equal(resolved.pages.installation.quantityAndType, "1 No Altis Lift - MS Collapsible Gate Lift Hydraulic");
  assert.equal(composeQuantityAndType("1", record.quantityType), resolved.pages.installation.quantityAndType);
  assert.equal(resolved.pages.installation.quantityType, record.quantityType);
});
test("explicit passenger and load values are shared by installation and price pages", () => {
  const quote = completeQuote();
  quote.lift.project = { ...quote.lift.project, capacity: "", passengerCount: "6", maximumLoadKg: "408" };
  const resolved = resolveQuotationDocument(quote, catalogue, template);
  assert.equal(composeCapacity(quote.lift.project), "6 Persons - Maximum Load - 408 Kgs");
  assert.equal(resolved.pages.installation.project.capacity, "6 Persons - Maximum Load - 408 Kgs");
  assert.equal(resolved.pages.priceSchedule.capacity, "6 Persons - Maximum Load - 408 Kgs");
});
test("new quotations use approved non-price commercial defaults and keep them overridable", () => {
  const quote = createQuotation(template);
  assert.equal(quote.commercial.packingForwarding, "4 % Included");
  assert.equal(quote.commercial.delivery, "01 month from the date of confirmation of Order");
  assert.deepEqual(quote.commercial.payment, { advance: "35", dispatch: "55", completion: "10" });
  quote.commercial.delivery = "02 months from order confirmation";
  assert.equal(quote.commercial.delivery, "02 months from order confirmation");
});
test("optional blank dimensions and auto rescue detail do not prevent export", () => {
  const quote = completeQuote();
  quote.lift.project.shaftMeasurement = "";
  quote.lift.project.carSize = "";
  quote.lift.project.cabinOpening = "";
  const resolved = resolveQuotationDocument(quote, catalogue, template);
  assert.equal(resolved.missing.some((entry) => ["lift.project.shaftMeasurement", "lift.project.carSize", "lift.project.cabinOpening"].includes(entry.path)), false);
  assert.equal(resolved.pages.materials.rows.find((row) => row.key === "autoRescueDevice").optional, true);
});
test("catalogue notes warn without blocking unrelated complete document values", () => {
  const issueRecord = catalogue.records.find((entry) => entry.dataQualityIssues.length > 0);
  const quote = completeQuote();
  quote.lift.catalogueId = issueRecord.sourceRecordId;
  quote.lift.catalogueSourceRow = issueRecord.sourceRow;
  quote.lift.technicalOverrides.rope = "8 mm approved rope";
  const resolved = resolveQuotationDocument(quote, catalogue, template);
  assert.ok(resolved.warnings.length > 0);
  assert.equal(resolved.missing.some((entry) => entry.path === "catalogue.dataQualityIssues"), false);
});
test("version three drafts receive commercial defaults without dropping structured installation data", () => {
  const current = completeQuote();
  current.lift.installation.upperFloors = "4";
  current.lift.installation.floorMode = "standard";
  current.commercial.packingForwarding = "";
  const migrated = migrateDraft({ schemaVersion: 3, quotation: current }, template);
  assert.equal(migrated.lift.installation.upperFloors, "4");
  assert.equal(migrated.commercial.packingForwarding, "4 % Included");
});
test("shared quotation values stay consistent across document pages", () => {
  const quote = completeQuote();
  const resolved = resolveQuotationDocument(quote, catalogue, template);
  assert.equal(resolved.pages.installation.quantity, resolved.pages.priceSchedule.quantity);
  assert.equal(resolved.pages.cover.subject.includes(quote.customer.projectLocation), true);
  assert.equal(resolved.pages.priceSchedule.projectLocation, quote.customer.projectLocation);
  assert.equal(resolved.pages.installation.footer.date, quote.metadata.date);
  assert.equal(resolved.pages.materials.footer.date, quote.metadata.date);
  assert.equal(resolved.pages.materials.rows.find((row) => row.key === "controlPanel").value, resolved.pages.installation.technical.controller);
  assert.equal(resolved.pages.materials.rows.find((row) => row.key === "rope").value, resolved.pages.installation.technical.rope);
  assert.equal(resolved.pages.materials.rows.find((row) => row.key === "motors").value, resolved.pages.installation.technical.motor);
});
test("incomplete quotations remain safe resolved drafts but cannot be downloaded", () => {
  const resolved = resolveQuotationDocument(createQuotation(template), catalogue, template);
  assert.equal(isQuotationExportReady(resolved), false);
  assert.equal(resolved.pages.installation.quantityAndType, "1 No Altis Lift");
  assert.equal(resolved.pages.installation.project.capacity, "");
  assert.equal(resolved.pages.priceSchedule.price.formatted, "");
});
test("the same resolved data drives preview readiness and final download readiness", () => {
  const complete = resolveQuotationDocument(completeQuote(), catalogue, template);
  assert.equal(isQuotationExportReady(complete), true);
  assert.equal(complete.pages.cover.reference, composeReference(completeQuote().reference, template));
  assert.equal(complete.pages.installation.project.capacity, complete.pages.priceSchedule.capacity);
});
test("workflow progress distinguishes untouched, attempted, current, and complete steps", () => {
  const incomplete = resolveQuotationDocument(createQuotation(template), catalogue, template);
  const initial = getWorkflowProgress(incomplete, new Set(["customer"]), new Set(), "customer");
  assert.equal(initial.find((step) => step.id === "customer").state, "current");
  assert.equal(initial.find((step) => step.id === "installation").state, "not-started");
  const attempted = getWorkflowProgress(incomplete, new Set(["customer", "installation"]), new Set(["installation"]), "customer");
  assert.equal(attempted.find((step) => step.id === "installation").state, "incomplete");
  const complete = getWorkflowProgress(resolveQuotationDocument(completeQuote(), catalogue, template), new Set(), new Set(), "customer");
  assert.equal(complete.find((step) => step.id === "materials").state, "complete");
});
test("workflow completion counts required fields and maps issues to editable sections", () => {
  const progress = getWorkflowProgress(resolveQuotationDocument(completeQuote(), catalogue, template));
  assert.deepEqual(overallCompletion(progress), { completed: 35, required: 35, percent: 100 });
  assert.equal(workflowSectionForPath("commercial.priceAmount"), "commercial");
  assert.equal(workflowSectionForPath("lift.project.capacity"), "installation");
});
