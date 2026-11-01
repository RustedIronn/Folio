# Lift catalogue source notes

## Source and traceability

The authoritative source is `data/source/lift-models.xlsx`, sheet `Sheet1`. Row 3 is treated as the header row; data starts at row 4. Each generated record keeps the source record ID, Excel row number, and every source cell value keyed by column letter.

The generated JSON has no customer, pricing, tax, delivery, payment, or other quotation-specific values. Those belong to future quotation state, not the lift catalogue.

## Conservative field mapping

Columns A through K and P are mapped to normalized technical-field names. Normalization trims values and collapses repeated whitespace only. Blank cells become `null`; no specifications are defaulted or copied between records.

Columns C and J both describe lift type and are deliberately retained separately. The source has an unlabelled column K, generic `Field1` and `Field2` headers in columns N and M, plus unclassified terms columns O, P, and R. They are stored under `unresolvedFields` and are not interpreted as specifications.

## Data-quality rules

- Every non-blank source row needs an ID in column A to be included.
- Records are not deduplicated: repeated configurations and duplicate IDs are reported for review while source records remain traceable.
- A literal period (`.`) is retained and reported as an ambiguous placeholder, not silently converted into a business value.
- Blank mapped technical values are reported at record level.

See `data/reports/liftCatalogue.validation.json` for the reproducible current findings. Resolve the business meaning of generic and terms columns before exposing them in a quotation or PDF.

The current workbook has one mapped technical omission: source record ID `16` (Excel row 19) has no rope value. It is preserved as `null` and must be resolved from an authoritative business source before it is used in a quotation.
