# Step 5A — Data mapping and catalogue design

## Scope and decision

This is a read-only assessment of the three workbooks currently in `data/source/` against QuoteFlow's schema v4, 49-record JSON catalogue, entry workflow, resolver, and six-page document contract. No source data, catalogue values, schema, defaults, or PDF content was changed.

The recommended integration boundary is deliberately narrow:

- Keep `lift-models.xlsx` as the sole approved source for catalogue standards.
- Treat `customerdetails.xlsx` as a private historical-observations source, not as a catalogue source.
- Treat `liftsquery.xlsx` as a private database-query sample that helps define a future import contract, not as a production feed.
- Require an approved mapping table before any historical model description, capacity, or technical value can populate a quotation automatically.

## Source inventory

| Source | Worksheet(s) | Records | Shape and role | Privacy classification |
| --- | --- | ---:| --- | --- |
| `lift-models.xlsx` | `Sheet1` | 49 catalogue records (after three heading rows) | 18 columns. Existing approved model/configuration source. | Internal business source; already traceable in Git. |
| `customerdetails.xlsx` | `Sheet1` | 680 historical records | 29 columns. Customer, quotation, installation, technical, and commercial observations dated 2013-05-12 through 2026-10-31. | Restricted: contains customer identity/address and historical prices. |
| `liftsquery.xlsx` | `Sheet1` | 1 record | 42 columns. A denormalized joined-query sample containing fields from at least contact and customer-detail sources. | Restricted: contains customer/commercial data and database-style identifiers. |

No workbook contains formulas in the `liftsquery.xlsx` sample. The source workbooks have one visible worksheet each and no merged cells. `customerdetails.xlsx` stores its dates as date cells and its 656 populated prices as numeric cells; this is useful for a future controlled import, but it does not approve any commercial default.

## Current QuoteFlow baseline

The current catalogue has 49 records. Each record preserves `sourceRecordId`, `sourceRow`, `quantityType`, `technical`, `sourceValues`, unresolved-field notes, and data-quality issues. Its approved technical fields are:

| Current catalogue technical field | Current role |
| --- | --- |
| `liftType` | Selector category and resolved lift type |
| `speed` | Page 2 technical value |
| `carProtectionDoor` | Page 2 technical value; independent from Page 5 Doors material |
| `doorFrame` | Page 2 technical value |
| `motor` | Shared technical value and Page 5 Motors |
| `controller` | Shared technical value and Page 5 Control Panel |
| `rope` | Shared technical value and Page 5 Rope |
| `autoRescueDeviceNote` | Optional Page 5 Auto Rescue Device context |
| `landingProtection` | Page 2 technical value |

Schema v4 already treats quantity, passenger count, maximum load, project dimensions, travel height, floors/landings, cabin cutting, customer information, price, terms, and payment stages as quotation-specific values. That separation remains correct.

## Field mapping matrix

Confidence describes whether a field can be used without new business approval. It is not a claim that all source values are complete or compatible.

| Workbook field(s) | QuoteFlow destination | Proposed handling | Confidence | Notes |
| --- | --- | --- | --- | --- |
| `lift-models.ID` | `catalogue.sourceRecordId` | Preserve current mapping | High | Existing authoritative provenance. |
| `lift-models.1.QuantitynType` | `catalogue.quantityType` | Preserve current mapping | High | Detailed selected-configuration description. |
| `lift-models.Type of Lift` / duplicate type column | `technical.liftType` | Preserve existing approved normalization only | Medium | Duplicate source fields remain a documented ambiguity. |
| `lift-models.Speed` | `technical.speed` | Preserve current mapping | High | Model-standard specification. |
| `lift-models.Typeofprotectionndoors` | `technical.carProtectionDoor` | Preserve current mapping | High | Do not map it to the Page 5 Doors material. |
| `lift-models.DOOR FRAME1` | `technical.doorFrame` | Preserve current mapping | High | Model-standard specification. |
| `lift-models.Motors` | `technical.motor` | Preserve current mapping | High | Shared Page 2/Page 5 value. |
| `lift-models.Controll Pannel-1` | `technical.controller` | Preserve current mapping | High | Shared Page 2/Page 5 value. |
| `lift-models.Rope` | `technical.rope` | Preserve current mapping when present | High / missing where blank | Record 16's missing rope remains unresolved. |
| `lift-models.12` | `technical.autoRescueDeviceNote` | Preserve as note only | Low | Header/value meaning is not consistently classified. |
| `lift-models.Type of Lanidng Protection` | `technical.landingProtection` | Preserve current mapping | Medium | Spelling and semantic consistency require source cleanup later. |
| Historical `Quantity & type` / query `QuantitynType` | Candidate model-match input | Match only through a future approved alias table | Medium | 33 of 48 distinct normalized historical descriptions exactly match a current catalogue description; 15 do not. |
| Historical/query `Capacity` | Existing passenger count + maximum load inputs | Parse into a proposed, reviewable pair; never auto-approve | Low | Repeated historical patterns are observations, not a model-capacity authority. |
| Historical/query `Travel Height` | `lift.project.travelHeight` | Employee entry or imported draft value with review | Medium | Historical numeric field, but installation-specific. |
| Historical/query shaft, car, and cabin-opening fields | Structured project dimensions or custom descriptions | Parse only when a format validator succeeds; otherwise retain as a reviewable custom string | Medium | All are installation-specific and often sparse. |
| Historical/query `Cabin2`, `LOP and COP`, `Security1`, `Safety` | Material/technical quotation override candidates | Employee-reviewed import candidates; never catalogue standards | Medium | They may populate a historical quotation but do not establish universal model compatibility. |
| Historical/query controller, rope, motor, door frame, protection, landing protection, speed | Historical observation linked to a selected model | Use for comparison/review only until approved by engineering | Low to Medium | Useful in a mapping-review tool, unsafe for automatic model enrichment. |
| Historical/query price, amount in words, extra price, terms | Commercial quotation data | Do not include in frontend JSON or defaults | Low | Historical prices and terms are private and quotation-specific. |
| Historical customer, address, reference, salutation, place, date | Quotation draft fields | Private import only in a future controlled workflow | Medium | Never expose through public assets or seed data. |
| Query `contactsnew.ID` and `cusdetails.ID` | Future source-system provenance | Store as optional external IDs on a private import record only | Medium | The sample's `cusdetails.ID` exists in the historical dataset; the contact ID is a separate namespace. |
| `Field1`, `Field2`, `Expr*`, `TYPE`, `RCR`, `Terms*`, `extra`, `safety1` | None | Retain source evidence only; do not map | Low | Unlabelled, derived, sparse, or semantically unresolved. |

## Data quality findings

### Approved catalogue source

- The original model workbook still yields the current 49-source-record catalogue.
- Existing unresolved issues remain valid: an unlabelled column K; generic `Field1` and `Field2`; unclassified O/P/R-style fields; multiple lift-type columns; and a missing rope value for record 16.
- These issues should stay as explicit source notes rather than being normalized through inference.

### Historical quotation source

- `customerdetails.xlsx` has 680 unique numeric IDs and four duplicate reference groups. It has 676 populated references, so references are not a safe unique key.
- The 48 distinct normalized historical lift descriptions overlap the approved catalogue, but only 33 match it exactly. Across populated historical rows, 526 of 661 descriptions match exactly after punctuation/case normalization. The remaining records need an alias decision or manual selection.
- Capacity is nonblank in 668 records but is free text with 15 distinct strings. It cannot become a model-capacity source without a separate approved capacity table.
- Shaft measurement, car size, and cabin opening are materially incomplete (260, 339, and 329 blank records respectively) and use free-text dimensions. They are appropriate project inputs, not standards.
- Customer, place, reference, date, price, and amount-in-words fields are historical quotation data. They must not be copied into catalogue JSON, app defaults, fixtures, or documentation examples.
- Several columns are too sparse to design against: `TYPE`, `RCR`, and `Field2` each have one populated record; door-frame finish has two; `extra`, type/design, and `safety1` have fewer than 14.

### Joined-query sample

- `liftsquery.xlsx` is a single-row export, so it cannot establish distribution, reliability, or uniqueness.
- Its `cusdetails.ID` is present in the historical customer dataset, demonstrating a plausible join. `contactsnew.ID` appears to be a different source-table identifier.
- Its `Expr1003`, `Expr1004`, `Expr1007`, `Expr1009`, and `Expr1022` headers are generated/ambiguous. Their semantics need a database-query definition before use.
- The sample contains selected technical, customer, dimension, and commercial fields but has blank price, cabin-opening, amount-in-words, cabin, and terms values. It is not a complete quotation record.

## Recommended normalized design

Keep the current quotation contract intact. Add a private integration layer around it rather than expanding public catalogue records with historical data.

```text
ApprovedCatalogueConfiguration
  sourceRecordId, sourceRow, quantityType, approvedTechnical, sourceNotes

ConfigurationAlias (new, curated)
  aliasId, sourceDescriptionNormalized, catalogueSourceRecordId,
  mappingStatus, approvedBy, approvedAt, notes

HistoricalQuotationObservation (private, import-only)
  sourceSystem, externalQuotationId, externalCustomerId, externalContactId,
  observedAt, rawDescription, rawTechnical, rawProject, rawCommercial,
  privacyClassification, importVersion

QuotationDraft (existing schema v4)
  selected catalogue ID + quotation-specific project, customer,
  materials, commercial values, and explicit overrides
```

Rules:

1. `ApprovedCatalogueConfiguration` remains the only automatic technical-standard source.
2. `ConfigurationAlias` can identify a catalogue record only after an explicit business/engineering approval. An alias does not copy historical technical fields into the catalogue.
3. Historical observations retain raw provenance and a field-level review status. They can prefill a private draft only after the employee confirms the selected configuration and each non-standard value.
4. Unknown, blank, ambiguous, and incompatible fields stay unknown. They must not be silently replaced by a historical majority value.
5. Capacity/load requires its own approved model-capacity table keyed to the approved catalogue ID. Do not derive it from historic descriptions, speed, motor, price, or recurring quotations.

## Selector and dependent-field behaviour

- Keep the selector's primary key as the approved source record ID and detailed `quantityType` description.
- Search should consult the approved description plus approved aliases; it must visibly distinguish an alias match from a direct catalogue description.
- Selecting a record continues to resolve approved technical values. Existing override confirmation remains mandatory when changing configuration.
- A historical import must present the source description and match confidence, then require an employee to choose or confirm the approved configuration before technical values resolve.
- Project dimensions, travel, floors/landings, customer fields, price, payment, and commercial wording remain quotation-specific. Import them as reviewable draft values, never standards.
- Material rows continue to resolve from the canonical resolver. Historical LOP/COP, security, cabin, and safety text may be offered as reviewed overrides only.

## Migration and compatibility

- No schema v4 migration is needed for Step 5A.
- Step 5B should avoid changing `catalogueId`, `catalogueSourceRow`, technical override precedence, or resolver ownership.
- If private import metadata is later persisted in local drafts, put it in an optional, versioned `importMetadata` object. It should not be required for legacy drafts or sent to the PDF resolver.
- Keep aliases outside `liftCatalogue.json` until they are curated. A separate private mapping file/service can evolve without rewriting the 49 approved records.
- Preserve unparsed dimension strings alongside parsed structured values during import review so no original project detail is lost.

## Privacy and repository controls

- Both new workbooks were initially untracked. `.gitignore` now ignores `data/source/*.xlsx` while explicitly retaining `data/source/lift-models.xlsx`, preventing accidental addition of customer/commercial workbooks.
- The workbooks must remain outside `public/`, generated frontend JSON, test fixtures, screenshots, and README examples.
- The existing tracked `lift-models.xlsx` and generated catalogue are business data. Public-repository authorization should remain an explicit owner decision.
- No private values, customer names, addresses, references, or historical prices are included in this report.

## Step 5B plan

1. **Blocker — approve data ownership:** confirm whether historical sources remain local-only, move to a protected backend, or are never imported into QuoteFlow.
2. **Blocker — define the source query:** obtain the database query/schema for `liftsquery.xlsx`, including table ownership and meanings of `Expr*`, `Field*`, and duplicate columns.
3. **Important — curate aliases:** create a reviewed description-to-`sourceRecordId` mapping table for the 15 unmatched historical descriptions; do not use fuzzy matching for automatic selection.
4. **Important — approve capacity source:** establish a model-capacity table or keep passenger/load fully employee-entered.
5. **Important — define import review:** design a private import screen/service with provenance, field-level confidence, and employee confirmation. Do not expose this in the public frontend bundle.
6. **Optional — build resilient dimension parsing:** support common width/depth/height notation behind a review state, retaining raw text on parse failure.
7. **Optional — historical analytics:** if authorized, produce aggregated, de-identified internal reports outside the quotation app. Historical commercial values must not become quotation defaults.

## Decisions required from Altis

1. Which system owns the canonical model capacity and maximum-load values?
2. Are the 15 unmatched historical descriptions aliases of current configurations, discontinued models, or data-entry variants?
3. May private historical records be imported into a browser-local draft, or must they remain server-side/protected?
4. What are the meanings and source tables behind `Expr*`, `Field1`, `Field2`, `TYPE`, `RCR`, `Terms*`, and duplicate type columns?
5. Which historical technical fields, if any, have engineering approval to become future catalogue standards?
