import { useState } from "react";
import Button from "./Button.jsx";
import Field from "./Field.jsx";

export default function AccountPanel({ session, onDone }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [mode, setMode] = useState("signin");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(action) {
    if (busy) return;
    setBusy(true); setError("");
    try { await action(); } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }
  async function authenticate(event) {
    event.preventDefault();
    if (mode === "register" && password !== confirmation) { setError("The passwords do not match."); document.getElementById("employee-confirm-password")?.focus(); return; }
    await run(async () => {
      if (mode === "register") { await session.register(email, password); setSent(true); }
      else await session.signIn(email, password);
      setPassword(""); setConfirmation("");
    });
  }
  if (session.status === "ready") return <div className="shared-model-state"><h3>Signed in</h3><p>{session.user.email}</p><p>Your quotation entries are retained. Cloud drafts are private to this account.</p><Button onClick={onDone}>Continue to workspace</Button></div>;
  if (session.status === "unverified" || (sent && session.status === "signed-out")) return <div className="shared-model-state"><h3>{sent ? "Check your email" : "Verify your email"}</h3><p>{sent ? `Open the confirmation link sent to ${session.user?.email || email}.` : `Confirm ${session.user?.email || email} to save quotations, add models, and generate PDFs.`}</p><p>After confirming, return here and select “I’ve verified my email”. No administrator approval is needed.</p>{error && <p className="field-error" role="alert">{error}</p>}<div className="modal-actions"><Button variant="tertiary" disabled={busy} onClick={() => run(async () => { if (session.user) await session.signOut(); setSent(false); setMode("signin"); })}>Back to sign in</Button>{session.user && <><Button variant="secondary" loading={busy} onClick={() => run(async () => { await session.resendVerification(); setSent(true); })}>Resend email</Button><Button disabled={busy} onClick={session.refresh}>I’ve verified my email</Button></>}</div></div>;
  if (session.status !== "signed-out") return <div className="shared-model-state" role="status"><p>{session.status === "loading" ? "Checking your employee account…" : session.status === "unconfigured" ? "Employee accounts are not connected yet. Your quotation can still be entered and saved on this device." : session.error || "The employee connection could not be checked. Your entries are preserved."}</p>{session.status === "error" && <Button onClick={session.refresh}>Try again</Button>}</div>;
  return <form onSubmit={authenticate} className="employee-signin">
    <div className="employee-auth-modes" aria-label="Account access"><Button variant={mode === "signin" ? "secondary" : "tertiary"} aria-pressed={mode === "signin"} disabled={busy} onClick={() => { setMode("signin"); setError(""); }}>Sign in</Button><Button variant={mode === "register" ? "secondary" : "tertiary"} aria-pressed={mode === "register"} disabled={busy} onClick={() => { setMode("register"); setError(""); }}>Create account</Button></div>
    <p>{mode === "register" ? "Use your own email address. Verified accounts can use the employee workspace without an approval step." : "Sign in to save private quotations across devices, add lift models, and generate PDFs."}</p>
    <p className="field-hint">Your guest entries will be kept as a separate quotation. Existing saved drafts will not be overwritten.</p>
    <Field id="employee-email" label="Email address" required><input id="employee-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
    <Field id="employee-password" label="Password" required hint={mode === "register" ? "Use at least 8 characters." : undefined}><input id="employee-password" type="password" minLength={mode === "register" ? 8 : undefined} autoComplete={mode === "register" ? "new-password" : "current-password"} required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
    {mode === "register" && <Field id="employee-confirm-password" label="Confirm password" required><input id="employee-confirm-password" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></Field>}
    {error && <p className="field-error" role="alert">{error}</p>}
    <footer className="add-model-actions"><Button type="submit" loading={busy}>{mode === "register" ? "Create account & verify email" : "Sign in"}</Button></footer>
  </form>;
}
