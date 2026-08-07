import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import DropdownButton from './DropdownButton'
import DropdownMenu from './DropdownMenu'
import MenuRow from './MenuRow'
import { computeVerticalPlacement } from './useAnchoredPortal.jsx'

/**
 * ActionMenu — molecule. Dropdown's action-flavored sibling: a customizable
 * icon trigger that opens an anchored DropdownMenu of action options. Owns the
 * trigger button + positioning + the viewport boundary flip + a11y in one place,
 * composing the normalized DropdownMenu + MenuRow for the surface.
 *
 * The consumer passes the trigger `icon` (the library stays icon-agnostic — no
 * lucide dep) and an `options` array; picking an option fires `onSelect` + closes.
 *
 * Positioning: measure-then-place (the menu mounts hidden until measured → no
 * flash). Vertical flips up near the viewport bottom (computeVerticalPlacement).
 * Horizontal honors `align`: 'right' anchors the menu's right edge to the trigger
 * right (safe for a far-right action column), 'left' anchors its left edge.
 *
 * a11y: the trigger has aria-haspopup/aria-expanded; items are role="menuitem";
 * focus moves to the first enabled item on open; Escape closes + restores focus
 * to the trigger; closes on outside-click / scroll (capture) / resize.
 *
 * Props:
 *   - `icon` — the trigger glyph, e.g. <EllipsisVertical {...ICON_MD}/>. Required
 *     unless `label` is given.
 *   - `label` — render a LABELLED trigger instead of an icon one: the normalized
 *     `DropdownButton` atom (value + chevron, chevron flips with `open`). For
 *     action menus that need to announce themselves in a toolbar ("Actions")
 *     rather than hide behind a 3-dot glyph. Mutually exclusive with `icon`;
 *     `label` wins if both are passed.
 *   - `options` — { label, onSelect, disabled?, danger?, id? }[] (id only needed to disambiguate duplicate labels).
 *   - `align` — 'right' (default) | 'left'.
 *   - `ariaLabel` — the icon-only trigger's accessible name.
 *   - `className` — merged onto the root.
 *
 * Figma master: retro-synced (closed = trigger, open = trigger + DropdownMenu).
 */
export default function ActionMenu({ icon, label, options = [], align = 'right', ariaLabel, className = '' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null) // { top, left } once measured
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const close = useCallback(() => setOpen(false), [])
  // Escape returns focus to the trigger (standard menu behavior); option-select
  // uses plain `close` (the action was taken — no focus restore, matches prior UX).
  const closeAndReturn = useCallback(() => { setOpen(false); triggerRef.current?.focus() }, [])

  // Measure + place before paint (flash-free). Vertical flips via the shared
  // helper (gap 4); horizontal aligns the menu's right or left edge to the trigger.
  useLayoutEffect(() => {
    if (!open) { setPos(null); return }
    const trigger = triggerRef.current
    const menu = menuRef.current
    if (!trigger || !menu) return
    const r = trigger.getBoundingClientRect()
    const { top } = computeVerticalPlacement(r.top, r.bottom, menu.offsetHeight, window.innerHeight, 4)
    const left = align === 'right' ? r.right - menu.offsetWidth : r.left
    setPos({ top, left })
  }, [open, align])

  // Close on outside-click / scroll / resize.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onScrollOrResize = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  // Move focus to the first enabled item on open.
  useEffect(() => {
    if (open) menuRef.current?.querySelector('[role="menuitem"]:not([aria-disabled="true"])')?.focus()
  }, [open])

  return (
    <span className={`action-menu${className ? ` ${className}` : ''}`}>
      {label ? (
        /* Labelled flavor — the normalized DropdownButton atom, so a toolbar
           action menu looks like every other labelled trigger in the system.
           It already owns the chevron + open/pressed look; only the menu
           semantics (aria-haspopup="menu") are layered on here. */
        <DropdownButton
          ref={triggerRef}
          value={label}
          open={open}
          aria-haspopup="menu"
          aria-label={ariaLabel}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => { if (e.key === 'Escape') closeAndReturn() }}
        />
      ) : (
        <button
          ref={triggerRef}
          type="button"
          className="action-menu__trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={ariaLabel}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => { if (e.key === 'Escape') closeAndReturn() }}
        >
          {icon}
        </button>
      )}
      {open && createPortal(
        <div
          ref={menuRef}
          // zIndex 200 = the project's portal/overlay layer (matches useAnchoredPortal + modals).
          style={pos
            ? { position: 'fixed', top: pos.top, left: pos.left, zIndex: 200 }
            : { position: 'fixed', top: 0, left: 0, visibility: 'hidden', zIndex: 200 }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeAndReturn()
          }}
        >
          <DropdownMenu>
            {options.map((opt) => (
              <MenuRow
                key={opt.id ?? opt.label}
                label={opt.label}
                variant="select"
                disabled={opt.disabled}
                className={opt.danger ? 'menu-row--danger' : ''}
                role="menuitem"
                tabIndex={opt.disabled ? -1 : 0}
                onClick={() => { opt.onSelect?.(); close() }}
                onKeyDown={(e) => {
                  if (opt.disabled) return
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opt.onSelect?.(); close() }
                }}
              />
            ))}
          </DropdownMenu>
        </div>,
        document.body,
      )}
    </span>
  )
}
