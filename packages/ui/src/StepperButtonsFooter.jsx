import { useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from './Button.jsx'
import Tooltip from './Tooltip.jsx'

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
 *
 * `primaryTooltip` (string|node, D22): when the primary is disabled AND this is set, hovering/
 * focusing it shows the normalized `Tooltip` explaining why. Reuses the hover+portal pattern the
 * app-local `TooltipTrigger` uses for this exact case (a disabled button fires no mouse/focus
 * events itself, so a wrapping span carries them) — this package can't import the app-local
 * component (same constraint as SummaryStrip's `truncationTooltip`), so the minimal version of
 * that pattern is inlined below rather than reintroduced as a new escape-hatch component. Default
 * off (or primary enabled) is byte-identical to every existing consumer.
 */
function PrimaryWithTooltip({ tooltip, children }) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState(null)
  const anchorRef = useRef(null)
  const id = useId()

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) { setStyle(null); return }
    const r = anchorRef.current.getBoundingClientRect()
    setStyle({
      position: 'fixed',
      left: r.left + r.width / 2,
      top: r.top - 6,
      transform: 'translate(-50%, -100%)',
      width: 'max-content',
      zIndex: 9999,
      pointerEvents: 'none',
    })
  }, [open])

  // ponytail: no viewport-edge flip/clamp (TooltipTrigger's fuller version has
  // one) — this anchors a page-footer primary button, always far from the top
  // edge in practice; add flip/clamp if a footer tooltip ever clips.
  return (
    <span
      ref={anchorRef}
      data-tooltip-trigger=""
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      style={{ display: 'inline-flex' }}
    >
      {children}
      {open && style && createPortal(
        <div id={id} style={style}><Tooltip groups={[{ content: tooltip }]} /></div>,
        document.body,
      )}
    </span>
  )
}

export default function StepperButtonsFooter({
  cancelLabel = 'Cancel',
  saveLabel = 'Save',
  primaryLabel = 'Continue',
  showSave = false,
  onCancel,
  onSave,
  onPrimary,
  primaryDisabled = false,
  primaryTooltip,
  saving = false,
  className = '',
}) {
  const primaryButton = (
    <Button variant="primary" size="lg" onClick={onPrimary} disabled={primaryDisabled}>{primaryLabel}</Button>
  )
  return (
    <div className={`stepper-footer ${className}`.trim()}>
      <Button variant="secondary" size="lg" onClick={onCancel}>{cancelLabel}</Button>
      <div className="stepper-footer__end">
        {showSave && (
          <Button variant="secondary" size="lg" onClick={onSave} disabled={saving}>{saveLabel}</Button>
        )}
        {primaryDisabled && primaryTooltip
          ? <PrimaryWithTooltip tooltip={primaryTooltip}>{primaryButton}</PrimaryWithTooltip>
          : primaryButton}
      </div>
    </div>
  )
}
