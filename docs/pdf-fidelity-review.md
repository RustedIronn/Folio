# PDF visual fidelity review

## Implementation follow-up — 2 November 2026

The findings below are the **pre-fix audit snapshot**. The priority fixes have now been implemented in `src/pdf/AltisQuotationPdf.jsx`, `documentPresentation.js`, and `PdfPreview.jsx`.

- Fixed actual output size: explicit page min/max height compensates for the installed layout engine taking page height from the initially absent page box rather than the declared style height. All tested output pages now measure 612 × 792 points, not just a declared Letter prop.
- Extracted the approved emblem and watermark only, without customer data. The watermark's black-matte premultiplied RGB is converted to straight alpha so its edge matches the original rather than appearing dark. The original reference is unmodified. `scripts/extract-pdf-branding.py` makes extraction reproducible with pypdf/Pillow.
- Aligned the cover to the reference's logo, company block, green strip, letter anchors, left signatory and inset yellow footer; applied display date formatting. Contact text comes from the existing template.
- Recreated installation table proportions, row spacing and grouped electrical supply; aligned commercial columns and acceptance fields; restored the visible `Rs.` and `/-` price presentation without recalculating values.
- Restored warranty hierarchy, material row spacing, and the obligations page's hanging indents and separate closing paragraph. Contractual template strings are unchanged.
- Added explicit post-layout checks for actual page sizes and printable region overflow. Text is measured at full height before validation because measuring inside a short fixed-height box silently truncates lines in this renderer. A failed layout does not become a downloadable blob.
- Preview and download consume the same BlobProvider URL. Changing data remounts the provider so a stale prior blob cannot be downloaded during generation or after an error. Existing incomplete-preview and export-readiness rules remain intact.

### Verification and remaining differences

Rendered and visually inspected all six standard pages; rechecked the cover and warranty after spacing refinements. Standard, customized, incomplete and long-input samples each generate exactly six Letter pages. Automated checks also cover a missing-rope draft and explicitly rejected overflow. Independent pypdf extraction verifies expected customer/project fields, technical values, all twelve material rows, commercial values and complete contractual text in all four sample PDFs.

Synthetic output files are available locally at `output/pdf/altis-standard.pdf`, `altis-customized.pdf`, `altis-incomplete.pdf` and `altis-long.pdf`. Outputs and private reference-page images are Git-ignored and remain outside public assets.

This is a close reconstruction, **not a claim of pixel-perfect identity**. Times/Helvetica are retained for document text instead of redistributing the sample's Garamond/other embedded fonts; line breaks, text widths, heading widths and some paragraph density consequently differ. The cover now uses the complete approved emblem/name/tagline lockup rendered from the reference at 720 dpi (1570 × 1020 pixels), positioned at the original coordinates. Only this fixed company branding is rasterized; no quotation fields or customer information are included. Variable-length entries may use smaller text or fail with a clear layout error if they exceed the available region. The source's optional blank measurements remain blank unless entered, while owner-confirmed travel counts remain dynamic. The sample's customer identity and order values are not copied into application defaults.

The preview remains an iframe using the browser's built-in PDF viewer. Browser/platform-specific behavior still needs a manual smoke test; the completed verification here covers real generated PDFs rather than a live browser UI session. Existing large-bundle warnings remain unrelated to this layout work.

---

Reviewed 2 November 2026. Scope: appearance and structure, not exact typeface matching. No application or PDF renderer changes were made.

## Evidence

Inspected all six rendered reference pages and all six pages of a synthetic quotation produced by the current `src/pdf/AltisQuotationPdf.jsx`. Used the real resolver, template, catalogue and installed React PDF renderer. The temporary Node harness substituted asset data URIs for browser-relative URLs only; production JSX and styles were not changed. Synthetic customer data was used. Different catalogue descriptions are not classified as layout defects.

The reference has six US Letter pages, each 612 × 792 points. The synthetic output has six pages, but their heights are 545.42, 571.00, 671.70, 559.69, 450.55 and 470.71 points respectively (all 612 points wide). Thus `size="LETTER"` in source does not establish actual output geometry. The exact layout-engine cause still requires diagnosis. Browser preview/download parity needs confirmation when fixing it.

## Pending work, in implementation order

1. **Critical — fixed page geometry and containment.** Guarantee six actual 612 × 792 MediaBoxes, establish page-specific content rectangles, and reserve footer/signature space. In the current render the cover closing is cut off/covered, and lower watermarks extend beyond shorter pages. Add output assertions for geometry, not merely page count.
2. **Critical — correct cover branding.** `public/assets/logo.svg` renders as a generic PDF-information icon, not the approved Altis logo. The reference uses a round Altis emblem with company-name and tagline beneath. Recover the approved branding from the supplied reference or obtain the original asset; do not recreate the entire page as an image.
3. **High — shared watermark and margins.** Match watermark scale, centering, opacity/colour and page position after geometry is fixed. Current text blocks, heading positions and footer anchors differ across all pages. Do not tune around the current shortened page heights.
4. **High — cover composition.** Match the green strip's inset, width and colour; logo/company block; reference/date baseline; address block; attention and subject spacing; paragraph indents and spacing; left-aligned closing and authorized-signatory space. Current signatory is at the right, unlike the sample. Recreate the yellow footer's inset, four cells and deliberate contact-line breaks; current footer reaches the page edge and wraps/hyphenates differently. Format the displayed date like the reference rather than ISO text.
5. **High — installation table.** Match horizontal margins, heading-to-table gap, roughly 38/62 label/value split, row heights and blank measurement-row space. Sample power-supply entries occupy a grouped block with no full-width dividing row between them; current output splits them into independent rows. Match the additional-features heading gap and safety/face-plate table dimensions. All labels currently receive uniform bold styling, unlike the reference.
6. **High — price schedule.** Restore the reference's vertical placement, first-line indent and paragraph spacing; underlined commercial/payment headings; aligned label/colon/value columns; prominent price line; and aligned acceptance fields. The rendered price lacks the sample's visible `Rs.` prefix and `/-` suffix. Format the existing resolved amount for presentation without changing calculations. Keep blank signature spaces and all current dynamic values.
7. **High — warranty layout.** Match paragraph widths, first-line indents, section spacing and hierarchy. The cancellation heading is centred and underlined in the sample, but left-aligned in the current renderer. Restore this styling without changing any contractual text.
8. **High — material schedule.** Spread all twelve entries over the reference's full vertical area, align colons in one column, and match label weight and wrapping. Current fixed 14-point row margins compress the schedule. Render sample-style list markers for cabin/doors as presentation, without adding them to canonical material strings. Preserve blank Auto Rescue Device treatment.
9. **High — obligations structure.** Match hanging indents, bullet appearance and line spacing, and the underlined customer heading. The final general-cooperation sentence is a separate unbulleted paragraph in the sample; the current template array makes the renderer display it as another bullet. Fix presentation grouping while retaining its exact approved wording.
10. **Important — acceptance testing.** Once the common geometry is fixed, compare six equal-scale rendered page pairs or overlays. Test standard, customized, incomplete, and longest-supported inputs. Assert page sizes/counts, required text presence, branding, footer clearance and no clipping. No new layout should claim visual acceptance on passing unit tests alone.

## Boundaries

Variable customer details, selected configuration, owner-confirmed Altis travel-count convention, prices, taxes and overrides must remain dynamic; copying the sample's order values is not visual fidelity. Keep the existing quotation resolver and schema, approved contract wording and private-source exclusions. No catalogue changes are needed.

Poppler reported missing Symbol/ArialUnicode display fonts while rendering. Exact font/bullet comparison is therefore limited, but geometry, branding, alignment and structural differences above were directly observed. The synthetic Node render is not a browser smoke test.
