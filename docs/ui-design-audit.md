# QuoteFlow UI/UX & design-system audit

**Scope:** employee frontend only. Reviewed the live local app at 1440px desktop, 1024px tablet, and 390px mobile; navigated Customer, Lift & installation, Materials, Commercial terms, and Review & PDF. A draft PDF preview was opened. No quotation data was entered or changed.

## Executive assessment

The forest-green rail, porcelain workspace, and editorial headings create a credible premium direction. The product does **not yet behave like one cohesive visual system**: action controls have three unrelated visual languages, the primary commercial entry is visually weak, and the Review & PDF screen wastes its most valuable space. The next pass should establish a small control system before any further page-level styling.

## Observed findings

### Workflow shell and navigation

| Severity | Finding | Evidence / reference | Recommendation |
| --- | --- | --- | --- |
| Medium | The page title and section title repeat the same step name (`Customer`, `Lift & installation`, etc.), consuming valuable vertical space before every form. | `src/app/App.jsx`, `src/app/components/WorkflowSection.jsx`; observed on all desktop screens. | Retain the large workspace title *or* make the inner heading a compact section label—not both at equal editorial weight. |
| Medium | The desktop summary repeats the reference already shown in the header and, in review mode, still reserves a right column even when the PDF needs width. | `WorkspaceSummary.jsx`, `.workspace-content-review`; observed in Review & PDF. | Make the summary contextual (only data not already visible) and move it above/below the review canvas or collapse it in review mode. |
| Medium | At tablet width, the two-column Lift search/filter area truncates the search placeholder and leaves a narrow editing measure. | `LiftStep.jsx`, tablet live capture. | Collapse the context summary or switch the search/filter pair to one column before 820px. |
| Medium | Mobile direct navigation exposes only numbered steps. It is compact and all five controls render, but sighted users cannot identify a destination from `01`–`05` alone. | `.sidebar-nav` mobile rules; 390px live capture. | Keep the compact numbers, but add a visible current-step name or an accessible compact label/tooltip for each destination. |

### Buttons and actions — priority system gap

| Severity | Finding | Evidence / reference | Recommendation |
| --- | --- | --- |
| High | There is no coherent button system. Primary buttons are solid green rectangles, quiet buttons are thin outlines, and repeated row actions are tiny gold underlined links. Their height, emphasis, padding, and purpose vary by location. | `.button`, `.button-quiet`, `.text-button`, `.sidebar-reset`; observed in Commercial, Materials, and Review. | Introduce a reusable `Button` primitive: **primary**, **secondary outline**, **tertiary text**, **danger text**, and **compact row action** variants with shared height, type scale, focus, disabled, and loading rules. |
| High | Review renders both `Back` and `Back to commercial terms` side by side. They navigate to the same prior step but look like separate choices. | `WorkflowSection.jsx`; observed beneath the PDF preview. | Render one back action for Review & PDF. |
| High | Materials uses many low-contrast, small `Edit` / `Adjust lift specification` links. Repeated far-right actions make the material schedule visually noisy and difficult to scan. | `MaterialsStep.jsx`; observed throughout Materials. | Use one compact action affordance per row (for example, `Edit` with a consistent compact-button treatment), and reserve a distinct linked action only for cross-step navigation. |
| Medium | `Reset quotation` is visually identical to ordinary tertiary links and has a small hit area, especially on mobile. | `.sidebar-reset`; observed in the sidebar/mobile header. | Give destructive actions a dedicated danger-text variant with a 40–44px target and confirmation context. |
| Medium | Download’s disabled/loading state has no shared visual treatment. | `PdfPreview.jsx` uses a disabled button; no `.button:disabled` rule. | Define disabled opacity, cursor, focus behavior, and an inline loading treatment in the button primitive. |

### Forms and controls

| Severity | Finding | Evidence / reference | Recommendation |
| --- | --- | --- |
| High | The blank Quotation price input is difficult to distinguish from the adjacent `Enter price` display. The display gets the large editorial treatment while the revenue-entry control is only an empty underline. | `CommercialStep.jsx`; live Commercial terms capture. | Make the actual price field the visual focal point: currency prefix, clear placeholder, stronger input boundary, and place the formatted amount as subordinate feedback. |
| High | Underline-only empty inputs provide too little affordance for dense operational entry, particularly number fields and large blank areas. | Customer and Lift live captures. | Keep the architectural restraint but increase input hit area/contrast with a subtle field surface or stronger baseline; reserve pure underlines for short, secondary data. |
| Medium | Native select affordances and date/number controls remain visually inconsistent with the otherwise bespoke interface. | Customer/Lift live captures. | Normalize select appearance, caret placement, number controls, and date icon treatment through the field system; do not replace semantic native controls. |
| Medium | Form labels, sidebar statuses, tags, hints, and action links often render around 10–12px. This weakens premium legibility and touch confidence. | `.form-field > label`, `.tag`, sidebar text, `.field-hint`; live screens. | Set a readable minimum for operational UI copy (generally 12–13px), with compact metadata only where necessary. |
| Low | Required state is visible, but relies mostly on small gold text next to labels. | `FormField.jsx`; live Customer/Lift capture. | Pair the existing text label with a consistent required marker rhythm; keep errors as text, not color alone. |

### Materials, commercial, and review presentation

| Severity | Finding | Evidence / reference | Recommendation |
| --- | --- | --- |
| High | Review & PDF does not prioritize the document canvas enough. At desktop width, the preview occupies roughly half of the usable workspace and leaves substantial unused space to its right. | `.workspace-content-review`, `.pdf-viewer`; live PDF-area capture. | Use a dedicated full-width review layout once preview is open; put readiness/actions in a compact toolbar above it. |
| Medium | The draft PDF viewport appeared as a blank gray iframe in the headless audit browser. This may be headless PDF-viewer behavior, not a production defect. | Live preview capture; `viewerVisible: true`. | Verify in a normal interactive browser before classifying as a bug; add a deliberate loading/empty state if real browsers show the same result. |
| Medium | Review summary is comprehensive but hard to skim: two dense columns combine long technical and commercial strings with four repeated `Edit` links. | `ReviewStep.jsx`; live Review capture. | Use concise key-value summaries by default, put long text behind an expansion, and group `Edit` actions at section headers. |
| Medium | The Materials schedule looks more like a list of developer-level exceptions than a polished schedule because state tags and action links compete with values. | `MaterialsStep.jsx`; live Materials capture. | Adopt a single row anatomy: name + status, resolved value, one action; show warnings only when needed. |

### Interaction and accessibility

| Severity | Finding | Evidence / reference | Recommendation |
| --- | --- | --- |
| Medium | Disclosure controls (`Advanced lift specification adjustments`, `Additional commercial terms`) use browser-default marker styling and do not visually match the button language. | `LiftStep.jsx`, `CommercialStep.jsx`. | Create a disclosure component with a consistent chevron, target size, expanded state, and focus treatment. |
| Medium | The configuration-switch modal has dialog semantics but no visible focus-management strategy; modal action hierarchy is also not defined by the button system. | `App.jsx`, `.modal`; not triggered during the no-data audit. | On the implementation pass, add focus entry/return and apply primary/secondary/destructive modal action rules. |
| Low | Sidebar navigation, Preview, and direct workflow navigation work in the audit. Progress state correctly changes from untouched to in-progress without showing errors. | All live workflow captures. | Preserve this behavior; do not conflate a visited step with an error state. |
| Low | Keyboard focus is styled for major buttons and inputs, but focus treatment is not yet systematically documented for every interactive variant. | `.button:focus-visible`, `.text-button:focus-visible`, field focus rules. | Include focus tokens in the proposed control system and test every variant with keyboard navigation. |

## Recommended visual system

Create a small system, then apply it consistently:

1. **Tokens:** forest, porcelain, charcoal, gold, error; spacing scale; 4/8px radii only where a surface needs one; type scale with an operational minimum size.
2. **Buttons:** `primary`, `secondary`, `tertiary`, `danger`, and `compact`; each with default, hover, focus, active, disabled, and loading behavior. Use the same height and horizontal padding family.
3. **Fields:** a shared field shell for text, select, date, number, and textarea; clear empty/filled/focus/error states, semantic native controls, and stable help/error spacing.
4. **Rows and disclosures:** reusable material/action rows and disclosure headers to stop one-off link/button styling.
5. **Layouts:** editing = form + compact context; review = actions/readiness + wide document canvas. Collapse the context column earlier at tablet widths.

## Prioritized implementation plan

1. **P0 — interaction clarity:** remove the duplicate review back action; create the button variants including disabled/loading/danger states; make price entry unmistakable; give Review & PDF a wide document layout.
2. **P1 — form consistency:** standardize the field shell and native select/date/number presentation; raise compact text sizes; normalize disclosure controls and material-row actions.
3. **P2 — responsive polish:** improve tablet collapse behavior; add visible mobile navigation labels; reduce duplicated header/summary content; verify the PDF viewer in a normal non-headless browser.
4. **P3 — accessibility QA:** keyboard traversal, modal focus management, 44px touch targets, contrast checks, and a representative completed-quotation review.

## Audit boundary

No application code, styles, data, resolver, PDF source, dependencies, tests, workbook, or catalogue were changed. The report distinguishes live observations from source-only accessibility notes and the headless-only PDF-frame observation.
