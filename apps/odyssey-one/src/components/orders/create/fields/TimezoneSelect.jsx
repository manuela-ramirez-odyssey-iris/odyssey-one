import { ComboBox } from '@odyssey/ui'
import { TIMEZONES, TIMEZONE_LABELS } from '../../../../data/master-data'

const TZ_OPTIONS = TIMEZONES.map((tz) => ({ value: tz, label: TIMEZONE_LABELS[tz] ?? tz }))
const TZ_OPTIONS_SHORT = TIMEZONES.map((tz) => ({ value: tz, label: tz }))

// Auto-derivation from the party city happens upstream (PickupDeliverySection
// effect via deriveTimezone) — this stays a dumb select for the manual case.
//
// `short` (S144, user ruling) — abbreviation-only options ("CST") instead of
// the long "(UTC-06:00) Central Time (US & Canada)" label, for a field that
// shares its row with two other controls and would otherwise ellipsize.
// Orders keeps the long labels (no `short`), so it's a prop, not a swap.
export default function TimezoneSelect({ label, showLabel = true, value, onChange, error, disabled, id, short = false }) {
  return (
    <ComboBox
      id={id}
      variant="select"
      typable={false}
      label={label}
      showLabel={showLabel}
      placeholder="Select Timezone"
      options={short ? TZ_OPTIONS_SHORT : TZ_OPTIONS}
      value={value}
      onSelect={(val) => onChange(val ?? '')}
      error={error}
      disabled={disabled}
    />
  )
}
