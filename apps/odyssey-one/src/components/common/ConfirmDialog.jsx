import { createPortal } from 'react-dom'
import { Button, ModalMedium } from '@odyssey/ui'

/**
 * Shared confirm dialog — a one-line message + Cancel/OK-style footer over
 * ModalMedium (`.confirm-dialog` narrows the otherwise content-sized medium
 * modal; see components.css). Lifted out of RoutingGuideTab (S119) when the
 * Order Change review needed the same shell for its three tender-resolution
 * actions — one dialog shape for the app, not one per surface.
 *
 * `cancelLabel` is optional — omit it for a single-button (OK-only) notice
 * like LINX-13895's dates-unavailable message, which has nothing to cancel
 * out of. ModalMedium routes the header X, overlay click and Escape to
 * `onCancel`, so the safe exit is always the same action.
 */
export default function ConfirmDialog({ title, message, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel }) {
  return createPortal(
    <ModalMedium
      title={title}
      onClose={onCancel}
      ariaLabel={title}
      className="confirm-dialog"
      footer={
        <>
          {cancelLabel && <Button variant="secondary" size="lg" onClick={onCancel}>{cancelLabel}</Button>}
          <Button variant="primary" size="lg" onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-label-sm-regular">{message}</p>
    </ModalMedium>,
    document.body,
  )
}
