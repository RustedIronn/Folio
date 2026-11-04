import assert from "node:assert/strict";
import test from "node:test";
import { applyCapacityChoice, capacityChoice, materialChoices, technicalChoices, taxTreatmentChoices } from "../src/app/entryOptions.js";
import { ALTIS_QUOTATION_TEMPLATE as template } from "../src/templates/altisQuotationTemplate.js";
import { altisTotalFloors, createQuotation, setDimensionValue, setFloorMode, setUpperFloors, resolveQuotationDocument } from "../src/models/quotation/quotation.js";
import catalogue from "../src/data/catalogue/liftCatalogue.json" with { type: "json" };
import { applyConfiguration, setTechnicalOverride, restoreTechnical } from "../src/models/quotation/quotation.js";

test("tax shortcuts preserve template wording and never change quotation amounts", () => {
  const quote = createQuotation(template);
  const choices = taxTreatmentChoices(template);
  assert.equal(choices[0].value, template.commercial.taxDescription);
  assert.ok(choices.some((choice) => choice.value === "100%GST bill Included"));
  quote.commercial.taxDescription = choices.at(-1).value;
  quote.commercial.priceAmount = "123456";
  const resolved = resolveQuotationDocument(quote, catalogue, template);
  assert.equal(resolved.pages.priceSchedule.taxDescription, "100%GST bill Included");
  assert.equal(quote.commercial.priceAmount, "123456");
  quote.commercial.taxDescription = "Custom tax wording";
  assert.equal(resolveQuotationDocument(quote, catalogue, template).pages.priceSchedule.taxDescription, "Custom tax wording");
});

test("technical shortcuts use only the correct catalogue field and preserve canonical overrides", () => {
  const quote = applyConfiguration(createQuotation(template), catalogue.records[0]);
  const original = JSON.stringify(catalogue);
  for (const key of ["speed", "doorFrame", "motor", "controller", "rope", "carProtectionDoor", "landingProtection"]) {
    const choices = technicalChoices(key, catalogue);
    assert.ok(choices.length > 1);
    assert.ok(choices.every((choice) => catalogue.records.some((record) => record.technical[key] === choice.value)));
  }
  assert.deepEqual(technicalChoices("liftType", catalogue), []);
  assert.deepEqual(technicalChoices("autoRescueDeviceNote", catalogue), []);
  assert.ok(!technicalChoices("rope", catalogue).some((choice) => choice.value.startsWith("1 3")));
  const value = technicalChoices("controller", catalogue).at(-1).value;
  const custom = setTechnicalOverride(quote, "controller", value, catalogue, template);
  const resolved = resolveQuotationDocument(custom, catalogue, template);
  assert.equal(resolved.pages.installation.technical.controller, value);
  assert.equal(resolved.pages.materials.rows.find((row) => row.key === "controlPanel").value, value);
  assert.equal(resolveQuotationDocument(restoreTechnical(custom, "controller"), catalogue, template).pages.installation.technical.controller, catalogue.records[0].technical.controller);
  assert.equal(JSON.stringify(catalogue), original);
});

test("capacity shortcuts require an explicit choice and preserve unrelated/custom data", () => {
  const original = createQuotation(template);
  original.lift.project.travelHeight = "saved wording";
  const selected = applyCapacityChoice(original, "6");
  assert.equal(original.lift.project.passengerCount, "");
  assert.equal(capacityChoice(selected.lift.project), "6");
  assert.equal(selected.lift.project.maximumLoadKg, "408");
  assert.equal(selected.lift.project.travelHeight, "saved wording");
  assert.equal(applyCapacityChoice(selected, "custom"), selected);
  assert.equal(capacityChoice({ passengerCount: "6", maximumLoadKg: "450" }), "custom");
  const document = resolveQuotationDocument(selected, catalogue, template);
  assert.equal(document.pages.installation.project.capacity, document.pages.priceSchedule.capacity);
});

test("material suggestions retain the actual template standard and have no effect until chosen", () => {
  const original = createQuotation(template);
  const choices = materialChoices("cabin", template);
  assert.equal(choices[0].value, "SS Cabin");
  assert.ok(choices.some((option) => option.value === "MS Cabin"));
  assert.equal(new Set(choices.map((option) => option.value)).size, choices.length);
  assert.deepEqual(original.materials.overrides, {});
  assert.deepEqual(materialChoices("rope", template), []);
});

test("Altis travel count includes Ground and updates only on explicit floor edits", () => {
  assert.equal(altisTotalFloors("4"), "5");
  assert.equal(altisTotalFloors("0"), "1");
  assert.equal(altisTotalFloors(""), "");
  assert.equal(altisTotalFloors("-1"), "");
  const original = createQuotation(template);
  original.lift.project.travelHeight = "G + 4 saved text";
  assert.equal(setDimensionValue(original, "shaft", "width", "1000").lift.project.travelHeight, "G + 4 saved text");
  const standard = setUpperFloors(original, "4");
  assert.equal(standard.lift.project.travelHeight, "5");
  assert.equal(standard.lift.project.floors, "Ground + 4 Upper landings – 5 Stops");
  assert.equal(original.lift.project.travelHeight, "G + 4 saved text");
  const custom = setFloorMode(standard, "custom");
  custom.lift.project.travelHeight = "Custom arrangement";
  assert.equal(setUpperFloors(custom, "7").lift.project.travelHeight, "Custom arrangement");
  assert.equal(setFloorMode(custom, "standard").lift.project.travelHeight, "5");
});

test("material choices pin the standard, remove formatting duplicates and retain exact team wording", () => {
  const custom="Hand-finished synthetic cabin specification";
  const rows=[{kind:"material",materialKey:"cabin",specification:"ss cabin."},{kind:"material",materialKey:"cabin",specification:custom}];
  const before=JSON.stringify(rows);
  const choices=materialChoices("cabin",template,rows);
  assert.equal(choices[0].value,"SS Cabin");
  assert.equal(choices.filter((option) => /^ss cabin\.?$/i.test(option.value)).length,1);
  assert.ok(choices.some((option) => option.value===custom));
  assert.equal(JSON.stringify(rows),before);
});
test("numeric technical choices sort by value, preserve precision and keep distinct specifications", () => {
  const speedCatalogue={records:["1.00 m/s","0.80 m/s","0.50 m/s","0.5 mtr/sec"].map((speed) => ({technical:{speed}}))};
  assert.deepEqual(technicalChoices("speed",speedCatalogue).map((option) => option.value),["0.50 m/s","0.80 m/s","1.00 m/s"]);
  const frameCatalogue={records:["SS Door Frame","ss door frame.","SS Door Frames"].map((doorFrame) => ({technical:{doorFrame}}))};
  assert.equal(technicalChoices("doorFrame",frameCatalogue).length,2);
  const ropeCatalogue={records:["13 mm Usha Martin 2:1 roping","8 mm Usha Martin","13 mm Usha Martin"].map((rope) => ({technical:{rope}}))};
  assert.deepEqual(technicalChoices("rope",ropeCatalogue).map((option) => option.value),["8 mm Usha Martin","13 mm Usha Martin","13 mm Usha Martin 2:1 roping"]);
});
