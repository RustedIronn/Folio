import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { transform } from "esbuild";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createQuotation, applyConfiguration, resolveQuotationDocument, setUpperFloors, setTechnicalOverride, setMaterialOverride } from "../src/models/quotation/quotation.js";
import { ALTIS_QUOTATION_TEMPLATE as template } from "../src/templates/altisQuotationTemplate.js";

const root = path.resolve(import.meta.dirname, "..");
export const catalogue = JSON.parse(await fs.readFile(path.join(root, "src/data/catalogue/liftCatalogue.json"), "utf8"));
let renderer;
export async function renderQuotation(quotation) {
  if (!renderer) {
    let source = await fs.readFile(path.join(root, "src/pdf/AltisQuotationPdf.jsx"), "utf8");
    for (const specifier of ["react", "@react-pdf/renderer"]) source = source.replace(`from "${specifier}"`, `from "${import.meta.resolve(specifier)}"`);
    source = source.replace('from "./documentPresentation.js"', `from "${pathToFileURL(path.join(root, "src/pdf/documentPresentation.js"))}"`);
    const { code } = await transform(source, { loader: "jsx", format: "esm" });
    renderer = (await import("data:text/javascript;base64," + Buffer.from(code + "\n//# sourceURL=quoteflow-pdf-verification.mjs").toString("base64"))).default;
  }
  const assets = {};
  for (const [key, file] of [["lockup", "altis-brand-lockup.png"], ["watermark", "altis-watermark.png"]]) assets[key] = "data:image/png;base64," + (await fs.readFile(path.join(root, "public/assets", file))).toString("base64");
  const documentData = resolveQuotationDocument(quotation, catalogue, template);
  let layout;
  const buffer = await renderToBuffer(React.createElement(renderer, { documentData, assets, onRender: (result) => { layout = result._INTERNAL__LAYOUT__DATA_; } }));
  return { buffer, layout, documentData };
}

export function sampleQuotation() {
  const record = catalogue.records.find((item) => item.technical.speed === "0.80 mtr/sec" && item.technical.carProtectionDoor === "SS Small Vision Power Operated Door") ?? catalogue.records[0];
  let q = applyConfiguration(createQuotation(template), record);
  q.reference = { quotationNumber: "0001", officeCode: "VJA", financialYear: "2026-27" };
  q.metadata.date = "2026-11-02";
  Object.assign(q.customer, { salutation: "Mr.", attentionName: "Sample Recipient", address: "Example Street\nExample District\nExample City", projectLocation: "Example City" });
  Object.assign(q.lift.project, { passengerCount: "6", maximumLoadKg: "408", cabinCutting: "CNC Cutting, Designing Fall Ceiling, With Blower Cutting." });
  q = setUpperFloors(q, "4");
  q.commercial.priceAmount = "900000";
  return q;
}
export function sampleCases() {
  const standard = sampleQuotation();
  let custom = setTechnicalOverride(standard, "controller", "Custom controller for this quotation", catalogue, template);
  custom = setTechnicalOverride(custom, "motor", "Custom motor for this quotation", catalogue, template);
  custom = setMaterialOverride(custom, "cabin", "Quotation-specific cabin finish", template);
  custom.commercial.taxDescription = "100%GST bill Included";
  const long = sampleQuotation();
  long.customer.address = "Example building, industrial estate, project office and installation entrance. ".repeat(4).slice(0, 300);
  long.customer.attentionName = "Synthetic recipient for the quotation review team and project coordination office";
  long.customer.subjectMode = "custom";
  long.customer.subjectCustom = "Quotation for the supply and installation of a lift for the synthetic project, including project-specific technical and material specifications for review.";
  long.materials.overrides.cabin = "Synthetic custom specification for the finish, wall panels, fittings and accessories for this quotation only; confirm the installation details and agreed presentation before supply.".slice(0, 180);
  return { standard, customized: custom, incomplete: createQuotation(template), long };
}
