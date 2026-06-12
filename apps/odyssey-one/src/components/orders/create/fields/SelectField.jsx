import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { FormField } from '@odyssey/ui'

/**
 * SelectField — static-option select on the FormField skin (read-only input
 * as the trigger; FormField spreads unknown props onto its <input>, so
 * readOnly/onMouseDown/onKeyDown land there). Lean stand-in for the future
 * normalized dropdown (SHP-66); options: [{ value, label }].
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
  const wrapRef = useRef(null)
  const selectedOption = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="co-typeahead" ref={wrapRef}>
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
        onMouseDown={(e) => {
          e.preventDefault()
          if (!disabled) setOpen(o => !o)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!disabled) setOpen(o => !o)
          }
          if (e.key === 'Escape') setOpen(false)
        }}
      />
      {open && !disabled && (
        <div className="co-dropdown" onMouseDown={(e) => e.preventDefault()}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="co-dropdown__item"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              <span className="text-label-sm-regular">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
