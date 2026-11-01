function SummaryRow({ label, value }) {
  if (!String(value ?? "").trim()) return null;
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

export default function WorkspaceSummary({ workflow }) {
  const { resolved, exportReady } = workflow;
  const { installation, priceSchedule } = resolved.pages;
  const liftDetails = [installation.quantityAndType, installation.project.capacity].filter(Boolean).join(" · ");

  return <aside className="workspace-summary" aria-label="Quotation at a glance">
    <p className="summary-kicker">Live document</p>
    <div className="summary-title-row"><h2>At a glance</h2><span className={exportReady ? "readiness ready" : "readiness"}>{exportReady ? "Ready" : "Draft"}</span></div>
    <dl>
      <SummaryRow label="Recipient" value={resolved.pages.cover.attention} />
      <SummaryRow label="Project" value={priceSchedule.projectLocation} />
      <SummaryRow label="Lift" value={liftDetails} />
      <SummaryRow label="Price" value={priceSchedule.price.formatted} />
      <SummaryRow label="Delivery" value={priceSchedule.delivery} />
    </dl>
    {!exportReady && <p className="summary-note">{resolved.missing.length} required item{resolved.missing.length === 1 ? "" : "s"} remain before download.</p>}
  </aside>;
}
