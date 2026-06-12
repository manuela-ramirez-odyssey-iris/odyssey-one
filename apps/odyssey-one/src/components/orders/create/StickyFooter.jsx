import { Button } from '@odyssey/ui'

/**
 * StickyFooter — Cancel (left) · Save · Create Order (right, primary,
 * disabled until the full-form schema passes). Spec §2.2 / Q27: Save keeps
 * the UI open; Cancel routes through the discard/save modal.
 */
export default function StickyFooter({ onCancel, onSave, onCreate, createDisabled, saving }) {
  return (
    <div className="co-footer">
      <Button variant="secondary" size="lg" onClick={onCancel}>Cancel</Button>
      <div className="co-footer__right">
        <Button variant="secondary" size="lg" onClick={onSave} disabled={saving}>Save</Button>
        <Button variant="primary" size="lg" onClick={onCreate} disabled={createDisabled}>Create Order</Button>
      </div>
    </div>
  )
}
