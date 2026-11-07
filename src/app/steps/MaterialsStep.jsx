import Field from "../components/Field.jsx";
import { MAX_CUSTOM_MATERIALS, removeCustomMaterial, upsertCustomMaterial } from "../../models/quotation/quotationExtensions.js";
import { useState } from "react";
import { Pencil, Plus, RotateCcw } from "lucide-react";
import { restoreMaterial, restoreTechnical, setMaterialOverride, setTechnicalOverride } from "../../models/quotation/quotation.js";
import AddEntryOptionDialog from "../components/AddEntryOptionDialog.jsx";
import Button from "../components/Button.jsx";
import Select from "../components/Select.jsx";
import { materialChoices, technicalChoices } from "../entryOptions.js";
import { materialStatus } from "../workflowPresentation.js";

export default function MaterialsStep({ workflow }) {
  const { quotation, setQuotation, resolved, template, catalogue, employee, sharedEntryOptions, openTechnicalField, errors } = workflow;
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [feedback, setFeedback] = useState("");
  const rows = resolved.pages.materials.rows;
  const requiredRows = rows.filter((row) => !row.optional);
  const complete = requiredRows.filter((row) => row.value && (row.source !== "custom" || row.label.trim())).length;
  function applyMaterial(key, value) {
    const customRow = rows.find((entry) => entry.key === key && entry.source === "custom");
    if (customRow) { setQuotation((current) => upsertCustomMaterial(current, { id:customRow.id, name:customRow.label, value })); return; }
    const row = template.materials.find((entry) => entry.key === key);
    setQuotation((current) => row.source === "technical"
      ? setTechnicalOverride(current, row.technicalKey, value, catalogue, template)
      : setMaterialOverride(current, key, value, template));
  }
  const editingRow = rows.find((row) => row.key === editingMaterial);
  return <div className="materials-workspace">
    <section className="materials-hero"><div><h3>{rows.length} material specifications</h3></div><div className="materials-heading-actions"><div className="materials-hero-count"><strong>{complete}/{requiredRows.length}</strong><span>required ready</span></div><Button variant="secondary" onClick={() => setAddingMaterial(true)}><Plus size={15} aria-hidden="true" />Add material</Button></div></section>
    {feedback && <p className="shared-model-feedback" role="status">{feedback}</p>}
    {employee.authorized && <div className="team-options-toolbar"><span role="status">{sharedEntryOptions.error || (sharedEntryOptions.loading ? "Loading team options…" : "Team material options available in the specification choices.")}</span><Button variant="tertiary" onClick={sharedEntryOptions.refresh} disabled={sharedEntryOptions.loading}>Refresh team options</Button></div>}
    <section className="materials-table" aria-label="Materials used by Altis Elevators"><div className="materials-table-head"><span>Material</span><span>Specification</span><span>Action</span></div>
      {rows.map((row, index) => {
        const customMaterial = row.source === "custom";
        if (customMaterial) {
          const customIndex = (quotation.materials.customRows ?? []).findIndex((entry) => entry.id === row.id);
          return <article className="material-row material-row-editing" key={row.key}><div className="material-name"><span className="material-index">{String(index + 1).padStart(2,"0")}</span><strong>{row.label || "Custom material"}</strong><span className="material-status is-custom">Customized</span></div><div className="custom-material-editor"><Field id={`custom-material-${row.id}-name`} label="Material name" required error={errors?.(`materials.customRows.${customIndex}.name`)}><input id={`custom-material-${row.id}-name`} maxLength={60} value={row.label} onChange={(event) => setQuotation((current) => upsertCustomMaterial(current,{id:row.id,name:event.target.value,value:row.value}))} /></Field><Field id={`custom-material-${row.id}-value`} label="Specification" required error={errors?.(`materials.customRows.${customIndex}.value`)}><textarea id={`custom-material-${row.id}-value`} maxLength={180} rows="2" value={row.value} onChange={(event) => applyMaterial(row.key,event.target.value)} /></Field></div><div className="material-actions"><Button variant="tertiary" aria-label={`Remove ${row.label || "custom material"}`} onClick={() => setQuotation((current) => removeCustomMaterial(current,row.id))}>Remove</Button></div></article>;
        }
        const technical = row.source === "technical";
        const custom = technical ? Object.hasOwn(quotation.lift.technicalOverrides, row.technicalKey) : Object.hasOwn(quotation.materials.overrides, row.key);
        const choices = technical ? technicalChoices(row.technicalKey, catalogue, sharedEntryOptions.records, template) : materialChoices(row.key, template, sharedEntryOptions.records);
        const canChoose = !technical || choices.length > 0;
        const editing = editingMaterial === row.key;
        const actionLabel = editing ? "Close" : technical ? "Choose" : custom ? "Edit" : "Customize";
        return <article className={`material-row ${editing ? "material-row-editing" : ""}`} key={row.key}>
          <div className="material-name"><span className="material-index">{String(index + 1).padStart(2, "0")}</span><strong>{row.label}</strong><span className={custom ? "material-status is-custom" : "material-status"}>{materialStatus(row, custom)}</span></div>
          <p>{row.value || (row.optional ? "Optional — not specified" : "Needs information")}</p>
          <div className="material-actions">
            {canChoose && <Button variant="compact" aria-label={`${actionLabel} ${row.label}`} onClick={() => setEditingMaterial(editing ? null : row.key)}><Pencil size={13} aria-hidden="true" />{actionLabel}</Button>}
            {technical && <Button variant={canChoose ? "tertiary" : "compact"} aria-label={`Adjust ${row.label}`} onClick={() => openTechnicalField(row.technicalKey)}>Adjust lift</Button>}
            {technical && custom && <Button variant="tertiary" onClick={() => setQuotation((current) => restoreTechnical(current, row.technicalKey))}><RotateCcw size={12} aria-hidden="true" />Restore</Button>}
          </div>
          {canChoose && editing && <div className="material-editor">
            <label htmlFor={`material-choice-${row.key}`}>Choose a specification</label>
            <Select id={`material-choice-${row.key}`} aria-label={`${row.label} specification`} aria-required={!row.optional} value={choices.some((option) => option.value === row.value) ? row.value : "__custom__"} options={[...choices, { value: "__custom__", label: "Custom / edit below" }]} onChange={(value) => { if (value !== "__custom__") applyMaterial(row.key, value); }} />
            <label htmlFor={`material-${row.key}`}>Custom specification{!row.optional && <span className="required-marker" aria-hidden="true">*</span>}</label>
            <textarea id={`material-${row.key}`} aria-required={!row.optional} rows="2" value={row.value} onChange={(event) => applyMaterial(row.key, event.target.value)} />
            {!technical && custom && <Button variant="tertiary" onClick={() => setQuotation((current) => restoreMaterial(current, row.key))}><RotateCcw size={12} aria-hidden="true" />Restore Altis standard</Button>}
          </div>}
        </article>;
      })}
    </section>
    {addingMaterial && <AddEntryOptionDialog kind="material" session={employee} materials={template.materials.filter((item)=>rows.some((row)=>row.key === item.key))} customOptions={sharedEntryOptions.records.filter((record) => record.kind === "material" && record.materialKey === "custom")} allowCustom={(quotation.materials.customRows?.length ?? 0) < MAX_CUSTOM_MATERIALS} initialValue={{ materialKey: editingRow?.key ?? "", specification: editingRow?.value ?? "" }} onDismiss={() => setAddingMaterial(false)} onSave={async (input, id) => { if (input.materialKey === "custom" && (quotation.materials.customRows?.length ?? 0) >= MAX_CUSTOM_MATERIALS) throw new Error("The six-page material schedule supports up to six custom rows."); const record = await sharedEntryOptions.add(input, id); if (record.materialKey === "custom") setQuotation((current) => upsertCustomMaterial(current, {id:record.id,name:record.customName,value:record.specification})); else applyMaterial(record.materialKey, record.specification); setFeedback("Material option saved for your team and applied to this document."); }} />}
  </div>;
}
