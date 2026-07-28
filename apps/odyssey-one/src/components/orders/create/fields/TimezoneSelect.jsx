import { ComboBox } from '@odyssey/ui'
import { TIMEZONES, TIMEZONE_LABELS } from '../../../../data/master-data'

const TZ_OPTIONS = TIMEZONES.map((tz) => ({ value: tz, label: TIMEZONE_LABELS[tz] ?? tz }))

// Auto-derivation from the party city happens upstream (PickupDeliverySection
// effect via deriveTimezone) — this stays a dumb select for the manual case.
export default function TimezoneSelect({ label, showLabel = true, value, onChange, error, disabled, id }) {
  return (
    <ComboBox
      id={id}
      variant="select"
      typable={false}
      label={label}
      showLabel={showLabel}
      placeholder="Select Timezone"
      options={TZ_OPTIONS}
      value={value}
      onSelect={(val) => onChange(val ?? '')}
      error={error}
      disabled={disabled}
    />
  )
}
