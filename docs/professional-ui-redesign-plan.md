# QuoteFlow professional UI redesign plan

## Scope and decision

This is a design and architecture plan, not an implementation specification for quotation logic. The catalogue, schema v4, draft migration, resolver, validation semantics, approved template, and six-page PDF remain outside the redesign boundary.

The goal is a calm, compact employee workspace: Altis-specific in colour and typography, but governed by the same interaction discipline as mature desktop software. It should not imitate Linear or turn into a generic dashboard.

**Recommended foundation: `@base-ui/react`, used through a small local QuoteFlow component layer.**

Base UI is the best fit because it supplies unstyled Select, Combobox, Dialog/Alert Dialog, Popover, Collapsible, Field, and Scroll Area primitives with accessible keyboard and popup behavior. Its Combobox is explicitly intended for a filterable fixed set, accepts externally filtered items, and provides portal positioning, collision handling, focus behavior, and state data attributes. That maps directly to QuoteFlow's 49-record, locally ranked catalogue. It avoids the Tailwind/shadcn installation model and prevents this small Vite app from owning positioning and focus-trap code itself.

Use subpath imports and wrap every chosen primitive locally. Do not introduce a broad component theme or change business-state ownership. Validate React 19 compatibility from the package's current release notes before installation.

## Research used

| Reference | Applicable lesson | QuoteFlow implication |
| --- | --- | --- |
| [Linear: contextual menus](https://linear.app/now/invisible-details) | Frequent work should be fast by mouse and keyboard; command/search affordances should reduce hunting. | Prioritise dense, predictable configuration results and short action labels rather than decorative controls. |
| [Linear: board layout](https://linear.app/docs/board-layout) | View changes should not alter the underlying keyboard workflow. | Keep five-step navigation and direct access stable across desktop and mobile. |
| [shadcn/ui Combobox](https://ui.shadcn.com/docs/components/combobox) | A composed combobox has distinct input, content, empty, list, and item parts. | Treat the catalogue picker as a product feature with a search field, result list, empty state, and selected value—not a long select label. |
| [shadcn/ui Dialog](https://ui.shadcn.com/docs/components/dialog) | Dialog anatomy separates trigger, content, header, title, and description. | Keep confirmation copy, actions, and danger emphasis consistent without hand-assembling each modal. |
| [Radix Select](https://www.radix-ui.com/primitives/docs/components/select) | A select-only combobox needs predictable Arrow, Enter/Space, Escape, and label behavior. | Small office/year/salutation selections should be real select primitives, not browser menus or custom one-offs. |
| [Radix Popover](https://www.radix-ui.com/primitives/docs/components/popover) | Popup width and available height should derive from trigger and viewport collision data. | Catalogue results must be portal-rendered, trigger-width aligned, height constrained, and collision-aware. |
| [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) | Modal focus trapping, screen-reader title/description, Escape, and focus return are infrastructure concerns. | Replace custom focus-trap logic with a primitive for reset and configuration-change confirmations. |
| [React Aria ComboBox](https://react-aria.adobe.com/ComboBox) | A combobox is an input plus listbox for selecting from a filtered predefined collection. | Do not use free-text search semantics for the selected catalogue ID; selection remains constrained to approved records. |
| [Base UI Combobox](https://base-ui.com/react/components/combobox) | The primitive accepts externally filtered items, supports IDs separate from rendered records, portals, collision handling, and final-focus control. | Preserve `searchCatalogue()` exactly; pass its ranked records to the component instead of recreating matching inside the component. |
| [Base UI Select](https://base-ui.com/react/components/select) | Select exposes Trigger, Value, Portal, Positioner, Popup, List, Item, and ItemIndicator parts. | Build one local Select wrapper for short lists with a shared visual language and no native popup. |

## Confirmed current-state findings

These findings come from the current React and CSS sources. They are not visual guesses.

| Finding | Evidence | Effect | Recommendation |
| --- | --- | --- | --- |
| Popup behavior is hand-built. | `src/app/components/Select.jsx` calculates fixed positions, manages outside presses, arrow navigation, focus restoration, typeahead, and a local panel. | Important accessibility and viewport behavior is bespoke and difficult to regression-test. | Replace with Base UI wrappers; delete the custom popup/keyboard implementation after migration. |
| Popup geometry is coupled to imperative measurements. | The current `FloatingPanel` calculates coordinates and height on window events. | It has no robust clipping-ancestor model, portal contract, or primitive-owned collision/focus lifecycle. | Use `Portal` + `Positioner` with collision padding and trigger-width CSS variables. |
| The catalogue picker is split between a button trigger and a popup search input. | `LiftStep.jsx` maintains local search/filter state while `Combobox` owns separate transient active/open state. | The interaction is more complex than the field appears, and selected/current-query behavior is easy to desynchronise. | One controlled Base UI Combobox wrapper: source records + externally filtered records + selected source ID. |
| CSS is a monolith with successive phase overrides. | `src/app/App.css` contains base rules followed by Step 4E, 4F/4G, 5B/5C, and 6A blocks; many selectors are broad, compressed, and repeated. | Visual tuning is order-dependent and makes consistency difficult. | Split into tokens, primitives, workspace, and feature styles; remove obsolete selectors only after component migration. |
| Form field semantics are only partly connected. | `FormField.jsx` renders labels, hints, and errors, but helper/error text has no generated IDs or `aria-describedby` relationship. | Assistive technology does not reliably announce operational guidance and validation alongside the control. | Make Field the required composition boundary with label, description, error, and control slots. |
| Screen sections retain large, undifferentiated form grids. | Customer, Lift, and Commercial steps mostly use a generic `form-grid`; Materials is a dense repeated row structure. | The employee sees fields before hierarchy and decision points. | Create structured section headers, compact groups, and one obvious primary task per screen. |
| Existing controls use multiple presentation models. | Native input styling, bespoke Select controls, bespoke Button controls, `details/summary`, and custom modal code coexist. | Controls read as separately styled HTML rather than one system. | Route visible interaction patterns through a compact local component inventory. |

### Items requiring visual verification

The source confirms the structural risks above, but these must be checked in a normal browser before accepting a redesign:

- Exact current popup clipping, overlap, contrast, and white-on-white option rendering at 1440px, 1024px, and 390px.
- Whether the sticky mobile action bar obscures a focused field after virtual-keyboard resize.
- Real date-picker appearance across target browsers and operating systems.
- PDF viewer height and scroll nesting around an open combobox or dialog.
- Actual font availability; `Iowan Old Style`/Baskerville fallbacks may render differently by platform.

## Component foundation and boundaries

### Adopt

Create these local wrappers around Base UI. They own markup, Altis classes, and accessibility configuration; application screens never import Base UI directly.

| Local component | Base UI primitive | Purpose |
| --- | --- | --- |
| `ui/Field` | Field primitives plus native inputs | Label, optional description, error, required marker, and `aria-describedby` wiring. |
| `ui/Button` | Native button retained | Existing variants restyled against tokens; no need for a dependency here. |
| `ui/Select` | Select | Short predefined lists: office code, financial year, salutation, subject mode, floor mode, measurement mode, lift category. |
| `ui/Combobox` | Combobox | Catalogue configuration selection only. Supports the existing ranked records as externally filtered items. |
| `ui/Dialog` | Dialog / Alert Dialog | Configuration switch, reset, and future non-destructive information dialogs. |
| `ui/Disclosure` | Collapsible | Advanced technical overrides and additional commercial terms. |
| `ui/ScrollArea` | Scroll Area only where needed | Catalogue result viewport and PDF-adjacent panels; do not add nested scrolling to ordinary forms. |

### Retain

- `Button.jsx` concept and current primary/secondary/tertiary/danger hierarchy, but rebuild its CSS from tokens.
- `WorkspaceSummary.jsx`, the five-step workflow, local draft feedback, current `WorkflowSection`, and review/PDF lazy loading.
- Native text, number, textarea, and date inputs. They are semantic, low-risk, and can look consistent with tokens. Keep the native date popup unless a future business requirement needs a fully custom date workflow.
- Existing `searchCatalogue`, document resolver, and catalogue-selection confirmation workflow.

### Replace or simplify

- Replace `src/app/components/Select.jsx` and `selectNavigation.js`; do not continue maintaining a hand-built listbox, positioning, or focus return implementation.
- Replace `ConfirmationDialog.jsx` with one dialog wrapper built on a primitive. Use Alert Dialog for destructive reset; standard Dialog for configuration replacement.
- Replace raw `details/summary` presentation with a local Disclosure only when the primitive materially improves state, focus, and animation. Do not add accordions merely for decoration.
- Remove broad `input, select, textarea` CSS selectors and phase-labelled override blocks after their component equivalents are in place.
- Do not introduce a global Card component. Most current bordered boxes should become simple groups separated by spacing and one-pixel rules.

## Design tokens

Define tokens in one source before screen work. Values below are implementation targets, not a request to alter branding.

```css
:root {
  --font-ui: Inter, ui-sans-serif, system-ui, sans-serif;
  --font-editorial: Iowan Old Style, Baskerville, Georgia, serif;

  --ink-strong: #17211b;
  --ink: #2e3831;
  --ink-muted: #687169;
  --forest-900: #092f1e;
  --forest-700: #0e5131;
  --forest-100: #e8f0e8;
  --porcelain: #f6f3ec;
  --surface: #fffdf8;
  --surface-subtle: #f0ece2;
  --line: #d8d5ca;
  --gold: #b78b45;
  --gold-soft: #f3ead8;
  --danger: #9a443b;
  --danger-soft: #f8e7e2;
  --focus: #b78b45;

  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-5: 24px; --space-6: 32px; --space-7: 48px;
  --radius-control: 6px; --radius-surface: 10px;
  --control-compact: 36px; --control: 44px; --control-emphasis: 52px;
}
```

### Type, spacing, and surfaces

- Use `--font-ui` for all controls, metadata, navigation, labels, and data; reserve editorial type for page title and one section title level.
- Type scale: 12px metadata, 13px label/helper, 14px body/control, 16px section title, 28–32px workspace title. Avoid multiple all-caps treatments on one screen.
- Use the 4/8px scale. Default field-group gap is 24px; related fields use 16px; a workflow section begins with 32px after its heading.
- Porcelain is the canvas, white is a selected or elevated surface, and a rule—not a card border—separates ordinary groups. Shadows belong only to popup surfaces and dialogs.
- Use 6px control radii and 10px only for dialogs/major preview surfaces. Avoid pill controls except status indicators.

### Button hierarchy

| Variant | Use | Visual rule |
| --- | --- | --- |
| Primary | Continue, Preview quotation, final positive confirmation | Forest fill, white label, 44px minimum height. One primary action per local action group. |
| Secondary | Review missing details, keep customizations | Surface fill, forest border/text. |
| Quiet | Edit, restore, close, clear filter | Text/icon treatment; never compete with a primary. |
| Danger | Reset quotation and destructive confirmation only | Red text/border; filled red only in the final destructive modal action. |

All buttons use the same focus ring, disabled opacity, pressed offset, 150–180ms state transition, and 44px minimum target on touch layouts.

### Field and validation system

- Default controls are 44px high, 14px text, 12px horizontal padding, `--surface` background, and `--line` border.
- Focus uses forest border plus a 3px gold-alpha ring; hover only darkens the border slightly. Never use gold as a default input border.
- Labels are sentence case, 13px medium weight; required state is conveyed by a consistent subtle marker, not repeated “Required” text inside every label.
- Help text is 12–13px muted and appears only for operationally non-obvious fields. Error text is 12–13px, directly below the control, with a matching error border. Invalid state must not depend on colour alone.
- Read-only/resolved values are shown as text rows or a distinct muted surface, never inputs that look editable.

### Select and combobox behavior

- **Select:** trigger matches input height; popup is portal-rendered, exactly trigger width unless it would exceed viewport, 8px offset, max available viewport height, internal scroll, 40–44px items, visible selected check, and state data attributes for styling.
- **Catalogue Combobox:** one input-like trigger with selected label; opening focuses its search input. Each result has: source ID and category in a small metadata row, detailed configuration as the primary line, and up to three verified characteristics as secondary text. Limit viewport to roughly 8–10 rows. Empty results explain that only approved configurations can be selected.
- Use `searchCatalogue(records, { search, liftType })` for visible items. The component receives `catalogueId` as its selected value and never attempts fuzzy aliases or capacity inference.
- Keyboard: Arrow keys move highlight, Home/End jump, Enter selects, Escape closes/restores trigger focus, typed input filters, and scrolling follows highlighted item. On touch, the popup is a near-full-width surface with 44px rows.

### Dialogs, disclosures, and feedback

- Dialog overlay: neutral black/forest 45–55% opacity; dialog width 480–560px desktop, bottom-aligned sheet only below 540px.
- Destructive reset uses Alert Dialog and makes Cancel the initial focused action. Configuration replacement uses Dialog with a short impact summary and clearly ordered choices.
- Disclosures are full-width rule-separated rows with chevron, title, one-line summary, and an explicit expanded state. Do not hide required information inside one.
- Draft-save status is a small live region in the sidebar/header, not a badge or a competing action.

## Screen-level redesign

### Shared workspace

- Retain the dark forest sidebar on desktop, but reduce its visual weight: one brand block, compact workflow nav, one progress line, and a quiet draft status.
- Main content has a 760–840px editor column. The contextual summary is a 260px text-only rail above 1180px and collapses before controls become constrained.
- Page header shows step number, title, and one concise purpose sentence. Do not repeat the reference in both header and summary.
- Use an action footer only for Back/Continue; it must not duplicate preview/download actions.

### 1. Customer

- Split into **Reference** and **Recipient & project** groups rather than one uninterrupted grid.
- Put quotation number, office, date, and financial year in one compact line on desktop. Show composed reference beneath it as text, not a bordered strip.
- Address is the only wide field. Recipient/salutation/project location follow in a short two-column group. Subject becomes a quiet radio/select choice with its composed preview directly below.

### 2. Lift & installation

- Make configuration selection the first dedicated surface, not one field among many. It includes category Select, catalogue Combobox, result count, and a selection summary after choose.
- The result row format is: `#ID · Lift category` metadata, description title, verified speed/door/frame detail. Do not place all metadata in one long label.
- On selection, show a compact **standard specification** summary with source row only in a disclosure or secondary detail—not in the employee's primary path.
- Group project-entered content into **Capacity & travel**, **Floors & landings**, and **Dimensions**. Keep unusual/custom dimensions behind the measurement-mode Select, preserving stored wording exactly.
- Advanced overrides remain a disclosure. Each row should show field label, resolved standard, customised state, and one Restore action; it should not expose internal resolver vocabulary.

### 3. Materials

- Replace the apparent wall of twelve form rows with a compact schedule: material name, resolved value, source/status, one quiet action.
- Editing expands only the active row inline; opening one closes the prior row. Technical-backed rows link to the applicable lift override rather than presenting an unrelated material editor.
- Optional Auto Rescue Device is visually de-emphasised but never presented as an error when blank.

### 4. Commercial terms

- Keep price as the visual anchor: one large INR field, formatted value, and amount-in-words beside/below it as read-only confirmation.
- Place tax, delivery, and payment schedule in a clear operational group. Use compact percentage fields with the total displayed once.
- Move packing, transport, and guarantee into a disclosure only after the main commercial essentials. Do not convert approved default wording into tags or editable-looking metadata.

### 5. Review & PDF

- Preserve the full-width document-first layout. Above the viewer, use a short readiness strip: missing count plus one primary Preview action and a gated Download action.
- If incomplete, show grouped issue links before summary content. Each link takes focus to the relevant field; do not repeat “Not provided” throughout the review.
- Keep review summary sections compact and editable. The PDF viewer should be the visually dominant element, with no contextual rail.

## Staged implementation plan

1. **Baseline and visual acceptance setup** — Capture desktop/tablet/mobile reference screenshots in an existing browser, list every existing interaction, and agree test cases for select, combobox, dialog, disclosure, and sticky actions. No visual redesign before this baseline exists.
2. **Foundation** — Add Base UI only; create local Field, Button, Select, Combobox, Dialog, and Disclosure wrappers; introduce tokens and split the monolithic CSS. Keep screens on existing HTML controls until wrappers are tested.
3. **Interaction migration** — Replace custom `Select.jsx`, `selectNavigation.js`, and `ConfirmationDialog.jsx`. Migrate all short lists, then the catalogue combobox. Test keyboard, focus restoration, collision, scroll containment, and configuration-switch preservation with synthetic drafts.
4. **Screen composition** — Recompose Customer, Lift, Materials, Commercial, and Review around the approved group hierarchy. Preserve every model path and resolver-derived display value; do not change PDF or commercial semantics.
5. **Responsive and acceptance pass** — Check 1440px, 1024px, and 390px; open every popup; test keyboard-only operation, errors, modal trapping, touch targets, draft restore, incomplete preview, and export gating. Remove superseded CSS only after parity checks pass.

## Explicit non-goals

- No new catalogue fields, model capacity inference, aliases, backend, authentication, PDF rewrite, or spreadsheet import.
- No Tailwind migration, shadcn CLI scaffold, or wholesale copy of another product's visual system.
- No broad card-heavy dashboard design or decorative animation layer.

## Acceptance criteria for the later implementation

- No browser-native `<select>` popup remains in the employee workflow.
- The catalogue combobox has deterministic keyboard operation, portal positioning, constrained scrolling, readable multi-line results, and uses only approved catalogue records.
- All dialog/disclosure interactions have library-owned focus and Escape behavior.
- Every form control derives visual and state styling from the token system.
- All five screens retain their workflow, resolver consistency, draft compatibility, validation semantics, and PDF readiness behavior.
- Visual review confirms no clipped popup, inaccessible contrast, overlap, horizontal overflow, or hidden sticky-action target at desktop, tablet, and mobile widths.
