import { extensionDefaults } from "../../models/quotation/quotationExtensions.js";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createQuotationWorkspace } from "../../models/quotation/workspace.js";
import { quotationDraftsService } from "../../services/quotationDrafts.js";
import { ALTIS_QUOTATION_TEMPLATE as template } from "../../templates/altisQuotationTemplate.js";

export default function useQuotationDrafts(session) {
  const [manager] = useState(() => {
    let storage;
    try { storage = window.localStorage; } catch { storage = { getItem() { throw new Error("Local storage unavailable"); }, setItem() { throw new Error("Local storage unavailable"); }, removeItem() { throw new Error("Local storage unavailable"); } }; }
    return createQuotationWorkspace({ storage, template });
  });
  const state = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
  const api = useMemo(() => session.client ? quotationDraftsService(session.client) : null, [session.client]);
  const uid = session.user?.uid ?? null;
  const authorized = session.authorized;
  useEffect(() => { manager.setSession({ uid, authorized, api }); }, [manager, uid, authorized, api]);
  useEffect(() => {
    const retry = () => { if (document.visibilityState === "visible") void manager.retry(); };
    window.addEventListener("focus", retry); window.addEventListener("online", retry);
    return () => { window.removeEventListener("focus", retry); window.removeEventListener("online", retry); manager.dispose(); };
  }, [manager]);
  // Hide the previous employee's data immediately, before transition effects run.
  const visible = state.ownerUid === uid ? state : manager.getGuestSnapshot();
  // Normalize additive document options for local and cloud drafts without writing
  // a remote revision until the employee actually edits the document.
  const quotation = useMemo(() => extensionDefaults(visible.workspace.quotation, template), [visible.workspace.quotation]);
  function setQuotation(value) {
    manager.setSession({ uid, authorized, api });
    manager.update((current) => typeof value === "function" ? value(extensionDefaults(current, template)) : extensionDefaults(value, template));
  }
  function startNew() { manager.setSession({ uid, authorized, api }); manager.startNew(); }
  return { ...visible, manager, startNew, quotation, setQuotation };
}
