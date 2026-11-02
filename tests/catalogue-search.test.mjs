import assert from "node:assert/strict";
import test from "node:test";
import { cataloguePickerOption, configurationCharacteristics, configurationName, normaliseCatalogueSearch, searchCatalogue } from "../src/app/catalogueSearch.js";

const records = [
  { sourceRecordId: "2", quantityType: "SS Big Vision Power Operated Door Lift", technical: { liftType: "Hydraulic Lift", speed: "0.50 mtr/sec", carProtectionDoor: "SS Big Vision Door", doorFrame: "SS Door Frames", motor: "Hydraulic power pack", controller: "Micro Processor Controller", rope: "8 mm rope", landingProtection: "SS Big Vision Door" } },
  { sourceRecordId: "1", quantityType: "MS Collapsible Gate Lift", technical: { liftType: "MRL Lift", speed: "1 mtr/sec", carProtectionDoor: "MS Collapsible Gate", doorFrame: "MS Frame", motor: "Gearless motor", controller: "Integrated Controller", rope: "10 mm rope", landingProtection: "MS Gate" } },
];

test("catalogue search normalises case, punctuation, and spacing", () => {
  assert.equal(normaliseCatalogueSearch("SS—Big   Vision / Door"), "ss big vision door");
  assert.deepEqual(searchCatalogue(records, { search: "ss-big vision door" }).map((record) => record.sourceRecordId), ["2"]);
});

test("catalogue search finds approved technical characteristics and filters lift type", () => {
  assert.deepEqual(searchCatalogue(records, { search: "integrated controller" }).map((record) => record.sourceRecordId), ["1"]);
  assert.deepEqual(searchCatalogue(records, { liftType: "hydraulic lift" }).map((record) => record.sourceRecordId), ["2"]);
});

test("catalogue search returns an empty result without inventing a match", () => {
  assert.deepEqual(searchCatalogue(records, { search: "unapproved capacity" }), []);
  assert.equal(configurationName(records[0]), "#2 · Hydraulic Lift — SS Big Vision Power Operated Door Lift");
  assert.match(configurationCharacteristics(records[0]), /0.50 mtr\/sec/);
});

test("catalogue picker options keep approved identifiers separate from readable result details", () => {
  const option = cataloguePickerOption(records[0]);
  assert.deepEqual(option, {
    value: "2",
    sourceId: "2",
    label: "#2 · Hydraulic Lift — SS Big Vision Power Operated Door Lift",
    category: "Hydraulic Lift",
    description: "SS Big Vision Power Operated Door Lift",
    characteristics: "0.50 mtr/sec · SS Big Vision Door · SS Door Frames",
  });
});
