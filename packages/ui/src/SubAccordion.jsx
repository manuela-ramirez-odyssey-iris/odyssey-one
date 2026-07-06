import { useId, useState } from 'react'
import { Info, ChevronDown, ListChevronsUpDown, ListChevronsDownUp } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import Button from './Button.jsx'

/**
 * SubAccordion (molecule) — a simplified Accordion: a collapsible white card
 * (radius-2xl, shadow/sm, 16/24/20 padding; Static 20/24/20) with a single-row
 * header and a content slot. No stepper — this is the flavor for big read-only
 * information sections (e.g. a created-orders summary in the Shipments orders tab).
 *
 * Figma: SubAccordion set 4083:5044 (Components-Molecules),
 * State=Collapsed|Expanded|Static. `Title` TEXT → title; `Show Icon` BOOLEAN →
 * showIcon; `Icon` INSTANCE_SWAP → icon (swap slot, placeholder-20 in Figma —
 * code defaults to the info glyph); `Content` SLOT → children. The 20px chevron
 * is always present on the collapsible states (no boolean).
 *
 * `collapsible={false}` (Figma State=Static) renders the NON-COLLAPSIBLE
 * flavor: the header is a plain heading row (no button, no chevron, no
 * aria-expanded) and the content is always revealed — for sections that are
 * informational cards rather than disclosures.
 *
 * Expansion is uncontrolled by default (`defaultExpanded`); pass `expanded`
 * (+ `onToggle`) to control it. The reveal animates via grid-template-rows
 * 0fr→1fr (animates to auto height, no JS measuring), same as Accordion.
 * The chevron rotates 180° on expand — at rest the rendered geometry matches
 * the Figma chevron-down / chevron-up masters exactly.
 *
 * Optional expand-all action (S79h): pass `onToggleAll` to render a
 * `Button variant="link"` on the right of the header row ("Expand All"
 * chevrons-up-down / "Collapse All" chevrons-down-up, 16px), a SIBLING of the
 * header toggle (never a nested button). Consumer-controlled via `allExpanded`
 * — the consumer tracks what's expanded inside the slot. (Figma: `Show Expand
 * All` BOOLEAN, default false.)
 */
export default function SubAccordion({
  title,
  showIcon = true,
  icon,
  collapsible = true,
  expanded,
  defaultExpanded = false,
  onToggle,
  allExpanded = false,
  onToggleAll,
  children,
  className = '',
}) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  const isExpanded = !collapsible || (expanded !== undefined ? expanded : internalExpanded)
  const contentId = useId()
  const headerId = useId()

  const handleToggle = () => {
    const next = !isExpanded
    if (expanded === undefined) setInternalExpanded(next)
    if (onToggle) onToggle(next)
  }

  const HeaderTag = collapsible ? 'button' : 'div'

  return (
    <section
      className={`sub-accordion${isExpanded ? ' sub-accordion--expanded' : ''}${collapsible ? '' : ' sub-accordion--static'}${className ? ` ${className}` : ''}`}
    >
      <div className="sub-accordion__header-row">
        <HeaderTag
          type={collapsible ? 'button' : undefined}
          className="sub-accordion__header"
          id={headerId}
          aria-expanded={collapsible ? isExpanded : undefined}
          aria-controls={collapsible ? contentId : undefined}
          onClick={collapsible ? handleToggle : undefined}
        >
          <span className="sub-accordion__lead">
            <span className="sub-accordion__title text-heading-lg-semibold">{title}</span>
            {showIcon && (
              <span className="sub-accordion__info" aria-hidden="true">
                {icon || <Info {...ICON_LG} />}
              </span>
            )}
          </span>
          {collapsible && (
            <span className="sub-accordion__chevron-wrapper" aria-hidden="true">
              <ChevronDown {...ICON_LG} className="sub-accordion__chevron" />
            </span>
          )}
        </HeaderTag>
        {!collapsible && onToggleAll && (
          <Button
            variant="link"
            icon={allExpanded ? <ListChevronsDownUp size={16} /> : <ListChevronsUpDown size={16} />}
            onClick={(e) => {
              e.stopPropagation()
              onToggleAll(!allExpanded)
            }}
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </Button>
        )}
      </div>
      <div
        className="sub-accordion__reveal"
        role="region"
        id={contentId}
        aria-labelledby={headerId}
        aria-hidden={collapsible ? !isExpanded : undefined}
        inert={collapsible ? !isExpanded : undefined}
      >
        <div className="sub-accordion__reveal-inner">
          <div className="sub-accordion__content">{children}</div>
        </div>
      </div>
    </section>
  )
}
