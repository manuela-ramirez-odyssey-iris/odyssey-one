import { Check, OctagonX } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'

/**
 * StepIndicator (atom) — vertical stepper node: connector lines + status circle.
 * Figma: StepIndicator set 2909:13 (Components-Atoms), Position × Status.
 *
 * position drives which connector lines render:
 *   'start' → line below only · 'mid' → both · 'end' → line above only.
 * Hidden lines keep their 16px slot (visibility, not display) so the indicator
 * is a uniform 40×72 across positions — mirrors the Figma opacity-0 model.
 *
 * status: 'off' (pending, gray) | 'on' (validated, green circle + ring) |
 * 'error' (validation failed, Bittersweet/600 circle, octagon-x, no ring —
 * Figma 4593:1014). Off/on show the check; error swaps to OctagonX (white via
 * currentColor either way).
 */
export default function StepIndicator({ position = 'start', status = 'off', className = '' }) {
  return (
    <span className={`step-indicator step-indicator--${status}${className ? ` ${className}` : ''}`}>
      <span
        className={`step-indicator__line${position === 'start' ? ' step-indicator__line--hidden' : ''}`}
        aria-hidden="true"
      />
      <span className="step-indicator__circle">
        {status === 'error' ? <OctagonX {...ICON_LG} /> : <Check {...ICON_LG} />}
      </span>
      <span
        className={`step-indicator__line step-indicator__line--bottom${position === 'end' ? ' step-indicator__line--hidden' : ''}`}
        aria-hidden="true"
      />
    </span>
  )
}
