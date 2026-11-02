import { useState } from "react";
import { ArrowUpRight, Boxes, Building2, Check, FileCheck2, FileText, IndianRupee, RotateCcw, UserRound } from "lucide-react";
import CustomerStep from "./steps/CustomerStep.jsx";
import LiftStep from "./steps/LiftStep.jsx";
import MaterialsStep from "./steps/MaterialsStep.jsx";
import CommercialStep from "./steps/CommercialStep.jsx";
import ReviewStep from "./steps/ReviewStep.jsx";
import Button from "./components/Button.jsx";
import WorkflowSection from "./components/WorkflowSection.jsx";
import WorkspaceSummary from "./components/WorkspaceSummary.jsx";
import ConfirmationDialog from "./components/ConfirmationDialog.jsx";
import { useQuotationWorkflow } from "./hooks/useQuotationWorkflow.js";
import "./App.css";

const STEPS = { customer: CustomerStep, installation: LiftStep, materials: MaterialsStep, commercial: CommercialStep, review: ReviewStep };
const ICONS = { customer: UserRound, installation: Building2, materials: Boxes, commercial: IndianRupee, review: FileCheck2 };
const COPY = {
  customer: ["Customer information", "Enter the quotation reference, recipient, and project details."],
  installation: ["Lift & installation", "Select a configuration and enter the installation specifications."],
  materials: ["Materials", "Review the material schedule and adjust specifications where needed."],
  commercial: ["Commercial terms", "Enter the price and confirm delivery, taxes, and payment terms."],
  review: ["Review & PDF", "Check the quotation details, preview the document, and download when ready."]
};
const stateLabel = (state) => ({ complete: "Complete", ready: "Ready", available: "Available", incomplete: "Needs attention", "in-progress": "In progress", current: "Editing", "not-started": "Not started" })[state];

export default function App() {
  const workflow = useQuotationWorkflow();
  const [showReset, setShowReset] = useState(false);
  const { currentStep, currentStepIndex, workflowProgress, overallProgress, reference, saveStatus, pendingConfiguration } = workflow;
  const current = workflowProgress[currentStepIndex];
  return <main className={`product-shell screen-${currentStep}`}>
    <aside className="product-rail">
      <a className="product-brand" href="#customer" onClick={(event) => { event.preventDefault(); workflow.visitStep("customer"); }} aria-label="Altis QuoteFlow home"><img src="/assets/altis-emblem.png" alt="Altis Elevators" /></a>
      <div className="rail-caption">WORKSPACE</div>
      <div className="rail-project"><FileText size={19} /><div><strong>QuoteFlow</strong><span>Quotation builder</span></div><span className="rail-project-dot" /></div>
      <div className="rail-divider" />
      <div className="rail-caption">THIS QUOTATION</div>
      <nav className="rail-navigation" aria-label="Quotation sections">{workflowProgress.map((step) => {
        const Icon = ICONS[step.id];
        return <button type="button" key={step.id} aria-current={step.id === currentStep ? "step" : undefined} onClick={() => workflow.visitStep(step.id)}><Icon size={17} aria-hidden="true" /><span>{step.label}</span>{step.state === "complete" && <Check size={14} aria-label="Complete" />}</button>;
      })}</nav>
      <div className="rail-bottom">
        <div className="rail-completion"><div><span>Quotation progress</span><strong>{overallProgress.percent}%</strong></div><progress max="100" value={overallProgress.percent} aria-label="Quotation completion" /><small>{overallProgress.completed} of {overallProgress.required} required details</small></div>
        <div className={`draft-save save-status-${saveStatus}`} role="status"><span />{saveStatus === "saved" ? "All changes saved" : saveStatus === "saving" ? "Saving changes…" : "Unable to save changes"}</div>
        <Button variant="tertiary" className="rail-reset" onClick={() => setShowReset(true)}><RotateCcw size={14} aria-hidden="true" />Reset quotation</Button>
        <div className="rail-business"><span>AE</span><div><strong>Altis Elevators</strong><small>Quotation workspace</small></div></div>
      </div>
    </aside>
    <div className="product-body">
      <header className="product-topbar"><div><span>Workspace</span><span>/</span><strong>{reference || "New quotation"}</strong><span className="topbar-draft">{workflow.exportReady ? "Ready" : "Draft"}</span></div><Button variant="secondary" onClick={() => workflow.visitStep("review")}>Review quotation<ArrowUpRight size={15} aria-hidden="true" /></Button></header>
      <div className="product-page">
        <header className="page-intro"><div><p className="page-eyebrow">ALTIS ELEVATORS <span>/</span> QUOTATION STUDIO</p><h1>{COPY[currentStep][0]}</h1><p>{COPY[currentStep][1]}</p></div><div className="page-step"><span>{String(currentStepIndex + 1).padStart(2, "0")}</span><small>/ 05</small></div></header>
        <nav className="journey" aria-label="Quotation workflow">{workflowProgress.map((step, index) => <button key={step.id} type="button" className={`journey-step state-${step.state}`} aria-current={step.id === currentStep ? "step" : undefined} aria-label={`Step ${index + 1}: ${step.label}. ${stateLabel(step.state)}`} onClick={() => workflow.visitStep(step.id)}><span className="journey-number">{step.state === "complete" ? <Check size={15} /> : index + 1}</span><span><strong>{step.label}</strong><small>{step.required ? `${step.completed}/${step.required} details` : stateLabel(step.state)}</small></span></button>)}</nav>
        <p className="mobile-current-step">Step {currentStepIndex + 1} of 5 · {current.label}</p>
        <div className={`editing-layout layout-${currentStep}`}>
          <div className="editing-main">{workflowProgress.map((step) => { const Step = STEPS[step.id]; return <WorkflowSection key={step.id} step={step} active={step.id === currentStep} onBack={step.id === "customer" ? undefined : workflow.previousStep} onContinue={step.id === "review" ? undefined : workflow.continueStep}><Step workflow={workflow} /></WorkflowSection>; })}</div>
          {currentStep !== "review" && <WorkspaceSummary workflow={workflow} />}
        </div>
        <footer className="product-footer"><span>ALTIS ELEVATORS</span><p>Quotation workspace</p><span>QuoteFlow</span></footer>
      </div>
    </div>
    {pendingConfiguration && <ConfirmationDialog title="Replace configuration?" description={`Switching changes selected-lift values. ${pendingConfiguration.impact.overrideCount ? `Choose whether to keep ${pendingConfiguration.impact.overrideCount} customization(s).` : "Continue only if intended."}`} onDismiss={() => workflow.setPendingConfiguration(null)}><Button variant="tertiary" autoFocus onClick={() => workflow.setPendingConfiguration(null)}>Cancel</Button>{pendingConfiguration.impact.overrideCount > 0 && <Button variant="secondary" onClick={() => workflow.confirmConfiguration(true)}>Keep customizations</Button>}<Button onClick={() => workflow.confirmConfiguration(false)}>Use selected-lift values</Button></ConfirmationDialog>}
    {showReset && <ConfirmationDialog title="Reset quotation?" description="All locally saved entry data for this quotation will be removed. This cannot be undone." onDismiss={() => setShowReset(false)}><Button variant="secondary" autoFocus onClick={() => setShowReset(false)}>Cancel</Button><Button variant="danger" onClick={() => { workflow.resetDraft(); setShowReset(false); }}>Reset quotation</Button></ConfirmationDialog>}
  </main>;
}
