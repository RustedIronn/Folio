# QuoteFlow

Start with [docs/quotation-contract.md](docs/quotation-contract.md). It is the authoritative compact guide to the schema, resolver, defaults, provenance, and PDF field ownership.

## Work narrowly

- Read only files relevant to the request. Do not re-audit the Excel workbook or reference PDF for routine UI, resolver, or renderer changes.
- `src/models/quotation/quotation.js` owns schema v4, validation, migrations, and the canonical resolver.
- `src/templates/altisQuotationTemplate.js` owns approved static and contractual text; do not alter it without explicit approval.
- `src/data/catalogue/liftCatalogue.json` is Excel-derived and must retain source IDs and rows. Change conversion rules and source data only together, with catalogue validation.
- `src/app/` owns entry UI; `src/pdf/` consumes resolved document data only. Keep review and PDF on `resolveQuotationDocument()`.

## Guardrails

- Do not fabricate specifications or infer capacity from unrelated catalogue values.
- Preserve override behavior, configuration-switch confirmation, draft migration, and six-page PDF behavior.
- Make targeted changes; avoid broad rewrites and unrelated dependencies.
- Keep source documents out of public deployment paths and preserve approved branding/assets.

## Verification

Run focused tests while developing. Before completion run `npm test`, `npm run catalogue:check`, `npm run lint`, `npm run build`, and `git diff --check` when applicable. Report unresolved source-data issues plainly.
