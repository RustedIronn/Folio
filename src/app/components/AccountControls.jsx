import { useState } from "react";
import Button from "./Button.jsx";

export default function AccountControls({ workflow }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const session = workflow.employee;
  return <div className="account-controls">{session.user ? <><span className="account-email" title={session.user.email}>{session.user.email}</span>{!session.authorized && <Button variant="secondary" onClick={() => workflow.setAuthIntent("workspace")}>{session.status === "unverified" ? "Verify email" : session.status === "error" ? "Reconnect account" : "Employee account"}</Button>}<Button variant="tertiary" loading={busy} onClick={async () => { setBusy(true); setError(""); try { await session.signOut(); } catch (cause) { setError(cause.message); } finally { setBusy(false); } }}>Sign out</Button></> : <Button variant="primary" onClick={() => workflow.setAuthIntent("workspace")}>Sign in</Button>}{error && <span className="field-error" role="alert">{error}</span>}</div>;
}
