import { useEffect, useState } from "react";
import { getSharedModelsClient, sharedModelsConfigured, sharedModelsError } from "../../services/sharedModels.js";

export default function useEmployeeSession() {
  const configured = sharedModelsConfigured();
  const [client, setClient] = useState(null);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [access, setAccess] = useState(null);
  const [revision, setRevision] = useState(0);
  const [connectionRevision, setConnectionRevision] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!configured) return;
    let active = true, unsubscribe;
    getSharedModelsClient().then((next) => {
      if (!active) return;
      setClient(next);
      unsubscribe = next.onAuthChanged((account) => {
        if (active) { setUser(account); setAuthReady(true); setError(""); }
      }, (cause) => { if (active) { setError(sharedModelsError(cause)); setAuthReady(true); } });
    }).catch((cause) => { if (active) { setError(sharedModelsError(cause)); setAuthReady(true); } });
    return () => { active = false; unsubscribe?.(); };
  }, [configured, connectionRevision]);
  const uid = user?.uid;
  useEffect(() => {
    if (!client || !uid) return;
    let active = true;
    client.refreshUser().then((account) => {
      if (active) { setAccess({ uid, verified: Boolean(account?.emailVerified) }); setError(""); }
    }).catch((cause) => { if (active) { setAccess({ uid, failed: true }); setError(sharedModelsError(cause)); } });
    return () => { active = false; };
  }, [client, uid, revision]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") { if (client) setRevision((value) => value + 1); else setConnectionRevision((value) => value + 1); } };
    window.addEventListener("focus", refresh); window.addEventListener("online", refresh);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); };
  }, [client]);
  const current = access?.uid === uid ? access : null;
  const status = !configured ? "unconfigured" : error && !client ? "error" : !authReady ? "loading" : !user ? "signed-out" : !current ? "loading" : current.failed ? "error" : current.verified ? "ready" : "unverified";
  async function action(method, ...args) {
    if (!client) throw new Error("The connection is not ready. Please try again.");
    try { await client[method](...args); } catch (cause) { throw new Error(sharedModelsError(cause)); }
  }
  async function signOut() {
    setAccess(null);
    try { await action("signOut"); } catch (cause) { setRevision((value) => value + 1); throw cause; }
  }
  return { configured, client, user, status, error, authorized: status === "ready", refresh: () => { if (client) setRevision((value) => value + 1); else setConnectionRevision((value) => value + 1); },
    signIn: (email, password) => action("signIn", email, password), register: (email, password) => action("register", email, password),
    signOut, resendVerification: () => action("resendVerification") };
}
