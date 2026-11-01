export default function FormField({ id, label, error, hint, required = false, children, className = "" }) {
  return (
    <div className={`form-field ${error ? "has-error" : ""} ${className}`}>
      <label htmlFor={id}>{label}{required && <span className="required-marker" aria-hidden="true">Required</span>}</label>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
