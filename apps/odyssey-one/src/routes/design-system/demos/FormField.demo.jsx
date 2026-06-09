import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { FormField } from '@odyssey/ui'
import { Search, Calendar } from 'lucide-react'

export const meta = {
  name: 'FormField',
  tier: 'molecule',
  figmaNode: '2602:1424',
  codeConnect: 'packages/ui/src/FormField.figma.tsx',
}

export const props = [
  { name: 'label', type: 'string', desc: 'Field title.' },
  { name: 'showLabel', type: 'boolean', desc: 'Show the label row. Default true.' },
  { name: 'showInfo', type: 'boolean', desc: 'Show the info icon beside the label. Default false.' },
  { name: 'placeholder', type: 'string', desc: 'Input placeholder.' },
  { name: 'value', type: 'string|number', desc: 'Controlled value; drives the derived filled state.' },
  { name: 'onChange', type: '(e) => void', desc: 'Input change handler.' },
  { name: 'error', type: 'string|false', desc: 'Error message; truthy reddens border + shows the message.' },
  { name: 'disabled', type: 'boolean', desc: 'Disables the input and all buttons.' },
  { name: 'leadingIcon', type: 'ReactNode', desc: 'Icon left of the input.' },
  { name: 'trailingIcon', type: 'ReactNode', desc: 'Icon right of the input.' },
  { name: 'leadingSelect', type: '{ label, onClick }', desc: 'Renders a leading FieldSelect.' },
  { name: 'trailingSelect', type: '{ label, onClick }', desc: 'Renders a trailing FieldSelect.' },
  { name: 'onClear', type: '() => void', desc: 'Clear-X handler; the button shows only when set, enabled, and value non-empty.' },
]

export const tokens = [
  { token: '--bittersweet-200', resolves: 'Bittersweet/200', usage: 'error border — idle' },
  { token: '--bittersweet-600', resolves: 'Bittersweet/600', usage: 'error border — focused' },
  { token: '--border-strong', resolves: 'Border/strong', usage: 'focus border' },
]

// Each showcase field owns its value so it is actually typeable — the explorer's
// whole point is live components, not frozen controlled inputs. Disabled stays
// non-typeable by design; `error` keeps showing its state as you type.
function LiveField({ initial = '', clearable = true, ...props }) {
  const [v, setV] = useState(initial)
  return (
    <FormField
      {...props}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onClear={clearable && !props.disabled ? () => setV('') : undefined}
    />
  )
}

// A FormField whose edge FieldSelect opens a working options menu — the leading/
// trailing select is a real value picker (country code, unit), wired the way a
// production consumer would wire the SHP-66 dropdown to FieldSelect's onClick.
function ComposedField({ edge, label, placeholder, options, initial }) {
  const [value, setValue] = useState('')
  const [pick, setPick] = useState(initial)
  const [open, setOpen] = useState(false)
  const [triggerWidth, setTriggerWidth] = useState()
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  // Match the menu to the nested FieldSelect's actual width, re-measured when the
  // selected value changes — so picking a longer code widens the trigger AND menu.
  useLayoutEffect(() => {
    const fs = ref.current?.querySelector('.field-select')
    if (fs) setTriggerWidth(fs.offsetWidth)
  }, [pick, open])

  const select = { label: pick, onClick: () => setOpen((o) => !o) }
  const selectProps = edge === 'leading' ? { leadingSelect: select } : { trailingSelect: select }

  return (
    <div ref={ref} style={{ position: 'relative', width: 280 }}>
      <FormField
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        {...selectProps}
      />
      {open && (
        <ul
          className="ds-menu"
          role="listbox"
          style={{ width: triggerWidth, ...(edge === 'trailing' ? { left: 'auto', right: 0 } : {}) }}
        >
          {options.map((opt) => (
            <li key={opt} role="option" aria-selected={opt === pick}>
              <button
                type="button"
                className="ds-menu__item"
                aria-selected={opt === pick}
                onClick={() => {
                  setPick(opt)
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

export default function FormFieldDemo() {
  const [value, setValue] = useState('Acme Logistics')
  const [error, setError] = useState(false)
  const [disabled, setDisabled] = useState(false)

  return (
    <div>
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive playground</h4>
        <div className="ds-demo-row" style={{ marginBottom: 'var(--spacing-4)' }}>
          <label style={{ display: 'inline-flex', gap: 'var(--spacing-2)', alignItems: 'center', fontSize: 'var(--font-size-sm)' }}>
            <input type="checkbox" checked={error} onChange={(e) => setError(e.target.checked)} /> error
          </label>
          <label style={{ display: 'inline-flex', gap: 'var(--spacing-2)', alignItems: 'center', fontSize: 'var(--font-size-sm)' }}>
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} /> disabled
          </label>
        </div>
        <div style={{ maxWidth: 360 }}>
          <FormField
            label="Customer"
            showInfo
            placeholder="Search customers"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onClear={() => setValue('')}
            leadingIcon={<Search size={16} />}
            error={error ? 'This customer is not recognized.' : false}
            disabled={disabled}
          />
        </div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
          Type to fill · focus to see the border + label react · clear-X appears when non-empty.
        </p>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">States (all live — type to try)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <div style={{ width: 240 }}>
            <LiveField label="Empty" placeholder="Placeholder" />
          </div>
          <div style={{ width: 240 }}>
            <LiveField label="Filled" initial="Hello" />
          </div>
          <div style={{ width: 240 }}>
            <LiveField label="Error" initial="bad@" error="Invalid email." />
          </div>
          <div style={{ width: 240 }}>
            <LiveField label="Disabled" initial="Locked" disabled />
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Icon slots (leadingIcon / trailingIcon)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <div style={{ width: 240 }}>
            <LiveField label="Leading" placeholder="Search" clearable={false} leadingIcon={<Search size={16} />} />
          </div>
          <div style={{ width: 240 }}>
            <LiveField label="Trailing" placeholder="Pick a date" clearable={false} trailingIcon={<Calendar size={16} />} />
          </div>
          <div style={{ width: 240 }}>
            <LiveField
              label="Both"
              placeholder="Search dates"
              clearable={false}
              leadingIcon={<Search size={16} />}
              trailingIcon={<Calendar size={16} />}
            />
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Composed FieldSelect (leading / trailing)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <ComposedField
            edge="leading"
            label="Phone"
            placeholder="555 0100"
            initial="+1"
            options={['+1', '+44', '+52', '+212', '+1671']}
          />
          <ComposedField
            edge="trailing"
            label="Weight"
            placeholder="0"
            initial="kg"
            options={['kg', 'lb', 'ton', 'oz']}
          />
        </div>
      </div>
    </div>
  )
}
