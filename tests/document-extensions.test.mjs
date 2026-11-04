import assert from "node:assert/strict";
import test from "node:test";
import { catalogue, sampleQuotation, renderQuotation } from "../scripts/pdf-test-support.mjs";
import { ALTIS_QUOTATION_TEMPLATE as template } from "../src/templates/altisQuotationTemplate.js";
import { composeReference, createQuotation, migrateDraft, restoreDraft, resolveQuotationDocument, serializeDraft, setTechnicalOverride } from "../src/models/quotation/quotation.js";
import { documentIdentity, officeSelectorValue, selectOfficeCode, setCustomOfficeCode, upsertCustomMaterial } from "../src/models/quotation/quotationExtensions.js";
import { entryOptionPayload, entryOptionRecord, validateEntryOption } from "../src/models/catalogue/sharedEntryOptions.js";
import { quotationCatalogue } from "../src/models/catalogue/sharedModels.js";
import { displayDimensions } from "../src/pdf/documentPresentation.js";

const resolve = (q) => resolveQuotationDocument(q, quotationCatalogue(catalogue, [], q), template);
const id = "10000000-0000-4000-8000-000000000001";
const collect = (node) => (node.type === "TEXT_INSTANCE" ? node.value : "") + (node.children ?? []).map(collect).join("");

test("document identity composes AGE references and agreement subjects without modifying legal clauses", () => {
  const q = sampleQuotation();
  assert.equal(createQuotation(template).document.type, "quotation");
  assert.equal(resolve(q).document.code, "QUO");
  q.document.type = "agreement";
  const doc = resolve(q);
  assert.equal(doc.document.label, "Agreement");
  assert.match(doc.pages.cover.reference, /^AE\/AGE\//);
  assert.match(doc.pages.cover.subject, /^Agreement for supply of Lift/);
  assert.deepEqual(doc.pages.cover.letter, template.coverLetter);
  assert.deepEqual(doc.pages.warranty.sections, template.warranty.sections);
  assert.deepEqual(doc.pages.obligations.customer, template.obligations.customer);
  assert.equal(doc.documentNotices.length, 1);
  q.customer.subjectMode = "custom"; q.customer.subjectCustom = "Employee-approved subject";
  assert.equal(resolve(q).pages.cover.subject, "Employee-approved subject");
  assert.equal(documentIdentity().type, "quotation");
});

test("custom office code survives standard selection, document changes and v4 restoration", () => {
  let q = selectOfficeCode(sampleQuotation(), "__custom__");
  q = setCustomOfficeCode(q, "TEST-2");
  assert.equal(officeSelectorValue(q.reference), "__custom__");
  q = selectOfficeCode(q, "VJA");
  assert.equal(q.reference.customOfficeCode, "TEST-2");
  q = selectOfficeCode(q, "__custom__"); q.document.type = "agreement";
  const restored = restoreDraft(serializeDraft(q), template);
  assert.equal(restored.reference.officeCode, "TEST-2");
  assert.equal(restored.document.type, "agreement");
  assert.match(resolve(restored).pages.cover.reference, /\/TEST-2\//);
  assert.equal(composeReference(restored.reference, template, restored.document.type), resolve(restored).pages.cover.reference);
  restored.document.type = "quotation";
  assert.match(resolve(restored).pages.cover.reference, /^AE\/QUO\//);
});

test("legacy v4 drafts receive additive defaults without losing custom values", () => {
  const old = sampleQuotation();delete old.document.type;delete old.materials.customRows;delete old.commercial.additionalEntry;
  old.reference = { quotationNumber:"001", officeCode:"SAVED", financialYear:"2023-24" };
  old.lift.technicalOverrides.motor = "Legacy motor wording";
  const before = structuredClone(old);
  const next = migrateDraft({schemaVersion:4, quotation:old}, template);
  assert.equal(next.schemaVersion, 4);assert.equal(next.document.type, "quotation");
  assert.equal(officeSelectorValue(next.reference), "__custom__");
  assert.deepEqual(next.materials.customRows, []);
  assert.equal(next.lift.technicalOverrides.motor, before.lift.technicalOverrides.motor);
  assert.deepEqual(old, before);
});

test("multiple quantities append each without changing entered amounts or informational-entry arithmetic", () => {
  const q = sampleQuotation();q.lift.quantity = "3";q.commercial.priceAmount = "750000";
  const baseline = resolve(q).pages.priceSchedule.price;
  q.commercial.additionalEntry = {label:"Site note", value:"Synthetic informational entry"};
  const doc = resolve(q);
  assert.deepEqual(doc.pages.priceSchedule.price, baseline);
  assert.equal(baseline.basis, "each");assert.equal(baseline.formatted, "₹7,50,000 each");
  assert.equal(baseline.amount,"750000");
  assert.equal(doc.pages.priceSchedule.quantity, doc.pages.installation.quantity);
  assert.equal(doc.pages.priceSchedule.additionalEntry.value, "Synthetic informational entry");
  q.commercial.additionalEntry = {label:"",value:""};assert.equal(resolve(q).pages.priceSchedule.additionalEntry, null);
  q.commercial.additionalEntry.value = "Missing label";
  assert.ok(resolve(q).missing.some((entry) => entry.path === "commercial.additionalEntry.label"));
});

test("landing protection resolves from the catalogue and stays synchronized with technical overrides", () => {
  const original = sampleQuotation();const doc = resolve(original);
  const row = doc.pages.materials.rows.find((entry) => entry.key === "landingProtection");
  assert.equal(row.value, doc.pages.installation.technical.landingProtection);assert.ok(row.value);
  const q = setTechnicalOverride(original,"landingProtection","Synthetic landing protection",quotationCatalogue(catalogue,[],original),template);
  assert.equal(resolve(q).pages.materials.rows.find((entry) => entry.key === "landingProtection").value, "Synthetic landing protection");
  assert.equal(resolve(q).pages.installation.technical.landingProtection, "Synthetic landing protection");
});

test("custom material names validate, survive serialization and stay outside the catalogue", () => {
  const input = {kind:"material",materialKey:"custom",customName:"Synthetic trim",specification:"Employee-entered finish"};
  const payload = entryOptionPayload(input,id);assert.equal(entryOptionRecord(payload).customName, input.customName);
  assert.ok(validateEntryOption({...input, customName:""}).customName);
  assert.ok(validateEntryOption({...input, specification:""}).specification);
  const q = upsertCustomMaterial(sampleQuotation(),{id,name:input.customName,value:input.specification});
  const next = restoreDraft(serializeDraft(q),template);
  const row = resolve(next).pages.materials.rows.find((entry) => entry.source === "custom");
  assert.equal(row.label, input.customName);assert.equal(row.value,input.specification);
  assert.equal(catalogue.records.length,49);
  next.materials.customRows[0].name = "";
  assert.ok(resolve(next).missing.some((entry) => entry.path === "materials.customRows.0.name"));
});

test("dimension units repeat per structured axis while preformatted custom text stays untouched", () => {
  assert.equal(displayDimensions("1800 × 1650 mm",["W","D"]),"W 1800 mm × D 1650 mm");
  assert.equal(displayDimensions("1100 × 1400 × 2100 mm",["W","D","H"]),"W 1100 mm × D 1400 mm × H 2100 mm");
  for(const custom of ["W 1800 mm × D 1650 mm","1800 mm x 1650 mm","As per site","1800 x"])assert.equal(displayDimensions(custom,["W","D"]),custom);
});

for (const type of ["quotation","agreement"]) for (const variant of ["branded","printable"]) {
  test(`${type} ${variant} PDF retains six pages with custom materials, each-price presentation and informational entry`, async () => {
    let q = sampleQuotation();q.document.type = type;q.lift.quantity = "2";
    q = setCustomOfficeCode(q,"TEST");q.commercial.priceAmount = "750000";
    q.commercial.additionalEntry = {label:"Site note",value:"Synthetic entry; total unchanged"};
    q.lift.project.shaftMeasurement = "1800 × 1650 mm";
    q = upsertCustomMaterial(q,{id,name:"Synthetic trim",value:"Employee-entered finish"});
    const result = await renderQuotation(q,{variant});
    assert.equal(result.layout.children.length,6);
    const text = collect(result.layout);
    assert.ok(text.includes(type === "agreement" ? "AE/AGE/" : "AE/QUO/"));
    for (const expected of ["Synthetic trim","Employee-entered finish","Landing protection","Site note:","Synthetic entry; total unchanged","Rs. 7,50,000/- each","W 1800 mm × D 1650 mm"]) assert.ok(text.includes(expected),expected);
    assert.ok(!text.includes("undefined"));assert.ok(text.includes("Rupees Seven Lakh Fifty Thousand Only each"));assert.ok(!text.includes("total for"));
    const installation = result.layout.children[1];
    function findBold(node) { return (node.type === "TEXT" && collect(node).includes(result.documentData.pages.installation.quantityAndType) && node.style?.fontFamily === "Times-Bold") || (node.children ?? []).some(findBold); }
    assert.ok(findBold(installation),"Lift model description uses the bold PDF font");
    assert.ok(text.includes("Executive Signature:"));
    assert.equal((result.buffer.toString("latin1").match(/\/Subtype\s*\/Image/g) ?? []).length === 0, variant === "printable");
  });
}

test("six custom material rows stay on the shared material page within the supported limits", async () => {
  let q=sampleQuotation();
  for(let i=0;i<6;i++) q=upsertCustomMaterial(q,{id:"synthetic-"+i,name:"Synthetic material "+i,value:"Synthetic specification for the installation finish and accessories. ".repeat(3).slice(0,180)});
  const {layout}=await renderQuotation(q,{variant:"printable"});assert.equal(layout.children.length,6);
  assert.ok(collect(layout.children[4]).includes("Synthetic material 5"));
  assert.throws(()=>upsertCustomMaterial(q,{id:"overflow",name:"Extra",value:"Extra"}),/six custom/);
});

test("client each convention preserves the exact entered amount for both document types and all quantities", () => {
  for(const type of ["quotation","agreement"]) for(const quantity of ["1","2","4"]) {
    const q=sampleQuotation();q.document.type=type;q.lift.quantity=quantity;q.commercial.priceAmount="500000";
    const before=structuredClone(q);const doc=resolve(q);const price=doc.pages.priceSchedule.price;
    assert.equal(price.amount,"500000");
    assert.equal(price.formatted,quantity === "1" ? "₹5,00,000" : "₹5,00,000 each");
    assert.equal(price.words,quantity === "1" ? "Rupees Five Lakh Only" : "Rupees Five Lakh Only each");
    assert.equal(doc.pages.priceSchedule.taxDescription,q.commercial.taxDescription);
    assert.equal(doc.pages.priceSchedule.payment[0].percentage,q.commercial.payment.advance);
    assert.deepEqual(q,before);
  }
  const empty=sampleQuotation();empty.lift.quantity="2";empty.commercial.priceAmount="";
  assert.equal(resolve(empty).pages.priceSchedule.price.formatted,"");
  assert.equal(resolve(empty).pages.priceSchedule.price.words,"");
  empty.commercial.priceAmount="0";
  assert.equal(resolve(empty).pages.priceSchedule.price.formatted,"₹0 each");
});
