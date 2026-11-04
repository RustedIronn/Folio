// Local calendar dates: never convert employee-entered dates through UTC.
export function calendarDate(year, month, day) {
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month, day);
  return date;
}

export function dateValue(date) {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDateValue(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || year > 9999) return null;
  const date = calendarDate(year, month - 1, day);
  return dateValue(date) === value ? date : null;
}

export function shiftCalendarMonth(date, amount) {
  const month = calendarDate(date.getFullYear(), date.getMonth() + amount, 1);
  if (month.getFullYear() < 1 || month.getFullYear() > 9999) return date;
  const lastDay = calendarDate(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return calendarDate(month.getFullYear(), month.getMonth(), Math.min(date.getDate(), lastDay));
}

export function calendarDays(month) {
  const first = calendarDate(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => calendarDate(first.getFullYear(), first.getMonth(), 1 - offset + index));
}

export function calendarKeyDate(date, key, shiftKey = false) {
  if (key === "PageUp" || key === "PageDown") return shiftCalendarMonth(date, (key === "PageUp" ? -1 : 1) * (shiftKey ? 12 : 1));
  const weekday = (date.getDay() + 6) % 7;
  const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday };
  if (!(key in offsets)) return null;
  const next = calendarDate(date.getFullYear(), date.getMonth(), date.getDate() + offsets[key]);
  return next.getFullYear() < 1 || next.getFullYear() > 9999 ? date : next;
}
