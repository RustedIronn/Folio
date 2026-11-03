import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { catalogue, sampleQuotation } from "../scripts/pdf-test-support.mjs";
import { createQuotation, resolveQuotationDocument } from "../src/models/quotation/quotation.js";
import { ALTIS_QUOTATION_TEMPLATE as template } from "../src/templates/altisQuotationTemplate.js";

async function component(file) {
  const result = await build({
    entryPoints: [fileURLToPath(new URL(file, import.meta.url))],
    bundle: true, write: false, platform: "node", format: "esm", jsx: "automatic",
    loader: { ".css": "empty" },
    plugins: [{ name: "external-runtime", setup(builder) {
      builder.onResolve({ filter: /^[^./]/ }, ({ path, kind }) => kind === "entry-point" ? undefined : { path: import.meta.resolve(path), external: true });
    } }],
  });
  return (await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`)).default;
}

const ReviewStep = await component("../src/app/steps/ReviewStep.jsx");
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
