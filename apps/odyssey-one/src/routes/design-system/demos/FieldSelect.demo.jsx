import { useState } from 'react'
import { FieldSelect } from '@odyssey/ui'

export const meta = {
  name: 'FieldSelect',
  tier: 'atom',
  figmaNode: '2627:153',
  codeConnect: 'packages/ui/src/FieldSelect.figma.tsx',
}

export const props = [
  { name: 'variant', type: 'leading|trailing', desc: 'Edge side. leading = left border (divider on right); trailing = right border (divider on left). Default trailing.' },
  { name: 'state', type: 'default|focus|disabled|error-default|error', desc: 'Drives the divider color ladder. Default default.' },
  { name: 'label', type: 'string', desc: 'Trigger text (e.g. "+1", "kg"). Default "Select".' },
  { name: 'onClick', type: '() => void', desc: 'Open the parent-supplied menu.' },
]

export const tokens = [
  { token: '--field-select-divider', resolves: 'state ladder', usage: 'one-sided divider color; overridable by a parent FormField' },
  { token: '--border-default', resolves: 'Border/default', usage: 'divider — default' },
  { token: '--border-strong', resolves: 'Border/strong', usage: 'divider — focus' },
  { token: '--bittersweet-200', resolves: 'Bittersweet/200', usage: 'divider — error-default' },
  { token: '--bittersweet-600', resolves: 'Bittersweet/600', usage: 'divider — error' },
]

const STATES = ['default', 'focus', 'disabled', 'error-default', 'error']

// Demo-only: clicking the trigger opens a fake options menu (the real menu is a
// consumer-supplied dropdown — SHP-66). Picking a value updates the label.
function FieldSelectPicker({ variant, options, initial }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(initial)
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <FieldSelect
        variant={variant}
        state={open ? 'focus' : 'default'}
        label={value}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <ul className="ds-menu" role="listbox">
          {options.map((opt) => (
            <li key={opt} role="option" aria-selected={opt === value}>
              <button
                type="button"
                className="ds-menu__item"
                aria-selected={opt === value}
                onClick={() => {
                  setValue(opt)
                  setOpen(false)
                }}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function FieldSelectDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Edge-attached select trigger. Standalone it colors its own one-sided divider
        from the <code>state</code> ladder; inside a <code>FormField</code> the parent
        drives <code>--field-select-divider</code>. See the FormField demo for composition.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive — click to open (hover for the surface tint)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <FieldSelectPicker variant="leading" initial="+1" options={['+1', '+44', '+52', '+91']} />
          <FieldSelectPicker variant="trailing" initial="kg" options={['kg', 'lb', 'ton', 'oz']} />
        </div>
      </div>

      {['leading', 'trailing'].map((variant) => (
        <div className="ds-demo-section" key={variant}>
          <h4 className="ds-demo-section__title">variant = {variant}</h4>
          <div className="ds-demo-row">
            {STATES.map((state) => (
              <div className="ds-demo-col" key={state} style={{ alignItems: 'center' }}>
                <FieldSelect variant={variant} state={state} label="Select" />
                <span className="ds-demo-label">{state}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
