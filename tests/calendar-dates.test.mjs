import test from "node:test";
import assert from "node:assert/strict";
import { calendarDays, calendarKeyDate, dateValue, parseDateValue, shiftCalendarMonth } from "../src/app/components/calendarDates.js";

test("calendar preserves ISO date values and rejects invalid dates without timezone conversion", () => {
  for (const value of ["2024-02-29", "2026-11-04", "0099-01-01"]) assert.equal(dateValue(parseDateValue(value)), value);
  for (const value of ["", "2025-02-29", "2026-04-31", "2026-13-01", "04/11/2026", "0000-01-01"]) assert.equal(parseDateValue(value), null);
});

test("calendar month navigation clamps month-end dates and crosses years safely", () => {
  assert.equal(dateValue(shiftCalendarMonth(parseDateValue("2024-01-31"), 1)), "2024-02-29");
  assert.equal(dateValue(shiftCalendarMonth(parseDateValue("2025-01-31"), 1)), "2025-02-28");
  assert.equal(dateValue(shiftCalendarMonth(parseDateValue("2026-12-31"), 1)), "2027-01-31");
  assert.equal(dateValue(shiftCalendarMonth(parseDateValue("0001-01-01"), -1)), "0001-01-01");
});

test("calendar grid contains six complete Monday-first weeks including adjacent dates", () => {
  const days = calendarDays(parseDateValue("2026-11-04"));
  assert.equal(days.length, 42);
  assert.equal(days[0].getDay(), 1);
  assert.equal(dateValue(days[0]), "2026-10-26");
  assert.equal(dateValue(days.at(-1)), "2026-12-06");
});

test("calendar keyboard navigation supports weeks, month boundaries and year navigation", () => {
  const date = parseDateValue("2026-11-04");
  for (const [key, expected] of [["ArrowLeft", "2026-11-03"], ["ArrowRight", "2026-11-05"], ["ArrowUp", "2026-10-28"], ["ArrowDown", "2026-11-11"], ["Home", "2026-11-02"], ["End", "2026-11-08"], ["PageUp", "2026-10-04"], ["PageDown", "2026-12-04"]]) assert.equal(dateValue(calendarKeyDate(date, key)), expected);
  assert.equal(dateValue(calendarKeyDate(date, "PageUp", true)), "2025-11-04");
  assert.equal(calendarKeyDate(date, "Tab"), null);
});
