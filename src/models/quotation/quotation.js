import { documentIdentity, extensionDefaults, MAX_CUSTOM_MATERIALS } from "./quotationExtensions.js";
import { isSharedModel } from "../catalogue/sharedModels.js";

export const QUOTATION_SCHEMA_VERSION = 4;
export const DRAFT_STORAGE_KEY = "quoteflow:draft:v4";
export const PROJECT_FIELDS = [
  ["capacity", "Capacity"], ["travelHeight", "Travel height"], ["floors", "No. of floors"],
  ["landings", "No. of landings"], ["shaftMeasurement", "Shaft measurement (approx.)"],
  ["carSize", "Car size (approx.)"], ["cabinCutting", "Cabin cutting"], ["cabinOpening", "Cabin opening (approx.)"],
];

const emptyInstallation = () => ({
  floorMode: "standard", upperFloors: "", customFloors: "", customLandings: "",
  shaft: { mode: "structured", width: "", depth: "", custom: "" },
  car: { mode: "structured", width: "", depth: "", height: "", custom: "" },
  cabinOpening: { mode: "structured", width: "", height: "", custom: "" },
});

export function createQuotation(template) {
  return {
    schemaVersion: QUOTATION_SCHEMA_VERSION,
    reference: { quotationNumber: "", officeCode: "", officeCodeMode: "standard", customOfficeCode: "", financialYear: template.reference.financialYear },
    metadata: { date: "", preparedByName: "" },
    customer: { name: "", address: "", salutation: "", otherSalutation: "", attentionName: "", projectLocation: "", subjectMode: "supplyLift", subjectCustom: "" },
    lift: { catalogueId: "", catalogueSourceRow: null, quantity: "1", technicalOverrides: {}, project: { ...Object.fromEntries(PROJECT_FIELDS.map(([key]) => [key, ""])), passengerCount: "", maximumLoadKg: "" }, installation: emptyInstallation() },
    materials: { overrides: {}, customRows: [] },
    commercial: { additionalEntry: { label: "", value: "" }, priceAmount: "", taxDescription: template.commercial.taxDescription, packingForwarding: template.commercial.packingForwarding, delivery: template.commercial.delivery, transportOctroi: template.commercial.transportOctroi, guarantee: template.commercial.guarantee, payment: Object.fromEntries(template.commercial.paymentStages.map((stage) => [stage.key, stage.percentage])) },
    document: { type: "quotation", acceptanceName: "", acceptanceDate: "" },
  };
}
export function suggestFinancialYear(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date ?? ""))) return "";
  const [year, month] = date.split("-").map(Number);
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}
export function formatDimensions(values) {
  const parts = values.filter((value) => String(value ?? "").trim());
  return parts.length === values.length ? parts.join(" × ") + " mm" : "";
}
export function standardFloorDescription(upperFloors) {
  if (!/^\d+$/.test(String(upperFloors ?? ""))) return "";
  const upper = Number(upperFloors);
  return upper === 0 ? "Ground floor – 1 Stop" : `Ground + ${upper} Upper landings – ${upper + 1} Stops`;
}
function withInstallationProject(next) {
  const installation = next.lift.installation;
  if (installation.floorMode === "standard") {
    const description = standardFloorDescription(installation.upperFloors);
    next.lift.project.floors = description;
    next.lift.project.landings = description;
  } else {
    next.lift.project.floors = installation.customFloors;
    next.lift.project.landings = installation.customLandings;
  }
  next.lift.project.shaftMeasurement = installation.shaft.mode === "structured" ? formatDimensions([installation.shaft.width, installation.shaft.depth]) : installation.shaft.custom;
  next.lift.project.carSize = installation.car.mode === "structured" ? formatDimensions([installation.car.width, installation.car.depth, installation.car.height]) : installation.car.custom;
  next.lift.project.cabinOpening = installation.cabinOpening.mode === "structured" ? formatDimensions([installation.cabinOpening.width, installation.cabinOpening.height]) : installation.cabinOpening.custom;
  return next;
}
export function setFloorMode(quotation, mode) {
  const next = structuredClone(quotation); next.lift.installation.floorMode = mode;
  if (mode === "standard") next.lift.project.travelHeight = altisTotalFloors(next.lift.installation.upperFloors);
  return withInstallationProject(next);
}
export function altisTotalFloors(upperFloors) {
  return /^\d+$/.test(String(upperFloors ?? "")) ? String(Number(upperFloors) + 1) : "";
}
export function setUpperFloors(quotation, value) {
  const next = structuredClone(quotation); next.lift.installation.upperFloors = value;
  if (next.lift.installation.floorMode === "standard") next.lift.project.travelHeight = altisTotalFloors(value);
  return withInstallationProject(next);
}
export function setCustomFloorValue(quotation, key, value) {
  const next = structuredClone(quotation); next.lift.installation[key] = value; return withInstallationProject(next);
}
export function setDimensionMode(quotation, key, mode) {
  const next = structuredClone(quotation); next.lift.installation[key].mode = mode; return withInstallationProject(next);
}
export function setDimensionValue(quotation, key, field, value) {
  const next = structuredClone(quotation); next.lift.installation[key][field] = value; return withInstallationProject(next);
}
export function composeReference(reference, template, type = "quotation") {
  return template.reference.prefix.replace("/QUO/", `/${documentIdentity(type).code}/`) + [reference.quotationNumber, reference.officeCode, reference.financialYear].filter(Boolean).join("/");
}
export function composeAttention(customer) {
  return [(customer.salutation === "Other" ? customer.otherSalutation : customer.salutation), customer.attentionName].filter(Boolean).join(" ");
}
export function composeSubject(customer, type = "quotation") {
  if (customer.subjectMode === "custom") return customer.subjectCustom;
  const label = documentIdentity(type).label;
  return customer.projectLocation ? label + " for supply of Lift, " + customer.projectLocation + "." : label + " for supply of Lift.";
}
export function composeQuantityAndType(quantity, quantityType) {
  return [String(quantity ?? "").trim() ? `${quantity} No Altis Lift` : "", quantityType].filter(Boolean).join(" - ");
}
export function composeCapacity(project) {
  const passengerCount = String(project.passengerCount ?? "").trim();
  const maximumLoadKg = String(project.maximumLoadKg ?? "").trim();
  if (passengerCount && maximumLoadKg) return `${passengerCount} Persons - Maximum Load - ${maximumLoadKg} Kgs`;
  return project.capacity ?? "";
}
export function formatInr(value) {
  if (String(value ?? "").trim() === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  const fraction = Math.round(number * 100) % 100 !== 0;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: fraction ? 2 : 0, maximumFractionDigits: 2 }).format(number);
}
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function wordsUnder1000(number) {
  const parts = [];
  if (number >= 100) parts.push(ONES[Math.floor(number / 100)] + " Hundred");
  const remainder = number % 100;
  if (remainder >= 20) parts.push(TENS[Math.floor(remainder / 10)] + (remainder % 10 ? " " + ONES[remainder % 10] : ""));
  else if (remainder) parts.push(ONES[remainder]);
  return parts.join(" ");
}
export function amountInWords(value) {
  if (String(value ?? "").trim() === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return "";
  const rupees = Math.floor(number);
  const paise = Math.round((number - rupees) * 100);
  if (rupees === 0) return "Rupees Zero Only";
  const groups = [[10000000, "Crore"], [100000, "Lakh"], [1000, "Thousand"], [1, ""]];
  let remaining = rupees; const parts = [];
  for (const [size, label] of groups) {
    const group = Math.floor(remaining / size);
    if (group) parts.push(wordsUnder1000(group) + (label ? " " + label : ""));
    remaining %= size;
  }
  return "Rupees " + parts.join(" ") + (paise ? " and " + wordsUnder1000(paise) + " Paise" : "") + " Only";
}
function documentPrice(amount, quantity) {
  const each = Number(quantity) > 1;
  const formatted = formatInr(amount);
  const words = amountInWords(amount);
  return { basis: each ? "each" : "total", amount, formatted: formatted ? formatted + (each ? " each" : "") : "", words: words ? words + (each ? " each" : "") : "" };
}
function ownOr(object, key, fallback = "") { return Object.hasOwn(object, key) ? object[key] : fallback; }
function technicalValues(quotation, record, template) {
  const standards = { ...(record?.technical ?? {}), ...template.technicalDefaults };
  return Object.fromEntries(Object.keys(standards).map((key) => [key, ownOr(quotation.lift.technicalOverrides, key, standards[key] ?? "")]));
}
function materialValue(quotation, item, technical) {
  return item.source === "technical" ? technical[item.technicalKey] ?? "" : ownOr(quotation.materials.overrides, item.key, item.defaultValue ?? "");
}
export function selectedConfiguration(quotation, catalogue) {
  const snapshot = quotation.lift.configurationSnapshot;
  if (isSharedModel(snapshot) && snapshot.sourceRecordId === quotation.lift.catalogueId) return snapshot;
  return catalogue.records.find((entry) => entry.sourceRecordId === quotation.lift.catalogueId) ?? null;
}
export function resolveQuotationDocument(quotation, catalogue, template) {
  const identity = documentIdentity(quotation.document?.type);
  const record = selectedConfiguration(quotation, catalogue);
  const technical = technicalValues(quotation, record, template);
  const materials = Object.fromEntries(template.materials.map((item) => [item.key, materialValue(quotation, item, technical)]));
  const missing = [];
  const require = (path, value, label) => { if (!String(value ?? "").trim()) missing.push({ path, label }); };
  [["reference.quotationNumber", quotation.reference.quotationNumber, identity.label + " number"], ["reference.officeCode", quotation.reference.officeCode, "Office/location code"], ["reference.financialYear", quotation.reference.financialYear, "Financial year"], ["metadata.date", quotation.metadata.date, identity.label + " date"], ["customer.address", quotation.customer.address, "Customer address"], ["customer.attentionName", quotation.customer.attentionName, "Recipient name"], ["customer.projectLocation", quotation.customer.projectLocation, "Project location"], ["lift.catalogueId", quotation.lift.catalogueId, "Lift configuration"], ["lift.quantityType", record?.quantityType, "Detailed lift configuration"], ["commercial.priceAmount", quotation.commercial.priceAmount, identity.label + " price"], ["commercial.taxDescription", quotation.commercial.taxDescription, "Tax treatment"], ["commercial.packingForwarding", quotation.commercial.packingForwarding, "Packing and forwarding"], ["commercial.delivery", quotation.commercial.delivery, "Delivery period"], ["commercial.transportOctroi", quotation.commercial.transportOctroi, "Transport/octroi"], ["commercial.guarantee", quotation.commercial.guarantee, "Guarantee"]].forEach(([path, value, label]) => require(path, value, label));
  [["travelHeight", "Travel height"], ["floors", "No. of floors"], ["landings", "No. of landings"], ["cabinCutting", "Cabin cutting"]].forEach(([key, label]) => require("lift.project." + key, quotation.lift.project[key], label));
  require("lift.project.capacity", composeCapacity(quotation.lift.project), "Passenger count and maximum load");
  template.commercial.paymentStages.forEach((stage) => require("commercial.payment." + stage.key, quotation.commercial.payment[stage.key], stage.key + " payment percentage"));
  template.materials.filter((item) => !item.optional).forEach((item) => require("materials." + item.key, materials[item.key], item.label));
  const bounded = [
    ["customer.address", quotation.customer.address, "Customer address", 300],
    ["customer.attentionName", quotation.customer.attentionName, "Kind Attention name", 100],
    ["customer.subjectCustom", quotation.customer.subjectCustom, "Custom subject", 180],
    ["commercial.guarantee", quotation.commercial.guarantee, "Guarantee", 320],
  ];
  PROJECT_FIELDS.forEach(([key, label]) => bounded.push(["lift.project." + key, quotation.lift.project[key], label, 180]));
  template.materials.forEach((item) => bounded.push(["materials." + item.key, materials[item.key], item.label, 180]));
  bounded.forEach(([path, value, label, limit]) => { if (String(value ?? "").length > limit) missing.push({ path, label: label + " exceeds the PDF layout limit of " + limit + " characters" }); });
  if (quotation.document.type && !["quotation", "agreement"].includes(quotation.document.type)) missing.push({ path: "document.type", label: "Choose Quotation or Agreement" });
  if (quotation.reference.officeCode && (quotation.reference.officeCode.includes("/") || quotation.reference.officeCode.length > 24)) missing.push({ path: "reference.officeCode", label: "Office code must be at most 24 characters and cannot contain /" });
  const customRows = Array.isArray(quotation.materials.customRows) ? quotation.materials.customRows : [];
  const ids = new Set();
  if (customRows.length > MAX_CUSTOM_MATERIALS) missing.push({ path: "materials.customRows", label: "The six-page material schedule supports up to six custom material rows" });
  customRows.forEach((row, index) => {
    const path = "materials.customRows." + index;
    if (!row.id || ids.has(row.id)) missing.push({ path, label: "Custom material identifiers must be unique" });
    ids.add(row.id);
    if (typeof row.name !== "string" || !row.name.trim() || row.name.length > 60) missing.push({ path: path + ".name", label: "Enter a custom material name of 1–60 characters" });
    if (typeof row.value !== "string" || !row.value.trim() || row.value.length > 180) missing.push({ path: path + ".value", label: "Enter a custom material specification of 1–180 characters" });
  });
  const additional = quotation.commercial.additionalEntry ?? { label: "", value: "" };
  const hasAdditional = Boolean(String(additional.label ?? "").trim() || String(additional.value ?? "").trim());
  if (hasAdditional) {
    if (!String(additional.label ?? "").trim() || String(additional.label).length > 40) missing.push({ path: "commercial.additionalEntry.label", label: "Enter an additional commercial label of 1–40 characters" });
    if (!String(additional.value ?? "").trim() || String(additional.value).length > 120) missing.push({ path: "commercial.additionalEntry.value", label: "Enter an additional commercial value of 1–120 characters" });
  }
  const price = Number(quotation.commercial.priceAmount);
  const paymentTotal = Object.values(quotation.commercial.payment).reduce((sum, value) => sum + Number(value || 0), 0);
  const passengerCount = String(quotation.lift.project.passengerCount ?? "").trim();
  const maximumLoadKg = String(quotation.lift.project.maximumLoadKg ?? "").trim();
  if (passengerCount || maximumLoadKg) {
    if (!/^\d+$/.test(passengerCount) || Number(passengerCount) < 1 || !/^\d+(?:\.\d+)?$/.test(maximumLoadKg) || Number(maximumLoadKg) <= 0) missing.push({ path: "lift.project.capacity", label: "Passenger count and maximum load must both be positive numbers" });
  }
  if (quotation.commercial.priceAmount !== "" && (!Number.isFinite(price) || price < 0)) missing.push({ path: "commercial.priceAmount", label: "Quotation price must be a non-negative number" });
  if (!/^\d+$/.test(String(quotation.lift.quantity ?? "")) || Number(quotation.lift.quantity) < 1) missing.push({ path: "lift.quantity", label: "Quantity must be at least 1" });
  if (Object.values(quotation.commercial.payment).every((value) => value !== "") && paymentTotal !== 100) missing.push({ path: "commercial.payment", label: "Payment percentages must total 100%" });
  return {
    templateVersion: template.version, document: identity, missing,
    provenance: { catalogueId: record?.sourceRecordId ?? "", catalogueSourceRow: record?.sourceRow ?? null, catalogueIssues: record?.dataQualityIssues ?? [], configurationOrigin: record?.origin === "shared" ? "shared" : "catalogue" },
    warnings: (record?.dataQualityIssues ?? []).map((entry) => `Selected lift source note: ${entry.message}`),
    documentNotices: identity.type === "agreement" ? ["Agreement mode retains the approved quotation cover letter, offer/acceptance wording and contractual clauses. Altis must confirm that this wording is appropriate before an agreement is issued."] : [],
    pages: {
      cover: { documentLabel: identity.label, company: template.company, reference: composeReference(quotation.reference, template, identity.type), date: quotation.metadata.date, customer: quotation.customer, attention: composeAttention(quotation.customer), subject: composeSubject(quotation.customer, identity.type), letter: template.coverLetter },
      installation: { quantity: quotation.lift.quantity, quantityType: record?.quantityType ?? "", quantityAndType: composeQuantityAndType(quotation.lift.quantity, record?.quantityType ?? ""), technical, project: { ...quotation.lift.project, capacity: composeCapacity(quotation.lift.project) }, carDesign: materials.cabin, footer: { date: quotation.metadata.date, ...template.signatures } },
      priceSchedule: { quantity: quotation.lift.quantity, capacity: composeCapacity(quotation.lift.project), projectLocation: quotation.customer.projectLocation, documentLabel: identity.label, additionalEntryPresent: hasAdditional, additionalEntry: hasAdditional && String(additional.label ?? "").trim() && String(additional.value ?? "").trim() ? { label: String(additional.label).trim(), value: String(additional.value).trim() } : null, price: documentPrice(quotation.commercial.priceAmount, quotation.lift.quantity), taxDescription: quotation.commercial.taxDescription, packingForwarding: quotation.commercial.packingForwarding, delivery: quotation.commercial.delivery, transportOctroi: quotation.commercial.transportOctroi, guarantee: quotation.commercial.guarantee, payment: template.commercial.paymentStages.map((stage) => ({ ...stage, percentage: quotation.commercial.payment[stage.key] })), acceptance: quotation.document, footer: { date: quotation.metadata.date, ...template.signatures } },
      warranty: { ...template.warranty, footer: { date: quotation.metadata.date, ...template.signatures } },
      materials: { rows: [...template.materials.map((item) => ({ ...item, value: materials[item.key] })), ...customRows.map((row, index) => ({ key: "custom-" + (row.id || index), id: row.id, label: typeof row.name === "string" ? row.name : "", value: typeof row.value === "string" ? row.value : "", source: "custom", optional: false }))], footer: { date: quotation.metadata.date, ...template.signatures } },
      obligations: { ...template.obligations, footer: { date: quotation.metadata.date, ...template.signatures } },
    },
  };
}
export function isQuotationExportReady(documentData) { return documentData.missing.length === 0; }
export function applyConfiguration(quotation, record, { preserveOverrides = true } = {}) {
  const next = structuredClone(quotation);
  next.lift.catalogueId = record.sourceRecordId; next.lift.catalogueSourceRow = record.sourceRow;
  if (isSharedModel(record)) next.lift.configurationSnapshot = structuredClone(record);
  else delete next.lift.configurationSnapshot;
  if (!preserveOverrides) { next.lift.technicalOverrides = {}; next.materials.overrides = {}; }
  return next;
}
export function getConfigurationSwitchImpact(quotation, nextRecord) {
  const overrideCount = Object.keys(quotation.lift.technicalOverrides).length + Object.keys(quotation.materials.overrides).length;
  return { requiresConfirmation: Boolean(quotation.lift.catalogueId && quotation.lift.catalogueId !== nextRecord.sourceRecordId), overrideCount };
}
export function setTechnicalOverride(quotation, key, value, catalogue, template) {
  const next = structuredClone(quotation);
  const record = selectedConfiguration(next, catalogue);
  const standard = { ...(record?.technical ?? {}), ...template.technicalDefaults }[key] ?? "";
  if (value === String(standard)) delete next.lift.technicalOverrides[key]; else next.lift.technicalOverrides[key] = value;
  return next;
}
export function restoreTechnical(quotation, key) { const next = structuredClone(quotation); delete next.lift.technicalOverrides[key]; return next; }
export function setMaterialOverride(quotation, key, value, template) {
  const next = structuredClone(quotation); const item = template.materials.find((entry) => entry.key === key);
  if (!item || item.source === "technical") return next;
  if (value === item.defaultValue) delete next.materials.overrides[key]; else next.materials.overrides[key] = value;
  return next;
}
export function restoreMaterial(quotation, key) { const next = structuredClone(quotation); delete next.materials.overrides[key]; return next; }
export function serializeDraft(quotation) { return JSON.stringify({ schemaVersion: QUOTATION_SCHEMA_VERSION, quotation }); }
function applyCommercialDefaults(commercial, template) {
  const next = { ...commercial, payment: { ...commercial.payment } };
  ["taxDescription", "packingForwarding", "delivery", "transportOctroi", "guarantee"].forEach((key) => { if (!String(next[key] ?? "").trim()) next[key] = template.commercial[key] ?? ""; });
  template.commercial.paymentStages.forEach((stage) => { if (!String(next.payment[stage.key] ?? "").trim()) next.payment[stage.key] = stage.percentage ?? ""; });
  return next;
}
function migrateVersionTwo(old, template) {
  const next = createQuotation(template);
  next.reference = { ...next.reference, ...(old.reference ?? {}) };
  next.metadata = { ...next.metadata, ...(old.metadata ?? {}) };
  next.customer = { ...next.customer, ...(old.customer ?? {}) };
  next.lift = { ...next.lift, ...(old.lift ?? {}), technicalOverrides: old.lift?.technicalOverrides ?? {}, project: { ...next.lift.project, ...(old.lift?.project ?? {}) }, installation: { ...emptyInstallation(), floorMode: "custom", customFloors: old.lift?.project?.floors ?? "", customLandings: old.lift?.project?.landings ?? "", shaft: { mode: "custom", custom: old.lift?.project?.shaftMeasurement ?? "", width: "", depth: "" }, car: { mode: "custom", custom: old.lift?.project?.carSize ?? "", width: "", depth: "", height: "" }, cabinOpening: { mode: "custom", custom: old.lift?.project?.cabinOpening ?? "", width: "", height: "" } } };
  next.materials = { ...next.materials, ...(old.materials ?? {}), overrides: old.materials?.overrides ?? {} };
  next.commercial = applyCommercialDefaults({ ...next.commercial, ...(old.commercial ?? {}), payment: { ...next.commercial.payment, ...(old.commercial?.payment ?? {}) } }, template);
  next.document = { ...next.document, ...(old.document ?? {}) };
  return next;
}
function migrateVersionThree(old, template) {
  const next = createQuotation(template);
  next.reference = { ...next.reference, ...(old.reference ?? {}) };
  next.metadata = { ...next.metadata, ...(old.metadata ?? {}) };
  next.customer = { ...next.customer, ...(old.customer ?? {}) };
  const installation = old.lift?.installation ?? {};
  next.lift = { ...next.lift, ...(old.lift ?? {}), technicalOverrides: old.lift?.technicalOverrides ?? {}, project: { ...next.lift.project, ...(old.lift?.project ?? {}) }, installation: { ...emptyInstallation(), ...installation, shaft: { ...emptyInstallation().shaft, ...(installation.shaft ?? {}) }, car: { ...emptyInstallation().car, ...(installation.car ?? {}) }, cabinOpening: { ...emptyInstallation().cabinOpening, ...(installation.cabinOpening ?? {}) } } };
  next.materials = { overrides: old.materials?.overrides ?? {} };
  next.commercial = applyCommercialDefaults({ ...next.commercial, ...(old.commercial ?? {}), payment: { ...next.commercial.payment, ...(old.commercial?.payment ?? {}) } }, template);
  next.document = { ...next.document, ...(old.document ?? {}) };
  return next;
}
export function migrateDraft(draft, template) {
  if (!draft?.quotation) return null;
  if (draft.schemaVersion === QUOTATION_SCHEMA_VERSION) return extensionDefaults(draft.quotation);
  if (draft.schemaVersion === 3) return migrateVersionThree(draft.quotation, template);
  if (draft.schemaVersion === 2) return migrateVersionTwo(draft.quotation, template);
  if (draft.schemaVersion !== 1) return null;
  const old = draft.quotation; const next = createQuotation(template);
  const parts = String(old.metadata?.referenceNumber ?? "").replace(/^AE\/QUO\//, "").split("/");
  next.reference = { quotationNumber: parts[0] ?? "", officeCode: parts[1] ?? "", financialYear: parts[2] ?? template.reference.financialYear };
  next.metadata = { date: old.metadata?.date ?? "", preparedByName: old.metadata?.preparedByName ?? "" };
  next.customer = { ...next.customer, name: old.customer?.name ?? "", address: old.customer?.address ?? "", attentionName: old.customer?.attention ?? "", projectLocation: old.customer?.projectLocation ?? "", subjectMode: old.customer?.subject ? "custom" : "supplyLift", subjectCustom: old.customer?.subject ?? "" };
  next.lift = { ...next.lift, catalogueId: old.lifts?.[0]?.catalogueId ?? "", catalogueSourceRow: old.lifts?.[0]?.catalogueSourceRow ?? null, quantity: old.lifts?.[0]?.quantity ?? "1", technicalOverrides: old.lifts?.[0]?.specificationOverrides ?? {} };
  next.commercial = { ...next.commercial, priceAmount: old.commercial?.priceAmount ?? "", guarantee: old.commercial?.guarantee ?? next.commercial.guarantee, payment: { advance: old.commercial?.payment?.advancePercentage ?? "", dispatch: old.commercial?.payment?.dispatchPercentage ?? "", completion: old.commercial?.payment?.completionPercentage ?? "" } };
  next.document = { acceptanceName: old.document?.acceptanceName ?? "", acceptanceDate: old.document?.acceptanceDate ?? "" };
  return migrateVersionTwo(next, template);
}
export function restoreDraft(serialized, template) { try { return migrateDraft(JSON.parse(serialized), template); } catch { return null; } }
export function loadDraft(storage, template) { return restoreDraft(storage.getItem(DRAFT_STORAGE_KEY) ?? storage.getItem("quoteflow:draft:v3") ?? storage.getItem("quoteflow:draft:v2") ?? storage.getItem("quoteflow:draft:v1"), template); }
export function saveDraft(storage, quotation) { storage.setItem(DRAFT_STORAGE_KEY, serializeDraft(quotation)); }
