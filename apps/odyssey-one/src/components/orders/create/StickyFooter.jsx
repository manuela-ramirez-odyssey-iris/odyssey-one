import { StepperButtonsFooter } from '@odyssey/ui'

/**
 * StickyFooter — the order-create footer. Consumes the normalized StepperButtonsFooter
 * (Cancel · Save · Create Order), bled to the full main-content width. Spec §2.2 / Q27:
 * Save keeps the UI open; Cancel routes through the discard/save modal.
 */
export default function StickyFooter({ onCancel, onSave, onCreate, createDisabled, saving }) {
  return (
    <div className="co-footer">
      <StepperButtonsFooter
        primaryLabel="Create Order"
        showSave
        onCancel={onCancel}
        onSave={onSave}
        onPrimary={onCreate}
        primaryDisabled={createDisabled}
        saving={saving}
      />
    </div>
  )
}
