import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { Select as BaseSelect } from "@base-ui/react/select";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

/** Local wrapper for short, predefined choices. */
export default function Select({ id, value, options, onChange, placeholder = "Choose an option", disabled = false, className = "", positionerClassName = "", "aria-label": ariaLabel, "aria-describedby": ariaDescribedBy, "aria-invalid": ariaInvalid, "aria-required": ariaRequired }) {
  const items = options.map((option) => ({ value: option.value, label: option.label }));

  return <BaseSelect.Root modal={false} value={value || null} onValueChange={(nextValue) => onChange(nextValue ?? "")} items={items} disabled={disabled}>
    <BaseSelect.Trigger id={id} className={`select-trigger ${className}`.trim()} aria-label={ariaLabel} aria-describedby={ariaDescribedBy} aria-invalid={ariaInvalid} aria-required={ariaRequired}>
      <BaseSelect.Value className="select-value" placeholder={placeholder} />
      <BaseSelect.Icon className="select-chevron" aria-hidden="true"><ChevronDown size={17} strokeWidth={2} /></BaseSelect.Icon>
    </BaseSelect.Trigger>
    <BaseSelect.Portal>
      <BaseSelect.Positioner className={`select-positioner ${positionerClassName}`.trim()} sideOffset={8} collisionPadding={16} align="start" alignItemWithTrigger={false}>
        <BaseSelect.Popup className="select-panel">
          <BaseSelect.List className="select-options">
            {options.map((option) => <BaseSelect.Item key={option.value} value={option.value} label={option.label} disabled={option.disabled} className="select-option">
              <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
              <BaseSelect.ItemIndicator className="select-check" aria-hidden="true">✓</BaseSelect.ItemIndicator>
            </BaseSelect.Item>)}
          </BaseSelect.List>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  </BaseSelect.Root>;
}

/**
 * A controlled picker for approved catalogue records. Ranking remains outside
 * this component so `searchCatalogue()` stays the single matching authority.
 */
export function Combobox({ id, value, options, onChange, query, onQueryChange, placeholder = "Search or choose", emptyMessage = "No matching options.", panelLabel = "Lift configurations", renderOption, selectedLabel, "aria-label": ariaLabel, "aria-describedby": ariaDescribedBy, "aria-invalid": ariaInvalid, "aria-required": ariaRequired }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const displayValue = open ? query : selectedLabel ?? selected?.label ?? query;

  function handleOpenChange(nextOpen) {
    setOpen(nextOpen);
    if (nextOpen && selectedLabel && query === selectedLabel) onQueryChange("");
  }

  function handleInputChange(nextQuery, eventDetails) {
    // Base UI also calls this when restoring the label after dismissal.
    // Only typing should update the search; popup state belongs to onOpenChange.
    if (eventDetails.reason === "input-change") onQueryChange(nextQuery);
  }

  return <BaseCombobox.Root
    value={value || null}
    onValueChange={(nextValue) => {
      if (nextValue == null) return;
      onChange(String(nextValue));
      onQueryChange("");
      setOpen(false);
    }}
    inputValue={displayValue}
    onInputValueChange={handleInputChange}
    open={open}
    onOpenChange={handleOpenChange}
    autoHighlight
    highlightItemOnHover
  >
    <div className="catalogue-combobox">
      <BaseCombobox.InputGroup className="combobox-input-shell">
        <BaseCombobox.Input id={id} className="combobox-input" placeholder={placeholder} aria-label={ariaLabel} aria-describedby={ariaDescribedBy} aria-invalid={ariaInvalid} aria-required={ariaRequired} />
        <BaseCombobox.Trigger className="combobox-toggle" aria-label="Show lift configurations">
          <ChevronDown className="select-chevron" aria-hidden="true" size={17} strokeWidth={2} />
        </BaseCombobox.Trigger>
      </BaseCombobox.InputGroup>
      <BaseCombobox.Portal>
        <BaseCombobox.Positioner className="combobox-positioner" sideOffset={8} collisionPadding={16} align="start">
          <BaseCombobox.Popup className="select-panel combobox-panel" initialFocus={false}>
            <p className="combobox-panel-label">{panelLabel}</p>
            <BaseCombobox.List className="select-options combobox-options">
              {options.map((option, index) => <BaseCombobox.Item key={option.value} index={index} value={option.value} className="select-option combobox-option">
                {renderOption ? renderOption(option) : option.label}
                <BaseCombobox.ItemIndicator className="combobox-check" aria-hidden="true">✓</BaseCombobox.ItemIndicator>
              </BaseCombobox.Item>)}
            </BaseCombobox.List>
            {!options.length && <p className="combobox-empty" role="status">{emptyMessage}</p>}
          </BaseCombobox.Popup>
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    </div>
  </BaseCombobox.Root>;
}
