import { useEffect, useMemo, useState } from "react";
import approvedCatalogue from "../../data/catalogue/liftCatalogue.json";
import { quotationCatalogue } from "../../models/catalogue/sharedModels.js";
import useSharedModels from "./useSharedModels.js";
import useSharedEntryOptions from "./useSharedEntryOptions.js";
import useEmployeeSession from "./useEmployeeSession.js";
import useQuotationDrafts from "./useQuotationDrafts.js";
import { quotationDocumentAccess } from "../../services/employeeAccess.js";
import { ALTIS_QUOTATION_TEMPLATE as template } from "../../templates/altisQuotationTemplate.js";
import { applyConfiguration, composeReference, getConfigurationSwitchImpact, isQuotationExportReady, resolveQuotationDocument, suggestFinancialYear } from "../../models/quotation/quotation.js";
import { getWorkflowProgress, overallCompletion, workflowSectionForPath, WORKFLOW_STEPS } from "../../models/quotation/workflow.js";
import { focusWorkflowField, keepWorkflowFocusVisible, readinessMessage } from "../workflowPresentation.js";

export const FIELD_TARGETS = {
  "document.type": "document-type", "reference.quotationNumber": "reference-number", "reference.officeCode": "reference-office", "reference.financialYear": "reference-financial-year", "metadata.date": "quotation-date",
  "customer.address": "customer-address", "customer.attentionName": "recipient-name", "customer.projectLocation": "project-location",
  "lift.catalogueId": "configuration", "lift.quantityType": "configuration", "lift.quantity": "quantity", "lift.project.capacity": "passenger-count", "lift.project.travelHeight": "project-travel", "lift.project.floors": "upper-floors", "lift.project.landings": "upper-floors", "lift.project.cabinCutting": "project-cabin-cutting",
  "commercial.additionalEntry.label": "commercial-extra-label", "commercial.additionalEntry.value": "commercial-extra-value", "commercial.priceAmount": "price", "commercial.taxDescription": "tax", "commercial.packingForwarding": "packing", "commercial.delivery": "delivery", "commercial.transportOctroi": "transport", "commercial.guarantee": "guarantee",
  "commercial.payment": "payment-advance", "commercial.payment.advance": "payment-advance", "commercial.payment.dispatch": "payment-dispatch", "commercial.payment.completion": "payment-completion",
};

export function useQuotationWorkflow() {
  const employee = useEmployeeSession();
  const drafts = useQuotationDrafts(employee);
  const { quotation, setQuotation } = drafts;
  const sharedModels = useSharedModels(employee);
  const sharedEntryOptions = useSharedEntryOptions(employee);
  const catalogue = useMemo(() => quotationCatalogue(approvedCatalogue, sharedModels.records, quotation), [sharedModels.records, quotation]);
  const [pendingConfiguration, setPendingConfiguration] = useState(null);
  const [showReviewErrors, setShowReviewErrors] = useState(false);
  const [currentStep, setCurrentStep] = useState("customer");
  const [visitedSteps, setVisitedSteps] = useState(() => new Set(["customer"]));
  const [attemptedSteps, setAttemptedSteps] = useState(() => new Set());
  const [authIntent, setAuthIntent] = useState(null);
  const [previewRequested, setPreviewRequested] = useState(false);
  const resolved = useMemo(() => resolveQuotationDocument(quotation, catalogue, template), [quotation, catalogue]);
  const exportReady = isQuotationExportReady(resolved);
  const documentAccess = quotationDocumentAccess(employee, exportReady);
  const saveStatus = !drafts.localSaved ? "unable" : drafts.status === "error" || drafts.status === "conflict" ? "local" : drafts.status === "saving" || drafts.status === "pending" ? "saving" : "saved";
  const workflowProgress = useMemo(() => getWorkflowProgress(resolved, visitedSteps, attemptedSteps, currentStep).map((step) => step.id === "review" && step.state === "ready" && !documentAccess.canPreview ? { ...step, state: "available" } : step), [resolved, visitedSteps, attemptedSteps, currentStep, documentAccess.canPreview]);
  const overallProgress = useMemo(() => overallCompletion(workflowProgress), [workflowProgress]);
  const currentStepIndex = WORKFLOW_STEPS.findIndex((step) => step.id === currentStep);
  const errors = (path) => showReviewErrors || attemptedSteps.has(workflowSectionForPath(path)) ? resolved.missing.filter((entry) => entry.path === path).map(readinessMessage).join(" ") : "";
  const readinessGroups = useMemo(() => [
    ["Customer & reference", resolved.missing.filter((entry) => /^(reference|metadata|customer)\./.test(entry.path) || entry.path === "document.type")],
    ["Lift & installation", resolved.missing.filter((entry) => /^lift\./.test(entry.path))],
    ["Materials", resolved.missing.filter((entry) => /^materials\./.test(entry.path))],
    ["Commercial terms", resolved.missing.filter((entry) => /^commercial\./.test(entry.path))],
  ].filter(([, entries]) => entries.length), [resolved.missing]);

  useEffect(() => {
    let frame;
    const reveal = () => { window.cancelAnimationFrame(frame); frame = window.requestAnimationFrame(keepWorkflowFocusVisible); };
    document.addEventListener("focusin", reveal);
    window.visualViewport?.addEventListener("resize", reveal);
    window.addEventListener("resize", reveal);
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener("focusin", reveal); window.visualViewport?.removeEventListener("resize", reveal); window.removeEventListener("resize", reveal); };
  }, []);

  useEffect(() => {
    if (!employee.authorized) {
      const timer = window.setTimeout(() => { setPreviewRequested(false); setPendingConfiguration(null); }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [employee.authorized]);

  const update = (section, field, value) => setQuotation((current) => ({ ...current, [section]: { ...current[section], [field]: value } }));
  const updateProject = (field, value) => setQuotation((current) => ({ ...current, lift: { ...current.lift, project: { ...current.lift.project, [field]: value } } }));
  const updatePayment = (field, value) => setQuotation((current) => ({ ...current, commercial: { ...current.commercial, payment: { ...current.commercial.payment, [field]: value } } }));
  function chooseConfiguration(id) {
    const record = catalogue.records.find((entry) => entry.sourceRecordId === id);
    if (!record) return;
    requestConfiguration(record);
  }
  function requestConfiguration(record) {
    const impact = getConfigurationSwitchImpact(quotation, record);
    if (impact.requiresConfirmation) setPendingConfiguration({ record, impact }); else setQuotation((current) => applyConfiguration(current, record));
  }
  function confirmConfiguration(preserveOverrides) {
    if (!pendingConfiguration) return;
    setQuotation((current) => applyConfiguration(current, pendingConfiguration.record, { preserveOverrides }));
    setPendingConfiguration(null);
  }
  async function addSharedModel(input, id) {
    const record = await sharedModels.add(input, id);
    requestConfiguration(record);
    return record;
  }
  function visitStep(id, validate = false) { setCurrentStep(id); setVisitedSteps((current) => new Set([...current, id])); if (validate) setAttemptedSteps((current) => new Set([...current, id])); }
  function continueStep() { setAttemptedSteps((current) => new Set([...current, currentStep])); if (currentStepIndex < WORKFLOW_STEPS.length - 1) visitStep(WORKFLOW_STEPS[currentStepIndex + 1].id); }
  function previousStep() { if (currentStepIndex > 0) visitStep(WORKFLOW_STEPS[currentStepIndex - 1].id); }
  function resetDraft() { drafts.startNew(); setShowReviewErrors(false); setPreviewRequested(false); setCurrentStep("customer"); setVisitedSteps(new Set(["customer"])); setAttemptedSteps(new Set()); }
  function requestPreview() { if (documentAccess.canPreview) setPreviewRequested(true); else setAuthIntent("pdf"); }
  function completeSignIn() { if (!employee.authorized) return; setAuthIntent(null); if (authIntent === "pdf") setPreviewRequested(true); }
  function jumpToIssue(entry) {
    const material = entry.path.startsWith("materials.") && template.materials.find((item) => item.key === entry.path.slice(10));
    if (material?.source === "technical") { openTechnicalField(material.technicalKey); return; }
    const step = entry.path === "document.type" ? "customer" : workflowSectionForPath(entry.path);
    visitStep(step, true);
    const customMaterial = entry.path.match(/^materials\.customRows\.(\d+)(?:\.(name|value))?$/);
    const customRow = customMaterial && quotation.materials.customRows?.[Number(customMaterial[1])];
    const dynamicTarget = entry.path.startsWith("commercial.warrantyPeriods.") ? "warranty-"+entry.path.split(".").at(-1) : entry.path.startsWith("commercial.bankDetails.") ? "bank-"+entry.path.split(".").at(-1) : entry.path === "lift.technicalOverrides.buzzer" ? "technical-buzzer" : null;
    const target = dynamicTarget || (customRow ? `custom-material-${customRow.id}-${customMaterial[2] || "name"}` : entry.path === "reference.officeCode" && quotation.reference.officeCodeMode === "custom" ? "custom-office-code" : entry.path === "lift.project.floors" && quotation.lift.installation.floorMode === "custom" ? "custom-floors" : entry.path === "lift.project.landings" && quotation.lift.installation.floorMode === "custom" ? "custom-landings" : FIELD_TARGETS[entry.path] || step);
    window.setTimeout(() => focusWorkflowField(target), 0);
  }
  function openTechnicalField(key) {
    visitStep("installation");
    window.setTimeout(() => focusWorkflowField(`technical-${key}`), 0);
  }
  return {
    catalogue, employee, drafts, documentAccess, authIntent, setAuthIntent, completeSignIn, requestPreview, sharedModels, addSharedModel, sharedEntryOptions, template, quotation, setQuotation, resolved, exportReady, workflowProgress, overallProgress, currentStep, currentStepIndex, saveStatus,
    pendingConfiguration, setPendingConfiguration, showReviewErrors, setShowReviewErrors, previewRequested, setPreviewRequested,
    errors, readinessGroups, update, updateProject, updatePayment, chooseConfiguration, confirmConfiguration, visitStep, continueStep, previousStep, resetDraft, jumpToIssue, openTechnicalField,
    reference: composeReference(quotation.reference, template, quotation.document?.type), suggestedYear: suggestFinancialYear(quotation.metadata.date), stepFor: (id) => workflowProgress.find((step) => step.id === id),
    pdfFileName: (resolved.pages.cover.reference || "Altis-Quotation").replace(/[^a-z0-9._-]+/gi, "-") + ".pdf",
  };
}
