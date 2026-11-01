const variants = new Set(["primary", "secondary", "tertiary", "danger", "compact"]);

export default function Button({ variant = "primary", loading = false, className = "", children, disabled, type = "button", ...props }) {
  const selectedVariant = variants.has(variant) ? variant : "primary";
  const isDisabled = Boolean(disabled || loading);
  return <button type={type} className={`button button-${selectedVariant} ${className}`.trim()} disabled={isDisabled} aria-busy={loading || undefined} {...props}>{loading && <span className="button-spinner" aria-hidden="true" />}{children}</button>;
}
