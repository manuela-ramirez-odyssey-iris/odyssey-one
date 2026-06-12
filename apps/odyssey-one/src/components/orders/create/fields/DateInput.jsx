import { useCallback, useRef, useState } from 'react'
import { Calendar } from 'lucide-react'
import { FormField } from '@odyssey/ui'
import DatePickerPopover from './DatePickerPopover.jsx'

// "06152026" → "06/15/2026" while typing (digits-only mask)
export function maskDate(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/** Parse "MM/DD/YYYY" to a JS Date, or return undefined if invalid */
function parseMMDDYYYY(str) {
  if (!str || str.length !== 10) return undefined
  const [mm, dd, yyyy] = str.split('/')
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  if (isNaN(d.getTime())) return undefined
  return d
}

/** Format a JS Date to "MM/DD/YYYY" */
function formatDate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

/**
 * DateInput — masked MM/DD/YYYY text field. The trailing Calendar icon
 * opens DatePickerPopover (separate component — mirrors SearchField precedent).
 * Picking a day writes the masked string through onChange and closes the popover.
 * Typed input remains the source of truth; the mask still works unchanged.
 *
 * KNOWN LIMITATION: the digits-only mask resets the caret to the end on any
 * mid-string edit (e.g. fixing the month while year is filled). A
 * caret-preserving mask or the normalized date-picker supersedes this; no fix
 * planned here.
 */
export default function DateInput({ label, showLabel = true, value, onChange, error, warning, disabled, id }) {
  const [calOpen, setCalOpen] = useState(false)
  const [triggerRect, setTriggerRect] = useState(null)
  const calBtnRef = useRef(null)
  const warningId = !error && warning && id ? `${id}-warning` : undefined

  const openCalendar = useCallback(() => {
    if (disabled) return
    const rect = calBtnRef.current?.getBoundingClientRect()
    setTriggerRect(rect ?? null)
    setCalOpen(true)
  }, [disabled])

  const handleDaySelect = useCallback((day) => {
    onChange(formatDate(day))
    setCalOpen(false)
  }, [onChange])

  const selected = parseMMDDYYYY(value)

  return (
    <div className="co-date-input">
      <FormField
        id={id}
        label={label}
        showLabel={showLabel}
        placeholder="Select Date"
        value={value}
        onChange={(e) => onChange(maskDate(e.target.value))}
        error={error}
        disabled={disabled}
        trailingIcon={
          <button
            ref={calBtnRef}
            type="button"
            aria-label="Open calendar"
            aria-expanded={calOpen}
            className="co-date-cal-btn"
            tabIndex={disabled ? -1 : 0}
            onClick={openCalendar}
          >
            <Calendar size={16} />
          </button>
        }
        inputMode="numeric"
        autoComplete="off"
        describedBy={warningId}
      />
      {!error && warning && (
        <p id={warningId} className="co-field-warning text-label-xs-regular">{warning}</p>
      )}
      {calOpen && (
        <DatePickerPopover
          triggerRect={triggerRect}
          selected={selected}
          defaultMonth={selected}
          onSelect={handleDaySelect}
          onClose={() => setCalOpen(false)}
        />
      )}
    </div>
  )
}
