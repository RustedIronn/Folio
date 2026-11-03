import { isQuotationDraft, quotationFingerprint } from "../models/quotation/workspace.js";
import { assertEmployee } from "./employeeAccess.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function documentDraft(snapshot, uid) {
  if (!snapshot.exists()) return null;
  const value = snapshot.data();
  if (value.ownerUid !== uid || value.schemaVersion !== 4 || !isQuotationDraft(value.quotation) || !Number.isInteger(value.revision) || value.revision < 1 || !UUID.test(value.lastMutationId)) throw new Error("A saved quotation needs review before it can be opened. Your local draft has been kept.");
  return { ...value, id: snapshot.id };
}
export function quotationDraftsService(client) {
  const f = client.firestore;
  const collection = (uid) => f.collection(client.db, "users", uid, "quotationDrafts");
  return {
    async list(uid) {
      assertEmployee(client, uid);
      const drafts = []; let last;
      for (;;) {
        const parts = [f.orderBy("updatedAt", "desc"), f.limit(100)];
        if (last) parts.push(f.startAfter(last));
        const result = await f.getDocs(f.query(collection(uid), ...parts));
        assertEmployee(client, uid);
        drafts.push(...result.docs.map((entry) => documentDraft(entry, uid)));
        if (result.docs.length < 100) return drafts;
        last = result.docs.at(-1);
      }
    },
    async get(uid, id) {
      assertEmployee(client, uid);
      const result = await f.getDoc(f.doc(collection(uid), id));
      assertEmployee(client, uid);
      return documentDraft(result, uid);
    },
    async save(uid, workspace) {
      assertEmployee(client, uid);
      if (!UUID.test(workspace.id) || !UUID.test(workspace.mutationId) || !isQuotationDraft(workspace.quotation) || !Number.isInteger(workspace.baseRevision) || workspace.baseRevision < 0) throw new Error("This quotation cannot be saved safely. Your local copy has been kept.");
      if (new TextEncoder().encode(JSON.stringify(workspace.quotation)).length > 500000) throw new Error("This draft is too large to save to the cloud. Your local copy has been kept.");
      return f.runTransaction(client.db, async (transaction) => {
        const reference = f.doc(collection(uid), workspace.id);
        const remote = documentDraft(await transaction.get(reference), uid);
        assertEmployee(client, uid);
        if (remote?.lastMutationId === workspace.mutationId && quotationFingerprint(remote.quotation) === quotationFingerprint(workspace.quotation)) return remote;
        if ((remote?.revision ?? 0) !== workspace.baseRevision) throw Object.assign(new Error("A newer cloud version exists."), { code: "draft/conflict", remote });
        const next = { schemaVersion: 4, ownerUid: uid, quotation: workspace.quotation, revision: (remote?.revision ?? 0) + 1, lastMutationId: workspace.mutationId, createdAt: remote?.createdAt ?? f.serverTimestamp(), updatedAt: f.serverTimestamp() };
        transaction.set(reference, next);
        return { ...next, id: workspace.id };
      });
    },
  };
}
