export const SHARED_MODEL_FIELDS = [
  { key: "quantityType", column: "description", label: "Model / configuration description", required: true, limit: 180 },
  { key: "liftType", column: "lift_type", label: "Lift category", required: true, limit: 80 },
  { key: "speed", column: "speed", label: "Speed", limit: 180 },
  { key: "carProtectionDoor", column: "car_door", label: "Car door / protection", limit: 180 },
  { key: "doorFrame", column: "door_frame", label: "Door frame", limit: 180 },
  { key: "landingProtection", column: "landing_door", label: "Landing door / protection", limit: 180 },
  { key: "motor", column: "motor", label: "Motor", limit: 180 },
  { key: "controller", column: "controller", label: "Controller / control panel", limit: 180 },
  { key: "rope", column: "rope", label: "Rope", limit: 180 },
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const emptySharedModel = () => Object.fromEntries(SHARED_MODEL_FIELDS.map(({ key }) => [key, ""]));

export function validateSharedModel(input) {
  const errors = {};
  for (const { key, label, required, limit } of SHARED_MODEL_FIELDS) {
    const value = input?.[key];
    if (typeof value !== "string") errors[key] = `Enter ${label.toLowerCase()} as text.`;
    else if (required && !value.trim()) errors[key] = `Enter the ${label.toLowerCase()}.`;
    else if (value.length > limit) errors[key] = `Keep ${label.toLowerCase()} to ${limit} characters.`;
  }
  return errors;
}

export function sharedModelPayload(input, id) {
  if (!UUID.test(id) || Object.keys(validateSharedModel(input)).length) throw new Error("Check the model details before saving.");
  return { id, ...Object.fromEntries(SHARED_MODEL_FIELDS.map(({ key, column }) => [column, input[key].trim()])) };
}

export function sharedModelRecord(row) {
  if (!row || !UUID.test(row.id)) throw new Error("A shared model has an invalid identifier.");
  const input = Object.fromEntries(SHARED_MODEL_FIELDS.map(({ key, column }) => [key, row[column]]));
  if (Object.keys(validateSharedModel(input)).length) throw new Error("A shared model contains invalid specifications. Ask the administrator to review it.");
  return {
    sourceRecordId: `shared:${row.id}`, sourceRow: null, origin: "shared",
    quantityType: input.quantityType,
    technical: Object.fromEntries(SHARED_MODEL_FIELDS.filter(({ key }) => key !== "quantityType").map(({ key }) => [key, input[key]])),
    dataQualityIssues: [],
  };
}

export function isSharedModel(record) {
  if (record?.origin !== "shared" || record.sourceRow !== null || !UUID.test(String(record.sourceRecordId).replace(/^shared:/, "")) || !String(record.sourceRecordId).startsWith("shared:")) return false;
  return !Object.keys(validateSharedModel({ quantityType: record.quantityType, ...record.technical })).length;
}

export function quotationCatalogue(approvedCatalogue, sharedRecords, quotation) {
  const records = new Map(approvedCatalogue.records.map((record) => [record.sourceRecordId, record]));
  for (const record of sharedRecords) if (isSharedModel(record)) records.set(record.sourceRecordId, record);
  const snapshot = quotation?.lift?.configurationSnapshot;
  if (isSharedModel(snapshot) && snapshot.sourceRecordId === quotation.lift.catalogueId) records.set(snapshot.sourceRecordId, snapshot);
  return { ...approvedCatalogue, records: [...records.values()] };
}
