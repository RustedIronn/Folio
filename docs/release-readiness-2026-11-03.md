# Firebase release readiness — 3 November 2026

## Release status

**The Firebase workspace is deployed to the existing production project** at <https://quote-flow-azure.vercel.app>. Workspace commits `adea767` and `481819c` were pushed to the existing GitHub `main` branch after local checks, live Firebase acceptance, rules publication and environment configuration passed. Vercel's existing integration produced production deployment `dpl_5NKqivv1dhgDsuEyxqeHG4Uh9SgA`; authenticated browser acceptance then passed at the public production URL. No project was created and no application/domain/PDF rewrite was needed.

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
| `git diff --check` | Passed, including the final release documentation |
| PDF sample render + independent Python verification | Standard, customized, incomplete and long synthetic quotations: each exactly six 612 × 792 pages; branding, dynamic text, contract text and signature footers verified |

Rules tests use `demo-quoteflow`, never the live project. They check owner-only drafts; anonymous/unverified/cross-account denial; malformed documents, forged authors and stale revisions; immutable creation metadata; append-only shared models; and verified access without employee approval. Expected permission-denied log messages are assertions of denied operations.

Earlier browser acceptance used the real frontend, Firebase SDK and PDF engine with **intercepted synthetic Firebase responses**. Those checks are separate from the subsequent live-backend acceptance below. Local checks and source inputs are unchanged by the documentation-only release record update.

## Actual live checks

- Production URL: <https://quote-flow-azure.vercel.app> serves the new Firebase workspace. The existing Vercel project is `rustediron-projects/quote-flow`, linked to `RustedIronn/QuoteFlow`, production branch `main`, Vite, Node 24.
- Firebase's public configuration endpoint responds HTTP 200 and includes the production hostname in authorized domains.
- An anonymous live shared-model read returns HTTP 403 / `PERMISSION_DENIED`.
- A synthetic nonexistent-account sign-in returns `INVALID_LOGIN_CREDENTIALS`. No account, verification email or document was created.
- Requests for the two private historical workbook paths and reference PDF path return HTTP 404 on the existing deployment.
- Published Firestore rules were fetched independently through the Rules API and match the tested local `firestore.rules` exactly.
- Four public Firebase web configuration values were set for Production, Preview and Development. A production environment pull confirmed all four match the expected local values without printing them. No Supabase deployment variables existed, so none needed removal.
- **Real Firebase acceptance passed without network interception:** normal password sign-in, lossless guest import including selected catalogue/technical overrides/material overrides/commercial values, preservation of a separate existing draft, transaction-backed autosave, independent browser-context restoration, reload/logout/login, conflict-copy recovery without overwriting the newer version, and another account's HTTP 403 on the private quotation path.
- Shared-model creation through the local employee UI succeeded against live Firestore; a second authenticated account fetched the model and found it in the deployed production picker. The model was explicitly labelled synthetic and was not added to approved catalogue JSON.
- Both local and deployed production browsers generated/downloaded a complete six-page PDF. Independent pypdf checks verified six Letter pages, branding, synthetic project text, controller/material overrides and commercial values. No browser runtime errors or horizontal overflow were observed at 390px/1024px in the acceptance flow.
- Production additionally denied PDF access to guests and unverified accounts, rendered a verified employee's incomplete six-page preview, and kept final download unavailable for that incomplete quotation. A live unverified Firestore read returned HTTP 403.
- The three synthetic accounts were provisioned using authorized administrative access (two verified, one unverified); sign-in and data access then used normal Firebase client credentials and deployed rules. **Real mailbox delivery and clicking a verification email were not tested.** No real customer data was used.
- After acceptance, administrative cleanup removed only this run's exact synthetic fixtures: five private drafts, one synthetic shared model and three synthetic accounts. No pre-existing account, model or draft was modified/deleted. The local fixture credential file and temporary verification script were removed.

## Deployment sequence completed

The owner authenticated the existing CLIs. The release used the existing Firebase and Vercel projects:

```powershell
cd D:\Projects\QuoteFlow
npx --no-install firebase deploy --only firestore:rules --project quoteflow-f51b6
npx --yes vercel link --yes --scope rustediron-projects --project quote-flow
git push origin main
```

All `VITE_FIREBASE_*` values came from the existing public web app configuration. No service-account key was created or placed in Vite variables. Rules and integration checks passed before the push; Vercel deployed through the existing Git integration rather than a temporary or replacement project.

## Privacy and dependency assessment

- `.env.local`, Firebase/Vercel local state, customer PDF references, historical workbooks and generated PDFs remain ignored. The 49-record approved catalogue and its original non-customer source workbook are retained. `.vercelignore` also excludes source documents and local outputs from CLI uploads.
- No service-account credential is included. Supabase SQL remains historical documentation only; the runtime uses Firebase. Existing local rollback configuration is not deleted.
- A Firebase login-list diagnostic unexpectedly printed session credentials in tool output. They were not copied into code, documentation, browser variables or commits. Firebase CLI was explicitly logged out after release operations to revoke that session; future Firebase CLI administration requires sign-in again. Vercel authentication was not printed or revoked.
- `npm audit fix --ignore-scripts` applied compatible updates, without force or major-version downgrades. The subsequent audit still reports **27 advisory entries: 6 high and 21 moderate**, no critical entries. These counts include propagated package advisories, not 27 independent vulnerabilities.
- High entries involve Node-side Firebase gRPC/rules-testing dependencies and the development-only SheetJS converter. The browser imports only App/Auth/Firestore Lite, and no gRPC/HTTP2/TLS Node markers were found in the built JavaScript. SheetJS is used only for the trusted local workbook, not web uploads. Tooling advisories require maintenance; do not interpret passing functional/security-rule checks as a vulnerability-free dependency tree.
- The PDF bundle remains large and lazy-loaded. No catalogue, schema version, commercial defaults or approved PDF renderer/content were rewritten for release preparation.
