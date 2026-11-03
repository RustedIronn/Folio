# Travel-height mapping investigation

Verified on 3 November 2026. **No floor arithmetic, stored values, resolver mapping or PDF presentation was changed in this usability pass.**

## Reproduced path

| Stage | Actual behavior for 4 upper floors | Source |
| --- | --- | --- |
| Employee input | `lift.installation.upperFloors = "4"` | `src/app/steps/LiftStep.jsx`, standard Upper floors control |
| Floor calculation | `standardFloorDescription("4")` produces `Ground + 4 Upper landings – 5 Stops` for floors and landings | `src/models/quotation/quotation.js`, `withInstallationProject()` / `standardFloorDescription()` |
| Altis travel input | `setUpperFloors()` sets `lift.project.travelHeight = altisTotalFloors("4")`, returning `"5"` | Same model module, `altisTotalFloors()` / `setUpperFloors()` |
| Resolved document | Copies the saved project value unchanged, so `pages.installation.project.travelHeight === "5"` | Same model module, `resolveQuotationDocument()` |
| Review | Displays the resolved travel value `5` | `src/app/steps/ReviewStep.jsx` |
| PDF | `displayTravelHeight("5")` prefixes the integer and prints `G + 5` on Page 2, in both PDF versions | `src/pdf/documentPresentation.js` and `src/pdf/AltisQuotationPdf.jsx` |

## Established cause

Two separately approved conventions compose: the earlier Altis total-floor rule **includes Ground** (`upperFloors + 1`), while the later presentation-only request adds `G +` to the saved number. The renderer does not receive the upper-floor count for this field and does not subtract Ground. This is not an Excel capacity/model mapping, cloud migration, or catalogue issue.

The result can be read as one extra upper floor even though the stored value is a total count. That is a business-label/meaning decision, not a calculation defect that can safely be corrected by guessing. The current contract explicitly records both conventions.

## Preserved compatibility

- Explicit standard-floor edits update travel to the total-floor count.
- Custom floor arrangements retain manually entered travel wording.
- Opening an existing draft or editing dimensions does not recalculate its saved travel wording.
- Already-prefixed values such as `G + 4`, descriptive custom values and blank values remain unchanged by the PDF formatter.
- Schema v4 and both PDF formats remain unchanged.

## Decision needed before a semantic fix

Altis should confirm whether the Page 2 field means **total floors including Ground**, or **Ground plus an upper-floor count**. If it means total floors, its presentation needs wording that does not imply an additional Ground floor. If it means Ground plus upper floors, any change must explicitly account for existing saved numeric and custom drafts; removing one from every saved value would be unsafe. No option has been implemented or silently chosen.
