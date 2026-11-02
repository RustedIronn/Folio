# Browser and PDF verification — 2 November 2026

## Implementation follow-up — four acceptance fixes completed

The original test report below is retained as a historical snapshot. Its four findings have now been addressed:

| Finding | Implementation | Browser verification |
| --- | --- | --- |
| Dialog focus restoration | `ConfirmationDialog.jsx` captures the invoking element before focus enters the controlled popup and supplies Base UI's `finalFocus` target. | Reset traps focus and returns it on Escape; configuration cancellation returns focus to the catalogue input. |
| Generic UI branding | `App.jsx`, `WorkspaceSummary.jsx`, `ReviewStep.jsx`, and the favicon now use the existing approved Altis emblem. | All images load; no visible UI image references the generic `logo.svg`. Desktop/mobile screenshots inspected. |
| Initial PDF zoom | `PdfPreview.jsx` requests `view=FitH&navpanes=0` and provides an **Open PDF** action in a separate tab. Download retains the unmodified blob URL and readiness gating. | Desktop and 390px native Edge viewer screenshots show the page fitting horizontally after viewer load; separate-tab viewing and shared blob identity pass. Fragment handling remains browser-dependent, so the separate-tab action is always available for a successful draft/final preview. |
| Dev watcher crash | `vite.config.js` excludes generated `output/` and `tmp/pdfs/` directories and descendants. | Actual browser downloads saved inside the project no longer crash the dev server; reload and the rest of the full workflow complete successfully. |

Re-ran the complete acceptance test **against the development server**, including all five sections at 1440/1024/390px. **36/36 acceptance checks now pass**, plus **six targeted checks** for these fixes. No console/page errors or failed requests occurred in the complete run. **45 automated tests**, lint, production build, catalogue validation and whitespace verification pass. No dependencies were added, and quotation business logic and PDF document contents/layout were not changed.

Updated local evidence remains in ignored `output/pdf/browser-smoke/`, including `results.json`, `edge-cases.json`, `four-fixes.json`, and `fixed-viewer-desktop.png`/`fixed-viewer-mobile.png`. Tests used installed Edge, bundled Playwright, synthetic quotations and isolated browser contexts; normal employee drafts were not accessed.

---

## Scope and environment

Tested the actual React application in installed Microsoft Edge through bundled Playwright, using isolated browser contexts and synthetic data only. No browser, dependency or system software was installed. Normal browser drafts were not accessed. Application code was not changed.

The development server initially ran on localhost:5173. It crashed when the browser test saved a PDF into the project's ignored output directory (see finding below). The complete clean run used the current production build served on localhost:5174.

Screenshots and the real browser-downloaded PDF are in the Git-ignored local `output/pdf/browser-smoke/` directory. Temporary test scripts are in ignored `tmp/pdfs/`. No private historical workbook records were used.

## Results

- **35 of 36 browser checks passed.** The sole failed check is reset-dialog focus restoration; trapping and dismissal work.
- **45 automated tests passed**, including catalogue, domain, draft migration, overrides and actual PDF rendering.
- Lint, catalogue validation (49 records), build and Git whitespace checks pass. Existing bundle-size/baseline-mapping warnings remain.
- The completed production browser run recorded **no page errors, console errors or failed requests**. Expected PDF overflow in the separate edge-case test is handled visibly.

### Verified in the browser

1. Untouched forms do not show validation errors immediately.
2. Incomplete quotations render a PDF preview without enabling final download.
3. Readiness issues navigate to and focus the relevant input.
4. Customer fields compose the reference and subject; date entry suggests the financial year.
5. Catalogue search returns results/empty states, keyboard selection works, and outside-click/Escape dismiss the popup.
6. Capacity presets populate both numeric values; four upper floors produce Altis travel count five.
7. Structured dimensions and custom measurement text survive mode switching.
8. Technical overrides, restoration and configuration-switch confirmation retain the intended values.
9. Controller overrides propagate into materials. Cabin preset, custom entry and restoration work.
10. Record 16's missing rope prevents download until explicitly supplied for the quotation; no arbitrary rope is inserted.
11. Price feedback, 100% tax wording and custom tax text work.
12. Incorrect payment totals block download, and correcting the total restores readiness.
13. The completed preview and download use the identical blob URL. A real download starts with the sanitized reference-based filename.
14. Reload restores entered values and commercial choices from the versioned draft.
15. All five sections have no document-level horizontal overflow at **1440, 1024 and 390 pixels**. Screenshots were inspected at representative desktop/tablet/mobile sizes.
16. Mobile select popup stays within the viewport and closes on Escape.
17. Reset cancellation retains data; explicit confirmation clears the draft.
18. A PDF layout error removes the previous downloadable blob and displays an error. Correcting the entry regenerates the document successfully.
19. Simulated localStorage quota failure displays “Unable to save changes.”

### Actual browser-downloaded PDF

File: `output/pdf/browser-smoke/AE-QUO-TEST-2026-VJA-2026-27.pdf` (synthetic).

Independent pypdf inspection confirms six pages, each **612 × 792 points**, correct branding images, reference/recipient, entered price, tax choice, controller override, rope specification, and warranty/obligations sections. This is a browser-produced download, not just a Node-rendered sample. The native Edge PDF viewer visibly renders the document.

## Findings requiring follow-up

| Priority | Finding | Evidence / suggested change |
| --- | --- | --- |
| Medium | Reset confirmation does not return keyboard focus to its originating button after Escape. | Focus remains elsewhere after the modal closes. `src/app/components/ConfirmationDialog.jsx` uses a controlled Base UI Dialog without an explicit trigger/final-focus target. Retain the invoking element and restore focus. Focus trapping itself passed. |
| Medium | Application branding still shows a generic PDF-information icon. | Visible in desktop/mobile navigation, the live cover-letter summary, and the pre-preview placeholder. `App.jsx`, `WorkspaceSummary.jsx`, and `ReviewStep.jsx` still reference `/assets/logo.svg`. The generated PDF uses the approved branding correctly. Reuse the existing approved emblem/lockup in those UI locations. |
| Medium (development tooling) | Vite's development watcher can crash when a downloaded PDF is written inside the repository. | Reproduced `EBUSY: resource busy or locked, watch ...output/pdf/browser-smoke/...pdf` immediately after the browser saved the test download. Git-ignored outputs are not excluded by the current `vite.config.js` watcher configuration. Exclude generated PDF/test-output directories from watching, or save test downloads outside the project. This did not occur against the production preview server. |
| Low / browser-dependent | Embedded PDF may initially appear at an unsuitable zoom and require horizontal scrolling. | Edge renders the PDF at a scale wider than the desktop review pane. The outer webpage has no horizontal overflow and the downloaded page geometry is correct. Consider a fit-to-width/open-separately affordance; verify any viewer fragment support per browser. |

The static source-data warning for record 16 remains visible even after supplying a quotation override. It correctly describes the original source, but could explain that the current quotation has resolved the missing value more clearly.

No fixes, commits or pushes were made as part of this test-only request. Other existing uncommitted work was preserved.
