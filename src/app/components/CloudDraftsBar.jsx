import Button from "./Button.jsx";
import Select from "./Select.jsx";
import { draftSaveLabel } from "../../models/quotation/workspace.js";
import "../styles/cloud-workspace.css";

export default function CloudDraftsBar({ workflow }) {
  const { employee, drafts, setAuthIntent } = workflow;
  return <section className={`cloud-workspace${!employee.user ? " is-guest" : ""}`} aria-label="Quotation storage">
    <div className="cloud-workspace-status"><strong>{employee.user ? "Employee workspace" : "Visitor workspace"}</strong><span>{draftSaveLabel(drafts)}</span></div>
    {!employee.authorized ? <Button variant="secondary" onClick={() => setAuthIntent("workspace")}>{employee.user ? employee.status === "unverified" ? "Verify email" : employee.status === "error" ? "Reconnect employee account" : "Employee account" : "Sign in to save across devices"}</Button> : <div className="cloud-drafts-control"><label htmlFor="cloud-draft-select">Saved quotations ({drafts.drafts.length})</label><Select id="cloud-draft-select" aria-label="Saved quotations" value={drafts.drafts.some((entry) => entry.id === drafts.workspace.id) ? drafts.workspace.id : ""} placeholder="Choose a saved quotation" disabled={!drafts.drafts.length} options={drafts.drafts.map((entry) => ({ value: entry.id, label: [entry.quotation.reference.quotationNumber || "Untitled quotation", entry.quotation.customer.projectLocation || "Location pending", entry.pending ? "Changes on this device" : entry.localOnly ? "This device only" : "", `Draft ${entry.id.slice(-6)}`].filter(Boolean).join(" · ") }))} onChange={(id) => drafts.manager.open(id)} /></div>}
    {drafts.notice && <p className="cloud-workspace-notice" role="status">{drafts.notice}</p>}
    {employee.user && employee.status === "error" && <p className="field-error" role="alert">The employee connection could not be checked. Your entries are kept on this device; reconnect to resume cloud saving and PDF access.</p>}
    {!drafts.localSaved && <p className="field-error" role="alert">This browser could not save a local copy. Keep this page open until cloud saving is confirmed.</p>}
    {drafts.status === "error" && <div className="cloud-workspace-error" role="alert"><p>{drafts.error} Your current entries remain on this device{drafts.localSaved ? "." : " only while this page is open."}</p><Button variant="secondary" onClick={drafts.manager.retry}>Retry cloud sync</Button></div>}
    {drafts.conflict && <div className="cloud-workspace-conflict" role="alert"><strong>Two versions need review</strong><p>{drafts.error}</p><div><Button onClick={drafts.manager.saveCopy}>Save my version as a copy</Button>{drafts.conflict.remote && <Button variant="secondary" onClick={drafts.manager.useCloud}>Use cloud version</Button>}</div></div>}
  </section>;
}
