import { useId, useState } from 'react'
import { Info, ChevronDown } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'

/**
 * SubAccordion (molecule) — a simplified Accordion: a collapsible white card
 * (radius-2xl, shadow/sm, 16/24 padding) with a single-row header and a content
 * slot. No stepper — this is the flavor for big read-only information sections
 * (e.g. a created-orders summary in the Shipments orders tab).
 *
 * Figma: SubAccordion set 4083:5044 (Components-Molecules), State=Collapsed|Expanded.
 * `Title` TEXT → title; `Show Icon` BOOLEAN → showIcon; `Icon` INSTANCE_SWAP →
 * icon (swap slot, placeholder-20 in Figma — code defaults to the info glyph);
 * `Content` SLOT → children. The 20px chevron is always present (no boolean).
 *
 * Expansion is uncontrolled by default (`defaultExpanded`); pass `expanded`
 * (+ `onToggle`) to control it. The reveal animates via grid-template-rows
 * 0fr→1fr (animates to auto height, no JS measuring), same as Accordion.
 * The chevron rotates 180° on expand — at rest the rendered geometry matches
 * the Figma chevron-down / chevron-up masters exactly.
 */
export default function SubAccordion({
  title,
  showIcon = true,
  icon,
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
      className={`sub-accordion${isExpanded ? ' sub-accordion--expanded' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        type="button"
        className="sub-accordion__header"
        id={headerId}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={handleToggle}
      >
        <span className="sub-accordion__lead">
          <span className="sub-accordion__title text-heading-lg-semibold">{title}</span>
          {showIcon && (
            <span className="sub-accordion__info" aria-hidden="true">
              {icon || <Info {...ICON_LG} />}
            </span>
          )}
        </span>
        <span className="sub-accordion__chevron-wrapper" aria-hidden="true">
          <ChevronDown {...ICON_LG} className="sub-accordion__chevron" />
        </span>
      </button>
      <div
        className="sub-accordion__reveal"
        role="region"
        id={contentId}
        aria-labelledby={headerId}
        aria-hidden={!isExpanded}
        inert={!isExpanded}
      >
        <div className="sub-accordion__reveal-inner">
          <div className="sub-accordion__content">{children}</div>
        </div>
      </div>
    </section>
  )
}
