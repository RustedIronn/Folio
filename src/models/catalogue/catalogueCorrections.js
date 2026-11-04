// Approved source corrections. The workbook and generated JSON stay unchanged.
// Returned records retain their IDs, Excel rows, sourceValues and an exact log.
const CATEGORY_LABELS = new Map([
  ["semi mrl", "Semi MRL"], ["semi mrl lift", "Semi MRL"],
  ["mrl", "MRL Lift"], ["mrl lift", "MRL Lift"],
  ["hydraulic lift", "Hydraulic Lift"],
  ["mrl stretcher lift", "MRL Stretcher Lift"], ["mrl bed lift", "MRL Bed Lift"],
]);
const ROPE_CORRECTIONS = new Map(["31", "32", "34", "35"].map((id) => [id, {
  from: "1 3 mm Usha Martin", to: "13 mm Usha Martin",
}]));

export function normaliseLiftCategory(value) {
  const label = String(value ?? "").trim().replace(/\s+/g, " ");
  return CATEGORY_LABELS.get(label.toLowerCase()) ?? label;
}

function wording(value) {
  if (typeof value !== "string" || !value) return value;
  return value
    .replace(/\bLigt\b/g, "Lift")
    .replace(/\bTlescopic\b/g, "Telescopic")
    .replace(/\bAuto Rescue Devise\b/g, "Auto Rescue Device")
    .replace(/\bMicro Processor\b/g, "Microprocessor")
    .replace(/^:\s*(?=\(i\))/, "")
    .replace(/\bDOWN COLLECTIVE\b/g, "Down Collective")
    .replace(/\bSWING DOOR\b/g, "Swing Door")
    .replace(/\blift\b/g, "Lift")
    .replace(/\bMulti Opening\b/g, "Multi-opening")
    .replace(/\bPowder Coated\b/g, "Powder-coated")
    .replace(/\bHeavy Weight\b/g, "Heavyweight")
    .replace(/\bGold finish\b/g, "Gold Finish")
    .replace(/\bM\s+S\b/g, "MS").replace(/\bMs\b/g, "MS")
    .replace(/\bDoor\s*frames?\b/gi, (text) => /s$/i.test(text) ? "Door Frames" : "Door Frame")
    .replace(/\bPower[ -]+operated\b/gi, "Power-operated")
    .replace(/\bSmall vision\b/gi, "Small Vision")
    .replace(/\bBig vision\b/gi, "Big Vision")
    .replace(/\bMONTANARI\b/g, "Montanari")
    .replace(/\bAll landing are Both side opening\b/g, "All landings open on both sides")
    .replace(/(\d+(?:\.\d+)?)\s*mtr\/sec\b/gi, "$1 m/s")
    .replace(/(\d+(?:\.\d+)?)\s*KW\b/g, "$1 kW")
    .replace(/(\d+(?:\.\d+)?)\s*Kgs?\b/g, "$1 kg")
    .replace(/(\d+(?:\.\d+)?)\s*mm\b/g, "$1 mm");
}

export function approvedCatalogueRecord(record) {
  // Team models, saved team snapshots and user wording are never rewritten.
  if (!record || record.origin === "shared" || !record.sourceValues || !/^\d+$/.test(String(record.sourceRecordId))) return record;
  // Idempotency preserves the original audit entries if a prepared catalogue
  // is passed through the merge again.
  if (record.catalogueCorrections) return record;
  const corrections = [];
  function corrected(path, from, to) {
    if (from !== to) corrections.push({ path, sourceValue: from, effectiveValue: to });
    return to;
  }
  let quantityType = wording(record.quantityType);
  if (record.sourceRecordId === "12") quantityType = quantityType.replace(/-\s*Gear\s*-\s*Gear\s*$/i, "- Gear");
  quantityType = quantityType.replace(/\b(Lift|Gear|Gate|Door)\s*-\s*/g, "$1 - ").replace(/\s*-\s*$/, "");
  const technical = Object.fromEntries(Object.entries(record.technical).map(([key, from]) => {
    let to = key === "liftType" ? normaliseLiftCategory(from) : wording(from);
    const rope = ROPE_CORRECTIONS.get(record.sourceRecordId);
    if (key === "rope" && rope?.from === from) to = rope.to;
    return [key, corrected(`technical.${key}`, from, to)];
  }));
  return { ...record, quantityType: corrected("quantityType", record.quantityType, quantityType), technical, catalogueCorrections: corrections };
}

export function catalogueCategories(records) {
  const labels = new Map();
  for (const record of records) {
    const label = normaliseLiftCategory(record.technical.liftType);
    if (label && !labels.has(label.toLowerCase())) labels.set(label.toLowerCase(), label);
  }
  return [...labels.values()].sort((a, b) => a.localeCompare(b, "en"));
}
