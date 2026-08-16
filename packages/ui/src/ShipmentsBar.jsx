import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpToLine, ChevronsDown, ChevronsUp, Columns3Cog } from 'lucide-react'
import Button from './Button.jsx'

/**
 * ShipmentsBar — organism. The docked bottom detail bar for the Shipments page:
 * a 48px strip with a current-entity segment (prev/next arrows + shipment ID),
 * a tab strip where EACH TAB IS A CONTENT SLOT, and the PanelActions cluster.
 * The consumer renders the active pane as `children` (the Content slot),
 * revealed while the bar is expanded.
 *
 * PanelActions (Figma 4095:3070 in the mock, in-master 4110:5003): two
 * `Button variant="icon" size="sm"` — TabArrangement (columns+cog,
 * `onTabArrangement`) and CollapseExpand: content expanded → `chevrons-down`
 * is a CLOSE gesture — it fires `onClose` (the consumer deselects the entity,
 * returning the bar to the placeholder strip; S79c decision 4). Collapsed →
 * `chevrons-up` (click expands via `onExpandedChange`; with no selection the
 * strip shows it disabled). There is no 'collapsed with selection' state.
 *
 * Selected tab = Deep Sea Neutral/100 fill (real Selected state — the Figma
 * mock faked it with Cell State=Hover); hover/pressed are CSS-only per our
 * control-state convention. Tab labels are `label/sm semibold` + Text/primary.
 * Tab overflow scrolls natively (hidden scrollbar).
 *
 * Figma master: `ShipmentsBar` 4106:1765 (Components-Organisms) — Strip
 * (CurrentShipment + ShipmentsBarTab instances + PanelActions) over a native
 * Content slot. `ShipmentsBarTab` set 4105:1770 (`State=Default|Selected`,
 * `Label` TEXT).
 *
 * Props:
 *   shipmentId        — current entity label; null renders `placeholder` + disables the bar.
 *   onShipmentIdClick — when provided (and a shipment is selected) the ID renders as a
 *                       ButtonLink (Button variant="link") — e.g. opens the View
 *                       Shipment Details modal (S93). Without it: plain label.
 *   placeholder       — label when nothing is selected (default 'Select a Shipment').
 *   onPrevShipment / onNextShipment — arrow handlers; arrows render only when provided.
 *   prevDisabled / nextDisabled     — bound states for the arrows.
 *   tabs              — [{ key, label }]. Plain tabs only — the dropdown-tab face
 *                       (prelabel + value + chevron) was retired S80 with the Figma
 *                       `State=Selected Dropdown` variant; ShipmentsBarTab is now
 *                       just Default|Selected. In-pane switchers (e.g. the Orders
 *                       pane's order tabs) live in the pane content instead.
 *   activeTab / onTabChange — controlled tab selection.
 *   expanded / onExpandedChange — controlled expansion (boolean); CollapseExpand fires
 *                       `onExpandedChange(true)` only in the expand direction.
 *   onClose           — CLOSE: fired by CollapseExpand while expanded; the consumer
 *                       deselects the entity (falls back to `onExpandedChange(false)`
 *                       when not provided).
 *   onTabArrangement  — the TabArrangement PanelAction (e.g. opens the column/tab
 *                       arrangement panel); button renders only when provided.
 *   closeOnOutsideClick — opt-in (RightPanel parity, S93): while expanded the bar
 *                       renders a scrim over the page content — the first click
 *                       outside the bar only fires `onClose` (collapse), it never
 *                       reaches the content underneath. The scrim carries
 *                       `.shipments-bar__scrim`; consumers position it via CSS
 *                       (e.g. inset below their app chrome).
 *   rightOffset       — px inset when side panels are open.
 *   children          — the active tab's pane (the Content slot), rendered while expanded.
 *
 * Height model (S93): THREE FIXED STAGES — collapsed (48px strip), partial
 * (--bottombar-partial) and full (100dvh − --navbar-height, i.e. every pixel
 * between the navbar and the viewport bottom — 2026-08-15). Heights
 * are definite CSS lengths, so stage changes and open/close animate with a
 * plain CSS height transition (the drawer curve). The S79d/S82 adaptive
 * content-driven height (auto + ratchet + measured JS animation) was retired —
 * pane content scrolls within the fixed stage height instead.
 */
export default function ShipmentsBar({
  shipmentId,
  onShipmentIdClick,
  placeholder = 'Select a Shipment',
  onPrevShipment,
  onNextShipment,
  prevDisabled = false,
  nextDisabled = false,
  tabs = [],
  activeTab,
  onTabChange,
  expanded = false,
  onExpandedChange,
  // stage: expansion size while expanded — 'partial' (--bottombar-partial)
  // or 'full' (100dvh − --navbar-height). S82 three-state bar: the CollapseExpand
  // button walks closed → partial (arrow-up-to-line) → full (chevrons-up) →
  // closed (chevrons-down, fires onClose). Consumers open to 'partial' on
  // selection.
  stage = 'full',
  onStageChange,
  onClose,
  onTabArrangement,
  closeOnOutsideClick = false,
  rightOffset = 0,
  children,
  className = '',
  style,
  ...rest
}) {
  const isDisabled = !shipmentId
  const isExpanded = expanded && !isDisabled

  const rootRef = useRef(null)

  // CLOSING: when expansion drops (close = deselect, so `children` empties in
  // the same commit), keep the LAST-RENDERED pane mounted while the height
  // eases back to the strip — otherwise the content vanishes and the bar
  // snaps shut. Cleared on the root's height transitionend, with a timeout
  // fallback for reduced-motion (where the height snaps instead). `isClosing`
  // is DERIVED for the just-closed render — the state flag only flips in the
  // effect, one commit later, and waiting for it would unmount the pane (and
  // drop the shadow) for a frame.
  const [closing, setClosing] = useState(false)
  const wasExpandedRef = useRef(isExpanded)
  const isClosing = closing || (!isExpanded && wasExpandedRef.current)
  const lastChildrenRef = useRef(null)
  if (isExpanded) lastChildrenRef.current = children
  else if (!isClosing) lastChildrenRef.current = null
  useEffect(() => {
    const was = wasExpandedRef.current
    wasExpandedRef.current = isExpanded
    if (isExpanded) { setClosing(false); return }
    if (!was) return
    setClosing(true)
    const el = rootRef.current
    const done = () => setClosing(false)
    const onEnd = (e) => { if (e.target === el && e.propertyName === 'height') done() }
    el?.addEventListener('transitionend', onEnd)
    const t = setTimeout(done, 400)
    return () => {
      el?.removeEventListener('transitionend', onEnd)
      clearTimeout(t)
    }
  }, [isExpanded])

  // S82 three-state walk: collapsed → expand (partial); partial → full;
  // full → CLOSE (deselection at the consumer). The strip's button is
  // disabled without a selection.
  const handleCollapseExpand = useCallback(() => {
    if (isDisabled) return
    if (!isExpanded) onExpandedChange?.(true)
    else if (stage === 'partial' && onStageChange) onStageChange('full')
    else if (onClose) onClose()
    else onExpandedChange?.(false)
  }, [isDisabled, isExpanded, stage, onStageChange, onClose, onExpandedChange])

  const handleTabClick = useCallback((tab) => {
    if (isDisabled || tab.key === activeTab) return
    onTabChange?.(tab.key)
  }, [isDisabled, activeTab, onTabChange])

  const classes = [
    'shipments-bar',
    isExpanded && 'shipments-bar--expanded',
    isExpanded && stage === 'partial' && 'shipments-bar--partial',
    isClosing && 'shipments-bar--closing',
    isDisabled && 'shipments-bar--disabled',
    className,
  ].filter(Boolean).join(' ')

  return (
    <>
    {closeOnOutsideClick && isExpanded && (
      <div
        className="shipments-bar__scrim"
        aria-hidden="true"
        onMouseDown={(e) => { e.preventDefault(); onClose ? onClose() : onExpandedChange?.(false) }}
      />
    )}
    <div
      ref={rootRef}
      data-bottombar
      className={classes}
      style={{ right: rightOffset, ...style }}
      {...rest}
    >
      <div className="shipments-bar__strip">
        <div className="shipments-bar__current">
          {onPrevShipment && (
            <button
              type="button"
              className="shipments-bar__nav"
              onClick={onPrevShipment}
              disabled={isDisabled || prevDisabled}
              aria-label="Previous shipment"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          {onShipmentIdClick && !isDisabled ? (
            <Button
              variant="link"
              className="shipments-bar__id--link"
              onClick={onShipmentIdClick}
            >
              {shipmentId}
            </Button>
          ) : (
            <span className="shipments-bar__id text-label-sm-semibold">
              {shipmentId || placeholder}
            </span>
          )}
          {onNextShipment && (
            <button
              type="button"
              className="shipments-bar__nav"
              onClick={onNextShipment}
              disabled={isDisabled || nextDisabled}
              aria-label="Next shipment"
            >
              <ArrowRight size={20} />
            </button>
          )}
        </div>
        <div className="shipments-bar__tabs" role="tablist">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key && !isDisabled
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={[
                  'shipments-bar__tab',
                  'text-label-sm-semibold',
                  isActive && 'shipments-bar__tab--selected',
                ].filter(Boolean).join(' ')}
                disabled={isDisabled}
                onClick={() => handleTabClick(tab)}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
        <div className="shipments-bar__panel-actions">
          {onTabArrangement && (
            <Button
              variant="icon"
              size="sm"
              icon={<Columns3Cog size={20} />}
              onClick={onTabArrangement}
              disabled={isDisabled}
              aria-label="Tab arrangement"
              title="Tab arrangement"
            />
          )}
          <Button
            variant="icon"
            size="sm"
            icon={
              !isExpanded ? <ArrowUpToLine size={20} />
                : stage === 'partial' ? <ChevronsUp size={20} />
                : <ChevronsDown size={20} />
            }
            onClick={handleCollapseExpand}
            disabled={isDisabled}
            aria-label={!isExpanded ? 'Expand panel' : stage === 'partial' ? 'Expand panel fully' : 'Close panel'}
            title={!isExpanded ? 'Expand' : stage === 'partial' ? 'Expand fully' : 'Close'}
          />
        </div>
      </div>
      {(isExpanded || isClosing) && (
        <div className="shipments-bar__content" inert={isClosing || undefined}>
          {isExpanded ? children : lastChildrenRef.current}
        </div>
      )}
    </div>
    </>
  )
}
