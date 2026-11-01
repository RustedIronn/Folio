# QuoteFlow quotation contract

This is the concise implementation contract for routine QuoteFlow work. It is derived from the approved template, resolver, and validated catalogue. Read it before changing quotation behavior; use the detailed audit and source documents only when a change needs them.

## Ownership and version

- Schema: **v4**, persisted as `quoteflow:draft:v4`. `src/models/quotation/quotation.js` owns creation, migration, validation, resolution, formatting, and override helpers.
- Template: `src/templates/altisQuotationTemplate.js` owns fixed company, legal, material-default, commercial-default, and signature text. Preserve approved wording exactly.
- Catalogue: `src/data/catalogue/liftCatalogue.json` contains 49 Excel-derived records. `sourceRecordId` and `sourceRow` are provenance and must remain traceable to `data/source/lift-models.xlsx`.
- One resolver, `resolveQuotationDocument(quotation, catalogue, template)`, produces the document used by both review and PDF. Pages must not resolve their own values.

## Quotation shape

| Area | Key paths |
| --- | --- |
| Reference | `reference.quotationNumber`, `reference.officeCode`, `reference.financialYear`; composed with the fixed `AE/QUO/` prefix |
| Metadata | `metadata.date`; `preparedByName` is retained for draft compatibility, not required in the standard workflow |
| Customer | `customer.address`, `salutation`/`otherSalutation`, `attentionName`, `projectLocation`, `subjectMode`, `subjectCustom`; legacy `name` remains migration-safe |
| Lift | `lift.catalogueId`, `catalogueSourceRow`, `quantity`, `technicalOverrides`, `project`, `installation` |
| Materials | `materials.overrides` only; material standards live in the template and selected-lift technical values |
| Commercial | `commercial.priceAmount`, terms, and `payment.advance`/`dispatch`/`completion` |
| Acceptance | `document.acceptanceName`, `document.acceptanceDate`; printable but optional |

`lift.project.passengerCount` and `maximumLoadKg` compose the capacity string. Legacy `project.capacity` is only a fallback for migrated drafts. `lift.installation` owns structured/custom floor and dimension entry and writes the printable project descriptions.

## Resolution and precedence

1. Select a catalogue record by `sourceRecordId`; retain its source row.
2. Technical standard = selected record technical fields plus approved `technicalDefaults`.
3. A technical override wins over that standard. Restoring removes the override and returns to the actual standard.
4. Template material rows use their default values unless a material override exists. Control Panel, Rope, and Motors resolve from the canonical technical values (controller, rope, motor), so Page 2 and Page 5 stay synchronized.
5. Switching configurations requires an explicit choice whether to preserve overrides. Catalogue JSON is never mutated.

The Doors material is independent of car-protection. No passenger/load capacity is inferred from a lift model.

## Required for final export

- Reference number, office code, financial year, date; customer address, recipient name, and project location.
- Selected configuration with a detailed Excel description; positive integer quantity.
- Passenger count and maximum load, or an existing migrated capacity description; travel height, floor description, landing description, and cabin cutting.
- Non-negative quotation price; tax, packing/forwarding, delivery, transport/octroi, guarantee; all three payment percentages totaling 100.
- Every non-optional material value. Auto Rescue Device is intentionally optional.
- Layout limits: address 300; recipient 100; custom subject 180; guarantee, project descriptions, and materials 180 characters.

Shaft measurement, car size, cabin opening, acceptance name/date, and Auto Rescue Device may remain blank. Unresolved catalogue source notes are warnings unless they leave a required document value blank.

## Approved defaults

- Reference financial-year example: `2023-24`; it is editable and must not be treated as current automatically.
- Commercial defaults: tax `50%GST bill Included`; packing `4 % Included`; delivery `01 month from the date of confirmation of Order`; transport/octroi `Included`; guarantee `12 months from the date of Commissioning or 15 Months from the Date of dispatch Whichever Occurs earlier.`; payment 35/55/10.
- The quotation price is blank by default. All other material defaults and fixed legal pages belong to the template, not the UI or PDF components.

## Document ownership

| PDF page | Resolver section | Dynamic responsibility |
| --- | --- | --- |
| 1 Cover | `pages.cover` | Reference, date, customer addressing, subject |
| 2 Installation | `pages.installation` | Quantity/type, capacity, selected/overridden technical and project values |
| 3 Price schedule | `pages.priceSchedule` | Quantity, capacity, project location, price, terms, payments, acceptance |
| 4 Warranty | `pages.warranty` | Approved static contract text and footer date |
| 5 Materials | `pages.materials` | Twelve canonical material rows |
| 6 Obligations | `pages.obligations` | Approved static obligations and footer date |

Shared values: quantity and capacity appear on Pages 2–3; project location drives the cover subject and Page 3; controller/rope/motor drive Page 5; date is used on Page 1 and page footers.

## Data caveats and migrations

- Known workbook issues remain explicit: record 16 has no rope specification; column K is unlabelled; M/N are `Field1`/`Field2`; O/P/R are unclassified; lift type appears in more than one column. Do not guess mappings.
- `migrateDraft` supports v1–v3 into v4, including old reference, lifts, commercial payment, and free-text dimension data. Retain this behavior when changing the schema or draft key.
- Validate with the resolver and its tests. Do not use PDF-only fallbacks or silently replace missing values.
