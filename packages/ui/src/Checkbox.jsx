import { useEffect, useRef } from 'react'

/**
 * Checkbox — atom. A native `<input type="checkbox">` styled to the Odyssey
 * design system: a 16×16 box that fills `--control-checked-bg` with a white
 * `lucide/check` when checked, or a dash when `indeterminate`. Built on the
 * native input so keyboard, focus, label association, and form submission come
 * for free; the visible box is the input itself (`appearance: none`) with the
 * indicator overlaid.
 *
 * Figma master: `Checkbox` set 2821:330 (Components-Atoms), `State` ×
 * `Disabled`. Hover/focus are CSS-driven (not Figma variants). All values bound
 * to the `--control-*` tokens.
 */
export default function Checkbox({
  checked,
  defaultChecked,
  indeterminate = false,
  disabled = false,
  label,
  showLabel = true,
  onChange,
  name,
  value,
  id,
  className = '',
  ...rest
}) {
  const ref = useRef(null)

  // `indeterminate` is a DOM-only property — it can't be set via an attribute.
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate
  }, [indeterminate])

  const classes = ['control', 'control--checkbox', className].filter(Boolean).join(' ')

  return (
    <label className={classes} data-disabled={disabled || undefined}>
      <span className="control__box">
        <input
          ref={ref}
          type="checkbox"
          className="control__input"
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          onChange={onChange}
          name={name}
          value={value}
          id={id}
          {...rest}
        />
        <span className="control__mark" aria-hidden="true">
          <svg
            className="control__check"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="control__dash" />
        </span>
      </span>
      {showLabel && label != null && (
        <span className="control__label text-label-sm-medium">{label}</span>
      )}
    </label>
  )
}
