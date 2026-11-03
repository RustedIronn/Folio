import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useState } from "react";
import AccountPanel from "./AccountPanel.jsx";
import Button from "./Button.jsx";
import "../styles/shared-models.css";

export default function AccountDialog({ session, onDismiss, onDone }) {
  const [origin] = useState(() => document.activeElement);
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onDismiss(); }}><Dialog.Portal><Dialog.Backdrop className="modal-backdrop" /><Dialog.Popup className="modal add-model-dialog account-dialog" finalFocus={() => origin?.isConnected ? origin : true}>
    <header className="add-model-header"><div><Dialog.Title>Employee account</Dialog.Title><Dialog.Description>Sign in without losing your quotation details.</Dialog.Description></div><Button variant="tertiary" onClick={onDismiss} aria-label="Close employee account"><X size={19} /></Button></header>
    <AccountPanel session={session} onDone={onDone} />
  </Dialog.Popup></Dialog.Portal></Dialog.Root>;
}
