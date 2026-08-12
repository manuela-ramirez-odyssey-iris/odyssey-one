import { createPortal } from 'react-dom'
import { Button, ModalMedium } from '@odyssey/ui'

/**
 * Shown when the user leaves an edited section without saving — closing the
 * modal, cancelling the section, switching sections, or switching tabs.
 *
 * Three exits, not two: Discard and Save are the choices the user asked for,
 * but the header X must return them to editing. Making X an implicit discard
 * would destroy work with a single mis-click, and making it an implicit save
 * would commit changes they were trying to abandon.
 *
 * Portaled to <body> so it stacks above the Shipment Details dialog rather
 * than inheriting its stacking context — same reasoning as QuoteModal.
 */
export default function DiscardChangesModal({ onDiscard, onSave, onStay }) {
  return createPortal(
    <ModalMedium
      title="Unsaved changes"
      onClose={onStay}
      ariaLabel="Unsaved changes"
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={onDiscard}>Discard Changes</Button>
          <Button variant="primary" size="lg" onClick={onSave}>Save Changes</Button>
        </>
      }
    >
      <p className="text-label-sm-regular">
        You have unsaved changes in this section. Discard them, or save before leaving?
      </p>
    </ModalMedium>,
    document.body,
  )
}
