// Explicit employee choice controls whether an extra charge changes the document amount.
export const ENTRY_TREATMENTS = ["informational","included","excluded"];
export function extraCharge(value) {
  const text=String(value ?? "").trim();
  if(!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const paise=Math.round(Number(text)*100);
  return Number.isSafeInteger(paise) && paise >= 0 ? paise : null;
}
export function priceWithExtra(base,entry) {
  if(entry?.treatment !== "included" || !String(entry.label ?? "").trim() || !String(base ?? "").trim()) return base;
  const charge=extraCharge(entry.value), basePaise=Math.round(Number(base)*100);
  if(charge === null || !Number.isSafeInteger(basePaise) || !Number.isSafeInteger(basePaise+charge)) return base;
  return String((basePaise+charge)/100);
}
