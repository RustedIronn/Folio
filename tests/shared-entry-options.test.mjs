import assert from "node:assert/strict";
import test from "node:test";
import { entryOptionPayload, entryOptionRecord, MATERIAL_KEYS, validateEntryOption } from "../src/models/catalogue/sharedEntryOptions.js";
import { sharedEntryOptionsService } from "../src/services/sharedEntryOptions.js";
import { applyCapacityChoice, capacityChoice, capacityOptions, materialChoices, technicalChoices } from "../src/app/entryOptions.js";
import { applyConfiguration, createQuotation, resolveQuotationDocument, setTechnicalOverride } from "../src/models/quotation/quotation.js";
import { ALTIS_QUOTATION_TEMPLATE as template } from "../src/templates/altisQuotationTemplate.js";
import catalogue from "../src/data/catalogue/liftCatalogue.json" with { type: "json" };

const id = "00000000-0000-4000-8000-000000000001";
const input = { kind: "capacity", passengerCount: "7", maximumLoadKg: "0475.500" };
const material = { kind: "material", materialKey: "cabin", specification: "Synthetic reusable cabin finish" };

test("team capacities validate explicit numeric pairs and normalize formatting without guessing a load", () => {
  assert.deepEqual(entryOptionPayload(input, id), { id, kind: "capacity", passengerCount: 7, maximumLoadKg: "475.5" });
  for (const passengerCount of ["", "0", "-1", "1.5", "Infinity", "9007199254740992"]) assert.ok(validateEntryOption({ ...input, passengerCount }).passengerCount);
  for (const maximumLoadKg of ["", "0", "-1", "NaN", "Infinity", "1e3", "400 kg", "1".repeat(33)]) assert.ok(validateEntryOption({ ...input, maximumLoadKg }).maximumLoadKg);
  assert.throws(() => entryOptionPayload(input, "invalid"));
  assert.throws(() => entryOptionRecord({ id, kind: "capacity", passengerCount: "7", maximumLoadKg: "475.5" }));
  assert.equal(entryOptionRecord({ id, kind: "capacity", passengerCount: 7, maximumLoadKg: "0475.500" }).maximumLoadKg, "475.5");
});

test("shared material options validate standard rows and printable specifications", () => {
  assert.deepEqual(MATERIAL_KEYS, template.materials.map((row) => row.key));
  for (const materialKey of MATERIAL_KEYS) assert.deepEqual(validateEntryOption({ ...material, materialKey }), {});
  assert.ok(validateEntryOption({ ...material, materialKey: "customer" }).materialKey);
  for (const specification of ["", "  ", "x".repeat(181)]) assert.ok(validateEntryOption({ ...material, specification }).specification);
  assert.equal(entryOptionPayload({ ...material, specification: "  Synthetic finish  " }, id).specification, "Synthetic finish");
});

test("saved capacities are employee choices, keep custom values and stay synchronized across pages", () => {
  const original = createQuotation(template);
  original.lift.project.travelHeight = "Saved custom travel";
  const record = entryOptionPayload(input, id);
  const choices = capacityOptions([record]);
  const option = choices.find((row) => row.value === `shared:${id}`);
  const selected = applyCapacityChoice(original, option.value, choices);
  assert.equal(original.lift.project.passengerCount, "");
  assert.equal(selected.lift.project.travelHeight, "Saved custom travel");
  assert.equal(selected.lift.project.passengerCount, "7");
  assert.equal(selected.lift.project.maximumLoadKg, "475.5");
  assert.equal(capacityChoice(selected.lift.project, choices), option.value);
  assert.equal(capacityChoice(selected.lift.project), "custom");
  const resolved = resolveQuotationDocument(selected, catalogue, template);
  assert.equal(resolved.pages.installation.project.capacity, resolved.pages.priceSchedule.capacity);
  const duplicate = entryOptionPayload({ kind: "capacity", passengerCount: "6", maximumLoadKg: "408" }, id);
  assert.equal(capacityOptions([duplicate]).length, capacityOptions().length);
});

test("material choices remain isolated by row and shared technical choices retain canonical resolution", () => {
  const before = JSON.stringify(catalogue);
  const cabin = entryOptionPayload(material, id);
  assert.ok(materialChoices("cabin", template, [cabin]).some((row) => row.value === material.specification));
  assert.ok(!materialChoices("doors", template, [cabin]).some((row) => row.value === material.specification));
  for (const [materialKey, key] of [["controlPanel", "controller"], ["rope", "rope"], ["motors", "motor"]]) {
    const specification = `Synthetic team ${key}`;
    const record = entryOptionPayload({ kind: "material", materialKey, specification }, id);
    assert.ok(technicalChoices(key, catalogue, [record], template).some((row) => row.value === specification));
    const q = setTechnicalOverride(applyConfiguration(createQuotation(template), catalogue.records[0]), key, specification, catalogue, template);
    const resolved = resolveQuotationDocument(q, catalogue, template);
    assert.equal(resolved.pages.installation.technical[key], specification);
    assert.equal(resolved.pages.materials.rows.find((row) => row.key === materialKey).value, specification);
  }
  assert.equal(JSON.stringify(catalogue), before);
});

function fakeClient({ uid = "alice", verified = true, fail = false, onGet } = {}) {
  const store = new Map();
  const writes = [];
  const calls = [];
  const snapshot = (id) => ({ id, exists: () => store.has(id), data: () => store.get(id) });
  const f = {
    collection: (_db, name) => name, doc: (_db, collection, id) => ({ collection, id }),
    documentId: () => "__name__", orderBy: (key) => ({ order: key }), limit: (count) => ({ count }), startAfter: (row) => ({ after: row.id }), query: (...parts) => parts,
    getDocs: async (query) => {
      calls.push(query);
      if (fail) throw Object.assign(new Error("offline"), { code: "unavailable" });
      const after = query.find((part) => part.after)?.after;
      const ids = [...store.keys()].sort().filter((key) => !after || key > after).slice(0, 250);
      return { docs: ids.map(snapshot) };
    },
    serverTimestamp: () => "SERVER_TIME",
    runTransaction: async (_db, callback) => callback({
      get: async (ref) => { if (fail) throw Object.assign(new Error("offline"), { code: "unavailable" }); onGet?.(); return snapshot(ref.id); },
      set: (ref, payload) => { writes.push({ ref, payload }); store.set(ref.id, payload); },
    }),
  };
  return { client: { db: {}, firestore: f, userId: () => uid, isVerified: () => verified }, store, writes, calls };
}

test("team option creation uses the verified author and server time, and retries idempotently", async () => {
  const { client, writes } = fakeClient();
  const service = sharedEntryOptionsService(client);
  const record = await service.add(input, id);
  assert.deepEqual(writes[0], { ref: { collection: "quotationOptions", id }, payload: { ...record, created_by: "alice", created_at: "SERVER_TIME" } });
  assert.deepEqual(await service.add(input, id), record);
  assert.equal(writes.length, 1);
  await assert.rejects(service.add({ ...input, maximumLoadKg: "500" }, id), { code: "options/id-conflict" });
});

test("team options paginate and are visible to another verified account", async () => {
  const fake = fakeClient({ uid: "bob" });
  for (let index = 1; index <= 251; index++) {
    const key = `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
    fake.store.set(key, { ...entryOptionPayload(material, key), created_by: "alice" });
  }
  assert.equal((await sharedEntryOptionsService(fake.client).list()).length, 251);
  assert.equal(fake.calls.length, 2);
});

test("guest, unverified, offline and changed-account saves cannot silently apply an option", async () => {
  for (const settings of [{ uid: null }, { verified: false }]) {
    const fake = fakeClient(settings);
    await assert.rejects(sharedEntryOptionsService(fake.client).add(input, id));
    await assert.rejects(sharedEntryOptionsService(fake.client).list());
    assert.equal(fake.writes.length, 0);
    assert.equal(fake.calls.length, 0);
  }
  await assert.rejects(sharedEntryOptionsService(fakeClient({ fail: true }).client).add(input, id), { code: "unavailable" });
  let current = "alice";
  const fake = fakeClient({ onGet: () => { current = "bob"; } });
  fake.client.userId = () => current;
  await assert.rejects(sharedEntryOptionsService(fake.client).add(input, id), { code: "unauthenticated" });
  assert.equal(fake.writes.length, 0);
});
