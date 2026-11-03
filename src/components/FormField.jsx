import { cloneElement, isValidElement, useId } from "react";

export default function FormField({ id, label, error, hint, required = false, children, className = "" }) {
  const generatedId = useId();
  const hintId = hint ? `${id || generatedId}-hint` : undefined;
  const errorId = error ? `${id || generatedId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const control = isValidElement(children) ? cloneElement(children, {
    "aria-describedby": [children.props["aria-describedby"], describedBy].filter(Boolean).join(" ") || undefined,
    "aria-invalid": error ? true : children.props["aria-invalid"],
    "aria-required": children.type === "div" ? children.props["aria-required"] : required || children.props["aria-required"],
  }) : children;

  return (
    <div className={`form-field ${error ? "has-error" : ""} ${className}`}>
      <label htmlFor={id}>{label}{required && <span className="required-marker" aria-hidden="true">Required</span>}</label>
      {control}
      {hint && <p id={hintId} className="field-hint">{hint}</p>}
      {error && <p id={errorId} className="field-error" role="alert">{error}</p>}
    </div>
  );
}
