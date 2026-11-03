# QuoteFlow quotation contract

This is the concise implementation contract for routine QuoteFlow work. It is derived from the approved template, resolver, and validated catalogue. Read it before changing quotation behavior; use the detailed audit and source documents only when a change needs them.

## Ownership and version

- Schema: **v4**. `src/models/quotation/quotation.js` owns creation, legacy draft migrations, validation, resolution, formatting, and override helpers. `src/models/quotation/workspace.js` owns the version-1 local/cloud workspace envelope, account isolation, guest import, autosave and conflict recovery. Legacy `quoteflow:draft:v4`/v1–v3 keys remain importable.
- Template: `src/templates/altisQuotationTemplate.js` owns fixed company, legal, material-default, commercial-default, and signature text. Preserve approved wording exactly.
- Catalogue: `src/data/catalogue/liftCatalogue.json` contains 49 Excel-derived records. `sourceRecordId` and `sourceRow` are provenance and must remain traceable to `data/source/lift-models.xlsx`.
- Shared additions: Firebase Authentication and Firestore store employee-entered models separately. They use `shared:<uuid>` identifiers, `origin: "shared"`, and a null Excel row; never assign fabricated workbook IDs. Verified email accounts can read/add models with no domain restriction or approval list. The approved JSON is unchanged. Firestore rules validate creates and prohibit updates/deletes.
- One resolver, `resolveQuotationDocument(quotation, catalogue, template)`, produces the document used by both review and PDF. Pages must not resolve their own values.
- Visitor entry/review stays public. All verified Firebase accounts are authorized employees (owner-confirmed; no allowlist). Cloud writes, shared models and PDF rendering require that session. Final download additionally requires the existing export readiness checks.

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

PDF presentation prefixes plain shaft dimensions with `W` / `D` (for example, `W 1800 × D 1650 mm`), and car dimensions with `W` / `D` / `H` when height is present. Values and recorded units are retained; blank, incomplete, already-labelled and descriptive custom text is not fabricated or relabelled. The website price input and amount feedback use the interface sans-serif font; PDF price typography remains the approved Times-Bold.

An optional `lift.configurationSnapshot` preserves the selected shared model in v4 drafts. Existing v4 drafts need no migration. `selectedConfiguration()` resolves a matching, validated shared snapshot before the current catalogue; selecting an Excel record removes it. The snapshot stays in its quotation even offline. Other shared records require sign-in. The Firebase migration retains the same IDs and snapshot format; provider session tokens are not migrated.

Guest data is local (`quoteflow:guest-workspace:v1`). Employee caches are namespaced by UID (`quoteflow:employee-workspace:v1:<uid>`); logout restores the separate visitor workspace and hides employee data. Private cloud drafts live at `users/{uid}/quotationDrafts/{uuid}`, separate from `liftModels`. Cloud documents wrap the unchanged v4 quotation with owner UID, revision, mutation ID and server timestamps. Guest import creates a separate draft; existing employee drafts are retained. Revision conflicts never overwrite newer data: save a copy, or restore cloud data while keeping a local backup. See [employee-workspace.md](employee-workspace.md).

## Resolution and precedence

1. Select a catalogue record by `sourceRecordId`; retain its source row.
2. Technical standard = selected record technical fields plus approved `technicalDefaults`.
3. A technical override wins over that standard. Restoring removes the override and returns to the actual standard.
4. Template material rows use their default values unless a material override exists. Control Panel, Rope, and Motors resolve from the canonical technical values (controller, rope, motor), so Page 2 and Page 5 stay synchronized.
5. Switching configurations requires an explicit choice whether to preserve overrides. Catalogue JSON is never mutated.

The Doors material is independent of car-protection. No passenger/load capacity is inferred from a lift model.

Employee-entry shortcuts: `src/app/entryOptions.js` contains curated passenger/load pairs and material descriptions. These are explicit employee selections, not catalogue standards or defaults; custom values remain editable. No customer records or commercial history are bundled.

Tax-description choices offer the original template wording, 50%/100% GST bill wording, and custom entry; these strings do not calculate tax or alter price. Advanced technical choices reuse exact values from the same approved catalogue field (speed, door/frame/protection, motor, controller, rope). They do not certify compatibility across configurations. Ambiguous rope spelling `1 3 mm` is not offered as a shortcut; original source and saved values remain intact. Category, ambiguous rescue notes, and remaining free-form fields stay text inputs.

Altis convention (owner-confirmed): the PDF's existing “Travel Height” field represents total floors served including Ground, not a physical distance. Explicit standard floor edits set it to `upperFloors + 1`; custom arrangements remain editable. Opening a saved draft or editing dimensions does not rewrite its saved travel wording. PDF presentation prefixes a plain integer with `G + ` (stored `5` prints `G + 5`); blank, already-prefixed and custom descriptions remain intact. This does not subtract Ground or change the stored floor count. Schema v4, draft migrations, and PDF labels remain unchanged.

## Required for final export

- Reference number, office code, financial year, date; customer address, recipient name, and project location.
- Selected configuration with a detailed catalogue or employee-entered description; positive integer quantity.
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

PDF presentation: pages are fixed at 612 × 792 points and use measured reference anchors. `src/pdf/documentPresentation.js` formats dates and the resolved INR amount for display only; it validates actual page geometry and printable text regions after layout. Unusually long text fails PDF generation explicitly rather than clipping. Preview and download share one BlobProvider URL; final download remains gated by resolver readiness and successful rendering. Company-only images were extracted into `public/assets/altis-emblem.png` and `altis-watermark.png`; the private reference PDF remains unchanged and ignored. `node scripts/render-quotation-samples.mjs` creates four synthetic, ignored local samples; `scripts/verify-quotation-samples.py` independently checks their PDF objects and extracted content using pypdf.

PDF output versions: **Branded** preserves the original document. **Print-friendly** uses the same resolved data and six-page body layout with no images, watermark, green sidebar, ISO statement or yellow contact footer. The standard date and executive/customer signature footers on Pages 2–6 remain. Body acceptance/signature fields, commercial and contractual wording, and black table borders remain. The preview selector regenerates one shared preview/download blob; print-friendly filenames add `-print-friendly`. Both versions retain the same employee verification and final-export readiness gates. This preference is presentation state, not a schema/draft change. The sample renderer/verifier checks four quotations in both formats.

## Data caveats and migrations

- Known workbook issues remain explicit: record 16 has no rope specification; column K is unlabelled; M/N are `Field1`/`Field2`; O/P/R are unclassified; lift type appears in more than one column. Do not guess mappings.
- `migrateDraft` supports v1–v3 into v4, including old reference, lifts, commercial payment, and free-text dimension data. Retain this behavior when changing the schema or draft key.
- Validate with the resolver and its tests. Do not use PDF-only fallbacks or silently replace missing values.
