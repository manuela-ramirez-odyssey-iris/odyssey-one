import Button from './Button.jsx'

/**
 * StepperButtonsFooter — molecule: the full-width action bar at the foot of a stepper / page
 * flow. A border-top bar with Cancel (secondary) on the left and the primary action group on
 * the right (space-between): an optional Save (secondary) + the primary button.
 *
 * Distinct from ModalFooter (right-aligned modal actions) — this is a page-level footer:
 * full width, top border, page padding, actions pushed to the edges.
 *
 * Figma master 3164:2169 — BOOLEAN `Tertiary Button` → showSave. Button labels are baked in
 * Figma; exposed here as props (cancelLabel / saveLabel / primaryLabel), same as ModalFooter.
 */
export default function StepperButtonsFooter({
  cancelLabel = 'Cancel',
  saveLabel = 'Save',
  primaryLabel = 'Continue',
  showSave = false,
  onCancel,
  onSave,
  onPrimary,
  primaryDisabled = false,
  saving = false,
  className = '',
}) {
  return (
    <div className={`stepper-footer ${className}`.trim()}>
      <Button variant="secondary" size="lg" onClick={onCancel}>{cancelLabel}</Button>
      <div className="stepper-footer__end">
        {showSave && (
          <Button variant="secondary" size="lg" onClick={onSave} disabled={saving}>{saveLabel}</Button>
        )}
        <Button variant="primary" size="lg" onClick={onPrimary} disabled={primaryDisabled}>{primaryLabel}</Button>
      </div>
    </div>
  )
}
