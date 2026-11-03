import assert from "node:assert/strict";
import test from "node:test";
import catalogue from "../src/data/catalogue/liftCatalogue.json" with { type: "json" };
import { ALTIS_QUOTATION_TEMPLATE as template } from "../src/templates/altisQuotationTemplate.js";
import { emptySharedModel, isSharedModel, quotationCatalogue, sharedModelPayload, sharedModelRecord, validateSharedModel } from "../src/models/catalogue/sharedModels.js";
import { applyConfiguration, createQuotation, getConfigurationSwitchImpact, resolveQuotationDocument, restoreDraft, restoreTechnical, serializeDraft, setTechnicalOverride } from "../src/models/quotation/quotation.js";
import { configurationName, searchCatalogue } from "../src/app/catalogueSearch.js";
import { sharedModelsConfigured, sharedModelsError, sharedModelsService } from "../src/services/sharedModels.js";

const id = "ab000001-1111-4222-8333-000000000001";
const input = { ...emptySharedModel(), quantityType: "Example configuration", liftType: "Example category", speed: "0.75 mtr/sec", motor: "Example motor", controller: "Example controller", rope: "Example rope" };
const row = sharedModelPayload(input, id);
const record = sharedModelRecord(row);

test("shared model fields require identity, bound printable text and preserve unknown specifications", () => {
  assert.deepEqual(Object.keys(validateSharedModel(emptySharedModel())), ["quantityType", "liftType"]);
  assert.deepEqual(validateSharedModel(input), {});
  assert.ok(validateSharedModel({ ...input, rope: "x".repeat(181) }).rope);
  assert.throws(() => sharedModelPayload(input, "1"));
  assert.equal(record.technical.carProtectionDoor, "");
  assert.equal(record.sourceRow, null);
  assert.equal(record.sourceRecordId, `shared:${id}`);
  assert.equal(isSharedModel(record), true);
  assert.equal(isSharedModel({ ...record, sourceRecordId: "1" }), false);
  assert.equal(isSharedModel({ ...record, sourceRow: 4 }), false);
  assert.throws(() => sharedModelRecord({ ...row, rope: null }));
});

test("shared models use existing search and cannot replace Excel record identifiers", () => {
  const original = JSON.stringify(catalogue);
  const merged = quotationCatalogue(catalogue, [record, { ...record, sourceRecordId: "1" }]);
  assert.equal(merged.records.length, 50);
  assert.deepEqual(searchCatalogue(merged.records, { search: "example-controller" }).map((entry) => entry.sourceRecordId), [record.sourceRecordId]);
  assert.match(configurationName(record), /^Team model/);
  assert.equal(merged.records[0].sourceRow, catalogue.records[0].sourceRow);
  assert.equal(JSON.stringify(catalogue), original);
});

test("shared selection survives v4 draft restoration and disconnection without fabricating Excel provenance", () => {
  const quotation = applyConfiguration(createQuotation(template), record);
  const restored = restoreDraft(serializeDraft(quotation), template);
  const resolved = resolveQuotationDocument(restored, catalogue, template);
  assert.equal(restored.schemaVersion, 4);
  assert.equal(resolved.pages.installation.quantityType, input.quantityType);
  assert.equal(resolved.pages.installation.technical.speed, input.speed);
  assert.equal(resolved.provenance.configurationOrigin, "shared");
  assert.equal(resolved.provenance.catalogueSourceRow, null);
  assert.equal(resolved.pages.materials.rows.find((entry) => entry.key === "controlPanel").value, input.controller);
  assert.equal(resolved.pages.materials.rows.find((entry) => entry.key === "rope").value, input.rope);
  assert.equal(resolved.pages.materials.rows.find((entry) => entry.key === "motors").value, input.motor);
  assert.equal(quotationCatalogue(catalogue, [], restored).records.length, 50);
  assert.equal(quotationCatalogue(catalogue, [], createQuotation(template)).records.length, 49);
});

test("shared specifications restore correctly and switching retains the existing confirmation and override choices", () => {
  const original = JSON.stringify(record);
  let quotation = applyConfiguration(createQuotation(template), record);
  quotation = setTechnicalOverride(quotation, "motor", "Quotation motor", catalogue, template);
  assert.equal(resolveQuotationDocument(quotation, catalogue, template).pages.installation.technical.motor, "Quotation motor");
  quotation = restoreTechnical(quotation, "motor");
  assert.equal(resolveQuotationDocument(quotation, catalogue, template).pages.installation.technical.motor, input.motor);
  quotation = setTechnicalOverride(quotation, "motor", "Quotation motor", catalogue, template);
  assert.equal(getConfigurationSwitchImpact(quotation, catalogue.records[0]).requiresConfirmation, true);
  const keep = applyConfiguration(quotation, catalogue.records[0]);
  assert.equal(keep.lift.technicalOverrides.motor, "Quotation motor");
  assert.equal(Object.hasOwn(keep.lift, "configurationSnapshot"), false);
  const replace = applyConfiguration(quotation, catalogue.records[0], { preserveOverrides: false });
  assert.deepEqual(replace.lift.technicalOverrides, {});
  assert.equal(JSON.stringify(record), original);
});

test("blank shared specifications stay blank and required materials still block final export", () => {
  const incomplete = sharedModelRecord(sharedModelPayload({ ...emptySharedModel(), quantityType: "Incomplete model", liftType: "Employee category" }, id));
  const resolved = resolveQuotationDocument(applyConfiguration(createQuotation(template), incomplete), catalogue, template);
  assert.equal(resolved.pages.installation.technical.motor, "");
  assert.equal(resolved.pages.installation.project.capacity, "");
  assert.ok(resolved.missing.some((entry) => entry.path === "materials.rope"));
  const wrongSnapshot = applyConfiguration(createQuotation(template), record);
  wrongSnapshot.lift.catalogueId = "1";
  assert.equal(resolveQuotationDocument(wrongSnapshot, catalogue, template).pages.installation.quantityType, catalogue.records[0].quantityType);
});

function fakeClient({ pages = [], existing, error, uid = "example-firebase-user" } = {}) {
  const calls = [];
  const snapshot = (value) => ({ id: value?.id, exists: () => Boolean(value), data: () => value });
  const firestore = {
    collection: (_db, name) => name,
    doc: (_db, collection, id) => ({ collection, id }),
    documentId: () => "__name__",
    orderBy: (value) => ({ orderBy: value }),
    limit: (value) => ({ limit: value }),
    startAfter: (value) => { calls.push(["startAfter", value.id]); return { after: value.id }; },
    query: (...parts) => parts,
    getDocs: async (query) => { calls.push(["query", query]); if (error) throw error; return { docs: (pages.shift() ?? []).map(snapshot) }; },
    serverTimestamp: () => "SERVER_TIMESTAMP",
    runTransaction: async (_db, callback) => {
      calls.push(["transaction"]);
      if (error) throw error;
      return callback({
        get: async () => snapshot(existing),
        set: (reference, payload) => calls.push(["set", reference, payload]),
      });
    },
  };
  return { client: { db: {}, firestore, userId: () => uid, isVerified: () => true }, calls };
}

test("Firestore service reads all result pages using document cursors", async () => {
  const { client, calls } = fakeClient({ pages: [Array(250).fill(row), [row]] });
  assert.equal((await sharedModelsService(client).list()).length, 251);
  assert.deepEqual(calls.filter(([method]) => method === "startAfter"), [["startAfter", id]]);
  assert.equal(calls.filter(([method]) => method === "query").length, 2);
});

test("Firestore creation is atomic, attributes the author and uses server time", async () => {
  const { client, calls } = fakeClient();
  assert.equal((await sharedModelsService(client).add(input, id)).sourceRecordId, record.sourceRecordId);
  const writes = calls.filter(([method]) => method === "set");
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0][1], { collection: "liftModels", id });
  assert.deepEqual(writes[0][2], { ...row, created_by: "example-firebase-user", created_at: "SERVER_TIMESTAMP" });
});

test("Firestore service preserves errors and retries a committed save without another write", async () => {
  const forbidden = { code: "permission-denied" };
  await assert.rejects(sharedModelsService(fakeClient({ error: forbidden }).client).add(input, id), (error) => error === forbidden);
  const { client, calls } = fakeClient({ existing: row });
  assert.equal((await sharedModelsService(client).add(input, id)).sourceRecordId, record.sourceRecordId);
  assert.equal(calls.filter(([method]) => method === "set").length, 0);
  await assert.rejects(sharedModelsService(fakeClient({ existing: { ...row, motor: "Another specification" } }).client).add(input, id), { code: "models/id-conflict" });
  const invalid = fakeClient();
  await assert.rejects(sharedModelsService(invalid.client).add({ ...input, quantityType: "" }, id));
  assert.equal(invalid.calls.length, 0);
  await assert.rejects(sharedModelsService(fakeClient({ uid: null }).client).add(input, id), { code: "unauthenticated" });
});

test("Firebase web configuration and actionable errors do not require service-account keys", () => {
  assert.equal(sharedModelsConfigured({}), false);
  assert.equal(sharedModelsConfigured({ VITE_FIREBASE_API_KEY: "public-web-key", VITE_FIREBASE_AUTH_DOMAIN: "example.firebaseapp.com", VITE_FIREBASE_PROJECT_ID: "example", VITE_FIREBASE_APP_ID: "example-web-app" }), true);
  assert.equal(sharedModelsConfigured({ VITE_FIREBASE_API_KEY: " " }), false);
  assert.match(sharedModelsError({ code: "permission-denied" }), /Firestore rules/);
  assert.match(sharedModelsError({ code: "auth/invalid-credential" }), /email or password/);
  assert.match(sharedModelsError({ code: "auth/email-already-in-use" }), /Sign in instead/);
  assert.match(sharedModelsError({ code: "auth/unauthorized-continue-uri" }), /domain/);
  assert.match(sharedModelsError({ code: "auth/too-many-requests" }), /wait a little/);
});

test("Firebase registration sends verification and refreshing the account renews verification claims", async () => {
  const { firebaseAccountService } = await import("../src/services/firebaseClient.js");
  const user = { uid: "example-user", emailVerified: false };
  const auth = { currentUser: user };
  const calls = [];
  const sdk = {
    createUserWithEmailAndPassword: async (_auth, email, password) => { calls.push(["register", email, password]); return { user }; },
    sendEmailVerification: async (account, options) => calls.push(["verify", account.uid, options.url]),
    reload: async (account) => { account.emailVerified = true; calls.push(["reload"]); },
    getIdToken: async (_account, force) => calls.push(["token", force]),
    signOut: async () => { auth.currentUser = null; },
  };
  const service = firebaseAccountService(auth, sdk, () => "https://example.test");
  await service.register(" user@example.test ", "synthetic-password");
  assert.deepEqual(calls.slice(0, 2), [["register", "user@example.test", "synthetic-password"], ["verify", "example-user", "https://example.test"]]);
  assert.equal((await service.refreshUser()).emailVerified, true);
  assert.deepEqual(calls.slice(2), [["reload"], ["token", true]]);
  await service.resendVerification();
  assert.deepEqual(calls.at(-1), ["verify", "example-user", "https://example.test"]);
  await service.signOut();
  assert.equal(await service.refreshUser(), null);
  assert.throws(() => service.resendVerification(), /Sign in/);
});
