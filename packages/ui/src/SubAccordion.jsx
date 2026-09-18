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
 * State=Collapsed|Expanded|Static. `Title` TEXT → title; `Show header icon`
 * BOOLEAN → showHeaderIcon; `Icon` INSTANCE_SWAP → icon (swap slot,
 * placeholder-20 in Figma — code defaults to the info glyph); `Content` SLOT →
 * children. The 20px chevron is always present on the collapsible states (no
 * boolean).
 *
 * ── THE HEADER CARRIES MORE THAN A TITLE (S152) ────────────────────────────
 * Three optional slots, all off by default, added because LINX-15895's
 * routing-version card had to DETACH the master to draw its header — a detach
 * is the mock saying the component owes a prop. They borrow HeaderStrip's
 * vocabulary rather than inventing their own, because they do the same jobs:
 *
 *   `badge` — a node immediately AFTER the title, inside the title row. Same
 *             rule HeaderStrip states: it stays glued to the text it qualifies.
 *             (Figma: `Show Badge` BOOLEAN + an EXPOSED Badge instance, so the
 *             Variant picker is on every SubAccordion instance.)
 *   `meta`  — rows UNDER the title row, still inside the header. A column with
 *             the same 12px rhythm as Figma's Meta frame, so a consumer passing
 *             a fragment of rows gets the spacing for free.
 *             (Figma: `Show Meta` BOOLEAN.)
 *   `trail` — pinned to the header's trailing edge, before the chevron (before
 *             the Static action cluster). A string renders as the label; a node
 *             renders as-is — Figma models the common case as a `Trail label`
 *             TEXT property, code keeps the wider node contract.
 *             (Figma: `Show Trail` BOOLEAN + `Trail label` TEXT.)
 *
 * The title, chevron and action cluster stay the component's, so a header built
 * from these still reads as a SubAccordion. That is the whole reason this is
 * three named props and not one escape-hatch slot.
 *
 * ⚠️ BREAKING (S152): `showIcon` → **`showHeaderIcon`, and it now defaults to
 * FALSE**. 28 of the 35 call sites were passing `showIcon={false}` — the
 * default was backwards, and it is the Figma default too (`Show header icon`,
 * user ruling 2026-09-18). A consumer that WANTS the glyph now opts in.
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
 * Optional expand-all action (S79h): pass `onToggleAll` to render a control on
 * the right of the header row ("Expand All" chevrons-up-down / "Collapse All"
 * chevrons-down-up, 16px), a SIBLING of the header toggle (never a nested
 * button). Consumer-controlled via `allExpanded` — the consumer tracks what's
 * expanded inside the slot. (Figma: `Show Expand All` BOOLEAN, default false.)
 *
 * `toggleAllVariant` picks WHICH control that is: `'link'` (default, the
 * historic `Button variant="link"`) or `'secondary'`, a `Button
 * variant="secondary" size="sm"` for sections that need more weight. This is
 * the code side of Figma's `Expand All` INSTANCE_SWAP, which offers the
 * ButtonLink and Button masters in that one slot. Only the chrome changes —
 * label, icons, callback and Static-only placement are identical either way.
 *
 * Optional `buttonToggle` (a ReactNode — by convention a `ButtonToggle`) renders
 * at the HEAD of the header's action cluster, before the expand-all control. A
 * segmented toggle changes what the section SHOWS, so it reads before the
 * actions that operate on it. Like `action` it is a plain node, so the consumer
 * owns its `selected`/`onChange` state; omitting it hides it. Static-only.
 * (Figma: `Show Button Toggle` BOOLEAN, default false.)
 *
 * Optional primary action (S80): pass `action` (a ReactNode — by convention a
 * `Button variant="primary" size="sm"`) to render it at the end of the header
 * row, after the expand-all link. Both actions are independently toggleable
 * and Static-only, like the Figma master (`Show Button` BOOLEAN, default
 * false — e.g. the Documents card's "Add Document").
 */
export default function SubAccordion({
  title,
  badge,
  meta,
  trail,
  showHeaderIcon = false,
  icon,
  collapsible = true,
  expanded,
  defaultExpanded = false,
  onToggle,
  buttonToggle,
  allExpanded = false,
  onToggleAll,
  toggleAllVariant = 'link',
  action,
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
          {/* Title block — the title row, plus whatever `meta` puts under it.
              Mirrors Figma's `Title block` frame; it is what lets the trail and
              the chevron centre on the whole header rather than on row 1. */}
          <span className="sub-accordion__title-block">
            <span className="sub-accordion__lead">
              <span className="sub-accordion__title text-heading-lg-semibold">{title}</span>
              {badge}
              {showHeaderIcon && (
                <span className="sub-accordion__info" aria-hidden="true">
                  {icon || <Info {...ICON_LG} />}
                </span>
              )}
            </span>
            {meta && <span className="sub-accordion__meta">{meta}</span>}
          </span>
          {trail && (
            <span className="sub-accordion__trail text-label-sm-regular">{trail}</span>
          )}
          {collapsible && (
            <span className="sub-accordion__chevron-wrapper" aria-hidden="true">
              <ChevronDown {...ICON_LG} className="sub-accordion__chevron" />
            </span>
          )}
        </HeaderTag>
        {!collapsible && buttonToggle}
        {!collapsible && onToggleAll && (
          <Button
            {...(toggleAllVariant === 'secondary'
              ? { variant: 'secondary', size: 'sm' }
              : { variant: 'link' })}
            icon={allExpanded ? <ListChevronsDownUp size={16} /> : <ListChevronsUpDown size={16} />}
            onClick={(e) => {
              e.stopPropagation()
              onToggleAll(!allExpanded)
            }}
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </Button>
        )}
        {!collapsible && action}
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
