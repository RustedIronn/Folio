export function assertEmployee(client, uid = client.userId()) {
  if (!uid || client.userId() !== uid) throw Object.assign(new Error("Sign in to your employee account to continue."), { code: "unauthenticated" });
  if (!client.isVerified()) throw Object.assign(new Error("Verify your email to continue."), { code: "permission-denied" });
  return uid;
}

export function quotationDocumentAccess(session, exportReady) {
  const canPreview = Boolean(session.user?.uid && session.user.emailVerified && session.authorized);
  return { canPreview, canDownload: canPreview && Boolean(exportReady) };
}
