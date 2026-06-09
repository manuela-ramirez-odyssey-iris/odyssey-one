/**
 * Radio — atom. A native `<input type="radio">` styled to the Odyssey design
 * system: a 16×16 circle that fills `--control-checked-bg` with a white center
 * dot when checked. Built on the native input so keyboard arrow-group
 * navigation, focus, label association, and form submission come for free; the
 * visible circle is the input itself (`appearance: none`) with the dot overlaid.
 * Group radios by passing a shared `name`.
 *
 * Figma master: `Radio` set 2824:330 (Components-Atoms), `State` × `Disabled`.
 * Hover/focus are CSS-driven (not Figma variants). All values bound to the
 * `--control-*` tokens (shared with Checkbox).
 */
export default function Radio({
  checked,
  defaultChecked,
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
  const classes = ['control', 'control--radio', className].filter(Boolean).join(' ')

  return (
    <label className={classes} data-disabled={disabled || undefined}>
      <span className="control__box">
        <input
          type="radio"
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
          <span className="control__dot" />
        </span>
      </span>
      {showLabel && label != null && (
        <span className="control__label text-label-sm-medium">{label}</span>
      )}
    </label>
  )
}
