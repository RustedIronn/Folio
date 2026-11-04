import { useState } from "react";
import { Check } from "lucide-react";
import CustomerStep from "./steps/CustomerStep.jsx";
import LiftStep from "./steps/LiftStep.jsx";
import MaterialsStep from "./steps/MaterialsStep.jsx";
import CommercialStep from "./steps/CommercialStep.jsx";
import ReviewStep from "./steps/ReviewStep.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Button from "./components/Button.jsx";
import WorkflowSection from "./components/WorkflowSection.jsx";
import WorkspaceSummary from "./components/WorkspaceSummary.jsx";
import ConfirmationDialog from "./components/ConfirmationDialog.jsx";
import AccountDialog from "./components/AccountDialog.jsx";
import AccountControls from "./components/AccountControls.jsx";
import CloudDraftsBar from "./components/CloudDraftsBar.jsx";
import { draftSaveLabel } from "../models/quotation/workspace.js";
import { useQuotationWorkflow } from "./hooks/useQuotationWorkflow.js";
import "./App.css";

const STEPS = { customer: CustomerStep, installation: LiftStep, materials: MaterialsStep, commercial: CommercialStep, review: ReviewStep };
const TITLES = { customer: ["Customer", "& project"], installation: ["Lift &", "installation"], materials: ["Material", "schedule"], commercial: ["Commercial", "terms"], review: ["Review", "& PDF"] };
const stateLabel = (state) => ({ complete: "Complete", ready: "Ready", available: "Available", incomplete: "Needs attention", "in-progress": "In progress", current: "Editing", "not-started": "Not started" })[state];

export default function App() {
  const workflow = useQuotationWorkflow();
  const [showReset, setShowReset] = useState(false);
  const { currentStep, currentStepIndex, workflowProgress, reference, saveStatus, pendingConfiguration } = workflow;
  const documentLabel = workflow.resolved.document?.label ?? "Quotation";
  const current = workflowProgress[currentStepIndex];
  return <div className={`product-shell screen-${currentStep}`}><a className="skip-link" href="#workspace">Skip to quotation workspace</a>
    <Sidebar workflow={workflow} onReset={() => setShowReset(true)} />
    <main className="product-body" id="workspace">
      <header className="product-topbar"><div className="topbar-context"><span className="workspace-breadcrumb">Workspace / {current.label}</span><span className="topbar-draft">{workflow.documentAccess.canDownload ? "Ready" : workflow.exportReady ? "Details complete" : "Draft"}</span></div><div className="topbar-reference"><strong>{reference || "New quotation"}</strong></div><div className="topbar-actions"><div className={`draft-save save-status-${saveStatus}`} role="status"><span aria-hidden="true" />{draftSaveLabel(workflow.drafts)}</div><AccountControls workflow={workflow} /></div></header>
      <div className="product-page">
        <header className="page-intro"><div><span className="page-eyebrow">{String(currentStepIndex + 1).padStart(2, "0")} / {documentLabel.toUpperCase()} WORKSPACE</span><h1>{TITLES[currentStep][0]} <em>{TITLES[currentStep][1]}.</em></h1></div>{currentStep !== "review" && <p className="field-legend"><span aria-hidden="true">*</span> Required fields</p>}</header>
        <CloudDraftsBar workflow={workflow} />
        <nav className="journey" aria-label="Quotation workflow">{workflowProgress.map((step, index) => <button key={step.id} type="button" className={`journey-step state-${step.state}`} aria-current={step.id === currentStep ? "step" : undefined} aria-label={`Step ${index + 1}: ${step.label}. ${stateLabel(step.state)}`} onClick={() => workflow.visitStep(step.id)}><span className="journey-number">{step.state === "complete" ? <Check size={15} /> : index + 1}</span><span><strong>{step.label}</strong><small>{step.required ? `${step.completed}/${step.required} ready` : stateLabel(step.state)}</small></span></button>)}</nav>
        <p className="mobile-current-step">Step {currentStepIndex + 1} of 5 · {current.label}</p>
        <div className={`editing-layout layout-${currentStep}`}>
          <div className="editing-main">{workflowProgress.map((step) => { const Step = STEPS[step.id]; return <WorkflowSection key={step.id} step={step} active={step.id === currentStep} onBack={step.id === "customer" ? undefined : workflow.previousStep} onContinue={step.id === "review" ? undefined : workflow.continueStep}><Step workflow={workflow} /></WorkflowSection>; })}</div>
          {currentStep !== "review" && <WorkspaceSummary workflow={workflow} />}
        </div>
        <footer className="product-footer"><span>ALTIS ELEVATORS</span><p>{documentLabel} workspace</p><span>Folio</span></footer>
      </div>
    </main>
    {pendingConfiguration && <ConfirmationDialog title="Replace configuration?" description={`Switching changes selected-lift values. ${pendingConfiguration.impact.overrideCount ? `Choose whether to keep ${pendingConfiguration.impact.overrideCount} customization(s).` : "Continue only if intended."}`} onDismiss={() => workflow.setPendingConfiguration(null)}><Button variant="tertiary" autoFocus onClick={() => workflow.setPendingConfiguration(null)}>Cancel</Button>{pendingConfiguration.impact.overrideCount > 0 && <Button variant="secondary" onClick={() => workflow.confirmConfiguration(true)}>Keep customizations</Button>}<Button onClick={() => workflow.confirmConfiguration(false)}>Use selected-lift values</Button></ConfirmationDialog>}
    {showReset && <ConfirmationDialog title={`Reset ${documentLabel.toLowerCase()}?`} description={workflow.employee.user ? "Start a new document. Existing cloud drafts and local employee copies will be kept in Saved documents." : "Clear the current guest document and start again. This cannot be undone."} onDismiss={() => setShowReset(false)}><Button variant="secondary" autoFocus onClick={() => setShowReset(false)}>Cancel</Button><Button variant="danger" onClick={() => { workflow.resetDraft(); setShowReset(false); }}>Reset {documentLabel.toLowerCase()}</Button></ConfirmationDialog>}
    {workflow.authIntent && <AccountDialog session={workflow.employee} onDismiss={() => workflow.setAuthIntent(null)} onDone={workflow.completeSignIn} />}
  </div>;
}
