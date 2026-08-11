import { useState } from 'react'
import { DropdownButton } from '@odyssey/ui'

export const meta = {
  name: 'DropdownButton',
  tier: 'atom',
  version: '0.13.0',
  createdVersion: '0.3.0',
  figmaNode: '3272:3880',
  codeConnect: 'packages/ui/src/DropdownButton.figma.tsx',
  normalizing: false,
}

export const props = [
  { name: 'value', type: 'ReactNode', desc: 'The current value shown in the trigger (e.g. "50").' },
  { name: 'open', type: 'boolean', desc: 'Applies the pressed/active look while the trigger\'s menu is open. Default false.' },
  { name: 'disabled', type: 'boolean', desc: 'Disables the trigger. Default false.' },
  { name: 'onClick', type: '() => void', desc: 'Fires on click (the composing component toggles its menu). Suppressed when disabled.' },
  { name: 'className', type: 'string', desc: 'Additional class names.' },
]

export const tokens = [
  { token: '--white', resolves: '#FFFFFF', usage: 'idle background' },
  { token: '--deep-sea-neutral-50', resolves: 'DSN/50', usage: 'hover background' },
  { token: '--deep-sea-neutral-100', resolves: 'DSN/100', usage: 'pressed / open background' },
  { token: '--deep-sea-neutral-300', resolves: 'DSN/300', usage: 'idle border' },
  { token: '--deep-sea-neutral-400', resolves: 'DSN/400', usage: 'hover / pressed border' },
  { token: '--deep-sea-neutral-700', resolves: 'DSN/700', usage: 'label + chevron color' },
  { token: '--radius-lg', resolves: '8px', usage: 'corner radius' },
  { token: '--shadow-sm', resolves: 'subtle drop shadow', usage: 'elevation' },
  { token: 'label/sm medium', resolves: '14/20/500', usage: 'label typography' },
]

export default function DropdownButtonDemo() {
  const [open, setOpen] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [value, setValue] = useState('50')

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        A compact trigger button (current value + chevron) that opens a{' '}
        <code>DropdownMenu</code> — e.g. the Paginator rows-per-page selector. Pure trigger; the
        composing component owns open/close + positioning. Hover and pressed are CSS-driven;{' '}
        <code>open</code> applies the pressed look while its menu is showing.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">States (hover / press the first; others forced)</h4>
        <div style={{ display: 'flex', gap: 'var(--spacing-4)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ marginBottom: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Idle (hover / press me)</div>
            <DropdownButton value="50" />
          </div>
          <div>
            <div style={{ marginBottom: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Open (pressed look)</div>
            <DropdownButton value="50" open />
          </div>
          <div>
            <div style={{ marginBottom: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Disabled</div>
            <DropdownButton value="50" disabled />
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive playground</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            value:
            <select value={value} onChange={(e) => setValue(e.target.value)}>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} /> open
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} /> disabled
          </label>
        </div>
        <DropdownButton
          value={value}
          open={open}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
        />
      </div>
    </div>
  )
}
