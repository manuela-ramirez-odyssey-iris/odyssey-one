import { CircleAlert, Lock } from 'lucide-react'

/**
 * FormField — molecule. Label + text input pair with optional trailing icon.
 *
 * States derived from props:
 *   default — idle
 *   focus   — :focus-within on the input wrapper
 *   error   — pass a non-empty `error` string
 *   locked  — pass `locked={true}` for read-only / prefilled fields
 *             (sets `readOnly` on the input + muted bg + cursor: not-allowed)
 *
 * Trailing icon priority (when no explicit `trailingIcon` slot is passed):
 *   locked → <Lock size={16} />
 *   error  → <CircleAlert size={16} />
 *   else   → none
 *
 * Figma master: `FormField` component set (2255:98) on Components-Molecules.
 */
export default function FormField({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  error,
  locked = false,
  trailingIcon,
  id,
  name,
  autoComplete,
  required = false,
  className = '',
  ...rest
}) {
  const icon = trailingIcon ?? (
    locked ? <Lock size={16} aria-hidden="true" /> :
    error ? <CircleAlert size={16} aria-hidden="true" /> :
    null
  )
  const cls = [
    'form-field',
    locked && 'form-field--locked',
    error && 'form-field--error',
    className,
  ].filter(Boolean).join(' ')
  const errorId = error && id ? `${id}-error` : undefined
  return (
    <div className={cls}>
      {label && (
        <label htmlFor={id} className="form-field__label">{label}</label>
      )}
      <div className="form-field__input">
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          readOnly={locked}
          aria-readonly={locked ? 'true' : undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId}
          tabIndex={locked ? -1 : undefined}
          onMouseDown={locked ? (e) => e.preventDefault() : undefined}
          {...rest}
        />
        {icon && <span className="form-field__icon" aria-hidden="true">{icon}</span>}
      </div>
      {error && (
        <p className="form-field__error" id={errorId} role="alert">{error}</p>
      )}
    </div>
  )
}
