import { Popover } from "@base-ui/react/popover";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { calendarDays, calendarKeyDate, dateValue, parseDateValue, shiftCalendarMonth } from "./calendarDates.js";
import "../styles/calendar.css";

const monthFormat = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });
const dayFormat = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function DatePicker({ id, label = "Date", value = "", onChange, disabled = false, "aria-describedby": describedBy, "aria-invalid": invalid, "aria-required": required }) {
  const [open, setOpen] = useState(false);
  const [activeDate, setActiveDate] = useState(() => parseDateValue(value) || new Date());
  const [month, setMonth] = useState(activeDate);
  const dayButtons = useRef(new Map());
  const helpId = useId();
  const focusPending = useRef(false);
  const activeValue = dateValue(activeDate);
  const today = dateValue(new Date());
  const days = calendarDays(month);
  const parsedValue = parseDateValue(value);
  const displayedValue = parsedValue ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(parsedValue) : value || "Select date";

  useLayoutEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    dayButtons.current.get(activeValue)?.focus();
  }, [activeValue]);

  function changeOpen(nextOpen) {
    if (nextOpen) {
      const selected = parseDateValue(value) || new Date();
      setActiveDate(selected);
      setMonth(selected);
    }
    setOpen(nextOpen);
  }
  function selectDate(nextValue) {
    onChange(nextValue);
    setOpen(false);
  }
  function navigateDay(event, date) {
    const next = calendarKeyDate(date, event.key, event.shiftKey);
    if (!next) return;
    event.preventDefault();
    focusPending.current = true;
    setActiveDate(next);
    setMonth(next);

  }
  function changeMonth(amount) {
    const next = shiftCalendarMonth(activeDate, amount);
    setActiveDate(next);
    setMonth(next);
  }

  return <Popover.Root open={open} onOpenChange={changeOpen}>
    <Popover.Trigger id={id} className="date-picker-shell" disabled={disabled} data-invalid={invalid || undefined} aria-label={`Choose ${label.toLowerCase()}${required ? " (required)" : ""}, ${displayedValue}`} aria-describedby={describedBy} aria-invalid={invalid} onKeyDown={(event) => {
      if (event.key === "ArrowDown" || event.key === "F4") { event.preventDefault(); changeOpen(true); }
    }}>
      <span className="date-picker-value" data-placeholder={!value || undefined}>{displayedValue}</span>
      <span className="date-picker-toggle" aria-hidden="true"><CalendarDays size={18} /></span>
    </Popover.Trigger>
    <Popover.Portal><Popover.Positioner className="calendar-positioner" sideOffset={8} collisionPadding={16} align="end">
      <Popover.Popup className="calendar-panel" initialFocus={() => dayButtons.current.get(activeValue)}>
        <div className="calendar-heading"><Popover.Title className="calendar-title" aria-live="polite">{monthFormat.format(month)}</Popover.Title><div className="calendar-month-actions"><button type="button" className="calendar-icon-button" aria-label="Previous month" onClick={() => changeMonth(-1)} disabled={month.getFullYear() === 1 && month.getMonth() === 0}><ChevronLeft size={18} aria-hidden="true" /></button><button type="button" className="calendar-icon-button" aria-label="Next month" onClick={() => changeMonth(1)} disabled={month.getFullYear() === 9999 && month.getMonth() === 11}><ChevronRight size={18} aria-hidden="true" /></button></div></div>
        <Popover.Description className="calendar-help" id={helpId}>Use arrow keys to move between days, Page Up or Page Down to change month, and Enter to select.</Popover.Description>
        <table className="calendar-grid" role="grid" aria-label={`${label}: ${monthFormat.format(month)}`} aria-describedby={helpId}><thead><tr>{weekdays.map((day) => <th key={day} scope="col"><abbr title={({ Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" })[day]}>{day.slice(0, 2)}</abbr></th>)}</tr></thead><tbody>{Array.from({ length: 6 }, (_, week) => <tr key={week}>{days.slice(week * 7, week * 7 + 7).map((date) => {
          const iso = dateValue(date);
          const selected = iso === value;
          const outside = date.getMonth() !== month.getMonth();
          const outOfRange = date.getFullYear() < 1 || date.getFullYear() > 9999;
          return <td key={iso} aria-selected={selected}><button type="button" className="calendar-day" ref={(element) => { if (element) dayButtons.current.set(iso, element); else dayButtons.current.delete(iso); }} tabIndex={iso === activeValue ? 0 : -1} aria-label={dayFormat.format(date)} aria-current={iso === today ? "date" : undefined} data-selected={selected || undefined} data-outside={outside || undefined} disabled={outOfRange} onClick={() => selectDate(iso)} onKeyDown={(event) => navigateDay(event, date)}>{date.getDate()}</button></td>;
        })}</tr>)}</tbody></table>
        <div className="calendar-footer"><button type="button" className="calendar-text-button" onClick={() => selectDate(today)}>Today</button><button type="button" className="calendar-text-button" onClick={() => selectDate("")} disabled={!value}>Clear date</button></div>
      </Popover.Popup>
    </Popover.Positioner></Popover.Portal>
  </Popover.Root>;
}
