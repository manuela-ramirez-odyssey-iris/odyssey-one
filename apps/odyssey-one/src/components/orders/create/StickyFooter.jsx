import { StepperButtonsFooter } from '@odyssey/ui'

/**
 * StickyFooter — the order-create footer. Consumes the normalized StepperButtonsFooter
 * (Cancel · Save · Create Order), bled to the full main-content width. Spec §2.2 / Q27:
 * Save keeps the UI open; Cancel routes through the discard/save modal.
 */
export default function StickyFooter({
  onCancel, onSave, onCreate, createDisabled, saving,
  // Resolve mode (LINX-11137) relabels the same two slots: Purge / Save.
  saveLabel, primaryLabel = 'Create Order',
  // Step 1 of the interface-error flow (LINX-16049) has no middle slot at all —
  // Purge is a Step 2 action (PO ruling) — so it needs exactly
  // Cancel · <primary>. Default stays true: every existing caller is unchanged.
  showSave = true,
}) {
  return (
    <div className="co-footer">
      <StepperButtonsFooter
        saveLabel={saveLabel}
        primaryLabel={primaryLabel}
        showSave={showSave}
        onCancel={onCancel}
        onSave={onSave}
        onPrimary={onCreate}
        primaryDisabled={createDisabled}
        saving={saving}
      />
    </div>
  )
}
