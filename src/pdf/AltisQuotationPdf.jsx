import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { paddingTop: 42, paddingRight: 40, paddingBottom: 56, paddingLeft: 52, fontFamily: "Times-Roman", fontSize: 9.5, color: "#111", lineHeight: 1.3 },
  sidebar: { position: "absolute", top: 0, bottom: 0, left: 0, width: 18, backgroundColor: "#087629" },
  watermark: { position: "absolute", width: 290, height: 290, top: 230, left: 165, opacity: 0.12 },
  logo: { position: "absolute", top: 42, left: 78, width: 112, height: 112 },
  iso: { position: "absolute", top: 35, right: 38, fontFamily: "Helvetica", fontSize: 7 },
  heading: { fontSize: 13, textAlign: "center", textDecoration: "underline", marginBottom: 24 },
  bold: { fontFamily: "Times-Bold" }, center: { textAlign: "center" }, section: { marginBottom: 12 },
  footer: { position: "absolute", left: 52, right: 40, bottom: 24, flexDirection: "row", justifyContent: "space-between", fontFamily: "Times-Bold", fontSize: 8.5 },
  contactFooter: { position: "absolute", left: 20, right: 0, bottom: 0, height: 70, flexDirection: "row", backgroundColor: "#ffc400", borderTopWidth: 1, borderColor: "#111" },
  contactCell: { flex: 1, padding: 5, borderRightWidth: 1, borderColor: "#111", fontFamily: "Helvetica", fontSize: 6.5, lineHeight: 1.15 },
  coverBody: { marginTop: 90, marginHorizontal: 18, fontSize: 8.4 },
  authorizedSignatory: { position: "absolute", right: 70, bottom: 82, fontSize: 8.4 },
  refRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  attention: { marginTop: 8, textAlign: "center" }, subject: { marginTop: 8 }, paragraph: { marginTop: 6, textAlign: "justify", lineHeight: 1.18 },
  table: { borderWidth: 1, borderColor: "#111", marginTop: 8 }, row: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#111" },
  lastRow: { flexDirection: "row" }, label: { width: "36%", padding: 4, borderRightWidth: 1, borderColor: "#111", fontFamily: "Times-Bold" }, value: { width: "64%", padding: 4 },
  detailTitle: { marginTop: 16, marginBottom: 6, fontFamily: "Times-Bold", fontSize: 10 },
  compact: { fontSize: 8.3, lineHeight: 1.2 }, priceIntro: { marginBottom: 14, textAlign: "justify", lineHeight: 1.4 },
  commercialLine: { marginBottom: 4 }, acceptance: { marginTop: 18, lineHeight: 2.1 },
  legalHeading: { fontFamily: "Times-Bold", fontSize: 10, marginTop: 9, marginBottom: 3 }, legalText: { fontSize: 8.3, lineHeight: 1.3, textAlign: "justify", marginBottom: 7 },
  materialRow: { flexDirection: "row", marginBottom: 14, fontSize: 9.5 }, materialLabel: { width: "25%", fontFamily: "Times-Bold" }, materialValue: { width: "75%" },
  obligationTitle: { fontFamily: "Times-Bold", fontSize: 10, marginTop: 9, marginBottom: 5 }, bullet: { flexDirection: "row", marginBottom: 7, fontSize: 8.7, lineHeight: 1.35 }, bulletMark: { width: 15 }, bulletText: { flex: 1, textAlign: "justify" },
});
const safe = (value) => String(value ?? "");
function Footer({ footer }) { return <View style={styles.footer}><Text>Date: {safe(footer.date)}</Text><Text>{footer.executive}</Text><Text>{footer.customer}</Text></View>; }
function Branding({ cover = false, enabled = true }) {
  return <>
    {cover && <View style={styles.sidebar} />}
    {enabled && <Image src="/assets/watermark.png" style={styles.watermark} />}
    {cover && enabled && <Image src="/assets/logo.svg" style={styles.logo} />}
    {cover && <Text style={styles.iso}>ISO 9001: 2015 CERTIFIED COMPANY</Text>}
  </>;
}
function ContactFooter({ contacts }) { return <View style={styles.contactFooter}>{contacts.map((contact, index) => <View key={index} style={styles.contactCell}><Text>{safe(contact)}</Text></View>)}</View>; }
function PdfPage({ children, footer, cover, contacts, branding }) {
  return <Page size="LETTER" style={styles.page} wrap={false}><Branding cover={cover} enabled={branding} />{children}{cover ? <ContactFooter contacts={contacts} /> : <Footer footer={footer} />}</Page>;
}
function KeyValueTable({ rows }) {
  return <View style={styles.table}>{rows.map(([label, value], index) => <View key={label} style={index === rows.length - 1 ? styles.lastRow : styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{safe(value)}</Text></View>)}</View>;
}

function CoverPage({ page, branding }) {
  return <PdfPage cover contacts={page.company.contacts} branding={branding}>
    <View style={styles.coverBody}>
      <View style={styles.refRow}><Text><Text style={styles.bold}>Ref: </Text>{safe(page.reference)}</Text><Text><Text style={styles.bold}>Date: </Text>{safe(page.date)}</Text></View>
      {page.customer.name ? <Text>{safe(page.customer.name)}</Text> : null}
      {safe(page.customer.address).split(/\r?\n/).map((line, index) => <Text key={index}>{line}</Text>)}
      <Text style={styles.attention}><Text style={styles.bold}>Kind Attention: </Text>{safe(page.attention)}</Text>
      <Text style={styles.subject}><Text style={styles.bold}>Sub: </Text>{safe(page.subject)}</Text>
      <Text style={{ marginTop: 14 }}>{safe(page.letter.salutation)}</Text>
      {page.letter.paragraphs.map((paragraph, index) => <Text key={index} style={styles.paragraph}>{safe(paragraph)}</Text>)}
      {page.letter.closing.slice(0, 3).map((line) => <Text key={line} style={{ marginTop: 0 }}>{safe(line)}</Text>)}
    </View>
    <Text style={styles.authorizedSignatory}>{safe(page.letter.closing[3])}</Text>
  </PdfPage>;
}
function InstallationPage({ page, branding }) {
  const t = page.technical; const p = page.project;
  const rows = [
    ["Quantity & Type:", safe(page.quantityAndType)], ["Capacity:", p.capacity], ["Speed:", t.speed],
    ["Travel Height:", p.travelHeight], ["No of Floors:", p.floors], ["No of Landings:", p.landings],
    ["Shaft Measurement (approx.)", p.shaftMeasurement], ["Car Size (approx.)", p.carSize],
    ["Entrance door frame", t.doorFrame], ["Type & Design of Car:", page.carDesign],
    ["Type of Car protection:", t.carProtectionDoor], ["Type of Landing protection:", t.landingProtection],
    ["Cabin Cutting", p.cabinCutting], ["Cabin opening (approx.)", p.cabinOpening],
    ["Power Supply: M/C ROOM", t.powerSupplyMachineRoom], ["LIFT WELL:", t.powerSupplyLiftWell],
  ];
  return <PdfPage footer={page.footer} branding={branding}><Text style={styles.heading}>NEW ELEVATOR INSTALLATION</Text><KeyValueTable rows={rows} /><Text style={styles.detailTitle}>ADDITIONAL FEATURES AS FOR SITE REQUIREMENT</Text><KeyValueTable rows={[["Safety", t.safety], ["Face Plate", t.facePlate]]} /></PdfPage>;
}
function PricePage({ page, branding }) {
  return <PdfPage footer={page.footer} branding={branding}>
    <Text style={styles.heading}>PRICE SCHEDULE</Text><Text style={styles.section}>Dear Sir,</Text>
    <Text style={styles.priceIntro}>We agree to supply, deliver all the required materials and to install {safe(page.quantity)} No of “Altis Elevator” {safe(page.capacity)} Capacity Passenger Elevators for your Building at, {safe(page.projectLocation)}.</Text>
    <Text style={styles.priceIntro}>This offer accepted by you shall constitute the contract between us to make this offer a legal and valid contract binding on both parties.</Text>
    <Text style={[styles.bold, styles.section]}>Commercial Terms & Conditions: -</Text>
    <Text style={[styles.bold, { marginBottom: 14 }]}>Price: {safe(page.price.formatted)} ({safe(page.price.words)}).</Text>
    {[["Taxes", page.taxDescription], ["Packing Forwarding Charges", page.packingForwarding], ["Delivery", page.delivery], ["Transport charges & Octroy", page.transportOctroi], ["Guarantee", page.guarantee]].map(([label, value]) => <Text key={label} style={styles.commercialLine}>{label} : {safe(value)}</Text>)}
    <Text style={[styles.bold, { marginTop: 14, marginBottom: 6 }]}>Terms of Payments</Text>
    {page.payment.map((stage) => <Text key={stage.key} style={styles.commercialLine}>{safe(stage.percentage)}% {safe(stage.description)}</Text>)}
    <Text style={{ marginTop: 14 }}>All the above specifications /Prices and other terms &conditions are accepted.</Text>
    <View style={styles.acceptance}><Text>Accepted by : {safe(page.acceptance.acceptanceName)}</Text><Text>Signature   :</Text><Text>Name        : {safe(page.acceptance.acceptanceName)}</Text><Text>Date        : {safe(page.acceptance.acceptanceDate)}</Text></View>
  </PdfPage>;
}
function WarrantyPage({ page, branding }) {
  return <PdfPage footer={page.footer} branding={branding}><Text style={styles.heading}>{safe(page.title)}</Text>{page.sections.map((section, sectionIndex) => <View key={sectionIndex}>{section.map((line, index) => <Text key={index} style={index === 0 ? styles.legalHeading : styles.legalText}>{safe(line)}</Text>)}</View>)}</PdfPage>;
}
function MaterialsPage({ page, branding }) {
  return <PdfPage footer={page.footer} branding={branding}><Text style={styles.heading}>MATERIAL USED BY ALTIS ELEVATORS</Text>{page.rows.map((row, index) => <View key={row.key} style={styles.materialRow}><Text style={styles.materialLabel}>{index + 1}. {safe(row.label)}</Text><Text style={styles.materialValue}>: {safe(row.value)}</Text></View>)}</PdfPage>;
}
function BulletList({ values }) { return <>{values.map((value, index) => <View key={index} style={styles.bullet}><Text style={styles.bulletMark}>•</Text><Text style={styles.bulletText}>{safe(value)}</Text></View>)}</>; }
function ObligationsPage({ page, branding }) {
  return <PdfPage footer={page.footer} branding={branding}><Text style={styles.heading}>{safe(page.title)}</Text><Text style={styles.obligationTitle}>OURS:</Text><BulletList values={page.ours} /><Text style={styles.obligationTitle}>Customer's at their cost.</Text><BulletList values={page.customer} /></PdfPage>;
}
export default function AltisQuotationPdf({ documentData, branding = true }) {
  const pages = documentData.pages;
  return <Document title={pages.cover.reference} author="Altis Elevators"><CoverPage page={pages.cover} branding={branding} /><InstallationPage page={pages.installation} branding={branding} /><PricePage page={pages.priceSchedule} branding={branding} /><WarrantyPage page={pages.warranty} branding={branding} /><MaterialsPage page={pages.materials} branding={branding} /><ObligationsPage page={pages.obligations} branding={branding} /></Document>;
}
