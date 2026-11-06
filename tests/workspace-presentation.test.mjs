import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { catalogue, sampleQuotation } from "../scripts/pdf-test-support.mjs";
import { createQuotation, resolveQuotationDocument, setTechnicalOverride } from "../src/models/quotation/quotation.js";
import { ALTIS_QUOTATION_TEMPLATE as template } from "../src/templates/altisQuotationTemplate.js";

async function component(file, exportName = "default") {
  const result = await build({
    entryPoints: [fileURLToPath(new URL(file, import.meta.url))],
    bundle: true, write: false, platform: "node", format: "esm", jsx: "automatic",
    loader: { ".css": "empty" },
    plugins: [{ name: "external-runtime", setup(builder) {
      builder.onResolve({ filter: /^[^./]/ }, ({ path, kind }) => kind === "entry-point" ? undefined : { path: import.meta.resolve(path), external: true });
    } }],
  });
  return (await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`))[exportName];
}

const ReviewStep = await component("../src/app/steps/ReviewStep.jsx");
const CustomerStep = await component("../src/app/steps/CustomerStep.jsx");
const CommercialStep = await component("../src/app/steps/CommercialStep.jsx");
const LiftStep = await component("../src/app/steps/LiftStep.jsx");
const WorkspaceSummary = await component("../src/app/components/WorkspaceSummary.jsx");
const CloudDraftsBar = await component("../src/app/components/CloudDraftsBar.jsx");
const noop = () => {};
function review(quotation, extra = {}) {
  const resolved = resolveQuotationDocument(quotation, catalogue, template);
  return renderToStaticMarkup(React.createElement(ReviewStep, { workflow: {
    quotation, resolved, exportReady: resolved.missing.length === 0,
    documentAccess: { canPreview: false, canDownload: false },
    update: noop, requestPreview: noop, readinessGroups: [], jumpToIssue: noop,
    showReviewErrors: false, setShowReviewErrors: noop, previewRequested: false,
    visitStep: noop, pdfFileName: "synthetic.pdf", ...extra,
  } }));
}

test("complete visitor review has one sign-in preview action and retains all summary values", () => {
  const html = review(sampleQuotation());
  assert.equal((html.match(/Sign in for preview/g) || []).length, 1);
  assert.ok(!html.includes("Review missing details"));
  assert.ok(html.includes("Your visitor entries will be retained"));
  assert.ok(html.includes("Example Street\nExample District\nExample City"));
  assert.ok(html.includes("View all materials details"));
  assert.ok(html.includes("Guide rails"));
  assert.ok(html.includes(template.commercial.guarantee));
  assert.ok(!html.includes("undefined"));
});

test("incomplete review keeps correction messages and actions distinct without enabling export", () => {
  const quotation = createQuotation(template);
  const resolved = resolveQuotationDocument(quotation, catalogue, template);
  const issue = resolved.missing.find((entry) => entry.path === "customer.address");
  assert.ok(issue);
  const html = review(quotation, { showReviewErrors: true, readinessGroups: [["Customer & reference", [issue]]] });
  assert.ok(html.includes("Review missing details"));
  assert.ok(html.includes('class="readiness-message"'));
  assert.ok(html.includes('class="readiness-action"'));
  assert.ok(!html.includes("Download PDF"));
});

test("quiet guest storage presentation still surfaces local saving failures", () => {
  const workflow = { employee: { user: null, authorized: false }, setAuthIntent: noop,
    drafts: { localSaved: true, status: "local", notice: "", conflict: null } };
  assert.equal(renderToStaticMarkup(React.createElement(CloudDraftsBar, { workflow })), "");
  const failed = { ...workflow, drafts: { ...workflow.drafts, localSaved: false } };
  const html = renderToStaticMarkup(React.createElement(CloudDraftsBar, { workflow: failed }));
  assert.ok(html.includes('role="alert"'));
  assert.ok(html.includes("This browser could not save a local copy"));
});

function entryWorkflow(quotation) {
  return { quotation, catalogue, template, resolved: resolveQuotationDocument(quotation, catalogue, template),
    update:noop, setQuotation:noop, errors:noop, suggestedYear:"2026-27", updatePayment:noop,
    updateProject:noop, chooseConfiguration:noop, addSharedModel:noop,
    employee:{authorized:false}, sharedEntryOptions:{records:[]}, sharedModels:{status:"signed-out"} };
}
test("customer folio retains saved addressing, custom subject and all reference controls", () => {
  const quotation=sampleQuotation(); quotation.customer.salutation="M/s";
  quotation.customer.subjectMode="custom"; quotation.customer.subjectCustom="Synthetic custom project subject";
  const html=renderToStaticMarkup(React.createElement(CustomerStep,{workflow:entryWorkflow(quotation)}));
  for(const id of ["reference-number","reference-office","reference-financial-year","quotation-date","customer-address","salutation","recipient-name","project-location","subject-mode","subject-custom"]) assert.ok(html.includes('id="'+id+'"'),id);
  assert.ok(html.includes("Synthetic custom project subject"));
  assert.ok(html.includes("Example Street"));
  assert.ok(html.indexOf('id="recipient-name"')<html.indexOf('id="customer-address"'));
});
test("commercial editor and ivory summary display the same resolved quotation terms", () => {
  const quotation=sampleQuotation(); quotation.commercial.priceAmount="750000";
  quotation.commercial.packingForwarding="Synthetic packing adjustment";
  const workflow=entryWorkflow(quotation);
  const html=renderToStaticMarkup(React.createElement(CommercialStep,{workflow}));
  assert.ok(html.includes('aria-label="Commercial summary"'));
  assert.ok(html.includes(workflow.resolved.pages.priceSchedule.price.formatted));
  assert.ok(html.includes("Synthetic packing adjustment"));
  for(const key of ["advance","dispatch","completion"]) assert.ok(html.includes('id="payment-'+key+'"'));
  assert.ok(html.includes(template.commercial.guarantee));
});
test("configuration summary uses effective overrides while retaining catalogue traceability", () => {
  const quotation=setTechnicalOverride(sampleQuotation(),"motor","Synthetic motor adjustment",catalogue,template);
  const workflow=entryWorkflow(quotation);
  const html=renderToStaticMarkup(React.createElement(LiftStep,{workflow}));
  assert.ok(html.includes('aria-label="Selected configuration summary"'));
  assert.ok(html.includes("Synthetic motor adjustment"));
  assert.ok(html.includes("#"+quotation.lift.catalogueId));
  assert.ok(html.includes(workflow.resolved.pages.installation.project.capacity));
  assert.ok(html.includes("Custom wording"));
  assert.ok(html.includes("Advanced lift specification adjustments"));
});

test("review uses three cards while retaining all material rows and their edit action", () => {
  const html=review(sampleQuotation());
  assert.equal((html.match(/class="summary-group"/g)||[]).length,3);
  assert.ok(html.includes("Lift &amp; materials"));
  assert.ok(html.includes('aria-label="Edit materials"'));
  assert.ok(html.includes("View all materials details"));
  for(const row of template.materials) assert.ok(html.includes(row.label));
  assert.ok(html.includes("35% / 55% / 10%"));
});
test("customer sidebar summarizes actual addressing and project details without placeholders", () => {
  const workflow=entryWorkflow(sampleQuotation());
  const html=renderToStaticMarkup(React.createElement(WorkspaceSummary,{workflow}));
  assert.ok(html.includes("Customer information"));
  assert.ok(html.includes("Example Street\nExample District\nExample City"));
  assert.ok(html.includes("The project is located in"));
  assert.ok(html.includes("<strong>"+workflow.resolved.pages.cover.attention+"</strong>"));
  assert.ok(html.includes('aria-label="Quotation subject"'));
  assert.ok(html.includes(workflow.resolved.pages.cover.subject));
  assert.ok(!html.includes("Not provided"));
});

const SelectControl = await component("../src/app/components/Select.jsx");
const CatalogueControl = await component("../src/app/components/Select.jsx", "Combobox");

test("dropdown wrappers expose labelled button actions and selected catalogue input", () => {
  const options = [{value:"12", label:"Approved configuration"}];
  const select = renderToStaticMarkup(React.createElement(SelectControl, {id:"test-select", value:"12", options, onChange:noop, "aria-label":"Lift category"}));
  assert.match(select, /class="select-value"/);
  assert.match(select, /aria-label="Lift category"/);
  const combo = renderToStaticMarkup(React.createElement(CatalogueControl, {id:"test-combo", value:"12", options, selectedLabel:"Approved configuration", query:"", onQueryChange:noop, onChange:noop, "aria-label":"Configuration"}));
  assert.match(combo, /<button(?=[^>]*class="combobox-toggle")(?=[^>]*aria-label="Show lift configurations")[^>]*/);
  assert.match(combo, /value="Approved configuration"/);
  assert.match(combo, /aria-expanded="false"/);
});

const DateControl = await component("../src/app/components/DatePicker.jsx");
test("custom date control replaces native date widgets and preserves the selected date", () => {
  const html = renderToStaticMarkup(React.createElement(DateControl, { id:"quotation-date", label:"Quotation date", value:"2026-11-04", onChange:noop, "aria-required":true }));
  assert.match(html, /<button[^>]*id="quotation-date"/);
  assert.ok(html.includes("04/11/2026"));
  assert.ok(html.includes("Quotation date".toLowerCase()));
  assert.ok(!html.includes('type="date"'));
  assert.ok(!html.includes("<input"));
  const empty = renderToStaticMarkup(React.createElement(DateControl, { id:"acceptance-date", label:"Acceptance date", value:"", onChange:noop }));
  assert.ok(empty.includes("Select date"));
});

const Sidebar = await component("../src/app/components/Sidebar.jsx");
test("sidebar retains five direct navigation actions and truthful save feedback", () => {
  const steps=["Customer","Lift & installation","Materials","Commercial terms","Review & PDF"].map((label,index) => ({id:["customer","installation","materials","commercial","review"][index],label,state:index === 0 ? "current" : index === 4 ? "available" : "not-started",required:index === 4 ? 0 : 7,completed:0}));
  const workflow={currentStep:"customer",workflowProgress:steps,overallProgress:{percent:0,completed:0,required:28},saveStatus:"local",drafts:{localSaved:true,ownerUid:"synthetic-user",status:"error"},visitStep:noop};
  const html=renderToStaticMarkup(React.createElement(Sidebar,{workflow,onReset:noop}));
  assert.equal((html.match(/class="rail-step /g)||[]).length,5);
  assert.ok(html.includes("Current section. 7 details remaining"));
  assert.ok(html.includes("Saved locally"));
  assert.ok(html.includes("cloud unavailable"));
  assert.ok(html.includes("Reset quotation"));
  assert.ok(html.includes("<strong>Folio</strong>"));
  assert.ok(!html.includes("QuoteFlow"));
  assert.ok(html.includes("Review &amp; PDF. Available"));
  assert.ok(!html.includes("0/7"));
});

test("commercial editor and Review show each without a combined-total label", () => {
  const quotation=sampleQuotation();quotation.lift.quantity="2";quotation.commercial.priceAmount="500000";
  const workflow=entryWorkflow(quotation);
  const commercial=renderToStaticMarkup(React.createElement(CommercialStep,{workflow}));
  const summary=review(quotation);
  for(const html of [commercial,summary]) {
    assert.ok(html.includes("₹5,00,000 each"));
    assert.ok(html.includes("Rupees Five Lakh Only each"));
    assert.ok(!html.includes("Quotation total"));
    assert.ok(!html.includes("Total for all"));
  }
  assert.ok(commercial.includes("Price per lift"));
  assert.equal(quotation.commercial.priceAmount,"500000");
});

 test("landing protection has one visible installation control outside advanced adjustments", () => {
  const workflow=entryWorkflow(setTechnicalOverride(sampleQuotation(),"landingProtection","Synthetic landing adjustment",catalogue,template));
  const html=renderToStaticMarkup(React.createElement(LiftStep,{workflow}));
  assert.equal((html.match(/id="technical-landingProtection"/g)||[]).length,1);
  assert.ok(html.indexOf('id="technical-landingProtection"') < html.indexOf('class="detail-panel lift-advanced-panel"'));
  assert.ok(html.includes("Synthetic landing adjustment"));
  assert.ok(!workflow.resolved.pages.materials.rows.some((row) => row.key === "landingProtection"));
});

test("revised commercial controls show numeric terms, bank selection and custom bank fields",()=>{
 const q=sampleQuotation();let html=renderToStaticMarkup(React.createElement(CommercialStep,{workflow:entryWorkflow(q)}));
 for(const id of ["guarantee","guarantee-dispatch","warranty-handoverYears","warranty-dispatchMonths","warranty-serviceIntervalDays","warranty-freeServiceMonths","bank-account"])assert.ok(html.includes('id="'+id+'"'),id);
 q.commercial.bankDetails={mode:"custom",selectedId:"icici-vijayawada",custom:{accountName:"Synthetic business",accountNumber:"001234",bankName:"Synthetic bank",ifsc:"TEST0000123"}};
 html=renderToStaticMarkup(React.createElement(CommercialStep,{workflow:entryWorkflow(q)}));
 for(const key of ["accountName","accountNumber","bankName","ifsc"])assert.ok(html.includes('id="bank-'+key+'"'));
});
