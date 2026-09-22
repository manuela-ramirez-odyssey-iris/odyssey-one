import { createPortal } from 'react-dom'
import { Button, ModalMedium } from '@odyssey/ui'
import { tenderEmail } from '../../tender/email/tenderEmail.js'
import { buildTenderEmailContext } from '../../tender/email/tenderEmailContext.js'
import { previewDoc } from '../../spotboard/email/previewDoc.js'
import '../../routes/spot-emails/spotEmails.css'

/**
 * S157 (LINX-15795 §5) — "Preview tender email" row action. Renders the same
 * TE-1/TE-2 document `/tender-emails` builds, in the same sandboxed-iframe
 * idiom (EmailGallery.jsx) so what's shown is the exact document that would
 * be sent — no re-styling, no re-typing the envelope.
 *
 * ponytail: prototype-only demo affordance. The real system SENDS this
 * email; it does not preview it. No auto-measured iframe height like the
 * gallery — a fixed scrollable frame (`.spot-emails__frame`'s own
 * min-height) is enough for a one-off modal and skips re-implementing
 * EmailGallery's ResizeObserver plumbing for a single render.
 */
export default function TenderEmailPreview({ shipment, option, onClose }) {
  const email = tenderEmail(buildTenderEmailContext({ shipment, option }))

  return createPortal(
    <ModalMedium
      title={email.subject}
      onClose={onClose}
      ariaLabel={email.subject}
      footer={<Button variant="secondary" size="lg" onClick={onClose}>Close</Button>}
    >
      <div className="text-label-sm-regular" style={{ marginBottom: 'var(--spacing-3)' }}>
        <div><strong>From:</strong> {email.from}</div>
        <div><strong>To:</strong> {email.to}</div>
        <div><strong>Subject:</strong> {email.subject}</div>
      </div>
      <iframe
        className="spot-emails__frame"
        title="Tender email preview"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        srcDoc={previewDoc(email.html)}
        style={{ height: 500 }}
      />
    </ModalMedium>,
    document.body,
  )
}
