/**
 * useFieldPopover — shared popover-field behaviour.
 *
 * Manages the open/close lifecycle for a FormField + popover composite:
 * - Opens on field focus.
 * - Closes (blur-outside) when focus leaves the wrapper div.
 * - Tab key closes, Escape closes keeping focus in the field.
 * - Enter in the INPUT commits: fires onCommit then closes + defocuses.
 * - mousedown on the popover calls e.preventDefault() so the field never
 *   loses focus before a day-button click fires (Safari compat).
 *
 * Usage:
 *   const { open, setOpen, wrapperProps, fieldProps, popoverProps, closeAndBlur } =
 *     useFieldPopover({ onCommit })
 *
 *   <div {...wrapperProps}>
 *     <FormField {...fieldProps} />
 *     {open && <div {...popoverProps}><CalendarPicker … /></div>}
 *   </div>
 *
 * `wrapperProps` — { ref, onBlur, onKeyDown } for the outer div wrapper.
 * `fieldProps`   — { onFocus, aria-haspopup, aria-expanded } to spread onto FormField.
 * `popoverProps` — { onMouseDown } for the popover container div.
 * `closeAndBlur` — call after the user picks a value to close + defocus.
 *
 * Figma master: none (code-only behaviour hook).
 */
import { useRef, useState } from 'react'

export function useFieldPopover({ onCommit } = {}) {
  const wrapperRef = useRef(null)
  const [open, setOpen] = useState(false)

  const closeAndBlur = () => {
    setOpen(false)
    wrapperRef.current?.querySelector('input')?.blur()
  }

  const wrapperProps = {
    ref: wrapperRef,
    onBlur: (e) => {
      if (!wrapperRef.current?.contains(e.relatedTarget)) setOpen(false)
    },
    onKeyDown: (e) => {
      if (e.key === 'Tab') setOpen(false)
      else if (e.key === 'Escape') setOpen(false)
      else if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
        onCommit?.()
        closeAndBlur()
      }
    },
  }

  const fieldProps = {
    onFocus: () => setOpen(true),
    'aria-haspopup': 'dialog',
    'aria-expanded': open,
  }

  const popoverProps = {
    onMouseDown: (e) => e.preventDefault(),
  }

  return { open, setOpen, wrapperRef, wrapperProps, fieldProps, popoverProps, closeAndBlur }
}
