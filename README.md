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
- Public visitor entry with local guest drafts; verified employee sign-in preserves guest input and imports it without overwriting saved quotations.
- Private per-user Firestore draft autosave, cross-device restoration, account-isolated local recovery, and explicit conflict handling.
- Searchable selection from 49 Excel-derived lift configurations, retaining each source record ID and workbook row.
- Shared, employee-added lift models through Firebase Authentication and Cloud Firestore, with personal-email registration, email verification, and sign-in. Shared models stay separate from the approved Excel catalogue.
- Catalogue autofill with quotation-level technical and material overrides, restoration to the catalogue/template value, and confirmation before configuration changes discard dependent values.
- Structured reference-number composition, Indian financial-year suggestion, floor/landing descriptions, dimensions, capacity inputs, and INR amount-in-words formatting.
- Approved commercial defaults that remain quotation-specific and editable.
- A unified resolver that supplies consistent values across the review screen and all six PDF pages.
- Employee-only draft PDF preview and final export using `@react-pdf/renderer`, with final download also gated by quotation completeness.
- Responsive, keyboard-accessible workspace with Altis green and gold visual styling.

## Technology

- React 19 and Vite
- `@react-pdf/renderer` for client-side PDF preview and download
- Base UI, Lucide React, and the modular Firebase Web SDK for accessible controls, icons, and shared model storage/authentication
- SheetJS (`xlsx`) for deterministic catalogue conversion and validation
- Native Node test runner and ESLint

## Local development

Use Node.js 22.12 or newer (Node 24 LTS is also supported) and npm.

```sh
git clone <repository-url>
cd QuoteFlow
npm ci
npm run dev
```

Vite prints the local development address when it starts. Use `npm run build` to create a production bundle and `npm run preview` to serve that bundle locally.

Visitor entry and the approved catalogue work without a Firebase connection. Cloud drafts, shared models and PDF generation require a verified account. Copy `.env.example` to `.env.local` and follow [the Firebase setup guide](docs/shared-lift-models.md) and [employee workspace guide](docs/employee-workspace.md). Use the public Firebase Web app configuration; never put service-account credentials or private keys in frontend environment variables.

## npm scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Produce a production build in `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | Run ESLint across the project. |
| `npm test` | Run the Node test suite. |
| `npm run test:rules` | Start the local Firestore emulator and test access policies (Java 21+ required). |
| `npm run test:emulators` | Run the complete suite with Firestore rules enabled, without skipped security tests. |
| `npm run catalogue:build` | Convert the authoritative workbook into application JSON and write its validation report. |
| `npm run catalogue:check` | Verify that the committed JSON catalogue still matches the source workbook and conversion rules. |

## Project structure

```text
src/
  app/                  Employee workflow, steps, and shared UI controls
  data/catalogue/       Generated lift catalogue JSON
  models/quotation/     Schema, migrations, validation, and document resolver
  pdf/                  Six-page PDF renderer and preview/download integration
  services/             Firebase authentication, shared models, and private cloud draft access
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

Verified employees can preview incomplete drafts for layout review. Missing values are intentionally left blank, never fabricated. Visitors can review form values and are prompted to sign in before PDF rendering. Download requires both an authorized employee session and complete customer, lift, commercial, and material values. Generated filenames are based on the composed quotation reference.

## Current limitations

- Quotations support one lift configuration at a time.
- Guest drafts stay on the current browser. Verified employee quotations sync privately to the same account across devices; this does not provide collaborative editing or cross-employee access.
- The catalogue is refreshed by the local conversion script, not live Excel synchronization.
- Passenger capacity and maximum load remain explicit quotation inputs until a reliable source mapping is approved.
- Some source workbook columns are intentionally unresolved and are surfaced as review information rather than automatically mapped.
- Digital signatures, automatic sequential reference numbering, and collaborative quotation editing are not included.

## Planned improvements

Future work may include a more detailed approved lift-model source, richer catalogue mappings, broader accessibility and touch-device review, and automated release checks. These changes should preserve the existing resolver contract and the approved document content.

See [release readiness](docs/release-readiness-2026-11-03.md) for verified checks and outstanding deployment requirements.

## Business context and document handling

QuoteFlow is being developed for the Altis Elevators quotation workflow. Altis-specific business wording and reference materials are used only as the intended document context.

Customer quotation PDFs are excluded from version control and must not be placed in `public/`, where Vite would deploy them as public assets. Before making this repository public, the organization should also explicitly confirm that publishing `data/source/lift-models.xlsx` and the generated catalogue is authorized: both are currently tracked business source data.

## Contributing

Read [AGENTS.md](AGENTS.md) and [the quotation contract](docs/quotation-contract.md) before changing quotation behavior. Keep catalogue provenance intact, preserve approved contractual text, and run the focused tests plus lint/build checks relevant to the change.
