import { useState } from 'react'
import { MenuRow } from '@odyssey/ui'

export const meta = {
  name: 'MenuRow',
  tier: 'molecule',
  figmaNode: '1973:87',
  codeConnect: 'packages/ui/src/MenuRow.figma.tsx',
}

export const props = [
  { name: 'label', type: 'string', desc: 'Row label text.' },
  { name: 'onClick', type: '() => void', desc: 'Click handler. Suppressed when disabled.' },
  { name: 'disabled', type: 'boolean', desc: 'Disables the click handler and sets aria-disabled. Default false.' },
]

export const tokens = [
  { token: '--text-secondary', resolves: 'Text/secondary', usage: 'label color' },
  { token: '--font-size-sm', resolves: 'Type/sm', usage: 'label font size' },
  { token: '--font-weight-regular', resolves: 'Weight/regular', usage: 'label weight' },
  { token: '--spacing-2', resolves: 'Spacing/2', usage: 'vertical padding' },
  { token: '--spacing-3', resolves: 'Spacing/3', usage: 'gap between label and grip icon' },
  { token: '--spacing-4', resolves: 'Spacing/4', usage: 'horizontal padding' },
]

export default function MenuRowDemo() {
  const [lastClicked, setLastClicked] = useState(null)

  const ROWS = [
    { label: 'Total Orders', disabled: false },
    { label: 'On-time Delivery', disabled: false },
    { label: 'Shipment Exceptions', disabled: false },
    { label: 'Carrier Performance', disabled: true },
  ]

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Single label row inside a left-menu group. Renders as a{' '}
        <code>div</code> so consumers can wrap it with a DnD adapter for
        drag-from-anywhere behavior. Hover and pressed states are CSS-only.
        The grip icon at the trailing edge signals draggability.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Default rows (hover to see tint, click to track)</h4>
        {lastClicked && (
          <div style={{ marginBottom: 'var(--spacing-3)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
            Last clicked: <strong style={{ color: 'var(--text-secondary)' }}>{lastClicked}</strong>
          </div>
        )}
        <div style={{
          width: 240,
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          {ROWS.map(({ label, disabled }) => (
            <MenuRow
              key={label}
              label={label}
              disabled={disabled}
              onClick={disabled ? undefined : () => setLastClicked(label)}
            />
          ))}
        </div>
        <div style={{ marginTop: 'var(--spacing-3)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
          "Carrier Performance" is <code>disabled</code> — click suppressed, <code>aria-disabled</code> set.
        </div>
      </div>
    </div>
  )
}
