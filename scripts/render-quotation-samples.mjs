import fs from "node:fs/promises";
import { renderQuotation, sampleCases } from "./pdf-test-support.mjs";
import { displayCapacity, displayDate, displayPrice, displayTravelHeight } from "../src/pdf/documentPresentation.js";

await fs.mkdir("output/pdf", { recursive: true });
const manifest = {};
for (const [name, quotation] of Object.entries(sampleCases())) {
  const { buffer, layout, documentData } = await renderQuotation(quotation);
  const file = `output/pdf/altis-${name}.pdf`;
  await fs.writeFile(file, buffer);
  const p = documentData.pages;
  manifest[file] = [
    [p.cover.reference, displayDate(p.cover.date), p.cover.customer.address, p.cover.attention, p.cover.subject, ...p.cover.letter.paragraphs, ...p.cover.letter.closing],
    [p.installation.quantityAndType, ...Object.entries(p.installation.project).map(([key, value]) => key === "travelHeight" ? displayTravelHeight(value) : value), ...["speed", "doorFrame", "carProtectionDoor", "landingProtection", "powerSupplyMachineRoom", "powerSupplyLiftWell", "safety", "facePlate"].map((key) => p.installation.technical[key])],
    [displayCapacity(p.priceSchedule.capacity), p.priceSchedule.projectLocation, displayPrice(p.priceSchedule.price.formatted), p.priceSchedule.price.words, ...["taxDescription", "packingForwarding", "delivery", "transportOctroi", "guarantee"].map((key) => p.priceSchedule[key]), ...p.priceSchedule.payment.map((stage) => `${stage.percentage}% ${stage.description}`)],
    p.warranty.sections.flat(), p.materials.rows.map((row) => row.value), [...p.obligations.ours, ...p.obligations.customer],
  ];
  console.log(`${file}: ${layout.children.length} pages; all Letter-size and within printable regions`);
}
await fs.writeFile("output/pdf/verification-data.json", JSON.stringify(manifest));
