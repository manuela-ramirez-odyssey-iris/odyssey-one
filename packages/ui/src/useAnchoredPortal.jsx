import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * useAnchoredPortal — positions a popover in a body-level portal, anchored below
 * a trigger element. Closes on scroll (capture), resize, and mousedown outside
 * both the trigger and the popover. The popover's `minWidth` matches the trigger
 * (it can grow wider to hug its content). Used by the Dropdown molecule.
 *
 * Ported from the app's orders/create/fields hook into @odyssey/ui so library
 * components are self-contained. Dependency-free (react + react-dom only).
 *
 *   const { triggerRef, dropdownRef, AnchoredPortal } = useAnchoredPortal({ open, onClose })
 *   <span ref={triggerRef}>{trigger}</span>
 *   {open && <AnchoredPortal><div ref={dropdownRef}>{popover}</div></AnchoredPortal>}
 */
export function useAnchoredPortal({ open, onClose }) {
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (open && triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect())
    }
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
      if (!rect) return null
      return createPortal(
        <div style={{ position: 'fixed', top: rect.bottom + 2, left: rect.left, minWidth: rect.width, zIndex: 200 }}>
          {children}
        </div>,
        document.body,
      )
    },
    [rect],
  )

  return { triggerRef, dropdownRef, AnchoredPortal }
}
