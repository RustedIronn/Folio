import CustomerStep from "./steps/CustomerStep.jsx";
import LiftStep from "./steps/LiftStep.jsx";
import MaterialsStep from "./steps/MaterialsStep.jsx";
import CommercialStep from "./steps/CommercialStep.jsx";
import ReviewStep from "./steps/ReviewStep.jsx";
import WorkflowSection from "./components/WorkflowSection.jsx";
import { useQuotationWorkflow } from "./hooks/useQuotationWorkflow.js";
import { WORKFLOW_STEPS } from "../models/quotation/workflow.js";
import "./App.css";

const STEP_COMPONENTS = {
  customer: CustomerStep,
  installation: LiftStep,
  materials: MaterialsStep,
  commercial: CommercialStep,
  review: ReviewStep,
};

export default function App() {
  const workflow = useQuotationWorkflow();
  const { currentStep, currentStepIndex, workflowProgress, overallProgress, reference, saveStatus, pendingConfiguration } = workflow;

  function resetQuotation() {
    if (window.confirm("Reset this quotation? All locally saved entry data will be removed.")) workflow.resetDraft();
  }

  return <main className="app-shell">
    <header className="app-header">
      <div><p className="eyebrow">ALTIS ELEVATORS</p><h1>QuoteFlow</h1><p>Prepare a quotation from the approved lift catalogue.</p></div>
      <div className="header-actions"><span className={`save-status save-status-${saveStatus}`} aria-live="polite">{saveStatus === "saving" ? "Saving draft…" : saveStatus === "saved" ? "Draft saved" : "Unable to save draft"}</span><button className="text-button destructive" type="button" onClick={resetQuotation}>Reset quotation</button></div>
    </header>

    <div className="workflow-progress" aria-label={`Quotation completion: ${overallProgress.completed} of ${overallProgress.required} required fields completed`}><div><strong>{overallProgress.completed} of {overallProgress.required}</strong><span>required fields completed</span></div><div className="progress-track" aria-hidden="true"><span style={{ width: `${overallProgress.percent}%` }} /></div><span className="mobile-step">Step {currentStepIndex + 1} of {WORKFLOW_STEPS.length}</span></div>
    <nav className="workflow-nav" aria-label="Quotation workflow">{workflowProgress.map((step, index) => <button key={step.id} type="button" className={`workflow-nav-item workflow-nav-${step.state}`} aria-current={step.id === currentStep ? "step" : undefined} onClick={() => workflow.visitStep(step.id)}><span>{index + 1}</span><span>{step.label}</span><small>{step.state === "complete" ? "Complete" : step.state === "incomplete" ? "Needs attention" : step.state === "in-progress" ? "In progress" : step.state === "current" ? "Current" : "Not started"}</small></button>)}</nav>
    <div className="workflow-note"><strong>Quotation reference</strong><span>{reference || workflow.template.reference.prefix}</span></div>

    {workflowProgress.map((step) => {
      const Step = STEP_COMPONENTS[step.id];
      return <WorkflowSection key={step.id} step={step} active={step.id === currentStep} onBack={step.id === "customer" ? undefined : workflow.previousStep} onContinue={step.id === "review" ? undefined : workflow.continueStep}><Step workflow={workflow} /></WorkflowSection>;
    })}

    {pendingConfiguration && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="configuration-dialog-title"><h2 id="configuration-dialog-title">Replace configuration?</h2><p>Switching changes selected-lift values. {pendingConfiguration.impact.overrideCount ? `Choose whether to keep ${pendingConfiguration.impact.overrideCount} customization(s).` : "Continue only if intended."}</p><div className="modal-actions"><button className="button button-quiet" type="button" onClick={() => workflow.setPendingConfiguration(null)}>Cancel</button>{pendingConfiguration.impact.overrideCount > 0 && <button className="button button-quiet" type="button" onClick={() => workflow.confirmConfiguration(true)}>Keep customizations</button>}<button className="button" type="button" onClick={() => workflow.confirmConfiguration(false)}>Use selected-lift values</button></div></div></div>}
  </main>;
}
