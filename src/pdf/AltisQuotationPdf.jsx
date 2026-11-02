import React from "react";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { assertDocumentLayout, displayCapacity, displayDate, displayPrice, LETTER } from "./documentPresentation.js";

Font.registerHyphenationCallback((word) => [word]);
const s = StyleSheet.create({
  page: { width: LETTER.width, height: LETTER.height, minHeight: LETTER.height, maxHeight: LETTER.height, fontFamily: "Times-Roman", fontSize: 11, lineHeight: 1.23, color: "#000" },
  region: { position: "absolute", flexShrink: 0 }, text: { flexShrink: 0 }, bold: { fontFamily: "Times-Bold" },
  heading: { position: "absolute", left: 72, width: 468, fontFamily: "Times-Bold", fontSize: 11.5, textAlign: "center", textDecoration: "underline" },
  watermark: { position: "absolute", left: 156, top: 247.15, width: 300, height: 300 },
  sidebar: { position: "absolute", top: 0, left: 22.8, width: 18.4, height: 792, backgroundColor: "#148133" },
  brandLockup: { position: "absolute", left: 70, top: 71, width: 157, height: 102 },
  iso: { position: "absolute", top: 63.5, right: 81, fontFamily: "Helvetica", fontSize: 7.3 },
  footer: { position: "absolute", left: 72, top: 746, width: 480, flexDirection: "row", fontFamily: "Times-Bold", fontSize: 9.2 },
  contactFooter: { position: "absolute", left: 43.42, top: 692.17, width: 547.76, height: 76.2, flexDirection: "row", borderWidth: 0.4, borderColor: "#000", backgroundColor: "#ffc000" },
  contactCell: { paddingHorizontal: 5, paddingTop: 10, borderRightWidth: 0.4, borderColor: "#000", fontFamily: "Helvetica", fontSize: 8, lineHeight: 1.2, flexShrink: 0 },
  table: { borderWidth: 0.4, borderColor: "#000", flexShrink: 0 },
  tableOutline: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderWidth: 0.8, borderColor: "#000" },
  row: { flexDirection: "row", borderBottomWidth: 0.4, borderColor: "#000", flexShrink: 0 },
  label: { width: 167.45, paddingHorizontal: 5.2, paddingTop: 1, paddingBottom: 2, borderRightWidth: 0.4, borderColor: "#000" },
  value: { flex: 1, paddingHorizontal: 5.2 },
  commercialRow: { flexDirection: "row", flexShrink: 0, minHeight: 13.5 }, commercialLabel: { width: 144, flexShrink: 0 }, commercialValue: { flex: 1 },
  legalHeading: { fontFamily: "Times-Bold", flexShrink: 0 }, legalText: { marginTop: 5, marginBottom: 6, textAlign: "justify", flexShrink: 0 },
  materialRow: { flexDirection: "row", flexShrink: 0 }, materialLabel: { width: 107.5 }, materialColon: { width: 8 }, materialValue: { flex: 1 },
  bullet: { flexDirection: "row", flexShrink: 0 }, bulletMark: { width: 31.6 }, bulletText: { flex: 1, textAlign: "justify" },
});
const safe = (value) => String(value ?? "");
function Region({ name, top, height, left = 72, width = 468, children, style }) {
  // Measure complete text before validating the printable slot. Constraining the
  // measurement to the slot height makes React PDF silently truncate text lines.
  return <View id={`pdf-region:${name}`} data-printable-height={height} style={[s.region, { top, left, width, height: 3000 }, style]}>{children}</View>;
}
function Heading({ children, top = 77 }) { return <Text style={[s.heading, { top }]}>{children}</Text>; }
function Footer({ footer }) {
  return <View style={s.footer}><Text style={{ width: 189 }}>Date: {displayDate(footer.date)}</Text><Text style={{ width: 189 }}>{safe(footer.executive)}</Text><Text>{safe(footer.customer)}</Text></View>;
}
function ContactFooter({ contacts }) {
  const widths = [126.03, 148.85, 131.85, 140.23];
  const formatted = contacts.map((value, index) => {
    if (index === 0) return value.replace(", Jinkalwada, IDA Balanagar, ", "\nJinkalwada,\nIDA Balanagar,\n").replace(", Telangana", "\nTelangana");
    if (index === 1) return value.replace(", Road No. 1,", "\nRoad No. 1,").replace(" Near Vinayaka", "\nNear Vinayaka").replace(" Vijayawada", "\nVijayawada").replace(" Ph.:", "\nPh.:");
    if (index === 2) return value.replace(" Chandramouli", "\nChandramouli").replace(" Opp.", "\nOpp.").replace(" Guntur", "\nGuntur");
    return value.replaceAll(" | ", "\n");
  });
  return <View style={s.contactFooter}>{formatted.map((value, index) => <View key={index} style={[s.contactCell, { width: widths[index], borderRightWidth: index === 3 ? 0 : 0.4 }]}><Text>{value}</Text></View>)}</View>;
}
function PdfPage({ children, page, cover = false, branding, assets }) {
  return <Page size="LETTER" style={s.page} wrap={false}>
    {cover && <View style={s.sidebar} />}
    {branding && <Image src={assets.watermark} style={s.watermark} />}
    {cover && <>{branding && <Image src={assets.lockup} style={s.brandLockup} />}<Text style={s.iso}>{page.company.isoStatement}</Text></>}
    {children}{cover ? <ContactFooter contacts={page.company.contacts} /> : <Footer footer={page.footer} />}
  </Page>;
}
function CoverPage({ page, ...props }) {
  const addressLines = safe(page.customer.address).split(/\r?\n/).length + (page.customer.name ? 1 : 0);
  const addressSize = addressLines > 4 || safe(page.customer.address).length > 180 ? 9 : 11;
  return <PdfPage page={page} cover {...props}>
    <Region name="Reference and date" top={185} height={16}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text>{page.reference ? `Ref: ${page.reference}` : "Ref:"}</Text><Text>Date: {displayDate(page.date)}</Text></View></Region>
    <Region name="Customer address" top={199} height={47} style={{ fontSize: addressSize }}><Text style={s.text}>{[page.customer.name, page.customer.address].filter(Boolean).join("\n")}</Text></Region>
    <Region name="Recipient" top={253} height={25}><Text style={[s.text, s.bold, { textAlign: "center", fontSize: safe(page.attention).length > 65 ? 10 : 11 }]}>Kind Attention: {safe(page.attention)}</Text></Region>
    <Region name="Subject" top={280} height={27}><Text style={[s.text, { fontSize: safe(page.subject).length > 110 ? 10 : 11 }]}><Text style={[s.bold, { textDecoration: "underline" }]}>Sub:</Text> {safe(page.subject)}</Text></Region>
    <Region name="Salutation" top={307} height={18}><Text>{page.letter.salutation}</Text></Region>
    {page.letter.paragraphs.map((paragraph, index) => <Region key={index} name={`Cover paragraph ${index + 1}`} top={[334, 388, 483, 523][index]} height={[51, 91, 37, 25][index]} style={{ fontSize: 11.5, lineHeight: 1.18 }}><Text style={[s.text, { textAlign: "justify", textIndent: index < 2 ? 36 : 0 }]}>{paragraph}</Text></Region>)}
    {page.letter.closing.map((line, index) => <Region key={line} name="Signatory" top={[550, 577, 604, 645][index]} height={18}><Text style={index > 1 ? s.bold : s.text}>{line}</Text></Region>)}
  </PdfPage>;
}
function KeyValueTable({ rows, small = false }) {
  return <View style={s.table}>{rows.map(([label, value, height = 27.5], index) => <View key={label} style={[s.row, { minHeight: height, borderBottomWidth: index === rows.length - 1 ? 0 : 0.4 }]}><View style={s.label}><Text>{label}</Text></View><View style={s.value}><Text style={[s.text, { fontSize: small ? 9.5 : safe(value).length > 125 ? 9.5 : 11 }]}>{safe(value)}</Text></View></View>)}<View style={s.tableOutline} /></View>;
}
function InstallationPage({ page, ...props }) {
  const t = page.technical; const p = page.project;
  const rows = [["Quantity & Type:", page.quantityAndType], ["Capacity:", p.capacity], ["Speed:", t.speed], ["Travel Height:", p.travelHeight], ["No of Floors:", p.floors], ["No of Landings:", p.landings], ["Shaft Measurement (approx.)", p.shaftMeasurement], ["Car Size (approx.)", p.carSize], ["Entrance door frame", t.doorFrame], ["Type & Design of Car:", page.carDesign], ["Type of Car protection:", t.carProtectionDoor], ["Type of Landing protection:", t.landingProtection], ["Cabin Cutting", p.cabinCutting, 28.8], ["Cabin opening (approx.)", p.cabinOpening]];
  const small = rows.reduce((total, row) => total + safe(row[1]).length, 0) > 1100;
  return <PdfPage page={page} {...props}><Heading top={106}>NEW ELEVATOR INSTALLATION</Heading>
    <Region name="Installation table" left={66.4} top={146.8} width={443.4} height={445} style={{ fontSize: small ? 9.5 : 11 }}>
      <KeyValueTable rows={rows} small={small} />
      <View style={[s.table, { borderTopWidth: 0, flexDirection: "row", minHeight: 41 }]}><View style={[s.label, { justifyContent: "space-between" }]}><Text>Power Supply: M/C ROOM</Text><Text>LIFT WELL:</Text></View><View style={[s.value, { justifyContent: "space-between" }]}><Text>{safe(t.powerSupplyMachineRoom)}</Text><Text>{safe(t.powerSupplyLiftWell)}</Text></View><View style={[s.tableOutline, { borderTopWidth: 0 }]} /></View>
    </Region>
    <Region name="Additional features heading" top={602} height={17}><Text style={s.bold}>ADDITIONAL FEATURES AS FOR SITE REQUIREMENT</Text></Region>
    <Region name="Additional features" left={66.4} top={628.7} width={443.4} height={90}><KeyValueTable rows={[["Safety", t.safety, 41], ["Face Plate", t.facePlate, 27.5]]} /></Region>
  </PdfPage>;
}
function PricePage({ page, ...props }) {
  const terms = [["Taxes", page.taxDescription], ["Packing Forwarding Charges", page.packingForwarding], ["Delivery", page.delivery], ["Transport charges & Octroy", page.transportOctroi], ["Guarantee", page.guarantee]];
  return <PdfPage page={page} {...props}><Heading top={109}>PRICE SCHEDULE</Heading>
    <Region name="Price salutation" top={149} height={20}><Text>Dear Sir,</Text></Region>
    <Region name="Price introduction" top={176} height={43}><Text style={[s.text, { textAlign: "justify", textIndent: 57 }]}>We agree to supply, deliver all the required materials and to install {safe(page.quantity)} No of “Altis Elevator” {displayCapacity(page.capacity)} Capacity Passenger Elevators for your Building at, {safe(page.projectLocation)}.</Text></Region>
    <Region name="Price contract introduction" top={222} height={43}><Text style={[s.text, { textAlign: "justify" }]}>This offer accepted by you shall constitute the contract between us to make this offer a legal and valid contract binding on both parties.</Text></Region>
    <Region name="Commercial heading" top={275} height={20}><Text style={[s.bold, { textDecoration: "underline" }]}>Commercial Terms & Conditions: -</Text></Region>
    <Region name="Price amount" top={315} height={34}><Text style={s.bold}><Text style={{ textDecoration: "underline" }}>Price:</Text> {displayPrice(page.price.formatted)}{page.price.words ? ` (${page.price.words}).` : ""}</Text></Region>
    <Region name="Commercial terms" top={354} height={102}>{terms.map(([label, value]) => <View key={label} style={s.commercialRow}><Text style={s.commercialLabel}>{label}</Text><Text style={[s.commercialValue, { fontSize: terms.some(([, text]) => safe(text).length > 170) ? 9.5 : 11 }]}>: {safe(value)}</Text></View>)}</Region>
    <Region name="Payment heading" top={462} height={20}><Text style={[s.bold, { textDecoration: "underline" }]}>Terms of Payments</Text></Region>
    <Region name="Payment stages" top={489} height={46}>{page.payment.map((stage) => <Text key={stage.key} style={s.text}>{safe(stage.percentage)}% {stage.description}</Text>)}</Region>
    <Region name="Acceptance statement" top={543} height={30}><Text>All the above specifications /Prices and other terms &conditions are accepted.</Text></Region>
    {[["Accepted by", page.acceptance.acceptanceName], ["Signature", ""], ["Name", page.acceptance.acceptanceName], ["Date", displayDate(page.acceptance.acceptanceDate)]].map(([label, value], index) => <Region key={label} name="Acceptance field" top={584 + index * 27} height={26}><View style={{ flexDirection: "row" }}><Text style={{ width: 79 }}>{label}</Text><Text style={{ flex: 1 }}>: {safe(value)}</Text></View></Region>)}
  </PdfPage>;
}
function WarrantyPage({ page, ...props }) {
  return <PdfPage page={page} {...props}><Heading>{page.title}</Heading>
    <Region name="Warranty clauses" top={91} height={627} style={{ fontSize: 11.3, lineHeight: 1.195 }}>
      {page.sections.map((section, index) => <View key={index} style={{ flexShrink: 0, marginTop: index === 1 ? 25 : index > 2 ? 5 : 0 }}><Text style={[s.legalHeading, index === 2 ? { textAlign: "center", textDecoration: "underline", marginBottom: 4 } : {}]}>{section[0]}</Text>{section.slice(1).map((line, lineIndex) => <Text key={lineIndex} style={[s.legalText, { textIndent: index < 2 && lineIndex === 0 ? 36 : 0, marginTop: index < 2 && lineIndex === 0 ? 11 : 5 }]}>{line}</Text>)}</View>)}
    </Region>
  </PdfPage>;
}
function MaterialsPage({ page, ...props }) {
  const tops = [117, 163.2, 215, 266.8, 317.4, 368, 423, 473.8, 523.2, 572.8, 620, 667.2];
  return <PdfPage page={page} {...props}><Heading>MATERIAL USED BY ALTIS ELEVATORS</Heading>{page.rows.map((row, index) => <Region key={row.key} name={`${row.label} material`} top={tops[index]} height={index === 11 ? 48 : tops[index + 1] - tops[index] - 3} style={{ fontSize: safe(row.value).length > 130 ? 9.5 : 11 }}><View style={s.materialRow}><Text style={s.materialLabel}>{index + 1}. {row.label}</Text>{row.value && <><Text style={s.materialColon}>:</Text><Text style={s.materialValue}>{["cabin", "doors"].includes(row.key) && !safe(row.value).startsWith("(i)") ? "(i) " : ""}{safe(row.value)}</Text></>}</View></Region>)}</PdfPage>;
}
function BulletList({ values }) { return <>{values.map((value, index) => <View key={index} style={s.bullet}><Text style={s.bulletMark}>Ø</Text><Text style={s.bulletText}>{value}</Text></View>)}</>; }
function ObligationsPage({ page, ...props }) {
  return <PdfPage page={page} {...props}><Heading>{page.title}</Heading>
    <Region name="Contract obligations" top={117} height={598} style={{ fontSize: 10.5, lineHeight: 2 }}>
      <Text style={s.text}>OURS:</Text><BulletList values={page.ours} />
      <Text style={[s.bold, { textDecoration: "underline", flexShrink: 0 }]}>Customer's at their cost.</Text><BulletList values={page.customer.slice(0, -1)} />
      <Text style={[s.text, { marginTop: 20, lineHeight: 1.23, textAlign: "justify" }]}>{page.customer.at(-1)}</Text>
    </Region>
  </PdfPage>;
}
export default function AltisQuotationPdf({ documentData, branding = true, assets = { lockup: "/assets/altis-brand-lockup.png", watermark: "/assets/altis-watermark.png" }, onRender }) {
  const pages = documentData.pages;
  const props = { branding, assets };
  return <Document title={pages.cover.reference} author={pages.cover.company.name} onRender={(result) => { assertDocumentLayout(result); onRender?.(result); }}><CoverPage page={pages.cover} {...props} /><InstallationPage page={pages.installation} {...props} /><PricePage page={pages.priceSchedule} {...props} /><WarrantyPage page={pages.warranty} {...props} /><MaterialsPage page={pages.materials} {...props} /><ObligationsPage page={pages.obligations} {...props} /></Document>;
}
