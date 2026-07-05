import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, ChevronDown, ChevronsDown, ChevronsUp, Columns3Cog } from 'lucide-react'
import Button from './Button.jsx'
import DropdownMenu from './DropdownMenu.jsx'
import { useAnchoredPortal } from './useAnchoredPortal.jsx'

/**
 * ShipmentsBar — organism. The docked bottom detail bar for the Shipments page:
 * a 48px strip with a current-entity segment (prev/next arrows + shipment ID),
 * a tab strip where EACH TAB IS A CONTENT SLOT, and the PanelActions cluster.
 * The consumer renders the active pane as `children` (the Content slot),
 * revealed while the bar is expanded. This REPLACES the old BottomBar chrome —
 * no close X, no tab-scroll chevrons, no fullscreen step (the old bar's extras
 * are gone by design; deselection happens at the consumer, e.g. re-clicking the
 * table row).
 *
 * PanelActions (Figma 4095:3070 in the mock, in-master 4110:5003): two
 * `Button variant="icon" size="sm"` — TabArrangement (columns+cog,
 * `onTabArrangement`) and CollapseExpand, the ONLY expansion control: content
 * expanded → `chevrons-down` (click collapses), collapsed → `chevrons-up`
 * (click expands).
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
 *   placeholder       — label when nothing is selected (default 'Select a Shipment').
 *   onPrevShipment / onNextShipment — arrow handlers; arrows render only when provided.
 *   prevDisabled / nextDisabled     — bound states for the arrows.
 *   tabs              — [{ key, label, dropdown? }]. A tab with a `dropdown` config is a
 *                       DROPDOWN TAB (Figma: ShipmentsBarTab `Dropdown=True`): when
 *                       selected it renders `dropdown.prelabel` (12/12 regular,
 *                       Text/tertiary) over `dropdown.value ?? label` + a 16px chevron;
 *                       clicking it while already active toggles a `DropdownMenu` of
 *                       preset values anchored to the tab (flips above the docked bar).
 *                       `dropdown.menu` is the menu content — a node, or a function
 *                       `({ close }) => node` to close on item pick. The chevron rotates
 *                       180° while the menu is open.
 *   activeTab / onTabChange — controlled tab selection.
 *   expanded / onExpandedChange — controlled expansion (boolean); the CollapseExpand
 *                       PanelAction toggles it.
 *   onTabArrangement  — the TabArrangement PanelAction (e.g. opens the column/tab
 *                       arrangement panel); button renders only when provided.
 *   rightOffset       — px inset when side panels are open.
 *   children          — the active tab's pane (the Content slot), rendered while expanded.
 */
export default function ShipmentsBar({
  shipmentId,
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
  onTabArrangement,
  rightOffset = 0,
  children,
  className = '',
  style,
  ...rest
}) {
  const isDisabled = !shipmentId
  const isExpanded = expanded && !isDisabled

  const toggleCollapseExpand = useCallback(() => {
    if (isDisabled || !onExpandedChange) return
    onExpandedChange(!expanded)
  }, [isDisabled, onExpandedChange, expanded])

  // Dropdown-tab menu — one menu at a time, only the ACTIVE dropdown tab can
  // open it (click-when-active toggles). Closes on tab/shipment change plus the
  // portal's own outside-click/scroll/resize handling.
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const { triggerRef, dropdownRef, AnchoredPortal } = useAnchoredPortal({ open: menuOpen, onClose: closeMenu })
  useEffect(() => { setMenuOpen(false) }, [activeTab, shipmentId])

  const activeDropdownTab = tabs.find(t => t.key === activeTab && t.dropdown) || null

  const handleTabClick = useCallback((tab) => {
    if (isDisabled) return
    if (tab.key === activeTab) {
      if (tab.dropdown) setMenuOpen(prev => !prev)
      return
    }
    setMenuOpen(false)
    onTabChange?.(tab.key)
  }, [isDisabled, activeTab, onTabChange])

  const classes = [
    'shipments-bar',
    isExpanded && 'shipments-bar--expanded',
    isDisabled && 'shipments-bar--disabled',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div
      data-bottombar
      className={classes}
      style={{ height: isExpanded ? '50vh' : 'var(--bottombar-collapsed)', right: rightOffset, ...style }}
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
          <span className="shipments-bar__id text-label-sm-semibold">
            {shipmentId || placeholder}
          </span>
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
            const showDropdownFace = isActive && !!tab.dropdown
            return (
              <button
                key={tab.key}
                ref={showDropdownFace ? triggerRef : undefined}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-haspopup={tab.dropdown ? 'menu' : undefined}
                aria-expanded={showDropdownFace ? menuOpen : undefined}
                className={[
                  'shipments-bar__tab',
                  'text-label-sm-semibold',
                  isActive && 'shipments-bar__tab--selected',
                  showDropdownFace && 'shipments-bar__tab--dropdown',
                ].filter(Boolean).join(' ')}
                disabled={isDisabled}
                onClick={() => handleTabClick(tab)}
              >
                {showDropdownFace ? (
                  <>
                    <span className="shipments-bar__tab-stack">
                      <span className="shipments-bar__tab-prelabel">{tab.dropdown.prelabel}</span>
                      <span className="shipments-bar__tab-value">{tab.dropdown.value ?? tab.label}</span>
                    </span>
                    <ChevronDown size={16} className="shipments-bar__tab-chevron" aria-hidden="true" />
                  </>
                ) : (
                  tab.label
                )}
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
            icon={isExpanded ? <ChevronsDown size={20} /> : <ChevronsUp size={20} />}
            onClick={toggleCollapseExpand}
            disabled={isDisabled}
            aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
            title={isExpanded ? 'Collapse' : 'Expand'}
          />
        </div>
      </div>
      {isExpanded && (
        <div className="shipments-bar__content">
          {children}
        </div>
      )}
      {menuOpen && activeDropdownTab && (
        <AnchoredPortal>
          <div ref={dropdownRef}>
            <DropdownMenu>
              {typeof activeDropdownTab.dropdown.menu === 'function'
                ? activeDropdownTab.dropdown.menu({ close: closeMenu })
                : activeDropdownTab.dropdown.menu}
            </DropdownMenu>
          </div>
        </AnchoredPortal>
      )}
    </div>
  )
}
