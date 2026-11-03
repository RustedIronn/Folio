import assert from "node:assert/strict";
import test from "node:test";
import { quotationDraftsService } from "../src/services/quotationDrafts.js";
import { createQuotation } from "../src/models/quotation/quotation.js";
import { ALTIS_QUOTATION_TEMPLATE as template } from "../src/templates/altisQuotationTemplate.js";

const id = "00000000-0000-4000-8000-000000000001";
const mutationId = "00000000-0000-4000-8000-000000000002";
const quotation = createQuotation(template);
const workspace = { id, mutationId, baseRevision: 0, quotation };
function fake({ existing = null, uid = "alice", verified = true } = {}) {
  const calls = []; let currentUid = uid;
  const snapshot = () => ({ id, exists: () => Boolean(existing), data: () => existing });
  const f = {
    collection: (_db, ...parts) => parts.join("/"), doc: (path, key) => `${path}/${key}`,
    orderBy: (field) => field, limit: (number) => number, startAfter: (entry) => entry.id, query: (...args) => args,
    getDocs: async (path) => { calls.push(["list", path]); return { docs: existing ? [snapshot()] : [] }; },
    getDoc: async (path) => { calls.push(["get", path]); return snapshot(); },
    serverTimestamp: () => "SERVER_TIME",
    runTransaction: async (_db, callback) => callback({ get: async (path) => { calls.push(["read", path]); return snapshot(); }, set: (path, value) => calls.push(["write", path, value]) }),
  };
  return { client: { db: {}, firestore: f, userId: () => currentUid, isVerified: () => verified }, calls, changeUser: (next) => { currentUid = next; } };
}
test("cloud draft creation is private, versioned and uses server timestamps", async () => {
  const { client, calls } = fake();
  const saved = await quotationDraftsService(client).save("alice", workspace);
  assert.equal(saved.revision, 1);
  assert.equal(saved.ownerUid, "alice");
  const write = calls.find(([method]) => method === "write");
  assert.equal(write[1], `users/alice/quotationDrafts/${id}`);
  assert.equal(write[2].createdAt, "SERVER_TIME");
  assert.equal(write[2].updatedAt, "SERVER_TIME");
  assert.deepEqual(write[2].quotation, quotation);
});
test("anonymous, unverified and cross-account requests are rejected before accessing Firestore", async () => {
  for (const setup of [{ uid: null }, { verified: false }, { uid: "bob" }]) {
    const { client, calls } = fake(setup), api = quotationDraftsService(client);
    await assert.rejects(api.list("alice"));
    await assert.rejects(api.get("alice", id));
    await assert.rejects(api.save("alice", workspace));
    assert.deepEqual(calls, []);
  }
});
test("stale saves conflict and idempotent retries do not overwrite or increment revision", async () => {
  const existing = { id, ownerUid: "alice", schemaVersion: 4, quotation, revision: 2, lastMutationId: mutationId, createdAt: 10, updatedAt: 20 };
  const retry = fake({ existing });
  assert.equal((await quotationDraftsService(retry.client).save("alice", workspace)).revision, 2);
  assert.equal(retry.calls.filter(([method]) => method === "write").length, 0);
  const stale = fake({ existing });
  await assert.rejects(quotationDraftsService(stale.client).save("alice", { ...workspace, mutationId: "00000000-0000-4000-8000-000000000003" }), { code: "draft/conflict" });
  assert.equal(stale.calls.filter(([method]) => method === "write").length, 0);
  const fresh = fake({ existing });
  const saved = await quotationDraftsService(fresh.client).save("alice", { ...workspace, baseRevision: 2, mutationId: "00000000-0000-4000-8000-000000000003" });
  assert.equal(saved.revision, 3); assert.equal(saved.createdAt, 10);
});
test("malformed or cross-owner cloud data is not restored into the workflow", async () => {
  const wrongOwner = fake({ existing: { ownerUid: "bob", quotation, revision: 1 } });
  await assert.rejects(quotationDraftsService(wrongOwner.client).list("alice"), /needs review/);
  const malformed = fake({ existing: { ownerUid: "alice", schemaVersion: 4, quotation: {}, revision: 1 } });
  await assert.rejects(quotationDraftsService(malformed.client).get("alice", id), /needs review/);
});
test("an account change during a transaction prevents a write under the old account", async () => {
  const value = fake();
  value.client.firestore.runTransaction = async (_db, callback) => callback({
    get: async () => { value.changeUser("bob"); return { exists: () => false }; },
    set: () => assert.fail("Cross-account write attempted"),
  });
  await assert.rejects(quotationDraftsService(value.client).save("alice", workspace), { code: "unauthenticated" });
});
