import { useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { FormField } from '@odyssey/ui'
import { useAnchoredPortal } from './useAnchoredPortal.jsx'

/**
 * SelectField — static-option select on the FormField skin (read-only input
 * as the trigger; FormField spreads unknown props onto its <input>, so
 * readOnly/onMouseDown/onKeyDown land there). Lean stand-in for the future
 * normalized dropdown (SHP-66); options: [{ value, label }].
 *
 * Keyboard: ArrowDown on closed trigger opens; ArrowDown/Up move active option
 * (wrapping); Enter/Space select active; Escape closes + returns focus to
 * trigger. ARIA: role=combobox on trigger, role=listbox on list, role=option
 * + ids on items, aria-activedescendant tracks active item (mirrors
 * OrderRowActionMenu aria discipline, S52).
 */
export default function SelectField({
  label,
  showLabel = true,
  placeholder = 'Select an option',
  options,
  value,
  onChange,
  error,
  disabled = false,
  id,
}) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapRef = useRef(null)
  const selectedOption = options.find((o) => o.value === value)
  const { triggerRef: portalTriggerRef, dropdownRef, AnchoredPortal } = useAnchoredPortal({
    open,
    onClose: () => { setOpen(false); setActiveIdx(-1) },
  })
  const setWrapRef = (el) => {
    wrapRef.current = el
    portalTriggerRef.current = el
  }

  // Stable ids for ARIA wiring
  const listId = id ? `${id}-listbox` : undefined
  const getOptionId = (idx) => (id ? `${id}-option-${idx}` : undefined)

  // Seed active index to the currently selected option when opening
  const openDropdown = () => {
    const idx = options.findIndex((o) => o.value === value)
    setActiveIdx(idx >= 0 ? idx : 0)
    setOpen(true)
  }

  const closeDropdown = () => {
    setOpen(false)
    setActiveIdx(-1)
  }

  const selectActive = () => {
    if (activeIdx >= 0 && activeIdx < options.length) {
      onChange(options[activeIdx].value)
      closeDropdown()
    }
  }

  return (
    <div className="co-typeahead" ref={setWrapRef}>
      <FormField
        id={id}
        label={label}
        showLabel={showLabel}
        placeholder={placeholder}
        value={selectedOption?.label ?? ''}
        onChange={() => {}}
        error={error}
        disabled={disabled}
        trailingIcon={<ChevronDown size={16} />}
        readOnly
        style={{ cursor: disabled ? 'default' : 'pointer' }}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={activeIdx >= 0 ? getOptionId(activeIdx) : undefined}
        onMouseDown={(e) => {
          e.preventDefault()
          if (!disabled) open ? closeDropdown() : openDropdown()
        }}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (!open) { openDropdown(); return }
            setActiveIdx((i) => (i + 1) % options.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (!open) { openDropdown(); return }
            setActiveIdx((i) => (i <= 0 ? options.length - 1 : i - 1))
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!open) { openDropdown(); return }
            selectActive()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            closeDropdown()
            // focus returns to the trigger automatically (it's already focused)
          }
        }}
      />
      {open && !disabled && (
        <AnchoredPortal>
          <div
            ref={dropdownRef}
            id={listId}
            role="listbox"
            className="co-dropdown"
            onMouseDown={(e) => e.preventDefault()}
          >
            {options.map((opt, idx) => (
              <button
                key={opt.value}
                id={getOptionId(idx)}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                className={`co-dropdown__item${activeIdx === idx ? ' co-dropdown__item--active' : ''}`}
                onClick={() => {
                  onChange(opt.value)
                  closeDropdown()
                }}
              >
                <span className="text-label-sm-regular">{opt.label}</span>
              </button>
            ))}
          </div>
        </AnchoredPortal>
      )}
    </div>
  )
}
