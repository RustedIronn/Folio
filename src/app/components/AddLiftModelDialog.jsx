import { Dialog } from "@base-ui/react/dialog";
import { Layers3, Plus, X } from "lucide-react";
import { useState } from "react";
import { emptySharedModel, SHARED_MODEL_FIELDS, validateSharedModel } from "../../models/catalogue/sharedModels.js";
import AccountPanel from "./AccountPanel.jsx";
import Button from "./Button.jsx";
import Field from "./Field.jsx";
import "../styles/shared-models.css";

export default function AddLiftModelDialog({ sharedModels, onSave, onDismiss }) {
  const [origin] = useState(() => document.activeElement);
  const [id] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState(emptySharedModel);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const errors = attempted ? validateSharedModel(input) : {};
  const { status, user } = sharedModels;
  async function submitModel(event) {
    event.preventDefault();
    if (busy) return;
    setAttempted(true);
    const invalid = validateSharedModel(input);
    if (Object.keys(invalid).length) { document.getElementById(`new-model-${Object.keys(invalid)[0]}`)?.focus(); return; }
    setBusy(true); setMessage("");
    try { await onSave(input, id); onDismiss(); } catch (cause) { setMessage(cause.message); } finally { setBusy(false); }
  }
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onDismiss(); }}><Dialog.Portal>
    <Dialog.Backdrop className="modal-backdrop" />
    <Dialog.Popup className="modal add-model-dialog" finalFocus={() => origin?.isConnected ? origin : true}>
      <header className="add-model-header"><span className="add-model-icon" aria-hidden="true"><Layers3 size={21} /></span><div><Dialog.Title>Add lift model</Dialog.Title><Dialog.Description>Save a reusable configuration for your team.</Dialog.Description></div><Button variant="tertiary" disabled={busy} onClick={onDismiss} aria-label="Close add lift model"><X size={19} /></Button></header>
      {status === "ready" ? <form onSubmit={submitModel} noValidate>
          <div className="add-model-body">
            <p className="add-model-account">Signed in as {user.email}</p>
            <div className="add-model-fields">{SHARED_MODEL_FIELDS.slice(0, 2).map((field) => <ModelField key={field.key} field={field} value={input[field.key]} error={errors[field.key]} onChange={(value) => setInput((current) => ({ ...current, [field.key]: value }))} />)}</div>
            <div className="add-model-section"><h3>Technical specifications</h3><p>Enter confirmed specifications only. Unknown values can stay blank and be completed on the quotation.</p></div>
            <div className="add-model-fields">{SHARED_MODEL_FIELDS.slice(2).map((field) => <ModelField key={field.key} field={field} value={input[field.key]} error={errors[field.key]} onChange={(value) => setInput((current) => ({ ...current, [field.key]: value }))} />)}</div>
            <p className="add-model-note">Capacity, floors, project dimensions, and pricing remain quotation-specific. This does not change the approved Excel catalogue.</p>
            {message && <p className="field-error" role="alert">{message}</p>}
          </div>
          <footer className="add-model-actions"><Button variant="secondary" disabled={busy} onClick={onDismiss}>Cancel</Button><Button type="submit" loading={busy}><Plus size={16} aria-hidden="true" />{busy ? "Saving model…" : "Save & use model"}</Button></footer>
        </form> : <AccountPanel session={sharedModels} />}
    </Dialog.Popup>
  </Dialog.Portal></Dialog.Root>;
}

function ModelField({ field, value, error, onChange }) {
  return <Field id={`new-model-${field.key}`} label={field.label} required={field.required} error={error} wide={field.key === "quantityType"} hint={field.key === "quantityType" ? "Used in the quotation’s Quantity & Type description. Do not include the lift quantity." : field.key === "speed" ? "Include the unit, for example mtr/sec. No speed is assumed." : undefined}>
    <input id={`new-model-${field.key}`} value={value} maxLength={field.limit} aria-required={Boolean(field.required)} autoComplete="off" onChange={(event) => onChange(event.target.value)} />
  </Field>;
}
