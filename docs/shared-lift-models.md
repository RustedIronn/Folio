# Shared lift models — Firebase

The Lift & installation screen has an **Add model** action. Users register with their own email, confirm it, and sign in. No company domain or administrator approval is required. Every verified account can read/add shared models; existing models are append-only.

## Setup

1. Use a dedicated QuoteFlow Firebase project, independent of other applications. Register a Web app and enable Email/Password in Authentication.
2. Create the default Cloud Firestore database in production mode. Publish the exact contents of root `firestore.rules` in Firestore Database → Rules. `firebase.json` contains only the rules-file configuration; it does not configure Firebase Hosting or replace Vercel.
3. In Authentication → Settings → Authorized domains, add the existing production hostname and the local development hostname (`127.0.0.1` when using the local URL below). Review the account verification email template. Firebase sends these account emails; no separate SMTP service is required for this integration.
4. Copy `.env.example` to ignored `.env.local`, filling in the Web app configuration:

   | Environment variable | Firebase configuration property |
   | --- | --- |
   | `VITE_FIREBASE_API_KEY` | `apiKey` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
   | `VITE_FIREBASE_PROJECT_ID` | `projectId` |
   | `VITE_FIREBASE_APP_ID` | `appId` |

5. Use Node 22.12+ or Node 24. Run `npm ci` and `npm run dev`. Register, verify the email, then use **I've verified my email**. Verification can be resent without creating another account.
6. Keep the four Firebase values above configured in the existing Vercel project and rebuild after changing them. Vite embeds public configuration at build time. The Firebase workspace was released through the existing Git integration on 3 November 2026; see the release record below. No hosting migration or replacement project was needed.

Use only the Firebase Web configuration, never service-account JSON or private keys. Analytics, Messaging, Storage, and Cloud Functions are not initialized.

Official references: [Web setup](https://firebase.google.com/docs/web/setup), [email verification](https://firebase.google.com/docs/auth/web/manage-users), [authorized domains and password auth](https://firebase.google.com/docs/auth/web/password-auth), [Firestore Lite](https://firebase.google.com/docs/firestore/solutions/firestore-lite), [rules validation](https://firebase.google.com/docs/firestore/security/rules-fields), and [email quotas](https://firebase.google.com/docs/auth/limits).

## Model and quotation behavior

- Description and lift category are required. Speed, car door/protection, frame, landing door/protection, motor, controller, and rope may remain blank when unknown. Field-length checks are shared by entry validation and Firestore rules.
- Quantity, capacity/load, floors/travel, dimensions, and pricing remain quotation-specific.
- Saving requests selection through the existing configuration-switch confirmation. Cancelling a switch preserves the original quotation while leaving the saved model in the library.
- Search/ranking, technical/material overrides, approved defaults, and final PDF readiness stay unchanged.
- The selected record is saved in optional `lift.configurationSnapshot` within schema v4. Existing drafts need no migration and retain the selected values after signing out or losing connectivity.
- IDs stay `shared:<uuid>` with null workbook rows. The 49 Excel records and source JSON are unchanged.
- **Refresh models**, or returning focus to the browser window, fetches additions from other employees. Firestore Lite deliberately uses server reads and transactions without realtime listeners or an offline write queue.
- Firebase Auth persists its browser session separately from quotation drafts. Reset quotation does not sign out or delete models. Sign out preserves the current quotation.
- Authentication is now shared across the entire application. Employee quotations sync to a private UID-owned collection; visitors retain a separate local workspace. See [the employee workspace contract](employee-workspace.md). Signing out hides employee quotations and preserves them in the account-isolated cache/cloud, then restores the guest workspace.
- Email verification reloads the Firebase account and forces a fresh ID token before reading models; the rules check the signed `email_verified` token claim.

## Firestore data and access

Collection: `liftModels`. Document ID: the existing model UUID.

Each document contains `id`, `description`, `lift_type`, `speed`, `car_door`, `door_frame`, `landing_door`, `motor`, `controller`, `rope`, `created_by` (Firebase UID), and `created_at` (server timestamp). Existing field names keep the document contract stable.

Rules deny anonymous/unverified reads and writes, require a matching UUID/author/server time and exact field set, validate text lengths, and prohibit updates/deletes. An atomic transaction makes a retried save return the existing matching model instead of duplicating or overwriting it.

No customer records, addresses, prices, or quotation drafts belong in the **shared model collection**. The employee workspace separately saves complete quotations privately under `users/{uid}/quotationDrafts/{id}`. Keep Firestore in production mode; do not substitute test-mode rules.

## Supabase transition

The owner confirmed there were **no real Supabase accounts or models** on 3 November 2026. No cloud records needed transferring. The Supabase SDK has been removed; old SQL is retained under `supabase/` as legacy documentation and the cloud project is untouched. Ignored local Supabase values are retained only for rollback and are not read by the application.

Previously saved shared-model IDs and snapshots still resolve offline. Supabase sessions cannot become Firebase sessions; users register/sign in with Firebase. If historical cloud data is discovered later, export it privately before deleting anything, retain each model UUID, and explicitly plan any account import. Do not import customer history into the model collection.

## Verification and remaining checks

Automated service tests cover pagination, create attribution/server time, denied writes, idempotent retries, conflicting IDs, configuration, verification/token renewal, and unchanged draft/override/search behavior. Real PDF regressions include a six-page quotation resolved from an offline shared snapshot.

On 3 November 2026, all **56 tests**, catalogue validation (49 records), lint, production build, and diff checks passed. Existing bundle-size warnings remain.

Existing Edge passed the Firebase SDK integration with intercepted synthetic REST responses: registration, password mismatch/rejected login, verification resend, blocked unverified access, renewed verification tokens, a transaction-backed save, independent second-account selection, 390px layout, draft restoration, sign-out preservation, incomplete PDF preview and final download gating. No live accounts, emails, or models were created by these checks.

The owner confirmed publication of the rules and enabling Email/Password. A read-only live configuration check confirmed authorization of `127.0.0.1` and `quote-flow-azure.vercel.app`; a real anonymous model request returned HTTP 403 / `PERMISSION_DENIED`. These checks do not validate live email delivery or an authenticated save.

Release verification subsequently installed checksum-verified Temurin Java 21 and the Firebase CLI/emulator. `npm run test:rules` now starts the isolated demo emulator automatically; `npm run test:emulators` passed all 84 tests without skips. On 3 November 2026, the expanded rules were published and independently matched to the tested file. Real Firebase acceptance verified shared-model creation and second-account visibility, private drafts and production PDF generation; the employee workspace was deployed to the existing Vercel site. See [release readiness](release-readiness-2026-11-03.md).

Live release checks used synthetic accounts provisioned through authorized administrative access, including verified and unverified cases. No real customer data was used. Mailbox delivery and clicking a real verification email remain manual operational checks; normal Firebase password login, verification claims, shared-model persistence, account isolation and the downloaded six-page document were tested against the live backend.

## Dependency note

The Firebase umbrella npm package reports advisories in its Node-side gRPC dependency chain even though this frontend imports only Firebase App, Auth, and Firestore Lite. The Node gRPC implementation is not part of the browser build; production-file checks found no Node gRPC/HTTP2/TLS import markers. Additional development-tool and SheetJS advisories remain. No forced Firebase downgrade or unsupported transport override was applied. See the dated dependency assessment in [release readiness](release-readiness-2026-11-03.md); this is not a clean dependency-audit claim.
