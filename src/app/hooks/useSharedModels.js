import { useEffect, useMemo, useState } from "react";
import { sharedModelsError, sharedModelsService } from "../../services/sharedModels.js";

const EMPTY = [];
export default function useSharedModels(session) {
  const [loaded, setLoaded] = useState(null);
  const [revision, setRevision] = useState(0);
  const service = useMemo(() => session.client ? sharedModelsService(session.client) : null, [session.client]);
  const uid = session.user?.uid;
  const authorized = session.authorized;
  useEffect(() => {
    if (!uid || !authorized) return;
    const refresh = () => { if (document.visibilityState === "visible") setRevision((value) => value + 1); };
    window.addEventListener("focus", refresh); window.addEventListener("online", refresh);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); };
  }, [uid, authorized]);
  useEffect(() => {
    if (!service || !uid || !authorized) return;
    let active = true;
    service.list().then((records) => { if (active) setLoaded({ uid, records, revision }); })
      .catch((cause) => { if (active) setLoaded({ uid, records: EMPTY, revision, error: sharedModelsError(cause) }); });
    return () => { active = false; };
  }, [service, uid, authorized, revision]);
  const current = loaded?.uid === uid && authorized ? loaded : null;
  async function add(input, id) {
    if (!service || !authorized) throw new Error("Sign in with a verified employee account before adding a model.");
    try {
      const record = await service.add(input, id);
      setLoaded((value) => value?.uid === uid ? { ...value, records: [...value.records.filter((entry) => entry.sourceRecordId !== record.sourceRecordId), record] } : { uid, records: [record], revision });
      return record;
    } catch (cause) { throw new Error(sharedModelsError(cause)); }
  }
  return { ...session, records: current?.records ?? EMPTY, modelsError: current?.error ?? "", loadingModels: authorized && (!current || current.revision !== revision),
    add, refresh: () => { session.refresh(); setRevision((value) => value + 1); } };
}
