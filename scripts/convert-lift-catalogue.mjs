import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import xlsx from "xlsx";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(projectRoot, "data", "source", "lift-models.xlsx");
const cataloguePath = path.join(projectRoot, "src", "data", "catalogue", "liftCatalogue.json");
const reportPath = path.join(projectRoot, "data", "reports", "liftCatalogue.validation.json");
const checkOnly = process.argv.includes("--check");

const columns = [
  ["A", "sourceRecordId"], ["B", "quantityType"], ["C", "liftType"], ["D", "speed"],
  ["E", "carProtectionDoor"], ["F", "doorFrame"], ["G", "motor"], ["H", "controller"],
  ["I", "rope"], ["J", "liftTypeRepeated"], ["K", "unlabelledColumnK"], ["L", "autoRescueDeviceNote"],
  ["M", "field2"], ["N", "field1"], ["O", "terms"], ["P", "terms2"], ["Q", "landingProtection"], ["R", "terms3"],
];
const technicalColumns = new Set([
  "liftType", "speed", "carProtectionDoor", "doorFrame", "motor", "controller", "rope",
  "autoRescueDeviceNote", "landingProtection",
]);

function normalize(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).replace(/\s+/g, " ").trim();
  return normalized || null;
}
function valuesByColumn(row) { return Object.fromEntries(columns.map(([letter], index) => [letter, row[index] ?? null])); }
function normalizedByField(row) { return Object.fromEntries(columns.map(([, key], index) => [key, normalize(row[index])])); }
function issue(code, message, details = {}) { return { code, message, ...details }; }

function createCatalogue() {
  const workbook = xlsx.readFile(sourcePath, { cellText: false, cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("The workbook has no worksheets.");
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null, raw: false });
  const headerRowIndex = 2;
  const dataRows = rows.slice(headerRowIndex + 1);
  const sourceHeaders = Object.fromEntries(columns.map(([letter], index) => [letter, rows[headerRowIndex][index] ?? null]));
  const records = [];
  const invalidRows = [];

  dataRows.forEach((row, offset) => {
    const sourceRow = headerRowIndex + offset + 2;
    const fields = normalizedByField(row);
    if (!fields.sourceRecordId && row.every((value) => normalize(value) === null)) return;
    if (!fields.sourceRecordId) {
      invalidRows.push({ sourceRow, reason: "Missing source record ID", sourceValues: valuesByColumn(row) });
      return;
    }
    const technical = Object.fromEntries(Object.entries(fields).filter(([key]) => technicalColumns.has(key)));
    const missingTechnicalFields = Object.entries(technical).filter(([, value]) => value === null).map(([key]) => key);
    const issues = [];
    if (missingTechnicalFields.length) issues.push(issue("missing_technical_values", "One or more mapped technical values are blank.", { fields: missingTechnicalFields }));
    for (const [field, value] of Object.entries(technical)) {
      if (value === ".") issues.push(issue("ambiguous_placeholder", "The source uses a period as a value; its business meaning is unresolved.", { field }));
    }
    if (technical.liftType && fields.liftTypeRepeated && technical.liftType !== fields.liftTypeRepeated) {
      issues.push(issue("conflicting_lift_type_columns", "The two source lift-type columns differ.", { liftType: technical.liftType, liftTypeRepeated: fields.liftTypeRepeated }));
    }
    records.push({
      sourceRecordId: fields.sourceRecordId,
      sourceRow,
      quantityType: fields.quantityType,
      technical,
      sourceValues: valuesByColumn(row),
      unresolvedFields: { unlabelledColumnK: fields.unlabelledColumnK, field1: fields.field1, field2: fields.field2, terms: fields.terms, terms2: fields.terms2, terms3: fields.terms3 },
      dataQualityIssues: issues,
    });
  });

  const ids = new Map();
  const fingerprints = new Map();
  for (const record of records) {
    ids.set(record.sourceRecordId, [...(ids.get(record.sourceRecordId) ?? []), record.sourceRow]);
    const fingerprint = JSON.stringify({ quantityType: record.quantityType, technical: record.technical, unresolvedFields: record.unresolvedFields });
    fingerprints.set(fingerprint, [...(fingerprints.get(fingerprint) ?? []), { sourceRecordId: record.sourceRecordId, sourceRow: record.sourceRow }]);
  }
  const duplicateSourceIds = [...ids.entries()].filter(([, sourceRows]) => sourceRows.length > 1).map(([sourceRecordId, sourceRows]) => ({ sourceRecordId, sourceRows }));
  const duplicateConfigurations = [...fingerprints.values()].filter((recordsForConfiguration) => recordsForConfiguration.length > 1);
  const sourceHeaderIssues = [
    issue("generic_headers", "Columns M and N use generic headers and are not interpreted as technical specifications.", { columns: ["M", "N"], headers: [sourceHeaders.M, sourceHeaders.N] }),
    issue("unlabelled_column", "Column K has no header and is not interpreted as a technical specification.", { column: "K" }),
    issue("duplicate_lift_type_columns", "Columns C and J both describe lift type and are retained separately.", { columns: ["C", "J"], headers: [sourceHeaders.C, sourceHeaders.J] }),
    issue("terms_columns_unclassified", "Columns O, P, and R are labelled as terms but their business role is not established.", { columns: ["O", "P", "R"] }),
  ];
  const validationReport = {
    schemaVersion: 1,
    source: { workbook: "data/source/lift-models.xlsx", sheet: sheetName, headerRow: headerRowIndex + 1 },
    summary: { sourceRowsAfterHeader: dataRows.length, validRecords: records.length, invalidRows: invalidRows.length, duplicateSourceIds: duplicateSourceIds.length, duplicateConfigurations: duplicateConfigurations.length, recordsWithDataQualityIssues: records.filter((record) => record.dataQualityIssues.length > 0).length },
    invalidRows,
    duplicateSourceIds,
    duplicateConfigurations,
    recordDataQualityIssues: records.filter((record) => record.dataQualityIssues.length > 0).map((record) => ({ sourceRecordId: record.sourceRecordId, sourceRow: record.sourceRow, issues: record.dataQualityIssues })),
    sourceHeaderIssues,
  };
  return { catalogue: { schemaVersion: 1, source: { workbook: "data/source/lift-models.xlsx", sheet: sheetName, headerRow: headerRowIndex + 1, columns: columns.map(([letter, normalizedField]) => ({ letter, sourceHeader: sourceHeaders[letter], normalizedField })) }, records }, validationReport };
}

function serialize(value) { return `${JSON.stringify(value, null, 2)}\n`; }
const { catalogue, validationReport } = createCatalogue();
if (checkOnly) {
  for (const [filePath, contents] of [[cataloguePath, serialize(catalogue)], [reportPath, serialize(validationReport)]]) {
    if (!fs.existsSync(filePath) || fs.readFileSync(filePath, "utf8") !== contents) throw new Error(`${path.relative(projectRoot, filePath)} is stale. Run npm run catalogue:build.`);
  }
  if (validationReport.invalidRows.length || validationReport.duplicateSourceIds.length) throw new Error("Catalogue validation found invalid rows or duplicate source record IDs.");
  console.log(`Validated ${catalogue.records.length} catalogue records.`);
} else {
  fs.mkdirSync(path.dirname(cataloguePath), { recursive: true });
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(cataloguePath, serialize(catalogue));
  fs.writeFileSync(reportPath, serialize(validationReport));
  console.log(`Generated ${catalogue.records.length} catalogue records from ${path.relative(projectRoot, sourcePath)}.`);
}
