import { Check } from 'lucide-react'
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
 * status: 'off' (pending, gray) | 'on' (validated, green circle + ring).
 * The check renders in both states (white via currentColor).
 */
export default function StepIndicator({ position = 'start', status = 'off', className = '' }) {
  return (
    <span className={`step-indicator step-indicator--${status}${className ? ` ${className}` : ''}`}>
      <span
        className={`step-indicator__line${position === 'start' ? ' step-indicator__line--hidden' : ''}`}
        aria-hidden="true"
      />
      <span className="step-indicator__circle">
        <Check {...ICON_LG} />
      </span>
      <span
        className={`step-indicator__line step-indicator__line--bottom${position === 'end' ? ' step-indicator__line--hidden' : ''}`}
        aria-hidden="true"
      />
    </span>
  )
}
