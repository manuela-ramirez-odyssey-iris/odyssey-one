import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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
 *   expanded / onExpandedChange — controlled expansion (boolean); CollapseExpand fires
 *                       `onExpandedChange(true)` only in the expand direction.
 *   onClose           — CLOSE: fired by CollapseExpand while expanded; the consumer
 *                       deselects the entity (falls back to `onExpandedChange(false)`
 *                       when not provided).
 *   onTabArrangement  — the TabArrangement PanelAction (e.g. opens the column/tab
 *                       arrangement panel); button renders only when provided.
 *   rightOffset       — px inset when side panels are open.
 *   children          — the active tab's pane (the Content slot), rendered while expanded.
 *
 * Height model (S79d): expanded height is content-driven (auto, dvh-capped)
 * with a min-height RATCHET — while open the bar holds the largest height
 * reached, so shorter panes never shrink it (ratchet resets on close). Close
 * keeps the last-rendered pane mounted (inert) while the height eases back to
 * the 48px strip, so both directions animate on the drawer curve.
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
  onClose,
  onTabArrangement,
  rightOffset = 0,
  children,
  className = '',
  style,
  // openToCapHeight: when true the OPEN animation targets the dvh cap height
  // instead of the loader's intrinsic height — prevents the two-phase
  // expansion on a fresh open with loading content (S79e). The consumer sets
  // this while detailsLoading && !shownDetails (fresh open only); it clears
  // once data arrives so the ratchet takes over naturally.
  openToCapHeight = false,
  ...rest
}) {
  const isDisabled = !shipmentId
  const isExpanded = expanded && !isDisabled

  // --- Height model (S79d) -------------------------------------------------
  const rootRef = useRef(null)

  // All height motion is JS-measured length→length (pin the old height,
  // measure the new used height — WITH the dvh cap applied — animate between
  // the two pixel values, then release back to `auto` under a suppressed
  // transition). CSS `interpolate-size` transitions to `auto` were retired:
  // the keyword endpoint resolves to the UNCAPPED intrinsic content height,
  // so with a pane taller than the max-height cap the animated value crosses
  // the clamp almost immediately and the bar visually snaps (S79d root
  // cause). Measured pixels animate the true visible range in every engine.
  //
  // The expanded ResizeObserver drives two behaviors:
  //
  // RATCHET — an inline min-height tracks the largest height the bar has
  // reached (clamped to the dvh cap so a viewport shrink can't wedge it open
  // past the clearance). Switching to a shorter pane therefore never shrinks
  // the bar — short panes just show more canvas below their content. Resets
  // only on close.
  //
  // GROWTH EASING — `height: auto` means content-driven growth (data landing
  // in a pane, switching to a taller tab) never transitions on its own; the
  // RO replays any growth seen while no height animation is running as an
  // eased prev→target transition on the same drawer curve. Under reduced
  // motion the pin/animate degrades to the same instant snap (the 400ms
  // release fallback un-pins when no transitionend will come).
  //
  // The effect cleanup doubles as the CLOSE animation: it pins the last
  // tracked height in the same commit the --expanded class drops, then
  // releases to the CSS 48px rule — so the shrink eases too (the `closing`
  // flag below keeps the pane mounted while it does).
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el || !isExpanded) return
    let max = 0
    let prev = 0
    let animating = false
    let releaseTimer = 0
    let startRaf = 0
    // Ratchet floor waiting to be applied at release time (cap-height open).
    // min-height must NOT be set while the open animation runs — min-height
    // overrides the pinned inline height, so a pre-set floor at capPx makes
    // the used height capPx from frame one and the 48→cap transition never
    // paints (the S79e pre-set snapped the open). Deferred to release(), the
    // floor lands exactly when the animated height reaches it: no motion.
    let pendingMinPx = null

    // Un-pin: back to content-driven auto (same used height — no motion),
    // so the RO can see the next content growth. Applies any deferred ratchet
    // floor FIRST so the post-release measurement reads the ratcheted height
    // (capPx on a cap-height open), not the pane's intrinsic height — without
    // it, prev = loader height and the min-height snap-in would replay as a
    // second rising animation (S79e symptom).
    const release = () => {
      clearTimeout(releaseTimer)
      animating = false
      if (pendingMinPx !== null) {
        el.style.minHeight = `min(${pendingMinPx}px, 100dvh - var(--bottombar-top-clearance))`
        pendingMinPx = null
      }
      el.style.transition = 'none'
      el.style.height = ''
      void el.offsetHeight
      el.style.transition = ''
      prev = el.offsetHeight
    }
    // Ease fromPx → toPx (or the current used height when toPx is omitted).
    // The pin lands pre-paint; the transition starts on the NEXT frame — a
    // heavy commit (big pane mounting) backdates a same-frame transition's
    // start time and the bezier's head gets eaten (measured ~70ms → the bar
    // leapt to ~80% before the first painted frame).
    const animateFrom = (fromPx, toPx) => {
      clearTimeout(releaseTimer)
      cancelAnimationFrame(startRaf)
      el.style.transition = 'none'
      el.style.height = ''
      const target = toPx !== undefined ? toPx : el.offsetHeight
      if (target <= fromPx + 1) { el.style.transition = ''; release(); return } // grow-only
      el.style.height = `${fromPx}px`
      void el.offsetHeight // reflow at the pinned start height
      animating = true
      startRaf = requestAnimationFrame(() => {
        el.style.transition = ''
        el.style.height = `${target}px`
        releaseTimer = setTimeout(release, 400) // reduced-motion fallback
      })
    }
    const onEnd = (e) => {
      if (e.target === el && e.propertyName === 'height') release()
    }
    el.addEventListener('transitionend', onEnd)
    el.addEventListener('transitioncancel', onEnd)

    // OPEN: from the strip height to the content height in one motion.
    // When openToCapHeight is true (fresh open with loading content), animate
    // directly to the dvh cap so the bar expands fully in one shot and the
    // loader fills the available canvas — no second expansion when data lands
    // (the ratchet at cap holds; content swaps in-place). The cap is the
    // same value the CSS max-height uses: 100dvh − --bottombar-top-clearance
    // (104px, measured as window.innerHeight at open time — S79e).
    //
    // The capPx ratchet floor is DEFERRED (pendingMinPx → applied by
    // release() on transitionend / the reduced-motion fallback): setting
    // min-height up front would override the pinned 48px start height and
    // snap the bar open (min-height beats height — S79f regression). `max`
    // is still seeded to capPx immediately so the RO can't apply its own
    // mid-animation floor and cause the same snap; release() then measures
    // the floored height, so prev = capPx and data landing swaps in place
    // with no second rise (the S79e goal, kept).
    const stripH = el.firstElementChild?.offsetHeight ?? 48
    const capPx = openToCapHeight ? window.innerHeight - 104 : undefined
    if (capPx !== undefined) {
      max = capPx
      pendingMinPx = capPx
    }
    animateFrom(stripH, capPx)
    prev = capPx ?? el.offsetHeight

    const ro = new ResizeObserver(() => {
      const h = el.offsetHeight
      if (!animating && h > prev + 1) animateFrom(prev)
      prev = el.offsetHeight
      if (prev > max) {
        max = prev // ratchet follows the ANIMATED height, never the jump target
        el.style.minHeight = `min(${prev}px, 100dvh - var(--bottombar-top-clearance))`
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      el.removeEventListener('transitionend', onEnd)
      el.removeEventListener('transitioncancel', onEnd)
      clearTimeout(releaseTimer)
      cancelAnimationFrame(startRaf)
      el.style.minHeight = ''
      // CLOSE: pin the last height, release to the CSS 48px strip → eased
      // shrink (class is already off in this commit; recalc stays suppressed
      // until the pin is in place, so no auto→48 snap sneaks in first; the
      // next-frame start dodges commit backdating, same as animateFrom).
      el.style.transition = 'none'
      el.style.height = `${prev}px`
      void el.offsetHeight
      requestAnimationFrame(() => {
        el.style.transition = ''
        el.style.height = ''
      })
    }
  // openToCapHeight is read only at mount (open) time, so it's safe to keep
  // the dep on isExpanded only. Adding openToCapHeight would re-run the whole
  // effect (including the close cleanup) every time loading state changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded])

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
  // --------------------------------------------------------------------------

  // Expanded → CLOSE (deselection at the consumer); collapsed (placeholder
  // strip — the button is disabled without a selection) → expand.
  const handleCollapseExpand = useCallback(() => {
    if (isDisabled) return
    if (!isExpanded) onExpandedChange?.(true)
    else if (onClose) onClose()
    else onExpandedChange?.(false)
  }, [isDisabled, isExpanded, onClose, onExpandedChange])

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
    isClosing && 'shipments-bar--closing',
    isDisabled && 'shipments-bar--disabled',
    className,
  ].filter(Boolean).join(' ')

  return (
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
            onClick={handleCollapseExpand}
            disabled={isDisabled}
            aria-label={isExpanded ? 'Close panel' : 'Expand panel'}
            title={isExpanded ? 'Close' : 'Expand'}
          />
        </div>
      </div>
      {(isExpanded || isClosing) && (
        <div className="shipments-bar__content" inert={isClosing || undefined}>
          {isExpanded ? children : lastChildrenRef.current}
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
