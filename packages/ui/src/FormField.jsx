import { Info, CircleX, Check } from 'lucide-react'
import FieldSelect from './FieldSelect.jsx'
import Radio from './Radio.jsx'

/**
 * FormField — molecule (redesign, supersedes the 2255:98 master). Title label +
 * input row + optional error message, with a rich set of toggleable slots that
 * mirror the Figma component's properties (2602:1424).
 *
 * States: `filled` / `focused` derive automatically (value present / :focus-within);
 * `error` (pass a message string) and `disabled` are explicit. Error border is
 * `--bittersweet-200` idle → `--bittersweet-600` on focus, with a red message below.
 * `validated` (boolean) is the success mirror (Figma `State=Validated`, 2026-07-28):
 * `--border-success` border, trailing check (text-tertiary, matches the mock's
 * DSN/500), and a green "Validated" line below. `error` wins when both are set.
 *
 * Slots (each maps to a Figma property):
 *   showLabel / label    — `Show label` + `Label`
 *   labelBadge           — optional node (e.g. `<Badge>`) rendered right next to the label
 *     (or Radio in radio mode); absent = not rendered.
 *   showInfo             — `Show info icon` (lucide/info beside the title)
 *   leadingIcon / trailingIcon — `Show/Leading Icon` + `Show/Trailing Icon` (placeholder-16 slots)
 *   onClear              — `Show X Icon` (clear button, shown when focused + filled)
 *   format               — input CONTENT policy (code-only, no Figma axis):
 *     'text' (default) | 'integer' | 'decimal' | 'phone'.
 *     Sets the right mobile `inputMode` AND rejects characters that don't
 *     belong, so a typo can never land in the value. This is deliberately a
 *     small closed set, not a mask DSL — anything richer (currency grouping,
 *     locale separators) belongs in a dedicated field component.
 *   leadingSelect / trailingSelect — `{ label, onClick, locked }` → a `FieldSelect` on that edge.
 *     The select's divider tracks the field's focus/error/disabled state via CSS
 *     (the parent overrides `--field-select-divider`), so no state prop is threaded.
 *     `locked: true` = the value is decided by another field, so the select shows
 *     the label as static text, no chevron, not clickable (the input stays usable).
 *
 * Figma master: `FormField` set 2602:1424 (Components-Molecules).
 */
// Content policies: which characters may reach the value, and the keyboard to
// offer. Keys are the `format` prop's values.
const FORMATS = {
  text: null,
  integer: { inputMode: 'numeric', strip: /[^0-9]/g },
  decimal: { inputMode: 'decimal', strip: /[^0-9.]/g, oneDot: true },
  phone: { inputMode: 'tel', strip: /[^0-9+()\-.\s]/g },
}

/** Apply a format's policy to raw input text. Exported for tests. */
export function applyFormat(raw, format) {
  const f = FORMATS[format]
  if (!f) return raw
  let out = String(raw).replace(f.strip, '')
  if (f.oneDot) {
    const i = out.indexOf('.')
    // keep the FIRST dot, drop any later ones ("1.2.3" → "1.23")
    if (i !== -1) out = out.slice(0, i + 1) + out.slice(i + 1).replace(/\./g, '')
  }
  return out
}

export default function FormField({
  label,
  showLabel = true,
  showInfo = false,
  placeholder,
  value,
  onChange,
  type = 'text',
  format = 'text',
  error,
  validated = false,
  disabled = false,
  leadingIcon,
  trailingIcon,
  leadingSelect,
  trailingSelect,
  radio,
  labelBadge,
  onClear,
  id,
  name,
  autoComplete,
  required = false,
  maxLength,
  showCounter = false,
  className = '',
  // NOTE(normalization): describedBy added post-Figma — flag in tracker on next sync
  describedBy,
  ...rest
}) {
  const isValidated = validated && !error
  const isDisabled = disabled || (radio && !radio.checked)
  // Reject disallowed characters BEFORE they reach the consumer's state — the
  // value can never end up unfixable (a NaN that re-parses to NaN forever).
  const handleChange = (e) => {
    const clean = applyFormat(e.target.value, format)
    if (clean !== e.target.value) e.target.value = clean
    onChange?.(e)
  }
  const cls = [
    'form-field',
    error && 'form-field--error',
    isValidated && 'form-field--validated',
    isDisabled && 'form-field--disabled',
    className,
  ].filter(Boolean).join(' ')
  const errorId = error && id ? `${id}-error` : undefined
  const ariaDescribedBy = [errorId, describedBy].filter(Boolean).join(' ') || undefined
  const selectState = isDisabled ? 'disabled' : 'default'
  const showClear = !!onClear && !isDisabled && value != null && value !== ''
  // Counter is a basic-variant affordance only — suppress when either select edge is present.
  const showCharCounter = showCounter && maxLength && !leadingSelect && !trailingSelect

  return (
    <div className={cls}>
      {showLabel && label && (
        <div className="form-field__label-row">
          {radio ? (
            <>
              <Radio
                checked={radio.checked}
                onChange={radio.onChange}
                name={radio.name}
                value={radio.value}
                label={label}
                showLabel={showLabel}
              />
              {labelBadge}
            </>
          ) : (
            <>
              <label htmlFor={id} className="form-field__label text-label-sm-medium">
                {label}{required && <span className="form-field__required" aria-hidden="true"> *</span>}
              </label>
              {labelBadge}
              {showInfo && <Info className="form-field__info" size={16} aria-hidden="true" />}
            </>
          )}
        </div>
      )}
      <div className="form-field__input">
        {leadingSelect && (
          <FieldSelect
            variant="leading"
            state={selectState}
            label={leadingSelect.label}
            locked={leadingSelect.locked}
            onClick={leadingSelect.onClick}
          />
        )}
        <div className="form-field__control">
          {leadingIcon && <span className="form-field__icon" aria-hidden="true">{leadingIcon}</span>}
          <input
            id={id}
            name={name}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            inputMode={FORMATS[format]?.inputMode}
            autoComplete={autoComplete}
            required={required}
            aria-required={required || undefined}
            maxLength={maxLength}
            disabled={isDisabled}
            className="form-field__field text-label-sm-regular"
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={ariaDescribedBy}
            {...rest}
          />
          {showCharCounter && (
            <span className="form-field__counter text-label-xs-regular">
              {(value ?? '').length}/{maxLength}
            </span>
          )}
          {showClear && (
            <button type="button" className="form-field__clear" aria-label="Clear" onClick={onClear}>
              <CircleX size={16} aria-hidden="true" />
            </button>
          )}
          {/* No aria-hidden here: the trailing slot may hold an interactive
              control (e.g. TimePicker/MultiSelect chevron toggle). Decorative
              icons carry their own aria-hidden, so nothing leaks either way. */}
          {isValidated && (
            <span className="form-field__icon" aria-hidden="true">
              <Check size={16} />
            </span>
          )}
          {trailingIcon && <span className="form-field__icon">{trailingIcon}</span>}
        </div>
        {trailingSelect && (
          <FieldSelect
            variant="trailing"
            state={selectState}
            label={trailingSelect.label}
            locked={trailingSelect.locked}
            onClick={trailingSelect.onClick}
          />
        )}
      </div>
      {error && (
        <p className="form-field__error text-label-xs-regular" id={errorId} role="alert">{error}</p>
      )}
      {isValidated && (
        <p className="form-field__validated text-label-xs-regular">Validated</p>
      )}
    </div>
  )
}
