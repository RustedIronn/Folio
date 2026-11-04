// Employee-selected shortcuts, not catalogue specifications or quotation defaults.
// Curated from non-customer fields in the historical quotation workbook.
export const CAPACITY_OPTIONS = [4, 5, 6, 8, 10, 12, 13, 15, 16, 20, 22].map((people) => {
  const loads = { 4: 272, 5: 340, 6: 408, 8: 544, 10: 680, 12: 816, 13: 884, 15: 1020, 16: 1088, 20: 1360, 22: 1496 };
  return { value: String(people), label: `${people} persons · ${loads[people]} kg`, passengerCount: String(people), maximumLoadKg: String(loads[people]) };
});

const MATERIAL_CHOICES = {
  cabin: ["SS Cabin", "MS Cabin", "SS Cabin with Mirror Finish", "SS Cabin with Toughened Glass Left & Right Sides"],
  lopCop: ["Square and round buttons with lights; wall-mounted S.S. face plates.", "Touch Panel"],
  security: ["Alarm and buffer springs", "Alarm, overspeed governor and buffer springs.", "Alarm", "Overspeed governor"],
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

// Compare formatting only; retain the first exact value and never stem specifications.
function choiceKey(value) {
  const key = String(value).normalize("NFKC").trim().replace(/\s+/g, " ").replace(/[.,;]+$/, "").toLowerCase().replace(/\bpower[ -]+operated\b/g, "power operated");
  const measurement = key.match(/^(\d+(?:\.\d+)?)\s*(mm|kg|m\/s|mtr\/sec)(.*)$/);
  return measurement ? Number(measurement[1]) + " " + (measurement[2] === "mtr/sec" ? "m/s" : measurement[2]) + measurement[3] : key;
}
function orderedChoices(values, firstValue) {
  const unique = new Map();
  for (const value of values) if (typeof value === "string" && value.trim() && !unique.has(choiceKey(value))) unique.set(choiceKey(value),value);
  const compare = new Intl.Collator("en", { numeric:true, sensitivity:"base" });
  const options = [...unique.values()].sort((a,b) => {
    const leadingA = a.match(/^\d+(?:\.\d+)?/), leadingB = b.match(/^\d+(?:\.\d+)?/);
    if (leadingA && leadingB && Number(leadingA[0]) !== Number(leadingB[0])) return Number(leadingA[0])-Number(leadingB[0]);
    return compare.compare(a,b);
  });
  if (firstValue) { const index=options.indexOf(unique.get(choiceKey(firstValue))); if(index>0) options.unshift(...options.splice(index,1)); }
  return options.map((value) => ({value,label:value}));
}

export function materialChoices(key, template, sharedRecords = []) {
  const standard = template.materials.find((row) => row.key === key)?.defaultValue;
  const shared = sharedRecords.filter((row) => row.kind === "material" && row.materialKey === key).map((row) => row.specification);
  return orderedChoices([standard, ...(MATERIAL_CHOICES[key] ?? []), ...shared], standard);
}

const TECHNICAL_CHOICE_KEYS = new Set(["speed", "doorFrame", "carProtectionDoor", "landingProtection", "motor", "controller", "rope"]);

export function technicalChoices(key, catalogue, sharedRecords = [], template) {
  if (!TECHNICAL_CHOICE_KEYS.has(key)) return [];
  const materialKey = template?.materials.find((row) => row.source === "technical" && row.technicalKey === key)?.key;
  const shared = sharedRecords.filter((row) => row.kind === "material" && row.materialKey === materialKey).map((row) => row.specification);
  const approved = catalogue.records.map((record) => record.technical[key]).filter((value) => typeof value === "string" && value.trim() && (key !== "rope" || /^\d+(?:\.\d+)? mm\b/.test(value)));
  return orderedChoices([...approved, ...shared]);
}

export function taxTreatmentChoices(template) {
  return [...new Set([template.commercial.taxDescription, "50%GST bill Included", "100%GST bill Included"].filter(Boolean))].map((value) => ({ value, label: value }));
}
