import { useState } from 'react'
import { FormField } from '@odyssey/ui'
import { Search } from 'lucide-react'

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
        <h4 className="ds-demo-section__title">States</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <div style={{ width: 240 }}>
            <FormField label="Empty" placeholder="Placeholder" value="" onChange={() => {}} />
          </div>
          <div style={{ width: 240 }}>
            <FormField label="Filled" value="Hello" onChange={() => {}} onClear={() => {}} />
          </div>
          <div style={{ width: 240 }}>
            <FormField label="Error" value="bad@" onChange={() => {}} error="Invalid email." />
          </div>
          <div style={{ width: 240 }}>
            <FormField label="Disabled" value="Locked" onChange={() => {}} disabled />
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Composed FieldSelect (leading / trailing)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <div style={{ width: 280 }}>
            <FormField
              label="Phone"
              placeholder="555 0100"
              value=""
              onChange={() => {}}
              leadingSelect={{ label: '+1', onClick: () => {} }}
            />
          </div>
          <div style={{ width: 280 }}>
            <FormField
              label="Weight"
              placeholder="0"
              value=""
              onChange={() => {}}
              trailingSelect={{ label: 'kg', onClick: () => {} }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
