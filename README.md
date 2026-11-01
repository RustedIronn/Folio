# QuoteFlow

QuoteFlow is an Altis Elevators quotation generator. This repository currently contains only the Step 1 catalogue foundation; it does not yet implement quotation entry, PDF generation, authentication, a backend, or live Excel synchronization.

## Commands

```sh
npm ci
npm run catalogue:build
npm run catalogue:check
npm run lint
npm run build
```

`catalogue:build` reads `data/source/lift-models.xlsx` and deterministically generates:

- `src/data/catalogue/liftCatalogue.json` — source-traceable catalogue records for the application
- `data/reports/liftCatalogue.validation.json` — duplicate, invalid-row, and source-schema findings

Run `catalogue:check` in CI to ensure generated data has not gone stale. Source-field mapping and unresolved source-data questions are documented in [`docs/catalogue-data-notes.md`](docs/catalogue-data-notes.md).
