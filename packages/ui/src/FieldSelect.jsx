import { ChevronDown } from 'lucide-react'

/**
 * FieldSelect — atom. The edge-attached select trigger that sits on the leading
 * or trailing side of a FormField (e.g. a "+1 ▾" country code on the lead, a
 * "Select ▾" / unit picker on the trail). It is a real value selector: clicking
 * it (`onClick`) opens a dropdown of options whose selection changes the field's
 * value/format (the country code reformats the phone input; the unit changes the
 * input's meaning). This atom is only the TRIGGER — it shows the current value
 * via `label`; the options menu + value wiring are supplied by the consumer /
 * FormField (the menu itself is the SHP-66 dropdown, a separate component).
 *
 * Its visual `state` is driven by the parent field (the one-sided divider
 * reflects the field's focus/error state), so it exposes `variant` + `state`
 * rather than owning that interaction.
 *
 * The divider is a one-sided border — `border-right` for `leading`, `border-left`
 * for `trailing` — whose color is the state ladder: default `--border-default` →
 * focus `--border-strong` → disabled `--border-subtle` → error-default
 * `--bittersweet-200` → error `--bittersweet-600`.
 *
 * Leading vs Trailing differ ON PURPOSE (deliberate per design): on `error` /
 * `error-default`, **leading** reddens the label + chevron too; **trailing**
 * reddens the divider only (label/chevron stay `--text-tertiary`).
 *
 * Figma master: `FieldSelect` set 2627:153 (Components-Atoms), `Variant`
 * (Leading|Trailing) × `State` (Default/Focus/Disabled/Error Default/Error).
 */
export default function FieldSelect({
  variant = 'trailing',
  state = 'default',
  label = 'Select',
  onClick,
  className = '',
  ...rest
}) {
  const classes = [
    'field-select',
    `field-select--${variant}`,
    state !== 'default' && `field-select--${state}`,
    'text-label-sm-regular',
    className,
  ].filter(Boolean).join(' ')
  return (
    <button
      type="button"
      className={classes}
      disabled={state === 'disabled'}
      onClick={onClick}
      {...rest}
    >
      {label}
      <ChevronDown size={16} aria-hidden="true" />
    </button>
  )
}
