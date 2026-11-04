import { ALTIS_QUOTATION_TEMPLATE as template } from "../../templates/altisQuotationTemplate.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DECIMAL = /^\d+(?:\.\d+)?$/;
export const MATERIAL_KEYS = template.materials.map(({ key }) => key);

export function validateEntryOption(input) {
  const errors = {};
  if (input?.kind === "capacity") {
    const people = String(input.passengerCount ?? "").trim();
    const load = String(input.maximumLoadKg ?? "").trim();
    if (!/^\d+$/.test(people) || !Number.isSafeInteger(Number(people)) || Number(people) <= 0) errors.passengerCount = "Enter a positive whole number of passengers.";
    if (load.length > 32 || !DECIMAL.test(load) || !Number.isFinite(Number(load)) || Number(load) <= 0) errors.maximumLoadKg = "Enter a positive load in kilograms, using digits and a decimal point.";
  } else if (input?.kind === "material") {
    if (![...MATERIAL_KEYS, "custom"].includes(input.materialKey)) errors.materialKey = "Choose a material from the quotation schedule.";
    if (input.materialKey === "custom" && (typeof input.customName !== "string" || !input.customName.trim() || input.customName.length > 60)) errors.customName = "Enter a material name of 1–60 characters.";
    if (typeof input.specification !== "string" || !input.specification.trim() || input.specification.length > 180) errors.specification = "Enter a material specification of 1–180 characters.";
  } else errors.kind = "Choose a capacity or material option.";
  return errors;
}

export function entryOptionPayload(input, id) {
  if (!UUID.test(id) || Object.keys(validateEntryOption(input)).length) throw new Error("Check the option details before saving.");
  if (input.kind === "material") return { id, kind: "material", materialKey: input.materialKey, ...(input.materialKey === "custom" ? { customName: input.customName.trim() } : {}), specification: input.specification.trim() };
  const [whole, decimal = ""] = String(input.maximumLoadKg).trim().split(".");
  const fraction = decimal.replace(/0+$/, "");
  return { id, kind: "capacity", passengerCount: Number(input.passengerCount), maximumLoadKg: whole.replace(/^0+(?=\d)/, "") + (fraction ? `.${fraction}` : "") };
}

export function entryOptionRecord(row) {
  if (row?.kind === "capacity" && (typeof row.passengerCount !== "number" || typeof row.maximumLoadKg !== "string")) throw new Error("A saved team option has invalid details.");
  return entryOptionPayload(row, row?.id);
}
