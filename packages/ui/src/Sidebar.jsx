import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import SidebarButton from './SidebarButton.jsx'
import DropdownMenu from './DropdownMenu.jsx'
import MenuRow from './MenuRow.jsx'

/**
 * Sidebar — organism. Left navigation chrome used across every Odyssey One
 * route. Two widths, both a real rail in the page flex row (never an overlay),
 * so expanding it pushes the domain content rather than covering it:
 *   collapsed (default) — 64px, icon-only buttons
 *   expanded            — 240px, labelled rows, counts, and submenus
 *
 * Router-agnostic (no react-router dependency in the library). Rows that are
 * leaf destinations go through `renderItem(item, defaultNode, { active, level })`
 * so a consumer can wrap them in a <NavLink>; rows that OWN children are
 * disclosures, not links, so Sidebar renders those itself with an onClick and
 * never calls `renderItem` for them.
 *
 * Item shape — `{ id, icon, label, count, items }`, nested arbitrarily deep.
 * How a level is drawn depends on how much room the rail has:
 *   expanded   level 1 is a rail row, level 2 an indented rail row, and level 3+
 *              a FLOATING DropdownMenu card to the right of its row.
 *   collapsed  there is no room to indent anything, so EVERY level below the
 *              icon is a floating card, chained left to right.
 * Cards are the same component and the same code path at every depth
 * (`renderCardRow` recurses), which is why the two modes differ only in where
 * the chain starts.
 *
 * Submenu disclosure is uncontrolled but derived: the submenu owning `activeId`
 * is open by default, a click toggles it, and navigating (a new `activeId`)
 * drops the override so the rail follows the route again.
 *
 * A row that OWNS children is a disclosure, never a destination: it does not
 * fire `onItemClick` and never becomes `activeId`. It used to, and that was a
 * bug — the consumer would set `activeId` from it, which tripped the
 * navigation-resets-the-override effect and closed the submenu in the same
 * click that opened it (hence "I have to click twice").
 *
 * The FLOATING cards open on hover as well as click, and close when the pointer
 * leaves after a short grace period so it can cross the gap into them. The
 * expanded inline submenu is click-only in both directions: it is real layout,
 * not an overlay, and opening or collapsing it under a drifting pointer would
 * shove the rail's own contents around.
 *
 * `selected` means a descendant is the current page — pointing at a row never
 * marks it selected, that is what hover styling is for. A domain row shows the
 * fill only while its submenu is SHUT: once it is open, the selected child is
 * visible and carries the fill itself, so the parent stops standing in for it.
 *
 * Fills its container height (the AppShell flex row owns the viewport math).
 * Figma master: `Sidebar` set `5890:8098` (Components-Organisms), Expanded bool.
 */

const HOVER_CLOSE_MS = 180

const childIds = (item) =>
  (item.items || []).flatMap((s) => [s.id, ...(s.items || []).map((t) => t.id)])

export default function Sidebar({
  expanded = false,
  topItems = [],
  bottomItems = [],
  activeId,
  onItemClick,
  renderItem,
  className = '',
}) {
  const all = [...topItems, ...bottomItems]
  const ownerOfActive = all.find((i) => childIds(i).includes(activeId))?.id

  // `undefined` = follow the route; an id or null = the user's explicit choice.
  const [openOverride, setOpenOverride] = useState(undefined)
  useEffect(() => setOpenOverride(undefined), [activeId])
  const openId = openOverride === undefined ? ownerOfActive : openOverride

  // `menuId` is the domain whose collapsed card-chain is open; `flyoutId` is the
  // row inside a chain whose own card is open. Two ids, not one, because in
  // collapsed mode both can be open at once (icon → card → card).
  const [menuId, setMenuId] = useState(null)
  const [flyoutId, setFlyoutId] = useState(null)
  const railRef = useRef(null)

  // Hover-open needs a grace period: the card sits a gap away from its row, so
  // a pointer travelling to it briefly leaves both.
  const closeTimer = useRef(null)
  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])
  const openFlyout = useCallback((id) => {
    cancelClose()
    setFlyoutId(id)
  }, [cancelClose])
  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => setFlyoutId(null), HOVER_CLOSE_MS)
  }, [cancelClose])
  // Leaving the domain anchor drops the whole chain — its cards are nested
  // inside it, so this only fires once the pointer is clear of all of them.
  const scheduleCloseChain = useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => {
      setMenuId(null)
      setFlyoutId(null)
    }, HOVER_CLOSE_MS)
  }, [cancelClose])
  const openMenu = useCallback((id) => {
    cancelClose()
    setFlyoutId(null)
    setMenuId(id)
  }, [cancelClose])
  useEffect(() => cancelClose, [cancelClose])

  const closeCards = () => {
    cancelClose()
    setMenuId(null)
    setFlyoutId(null)
  }

  // Switching width restarts the chain — the anchors it hung off are gone.
  useEffect(() => {
    closeCards()
  }, [expanded])

  useEffect(() => {
    if (!menuId && !flyoutId) return
    const onDown = (e) => {
      if (!railRef.current?.contains(e.target)) closeCards()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuId, flyoutId])

  const wrap = (item, node, ctx) => (
    <React.Fragment key={item.id}>
      {renderItem ? renderItem(item, node, ctx) : node}
    </React.Fragment>
  )

  const leaf = (item, node, ctx, extra) =>
    wrap(
      item,
      React.cloneElement(node, {
        onClick: () => {
          extra?.()
          onItemClick?.(item.id)
        },
      }),
      ctx,
    )

  // One row renderer for every card, at every depth. A row that owns children
  // opens the next card to its right instead of navigating.
  const renderCardRow = (item, level) => {
    const active = item.id === activeId
    const owns = (item.items || []).length > 0
    const node = (
      <MenuRow
        label={item.label}
        // Never "my card is open" — hovering must not read as being selected.
        // The fill means a descendant is the current page. (user, 2026-09-08)
        selected={active || childIds(item).includes(activeId)}
        trailingIcon={owns ? <ChevronRight {...ICON_MD} /> : null}
      />
    )
    // Picking a destination dismisses the whole chain; the outside-mousedown
    // handler can't, since the click lands inside the rail.
    if (!owns) return leaf(item, node, { active, level }, closeCards)
    return (
      <div
        className="sidebar__flyout-anchor"
        key={item.id}
        onMouseEnter={() => openFlyout(item.id)}
        onMouseLeave={scheduleClose}
      >
        {React.cloneElement(node, { onClick: () => openFlyout(item.id) })}
        {flyoutId === item.id && renderCard(item, level + 1)}
      </div>
    )
  }

  const renderCard = (item, level) => (
    <DropdownMenu className="sidebar__flyout">
      {(item.items || []).map((child) => renderCardRow(child, level))}
    </DropdownMenu>
  )

  // Expanded only: level 2 is a rail row, indented, not a card.
  const renderSubmenuRow = (item) => {
    const active = item.id === activeId
    const owns = (item.items || []).length > 0
    const selected = active || childIds(item).includes(activeId)
    const node = (
      <SidebarButton
        type="submenu"
        state={selected ? 'selected' : 'default'}
        label={item.label}
        chevron={owns ? 'right' : null}
      />
    )
    if (!owns) return leaf(item, node, { active, level: 2 })
    return (
      <div
        className="sidebar__flyout-anchor"
        key={item.id}
        onMouseEnter={() => openFlyout(item.id)}
        onMouseLeave={scheduleClose}
      >
        {React.cloneElement(node, { onClick: () => openFlyout(item.id) })}
        {flyoutId === item.id && renderCard(item, 3)}
      </div>
    )
  }

  const renderDomain = (item) => {
    const active = item.id === activeId
    const owns = (item.items || []).length > 0
    const open = owns && openId === item.id
    // While the submenu is open the selected child shows the fill itself, so the
    // parent drops it — the row only stands in for a child that is out of sight.
    const standsInForChild = childIds(item).includes(activeId) && !(expanded && open)
    const node = (
      <SidebarButton
        type={expanded ? 'domain' : 'collapsed'}
        state={active || standsInForChild ? 'selected' : 'default'}
        icon={item.icon}
        label={item.label}
        count={expanded ? item.count : undefined}
        chevron={owns && expanded ? (open ? 'up' : 'down') : null}
        title={expanded ? undefined : item.label}
        aria-label={item.label}
      />
    )

    // Choosing another domain dismisses whatever chain was open and moves the
    // rail's selection with it.
    if (!owns) return leaf(item, node, { active, level: 1 }, closeCards)

    // Collapsed: the icon opens a floating card chain, since there is nothing
    // to indent into. Expanded: it discloses the indented submenu in place.
    if (!expanded) {
      return (
        <div
          className="sidebar__flyout-anchor"
          key={item.id}
          onMouseEnter={() => openMenu(item.id)}
          onMouseLeave={scheduleCloseChain}
        >
          {React.cloneElement(node, {
            onClick: () => (menuId === item.id ? closeCards() : openMenu(item.id)),
            'aria-expanded': menuId === item.id,
          })}
          {menuId === item.id && renderCard(item, 2)}
        </div>
      )
    }

    // Click only. Hover belongs to the floating cards — this one is inline
    // layout, and opening it on a passing pointer would shove the rail's own
    // contents around. (user, 2026-09-08)
    return (
      <React.Fragment key={item.id}>
        {React.cloneElement(node, {
          onClick: () => setOpenOverride(open ? null : item.id),
          'aria-expanded': open,
        })}
        {open && (
          <div className="sidebar__submenu">
            {(item.items || []).map(renderSubmenuRow)}
          </div>
        )}
      </React.Fragment>
    )
  }

  // Clicking empty rail — not a row, not a card — shuts whatever is open. The
  // outside-mousedown handler can't cover this: the rail IS inside itself.
  const onRailClick = (e) => {
    if (e.target.closest('.sidebar-button, .menu-row, .sidebar__flyout')) return
    setOpenOverride(null)
    closeCards()
  }

  return (
    <aside
      ref={railRef}
      className={`sidebar${expanded ? ' sidebar--expanded' : ''}${className ? ` ${className}` : ''}`}
      onClick={onRailClick}
    >
      <nav className="sidebar__nav">
        <div className="sidebar__group sidebar__group--top">
          {topItems.map(renderDomain)}
        </div>
        <div className="sidebar__group sidebar__group--bottom">
          {bottomItems.map(renderDomain)}
        </div>
      </nav>
    </aside>
  )
}
