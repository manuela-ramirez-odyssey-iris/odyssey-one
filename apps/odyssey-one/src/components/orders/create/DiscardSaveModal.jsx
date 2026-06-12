import { Button, ModalMedium } from '@odyssey/ui'

/**
 * DiscardSaveModal — screen 3. Reached from footer Cancel AND navbar ✕
 * (same path, spec §4). Save for Later = secondary; Discard = primary
 * (explicit confirm — clicking it IS the confirmation). Copy verbatim
 * from the design capture.
 */
export default function DiscardSaveModal({ onClose, onSaveForLater, onDiscard, saving }) {
  return (
    <ModalMedium
      title="Discard order"
      onClose={onClose}
      ariaLabel="Discard order"
      footer={
        <div className="co-modal-footer">
          <Button variant="secondary" size="lg" onClick={onSaveForLater} disabled={saving}>
            Save for Later
          </Button>
          <Button variant="primary" size="lg" onClick={onDiscard}>
            Discard
          </Button>
        </div>
      }
    >
      <div className="co-modal-body">
        <p className="text-label-sm-regular" style={{ margin: 0 }}>Would you like to cancel this order?</p>
        <p className="text-label-sm-regular" style={{ margin: 0 }}>Alternatively, you can save it to complete later.</p>
      </div>
    </ModalMedium>
  )
}
