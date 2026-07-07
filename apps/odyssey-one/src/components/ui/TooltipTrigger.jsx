import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Tooltip } from '@odyssey/ui'

/**
 * TooltipTrigger — app-local hover/focus trigger wrapper for the normalized
 * @odyssey/ui Tooltip card. Renders `children` as the anchor; shows the Tooltip
 * in a body-level portal on hover or keyboard focus; hides on leave, blur, or
 * Escape. Keyboard-accessible: focus triggers the same tooltip as hover.
 *
 * Positioning: centers the card above the anchor; flips below when the card
 * would clip the viewport top.
 *
 * @param tooltipProps  Props forwarded to <Tooltip> (badgeVariant, label,
 *                      status, groups, leftIcon, className).
 * @param children      Anchor content.
 * @param asSpan        Use a <span> wrapper instead of <div> (default false).
 * @param disabled      Suppress the tooltip entirely.
 */
export default function TooltipTrigger({ children, tooltipProps = {}, asSpan = false, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [style, setStyle] = useState({})
  const anchorRef = useRef(null)
  const cardRef = useRef(null)
  const hideTimer = useRef(null)
  const id = useId()

  // Place the card (above by default; flip below if not enough space).
  // Runs in a layout effect after the portal mounts so cardRef has offsetHeight.
  useLayoutEffect(() => {
    if (!open) { setPlaced(false); return }
    const anchor = anchorRef.current
    const card = cardRef.current
    if (!anchor || !card) return

    const r = anchor.getBoundingClientRect()
    const CARD_GAP = 6
    const EDGE_MARGIN = 8
    const cardH = card.offsetHeight
    const cardW = card.offsetWidth

    // Clamp the center so the card never clips the viewport sides — needed now
    // that the card keeps its natural width (see width: max-content below).
    const rawCenterX = r.left + r.width / 2
    const centerX = Math.min(
      Math.max(rawCenterX, EDGE_MARGIN + cardW / 2),
      window.innerWidth - EDGE_MARGIN - cardW / 2,
    )

    const openAbove = r.top >= cardH + CARD_GAP
    setStyle({
      position: 'fixed',
      left: centerX,
      top: openAbove ? r.top - CARD_GAP : r.bottom + CARD_GAP,
      transform: openAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      // Fixed-position auto width shrinks-to-fit the space right of `left`
      // BEFORE the -50% transform — an anchor near the right viewport edge
      // squeezed the card to roughly the anchor's width. max-content keeps
      // the card at its natural size (the .tooltip max-width still caps it).
      width: 'max-content',
      zIndex: 9999,
      pointerEvents: 'none',
    })
    setPlaced(true)
  }, [open])

  const show = useCallback(() => {
    if (disabled) return
    clearTimeout(hideTimer.current)
    setOpen(true)
  }, [disabled])

  const hide = useCallback(() => {
    // Small delay prevents flicker when moving between trigger and tooltip area
    hideTimer.current = window.setTimeout(() => setOpen(false), 80)
  }, [])

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false) }
  }, [open])

  const Wrap = asSpan ? 'span' : 'div'

  return (
    <Wrap
      ref={anchorRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={onKeyDown}
      aria-describedby={open ? id : undefined}
      style={{ display: 'inline-flex', alignItems: 'center' }}
    >
      {children}
      {open && createPortal(
        <div
          ref={cardRef}
          id={id}
          style={placed ? style : { position: 'fixed', top: 0, left: 0, width: 'max-content', visibility: 'hidden', zIndex: 9999 }}
        >
          <Tooltip {...tooltipProps} />
        </div>,
        document.body
      )}
    </Wrap>
  )
}
