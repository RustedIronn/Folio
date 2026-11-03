import { useState } from "react";
import Select from "./Select.jsx";

// Choices are shortcuts into the existing string field. Custom values are never discarded.
export default function SpecificationChoice({ id, label, value, options, onChange, "aria-describedby": describedBy, "aria-invalid": invalid, "aria-required": required }) {
  const [editingCustom, setEditingCustom] = useState(false);
  const matchesChoice = options.some((option) => option.value === value);
  const custom = editingCustom || !matchesChoice;
  return <div className="specification-choice">
    <Select id={id} aria-label={label} aria-describedby={describedBy} aria-invalid={invalid} aria-required={required} value={custom ? "__custom__" : value} options={[...options, { value: "__custom__", label: "Custom wording" }]} onChange={(next) => {
      setEditingCustom(next === "__custom__");
      if (next !== "__custom__") onChange(next);
    }} />
    {custom && <input id={`${id}-custom`} aria-label={`${label} — custom wording`} aria-describedby={describedBy} aria-invalid={invalid} aria-required={required} value={value ?? ""} placeholder="Enter wording" onChange={(event) => onChange(event.target.value)} />}
  </div>;
}
