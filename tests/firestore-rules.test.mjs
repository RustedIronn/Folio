import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createQuotation } from "../src/models/quotation/quotation.js";
import { ALTIS_QUOTATION_TEMPLATE as template } from "../src/templates/altisQuotationTemplate.js";
import { emptySharedModel, sharedModelPayload } from "../src/models/catalogue/sharedModels.js";
import { entryOptionPayload } from "../src/models/catalogue/sharedEntryOptions.js";
import { sharedEntryOptionsService } from "../src/services/sharedEntryOptions.js";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
test("Firestore rules: private employee drafts, verified access, revision checks and shared-model separation", { skip: !emulator }, async (t) => {
  const [host, port] = emulator.split(":");
  assert.ok(["localhost", "127.0.0.1"].includes(host) && Number(port) > 0, "Rules tests must use a local emulator, never a production endpoint");
  const { initializeTestEnvironment, assertFails, assertSucceeds } = await import("@firebase/rules-unit-testing");
  const firestore = await import("firebase/firestore");
  const { doc, collection, setDoc, getDoc, getDocs, deleteDoc, serverTimestamp } = firestore;
  const env = await initializeTestEnvironment({ projectId: "demo-quoteflow", firestore: { host, port: Number(port), rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8") } });
  t.after(() => env.cleanup()); await env.clearFirestore();
  const alice = env.authenticatedContext("alice", { email_verified: true, email: "alice@example.test" }).firestore();
  const bob = env.authenticatedContext("bob", { email_verified: true, email: "bob@example.test" }).firestore();
  const pending = env.authenticatedContext("pending", { email_verified: false }).firestore();
  const anon = env.unauthenticatedContext().firestore();
  let sequence = 0;
  const uuid = () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;
  const id = uuid();
  const path = `users/alice/quotationDrafts/${id}`;
  const data = (ownerUid = "alice") => ({ schemaVersion: 4, ownerUid, quotation: createQuotation(template), revision: 1, lastMutationId: uuid(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await t.test("verified owner can create and read an incomplete quotation", async () => {
    await assertSucceeds(setDoc(doc(alice, path), data()));
    await assertSucceeds(getDoc(doc(alice, path)));
    await assertSucceeds(getDocs(collection(alice, "users/alice/quotationDrafts")));
  });
  await t.test("guests, unverified accounts and other employees cannot read private drafts", async () => {
    for (const db of [anon, pending, bob]) {
      await assertFails(getDoc(doc(db, path)));
      await assertFails(getDocs(collection(db, "users/alice/quotationDrafts")));
    }
    await assertFails(setDoc(doc(pending, `users/pending/quotationDrafts/${uuid()}`), data("pending")));
    await assertFails(setDoc(doc(anon, `users/alice/quotationDrafts/${uuid()}`), data()));
  });
  await t.test("forged owners, malformed draft payloads and unrecognized fields are denied", async () => {
    await assertFails(setDoc(doc(alice, `users/alice/quotationDrafts/${uuid()}`), data("bob")));
    await assertFails(setDoc(doc(bob, `users/alice/quotationDrafts/${uuid()}`), data("alice")));
    await assertFails(setDoc(doc(alice, `users/alice/quotationDrafts/${uuid()}`), { ...data(), quotation: {} }));
    await assertFails(setDoc(doc(alice, `users/alice/quotationDrafts/${uuid()}`), { ...data(), public: true }));
    await assertFails(setDoc(doc(alice, `users/alice/quotationDrafts/${uuid()}`), { ...data(), revision: 0 }));
    await assertFails(setDoc(doc(alice, `users/alice/quotationDrafts/${uuid()}`), { ...data(), lastMutationId: "invalid" }));
  });
  await t.test("updates must preserve creation time and increase the revision exactly once", async () => {
    const original = (await getDoc(doc(alice, path))).data();
    const update = { ...original, revision: 2, lastMutationId: uuid(), updatedAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(alice, path), update));
    await assertFails(setDoc(doc(alice, path), { ...update, lastMutationId: uuid(), updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(alice, path), { ...update, revision: 3, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(alice, path)));
    await assertFails(setDoc(doc(bob, path), { ...update, revision: 3, updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(bob, path)));
  });
  await t.test("shared models remain separate and append-only, and still require verification", async () => {
    const modelId = uuid();
    const model = { ...sharedModelPayload({ ...emptySharedModel(), quantityType: "Synthetic model", liftType: "Synthetic category" }, modelId), created_by: "alice", created_at: serverTimestamp() };
    await assertSucceeds(setDoc(doc(alice, `liftModels/${modelId}`), model));
    await assertSucceeds(getDoc(doc(bob, `liftModels/${modelId}`)));
    await assertFails(getDoc(doc(anon, `liftModels/${modelId}`)));
    await assertFails(getDoc(doc(pending, `liftModels/${modelId}`)));
    await assertFails(setDoc(doc(alice, `liftModels/${modelId}`), model));
    await assertFails(deleteDoc(doc(alice, `liftModels/${modelId}`)));
  });
  await t.test("verified employees share capacity and material options without exposing private drafts", async () => {
    for (const input of [{ kind: "capacity", passengerCount: "7", maximumLoadKg: "475.5" }, { kind: "material", materialKey: "rope", specification: "Synthetic approved rope" }]) {
      const optionId = uuid();
      const option = { ...entryOptionPayload(input, optionId), created_by: "alice", created_at: serverTimestamp() };
      await assertSucceeds(setDoc(doc(alice, `quotationOptions/${optionId}`), option));
      await assertSucceeds(getDoc(doc(bob, `quotationOptions/${optionId}`)));
      for (const db of [anon, pending]) {
        await assertFails(getDoc(doc(db, `quotationOptions/${optionId}`)));
        await assertFails(getDocs(collection(db, "quotationOptions")));
      }
      await assertFails(setDoc(doc(alice, `quotationOptions/${optionId}`), option));
      await assertFails(deleteDoc(doc(bob, `quotationOptions/${optionId}`)));
    }
  });
  await t.test("team option service transactions retry safely and restore across employee clients", async () => {
    const client = (db, uid) => sharedEntryOptionsService({ db, firestore, userId: () => uid, isVerified: () => true });
    const optionId = uuid();
    const input = { kind: "material", materialKey: "controlPanel", specification: "Synthetic shared controller" };
    const record = await client(alice, "alice").add(input, optionId);
    assert.deepEqual(await client(alice, "alice").add(input, optionId), record);
    assert.ok((await client(bob, "bob").list()).some((entry) => entry.id === optionId));
    await assert.rejects(client(alice, "alice").add({ ...input, specification: "Different controller" }, optionId), { code: "options/id-conflict" });
  });
  await t.test("team option identity, author, numeric values and exact fields are enforced", async () => {
    const optionId = uuid();
    const option = { ...entryOptionPayload({ kind: "capacity", passengerCount: "7", maximumLoadKg: "475.5" }, optionId), created_by: "alice", created_at: serverTimestamp() };
    for (const change of [{ id: uuid() }, { created_by: "bob" }, { created_at: null }, { passengerCount: 0 }, { passengerCount: 1.5 }, { passengerCount: "7" }, { maximumLoadKg: "0.00" }, { maximumLoadKg: "-1" }, { maximumLoadKg: "Infinity" }, { quotation: {} }, { kind: "unknown" }]) await assertFails(setDoc(doc(alice, `quotationOptions/${optionId}`), { ...option, ...change }));
    await assertFails(setDoc(doc(pending, `quotationOptions/${optionId}`), { ...option, created_by: "pending" }));
    await assertFails(setDoc(doc(anon, `quotationOptions/${optionId}`), option));
  });
  await t.test("material additions cannot create arbitrary rows or contain empty/oversized specifications", async () => {
    const optionId = uuid();
    const option = { ...entryOptionPayload({ kind: "material", materialKey: "cabin", specification: "Synthetic finish" }, optionId), created_by: "alice", created_at: serverTimestamp() };
    for (const change of [{ materialKey: "customer" }, { specification: "   " }, { specification: "x".repeat(181) }, { passengerCount: 6 }]) await assertFails(setDoc(doc(alice, `quotationOptions/${optionId}`), { ...option, ...change }));
  });
  await t.test("a newly verified account needs no approval or domain allowlist", async () => {
    const newcomer = env.authenticatedContext("new-employee", { email_verified: true, email: "personal@example.test" }).firestore();
    await assertSucceeds(setDoc(doc(newcomer, `users/new-employee/quotationDrafts/${uuid()}`), data("new-employee")));
    await assertSucceeds(getDocs(collection(newcomer, "liftModels")));
    await assertFails(setDoc(doc(newcomer, "employees/new-employee"), { approved: true }));
  });
  await t.test("shared model field, identity and author validation cannot be bypassed", async () => {
    const modelId = uuid();
    const model = { ...sharedModelPayload({ ...emptySharedModel(), quantityType: "Synthetic validation model", liftType: "Synthetic category" }, modelId), created_by: "alice", created_at: serverTimestamp() };
    await assertFails(setDoc(doc(pending, `liftModels/${modelId}`), { ...model, created_by: "pending" }));
    await assertFails(setDoc(doc(anon, `liftModels/${modelId}`), model));
    await assertFails(setDoc(doc(alice, `liftModels/${modelId}`), { ...model, created_by: "bob" }));
    await assertFails(setDoc(doc(alice, `liftModels/${modelId}`), { ...model, id: uuid() }));
    await assertFails(setDoc(doc(alice, `liftModels/${modelId}`), { ...model, speed: "x".repeat(181) }));
    await assertFails(setDoc(doc(alice, `liftModels/${modelId}`), { ...model, description: "   " }));
    await assertFails(setDoc(doc(alice, `liftModels/${modelId}`), { ...model, quotation: {} }));
  });
});
