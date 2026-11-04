import { normaliseLiftCategory } from "../models/catalogue/catalogueCorrections.js";

const technicalFields = ["liftType", "speed", "carProtectionDoor", "doorFrame", "motor", "controller", "rope", "landingProtection"];

export function normaliseCatalogueSearch(value) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function configurationName(record) {
  return `${record.origin === "shared" ? "Team model" : `#${record.sourceRecordId}`} · ${record.quantityType || record.technical.liftType || "Configuration description not recorded"}`;
}

export function configurationCharacteristics(record) {
  return [record.technical.speed, record.technical.carProtectionDoor, record.technical.doorFrame].filter(Boolean).join(" · ");
}

export function cataloguePickerOption(record) {
  return {
    value: record.sourceRecordId,
    label: configurationName(record),
    sourceId: record.sourceRecordId,
    category: record.technical.liftType || "Lift type not recorded",
    description: record.quantityType || "Configuration description not recorded",
    characteristics: configurationCharacteristics(record),
  };
}

function searchableFields(record) {
  return {
    description: normaliseCatalogueSearch([record.quantityType, record.sourceValues?.B].filter(Boolean).join(" ")),
    liftType: normaliseCatalogueSearch([record.technical.liftType, record.sourceValues?.C].filter(Boolean).join(" ")),
    technical: [...technicalFields.map((field) => record.technical[field]), ...["D", "E", "F", "G", "H", "I", "Q"].map((column) => record.sourceValues?.[column])].filter(Boolean).map(normaliseCatalogueSearch).join(" "),
  };
}

export function searchCatalogue(records, { search = "", liftType = "" } = {}) {
  const query = normaliseCatalogueSearch(search);
  const tokens = query.split(" ").filter(Boolean);
  const typeFilter = normaliseCatalogueSearch(normaliseLiftCategory(liftType));

  return records
    .filter((record) => !typeFilter || normaliseCatalogueSearch(normaliseLiftCategory(record.technical.liftType)) === typeFilter)
    .map((record) => {
      const fields = searchableFields(record);
      const haystack = `${fields.description} ${fields.liftType} ${fields.technical}`;
      if (tokens.length && !tokens.every((token) => haystack.includes(token))) return null;
      const score = !query ? 0
        : (fields.description.includes(query) ? 300 : 0)
          + (fields.liftType.includes(query) ? 200 : 0)
          + (fields.technical.includes(query) ? 100 : 0)
          + tokens.reduce((total, token) => total + (fields.description.includes(token) ? 12 : fields.liftType.includes(token) ? 8 : 4), 0);
      return { record, score };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || configurationName(left.record).localeCompare(configurationName(right.record), "en") || String(left.record.sourceRecordId).localeCompare(String(right.record.sourceRecordId), "en"))
    .map(({ record }) => record);
}
