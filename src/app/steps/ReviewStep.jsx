import { Component, lazy, Suspense } from "react";
import { ArrowUpRight, Eye } from "lucide-react";
import Field from "../components/Field.jsx";
import Button from "../components/Button.jsx";
import { readinessMessage } from "../workflowPresentation.js";

const PdfPreview = lazy(() => import("../../pdf/PdfPreview.jsx"));
function SummaryRows({ rows }) {
  return <dl>{rows.filter(([, value]) => String(value ?? "").trim()).map(([label, value]) => <div key={label} className={label.endsWith(" price") ? "summary-price" : undefined}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
function SummaryGroup({ title, rows, onEdit, highlights, children }) {
  const populated = rows.filter(([, value]) => String(value ?? "").trim());
  if (!populated.length && !children) return null;
  const primary = highlights ? populated.filter(([label]) => highlights.includes(label)) : populated.slice(0, 3);
  const additional = populated.filter((row) => !primary.includes(row));
  return <section className="summary-group"><div className="summary-heading"><h3>{title}</h3><Button variant="compact" aria-label={`Edit ${title}`} onClick={onEdit}>Edit</Button></div><SummaryRows rows={primary} />{additional.length > 0 && <details className="summary-more"><summary>View all {title.toLowerCase()} details</summary><SummaryRows rows={additional} /></details>}{children}</section>;
}
function ReviewSummary({ documentData, onEdit }) {
  const { pages, provenance } = documentData;
  const installation = pages.installation;
  const price = pages.priceSchedule;
  const priceLabel = `${documentData.document?.label ?? "Quotation"} price`;
  return <div className="review-summary">
    <SummaryGroup title="Customer & reference" onEdit={() => onEdit("customer")} highlights={["Recipient", "Address", "Project location"]} rows={[["Reference", pages.cover.reference], ["Date", pages.cover.date], ["Recipient", pages.cover.attention], ["Address", pages.cover.customer.address], ["Subject", pages.cover.subject], ["Project location", price.projectLocation]]} />
    <SummaryGroup title="Lift & materials" onEdit={() => onEdit("installation")} highlights={["Configuration", "Capacity", "Floors"]} rows={[["Configuration", installation.quantityAndType], ["Capacity", installation.project.capacity], ["Speed", installation.technical.speed], ["Travel height", installation.project.travelHeight], ["Floors", installation.project.floors], ["Landings", installation.project.landings], ["Shaft", installation.project.shaftMeasurement], ["Car size", installation.project.carSize], ["Cabin opening", installation.project.cabinOpening], ["Landing protection", installation.technical.landingProtection], ["Buzzer", installation.technical.buzzer]]}>
      <details className="summary-more summary-materials"><summary>View all materials details</summary><SummaryRows rows={pages.materials.rows.map((row) => [row.label, row.value || (row.optional ? "Optional — not specified" : "Needs information")])} /><Button variant="compact" aria-label="Edit materials" onClick={() => onEdit("materials")}>Edit materials</Button></details>
    </SummaryGroup>
    <SummaryGroup title="Price & commercial terms" onEdit={() => onEdit("commercial")} highlights={[priceLabel, "Tax treatment", "Delivery", "Payment schedule"]} rows={[[priceLabel, price.price.formatted], ["Amount in words", price.price.words], ["Tax treatment", price.taxDescription], ["Packing & forwarding", price.packingForwarding], ["Delivery", price.delivery], ["Transport / octroi", price.transportOctroi], ["Guarantee", price.guarantee], ...Object.entries(price.bankDetails ?? {}).filter(([key])=>["accountName","accountNumber","bankName","ifsc"].includes(key)).map(([key,value])=>[{accountName:"Account name",accountNumber:"Account number",bankName:"Bank and branch",ifsc:"IFSC"}[key],value]), ...(price.additionalEntry ? [[price.additionalEntry.label, price.additionalEntry.value]] : []), ["Payment schedule", price.payment.map((stage) => stage.percentage + "%").join(" / ")], ...price.payment.map((stage) => [`Payment: ${stage.percentage}%`, stage.description])]} />
    <p className="review-trace">{provenance.configurationOrigin === "shared" ? "Selected lift: team-added model. Its specifications are saved with this quotation." : `Selected lift: configuration #${provenance.catalogueId || "not selected"}${provenance.catalogueSourceRow ? `, workbook row ${provenance.catalogueSourceRow}` : ""}.`}</p>
  </div>;
}
class PdfPreviewErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidUpdate(previousProps) { if (previousProps.previewKey !== this.props.previewKey && this.state.error) this.setState({ error: null }); }
  render() { return this.state.error ? <p className="source-warning"><strong>Preview could not be prepared.</strong><span>Check the required entries, then try Preview again.</span></p> : this.props.children; }
}

export default function ReviewStep({ workflow }) {
  const { quotation, update, resolved, exportReady, documentAccess, requestPreview, readinessGroups, jumpToIssue, showReviewErrors, setShowReviewErrors, previewRequested, visitStep, pdfFileName } = workflow;
  const identity = resolved.document ?? { label:"Quotation", lower:"quotation" };
  return <>
    <div className="review-actions"><div><p className="review-actions-kicker">Document readiness</p><span>{!exportReady ? `${resolved.missing.length} item(s) need attention before download.` : documentAccess.canDownload ? "Ready to preview and download." : "Details complete. Sign in with a verified account for PDF generation."}</span></div><div className="review-action-buttons">{!exportReady && <Button variant="secondary" onClick={() => setShowReviewErrors(true)}>Review missing details</Button>}<Button onClick={requestPreview}><Eye size={15} aria-hidden="true" />{documentAccess.canPreview ? `Preview ${identity.lower}` : "Sign in for preview"}</Button></div></div>
    {!exportReady && documentAccess.canPreview && <p className="draft-indicator"><strong>Draft preview available.</strong><span>Preview shows only entered or selected values; incomplete fields stay blank. Download remains locked until required entries are complete.</span></p>}
    {showReviewErrors && readinessGroups.length > 0 && <div className="validation-summary" role="region" aria-label="Details needed before download"><strong>Complete these items before downloading the {identity.lower}:</strong>{readinessGroups.map(([title, entries]) => <section key={title}><div className="validation-group-heading"><h3>{title}</h3><Button variant="compact" onClick={() => visitStep(title === "Customer & reference" ? "customer" : title === "Lift & installation" ? "installation" : title === "Materials" ? "materials" : "commercial")}>Open section</Button></div><ul>{entries.map((entry) => <li key={`${entry.path}-${entry.label}`}><button type="button" onClick={() => jumpToIssue(entry)}><span className="readiness-message">{readinessMessage(entry)}</span><span className="readiness-action">Go to field<ArrowUpRight size={13} aria-hidden="true" /></span></button></li>)}</ul></section>)}</div>}
    {resolved.documentNotices?.length > 0 && <div className="review-warning" role="note"><strong>Agreement wording review</strong>{resolved.documentNotices.map((notice) => <p key={notice}>{notice}</p>)}</div>}
    {resolved.warnings.length > 0 && <div className="review-warning"><strong>Selected lift needs review</strong>{resolved.warnings.map((warning) => <p key={warning}>{warning.replace("Selected lift source note: ", "")}</p>)}</div>}
    <div className={`review-workbench ${previewRequested && documentAccess.canPreview ? "has-preview" : "summary-first"}`}>
      <div className="review-document">
        {!documentAccess.canPreview ? <div className="pdf-account-gate"><Eye size={24} aria-hidden="true" /><h3>Your six-page {identity.lower}</h3><p>Sign in with a verified account using the action above to preview or download. Your visitor entries will be retained.</p><span>Branded · Print-friendly</span></div> : previewRequested ? <PdfPreviewErrorBoundary previewKey={`${resolved.pages.cover.reference}-${resolved.missing.length}`}><Suspense fallback={<div className="pdf-loading" role="status"><strong>Preparing {identity.lower} preview…</strong><span>The document viewer is loading.</span></div>}><PdfPreview documentData={resolved} fileName={pdfFileName} downloadEnabled={documentAccess.canDownload} /></Suspense></PdfPreviewErrorBoundary> : <div className="review-document-empty"><div className="empty-document-sheet"><img src="/assets/altis-emblem.png" alt="Altis Elevators" /><h3>{identity.label} preview</h3><p>Preview the six-page {identity.lower} with your current entries.</p><Button onClick={requestPreview}><Eye size={15} aria-hidden="true" />Preview {identity.lower}</Button><div className="document-page-count">6 PAGES · ALTIS ELEVATORS</div></div></div>}
      </div>
      <aside className="review-inspector" aria-label={`${identity.label} details`}>
        <ReviewSummary documentData={resolved} onEdit={visitStep} />
        <details className="detail-panel"><summary>Acceptance details</summary><div className="form-grid"><Field id="acceptance-name" label="Acceptance name (optional printable field)" value={quotation.document.acceptanceName} onChange={(value) => update("document", "acceptanceName", value)} /><Field id="acceptance-date" label="Acceptance date (optional printable field)" type="date" value={quotation.document.acceptanceDate} onChange={(value) => update("document", "acceptanceDate", value)} /></div></details>
      </aside>
    </div>
  </>;
}
