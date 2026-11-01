import { WORKFLOW_STEPS } from "../../models/quotation/workflow.js";

export default function WorkflowSection({ step, active, children, onBack, onContinue }) {
  const status = step.state === "current" ? "Current step" : step.state === "complete" ? "Complete" : step.state === "incomplete" ? `${step.missing.length} item${step.missing.length === 1 ? "" : "s"} need attention` : step.state === "in-progress" ? "In progress" : "Not started";
  const number = String(WORKFLOW_STEPS.findIndex((entry) => entry.id === step.id) + 1).padStart(2, "0");
  return <section id={step.id} tabIndex="-1" className={`workflow-section ${active ? "workflow-section-active" : ""}`} hidden={!active} aria-labelledby={`${step.id}-heading`}><header className="section-heading"><span>{number}</span><div><h2 id={`${step.id}-heading`}>{step.label}</h2><p>{status} · {step.completed} of {step.required} required fields completed</p></div></header>{children}<footer className="step-actions">{onBack ? <button className="button button-quiet" type="button" onClick={onBack}>Back</button> : <span />}{onContinue ? <button className="button" type="button" onClick={onContinue}>Save &amp; Continue</button> : <button className="button button-quiet" type="button" onClick={onBack}>Back to commercial terms</button>}</footer></section>;
}
