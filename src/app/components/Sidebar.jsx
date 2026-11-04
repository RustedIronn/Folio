import { Check, CircleAlert, Cloud, FileText, HardDrive, LoaderCircle, RotateCcw } from "lucide-react";
import { draftSaveLabel } from "../../models/quotation/workspace.js";
import { sidebarStepDetail } from "../workflowPresentation.js";
import Button from "./Button.jsx";

export default function Sidebar({ workflow, onReset }) {
  const { currentStep, workflowProgress, overallProgress, saveStatus, drafts } = workflow;
  const remaining = Math.max(0, overallProgress.required - overallProgress.completed);
  const saving = saveStatus === "saving" || drafts.status === "loading";
  const attention = saveStatus === "unable" || saveStatus === "local";
  const SaveIcon = saving ? LoaderCircle : attention ? CircleAlert : drafts.ownerUid ? Cloud : HardDrive;
  const saveTitle = drafts.status === "loading" ? "Opening quotation" : saveStatus === "saving" ? "Saving draft" : saveStatus === "unable" ? "Save needs attention" : saveStatus === "local" ? "Saved locally" : "Draft saved";

  return <aside className="product-rail" aria-label="Quotation navigator">
    <a className="product-brand" href="#customer" onClick={(event) => { event.preventDefault(); workflow.visitStep("customer"); }} aria-label="Altis QuoteFlow home"><img src="/assets/altis-emblem.png" alt="" /><span>ALTIS<small>ELEVATORS</small></span></a>
    <div className="rail-project"><div><strong>QuoteFlow</strong><span>Quotation workspace</span></div></div>
    <p className="rail-caption">Quotation steps</p>
    <nav className="rail-navigation" aria-label="Quotation sections">{workflowProgress.map((step, index) => {
      const current = step.id === currentStep;
      const complete = step.required > 0 && step.completed >= step.required;
      const detail = sidebarStepDetail(step);
      return <button type="button" key={step.id} className={`rail-step state-${step.state}${step.id === "review" ? " rail-review-step" : ""}`} aria-current={current ? "step" : undefined} aria-label={`${step.label}. ${current ? "Current section. " : ""}${detail}`} onClick={() => workflow.visitStep(step.id)}>
        <span className="rail-step-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <span className="rail-step-copy"><strong>{step.label}</strong><small>{complete && <Check size={12} aria-hidden="true" />}{step.state === "incomplete" && <CircleAlert size={12} aria-hidden="true" />}{detail}</small></span>
        {step.id === "review" && <FileText className="rail-review-icon" size={16} aria-hidden="true" />}
      </button>;
    })}</nav>
    <div className="rail-bottom">
      <div className="rail-completion"><div><span>Quotation details</span><strong>{overallProgress.percent}%</strong></div><progress max="100" value={overallProgress.percent} aria-label="Required quotation details completed, including Altis standards" /><small>{remaining ? `${remaining} required ${remaining === 1 ? "detail" : "details"} remaining` : "All required details complete"}</small></div>
      <div className={`rail-save save-status-${saveStatus}`} role="status" aria-live="polite" aria-atomic="true"><SaveIcon className={saving ? "rail-save-spinner" : undefined} size={17} aria-hidden="true" /><div><strong>{saveTitle}</strong><span>{draftSaveLabel(drafts)}</span></div></div>
      <Button variant="tertiary" className="rail-reset" onClick={onReset}><RotateCcw size={13} aria-hidden="true" />Reset quotation</Button>
    </div>
  </aside>;
}
