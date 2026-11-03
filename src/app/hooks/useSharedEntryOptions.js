import { useEffect, useMemo, useState } from "react";
import { entryOptionsError, sharedEntryOptionsService } from "../../services/sharedEntryOptions.js";

const EMPTY = [];
export default function useSharedEntryOptions(session) {
  const [loaded, setLoaded] = useState(null);
  const [revision, setRevision] = useState(0);
  const service = useMemo(() => session.client ? sharedEntryOptionsService(session.client) : null, [session.client]);
  const uid = session.user?.uid;
  const authorized = session.authorized;
  useEffect(() => {
    if (!uid || !authorized) return;
    const refresh = () => { if (document.visibilityState === "visible") setRevision((value) => value + 1); };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); };
  }, [uid, authorized]);
  useEffect(() => {
    if (!service || !uid || !authorized) return;
    let active = true;
    service.list().then((records) => {
      if (active) setLoaded((previous) => ({ uid, revision, records: [...new Map([...(previous?.uid === uid ? previous.records : EMPTY), ...records].map((record) => [record.id, record])).values()] }));
    }).catch((cause) => {
      if (active) setLoaded((previous) => ({ uid, revision, records: previous?.uid === uid ? previous.records : EMPTY, error: entryOptionsError(cause) }));
    });
    return () => { active = false; };
  }, [service, uid, authorized, revision]);
  const current = authorized && loaded?.uid === uid ? loaded : null;
  async function add(input, id) {
    if (!service || !authorized) throw new Error("Sign in with a verified account before saving a team option.");
    try {
      const record = await service.add(input, id);
      setLoaded((previous) => ({ uid, revision, records: [...(previous?.uid === uid ? previous.records.filter((entry) => entry.id !== record.id) : EMPTY), record] }));
      return record;
    } catch (cause) { throw new Error(entryOptionsError(cause)); }
  }
  return { records: current?.records ?? EMPTY, error: current?.error ?? "", loading: authorized && (!current || current.revision !== revision), add,
    refresh: () => setRevision((value) => value + 1) };
}
