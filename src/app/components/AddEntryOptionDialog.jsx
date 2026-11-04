import { Dialog } from "@base-ui/react/dialog";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { validateEntryOption } from "../../models/catalogue/sharedEntryOptions.js";
import AccountPanel from "./AccountPanel.jsx";
import Button from "./Button.jsx";
import Field from "./Field.jsx";
import Select from "./Select.jsx";
import "../styles/shared-models.css";

export default function AddEntryOptionDialog({ kind, initialValue, materials, customOptions = [], allowCustom = true, session, onSave, onDismiss }) {
  const [origin] = useState(() => document.activeElement);
  const [id] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState(() => ({ ...initialValue, kind }));
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const errors = attempted ? validateEntryOption(input) : {};
  const capacity = kind === "capacity";
  const title = capacity ? "Add capacity" : "Add material";
  const update = (key, value) => setInput((current) => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setAttempted(true);
    const invalid = validateEntryOption(input);
    if (Object.keys(invalid).length) { document.getElementById(`team-option-${Object.keys(invalid)[0]}`)?.focus(); return; }
    setBusy(true); setMessage("");
    try { await onSave(input, id); onDismiss(); } catch (cause) { setMessage(cause.message); } finally { setBusy(false); }
  }
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onDismiss(); }}><Dialog.Portal>
    <Dialog.Backdrop className="modal-backdrop" />
    <Dialog.Popup className="modal add-model-dialog entry-option-dialog" finalFocus={() => origin?.isConnected ? origin : true}>
      <header className="add-model-header"><span className="add-model-icon" aria-hidden="true"><Plus size={21} /></span><div><Dialog.Title>{title}</Dialog.Title><Dialog.Description>Save a reusable dropdown option for all verified employees.</Dialog.Description></div><Button variant="tertiary" disabled={busy} onClick={onDismiss} aria-label={`Close ${title.toLowerCase()}`}><X size={19} /></Button></header>
      {session.authorized ? <form onSubmit={submit} noValidate>
        <div className="add-model-body">
          <p className="add-model-account">Signed in as {session.user.email}</p>
          <div className="add-model-fields">
            {capacity ? <>
              <Field id="team-option-passengerCount" label="Passenger capacity (persons)" required error={errors.passengerCount}><input id="team-option-passengerCount" type="number" min="1" step="1" inputMode="numeric" value={input.passengerCount} onChange={(event) => update("passengerCount", event.target.value)} /></Field>
              <Field id="team-option-maximumLoadKg" label="Maximum load (kg)" required error={errors.maximumLoadKg}><input id="team-option-maximumLoadKg" inputMode="decimal" maxLength={32} value={input.maximumLoadKg} onChange={(event) => update("maximumLoadKg", event.target.value)} /></Field>
            </> : <>
              <Field id="team-option-materialKey" label="Material" required wide error={errors.materialKey}><Select id="team-option-materialKey" positionerClassName="entry-option-positioner" aria-label="Material" value={input.materialKey} onChange={(value) => { const saved = customOptions.find((option) => "saved:" + option.id === value); setInput((current) => ({ ...current, materialKey: saved ? "custom" : value, customName: saved?.customName ?? current.customName ?? "", specification: saved?.specification ?? "" })); }} placeholder="Choose a material" options={[{ value: "", label: "Choose a material" }, ...materials.map((row) => ({ value: row.key, label: row.label })), { value:"custom", label:"Custom material name", disabled:!allowCustom }, ...customOptions.map((row) => ({ value:"saved:" + row.id, label:"Saved: " + row.customName, disabled:!allowCustom }))]} /></Field>
              {input.materialKey === "custom" && <Field id="team-option-customName" label="Custom material name" required wide error={errors.customName}><input id="team-option-customName" maxLength={60} value={input.customName ?? ""} onChange={(event) => update("customName", event.target.value)} /></Field>}
              <Field id="team-option-specification" label="Specification" required wide error={errors.specification}><textarea id="team-option-specification" rows="3" maxLength={180} value={input.specification} onChange={(event) => update("specification", event.target.value)} /></Field>
            </>}
          </div>
          <p className="add-model-note">{capacity ? "Use a confirmed passenger/load pair. Saving does not associate this capacity with a lift model." : (input.materialKey === "custom" ? "A custom material adds a named row to this document and a reusable team option. It does not change the catalogue." : "This adds a specification under the selected material. It does not replace Altis standards or modify the Excel catalogue.")} Save &amp; use applies your option to this document.</p>
          {!capacity && !allowCustom && <p className="field-hint">This document already has six custom material rows. Existing rows can still be edited or removed.</p>}
          {message && <p className="field-error" role="alert">{message}</p>}
        </div>
        <footer className="add-model-actions"><Button variant="secondary" disabled={busy} onClick={onDismiss}>Cancel</Button><Button type="submit" loading={busy}>{busy ? "Saving option…" : "Save & use option"}</Button></footer>
      </form> : <AccountPanel session={session} />}
    </Dialog.Popup>
  </Dialog.Portal></Dialog.Root>;
}
