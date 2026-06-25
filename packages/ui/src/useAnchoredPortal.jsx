import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const GAP = 2

/**
 * Pure vertical-placement decision for an anchored popover. Default is to open
 * BELOW the trigger; flip ABOVE only when the menu won't fit below (least
 * surprising). If it fits neither side, anchor to whichever side has more room.
 * Inputs are viewport coordinates (the popover is position:fixed).
 */
export function computeVerticalPlacement(triggerTop, triggerBottom, menuHeight, viewportHeight, gap = GAP) {
  const spaceBelow = viewportHeight - triggerBottom
  const spaceAbove = triggerTop
  const openUp = menuHeight + gap > spaceBelow && (menuHeight + gap <= spaceAbove || spaceAbove > spaceBelow)
  return {
    placement: openUp ? 'top' : 'bottom',
    top: openUp ? triggerTop - menuHeight - gap : triggerBottom + gap,
  }
}

/**
 * useAnchoredPortal — positions a popover in a body-level portal, anchored to a
 * trigger element. Opens below by default and FLIPS above when the menu would
 * overflow the viewport bottom (see computeVerticalPlacement). Closes on scroll
 * (capture), resize, and mousedown outside both the trigger and the popover.
 * The popover's `minWidth` matches the trigger (it can grow wider to hug its
 * content). Used by the Dropdown molecule; exported for consumer-composed
 * anchored menus (e.g. a table row-action menu). Dependency-free (react +
 * react-dom only).
 *
 *   const { triggerRef, dropdownRef, AnchoredPortal } = useAnchoredPortal({ open, onClose })
 *   <span ref={triggerRef}>{trigger}</span>
 *   {open && <AnchoredPortal><div ref={dropdownRef}>{popover}</div></AnchoredPortal>}
 *
 * Placement is computed once on open (the popover closes on scroll/resize, so it
 * never needs live tracking). To measure the popover's height the portal mounts
 * immediately but renders hidden until a layout effect places it — so there is
 * no visible flash at the provisional spot. The portal wrapper carries
 * `data-placement="top|bottom"` for styling/animation-origin/tests.
 */
export function useAnchoredPortal({ open, onClose }) {
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)
  const [pos, setPos] = useState(null)

  // Measure the mounted popover + the trigger, decide up/down, place — all
  // before paint (useLayoutEffect), so the hidden→placed transition is invisible.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const trigger = triggerRef.current
    const menu = dropdownRef.current
    if (!trigger || !menu) return
    const r = trigger.getBoundingClientRect()
    const { placement, top } = computeVerticalPlacement(r.top, r.bottom, menu.offsetHeight, window.innerHeight)
    setPos({ top, left: r.left, minWidth: r.width, placement })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onScrollOrResize = () => onClose()
    const onMouseDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return
      if (dropdownRef.current?.contains(e.target)) return
      onClose()
    }
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [open, onClose])

  const AnchoredPortal = useCallback(
    ({ children }) => {
      if (!open) return null
      // Mounted-but-hidden until the layout effect computes `pos` (needs the
      // popover's measured height). visibility:hidden keeps offsetHeight real.
      const style = pos
        ? { position: 'fixed', top: pos.top, left: pos.left, minWidth: pos.minWidth, zIndex: 200 }
        : { position: 'fixed', top: 0, left: 0, visibility: 'hidden', zIndex: 200 }
      return createPortal(
        <div style={style} data-placement={pos?.placement}>
          {children}
        </div>,
        document.body,
      )
    },
    [open, pos],
  )

  return { triggerRef, dropdownRef, AnchoredPortal }
}
