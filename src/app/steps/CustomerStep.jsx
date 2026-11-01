import { useMemo } from "react";
import Field from "../components/Field.jsx";
import { ALTIS_QUOTATION_TEMPLATE as template } from "../../templates/altisQuotationTemplate.js";
import { suggestFinancialYear } from "../../models/quotation/quotation.js";

export default function CustomerStep({ workflow }) {
  const { quotation, update, setQuotation, errors, suggestedYear, resolved } = workflow;
  const financialYears = useMemo(() => {
    const start = Number((suggestedYear || template.reference.financialYear).slice(0, 4)) || new Date().getFullYear();
    return Array.from({ length: 21 }, (_, index) => { const year = start - 10 + index; return `${year}-${String((year + 1) % 100).padStart(2, "0")}`; });
  }, [suggestedYear]);
  return <>
    <div className="form-grid reference-grid">
      <Field id="reference-number" label="Quotation number" required value={quotation.reference.quotationNumber} onChange={(value) => update("reference", "quotationNumber", value)} error={errors("reference.quotationNumber")} hint="Variable number only; the Altis prefix is added automatically." />
      <Field id="reference-office" label="Office code" required error={errors("reference.officeCode")}><select id="reference-office" value={quotation.reference.officeCode} onChange={(event) => update("reference", "officeCode", event.target.value)}><option value="">Choose office code</option><option value="VJA">VJA</option>{quotation.reference.officeCode && quotation.reference.officeCode !== "VJA" && <option value={quotation.reference.officeCode}>{quotation.reference.officeCode} (saved draft)</option>}</select></Field>
      <Field id="quotation-date" label="Quotation date" required type="date" value={quotation.metadata.date} onChange={(value) => setQuotation((current) => ({ ...current, metadata: { ...current.metadata, date: value }, reference: { ...current.reference, financialYear: !current.metadata.date || current.reference.financialYear === template.reference.financialYear || current.reference.financialYear === suggestFinancialYear(current.metadata.date) ? suggestFinancialYear(value) : current.reference.financialYear } }))} error={errors("metadata.date")} />
      <Field id="reference-financial-year" label="Financial year" required error={errors("reference.financialYear")} hint={suggestedYear ? `Suggested from date: ${suggestedYear}` : "Choose the applicable April–March financial year."}><select id="reference-financial-year" value={quotation.reference.financialYear} onChange={(event) => update("reference", "financialYear", event.target.value)}><option value="">Choose financial year</option>{[...new Set([...financialYears, quotation.reference.financialYear, suggestedYear].filter(Boolean))].map((year) => <option key={year} value={year}>{year}{year === suggestedYear ? " (suggested)" : ""}</option>)}</select></Field>
      <Field id="customer-address" label="Customer address" required wide error={errors("customer.address")}><textarea id="customer-address" rows="3" value={quotation.customer.address} onChange={(event) => update("customer", "address", event.target.value)} /></Field>
      <Field id="salutation" label="Salutation"><select id="salutation" value={quotation.customer.salutation} onChange={(event) => update("customer", "salutation", event.target.value)}><option value="">Choose salutation</option><option value="Mr.">Mr.</option><option value="Mrs.">Mrs.</option><option value="Ms.">Ms.</option><option value="Other">Other</option></select></Field>
      {quotation.customer.salutation === "Other" && <Field id="other-salutation" label="Other salutation" value={quotation.customer.otherSalutation} onChange={(value) => update("customer", "otherSalutation", value)} />}
      <Field id="recipient-name" label="Recipient name" required value={quotation.customer.attentionName} onChange={(value) => update("customer", "attentionName", value)} error={errors("customer.attentionName")} />
      <Field id="project-location" label="Project location" required value={quotation.customer.projectLocation} onChange={(value) => update("customer", "projectLocation", value)} error={errors("customer.projectLocation")} />
      <Field id="subject-mode" label="Subject"><select id="subject-mode" value={quotation.customer.subjectMode} onChange={(event) => update("customer", "subjectMode", event.target.value)}><option value="supplyLift">Quotation for supply of Lift, project location.</option><option value="custom">Custom subject</option></select></Field>
      {quotation.customer.subjectMode === "custom" && <Field id="subject-custom" label="Custom subject" wide value={quotation.customer.subjectCustom} onChange={(value) => update("customer", "subjectCustom", value)} error={errors("customer.subjectCustom")} />}
    </div>
    <div className="preview-strip"><span>Reference</span><strong>{resolved.pages.cover.reference || "Complete the reference details"}</strong><span>Subject</span><strong>{resolved.pages.cover.subject}</strong></div>
  </>;
}
