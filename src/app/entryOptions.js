// Employee-selected shortcuts, not catalogue specifications or quotation defaults.
// Curated from non-customer fields in the historical quotation workbook.
export const CAPACITY_OPTIONS = [4, 5, 6, 8, 10, 12, 13, 15, 16, 20, 22].map((people) => {
  const loads = { 4: 272, 5: 340, 6: 408, 8: 544, 10: 680, 12: 816, 13: 884, 15: 1020, 16: 1088, 20: 1360, 22: 1496 };
  return { value: String(people), label: `${people} persons · ${loads[people]} kg`, passengerCount: String(people), maximumLoadKg: String(loads[people]) };
});

const MATERIAL_CHOICES = {
  cabin: ["SS Cabin", "MS Cabin", "SS Cabin with Mirror Finish", "SS Cabin with Toughened Glass Left & Right Sides"],
  lopCop: ["Square & Round type button with lights, S.S face plates wall mounted", "Touch Panel"],
  security: ["Alarm and Buffer Springs", "Alarm, Over Speed Governor and Buffer Springs", "Alarm", "Over Speed Governor"],
};

export function capacityOptions(sharedRecords = []) {
  const options = [...CAPACITY_OPTIONS];
  for (const record of sharedRecords.filter((row) => row.kind === "capacity")) {
    const passengerCount = String(record.passengerCount);
    const maximumLoadKg = record.maximumLoadKg;
    if (!options.some((item) => item.passengerCount === passengerCount && item.maximumLoadKg === maximumLoadKg)) options.push({ value: `shared:${record.id}`, label: `${passengerCount} persons · ${maximumLoadKg} kg · Team`, passengerCount, maximumLoadKg });
  }
  return options;
}

export function capacityChoice(project, options = CAPACITY_OPTIONS) {
  return options.find((option) => option.passengerCount === String(project.passengerCount) && option.maximumLoadKg === String(project.maximumLoadKg))?.value ?? "custom";
}

export function applyCapacityChoice(quotation, choice, options = CAPACITY_OPTIONS) {
  const option = options.find((item) => item.value === choice);
  if (!option) return quotation;
  return { ...quotation, lift: { ...quotation.lift, project: { ...quotation.lift.project, passengerCount: option.passengerCount, maximumLoadKg: option.maximumLoadKg } } };
}

export function materialChoices(key, template, sharedRecords = []) {
  const standard = template.materials.find((row) => row.key === key)?.defaultValue;
  const shared = sharedRecords.filter((row) => row.kind === "material" && row.materialKey === key).map((row) => row.specification);
  return [...new Set([standard, ...(MATERIAL_CHOICES[key] ?? []), ...shared].filter(Boolean))].map((value) => ({ value, label: value }));
}

const TECHNICAL_CHOICE_KEYS = new Set(["speed", "doorFrame", "carProtectionDoor", "landingProtection", "motor", "controller", "rope"]);

export function technicalChoices(key, catalogue, sharedRecords = [], template) {
  if (!TECHNICAL_CHOICE_KEYS.has(key)) return [];
  const materialKey = template?.materials.find((row) => row.source === "technical" && row.technicalKey === key)?.key;
  const shared = sharedRecords.filter((row) => row.kind === "material" && row.materialKey === materialKey).map((row) => row.specification);
  const approved = catalogue.records.map((record) => record.technical[key]).filter((value) => typeof value === "string" && value.trim() && (key !== "rope" || /^\d+(?:\.\d+)? mm\b/.test(value)));
  return [...new Set([...approved, ...shared])].map((value) => ({ value, label: value }));
}

export function taxTreatmentChoices(template) {
  return [...new Set([template.commercial.taxDescription, "50%GST bill Included", "100%GST bill Included"].filter(Boolean))].map((value) => ({ value, label: value }));
}
