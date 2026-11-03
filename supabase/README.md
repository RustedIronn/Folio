# Legacy Supabase setup

These SQL files document the earlier, unreleased shared-model integration. The active application now uses Firebase Auth and Firestore; it does not load the Supabase SDK, call Supabase, or require these migrations.

Do not run these files to configure Firebase. Use `docs/shared-lift-models.md` and `firestore.rules` instead. The original Supabase project and local rollback configuration have not been deleted. The owner confirmed there were no real cloud accounts/models requiring transfer when the Firebase migration began.
