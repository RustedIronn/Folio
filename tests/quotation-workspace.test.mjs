import assert from "node:assert/strict";
import test from "node:test";
import { createQuotation, serializeDraft, DRAFT_STORAGE_KEY } from "../src/models/quotation/quotation.js";
import { ALTIS_QUOTATION_TEMPLATE as template } from "../src/templates/altisQuotationTemplate.js";
import { createQuotationWorkspace, employeeWorkspaceKey, GUEST_WORKSPACE_KEY, draftSaveLabel, quotationFingerprint } from "../src/models/quotation/workspace.js";
import { quotationDocumentAccess } from "../src/services/employeeAccess.js";

let sequence = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;
const copy = (value) => structuredClone(value);
function storage() {
  const values = new Map();
  return { values, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
}
function example() {
  const q = createQuotation(template);
  q.reference.quotationNumber = "SYNTHETIC-1";
  q.customer.address = "Example customer address";
  q.customer.attentionName = "Synthetic recipient";
  q.lift.catalogueId = "1"; q.lift.catalogueSourceRow = 4;
  q.lift.technicalOverrides = { motor: "Synthetic project motor" };
  q.materials.overrides = { cabin: "Synthetic cabin finish" };
  q.commercial.priceAmount = "125000";
  return q;
}
function cloud() {
  const users = new Map(); let clock = 0;
  const map = (uid) => { if (!users.has(uid)) users.set(uid, new Map()); return users.get(uid); };
  const api = {
    offline: false, writes: 0,
    async list(uid) { if (api.offline) throw Object.assign(new Error("offline"), { code: "unavailable" }); return [...map(uid).values()].sort((a, b) => b.updatedAt - a.updatedAt).map(copy); },
    async get(uid, id) { return copy(map(uid).get(id) ?? null); },
    async save(uid, workspace) {
      if (api.offline) throw Object.assign(new Error("offline"), { code: "unavailable" });
      const existing = map(uid).get(workspace.id);
      if (existing?.lastMutationId === workspace.mutationId) return copy(existing);
      if ((existing?.revision ?? 0) !== workspace.baseRevision) throw Object.assign(new Error("conflict"), { code: "draft/conflict", remote: copy(existing) });
      const next = { id: workspace.id, schemaVersion: 4, ownerUid: uid, quotation: copy(workspace.quotation), revision: (existing?.revision ?? 0) + 1, lastMutationId: workspace.mutationId, createdAt: existing?.createdAt ?? ++clock, updatedAt: ++clock };
      map(uid).set(next.id, next); api.writes++; return copy(next);
    },
    async remove(uid,id,expected) {
      if(api.offline) throw Object.assign(new Error("offline"),{code:"unavailable"});
      const existing=map(uid).get(id);if(!existing)return;
      if(existing.revision !== expected.revision || quotationFingerprint(existing.quotation) !== expected.fingerprint) throw Object.assign(new Error("This draft changed on another device. Refresh and review it before deleting."),{code:"draft/delete-conflict"});
      map(uid).delete(id);
    },
    seed(uid, quotation = example()) { const id = uuid(); map(uid).set(id, { id, schemaVersion: 4, ownerUid: uid, quotation: copy(quotation), revision: 1, lastMutationId: uuid(), createdAt: ++clock, updatedAt: ++clock }); return id; },
  };
  return api;
}
function manager(t, cache = storage(), delay = 100000) {
  const value = createQuotationWorkspace({ storage: cache, template, uuid, delay });
  t.after(() => value.dispose()); return value;
}
async function login(value, api, uid = "alice") { value.setSession({ uid, authorized: true, api }); await value.retry(); }

test("guest inputs and legacy v4 drafts persist locally without any cloud access", (t) => {
  const cache = storage(), q = example(); cache.setItem(DRAFT_STORAGE_KEY, serializeDraft(q));
  const first = manager(t, cache);
  assert.deepEqual(first.getSnapshot().workspace.quotation, q);
  first.update((current) => ({ ...current, commercial: { ...current.commercial, delivery: "Synthetic delivery" } }));
  assert.equal(first.getSnapshot().ownerUid, null);
  assert.equal(first.getSnapshot().status, "local");
  const restored = manager(t, cache);
  assert.deepEqual(restored.getSnapshot().workspace.quotation, first.getSnapshot().workspace.quotation);
  assert.ok(cache.getItem(GUEST_WORKSPACE_KEY));
});

test("sign-in imports every guest field as a separate draft without overwriting saved data", async (t) => {
  const cache = storage(), api = cloud(), oldId = api.seed("alice");
  const old = await api.get("alice", oldId);
  const value = manager(t, cache), q = example(); q.reference.quotationNumber = "GUEST-2";
  value.update(q); await login(value, api);
  assert.deepEqual(value.getSnapshot().workspace.quotation, q);
  assert.notEqual(value.getSnapshot().workspace.id, oldId);
  await value.saveNow();
  assert.equal((await api.list("alice")).length, 2);
  assert.deepEqual(await api.get("alice", oldId), old);
  assert.match(value.getSnapshot().notice, /not been replaced/);
  value.setSession({ uid: null });
  assert.deepEqual(value.getSnapshot().workspace.quotation, createQuotation(template));
  await login(value, api);
  assert.deepEqual(value.getSnapshot().workspace.quotation, q);
  assert.equal((await api.list("alice")).length, 2);
});

test("employee drafts restore across devices and remain isolated on logout and account switching", async (t) => {
  const api = cloud(), cache = storage(), first = manager(t, cache);
  await login(first, api); first.update(example()); await first.saveNow();
  first.setSession({ uid: null });
  assert.equal(first.getSnapshot().workspace.quotation.customer.address, "");
  await login(first, api, "bob");
  assert.equal(first.getSnapshot().workspace.quotation.commercial.priceAmount, "");
  assert.equal(first.getSnapshot().drafts.length, 0);
  assert.ok(cache.getItem(employeeWorkspaceKey("alice")));
  const anotherDevice = manager(t);
  await login(anotherDevice, api);
  assert.deepEqual(anotherDevice.getSnapshot().workspace.quotation, example());
  assert.equal(anotherDevice.getSnapshot().status, "saved");
});

test("offline edits remain recoverable after logout/login and sync when the connection returns", async (t) => {
  const api = cloud(), cache = storage(), value = manager(t, cache);
  await login(value, api); value.update(example()); await value.saveNow();
  api.offline = true;
  value.update((q) => ({ ...q, commercial: { ...q.commercial, priceAmount: "175000" } }));
  await value.saveNow();
  assert.equal(value.getSnapshot().status, "error");
  assert.equal(value.getSnapshot().localSaved, true);
  value.setSession({ uid: null }); await login(value, api);
  assert.equal(value.getSnapshot().workspace.quotation.commercial.priceAmount, "175000");
  api.offline = false; await value.retry(); await value.saveNow();
  const remote = await api.get("alice", value.getSnapshot().workspace.id);
  assert.equal(remote.quotation.commercial.priceAmount, "175000");
});

test("conflicting device edits never overwrite the newer version and can be saved as a copy", async (t) => {
  const api = cloud(), id = api.seed("alice"), left = manager(t), right = manager(t);
  await login(left, api); await login(right, api);
  left.update((q) => ({ ...q, commercial: { ...q.commercial, priceAmount: "150000" } })); await left.saveNow();
  right.update((q) => ({ ...q, customer: { ...q.customer, projectLocation: "Other synthetic location" } })); await right.saveNow();
  assert.equal(right.getSnapshot().status, "conflict");
  assert.equal(right.getSnapshot().workspace.quotation.customer.projectLocation, "Other synthetic location");
  assert.equal((await api.get("alice", id)).quotation.commercial.priceAmount, "150000");
  right.saveCopy(); await right.saveNow();
  assert.equal((await api.list("alice")).length, 2);
  assert.notEqual(right.getSnapshot().workspace.id, id);
  assert.equal((await api.get("alice", id)).quotation.customer.projectLocation, "");
  assert.equal(right.getSnapshot().drafts.find((entry) => entry.id === id).quotation.commercial.priceAmount, "150000");
});

test("using the cloud version keeps a separate recoverable local copy", async (t) => {
  const api = cloud(), id = api.seed("alice"), left = manager(t), right = manager(t);
  await login(left, api); await login(right, api);
  left.update((q) => ({ ...q, customer: { ...q.customer, projectLocation: "Cloud location" } })); await left.saveNow();
  right.update((q) => ({ ...q, customer: { ...q.customer, projectLocation: "Local location" } })); await right.saveNow();
  await right.useCloud();
  assert.equal(right.getSnapshot().workspace.quotation.customer.projectLocation, "Cloud location");
  const backup = right.getSnapshot().drafts.find((entry) => entry.id !== id && entry.quotation.customer.projectLocation === "Local location");
  assert.ok(backup);
  right.open(backup.id); await right.retry();
  assert.equal(right.getSnapshot().workspace.quotation.customer.projectLocation, "Local location");
});

test("edits made during an in-flight save are retained and saved with the next revision", async (t) => {
  const api = cloud(), value = manager(t); await login(value, api);
  const save = api.save; let release;
  api.save = async (...args) => { await new Promise((resolve) => { release = resolve; }); return save(...args); };
  value.update(example()); const pending = value.saveNow();
  value.update((q) => ({ ...q, commercial: { ...q.commercial, priceAmount: "200000" } }));
  release(); await pending;
  assert.equal(value.getSnapshot().workspace.quotation.commercial.priceAmount, "200000");
  assert.equal(value.getSnapshot().workspace.baseRevision, 1);
  api.save = save; await value.saveNow();
  assert.equal((await api.get("alice", value.getSnapshot().workspace.id)).revision, 2);
  assert.equal((await api.get("alice", value.getSnapshot().workspace.id)).quotation.commercial.priceAmount, "200000");
});

test("an acknowledged-on-server save with a lost response is restored without a duplicate write", async (t) => {
  const api = cloud(), value = manager(t); await login(value, api);
  value.update(example()); const save = api.save;
  api.save = async (...args) => { await save(...args); throw new Error("Lost response"); };
  await value.saveNow(); assert.equal(value.getSnapshot().status, "error");
  api.save = save; await value.retry(); await value.saveNow();
  assert.equal(api.writes, 1); assert.equal(value.getSnapshot().status, "saved");
});

test("a focus refresh waits for its own save acknowledgement instead of creating a false conflict", async (t) => {
  const api = cloud(), value = manager(t); api.seed("alice"); await login(value, api);
  const save = api.save; let release;
  api.save = async (...args) => { await new Promise((resolve) => { release = resolve; }); return save(...args); };
  value.update((q) => ({ ...q, commercial: { ...q.commercial, priceAmount: "150000" } }));
  const saving = value.saveNow();
  value.update((q) => ({ ...q, commercial: { ...q.commercial, priceAmount: "175000" } }));
  const refresh = value.retry();
  api.save = save; release(); await saving; await refresh;
  assert.equal(value.getSnapshot().conflict, null);
  assert.equal(value.getSnapshot().workspace.baseRevision, 2);
  assert.equal(value.getSnapshot().workspace.quotation.commercial.priceAmount, "175000");
  await value.saveNow();
  assert.equal((await api.get("alice", value.getSnapshot().workspace.id)).revision, 3);
});

test("autosave is debounced and reset starts a new draft while keeping existing cloud data", async (t) => {
  const api = cloud(), value = manager(t, storage(), 10); await login(value, api);
  value.update(example()); value.update((q) => ({ ...q, customer: { ...q.customer, projectLocation: "Latest input" } }));
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(api.writes, 1);
  value.startNew(); await value.retry();
  assert.equal(value.getSnapshot().workspace.quotation.reference.quotationNumber, "");
  assert.equal((await api.list("alice")).length, 1);
});

test("unverified accounts cannot sync and guest/employee PDF permissions remain distinct", async (t) => {
  const api = cloud(), value = manager(t); value.update(example());
  value.setSession({ uid: "alice", authorized: false, api }); await value.saveNow();
  assert.equal(api.writes, 0);
  assert.deepEqual(quotationDocumentAccess({ user: null, authorized: false }, true), { canPreview: false, canDownload: false });
  assert.deepEqual(quotationDocumentAccess({ user: { uid: "alice", emailVerified: false }, authorized: false }, true), { canPreview: false, canDownload: false });
  assert.deepEqual(quotationDocumentAccess({ user: { uid: "alice", emailVerified: true }, authorized: true }, false), { canPreview: true, canDownload: false });
  assert.equal(quotationDocumentAccess({ user: { uid: "alice", emailVerified: true }, authorized: true }, true).canDownload, true);
});

test("late cloud responses cannot replace the next user's quotation", async (t) => {
  const api = cloud(), value = manager(t); api.seed("alice");
  let release; const list = api.list;
  api.list = async (uid) => uid === "alice" ? new Promise((resolve) => { release = () => list(uid).then(resolve); }) : list(uid);
  value.setSession({ uid: "alice", authorized: true, api });
  await login(value, api, "bob");
  release(); await new Promise((resolve) => setImmediate(resolve));
  assert.equal(value.getSnapshot().ownerUid, "bob");
  assert.equal(value.getSnapshot().workspace.quotation.customer.address, "");
});

test("storage failure is visible without discarding in-memory guest input", (t) => {
  const cache = storage(); cache.setItem = () => { throw new Error("storage full"); };
  const value = manager(t, cache); value.update(example());
  assert.equal(value.getSnapshot().localSaved, false);
  assert.equal(value.getSnapshot().workspace.quotation.customer.address, example().customer.address);
  assert.match(draftSaveLabel(value.getSnapshot()), /Unable/);
});

test("unreadable local workspaces are backed up before replacement", async (t) => {
  const cache = storage(), original = '{"unreadable":';
  cache.setItem(GUEST_WORKSPACE_KEY, original);
  const value = manager(t, cache); value.update(example());
  const backup = [...cache.values.entries()].find(([key]) => key.startsWith(`${GUEST_WORKSPACE_KEY}:recovery:`));
  assert.equal(backup[1], original);
  assert.match(value.getSnapshot().notice, /backed up/);
  const malformed = JSON.stringify({ version: 1, activeId: "bad", drafts: { bad: { quotation: {} } } });
  cache.setItem(employeeWorkspaceKey("alice"), malformed);
  await login(value, cloud());
  assert.ok([...cache.values.entries()].some(([key, raw]) => key.startsWith(`${employeeWorkspaceKey("alice")}:recovery:`) && raw === malformed));
});

test("legacy version-one input remains available through the guest-to-employee transition", async (t) => {
  const cache = storage();
  cache.setItem("quoteflow:draft:v1", JSON.stringify({ schemaVersion: 1, quotation: { metadata: { referenceNumber: "AE/QUO/LEGACY/VJA/2024-25", date: "2024-12-01" }, customer: { address: "Synthetic legacy address", attention: "Synthetic recipient" }, lifts: [{ catalogueId: "1", catalogueSourceRow: 4, specificationOverrides: { motor: "Legacy synthetic motor" } }], commercial: { priceAmount: "100000", payment: {} } } }));
  const value = manager(t, cache), before = copy(value.getSnapshot().workspace.quotation), api = cloud();
  assert.equal(before.reference.quotationNumber, "LEGACY");
  assert.equal(before.lift.technicalOverrides.motor, "Legacy synthetic motor");
  await login(value, api); await value.saveNow();
  assert.deepEqual((await api.get("alice", value.getSnapshot().workspace.id)).quotation, before);
});

test("agreement extensions survive guest import, cloud save and another device", async (t) => {
  const cache = storage(), api = cloud(), value = manager(t,cache), q = example();
  q.document.type = "agreement";
  q.reference.officeCodeMode = "custom"; q.reference.officeCode = "TEST"; q.reference.customOfficeCode = "TEST";
  q.materials.customRows = [{id:"synthetic-row",name:"Synthetic trim",value:"Synthetic finish"}];
  q.commercial.additionalEntry = {label:"Site note",value:"Information only"};
  value.update(q); const restoredGuest = manager(t,cache);
  assert.deepEqual(restoredGuest.getSnapshot().workspace.quotation,q);
  await login(value,api); await value.saveNow();
  const another = manager(t); await login(another,api);
  assert.deepEqual(another.getSnapshot().workspace.quotation,q);
  value.setSession({uid:null,authorized:false}); await login(value,api);
  assert.deepEqual(value.getSnapshot().workspace.quotation,q);
});

test("deleting the selected draft preserves other drafts and never autosaves it back",async(t)=>{
 const api=cloud(),keep=api.seed("alice"),remove=api.seed("alice"),cache=storage(),value=manager(t,cache);
 await login(value,api);assert.equal(value.getSnapshot().workspace.id,remove);
 await value.deleteDraft(remove);assert.equal(await api.get("alice",remove),null);assert.ok(await api.get("alice",keep));
 assert.notEqual(value.getSnapshot().workspace.id,remove);assert.equal(value.getSnapshot().workspace.quotation.customer.address,"");
 assert.ok(!value.getSnapshot().drafts.some((entry)=>entry.id === remove));
 await value.saveNow();await value.retry();assert.equal(await api.get("alice",remove),null);
 const restored=manager(t,cache);await login(restored,api);assert.ok(!restored.getSnapshot().drafts.some((entry)=>entry.id === remove));
});
test("deleting a different draft leaves current input and other employee drafts intact",async(t)=>{
 const api=cloud(),remove=api.seed("alice"),keep=api.seed("alice"),bob=api.seed("bob"),value=manager(t);
 await login(value,api);value.update((q)=>({...q,customer:{...q.customer,projectLocation:"Current synthetic edits"}}));
 const before=copy(value.getSnapshot().workspace);await value.deleteDraft(remove);
 assert.deepEqual(value.getSnapshot().workspace,before);assert.ok(await api.get("alice",keep));assert.ok(await api.get("bob",bob));
});
test("offline and stale-revision deletion failures keep both local and cloud data",async(t)=>{
 const api=cloud(),id=api.seed("alice"),left=manager(t),right=manager(t);await login(left,api);await login(right,api);
 const before=copy(left.getSnapshot().workspace);api.offline=true;await assert.rejects(left.deleteDraft(id),/offline/);assert.deepEqual(left.getSnapshot().workspace,before);assert.ok(await api.get("alice",id));
 api.offline=false;right.update((q)=>({...q,customer:{...q.customer,projectLocation:"Newer device version"}}));await right.saveNow();
 await assert.rejects(left.deleteDraft(id),/changed on another device/);assert.deepEqual(left.getSnapshot().workspace,before);assert.ok(await api.get("alice",id));
 await left.retry();await left.deleteDraft(id);assert.equal(await api.get("alice",id),null);
});
test("guests and unverified employees cannot request draft deletion",async(t)=>{
 const value=manager(t),api=cloud(),id=api.seed("alice");await assert.rejects(value.deleteDraft(id),/verified account/);
 await login(value,api);value.setSession({uid:"alice",authorized:false,api});await assert.rejects(value.deleteDraft(id),/verified account/);assert.ok(await api.get("alice",id));
});
test("deletion waits for an in-flight autosave and removes its acknowledged version",async(t)=>{
 const api=cloud(),value=manager(t);await login(value,api);value.update(example());
 const originalSave=api.save;let release;const waiting=new Promise((resolve)=>{release=resolve;});api.save=async(...args)=>{await waiting;return originalSave(...args);};
 const saving=value.saveNow(),id=value.getSnapshot().workspace.id;const deleting=value.deleteDraft(id);assert.equal(value.getSnapshot().deletingDraftId,id);
 release();await saving;await deleting;assert.equal(await api.get("alice",id),null);await value.saveNow();assert.equal(await api.get("alice",id),null);
});
test("another device preserves its cached copy as a conflict instead of recreating a deleted draft",async(t)=>{
 const api=cloud(),id=api.seed("alice"),left=manager(t),right=manager(t);await login(left,api);await login(right,api);await left.deleteDraft(id);await right.retry();
 assert.equal(right.getSnapshot().status,"conflict");await right.saveNow();assert.equal(await api.get("alice",id),null);
});
