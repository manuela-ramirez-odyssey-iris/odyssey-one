import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { EllipsisVertical } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'

// Canonical row actions (spec §2): all inert this build — each wires up with
// its own feature build (detail page, edit, copy, cancel/restore, delete).
const ACTIONS = ['View', 'Edit', 'Copy', 'Cancel', 'Restore', 'Delete']

/**
 * OrderRowActionMenu — app-local three-dot menu for an orders grid row.
 * NOT @odyssey/ui's MenuDropdown (that's a sidebar accordion group). This is
 * the SHP-66 generic-dropdown candidate; normalize it there when that lands.
 * Portal + fixed positioning so the menu escapes the table wrap's overflow.
 */
export default function OrderRowActionMenu() {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const toggle = () => {
    if (open) { setOpen(false); return }
    const rect = triggerRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.right })
    setOpen(true)
  }

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
      {open && pos && createPortal(
        <div
          ref={menuRef}
          className="order-row-actions__menu"
          role="menu"
          tabIndex={-1}
          style={{ top: pos.top, left: pos.left, transform: 'translateX(-100%)' }}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setOpen(false)
              triggerRef.current?.focus()
            }
          }}
        >
          {ACTIONS.map(action => (
            <button
              key={action}
              type="button"
              role="menuitem"
              className="order-row-actions__item text-label-sm-regular"
              onClick={() => setOpen(false)}
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
