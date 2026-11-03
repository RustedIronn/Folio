# Employee quotation workspace

Quotation data stays schema **v4**. Authentication/persistence wrap the existing domain model; the approved 49-record catalogue, quotation resolver, commercial defaults, and six-page PDF renderer are unchanged.

## Access

- Visitors can use all five entry/review sections, select approved configurations, and customize quotation values. Their data is saved locally, not sent to Firestore.
- As confirmed by the owner, **all verified Firebase accounts count as authorized employees**. There is no domain restriction or approval list.
- An employee session is required for cloud draft access, shared lift models, and PDF rendering. Final download also requires the original resolver readiness checks. Incomplete employee previews remain available.
- Sign-in is available globally in the header, storage bar and PDF gate; the same account panel is reused by model creation. Model-loading errors are separate from authentication and do not revoke an otherwise valid session.
- The PDF engine remains client-side. These are application workflow gates, not a server-issued document or DRM system. No PDF backend was introduced.

## Local data and guest import

| Location | Purpose |
| --- | --- |
| `quoteflow:guest-workspace:v1` | Current guest quotation and stable draft/mutation identities |
| `quoteflow:employee-workspace:v1:<uid>` | That employee's active draft and recoverable local draft copies |
| Legacy `quoteflow:draft:v4`, v3, v2, v1 | Imported through existing migrations when no guest workspace exists |

Legacy unscoped drafts are treated as visitor data; no previous employee owner is guessed. Account caches never write quotation data into the guest key. Local caches are browser storage, not encrypted vaults; logout hides employee data from the UI but retains the employee cache for offline recovery.

After sign-in, non-empty guest data becomes a **separate** employee draft with a stable UUID. No field-level merge into an existing cloud quotation occurs. Existing employee cloud/local drafts remain available in **Saved quotations**. The import identity is reused on retries and reloads; it does not create a new quotation on every login.

The original guest copy is cleared only after successful cloud acknowledgement, and only if it has not changed since import. Employee edits made after signing in never flow back into visitor mode. A pending import or save remains in the UID-owned cache when offline. If a new guest import takes priority over an older pending employee draft, that draft remains selectable with a pending/local-only label and resumes syncing when opened.

Unreadable local workspace data is backed up under the same namespace with a `:recovery:<uuid>` suffix before replacement. If backup or storage fails, the UI reports the failure and keeps the working quotation in memory instead of claiming it is saved.

## Cloud representation

Path: `users/{uid}/quotationDrafts/{uuid}`. This is separate from the shared `liftModels` collection.

Each document contains exactly:

- `schemaVersion: 4` and the unchanged `quotation` object;
- `ownerUid`, matching the parent UID;
- positive integer `revision` and UUID `lastMutationId`;
- server-assigned `createdAt` and `updatedAt` timestamps.

Drafts may be incomplete or contain user inputs requiring correction; business validation remains the resolver's responsibility. Cloud storage checks structure and a 500 KB client payload limit, not engineering assumptions or export completeness.

Firestore rules require a verified account whose UID matches the path. They prohibit cross-user reads/writes, forged owners, unknown wrapper fields, malformed quotation containers, deletion, creation-time changes, and updates that do not increment the revision by exactly one. Shared models remain independently append-only.

## Autosave, restoration and conflicts

- Local backup happens on each edit; cloud autosave is debounced by 800 ms for the active quotation.
- Cloud transactions compare the loaded revision. A stable mutation UUID makes a retry after a lost response idempotent.
- Edits made while a save is in flight are retained and saved at the next revision. Late responses from a previous user or draft cannot replace the current workspace.
- A new device with no guest input or local employee draft opens the latest private cloud quotation. Existing local pending work takes precedence and is reconciled safely.
- Network/backend failures keep pending local edits, show an accurate cloud error, and offer retry. Browser focus/online events also refresh/retry; no offline Firestore write queue silently overwrites remote data.
- If another device saved a newer revision, autosave pauses. **Save my version as a copy** creates a new document. **Use cloud version** keeps the local edits as another recoverable local draft before opening the latest remote version. There is no blind overwrite action.
- Switching saved quotations preserves pending edits in the account cache. Reset starts a new quotation and retains employee cloud/local drafts; it does not delete saved work. Guest reset clears the current visitor draft.
- Logout immediately removes protected PDF UI and masks the employee quotation, then restores the independent guest workspace. Logging into a different account cannot expose the previous employee's data.

## Verification and release

Unit tests cover lossless guest import, old draft migration, autosave/debounce, lost acknowledgements, in-flight edits, offline recovery, two-device conflicts, copy/cloud recovery, logout and account isolation, storage failures, malformed cloud documents, wrong-owner access, and PDF authorization.

Browser regression uses synthetic intercepted Firebase responses to exercise guest-to-login continuity alongside an existing cloud draft, a real six-page PDF download, cross-device restoration/conflicts, logout/login, different-account isolation and unverified-user blocking. This does not claim live production writes or validation of unpublished rules.

Verification on 3 November 2026: **84 tests passed with no skips** through `npm run test:emulators`, using the real local Firestore emulator. Ordinary `npm test` passes 76 tests and explicitly skips the emulator parent when no emulator is running. Catalogue validation confirmed all 49 records; lint and production build passed. Browser checks also reopened both saved versions through the custom picker and checked 390px/1024px layouts. Cross-device testing found and fixed stale saved-picker metadata after conflict recovery; a further regression verifies focus refresh waits for an in-flight save acknowledgement. Existing Vite bundle-size warnings remain.

`tests/firestore-rules.test.mjs` contains emulator tests for anonymous/unverified/other-owner denial, verified owner create/read, stale revisions, immutable metadata, malformed/forged payloads and shared-model separation. It also verifies that a newly verified personal-email account needs no employee approval. Install Java 21+ and run `npm ci`, then `npm run test:rules` starts the pinned Firebase CLI's emulator against the isolated `demo-quoteflow` project. `npm run test:emulators` runs the complete suite in that environment. An existing `FIRESTORE_EMULATOR_HOST` can be used with `test:rules`. No production credentials or permissive rules are required.

The expanded rules and application were **deployed on 3 November 2026** to the existing Firebase and Vercel projects. Rules publication, the four Vercel environment variables, and authenticated live acceptance passed, including guest import, cross-device saves/restoration, conflicts, account isolation and a real six-page PDF download from production. See [release readiness](release-readiness-2026-11-03.md) for the full distinction between simulated, emulator and production checks. No service-account key, new Firebase project, hosting change, or quotation-data import was required.
