import { Component, lazy, Suspense } from "react";
import { Eye } from "lucide-react";
import Field from "../components/Field.jsx";
import Button from "../components/Button.jsx";

const PdfPreview = lazy(() => import("../../pdf/PdfPreview.jsx"));
function SummaryGroup({ title, rows, onEdit }) {
  const populated = rows.filter(([, value]) => String(value ?? "").trim());
  if (!populated.length) return null;
  return <section className="summary-group"><div className="summary-heading"><h3>{title}</h3><Button variant="compact" onClick={onEdit}>Edit</Button></div><dl>{populated.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>;
}
function ReviewSummary({ documentData, onEdit }) {
  const { pages, provenance } = documentData;
  const installation = pages.installation;
  const price = pages.priceSchedule;
  return <div className="review-summary">
    <SummaryGroup title="Customer & reference" onEdit={() => onEdit("customer")} rows={[["Reference", pages.cover.reference], ["Date", pages.cover.date], ["Recipient", pages.cover.attention], ["Address", pages.cover.customer.address], ["Subject", pages.cover.subject], ["Project location", price.projectLocation]]} />
    <SummaryGroup title="Lift & installation" onEdit={() => onEdit("installation")} rows={[["Configuration", installation.quantityAndType], ["Capacity", installation.project.capacity], ["Speed", installation.technical.speed], ["Travel height", installation.project.travelHeight], ["Floors", installation.project.floors], ["Landings", installation.project.landings], ["Shaft", installation.project.shaftMeasurement], ["Car size", installation.project.carSize], ["Cabin opening", installation.project.cabinOpening]]} />
    <SummaryGroup title="Materials" onEdit={() => onEdit("materials")} rows={pages.materials.rows.map((row) => [row.label, row.value || (row.optional ? "Not specified" : "Needs information")])} />
    <SummaryGroup title="Price & commercial terms" onEdit={() => onEdit("commercial")} rows={[["Quotation price", price.price.formatted], ["Amount in words", price.price.words], ["Tax treatment", price.taxDescription], ["Packing & forwarding", price.packingForwarding], ["Delivery", price.delivery], ["Transport / octroi", price.transportOctroi], ["Guarantee", price.guarantee], ...price.payment.map((stage) => [`Payment: ${stage.percentage}%`, stage.description])]} />
    <p className="review-trace">Selected lift: configuration #{provenance.catalogueId || "not selected"}{provenance.catalogueSourceRow ? `, workbook row ${provenance.catalogueSourceRow}` : ""}.</p>
  </div>;
}
class PdfPreviewErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidUpdate(previousProps) { if (previousProps.previewKey !== this.props.previewKey && this.state.error) this.setState({ error: null }); }
  render() { return this.state.error ? <p className="source-warning"><strong>Preview could not be prepared.</strong><span>Check the required quotation entries, then try Preview quotation again.</span></p> : this.props.children; }
}

export default function ReviewStep({ workflow }) {
  const { quotation, update, resolved, exportReady, readinessGroups, jumpToIssue, showReviewErrors, setShowReviewErrors, previewRequested, setPreviewRequested, visitStep, pdfFileName } = workflow;
  return <>
    <div className="review-actions"><div><p className="review-actions-kicker">Document readiness</p><span>{!exportReady ? `${resolved.missing.length} item(s) need attention before download.` : "Ready to preview and download."}</span></div><div className="review-action-buttons"><Button variant="secondary" onClick={() => setShowReviewErrors(true)}>Review missing details</Button><Button onClick={() => setPreviewRequested(true)}><Eye size={15} aria-hidden="true" />Preview quotation</Button></div></div>
    {!exportReady && <p className="draft-indicator"><strong>Draft preview available.</strong><span>Preview shows only entered or selected values; incomplete fields stay blank. Download remains locked until required entries are complete.</span></p>}
    {showReviewErrors && readinessGroups.length > 0 && <div className="validation-summary" role="region" aria-label="Details needed before download"><strong>Complete these items before downloading the quotation:</strong>{readinessGroups.map(([title, entries]) => <section key={title}><div className="validation-group-heading"><h3>{title}</h3><Button variant="compact" onClick={() => visitStep(title === "Customer & reference" ? "customer" : title === "Lift & installation" ? "installation" : title === "Materials" ? "materials" : "commercial")}>Open section</Button></div><ul>{entries.map((entry) => <li key={`${entry.path}-${entry.label}`}><button type="button" onClick={() => jumpToIssue(entry)}>{entry.label}<span>Go to field</span></button></li>)}</ul></section>)}</div>}
    {resolved.warnings.length > 0 && <div className="review-warning"><strong>Selected lift needs review</strong>{resolved.warnings.map((warning) => <p key={warning}>{warning.replace("Selected lift source note: ", "")}</p>)}</div>}
    <div className="review-workbench">
      <div className="review-document">
        {previewRequested ? <PdfPreviewErrorBoundary previewKey={`${resolved.pages.cover.reference}-${resolved.missing.length}`}><Suspense fallback={<div className="pdf-loading" role="status"><strong>Preparing quotation preview…</strong><span>The document viewer is loading.</span></div>}><PdfPreview documentData={resolved} fileName={pdfFileName} downloadEnabled={exportReady} /></Suspense></PdfPreviewErrorBoundary> : <div className="review-document-empty"><div className="empty-document-sheet"><img src="/assets/altis-emblem.png" alt="Altis Elevators" /><h3>Quotation preview</h3><p>Preview the six-page quotation with your current entries.</p><Button onClick={() => setPreviewRequested(true)}><Eye size={15} aria-hidden="true" />Preview quotation</Button><div className="document-page-count">6 PAGES · ALTIS ELEVATORS</div></div></div>}
      </div>
      <aside className="review-inspector" aria-label="Quotation details">
        <ReviewSummary documentData={resolved} onEdit={visitStep} />
        <details className="detail-panel"><summary>Acceptance details</summary><div className="form-grid"><Field id="acceptance-name" label="Acceptance name (optional printable field)" value={quotation.document.acceptanceName} onChange={(value) => update("document", "acceptanceName", value)} /><Field id="acceptance-date" label="Acceptance date (optional printable field)" type="date" value={quotation.document.acceptanceDate} onChange={(value) => update("document", "acceptanceDate", value)} /></div></details>
      </aside>
    </div>
  </>;
}
