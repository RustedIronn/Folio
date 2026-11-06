export const WORKFLOW_STEPS = [
  { id: "customer", label: "Customer", paths: ["reference.", "metadata.", "customer."] },
  { id: "installation", label: "Lift & installation", paths: ["lift."] },
  { id: "materials", label: "Materials", paths: ["materials."] },
  { id: "commercial", label: "Commercial terms", paths: ["commercial."] },
  { id: "review", label: "Review & PDF", paths: [] },
];

const REQUIRED_COUNTS = { customer: 7, installation: 8, materials: 11, commercial: 9, review: 0 };

export function workflowSectionForPath(path) {
  if (path === "document.type") return "customer";
  return WORKFLOW_STEPS.find((step) => step.paths.some((prefix) => path.startsWith(prefix)))?.id ?? "review";
}

export function getWorkflowProgress(documentData, visited = new Set(), attempted = new Set(), currentStep = "customer") {
  const missingBySection = new Map(WORKFLOW_STEPS.map((step) => [step.id, []]));
  documentData.missing.forEach((entry) => missingBySection.get(workflowSectionForPath(entry.path)).push(entry));
  return WORKFLOW_STEPS.map((step) => {
    const missing = missingBySection.get(step.id);
    const required = step.id === "materials" ? documentData.pages.materials.rows.reduce((count,row) => count + (row.optional ? 0 : row.source === "custom" ? 2 : 1), 0) : REQUIRED_COUNTS[step.id] + (step.id === "commercial" && documentData.pages.priceSchedule.additionalEntryPresent ? 2 : 0) + (step.id === "commercial" && documentData.pages.priceSchedule.bankDetailsCustom ? 4 : 0);
    const completed = Math.max(0, required - missing.length);
    let state = "not-started";
    if (step.id === currentStep) state = "current";
    else if (step.id === "review") state = documentData.missing.length === 0 ? "ready" : "available";
    else if (missing.length === 0) state = "complete";
    else if (attempted.has(step.id)) state = "incomplete";
    else if (visited.has(step.id)) state = "in-progress";
    return { ...step, required, completed, missing, state };
  });
}

export function overallCompletion(progress) {
  const applicable = progress.filter((step) => step.required > 0);
  const required = applicable.reduce((sum, step) => sum + step.required, 0);
  const completed = applicable.reduce((sum, step) => sum + step.completed, 0);
  return { completed, required, percent: required ? Math.round((completed / required) * 100) : 100 };
}
