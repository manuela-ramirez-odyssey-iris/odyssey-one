import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { EllipsisVertical } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { computeVerticalPlacement } from '@odyssey/ui'

// Canonical row actions (spec §2): all inert this build — each wires up with
// its own feature build (detail page, edit, copy, cancel/restore, delete).
const ACTIONS = ['View', 'Edit', 'Copy', 'Cancel', 'Restore', 'Delete']

/**
 * OrderRowActionMenu — app-local three-dot menu for an orders grid row.
 * NOT @odyssey/ui's MenuDropdown (that's a sidebar accordion group). This is
 * the SHP-66 generic-dropdown candidate; normalize it there when that lands.
 * Portal + fixed positioning so the menu escapes the table wrap's overflow.
 * Consumers may pass actions/onAction (Product grid rows use ['Edit','Delete']).
 */
export default function OrderRowActionMenu({ actions = ACTIONS, onAction }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const toggle = () => setOpen(o => !o)

  // Measure the menu + trigger, then place with a vertical flip when it would
  // overflow the viewport bottom (computeVerticalPlacement, gap 4). Horizontal
  // stays right-aligned (menu right edge at the trigger right, via the
  // translateX(-100%) below). Runs before paint, so the menu — rendered hidden
  // until `pos` is set — never flashes at a provisional spot.
  useLayoutEffect(() => {
    if (!open) { setPos(null); return }
    const trigger = triggerRef.current
    const menu = menuRef.current
    if (!trigger || !menu) return
    const r = trigger.getBoundingClientRect()
    const { top } = computeVerticalPlacement(r.top, r.bottom, menu.offsetHeight, window.innerHeight, 4)
    setPos({ top, left: r.right })
  }, [open])

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

  useEffect(() => {
    if (open) menuRef.current?.querySelector('button')?.focus()
  }, [open])

  return (
    <div className="order-row-actions">
      <button
        ref={triggerRef}
        type="button"
        className="order-row-actions__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Order actions"
        onClick={toggle}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
      >
        <EllipsisVertical {...ICON_MD} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="order-row-actions__menu"
          role="menu"
          tabIndex={-1}
          style={pos
            ? { top: pos.top, left: pos.left, transform: 'translateX(-100%)' }
            : { top: 0, left: 0, visibility: 'hidden' }}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setOpen(false)
              triggerRef.current?.focus()
            }
          }}
        >
          {actions.map(action => (
            <button
              key={action}
              type="button"
              role="menuitem"
              className="order-row-actions__item text-label-sm-regular"
              onClick={() => { setOpen(false); onAction?.(action) }}
            >
              {action}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}
