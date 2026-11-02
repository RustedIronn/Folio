import { Dialog } from "@base-ui/react/dialog";
import { useState } from "react";

/** QuoteFlow's controlled confirmation-dialog wrapper. */
export default function ConfirmationDialog({ title, description, onDismiss, children }) {
  // Capture before the popup takes focus; the dialog is conditionally mounted
  // without a Dialog.Trigger, so Base UI cannot infer an originating trigger.
  const [origin] = useState(() => typeof document === "undefined" ? null : document.activeElement);
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onDismiss(); }}>
    <Dialog.Portal>
      <Dialog.Backdrop className="modal-backdrop" />
      <Dialog.Popup className="modal" finalFocus={() => origin?.isConnected ? origin : true}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description>{description}</Dialog.Description>
        <Dialog.Close className="sr-only">Close dialog</Dialog.Close>
        <div className="modal-actions">{children}</div>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
