import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * useAnchoredPortal — shared hook for portaling dropdowns to document.body
 * with fixed positioning anchored to a trigger element's rect.
 * Mirrors the pattern from OrderRowActionMenu (S52).
 *
 * Usage:
 *   const { triggerRef, dropdownRef, rect, AnchoredPortal } = useAnchoredPortal({ open, onClose })
 *   — wrap the trigger element with ref={triggerRef}
 *   — render: open && <AnchoredPortal><div ref={dropdownRef} ...>{content}</div></AnchoredPortal>
 *
 * The hook:
 *   - Tracks the trigger's getBoundingClientRect when open changes to true
 *   - Closes on scroll (capture), resize, and mousedown outside both trigger+dropdown
 *   - Excludes the dropdown node from click-outside via dropdownRef
 */
export function useAnchoredPortal({ open, onClose }) {
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)
  const [rect, setRect] = useState(null)

  // Measure trigger on open
  useEffect(() => {
    if (open && triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect())
    }
  }, [open])

  // Close on scroll, resize, and mousedown outside
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

  /** Render portal anchored below the trigger. width matches trigger width. */
  const AnchoredPortal = useCallback(({ children }) => {
    if (!rect) return null
    return createPortal(
      <div
        style={{
          position: 'fixed',
          top: rect.bottom + 2,
          left: rect.left,
          width: rect.width,
          zIndex: 200,
        }}
      >
        {children}
      </div>,
      document.body,
    )
  }, [rect])

  return { triggerRef, dropdownRef, rect, AnchoredPortal }
}
