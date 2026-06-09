import { useState } from 'react'
import { Radio } from '@odyssey/ui'

export const meta = {
  name: 'Radio',
  tier: 'atom',
  figmaNode: '2824:330',
  codeConnect: 'packages/ui/src/Radio.figma.tsx',
}

export const props = [
  { name: 'checked', type: 'boolean', desc: 'Controlled checked state.' },
  { name: 'defaultChecked', type: 'boolean', desc: 'Uncontrolled initial checked.' },
  { name: 'disabled', type: 'boolean', desc: 'Disables the native input.' },
  { name: 'label', type: 'ReactNode', desc: 'Label text.' },
  { name: 'showLabel', type: 'boolean', desc: 'Toggle label visibility. Default true.' },
  { name: 'name', type: 'string', desc: 'Group radios by sharing a name.' },
  { name: 'value', type: 'string', desc: 'Native input value; identifies the selected radio in a group.' },
  { name: 'onChange', type: '(e) => void', desc: 'Native change handler.' },
]

export const tokens = [
  { token: '--control-bg', resolves: 'White', usage: 'unchecked dot fill' },
  { token: '--control-border', resolves: 'Border/default', usage: 'unchecked border' },
  { token: '--control-checked-bg', resolves: 'DSN/900', usage: 'checked fill' },
  { token: '--control-focus', resolves: 'Border/strong', usage: 'focus ring' },
]

export default function RadioDemo() {
  const [value, setValue] = useState('ltl')
  return (
    <div>
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">States × enabled / disabled</h4>
        <div className="ds-demo-grid" style={{ gridTemplateColumns: '120px 1fr 1fr', gap: 'var(--spacing-3)' }}>
          <div />
          <div className="ds-demo-label" style={{ textAlign: 'center' }}>Enabled</div>
          <div className="ds-demo-label" style={{ textAlign: 'center' }}>Disabled</div>

          <div className="ds-demo-label" style={{ textAlign: 'right' }}>Unchecked</div>
          <div className="ds-demo-cell"><Radio name="d1" label="Unchecked" defaultChecked={false} /></div>
          <div className="ds-demo-cell"><Radio name="d2" label="Unchecked" disabled /></div>

          <div className="ds-demo-label" style={{ textAlign: 'right' }}>Checked</div>
          <div className="ds-demo-cell"><Radio name="d3" label="Checked" defaultChecked /></div>
          <div className="ds-demo-cell"><Radio name="d4" label="Checked" defaultChecked disabled /></div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive group</h4>
        <div className="ds-demo-row">
          {[['ltl', 'LTL'], ['tl', 'TL'], ['parcel', 'Parcel']].map(([val, lbl]) => (
            <Radio
              key={val}
              name="mode"
              value={val}
              label={lbl}
              checked={value === val}
              onChange={() => setValue(val)}
            />
          ))}
          <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
            selected: {value}
          </span>
        </div>
      </div>
    </div>
  )
}
