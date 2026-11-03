import { WORKFLOW_STEPS } from "../../models/quotation/workflow.js";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Button from "./Button.jsx";

export default function WorkflowSection({ step, active, children, onBack, onContinue }) {
  const status = step.state === "current" ? "Current step" : step.state === "complete" ? "Complete" : step.state === "ready" ? "Ready to download" : step.state === "available" ? "Ready to review" : step.state === "incomplete" ? `${step.missing.length} item${step.missing.length === 1 ? "" : "s"} need attention` : step.state === "in-progress" ? "In progress" : "Not started";
  const number = String(WORKFLOW_STEPS.findIndex((entry) => entry.id === step.id) + 1).padStart(2, "0");
  return <section id={step.id} tabIndex="-1" className={`workflow-section ${active ? "workflow-section-active" : ""}`} hidden={!active} aria-labelledby={`${step.id}-heading`}><header className="section-heading"><span>{number}</span><div><h2 id={`${step.id}-heading`} className="sr-only">{step.label}</h2><p className="section-kicker">Quotation details</p><p className="section-progress">{status} · {step.required ? `${step.completed} of ${step.required} required details ready, including Altis standards` : "Document controls"}</p></div></header>{children}<footer className="step-actions">{onBack && <Button variant="secondary" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" />Back</Button>}{onContinue && <Button onClick={onContinue}>Save &amp; Continue<ArrowRight size={16} aria-hidden="true" /></Button>}</footer></section>;
}
