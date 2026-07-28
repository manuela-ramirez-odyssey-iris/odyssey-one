import { DatePicker } from '@odyssey/ui'

const pad = (n) => String(n).padStart(2, '0')

/** "MM/DD/YYYY" ↔ Date adapters (the form/wire keep the masked string) */
export function strToDate(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s ?? '')
  if (!m) return null
  const d = new Date(+m[3], +m[1] - 1, +m[2])
  return d.getMonth() === +m[1] - 1 && d.getDate() === +m[2] ? d : null
}
export function dateToStr(d) {
  return d instanceof Date ? `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}` : ''
}

/**
 * DateField — the normalized @odyssey/ui DatePicker (calendar popover + typed
 * mask) bound to the form's "MM/DD/YYYY" string values (Jira LINX-8120 US
 * format). Replaces the app-local DateInput. `warning` renders the
 * non-blocking past-date notice below the field.
 */
export default function DateField({ id, label, value, onChange, error, warning, disabled }) {
  return (
    <div>
      <DatePicker
        id={id}
        label={label}
        format="MM/DD/YYYY"
        value={strToDate(value)}
        onChange={(d) => onChange(dateToStr(d))}
        error={error}
        disabled={disabled}
      />
      {warning && !error && (
        <p className="co-field-warning text-label-xs-regular">{warning}</p>
      )}
    </div>
  )
}
