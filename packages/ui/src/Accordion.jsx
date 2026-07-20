import { useId, useState } from 'react'
import { Check, ChevronDown, OctagonX } from 'lucide-react'
import { ICON_LG, ICON_MD } from '@odyssey/tokens'
import Badge from './Badge.jsx'
import StepIndicator from './StepIndicator.jsx'

/**
 * Accordion (molecule) — expandable form-section card with a stepper/validation
 * indicator. Figma: Accordion set 2850:612 (Components-Molecules),
 * Position × Status × State, with a native Content SLOT.
 *
 * The stepper line is "cut" by the expansion: the header keeps its segment below
 * the circle (start/mid), the content interrupts it, and a stub re-anchors the
 * line at the card's bottom edge. End-position accordions have no continuing
 * line — they get bottom padding instead of the stub.
 *
 * Validation is consumer-driven: flip `status` to 'on' when the section's
 * content is correctly filled, or to 'error' when at least one field inside
 * has an error. The Accordion only reflects it. `errorCount` drives a Badge
 * next to the title (Figma 4593:787): status='error' → red "N Errors";
 * status='on' → green "Completed · N Errors validated" (all errors solved —
 * Figma "Show validated badge" BOOLEAN). errorCount 0/omitted = no badge.
 *
 * Expansion is uncontrolled by default (`defaultExpanded`); pass `expanded`
 * (+ `onToggle`) to control it. The reveal animates via grid-template-rows
 * 0fr→1fr (animates to auto height, no JS measuring).
 *
 * The chevron rotates 180° on expand — at rest the rendered geometry matches
 * the Figma chevron-down / chevron-up masters exactly; rotation is what makes
 * the flip animatable.
 */
export default function Accordion({
  position = 'start',
  status = 'off',
  errorCount = 0,
  title,
  description,
  expanded,
  defaultExpanded = false,
  onToggle,
  children,
  className = '',
}) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  const isExpanded = expanded !== undefined ? expanded : internalExpanded
  const contentId = useId()
  const headerId = useId()

  const handleToggle = () => {
    const next = !isExpanded
    if (expanded === undefined) setInternalExpanded(next)
    if (onToggle) onToggle(next)
  }

  return (
    <section
      className={`accordion${isExpanded ? ' accordion--expanded' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        type="button"
        className="accordion__header"
        id={headerId}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={handleToggle}
      >
        <StepIndicator position={position} status={status} />
        <span className="accordion__text">
          <span className="accordion__title-row">
            <span className="accordion__title text-heading-lg-semibold">{title}</span>
            {status === 'error' && errorCount > 0 && (
              <Badge variant="red" leftIcon={<OctagonX {...ICON_MD} />}>
                {errorCount} {errorCount === 1 ? 'Error' : 'Errors'}
              </Badge>
            )}
            {status === 'on' && errorCount > 0 && (
              <Badge variant="green" leftIcon={<Check {...ICON_MD} />}>
                Completed · {errorCount} {errorCount === 1 ? 'Error' : 'Errors'} validated
              </Badge>
            )}
          </span>
          {description && (
            <span className="accordion__description text-label-sm-regular">{description}</span>
          )}
        </span>
        <span className="accordion__icon-wrapper" aria-hidden="true">
          <ChevronDown {...ICON_LG} className="accordion__chevron" />
        </span>
      </button>
      <div
        className="accordion__reveal"
        role="region"
        id={contentId}
        aria-labelledby={headerId}
        aria-hidden={!isExpanded}
        inert={!isExpanded}
      >
        <div className="accordion__reveal-inner">
          <div className="accordion__content">{children}</div>
          {position === 'end' ? (
            <div className="accordion__end-spacer" aria-hidden="true" />
          ) : (
            <div className="accordion__bottom-line" aria-hidden="true" />
          )}
        </div>
      </div>
      {position !== 'end' && <span className="accordion__travel-line" aria-hidden="true" />}
    </section>
  )
}
