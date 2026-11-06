import { useState } from "react";
import { Trash2 } from "lucide-react";
import ConfirmationDialog from "./ConfirmationDialog.jsx";
import Button from "./Button.jsx";
import Select from "./Select.jsx";
import "../styles/cloud-workspace.css";

export default function CloudDraftsBar({ workflow }) {
  const { employee, drafts, setAuthIntent } = workflow;
  const [deleteTarget,setDeleteTarget]=useState(null);
  const [deleteError,setDeleteError]=useState("");
  const [deleting,setDeleting]=useState(false);
  const selected=(drafts.drafts ?? []).find((entry)=>entry.id === drafts.workspace.id);
  async function confirmDelete() {
    if (deleting || deleteTarget?.uid !== employee.user?.uid) return;
    setDeleting(true);setDeleteError("");
    try { await drafts.manager.deleteDraft(deleteTarget.id);setDeleteTarget(null); }
    catch(error) { setDeleteError(["unavailable","deadline-exceeded"].includes(error.code) ? "Deletion could not be confirmed. Your local draft has been kept. Reconnect and retry." : error.message || "The draft could not be deleted. Your data has been kept."); }
    finally { setDeleting(false); }
  }
  if (!employee.user && !drafts.notice && drafts.localSaved && drafts.status !== "error" && !drafts.conflict) return null;
  return <section className={`cloud-workspace${!employee.user ? " is-guest" : ""}`} aria-label="Quotation storage">
    {!employee.authorized ? <Button variant="secondary" onClick={() => setAuthIntent("workspace")}>{employee.user ? employee.status === "unverified" ? "Verify email" : employee.status === "error" ? "Reconnect employee account" : "Employee account" : "Sign in to save across devices"}</Button> : <div className="cloud-drafts-control"><label htmlFor="cloud-draft-select">Saved documents ({drafts.drafts.length})</label><Select id="cloud-draft-select" aria-label="Saved documents" value={drafts.drafts.some((entry) => entry.id === drafts.workspace.id) ? drafts.workspace.id : ""} placeholder="Choose a saved document" disabled={!drafts.drafts.length || Boolean(drafts.deletingDraftId)} options={drafts.drafts.map((entry) => ({ value: entry.id, label: [entry.quotation.reference.quotationNumber || "Untitled document", entry.quotation.customer.projectLocation || "Location pending", entry.pending ? "Changes on this device" : entry.localOnly ? "This device only" : "", `Draft ${entry.id.slice(-6)}`].filter(Boolean).join(" · ") }))} onChange={(id) => drafts.manager.open(id)} /></div>}
    {employee.authorized && selected && <Button variant="tertiary" disabled={drafts.status === "loading" || Boolean(drafts.deletingDraftId)} onClick={()=>{setDeleteError("");setDeleteTarget({id:selected.id,uid:employee.user.uid,label:[selected.quotation.reference.quotationNumber || "Untitled document",selected.quotation.customer.projectLocation].filter(Boolean).join(" · ")});}}><Trash2 size={15} aria-hidden="true"/>Delete selected draft</Button>}
    {deleteTarget && employee.authorized && deleteTarget.uid === employee.user?.uid && <ConfirmationDialog title="Delete this draft?" description={`Delete “${deleteTarget.label}” from your account and this device? This cannot be undone. Other drafts will be kept.`} onDismiss={()=>{if(!deleting)setDeleteTarget(null);}}>{deleteError && <p className="field-error draft-delete-error" role="alert">{deleteError}</p>}<Button variant="secondary" disabled={deleting} onClick={()=>setDeleteTarget(null)}>Cancel</Button><Button variant="danger" loading={deleting} onClick={confirmDelete}>Delete draft</Button></ConfirmationDialog>}
    {drafts.notice && <p className="cloud-workspace-notice" role="status">{drafts.notice}</p>}
    {employee.user && employee.status === "error" && <p className="field-error" role="alert">The employee connection could not be checked. Your entries are kept on this device; reconnect to resume cloud saving and PDF access.</p>}
    {!drafts.localSaved && <p className="field-error" role="alert">This browser could not save a local copy. Keep this page open until cloud saving is confirmed.</p>}
    {drafts.status === "error" && <div className="cloud-workspace-error" role="alert"><p>{drafts.error} Your current entries remain on this device{drafts.localSaved ? "." : " only while this page is open."}</p><Button variant="secondary" onClick={drafts.manager.retry}>Retry cloud sync</Button></div>}
    {drafts.conflict && <div className="cloud-workspace-conflict" role="alert"><strong>Two versions need review</strong><p>{drafts.error}</p><div><Button onClick={drafts.manager.saveCopy}>Save my version as a copy</Button>{drafts.conflict.remote && <Button variant="secondary" onClick={drafts.manager.useCloud}>Use cloud version</Button>}</div></div>}
  </section>;
}
