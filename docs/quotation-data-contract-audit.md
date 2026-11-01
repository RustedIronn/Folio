# Quotation data contract audit

## 1. Executive summary

**Status: Blocked for correct PDF implementation.** The current quotation draft safely preserves a selected catalogue ID, a workbook source row, copied standard technical values, and quotation-level overrides. It is ready to support part of Page 1, part of Page 2, and part of Page 3. It cannot yet produce the reference six-page quotation correctly because several page-specific values have no quotation path, no UI entry, or no approved source mapping.

This audit is based on the preserved six-page PDF reference and the validated 49-record catalogue. Findings labelled **verified** come directly from those sources or current code. Proposed paths are design recommendations, not implemented fields.

### Data flow observed

`data/source/lift-models.xlsx` → `scripts/convert-lift-catalogue.mjs` → `src/data/catalogue/liftCatalogue.json` → `applyConfiguration()` copies `technical` values into `lifts[0].standardSpecifications` → quotation-specific `specificationOverrides` and `materials.overrides` → no current resolved-document model.

**Blocker:** Add a single pure document-resolution layer before rendering. It must use the effective override-or-standard value consistently, preserve the selected source ID and row, and never substitute a blank catalogue value with a default.

## 2. Reference integrity and scope

- The supplied PDF is six pages, non-encrypted, and has no interactive form fields. It is a Letter-size Microsoft Word 2013 export.
- Its SHA-256 after relocation is `065AB144B1EFB3DBF85664920F88FF124844659FEAB37825C6D26A611D84E519`.
- The workbook supplied in `public/data` differed at the file-byte level from `data/source/lift-models.xlsx`, but the two workbooks have the same one sheet (`Sheet1`), 52 logical rows, headers, and cell values. The existing authoritative workbook was retained; the public duplicate was removed.
- The PDF is intentionally excluded from Git and is no longer under Vite's `public` directory.

## 3. Page-by-page field mapping

### Page 1 — Cover letter

| PDF field / content | Classification | Proposed path / source | Current schema, UI, validation | Transformation and open question |
| --- | --- | --- | --- | --- |
| Ref | Customer-entered | `metadata.referenceNumber` | Yes / Yes / required | Render as entered. |
| Date | Customer-entered | `metadata.date` | Yes / Yes / required | Format from ISO date for document display. **Important:** approve display format. |
| Recipient/customer name | Customer-entered | `customer.name` | Yes / Yes / required | The sample address does not include a separately displayed customer name. **Important:** confirm desired recipient layout. |
| Street/address | Customer-entered | `customer.address` | Yes / Yes / required | Preserve user line breaks and wrap safely. |
| Kind Attention | Customer-entered | `customer.attention` | Yes / Yes / optional | **Important:** decide whether it is required for every quotation. |
| Subject | Customer-entered | `customer.subject` | Yes / Yes / required | Render verbatim; project location can be included by the user, as in the reference. |
| Project location | Customer-entered | `customer.projectLocation` | Yes / Yes / required | It does not appear as an independent Page 1 field in the sample, but is used in the subject. |
| Logo, ISO text, company addresses/contact details, green/gold layout | Static company content | Future fixed document template/assets | No / No / N/A | **Blocker:** obtain approved canonical company text/assets; do not transcribe from a sample without approval. |
| Letter body and sign-off | Static company content | Future immutable template text | No / No / N/A | **Important:** preserve source wording exactly until Altis approves a controlled text version. |
| Authorized signatory | Signature information | Proposed `document.executiveSignature` or signature placeholder | No / No / No | **Blocker:** identify whether PDF has a live signature, a blank line, or a named signatory. |

### Page 2 — New Elevator Installation

| PDF field | Classification | Proposed path / source | Current schema, UI, validation | Transformation and unresolved question |
| --- | --- | --- | --- | --- |
| Quantity & Type | Catalogue-derived plus quotation quantity | `lifts[0].quantity` + selected record `quantityType` | Quantity yes/yes/required; description is only on catalogue record | **Blocker:** do not use `liftType` as this description. A resolver must retrieve/snapshot `quantityType`. |
| Capacity | Overridable technical specification | Proposed `lifts[0].specificationOverrides.capacity` then catalogue standard if supplied | No / No / No | **Blocker:** neither workbook mapping nor schema supplies capacity. The sample has 6 persons / 408 kg. |
| Speed | Catalogue-derived, overridable | `effectiveSpecification(lift, "speed")` | Yes / Yes / no completeness check | Render as text; no fabricated fallback. |
| Travel height | Site-specific | `lifts[0].siteMeasurements.travelHeightM` | Yes / Yes / optional numeric | Sample uses `G + 4`, not metres. **Blocker:** approve unit/representation and whether it is required. |
| No. of floors / landings | Site-specific | Proposed `siteMeasurements.floorDescription`, `landingDescription` or numeric fields | No / No / No | `stops` is not equivalent to both PDF rows. |
| Shaft measurement | Site-specific | `siteMeasurements.shaftWidthMm` + `shaftDepthMm` | Partial / Yes / optional numeric | **Important:** approve display convention and whether pit/overhead dimensions are needed. |
| Car size | Site-specific | Proposed `siteMeasurements.carWidthMm`, `carDepthMm`, `carHeightMm` | No / No / No | **Blocker:** no current field. |
| Entrance door frame | Catalogue-derived, overridable | `effectiveSpecification(lift, "doorFrame")` | Yes / Yes / no completeness check | Direct text. |
| Type & design of car | Conditional technical/material | Proposed `lifts[0].technical.carDesign` | No / No / No | The reference says SS Cabin; workbook has no clearly mapped car-design column. |
| Type of car protection | Catalogue-derived, overridable | `effectiveSpecification(lift, "carProtectionDoor")` | Yes / Yes / no completeness check | Workbook header is malformed but mapping is documented. Confirm whether it is also the Page 5 door value. |
| Type of landing protection | Catalogue-derived, overridable | `effectiveSpecification(lift, "landingProtection")` | Yes / Yes / no completeness check | Source column Q has a malformed header but mapped values are retained. |
| Cabin cutting / cabin opening | Site-specific or material override | Proposed `lifts[0].technical.cabinCutting`, `siteMeasurements.cabinOpeningMm` | No / No / No | **Blocker:** neither field exists in current contract/catalogue. |
| M/C room and lift-well power supply | Static/conditional technical | Proposed approved company standard or `technical.powerSupply` | No / No / No | **Blocker:** workbook mapping has no verified values; previous prototype values must not be reused as evidence. |
| Safety / Face Plate | Static or overridable technical | Proposed approved standard fields | No / No / No | **Blocker:** not mapped in current catalogue. |
| Footer date, executive signature, customer signature | Signature/acceptance | `metadata.date`, proposed signature fields | Date yes; signatures no | **Blocker:** signatures have no model or UI path. |

### Page 3 — Price Schedule

| PDF field | Classification | Proposed path / source | Current schema, UI, validation | Transformation and unresolved question |
| --- | --- | --- | --- | --- |
| Quantity and capacity description | Catalogue / technical / commercial | `lifts[0].quantity`, proposed capacity, `customer.projectLocation` | Quantity and location yes; capacity no | **Blocker:** capacity cannot be composed reliably. |
| Project location | Customer-entered | `customer.projectLocation` | Yes / Yes / required | Render as entered. |
| Price | Commercial | `commercial.priceAmount` | Yes / Yes / required non-negative | **Important:** add currency/currency-code policy and Indian-number formatting approval. |
| Amount in words | Calculated | Proposed `commercial.priceAmountInWords` derived from approved currency rules | No / No / No | **Blocker:** requires supported currency, rounding, and wording convention. |
| Taxes | Commercial | `commercial.taxPercentage` plus proposed tax label/inclusion status | Partial / Yes / required 0–100 | The reference says `50%GST bill Included`; do not infer a rate or inclusion meaning. |
| Packing and forwarding | Commercial | Proposed `commercial.packingForwarding` | No / No / No | **Blocker.** |
| Delivery | Commercial | `commercial.deliveryWeeks` | Partial / Yes / required non-negative | Reference is in months and depends on order confirmation. **Important:** store the contractual wording/trigger, not only weeks. |
| Transport charges & octroi | Commercial | Proposed `commercial.transportCharges` | No / No / No | **Blocker.** |
| Guarantee | Commercial/legal | `commercial.guarantee` | Yes / Yes / required | Reference wording includes two duration/event conditions. Free text can capture it, but legal ownership/approved default is unresolved. |
| Payment stages | Commercial | `commercial.payment.*` plus proposed stage labels/wording | Percentages yes/yes/total 100; stage wording no | **Important:** current labels do not preserve the reference's contractual phrases. |
| Acceptance: accepted by, signature, name, date | Acceptance information | `document.acceptanceName`, `document.acceptanceDate`, proposed `document.acceptanceSignature` | Name/date optional; signature no | **Blocker:** clarify whether customer name is accepted-by and how signatures are handled. |
| Footer | Signature information | Same as Page 2 | Incomplete | Same signature blocker. |

### Page 4 — Warranty

The guarantee, free-service, cancellation, termination, and title-to-property body text is **static contractual content** in the reference. No body variable was verified. Page 4's only dynamic values are the footer date and executive/customer signatures.

**Blocker:** establish an approved immutable legal-text source. The sample contains durations, percentages, and wording that must not be corrected, abbreviated, or rewritten by a generator without written Altis approval.

### Page 5 — Materials Used by Altis Elevators

| PDF material entry | Workbook/catalogue evidence | Proposed treatment | Current schema/UI | Finding |
| --- | --- | --- | --- | --- |
| 1. Control Panel | Column H → `technical.controller` | Catalogue standard, quotation override | Yes / Yes | Verified mapping. |
| 2. Cabin | No clear source column | Manual quotation input/review | No / No | **Blocker:** sample `SS Cabin` is not a catalogue value. |
| 3. Doors | Column E → `technical.carProtectionDoor` may be related | Conditional catalogue value with explicit Altis approval | Partial / shown as technical only | **Important:** do not equate car protection and door material without confirmation. |
| 4. Flooring | No clear source column | Manual quotation input/review | No / No | **Blocker.** |
| 5. Rope | Column I → `technical.rope` | Catalogue standard, quotation override | Yes / Yes | Verified mapping; source record 16 is explicitly missing. |
| 6. LOP and COP | No clear source column | Manual quotation input/review | No / No | **Blocker.** |
| 7. Lights and Blower | No clear source column | Manual quotation input/review | No / No | **Blocker.** |
| 8. Indications | No clear source column | Manual quotation input/review | No / No | **Blocker.** |
| 9. Security | No clear source column | Manual quotation input/review | No / No | **Blocker.** |
| 10. Motors | Column G → `technical.motor` | Catalogue standard, quotation override | Yes / Yes | Verified mapping. |
| 11. Guide rails | No clear source column | Manual quotation input/review | No / No | **Blocker.** |
| 12. Auto Rescue Device | Column L is mapped as `autoRescueDeviceNote`; generic column M may also contain related text | Manual review unless Altis confirms mapping | Partial / Yes | **Blocker:** generic/ambiguous source columns prevent reliable automatic text. |

`materials.overrides` duplicates several technical values independently. **Blocker:** define precedence so Page 2 and Page 5 cannot show contradictory values for controller, motor, rope, or auto-rescue device.

### Page 6 — Customer Contract Obligations

The company obligations and customer-at-their-cost responsibilities are static contractual content in the reference. No body variable was verified. The footer date and signatures have the same incomplete mapping as Pages 2–5.

**Important:** retain the source wording exactly for the prototype; any copy editing is a separate legal/business approval.

## 4. Catalogue and override audit

- **Verified:** all 49 JSON records retain `sourceRecordId` and `sourceRow`; catalogue validation reports no duplicate IDs or duplicate full configurations.
- **Verified:** `applyConfiguration()` copies the selected record's `technical` object, so changing a draft cannot mutate catalogue JSON. Existing tests cover this.
- **Verified:** standard restoration removes the override and returns the copied catalogue value. Existing tests cover it.
- **Verified:** the UI requires a confirmation choice before configuration changes; it can preserve customizations or replace them with new standards.
- **Important:** a quotation stores copied technical values, but not the selected record's `quantityType` or the source record's quality/unresolved metadata. A future document resolver must look up the catalogue by ID or snapshot the necessary descriptive/provenance fields deliberately.
- **Blocker:** there is no document-resolution function. Rendering direct UI/draft fields would miss effective values and could produce inconsistent Page 2/Page 5 material values.
- **Verified source issues:** record 16 has `rope: null`; K is unlabelled; M/N are generic fields; O/P/R are unclassified terms; C and J both identify lift type. None can be mapped further without Altis confirmation.

## 5. Validation and UI readiness

### Fields currently required before the UI calls a quotation complete

Reference number, quotation date, prepared-by name, customer name/address/project location/subject, catalogue selection, quantity, price, tax percentage, delivery weeks, guarantee, and all three payment percentages (which must total 100%).

### Gaps

- **Blocker:** Page 2 fields capacity, floors, landings, car size, car design, cabin cutting/opening, power supply, safety, face plate, and signatures cannot be completed.
- **Blocker:** eight of Page 5's twelve material entries have no current form path.
- **Blocker:** Page 3 has no packing/forwarding, transport, price-in-words, currency, tax treatment, or acceptance signature path.
- **Important:** acceptance name/date are optional although the reference includes acceptance fields. Decide whether blank acceptance is intentional for a proposal-stage PDF.
- **Important:** the UI labels travel as metres but the reference uses a floor notation; it must not be automatically transformed.
- **Important:** a source-review warning is shown for the selected record, but it is a general banner rather than field-specific PDF gating.
- **Optional:** prepared-by email/phone are collected but do not appear in the sample PDF.

## 6. User-experience observations

- The selector clearly identifies a catalogue record by source ID, lift type, door/protection, and speed. This supports traceability.
- Standard and customized values are visibly distinguished and individually restorable.
- The configuration-switch dialog prevents silent customization loss.
- **Important:** the review pane is summary-only. Before enabling document generation, it should expose all resolved values, all source warnings, and the exact missing-field list rather than only validation messages.
- **Important:** a local-storage draft is appropriate for resilience but is not a business record or approval trail.

## 7. Recommended Step 3 sequence

1. **Resolve blockers with Altis:** approve static company/legal text, all missing Page 2/3/5 fields, material mappings, signature approach, commercial wording, and units.
2. Define a versioned resolved-document view model that reads a quotation plus catalogue and outputs effective, provenance-aware values. Add tests for it before any layout work.
3. Extend the quotation schema/UI only for approved fields; mark required vs optional using approved business rules.
4. Add field-level PDF-readiness validation, including unresolved catalogue values and Page 5 material completeness.
5. Create immutable template constants for the approved Page 1, 4, and 6 text and verified company contact data.
6. Implement and visually compare one page at a time against the reference, then compose the six-page document.

## 8. Decisions requiring Altis confirmation

1. Approved company logo, ISO statement, office addresses, contact details, and signatory/signature method.
2. Whether Page 2 travel height must be `G + 4`, metres, or both; required site dimensions and car-size convention.
3. Source of capacity, floors, landings, car design, cabin cutting/opening, power supply, safety, and face plate.
4. Whether column E is a valid Page 5 Doors value and whether L/M contain the canonical auto-rescue-device text.
5. Values and ownership for the missing eight Page 5 materials.
6. Currency, price-in-words rules, tax treatment, packing/forwarding, transport/octroi, delivery trigger, and exact payment-stage wording.
7. Whether acceptance and signature fields are blank placeholders, typed names, images, or handled outside the generated document.
8. Approval of the Page 4 and Page 6 legal wording as immutable template content.
