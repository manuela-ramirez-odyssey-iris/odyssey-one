/**
 * Shared playground controls for the design-system explorer.
 *
 * Every demo's Playground had been growing its own `Toggle` (16 copies at the
 * time this landed, no two identical — `value`/`set` vs `checked`/`onChange`,
 * gap 6 vs --spacing-2, three different disabled treatments) plus raw inline
 * checkboxes and selects in 28 more. The controls are not the subject of any
 * demo, so they should look the same everywhere and be invisible next to the
 * component being shown.
 *
 * NOT in `demos/` on purpose: the explorer globs `./demos/*.demo.jsx`, and a
 * helper sitting there would be one bad rename away from being registered as a
 * component.
 *
 * Styling lives in DesignSystem.css (`.ds-control*`) rather than inline, so a
 * spacing change is one edit instead of eighty.
 */

/** The control bar. Wrap a Playground's inputs in one of these. */
export function DemoControls({ children, className = '' }) {
  return <div className={`ds-controls${className ? ` ${className}` : ''}`}>{children}</div>
}

function Control({ label, hint, disabled, children }) {
  return (
    <label className={`ds-control${disabled ? ' ds-control--disabled' : ''}`} title={hint || undefined}>
      <span className="ds-control__label">{label}</span>
      {children}
    </label>
  )
}

/** Boolean. `hint` explains a disabled state on hover rather than in silence. */
export function DemoToggle({ label, value, onChange, disabled = false, hint }) {
  return (
    <Control label={label} hint={hint} disabled={disabled}>
      <input
        type="checkbox"
        className="ds-control__checkbox"
        checked={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </Control>
  )
}

/**
 * One-of. `options` takes plain strings or `{ value, label }`; pass
 * `allowNone` for the common "or nothing at all" case, which yields ''.
 */
export function DemoSelect({ label, value, onChange, options, disabled = false, hint, allowNone = false, noneLabel = 'none' }) {
  return (
    <Control label={label} hint={hint} disabled={disabled}>
      <select
        className="ds-control__input"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {allowNone && <option value="">{noneLabel}</option>}
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o
          return <option key={opt.value} value={opt.value}>{opt.label}</option>
        })}
      </select>
    </Control>
  )
}

/** A bounded number. Kept separate from DemoField so `min`/`max` stay honest. */
export function DemoNumber({ label, value, onChange, min, max, step = 1, disabled = false, hint }) {
  return (
    <Control label={label} hint={hint} disabled={disabled}>
      <input
        type="number"
        className="ds-control__input ds-control__input--number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Control>
  )
}

/** Free text. */
export function DemoField({ label, value, onChange, disabled = false, hint, placeholder }) {
  return (
    <Control label={label} hint={hint} disabled={disabled}>
      <input
        type="text"
        className="ds-control__input"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Control>
  )
}
