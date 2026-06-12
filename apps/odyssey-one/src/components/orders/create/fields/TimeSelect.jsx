import SelectField from './SelectField.jsx'

// HH:MM 24h on the half hour. The form value may stay empty ("Select Time"
// placeholder, fix capture 2026-06-12); the 00:00 default (LINX-7634) is
// applied at the wire by the mapper (toIsoTimestamp `time || '00:00'`).
export const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0')
  const m = i % 2 ? '30' : '00'
  return { value: `${h}:${m}`, label: `${h}:${m}` }
})

export default function TimeSelect({ label, showLabel = true, value, onChange, error, disabled, id }) {
  return (
    <SelectField
      id={id}
      label={label}
      showLabel={showLabel}
      placeholder="Select Time"
      options={TIME_OPTIONS}
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled}
    />
  )
}
