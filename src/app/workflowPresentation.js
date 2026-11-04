const TECHNICAL_LABELS = {
  liftType: "Lift category", speed: "Speed", doorFrame: "Door frame",
  carProtectionDoor: "Car door / protection", landingProtection: "Landing door / protection",
  motor: "Motor", controller: "Control panel", rope: "Rope", autoRescueDeviceNote: "Auto rescue device note",
  powerSupplyMachineRoom: "Machine-room power supply", powerSupplyLiftWell: "Lift-well power supply",
  safety: "Safety features", facePlate: "Face plate",
};
export function technicalFieldLabel(key) {
  return TECHNICAL_LABELS[key] ?? String(key).replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

export const PAYMENT_LABELS = { advance: "Advance", dispatch: "Before dispatch", completion: "On completion" };

export function readinessMessage(entry) {
  if (/\b(must|exceeds|invalid)\b/i.test(entry.label)) return entry.label;
  const prompts = {
    "lift.catalogueId": "Choose a lift configuration.",
    "lift.quantityType": "Choose a configuration with a detailed description.",
    "lift.project.capacity": "Enter passenger count and maximum load.",
    "lift.project.cabinCutting": "Enter the cabin cutting description.",
  };
  return prompts[entry.path] ?? `Enter ${entry.label.toLowerCase()}.`;
}

export function materialStatus(row, customized = false) {
  if (customized) return "Customized";
  if (!row.value) return row.optional ? "Optional" : "Needs information";
  return row.source === "technical" ? "Selected lift" : "Altis standard";
}

// Account for the visible keyboard viewport as well as the sticky action bar.
export function focusScrollOffset(rect, viewport, footer) {
  const top = viewport.top + 16;
  const footerVisible = footer && footer.top < viewport.bottom && footer.bottom > viewport.top;
  const bottom = Math.min(viewport.bottom, footerVisible ? footer.top : viewport.bottom) - 16;
  if (rect.height > bottom - top) return rect.top - top;
  if (rect.bottom > bottom) return rect.bottom - bottom;
  return rect.top < top ? rect.top - top : 0;
}

export function keepWorkflowFocusVisible() {
  const target = document.activeElement;
  const section = target?.closest?.(".workflow-section-active");
  if (!section || !target.matches("input, textarea, button, select, [tabindex]")) return;
  const footer = section.querySelector(".step-actions");
  if (footer?.contains(target)) return;
  const visual = window.visualViewport;
  const top = visual?.offsetTop ?? 0;
  const bottom = Math.min(window.innerHeight, top + (visual?.height ?? window.innerHeight));
  const offset = focusScrollOffset(target.getBoundingClientRect(), { top, bottom }, footer?.getBoundingClientRect());
  if (offset) window.scrollBy({ top: offset, behavior: "instant" });
}

export function focusWorkflowField(id) {
  const target = document.getElementById(id);
  if (!target) return;
  for (let parent = target.parentElement; parent; parent = parent.parentElement) {
    if (parent.tagName === "DETAILS") parent.open = true;
  }
  target.focus({ preventScroll: true });
  target.scrollIntoView({ behavior: "instant", block: "center" });
  keepWorkflowFocusVisible();
}
