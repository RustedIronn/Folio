import assert from "node:assert/strict";
import test from "node:test";
import catalogue from "../src/data/catalogue/liftCatalogue.json" with { type:"json" };
import { approvedCatalogueRecord, catalogueCategories } from "../src/models/catalogue/catalogueCorrections.js";
import { emptySharedModel, quotationCatalogue, sharedModelPayload, sharedModelRecord } from "../src/models/catalogue/sharedModels.js";
import { searchCatalogue } from "../src/app/catalogueSearch.js";
import { applyConfiguration, createQuotation, resolveQuotationDocument, restoreTechnical, setTechnicalOverride } from "../src/models/quotation/quotation.js";
import { ALTIS_QUOTATION_TEMPLATE as template } from "../src/templates/altisQuotationTemplate.js";

const record = (id) => catalogue.records.find((row) => row.sourceRecordId === id);
const effective = () => quotationCatalogue(catalogue, []);

test("effective catalogue corrects wording without mutating Excel records or IDs", () => {
  const original = JSON.stringify(catalogue);
  const result = effective();
  assert.equal(result.records.length,49);
  for (const raw of catalogue.records) {
    const next = result.records.find((row) => row.sourceRecordId === raw.sourceRecordId);
    assert.equal(next.sourceRow,raw.sourceRow);
    assert.deepEqual(next.sourceValues,raw.sourceValues);
    assert.equal(approvedCatalogueRecord(next),next);
    for (const item of next.catalogueCorrections) {
      const source = item.path === "quantityType" ? raw.quantityType : raw.technical[item.path.split(".")[1]];
      assert.equal(item.sourceValue,source);
    }
  }
  assert.equal(JSON.stringify(catalogue),original);
  const corrected = result.records.find((row) => row.sourceRecordId === "12");
  assert.ok(corrected.quantityType.includes("Telescopic Door Lift"));
  assert.ok(!corrected.quantityType.includes("Gear- Gear"));
  assert.equal((corrected.quantityType.match(/\bGear\b/g)||[]).length,1);
});

test("category consolidation groups formatting variants without merging configurations or subtypes", () => {
  const prepared = effective();
  const categories = catalogueCategories(prepared.records);
  assert.equal(categories.filter((value) => /semi/i.test(value)).length,1);
  assert.ok(categories.includes("Semi MRL"));
  assert.ok(categories.includes("MRL Lift"));
  assert.ok(categories.includes("MRL Bed Lift"));
  assert.ok(categories.includes("MRL Stretcher Lift"));
  assert.ok(categories.includes("Pod Lift"));
  for (const filter of ["Semi MRL","SEMI MRL","semi mrl lift"]) {
    assert.deepEqual(searchCatalogue(prepared.records,{liftType:filter}).map((row) => row.sourceRecordId).sort(),["21","23","24","25","29"].sort());
  }
});

test("corrected and original catalogue wording remain searchable", () => {
  const prepared = effective();
  for (const search of ["tlescopic ligt","telescopic lift","micro processor","microprocessor"]) {
    assert.ok(searchCatalogue(prepared.records,{search}).some((row) => row.sourceRecordId === "12"),search);
  }
});

test("approved rope correction is limited to the four exact source records; missing rope stays missing", () => {
  for (const id of ["31","32","34","35"]) {
    const next = approvedCatalogueRecord(record(id));
    assert.equal(next.technical.rope,"13 mm Usha Martin");
    assert.ok(next.catalogueCorrections.some((item) => item.path === "technical.rope" && item.sourceValue === "1 3 mm Usha Martin"));
    assert.equal(record(id).technical.rope,"1 3 mm Usha Martin");
  }
  assert.equal(approvedCatalogueRecord(record("16")).technical.rope,record("16").technical.rope);
  const unusual = {...record("1"),technical:{...record("1").technical,rope:"1 3 mm other rope"}};
  assert.equal(approvedCatalogueRecord(unusual).technical.rope,"1 3 mm other rope");
});

test("POD and OMAR identities, numeric precision and employee-added wording are preserved", () => {
  assert.equal(approvedCatalogueRecord(record("12")).technical.liftType,"Pod Lift");
  assert.equal(approvedCatalogueRecord(record("2")).technical.motor,"(Hydraulic power pack) OMAR- 7.5 kW");
  assert.equal(approvedCatalogueRecord(record("2")).technical.speed,"0.50 m/s");
  assert.equal(approvedCatalogueRecord(record("19")).technical.motor,"Geared traction - Montanari");
  const input={...emptySharedModel(),quantityType:"Employee Ligt description",liftType:"Employee category",rope:"1 3 mm custom rope"};
  const shared=sharedModelRecord(sharedModelPayload(input,"ab000001-1111-4222-8333-000000000001"));
  assert.equal(approvedCatalogueRecord(shared),shared);
  assert.equal(quotationCatalogue(catalogue,[shared]).records.at(-1).quantityType,input.quantityType);
});

test("resolver and restoration use corrected standards while explicit quotation overrides remain exact", () => {
  const prepared=effective();
  let q=applyConfiguration(createQuotation(template),record("31"));
  let resolved=resolveQuotationDocument(q,prepared,template);
  assert.equal(resolved.pages.installation.technical.rope,"13 mm Usha Martin");
  assert.equal(resolved.pages.materials.rows.find((row) => row.key === "rope").value,"13 mm Usha Martin");
  q=setTechnicalOverride(q,"rope","1 3 mm employee wording",prepared,template);
  assert.equal(resolveQuotationDocument(q,prepared,template).pages.installation.technical.rope,"1 3 mm employee wording");
  q=restoreTechnical(q,"rope");
  resolved=resolveQuotationDocument(q,prepared,template);
  assert.equal(resolved.pages.materials.rows.find((row) => row.key === "rope").value,"13 mm Usha Martin");
  assert.equal(q.schemaVersion,4);
  assert.equal(q.lift.catalogueSourceRow,record("31").sourceRow);
});

test("remaining model punctuation is corrected without reclassifying models or expanding acronyms", () => {
  assert.equal(approvedCatalogueRecord(record("19")).quantityType,"MS Swing Door - Gear");
  assert.ok(approvedCatalogueRecord(record("7")).quantityType.includes("Hydraulic Lift - Multi-opening"));
  assert.ok(!approvedCatalogueRecord(record("29")).quantityType.endsWith("-"));
  assert.ok(approvedCatalogueRecord(record("35")).quantityType.includes("IFG"));
  assert.equal(approvedCatalogueRecord(record("12")).technical.liftType,"Pod Lift");
  assert.equal(approvedCatalogueRecord(record("1")).technical.controller,"(i) Microprocessor Controller Down Collective");
});
