import { Info } from 'lucide-react'

/**
 * TextArea — molecule. FormField's multiline sibling: label row + a bordered
 * box holding a borderless <textarea> and an optional character-count footer
 * (the count lives INSIDE the box, per Figma) + optional error message below.
 *
 * States mirror FormField exactly: `filled`/`focused` derive automatically
 * (:focus-within on the box), `error` (message string) and `disabled` are
 * explicit — the Figma master has a single Default state; state variants are a
 * pending Efrain ask, so the visuals inherit FormField's state tokens.
 *
 * Resizing: CSS `resize` sits on the BOX (not the textarea), so the native
 * grip renders at the box corner below the footer — matching the mock's drawn
 * indicator without replicating its vector.
 *
 * Figma master: `TextArea` (Components-Molecules, Fields section) —
 * `Placeholder` + `Count` TEXT props, `Show Count` BOOLEAN. The mock's hidden
 * AI-assist affordances (wand-sparkles / "generate text" buttons) are
 * deliberately NOT modeled — deferred pending Efrain.
 *
 * Props:
 *   label / showLabel / showInfo — identical label-row contract to FormField.
 *   placeholder, value, onChange — controlled textarea.
 *   maxLength   — native maxLength; also enables the "N/max" footer count.
 *   showCount   — override the footer visibility (default: true when maxLength set).
 *   rows        — initial visible lines (default 2 ≈ the Figma 64px input area).
 *   resize      — 'vertical' | 'none' (default 'vertical').
 *   error       — message string; red state + role="alert" line below.
 *   disabled    — disabled state (gray surface, not-allowed cursor).
 *   id / name / required / className / describedBy / ...rest → <textarea>.
 */
export default function TextArea({
  label,
  showLabel = true,
  showInfo = false,
  placeholder,
  value,
  onChange,
  maxLength,
  showCount,
  rows = 2,
  resize = 'vertical',
  error,
  disabled = false,
  id,
  name,
  required = false,
  className = '',
  describedBy,
  ...rest
}) {
  const cls = [
    'text-area',
    error && 'text-area--error',
    disabled && 'text-area--disabled',
    className,
  ].filter(Boolean).join(' ')
  const errorId = error && id ? `${id}-error` : undefined
  const ariaDescribedBy = [errorId, describedBy].filter(Boolean).join(' ') || undefined
  const shouldShowCount = showCount ?? maxLength != null
  const length = String(value ?? '').length
  const count = maxLength != null ? `${length}/${maxLength}` : String(length)

  return (
    <div className={cls}>
      {showLabel && label && (
        <div className="text-area__label-row">
          <label htmlFor={id} className="text-area__label text-label-sm-medium">{label}</label>
          {showInfo && <Info className="text-area__info" size={16} aria-hidden="true" />}
        </div>
      )}
      <div className={`text-area__box${resize === 'none' ? ' text-area__box--fixed' : ''}`}>
        <textarea
          id={id}
          name={name}
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          required={required}
          disabled={disabled}
          className="text-area__field text-label-sm-regular"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={ariaDescribedBy}
          {...rest}
        />
        {shouldShowCount && (
          <div className="text-area__footer">
            <span className="text-area__count text-label-xs-regular">{count}</span>
          </div>
        )}
      </div>
      {error && (
        <p className="text-area__error text-label-xs-regular" id={errorId} role="alert">{error}</p>
      )}
    </div>
  )
}
