import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconButtonGhost, DropdownMenu, MenuRow } from '@odyssey/ui'
import { EllipsisVertical } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'

/**
 * Preset-group chrome shared by the right-side arrangement panels (ColumnPanel,
 * TabArrangementPanel) and the Saved Filters list. Pure move out of ColumnPanel
 * — no behaviour change; the third consumer is what made it shared.
 */

/** Uppercase section label — matches the RightPanel preset-group header style.
 *  Optional `action` renders on the trailing side (e.g. the ⋮ preset-actions menu).
 *  Exported for sibling arrangement panels (TabArrangementPanel). */
export function GroupLabel({ children, action }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--spacing-2)',
      minHeight: 28,
      padding: 'var(--spacing-1) 0',
      marginBottom: 'var(--spacing-1)',
    }}>
      <span style={{
        color: 'var(--text-tertiary)',
        fontFamily: 'var(--font-primary)',
        fontSize: 'var(--font-size-xs)',
        lineHeight: 'var(--line-height-xs)',
        fontWeight: 'var(--font-weight-medium)',
        letterSpacing: 'var(--letter-spacing-wide)',
        textTransform: 'uppercase',
      }}>
        {children}
      </span>
      {action}
    </div>
  )
}

/**
 * PresetActionsMenu — the ⋮ IconButtonGhost in the Custom Presets header. Opens an
 * anchored DropdownMenu of preset actions (right-aligned to the trigger, flips up near
 * the viewport bottom). Composes IconButtonGhost + DropdownMenu + MenuRow; closes on
 * select / outside-click / scroll / resize.
 */
export function PresetActionsMenu({ options }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  useLayoutEffect(() => {
    if (!open) { setPos(null); return }
    const t = triggerRef.current
    const m = menuRef.current
    if (!t || !m) return
    const r = t.getBoundingClientRect()
    const gap = 4
    const mh = m.offsetHeight
    const openUp = r.bottom + gap + mh > window.innerHeight && r.top - gap - mh > 0
    setPos({
      top: openUp ? r.top - gap - mh : r.bottom + gap,
      left: r.right - m.offsetWidth, // right-align the menu to the trigger
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onScrollResize = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScrollResize, true)
    window.addEventListener('resize', onScrollResize)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScrollResize, true)
      window.removeEventListener('resize', onScrollResize)
    }
  }, [open])

  return (
    <>
      <span ref={triggerRef} style={{ display: 'inline-flex' }}>
        <IconButtonGhost
          icon={<EllipsisVertical {...ICON_LG} aria-hidden="true" />}
          ariaLabel="Preset actions"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
        />
      </span>
      {open && createPortal(
        <div
          ref={menuRef}
          style={pos
            ? { position: 'fixed', top: pos.top, left: pos.left, zIndex: 200 }
            : { position: 'fixed', top: 0, left: 0, visibility: 'hidden', zIndex: 200 }}
        >
          <DropdownMenu>
            {options.map((opt) => (
              <MenuRow
                key={opt.label}
                label={opt.label}
                variant="select"
                role="menuitem"
                tabIndex={0}
                // S108 1d: an option can be disabled (Saved tab's "Edit Name",
                // enabled only with a selection) — additive, existing
                // ColumnPanel/TabArrangementPanel options never set it, so
                // `disabled` stays `undefined` → MenuRow's own default (false)
                // for them. MenuRow suppresses the click itself when disabled,
                // so this wrapper's onClick never fires — no separate guard needed.
                disabled={opt.disabled}
                onClick={() => { opt.onSelect?.(); setOpen(false) }}
              />
            ))}
          </DropdownMenu>
        </div>,
        document.body,
      )}
    </>
  )
}
