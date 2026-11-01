# QuoteFlow

QuoteFlow is a local-first quotation workspace for Altis Elevators. It guides an employee through preparing a lift quotation, resolves catalogue and template values into one document model, and produces a six-page PDF ready for review and download.

It is designed to reduce repeated entry while preserving the source record, approved wording, and quotation-specific choices behind every generated document.

## Workflow

1. Enter customer, reference, and project details.
2. Select one of the validated lift configurations.
3. Add only project-specific installation values and deliberate technical overrides.
4. Confirm the materials schedule and commercial terms.
5. Review the resolved quotation, preview the PDF, and download it when all required information is complete.

The review screen and the PDF renderer use the same resolved-document object. A draft can be previewed with incomplete fields left blank, but final download is available only when export-readiness validation passes.

## Implemented features

- Guided five-step employee workflow: Customer, Lift & installation, Materials, Commercial terms, and Review & PDF.
- Local draft persistence with versioned migrations for earlier drafts.
- Searchable selection from 49 Excel-derived lift configurations, retaining each source record ID and workbook row.
- Catalogue autofill with quotation-level technical and material overrides, restoration to the catalogue/template value, and confirmation before configuration changes discard dependent values.
- Structured reference-number composition, Indian financial-year suggestion, floor/landing descriptions, dimensions, capacity inputs, and INR amount-in-words formatting.
- Approved commercial defaults that remain quotation-specific and editable.
- A unified resolver that supplies consistent values across the review screen and all six PDF pages.
- Draft PDF preview and gated final export using `@react-pdf/renderer`.
- Responsive, keyboard-accessible workspace with Altis green and gold visual styling.

## Technology

- React 19 and Vite
- `@react-pdf/renderer` for client-side PDF preview and download
- SheetJS (`xlsx`) for deterministic catalogue conversion and validation
- Native Node test runner and ESLint

## Local development

Use a recent Node.js LTS release and npm.

```sh
git clone <repository-url>
cd QuoteFlow
npm ci
npm run dev
```

Vite prints the local development address when it starts. Use `npm run build` to create a production bundle and `npm run preview` to serve that bundle locally.

## npm scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Produce a production build in `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | Run ESLint across the project. |
| `npm test` | Run the Node test suite. |
| `npm run catalogue:build` | Convert the authoritative workbook into application JSON and write its validation report. |
| `npm run catalogue:check` | Verify that the committed JSON catalogue still matches the source workbook and conversion rules. |

## Project structure

```text
src/
  app/                  Employee workflow, steps, and shared UI controls
  data/catalogue/       Generated lift catalogue JSON
  models/quotation/     Schema, migrations, validation, and document resolver
  pdf/                  Six-page PDF renderer and preview/download integration
  templates/            Approved fixed document content and defaults
scripts/                Excel-to-JSON conversion and validation
data/source/            Authoritative lift-model workbook
data/reports/           Generated catalogue validation report
docs/                   Contract, data notes, and implementation audits
public/assets/          Application branding assets
tests/                  Resolver, migration, catalogue, and workflow tests
```

## Catalogue architecture

The lift catalogue is deliberately separated from quotation data:

```text
lift-models.xlsx
  -> scripts/convert-lift-catalogue.mjs
  -> src/data/catalogue/liftCatalogue.json
  -> selected catalogue configuration
  -> quotation-level overrides
  -> resolveQuotationDocument()
  -> review and PDF
```

The converter preserves source record identifiers and row numbers so a selected configuration remains traceable to the workbook. It also generates a validation report for duplicate, invalid, missing, and ambiguous source fields. The application never writes back to the catalogue; employee changes are saved only as quotation-level overrides.

Known ambiguous workbook fields remain explicit rather than being guessed. In particular, QuoteFlow does not infer passenger capacity or maximum load from unrelated model properties.

## PDF preview and export

QuoteFlow renders the approved six-page Altis quotation from the resolved document data. Fixed branding, contract wording, warranty, and obligations live in the central template; variable values come from the selected configuration and the active quotation.

The application supports an incomplete draft preview for safe layout review. Missing values are intentionally left blank, never fabricated. Download is enabled only after the required customer, lift, commercial, and material values pass readiness validation. Generated filenames are based on the composed quotation reference.

## Current limitations

- Quotations support one lift configuration at a time.
- Drafts are stored in the current browser's local storage; there is no shared backend or user authentication.
- The catalogue is refreshed by the local conversion script, not live Excel synchronization.
- Passenger capacity and maximum load remain explicit quotation inputs until a reliable source mapping is approved.
- Some source workbook columns are intentionally unresolved and are surfaced as review information rather than automatically mapped.
- Digital signatures, automatic sequential reference numbering, and multi-user workflows are not included.

## Planned improvements

Future work may include a more detailed approved lift-model source, richer catalogue mappings, broader accessibility and touch-device review, shared persistence, and controlled deployment workflows. These changes should preserve the existing resolver contract and the approved document content.

## Business context and document handling

QuoteFlow is being developed for the Altis Elevators quotation workflow. Altis-specific business wording and reference materials are used only as the intended document context.

Customer quotation PDFs are excluded from version control and must not be placed in `public/`, where Vite would deploy them as public assets. Before making this repository public, the organization should also explicitly confirm that publishing `data/source/lift-models.xlsx` and the generated catalogue is authorized: both are currently tracked business source data.

## Contributing

Read [AGENTS.md](AGENTS.md) and [the quotation contract](docs/quotation-contract.md) before changing quotation behavior. Keep catalogue provenance intact, preserve approved contractual text, and run the focused tests plus lint/build checks relevant to the change.
