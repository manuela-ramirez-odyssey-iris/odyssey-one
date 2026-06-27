import { useState } from 'react'
import { MenuRowRadio } from '@odyssey/ui'

export const meta = {
  name: 'MenuRowRadio',
  tier: 'atom',
  figmaNode: '3447:6593',
  codeConnect: 'packages/ui/src/MenuRowRadio.figma.tsx',
}

export const props = [
  { name: 'label', type: 'string', desc: 'Row label.' },
  { name: 'selected', type: 'boolean', desc: 'Fills the radio + applies the DSN/900 border (the chosen option). Default false.' },
  { name: 'disabled', type: 'boolean', desc: 'Muted (placeholder) label + disabled radio; not clickable. Default false.' },
  { name: 'name', type: 'string', desc: 'Radio group name (passed to the nested Radio).' },
  { name: 'value', type: 'any', desc: 'Option value — passed to onSelect / onNavigate.' },
  { name: 'onSelect', type: '(value) => void', desc: 'Fires when the RADIO area is clicked (picks this option).' },
  { name: 'onNavigate', type: '(value) => void', desc: 'Fires when the REST of the row (label + chevron) is clicked (drill into the next view).' },
  { name: 'className', type: 'string', desc: 'Additional classes for the root.' },
]

export const tokens = [
  { token: '--white', resolves: '#FFFFFF', usage: 'row surface' },
  { token: '--deep-sea-neutral-300', resolves: 'DSN/300', usage: 'default border' },
  { token: '--deep-sea-neutral-100', resolves: 'DSN/100', usage: 'hover surface' },
  { token: '--deep-sea-neutral-900', resolves: 'DSN/900', usage: 'selected border' },
  { token: '--text-placeholder', resolves: 'DSN/400', usage: 'disabled label' },
  { token: '--radius-md', resolves: '6px', usage: 'row corner (shared .menu-row chrome)' },
]

export default function MenuRowRadioDemo() {
  const [picked, setPicked] = useState('overnight')
  const [navigated, setNavigated] = useState(null)
  const options = [
    { value: 'overnight', label: 'Overnight' },
    { value: 'two-day', label: 'Two-day' },
    { value: 'ground', label: 'Ground' },
  ]

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Row family — single-select + navigate. Two click zones: the{' '}
        <strong>radio area selects</strong>; the <strong>rest of the row navigates</strong>.
        Leading <code>Radio</code> + label + chevron, on the shared <code>.menu-row</code> chrome.
        Press shows a DSN/200 background (hover's DSN/300 border).
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Live — radio picks, row body navigates</h4>
        <div className="ds-demo-col" style={{ width: 240, gap: 'var(--spacing-2)' }}>
          {options.map((o) => (
            <MenuRowRadio
              key={o.value}
              label={o.label}
              name="ship-speed"
              value={o.value}
              selected={picked === o.value}
              onSelect={setPicked}
              onNavigate={(v) => setNavigated(v)}
            />
          ))}
        </div>
        <p style={{ marginTop: 'var(--spacing-3)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
          Picked (radio): <strong>{picked}</strong> · Navigated (row body):{' '}
          <strong>{navigated ?? '—'}</strong>
        </p>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">States</h4>
        <div className="ds-demo-col" style={{ width: 240, gap: 'var(--spacing-2)' }}>
          <MenuRowRadio label="Default" />
          <MenuRowRadio label="Selected" selected />
          <MenuRowRadio label="Disabled" disabled />
        </div>
      </div>
    </div>
  )
}
