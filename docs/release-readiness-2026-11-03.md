# Firebase release readiness — 3 November 2026

## Release status

Local release checks pass. **The Firebase workspace has not been deployed or pushed.** Firebase CLI and Vercel CLI are both logged out. Publishing the main branch could trigger Vercel before its Firebase variables and the new private-draft rules are configured, so the push remains gated on external access and authenticated live verification.

Authorization is unchanged: **every verified Firebase account is authorized**, including personal-email registrations. There is no approval list or domain restriction. Guests retain local entry; cloud drafts, shared models and PDF rendering require verification, with the existing final-export completeness checks retained.

## Reproducible local verification

Use Node 22.12+ (verified with Node 24.18), `npm ci`, and Java 21+. The Firebase CLI is a locked development dependency. The local release machine uses checksum-verified portable Temurin 21.0.13 outside the repository; other machines should set `JAVA_HOME` or put Java on PATH.

| Check | Result |
| --- | --- |
| `npm run test:rules` | 8 passed, 0 skipped, real local Firestore emulator |
| `npm run test:emulators` | 84 passed, 0 skipped, full suite with security rules |
| `npm test` | 76 passed; emulator parent explicitly skipped when run outside the emulator |
| `npm run catalogue:check` | 49 approved records match the authoritative workbook |
| `npm run lint` / `npm run build` | Passed; existing large-chunk warnings remain |
| PDF sample render + independent Python verification | Standard, customized, incomplete and long synthetic quotations: each exactly six 612 × 792 pages; branding, dynamic text, contract text and signature footers verified |

Rules tests use `demo-quoteflow`, never the live project. They check owner-only drafts; anonymous/unverified/cross-account denial; malformed documents, forged authors and stale revisions; immutable creation metadata; append-only shared models; and verified access without employee approval. Expected permission-denied log messages are assertions of denied operations.

The existing browser acceptance used the real frontend, Firebase SDK and PDF engine with **intercepted synthetic Firebase responses**. It covered guest import without overwriting a saved quotation, autosave, restoration, conflict recovery, logout/login, account isolation, incomplete preview, final-download gating and a six-page download. These are simulated backend checks, not successful production writes.

## Actual live checks

- Existing production URL: <https://quote-flow-azure.vercel.app> responds HTTP 200. This is the existing release, not the pending Firebase workspace.
- Firebase's public configuration endpoint responds HTTP 200 and includes the production hostname in authorized domains.
- An anonymous live shared-model read returns HTTP 403 / `PERMISSION_DENIED`.
- A synthetic nonexistent-account sign-in returns `INVALID_LOGIN_CREDENTIALS`. No account, verification email or document was created.
- Requests for the two private historical workbook paths and reference PDF path return HTTP 404 on the existing deployment.
- **Not yet verified live:** successful verified sign-in, shared-model creation, private quotation autosave/restoration, positive two-account isolation, or the final employee PDF flow on the new production build.

## Required external access

Run these locally with accounts that can access the existing projects, then resume the release:

```powershell
cd D:\Projects\QuoteFlow
npx --no-install firebase login
npx --yes vercel login
```

Do not send passwords, refresh tokens or service-account keys in chat. No new Firebase/Vercel project is needed.

After access is available, complete in order:

1. Confirm the Firebase project is `quoteflow-f51b6` and publish only verified rules with `npx --no-install firebase deploy --only firestore:rules --project quoteflow-f51b6`.
2. Link the CLI to the **existing** Vercel project owning `quote-flow-azure.vercel.app`; check the Git repository linkage before changing anything.
3. Configure `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_APP_ID` from the existing public web configuration for the applicable build environments. Remove obsolete `VITE_SUPABASE_*` settings after inspecting their names. Never add Admin/service-account secrets to Vite variables.
4. Use synthetic verified test accounts to exercise live shared-model creation, private draft autosave, a fresh browser/device restoration, a second account's denied access, conflict handling and the six-page PDF. Use uniquely labelled test records and do not delete unrelated data or weaken append-only rules for cleanup.
5. Review the final commit, push `main` to the existing origin, observe the existing Vercel integration, and verify the actual deployed URL, built Firebase configuration and employee workflow. Do not substitute a temporary/new deployment project.

## Privacy and dependency assessment

- `.env.local`, Firebase/Vercel local state, customer PDF references, historical workbooks and generated PDFs remain ignored. The 49-record approved catalogue and its original non-customer source workbook are retained. `.vercelignore` also excludes source documents and local outputs from CLI uploads.
- No service-account credential is included. Supabase SQL remains historical documentation only; the runtime uses Firebase. Existing local rollback configuration is not deleted.
- `npm audit fix --ignore-scripts` applied compatible updates, without force or major-version downgrades. The subsequent audit still reports **27 advisory entries: 6 high and 21 moderate**, no critical entries. These counts include propagated package advisories, not 27 independent vulnerabilities.
- High entries involve Node-side Firebase gRPC/rules-testing dependencies and the development-only SheetJS converter. The browser imports only App/Auth/Firestore Lite, and no gRPC/HTTP2/TLS Node markers were found in the built JavaScript. SheetJS is used only for the trusted local workbook, not web uploads. Tooling advisories require maintenance; do not interpret passing functional/security-rule checks as a vulnerability-free dependency tree.
- The PDF bundle remains large and lazy-loaded. No catalogue, schema version, commercial defaults or approved PDF renderer/content were rewritten for release preparation.
