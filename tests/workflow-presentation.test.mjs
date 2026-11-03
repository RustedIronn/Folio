import assert from "node:assert/strict";
import test from "node:test";
import { focusScrollOffset, materialStatus, PAYMENT_LABELS, readinessMessage } from "../src/app/workflowPresentation.js";

test("focused fields stay above mobile actions and within the keyboard viewport", () => {
  const field = { top: 844, bottom: 887, height: 43 };
  assert.equal(focusScrollOffset(field, { top: 0, bottom: 900 }, { top: 825, bottom: 900 }), 78);
  assert.equal(focusScrollOffset(field, { top: 0, bottom: 500 }, { top: 825, bottom: 900 }), 403);
  assert.equal(focusScrollOffset({ top: 100, bottom: 143, height: 43 }, { top: 0, bottom: 500 }), 0);
  assert.equal(focusScrollOffset({ top: 0, bottom: 43, height: 43 }, { top: 20, bottom: 500 }), -36);
  assert.equal(focusScrollOffset({ top: 100, bottom: 600, height: 500 }, { top: 0, bottom: 400 }), 84);
});

test("optional material blanks are distinct from unresolved required specifications", () => {
  assert.equal(materialStatus({ value: "", optional: true }), "Optional");
  assert.equal(materialStatus({ value: "", optional: false }), "Needs information");
  assert.equal(materialStatus({ value: "Controller", source: "technical" }), "Selected lift");
  assert.equal(materialStatus({ value: "Cabin", source: "template" }), "Altis standard");
  assert.equal(materialStatus({ value: "Custom cabin" }, true), "Customized");
});

test("readiness prompts are actionable without replacing validation conditions", () => {
  assert.equal(readinessMessage({ path: "lift.project.cabinCutting", label: "Cabin cutting" }), "Enter the cabin cutting description.");
  assert.equal(readinessMessage({ path: "lift.project.capacity", label: "Passenger count and maximum load must both be positive numbers" }), "Passenger count and maximum load must both be positive numbers");
  assert.equal(readinessMessage({ path: "metadata.date", label: "Quotation date" }), "Enter quotation date.");
  assert.deepEqual(PAYMENT_LABELS, { advance: "Advance", dispatch: "Before dispatch", completion: "On completion" });
});
