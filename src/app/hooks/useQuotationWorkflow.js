import { useEffect, useMemo, useState } from "react";
import catalogue from "../../data/catalogue/liftCatalogue.json";
import { ALTIS_QUOTATION_TEMPLATE as template } from "../../templates/altisQuotationTemplate.js";
import { DRAFT_STORAGE_KEY, applyConfiguration, composeReference, createQuotation, getConfigurationSwitchImpact, isQuotationExportReady, loadDraft, resolveQuotationDocument, saveDraft, suggestFinancialYear } from "../../models/quotation/quotation.js";
import { getWorkflowProgress, overallCompletion, workflowSectionForPath, WORKFLOW_STEPS } from "../../models/quotation/workflow.js";

export const FIELD_TARGETS = {
  "reference.quotationNumber": "reference-number", "reference.officeCode": "reference-office", "reference.financialYear": "reference-financial-year", "metadata.date": "quotation-date",
  "customer.address": "customer-address", "customer.attentionName": "recipient-name", "customer.projectLocation": "project-location",
  "lift.catalogueId": "configuration", "lift.quantityType": "configuration", "lift.quantity": "quantity", "lift.project.capacity": "passenger-count", "lift.project.travelHeight": "project-travel", "lift.project.floors": "upper-floors", "lift.project.landings": "upper-floors", "lift.project.cabinCutting": "project-cabin-cutting",
  "commercial.priceAmount": "price", "commercial.taxDescription": "tax", "commercial.packingForwarding": "packing", "commercial.delivery": "delivery", "commercial.transportOctroi": "transport", "commercial.guarantee": "guarantee",
};

export function useQuotationWorkflow() {
  const [quotation, setQuotation] = useState(() => typeof window === "undefined" ? createQuotation(template) : loadDraft(window.localStorage, template) ?? createQuotation(template));
  const [pendingConfiguration, setPendingConfiguration] = useState(null);
  const [showReviewErrors, setShowReviewErrors] = useState(false);
  const [currentStep, setCurrentStep] = useState("customer");
  const [visitedSteps, setVisitedSteps] = useState(() => new Set(["customer"]));
  const [attemptedSteps, setAttemptedSteps] = useState(() => new Set());
  const [saveStatus, setSaveStatus] = useState("saving");
  const [previewRequested, setPreviewRequested] = useState(false);
  const resolved = useMemo(() => resolveQuotationDocument(quotation, catalogue, template), [quotation]);
  const exportReady = isQuotationExportReady(resolved);
  const workflowProgress = useMemo(() => getWorkflowProgress(resolved, visitedSteps, attemptedSteps, currentStep), [resolved, visitedSteps, attemptedSteps, currentStep]);
  const overallProgress = useMemo(() => overallCompletion(workflowProgress), [workflowProgress]);
  const currentStepIndex = WORKFLOW_STEPS.findIndex((step) => step.id === currentStep);
  const errors = (path) => showReviewErrors || attemptedSteps.has(workflowSectionForPath(path)) ? resolved.missing.filter((entry) => entry.path === path).map((entry) => entry.label).join(" ") : "";
  const readinessGroups = useMemo(() => [
    ["Customer & reference", resolved.missing.filter((entry) => /^(reference|metadata|customer)\./.test(entry.path))],
    ["Lift & installation", resolved.missing.filter((entry) => /^lift\./.test(entry.path))],
    ["Materials", resolved.missing.filter((entry) => /^materials\./.test(entry.path))],
    ["Commercial terms", resolved.missing.filter((entry) => /^commercial\./.test(entry.path))],
  ].filter(([, entries]) => entries.length), [resolved.missing]);

  useEffect(() => {
    const savingTimer = window.setTimeout(() => setSaveStatus("saving"), 0);
    let completionTimer;
    try { saveDraft(window.localStorage, quotation); completionTimer = window.setTimeout(() => setSaveStatus("saved"), 250); } catch { completionTimer = window.setTimeout(() => setSaveStatus("unable"), 0); }
    return () => { window.clearTimeout(savingTimer); window.clearTimeout(completionTimer); };
  }, [quotation]);

  const update = (section, field, value) => setQuotation((current) => ({ ...current, [section]: { ...current[section], [field]: value } }));
  const updateProject = (field, value) => setQuotation((current) => ({ ...current, lift: { ...current.lift, project: { ...current.lift.project, [field]: value } } }));
  const updatePayment = (field, value) => setQuotation((current) => ({ ...current, commercial: { ...current.commercial, payment: { ...current.commercial.payment, [field]: value } } }));
  function chooseConfiguration(id) {
    const record = catalogue.records.find((entry) => entry.sourceRecordId === id);
    if (!record) return;
    const impact = getConfigurationSwitchImpact(quotation, record);
    if (impact.requiresConfirmation) setPendingConfiguration({ record, impact }); else setQuotation((current) => applyConfiguration(current, record));
  }
  function confirmConfiguration(preserveOverrides) {
    if (!pendingConfiguration) return;
    setQuotation((current) => applyConfiguration(current, pendingConfiguration.record, { preserveOverrides }));
    setPendingConfiguration(null);
  }
  function visitStep(id, validate = false) { setCurrentStep(id); setVisitedSteps((current) => new Set([...current, id])); if (validate) setAttemptedSteps((current) => new Set([...current, id])); }
  function continueStep() { setAttemptedSteps((current) => new Set([...current, currentStep])); if (currentStepIndex < WORKFLOW_STEPS.length - 1) visitStep(WORKFLOW_STEPS[currentStepIndex + 1].id); }
  function previousStep() { if (currentStepIndex > 0) visitStep(WORKFLOW_STEPS[currentStepIndex - 1].id); }
  function resetDraft() { window.localStorage.removeItem(DRAFT_STORAGE_KEY); setQuotation(createQuotation(template)); setShowReviewErrors(false); setPreviewRequested(false); setCurrentStep("customer"); setVisitedSteps(new Set(["customer"])); setAttemptedSteps(new Set()); }
  function jumpToIssue(entry) {
    const step = workflowSectionForPath(entry.path);
    visitStep(step, true);
    window.setTimeout(() => { const target = document.getElementById(FIELD_TARGETS[entry.path] || step); target?.focus?.(); target?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 0);
  }
  return {
    catalogue, template, quotation, setQuotation, resolved, exportReady, workflowProgress, overallProgress, currentStep, currentStepIndex, saveStatus,
    pendingConfiguration, setPendingConfiguration, showReviewErrors, setShowReviewErrors, previewRequested, setPreviewRequested,
    errors, readinessGroups, update, updateProject, updatePayment, chooseConfiguration, confirmConfiguration, visitStep, continueStep, previousStep, resetDraft, jumpToIssue,
    reference: composeReference(quotation.reference, template), suggestedYear: suggestFinancialYear(quotation.metadata.date), stepFor: (id) => workflowProgress.find((step) => step.id === id),
    pdfFileName: (resolved.pages.cover.reference || "Altis-Quotation").replace(/[^a-z0-9._-]+/gi, "-") + ".pdf",
  };
}
