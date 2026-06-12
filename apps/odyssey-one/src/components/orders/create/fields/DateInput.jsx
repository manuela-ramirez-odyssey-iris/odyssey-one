import { Calendar } from 'lucide-react'
import { FormField } from '@odyssey/ui'

// "06152026" → "06/15/2026" while typing (digits-only mask)
export function maskDate(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/**
 * DateInput — masked MM/DD/YYYY text field with a calendar trailing icon
 * (no popover calendar — plan decision 10; the real date-picker is a
 * parallel-session normalization). `warning` renders the amber past-date
 * message (LINX-7632 — non-blocking); a real `error` wins the slot.
 *
 * KNOWN LIMITATION: the digits-only mask resets the caret to the end on any
 * mid-string edit (e.g. fixing the month while year is filled). A
 * caret-preserving mask or the normalized date-picker (parallel session)
 * supersedes this component; no fix planned here.
 */
export default function DateInput({ label, showLabel = true, value, onChange, error, warning, disabled, id }) {
  const warningId = !error && warning && id ? `${id}-warning` : undefined
  return (
    <div className="co-date-input">
      <FormField
        id={id}
        label={label}
        showLabel={showLabel}
        placeholder="MM/DD/YYYY"
        value={value}
        onChange={(e) => onChange(maskDate(e.target.value))}
        error={error}
        disabled={disabled}
        trailingIcon={<Calendar size={16} />}
        inputMode="numeric"
        autoComplete="off"
        describedBy={warningId}
      />
      {!error && warning && (
        <p id={warningId} className="co-field-warning text-label-xs-regular">{warning}</p>
      )}
    </div>
  )
}
