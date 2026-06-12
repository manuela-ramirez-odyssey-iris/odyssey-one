import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'

/**
 * DatePickerPopover — calendar popover rendered in a body portal.
 * Architecture: field and calendar are separate components (mirrors
 * SearchField precedent). Positioned from the trigger rect (fixed, like
 * OrderRowActionMenu). Escape and click-outside close; picking a day calls
 * onSelect with a JS Date, which DateInput converts to MM/DD/YYYY.
 *
 * DayPicker internal day-grid styling uses react-day-picker's default CSS.
 * A normalization pass will style it against design tokens; see TODO below.
 * TODO(normalize): style DayPicker internals with Odyssey design tokens once
 * the date-picker component enters the normalization pipeline.
 */
export default function DatePickerPopover({ triggerRect, selected, defaultMonth, onSelect, onClose }) {
  const popoverRef = useRef(null)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    const handleMouseDown = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) onClose()
    }
    const handleScrollOrResize = () => onClose()
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [onClose])

  if (!triggerRect) return null

  const style = {
    position: 'fixed',
    top: triggerRect.bottom + 4,
    left: triggerRect.left,
    zIndex: 200,
  }

  return createPortal(
    <div
      ref={popoverRef}
      className="co-datepicker"
      style={style}
      // Prevent mousedown from propagating to document (which would trigger onClose)
      onMouseDown={(e) => e.stopPropagation()}
    >
      <DayPicker
        mode="single"
        selected={selected}
        defaultMonth={defaultMonth ?? selected}
        onSelect={(day) => {
          if (day) onSelect(day)
        }}
      />
    </div>,
    document.body,
  )
}
