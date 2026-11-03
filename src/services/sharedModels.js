import { sharedModelPayload, sharedModelRecord } from "../models/catalogue/sharedModels.js";
import { assertEmployee } from "./employeeAccess.js";
export { sharedModelsConfigured, getSharedModelsClient } from "./firebaseClient.js";

export function sharedModelsError(error) {
  switch (error?.code) {
    case "permission-denied": return "Shared model access is unavailable. Verify your email; if it is verified, ask the administrator to publish the Firestore rules.";
    case "unauthenticated": case "auth/user-token-expired": case "auth/invalid-user-token": return "Your session has expired. Sign out and sign in again.";
    case "auth/invalid-credential": case "auth/wrong-password": case "auth/user-not-found": return "The email or password is incorrect.";
    case "auth/email-already-in-use": return "An account already uses this email. Sign in instead; you can resend verification after signing in.";
    case "auth/weak-password": case "auth/password-does-not-meet-requirements": return "Choose a stronger password with at least 8 characters.";
    case "auth/invalid-email": return "Enter a valid email address.";
    case "auth/operation-not-allowed": return "Email/password registration is not enabled. Ask the administrator to enable it in Firebase Authentication.";
    case "auth/unauthorized-domain": case "auth/unauthorized-continue-uri": return "This website is not authorized for account emails. Ask the administrator to add its domain in Firebase Authentication.";
    case "auth/invalid-api-key": case "auth/app-not-authorized": return "The Firebase connection needs to be checked by the administrator.";
    case "auth/user-disabled": return "This account has been disabled. Contact the person managing QuoteFlow.";
    case "auth/too-many-requests": case "resource-exhausted": return "Too many requests. Please wait a little before trying again.";
    case "auth/network-request-failed": case "unavailable": case "deadline-exceeded": return "Cannot reach shared models. Check your connection and try again.";
    case "models/id-conflict": return "This model identifier already exists with different details. Close the form and try adding it again.";
    default: return "Shared models could not be updated. Please try again or contact the administrator.";
  }
}

export function sharedModelsService(client) {
  const f = client.firestore;
  return {
    async list() {
      const uid = assertEmployee(client);
      const records = [];
      const batch = 250;
      let last;
      for (;;) {
        const constraints = [f.orderBy(f.documentId()), f.limit(batch)];
        if (last) constraints.push(f.startAfter(last));
        const snapshot = await f.getDocs(f.query(f.collection(client.db, "liftModels"), ...constraints));
        assertEmployee(client, uid);
        records.push(...snapshot.docs.map((entry) => sharedModelRecord({ ...entry.data(), id: entry.id })));
        if (snapshot.docs.length < batch) return records;
        last = snapshot.docs.at(-1);
      }
    },
    async add(input, id) {
      const payload = sharedModelPayload(input, id);
      const userId = assertEmployee(client);
      return f.runTransaction(client.db, async (transaction) => {
        const reference = f.doc(client.db, "liftModels", id);
        const existing = await transaction.get(reference);
        assertEmployee(client, userId);
        if (existing.exists()) {
          const data = existing.data();
          if (Object.entries(payload).every(([key, value]) => data[key] === value)) return sharedModelRecord(data);
          throw Object.assign(new Error("Model identifier already used."), { code: "models/id-conflict" });
        }
        transaction.set(reference, { ...payload, created_by: userId, created_at: f.serverTimestamp() });
        return sharedModelRecord(payload);
      });
    },
  };
}
