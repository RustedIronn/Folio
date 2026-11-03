import { entryOptionPayload, entryOptionRecord } from "../models/catalogue/sharedEntryOptions.js";
import { assertEmployee } from "./employeeAccess.js";

export function entryOptionsError(error) {
  if (error?.code === "permission-denied") return "Team options are unavailable. Verify your email; if already verified, ask the administrator to publish the updated Firestore rules.";
  if (error?.code === "unauthenticated") return "Sign in with a verified account to use team options.";
  if (error?.code === "options/id-conflict") return "This option identifier is already in use. Close the form and try again.";
  return "Could not load or save team options. Check your connection and try again. Existing quotation entries are kept.";
}

export function sharedEntryOptionsService(client) {
  const f = client.firestore;
  return {
    async list() {
      const uid = assertEmployee(client);
      const records = [];
      let last;
      for (;;) {
        const constraints = [f.orderBy(f.documentId()), f.limit(250)];
        if (last) constraints.push(f.startAfter(last));
        const snapshot = await f.getDocs(f.query(f.collection(client.db, "quotationOptions"), ...constraints));
        assertEmployee(client, uid);
        records.push(...snapshot.docs.map((entry) => entryOptionRecord({ ...entry.data(), id: entry.id })));
        if (snapshot.docs.length < 250) return records;
        last = snapshot.docs.at(-1);
      }
    },
    async add(input, id) {
      const payload = entryOptionPayload(input, id);
      const uid = assertEmployee(client);
      const record = await f.runTransaction(client.db, async (transaction) => {
        const ref = f.doc(client.db, "quotationOptions", id);
        const existing = await transaction.get(ref);
        assertEmployee(client, uid);
        if (existing.exists()) {
          const data = existing.data();
          if (Object.entries(payload).every(([key, value]) => data[key] === value)) return entryOptionRecord(data);
          throw Object.assign(new Error("Option identifier already used."), { code: "options/id-conflict" });
        }
        transaction.set(ref, { ...payload, created_by: uid, created_at: f.serverTimestamp() });
        return payload;
      });
      assertEmployee(client, uid);
      return record;
    },
  };
}
