import { useState } from 'react'
import { Alert, Button, ModalMedium } from '@odyssey/ui'

/**
 * DiscardSaveModal — screen 3. Reached from footer Cancel AND navbar ✕
 * (same path, spec §4). Save for Later = secondary; Discard = primary
 * (explicit confirm — clicking it IS the confirmation). Copy verbatim
 * from the design capture.
 *
 * onSaveForLater(onModalError) — parent passes an error callback so that
 * a failed mutation surfaces the message here (modal stays open) rather
 * than closing and showing the form-level alert.
 */
export default function DiscardSaveModal({ onClose, onSaveForLater, onDiscard, saving }) {
  const [modalError, setModalError] = useState('')

  return (
    <ModalMedium
      title="Discard order"
      onClose={onClose}
      ariaLabel="Discard order"
      footer={
        <div className="co-modal-footer">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => { setModalError(''); onSaveForLater(setModalError) }}
            disabled={saving}
          >
            Save for Later
          </Button>
          <Button variant="primary" size="lg" onClick={onDiscard}>
            Discard
          </Button>
        </div>
      }
    >
      <div className="co-modal-body">
        <p className="text-label-sm-regular">Would you like to cancel this order?</p>
        <p className="text-label-sm-regular">Alternatively, you can save it to complete later.</p>
        {modalError && (
          <Alert variant="error" onClose={() => setModalError('')}>
            {modalError}
          </Alert>
        )}
      </div>
    </ModalMedium>
  )
}
