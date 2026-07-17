import { Info, CircleX } from 'lucide-react'
import FieldSelect from './FieldSelect.jsx'

/**
 * FormField — molecule (redesign, supersedes the 2255:98 master). Title label +
 * input row + optional error message, with a rich set of toggleable slots that
 * mirror the Figma component's properties (2602:1424).
 *
 * States: `filled` / `focused` derive automatically (value present / :focus-within);
 * `error` (pass a message string) and `disabled` are explicit. Error border is
 * `--bittersweet-200` idle → `--bittersweet-600` on focus, with a red message below.
 *
 * Slots (each maps to a Figma property):
 *   showLabel / label    — `Show label` + `Label`
 *   showInfo             — `Show info icon` (lucide/info beside the title)
 *   leadingIcon / trailingIcon — `Show/Leading Icon` + `Show/Trailing Icon` (placeholder-16 slots)
 *   onClear              — `Show X Icon` (clear button, shown when focused + filled)
 *   leadingSelect / trailingSelect — `{ label, onClick }` → a `FieldSelect` on that edge.
 *     The select's divider tracks the field's focus/error/disabled state via CSS
 *     (the parent overrides `--field-select-divider`), so no state prop is threaded.
 *
 * Figma master: `FormField` set 2602:1424 (Components-Molecules).
 */
export default function FormField({
  label,
  showLabel = true,
  showInfo = false,
  placeholder,
  value,
  onChange,
  type = 'text',
  error,
  disabled = false,
  leadingIcon,
  trailingIcon,
  leadingSelect,
  trailingSelect,
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
  const cls = [
    'form-field',
    error && 'form-field--error',
    disabled && 'form-field--disabled',
    className,
  ].filter(Boolean).join(' ')
  const errorId = error && id ? `${id}-error` : undefined
  const ariaDescribedBy = [errorId, describedBy].filter(Boolean).join(' ') || undefined
  const selectState = disabled ? 'disabled' : 'default'
  const showClear = !!onClear && !disabled && value != null && value !== ''
  // Counter is a basic-variant affordance only — suppress when either select edge is present.
  const showCharCounter = showCounter && maxLength && !leadingSelect && !trailingSelect

  return (
    <div className={cls}>
      {showLabel && label && (
        <div className="form-field__label-row">
          <label htmlFor={id} className="form-field__label text-label-sm-medium">
            {label}{required && <span className="form-field__required" aria-hidden="true"> *</span>}
          </label>
          {showInfo && <Info className="form-field__info" size={16} aria-hidden="true" />}
        </div>
      )}
      <div className="form-field__input">
        {leadingSelect && (
          <FieldSelect
            variant="leading"
            state={selectState}
            label={leadingSelect.label}
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
            onChange={onChange}
            autoComplete={autoComplete}
            required={required}
            aria-required={required || undefined}
            maxLength={maxLength}
            disabled={disabled}
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
          {trailingIcon && <span className="form-field__icon">{trailingIcon}</span>}
        </div>
        {trailingSelect && (
          <FieldSelect
            variant="trailing"
            state={selectState}
            label={trailingSelect.label}
            onClick={trailingSelect.onClick}
          />
        )}
      </div>
      {error && (
        <p className="form-field__error text-label-xs-regular" id={errorId} role="alert">{error}</p>
      )}
    </div>
  )
}
