export default function WorkspaceSummary({ workflow }) {
  const { cover, priceSchedule } = workflow.resolved.pages;
  return <aside className="workspace-summary" aria-label="Customer information summary">
    <span className="summary-eyebrow">Document details</span><h3>Customer information</h3>
    <div className="customer-narrative">
      {(cover.attention || cover.date) && <p>This quotation is prepared{cover.attention && <> for <strong>{cover.attention}</strong></>}{cover.date && <> on <strong>{cover.date}</strong></>}.</p>}
      {cover.customer.address && <p>The customer address is <strong>{cover.customer.address}</strong>.</p>}
      {priceSchedule.projectLocation && <p>The project is located in <strong>{priceSchedule.projectLocation}</strong>.</p>}
    </div>
    <div className="summary-flow" aria-hidden="true" />
    {cover.subject && <section className="customer-subject" aria-label="Quotation subject"><span className="customer-subject-label">Subject</span><p>{cover.subject}</p></section>}
  </aside>;
}
