import CustomerStep from "./steps/CustomerStep.jsx";
import { useState } from "react";
import LiftStep from "./steps/LiftStep.jsx";
import MaterialsStep from "./steps/MaterialsStep.jsx";
import CommercialStep from "./steps/CommercialStep.jsx";
import ReviewStep from "./steps/ReviewStep.jsx";
import Button from "./components/Button.jsx";
import WorkflowSection from "./components/WorkflowSection.jsx";
import WorkspaceSummary from "./components/WorkspaceSummary.jsx";
import ConfirmationDialog from "./components/ConfirmationDialog.jsx";
import { useQuotationWorkflow } from "./hooks/useQuotationWorkflow.js";
import { WORKFLOW_STEPS } from "../models/quotation/workflow.js";
import "./App.css";

const STEP_COMPONENTS = { customer: CustomerStep, installation: LiftStep, materials: MaterialsStep, commercial: CommercialStep, review: ReviewStep };
const stateLabel = (state) => ({ complete: "Complete", ready: "Ready", available: "Available", incomplete: "Needs attention", "in-progress": "In progress", current: "Current", "not-started": "Not started" })[state];

export default function App() {
  const workflow = useQuotationWorkflow();
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const { currentStep, currentStepIndex, workflowProgress, overallProgress, reference, saveStatus, pendingConfiguration } = workflow;
  const current = workflowProgress[currentStepIndex];

  function resetQuotation() { setShowResetConfirmation(true); }
  function confirmReset() { workflow.resetDraft(); setShowResetConfirmation(false); }

  return <main className="workspace-shell">
    <aside className="workspace-sidebar">
      <div className="sidebar-brand"><p>ALTIS ELEVATORS</p><h1>QuoteFlow</h1><span>Quotation workspace</span></div>
      <div className="sidebar-progress"><div><strong>{overallProgress.completed}<small> / {overallProgress.required}</small></strong><span>required details complete</span></div><div className="sidebar-progress-track" aria-hidden="true"><span style={{ height: `${overallProgress.percent}%` }} /></div></div>
      <nav className="sidebar-nav" aria-label="Quotation workflow">{workflowProgress.map((step, index) => <button key={step.id} type="button" className={`sidebar-nav-item sidebar-nav-${step.state}`} aria-label={`Step ${index + 1}: ${step.label}. ${stateLabel(step.state)}.`} aria-current={step.id === currentStep ? "step" : undefined} onClick={() => workflow.visitStep(step.id)}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{step.label}</strong><small>{stateLabel(step.state)}</small></div></button>)}</nav>
      <p className="sidebar-mobile-step" aria-live="polite">Step {currentStepIndex + 1} of {WORKFLOW_STEPS.length} · {current.label}</p>
      <div className="sidebar-footer"><p className={`save-status save-status-${saveStatus}`} aria-live="polite">{saveStatus === "saving" ? "Saving draft…" : saveStatus === "saved" ? "Draft saved" : "Unable to save draft"}</p><Button variant="danger" className="sidebar-reset" onClick={resetQuotation}>Reset quotation</Button></div>
    </aside>

    <section className="workspace-main">
      <header className="workspace-header"><div><p className="workspace-kicker">{String(currentStepIndex + 1).padStart(2, "0")} / {String(WORKFLOW_STEPS.length).padStart(2, "0")}</p><h2>{current.label}</h2></div><div className="workspace-reference"><span>Quotation reference</span><strong>{reference || workflow.template.reference.prefix}</strong></div></header>
      <div className={`workspace-content ${currentStep === "review" ? "workspace-content-review" : ""}`}>
        <div className="workspace-editor">{workflowProgress.map((step) => {
          const Step = STEP_COMPONENTS[step.id];
          return <WorkflowSection key={step.id} step={step} active={step.id === currentStep} onBack={step.id === "customer" ? undefined : workflow.previousStep} onContinue={step.id === "review" ? undefined : workflow.continueStep}><Step workflow={workflow} /></WorkflowSection>;
        })}</div>
        <WorkspaceSummary workflow={workflow} />
      </div>
    </section>

    {pendingConfiguration && <ConfirmationDialog title="Replace configuration?" description={`Switching changes selected-lift values. ${pendingConfiguration.impact.overrideCount ? `Choose whether to keep ${pendingConfiguration.impact.overrideCount} customization(s).` : "Continue only if intended."}`} onDismiss={() => workflow.setPendingConfiguration(null)}><Button variant="tertiary" autoFocus data-autofocus onClick={() => workflow.setPendingConfiguration(null)}>Cancel</Button>{pendingConfiguration.impact.overrideCount > 0 && <Button variant="secondary" onClick={() => workflow.confirmConfiguration(true)}>Keep customizations</Button>}<Button onClick={() => workflow.confirmConfiguration(false)}>Use selected-lift values</Button></ConfirmationDialog>}
    {showResetConfirmation && <ConfirmationDialog title="Reset quotation?" description="All locally saved entry data for this quotation will be removed. This cannot be undone." onDismiss={() => setShowResetConfirmation(false)}><Button variant="secondary" autoFocus data-autofocus onClick={() => setShowResetConfirmation(false)}>Cancel</Button><Button variant="danger" onClick={confirmReset}>Reset quotation</Button></ConfirmationDialog>}
  </main>;
}
