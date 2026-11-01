import FormField from "../../components/FormField.jsx";

export default function Field({ id, label, value, onChange, type = "text", children, hint, error, wide, required = false, className = "" }) {
  return <FormField id={id} label={label} hint={hint} error={error} required={required} className={`${wide ? "span-two" : ""} ${className}`.trim()}>{children ?? <input id={id} type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} autoComplete="off" aria-required={required} />}</FormField>;
}
