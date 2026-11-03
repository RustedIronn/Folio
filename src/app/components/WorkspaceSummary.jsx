import { FileText } from "lucide-react";

export default function WorkspaceSummary({ workflow }) {
  const { resolved } = workflow;
  const { cover, priceSchedule } = resolved.pages;
  return <aside className="workspace-summary" aria-label="Live cover letter">
    <div className="paper-preview-label"><span>Live cover letter</span><FileText size={13} aria-hidden="true" /></div>
    <div className="paper-preview">
      <img src="/assets/altis-emblem.png" alt="Altis Elevators" />
      <div className="paper-rule" />
      <h3>{cover.attention || "Your recipient"}</h3>
      <p>{cover.customer.address || "The customer address will appear here as you enter it."}</p>
      <div className="paper-subject">{cover.subject || "Your quotation subject"}</div>
      <div className="paper-preview-foot" aria-hidden="true"><span /><span /><span /></div>
    </div>
    <p className="summary-document-note">A live summary of your details. The final document uses the approved six-page Altis template.</p>
    <dl className="summary-facts">
      {cover.date && <div><dt>Quotation date</dt><dd>{cover.date}</dd></div>}
      {priceSchedule.projectLocation && <div><dt>Project</dt><dd>{priceSchedule.projectLocation}</dd></div>}
      {priceSchedule.price.formatted && <div><dt>Quotation value</dt><dd>{priceSchedule.price.formatted}</dd></div>}
    </dl>
  </aside>;
}
