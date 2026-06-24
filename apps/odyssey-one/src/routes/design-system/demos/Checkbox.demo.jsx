import { useState } from 'react'
import { Checkbox } from '@odyssey/ui'

export const meta = {
  name: 'Checkbox',
  tier: 'atom',
  version: '0.2.0',
  figmaNode: '2821:330',
  codeConnect: 'packages/ui/src/Checkbox.figma.tsx',
}

export const props = [
  { name: 'checked', type: 'boolean', desc: 'Controlled checked state.' },
  { name: 'defaultChecked', type: 'boolean', desc: 'Uncontrolled initial checked.' },
  { name: 'indeterminate', type: 'boolean', desc: 'Dash state; synced to the DOM property via ref.' },
  { name: 'disabled', type: 'boolean', desc: 'Disables the native input.' },
  { name: 'label', type: 'ReactNode', desc: 'Label text.' },
  { name: 'showLabel', type: 'boolean', desc: 'Toggle label visibility. Default true.' },
  { name: 'onChange', type: '(e) => void', desc: 'Native change handler.' },
]

export const tokens = [
  { token: '--control-bg', resolves: 'White', usage: 'unchecked box fill' },
  { token: '--control-border', resolves: 'Border/default', usage: 'unchecked box border' },
  { token: '--control-border-hover', resolves: 'DSN/400', usage: 'hover border' },
  { token: '--control-checked-bg', resolves: 'DSN/900', usage: 'checked/indeterminate fill' },
  { token: '--control-focus', resolves: 'Border/strong', usage: 'focus ring' },
]

export default function CheckboxDemo() {
  const [checked, setChecked] = useState(true)
  return (
    <div>
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">States × enabled / disabled</h4>
        <div className="ds-demo-grid" style={{ gridTemplateColumns: '120px 1fr 1fr', gap: 'var(--spacing-3)' }}>
          <div />
          <div className="ds-demo-label" style={{ textAlign: 'center' }}>Enabled</div>
          <div className="ds-demo-label" style={{ textAlign: 'center' }}>Disabled</div>

          <div className="ds-demo-label" style={{ textAlign: 'right' }}>Unchecked</div>
          <div className="ds-demo-cell"><Checkbox label="Unchecked" defaultChecked={false} /></div>
          <div className="ds-demo-cell"><Checkbox label="Unchecked" disabled /></div>

          <div className="ds-demo-label" style={{ textAlign: 'right' }}>Checked</div>
          <div className="ds-demo-cell"><Checkbox label="Checked" defaultChecked /></div>
          <div className="ds-demo-cell"><Checkbox label="Checked" defaultChecked disabled /></div>

          <div className="ds-demo-label" style={{ textAlign: 'right' }}>Indeterminate</div>
          <div className="ds-demo-cell"><Checkbox label="Indeterminate" indeterminate /></div>
          <div className="ds-demo-cell"><Checkbox label="Indeterminate" indeterminate disabled /></div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive (controlled)</h4>
        <div className="ds-demo-row">
          <Checkbox
            label={checked ? 'On — click to toggle' : 'Off — click to toggle'}
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
        </div>
      </div>
    </div>
  )
}
