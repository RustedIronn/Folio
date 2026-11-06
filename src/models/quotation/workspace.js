import { createQuotation, DRAFT_STORAGE_KEY, loadDraft } from "./quotation.js";

export const GUEST_WORKSPACE_KEY = "quoteflow:guest-workspace:v1";
export const employeeWorkspaceKey = (uid) => `quoteflow:employee-workspace:v1:${encodeURIComponent(uid)}`;
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
export function isQuotationDraft(value) {
  return value?.schemaVersion === 4 && [value.reference, value.metadata, value.customer, value.lift, value.materials, value.commercial, value.document,
    value.lift?.project, value.lift?.installation, value.lift?.technicalOverrides, value.materials?.overrides, value.commercial?.payment,
    value.lift?.installation?.shaft, value.lift?.installation?.car, value.lift?.installation?.cabinOpening].every(object);
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (object(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}
export const quotationFingerprint = (quotation) => JSON.stringify(canonical(quotation));
export function draftSaveLabel(state) {
  if (!state.localSaved) return state.ownerUid && state.status === "saved" ? "Saved to account · local backup unavailable" : "Unable to save a local copy";
  if (!state.ownerUid) return "Guest draft saved on this device";
  return ({ saved: "Saved to your account", saving: "Saving to your account…", pending: "Saving to your account…", loading: "Opening saved quotations…", conflict: "Saved locally · review conflict", error: "Saved locally · cloud unavailable", local: "Saved on this device" })[state.status] ?? "Saved on this device";
}
const clone = (value) => structuredClone(value);

export function createQuotationWorkspace({ storage, template, uuid = () => crypto.randomUUID(), delay = 800 }) {
  const listeners = new Set();
  let timer, epoch = 0, saving = null, deleting = null, identity = null, service = null, canSync = false, disposed = false, needsRestore = false;
  let registry = { version: 1, activeId: null, drafts: {} };
  let remoteDrafts = [];
  let localFailure = false;
  let recoveryNotice = "";
  const preserved = new Set(), blocked = new Set();
  function preserve(key) {
    if (preserved.has(key)) return;
    try {
      const raw = storage.getItem(key);
      if (raw !== null) { storage.setItem(`${key}:recovery:${uuid()}`, raw); recoveryNotice = "An unreadable local draft was backed up on this device for recovery."; }
      preserved.add(key);
    } catch { blocked.add(key); localFailure = true; }
  }
  function read(key) {
    let raw;
    try { raw = storage.getItem(key); } catch { blocked.add(key); localFailure = true; return null; }
    try { return JSON.parse(raw); } catch { preserve(key); return null; }
  }
  function write(key, value) { if (blocked.has(key)) return false; try { storage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
  const fingerprint = quotationFingerprint;
  function fresh(quotation = createQuotation(template)) {
    return { id: uuid(), quotation: clone(quotation), baseRevision: 0, syncedFingerprint: fingerprint(createQuotation(template)), mutationId: uuid() };
  }
  function valid(workspace) { return workspace && typeof workspace.id === "string" && isQuotationDraft(workspace.quotation) && Number.isInteger(workspace.baseRevision) && workspace.baseRevision >= 0 && typeof workspace.mutationId === "string"; }
  function guestFromStorage() {
    const cached = read(GUEST_WORKSPACE_KEY);
    if (valid(cached)) return cached;
    if (cached !== null) preserve(GUEST_WORKSPACE_KEY);
    let legacy;
    try { legacy = loadDraft(storage, template); } catch { localFailure = true; }
    return fresh(isQuotationDraft(legacy) ? legacy : createQuotation(template));
  }
  let guest = guestFromStorage();
  let state = { ownerUid: null, workspace: guest, status: "local", deletingDraftId: null, localSaved: !localFailure, error: "", notice: recoveryNotice, drafts: [], conflict: null };
  let guestView = state;
  const dirty = (workspace) => fingerprint(workspace.quotation) !== workspace.syncedFingerprint;
  const meaningful = (workspace) => fingerprint(workspace.quotation) !== fingerprint(createQuotation(template));
  function emit(next = {}) { if (disposed) return; state = { ...state, ...next }; if (!state.ownerUid) guestView = state; for (const listener of listeners) listener(); }
  function entries(remote = remoteDrafts) {
    const all = new Map(remote.map((entry) => [entry.id, entry]));
    for (const entry of Object.values(registry.drafts)) if (valid(entry) && (entry.baseRevision > 0 || meaningful(entry) || dirty(entry)) && (dirty(entry) || !all.has(entry.id) || entry.baseRevision >= (all.get(entry.id).revision ?? 0))) all.set(entry.id, { ...entry, localOnly: entry.baseRevision === 0, pending: dirty(entry) });
    return [...all.values()];
  }
  function persist() {
    let saved;
    if (identity) {
      registry = { ...registry, activeId: state.workspace.id, drafts: { ...registry.drafts, [state.workspace.id]: clone(state.workspace) } };
      saved = write(employeeWorkspaceKey(identity), registry);
    } else { guest = clone(state.workspace); saved = write(GUEST_WORKSPACE_KEY, guest); }
    emit({ localSaved: saved, ...(identity ? { drafts: entries() } : {}) });
  }
  function cancelTimer() { clearTimeout(timer); }
  function schedule() {
    cancelTimer();
    if (!deleting && identity && canSync && service && dirty(state.workspace) && !state.conflict && state.status !== "loading") timer = setTimeout(() => { void save(); }, delay);
  }
  function fromCloud(remote) {
    return { id: remote.id, quotation: clone(remote.quotation), baseRevision: remote.revision, syncedFingerprint: fingerprint(remote.quotation), mutationId: remote.lastMutationId };
  }
  function finishGuestImport(workspace) {
    if (!workspace.importSourceId) return;
    const current = read(GUEST_WORKSPACE_KEY);
    if (current?.id === workspace.importSourceId && fingerprint(current.quotation) === workspace.importFingerprint) {
      guest = fresh();
      if (write(GUEST_WORKSPACE_KEY, guest)) {
        try { storage.removeItem(DRAFT_STORAGE_KEY); } catch { /* The namespaced guest draft takes precedence. */ }
        guestView = { ...guestView, workspace: guest, status: "local", localSaved: true, error: "", notice: "", conflict: null, drafts: [] };
      }
    }
  }
  function reconcile(remote) {
    const workspace = state.workspace;
    if (remote && remote.lastMutationId === workspace.mutationId && fingerprint(remote.quotation) === fingerprint(workspace.quotation)) {
      const next = { ...workspace, baseRevision: remote.revision, syncedFingerprint: fingerprint(remote.quotation) };
      emit({ workspace: next, status: "saved", conflict: null, error: "" }); persist(); finishGuestImport(next); return;
    }
    if (dirty(workspace) && ((remote?.revision ?? 0) !== workspace.baseRevision)) {
      emit({ status: "conflict", conflict: { remote }, error: "Another device changed this quotation. Your local edits have been kept." }); return;
    }
    if (!dirty(workspace) && remote) { emit({ workspace: fromCloud(remote), status: "saved", conflict: null, error: "" }); persist(); return; }
    if (!remote && workspace.baseRevision > 0) { emit({ status: "conflict", conflict: { remote: null }, error: "This quotation is no longer in the cloud. Your local copy has been kept." }); return; }
    emit({ status: dirty(workspace) ? "pending" : workspace.baseRevision ? "saved" : "local", error: "", conflict: null }); schedule();
  }
  async function restore() {
    if (deleting || !identity || !canSync || !service) return;
    // A focus/online refresh must not invalidate our own in-flight acknowledgement.
    // Let it advance the base revision before comparing with the cloud again.
    if (saving?.epoch === epoch && saving.request) {
      const waitingEpoch = epoch;
      try { await saving.request; } catch { /* Reconcile a possibly committed write below. */ }
      if (waitingEpoch !== epoch || !canSync) return;
    }
    const token = ++epoch, uid = identity, id = state.workspace.id;
    emit({ status: "loading", error: "" });
    try {
      const remote = await service.list(uid);
      if (disposed || token !== epoch || uid !== identity) return;
      remoteDrafts = remote;
      emit({ drafts: entries() });
      const current = remote.find((entry) => entry.id === id);
      if (!current && state.workspace.preferLatest && !meaningful(state.workspace) && !dirty(state.workspace) && state.workspace.baseRevision === 0 && remote.length) {
        emit({ workspace: fromCloud(remote[0]), status: "saved" }); persist();
      } else reconcile(current ?? null);
    } catch (cause) {
      if (token === epoch && uid === identity) emit({ status: "error", error: cloudError(cause) });
    }
  }
  async function save() {
    if (deleting || saving?.epoch === epoch || !identity || !canSync || !service || !dirty(state.workspace) || state.conflict || state.status === "loading") return;
    cancelTimer();
    const token = epoch, uid = identity, sent = clone(state.workspace), api = service;
    const operation = { epoch: token }; saving = operation;
    emit({ status: "saving", error: "" });
    try {
      operation.request = api.save(uid, sent);
      const remote = await operation.request;
      if (disposed || token !== epoch || uid !== identity || sent.id !== state.workspace.id) return;
      remoteDrafts = [remote, ...remoteDrafts.filter((entry) => entry.id !== remote.id)];
      const next = { ...state.workspace, baseRevision: remote.revision, syncedFingerprint: fingerprint(sent.quotation) };
      emit({ workspace: next, status: dirty(next) ? "pending" : "saved", error: "" }); persist(); finishGuestImport(sent);
    } catch (cause) {
      if (token !== epoch || uid !== identity) return;
      if (cause.code === "draft/conflict") {
        if (cause.remote) remoteDrafts = [cause.remote, ...remoteDrafts.filter((entry) => entry.id !== cause.remote.id)];
        emit({ status: "conflict", conflict: { remote: cause.remote ?? null }, error: "Another device changed this quotation. Your local edits have been kept." });
      }
      else emit({ status: "error", error: cloudError(cause) });
    } finally { if (saving === operation) saving = null; if (token === epoch && state.status === "pending") schedule(); }
  }
  function setSession({ uid = null, authorized = false, api = null }) {
    if (identity === uid) {
      const regained = !canSync && authorized;
      canSync = authorized; service = api;
      if (!authorized) { cancelTimer(); if (identity && state.status !== "local") emit({ status: "local" }); }
      else if (regained || needsRestore) { needsRestore = false; void restore(); }
      return;
    }
    cancelTimer(); ++epoch; needsRestore = false; identity = uid; canSync = authorized; service = api; remoteDrafts = [];
    if (!uid) {
      registry = { version: 1, activeId: null, drafts: {} };
      guest = guestFromStorage();
      emit({ ownerUid: null, workspace: guest, status: "local", drafts: [], conflict: null, error: "", notice: recoveryNotice }); persist(); return;
    }
    const cached = read(employeeWorkspaceKey(uid));
    if (cached && (cached.version !== 1 || !object(cached.drafts) || Object.values(cached.drafts).some((entry) => !valid(entry)))) preserve(employeeWorkspaceKey(uid));
    registry = cached?.version === 1 && object(cached.drafts) ? { ...cached, drafts: Object.fromEntries(Object.entries(cached.drafts).filter(([, value]) => valid(value))) } : { version: 1, activeId: null, drafts: {} };
    const incoming = guestFromStorage();
    if (!valid(read(GUEST_WORKSPACE_KEY))) write(GUEST_WORKSPACE_KEY, incoming);
    let workspace = registry.drafts[registry.activeId];
    let notice = recoveryNotice;
    if (meaningful(incoming)) {
      workspace = Object.values(registry.drafts).find((entry) => entry.importSourceId === incoming.id && entry.importFingerprint === fingerprint(incoming.quotation));
      if (!workspace) {
        workspace = { ...fresh(incoming.quotation), id: registry.drafts[incoming.id] ? uuid() : incoming.id, importSourceId: incoming.id, importFingerprint: fingerprint(incoming.quotation), mutationId: incoming.mutationId };
      }
      notice = "Your guest entries are kept as a separate quotation. Existing saved quotations have not been replaced.";
    }
    emit({ ownerUid: uid, workspace: workspace ?? { ...fresh(), preferLatest: true }, status: authorized ? "loading" : "local", drafts: [], conflict: null, error: "", notice }); persist();
    if (authorized) void restore();
  }
  function update(value) {
    if (deleting) return;
    const quotation = typeof value === "function" ? value(state.workspace.quotation) : value;
    if (!isQuotationDraft(quotation)) throw new Error("The quotation could not be updated safely.");
    emit({ workspace: { ...state.workspace, quotation, mutationId: uuid(), preferLatest: false }, status: state.conflict ? "conflict" : state.status === "loading" ? "loading" : identity && canSync ? "pending" : "local" });
    persist(); schedule();
  }
  function open(id) {
    if (deleting) return;
    const entry = state.drafts.find((draft) => draft.id === id);
    if (!identity || !entry) return;
    cancelTimer(); ++epoch;
    const cached = registry.drafts[id];
    const useCached = cached && (dirty(cached) || cached.baseRevision >= (entry.revision ?? entry.baseRevision ?? 0));
    emit({ workspace: useCached ? cached : fromCloud(entry), conflict: null, error: "", notice: "", status: "local" }); persist();
    if (canSync) void restore();
  }
  function startNew() {
    if (deleting) return;
    cancelTimer(); ++epoch;
    if (!identity) for (const key of [DRAFT_STORAGE_KEY, "quoteflow:draft:v3", "quoteflow:draft:v2", "quoteflow:draft:v1"]) { try { storage.removeItem(key); } catch { /* The new namespaced draft remains authoritative. */ } }
    emit({ workspace: fresh(), status: "local", conflict: null, error: "", notice: identity ? "New quotation started. Existing cloud drafts are still available in Saved quotations." : "" }); persist();
  }
  function saveCopy() {
    if (deleting) return;
    if (!identity) return;
    const previous = state.conflict?.remote;
    if (previous) registry.drafts[previous.id] = fromCloud(previous);
    cancelTimer(); ++epoch;
    emit({ workspace: { ...fresh(state.workspace.quotation), syncedFingerprint: "" }, status: "pending", conflict: null, error: "", notice: "Your version is being saved as a separate quotation. The other version is unchanged." }); persist(); schedule();
  }
  async function useCloud() {
    if (deleting) return;
    if (!identity || !service || !state.conflict) return;
    const token = epoch, id = state.workspace.id, uid = identity;
    try {
      const remote = await service.get(uid, id);
      if (token !== epoch || uid !== identity) return;
      if (!remote) throw new Error("The cloud version is unavailable. Save your local version as a copy instead.");
      remoteDrafts = [remote, ...remoteDrafts.filter((entry) => entry.id !== remote.id)];
      const backup = fresh(state.workspace.quotation);
      registry.drafts[backup.id] = backup;
      emit({ workspace: fromCloud(remote), status: "saved", conflict: null, error: "", notice: "Cloud version restored. Your local edits are kept as a separate draft on this device." }); persist();
    } catch (cause) { if (token === epoch) emit({ error: cause.message }); }
  }
  async function deleteDraft(id) {
    if (deleting) throw new Error("A draft is already being deleted.");
    if (!identity || !canSync || !service) throw new Error("Sign in with a verified account before deleting a draft.");
    if (state.status === "loading") throw new Error("Wait for saved documents to finish loading.");
    if (!state.drafts.some((entry) => entry.id === id)) throw new Error("Choose a saved draft to delete.");
    const uid=identity, api=service, operation={uid,id};
    deleting=operation;cancelTimer();emit({deletingDraftId:id});
    try {
      // Wait for an already-dispatched save before removing its document so its
      // acknowledgement cannot recreate a deleted local entry.
      if (saving?.request) { try { await saving.request; } catch { /* Compare the cloud revision below. */ } }
      if (uid !== identity || !canSync || disposed) throw new Error("The employee account changed. No local draft was removed.");
      ++epoch;
      const cached=registry.drafts[id];
      const remote=remoteDrafts.find((entry) => entry.id === id);
      const revision=cached?.baseRevision ?? remote?.revision ?? 0;
      const expectedFingerprint=cached?.baseRevision ? cached.syncedFingerprint : remote ? fingerprint(remote.quotation) : fingerprint(cached?.quotation ?? state.workspace.quotation);
      await api.remove(uid,id,{revision,fingerprint:expectedFingerprint});
      if (uid !== identity || disposed) return;
      if (cached) finishGuestImport(cached);
      remoteDrafts=remoteDrafts.filter((entry) => entry.id !== id);
      const remaining={...registry.drafts};delete remaining[id];
      registry={...registry,drafts:remaining};
      const active=state.workspace.id === id;
      emit({...(active ? {workspace:fresh(),status:"local",conflict:null,error:""} : {}),notice:"Draft deleted. Other saved documents are unchanged."});
      persist();
    } finally {
      if (deleting === operation) { deleting=null;emit({deletingDraftId:null});schedule(); }
    }
  }
  return {
    subscribe(listener) { disposed = false; listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => state, getGuestSnapshot: () => guestView,
    setSession, update, open, startNew, deleteDraft, saveCopy, useCloud, retry: restore, saveNow: save,
    dispose() { disposed = true; needsRestore = true; cancelTimer(); ++epoch; },
  };
}

function cloudError(cause) {
  if (cause.code === "permission-denied") return "Cloud access could not be authorized. Check account verification and the Firestore draft rules.";
  if (["unavailable", "deadline-exceeded"].includes(cause.code)) return "Cloud drafts could not be reached. Check your connection and retry.";
  if (cause.code === "unauthenticated") return "Sign in again to resume cloud saving.";
  return cause.message || "Cloud saving is unavailable.";
}
