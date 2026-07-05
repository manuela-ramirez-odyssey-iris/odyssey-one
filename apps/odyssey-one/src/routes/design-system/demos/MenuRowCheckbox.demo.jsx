import { useState } from 'react'
import { MenuRowCheckbox } from '@odyssey/ui'

export const meta = {
  name: 'MenuRowCheckbox',
  tier: 'atom',
  version: '0.4.0',
  createdVersion: '0.4.0',
  figmaNode: '3447:6592',
  codeConnect: 'packages/ui/src/MenuRowCheckbox.figma.tsx',
  normalizing: false,
}

export const props = [
  { name: 'label', type: 'string', desc: 'Row label.' },
  { name: 'checked', type: 'boolean', desc: 'Checkbox state (multi-select). Default false.' },
  { name: 'draggable', type: 'boolean', desc: 'Shows the grip drag handle (reorder via a consumer DnD adapter). Default true.' },
  { name: 'bordered', type: 'boolean', desc: 'Figma Type=Bordered — DSN/300 outline. Default false.' },
  { name: 'disabled', type: 'boolean', desc: 'Muted (placeholder) label + disabled checkbox; non-interactive. Default false.' },
  { name: 'name', type: 'string', desc: 'Passed to the nested Checkbox.' },
  { name: 'value', type: 'any', desc: 'Option value — passed to onToggle.' },
  { name: 'onToggle', type: '(value) => void', desc: 'Fires when the row is clicked (whole row is the toggle target).' },
  { name: 'className', type: 'string', desc: 'Additional classes for the root.' },
]

export const tokens = [
  { token: '--deep-sea-neutral-100', resolves: 'DSN/100', usage: 'hover surface' },
  { token: '--deep-sea-neutral-300', resolves: 'DSN/300', usage: 'bordered (Type=Line) outline' },
  { token: '--radius-md', resolves: '6px', usage: 'row corner (shared .menu-row chrome)' },
  { token: '--spacing-2 / --spacing-3', resolves: '8 / 12', usage: 'row padding/gap (shared chrome)' },
]

export default function MenuRowCheckboxDemo() {
  const [picked, setPicked] = useState(() => new Set(['ltl']))
  const toggle = (v) =>
    setPicked((prev) => {
      const next = new Set(prev)
      next.has(v) ? next.delete(v) : next.add(v)
      return next
    })

  const options = [
    { value: 'ltl', label: 'LTL' },
    { value: 'tl', label: 'Truckload' },
    { value: 'intermodal', label: 'Intermodal' },
  ]

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Row family — multi-select + reorderable. <strong>Only the checkbox area
        toggles</strong> (pointer cursor); the <strong>rest of the row is the drag
        handle</strong> (grab cursor — reorder via a consumer DnD adapter). Press
        shows a DSN/200 background. Shares the <code>.menu-row</code> chrome; composes
        the real <code>Checkbox</code>.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Live multi-select (click the checkbox)</h4>
        <div className="ds-demo-col" style={{ width: 240, gap: 'var(--spacing-2)' }}>
          {options.map((o) => (
            <MenuRowCheckbox
              key={o.value}
              label={o.label}
              value={o.value}
              checked={picked.has(o.value)}
              onToggle={toggle}
            />
          ))}
        </div>
        <p style={{ marginTop: 'var(--spacing-3)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
          Selected: <strong>{[...picked].join(', ') || '—'}</strong>
        </p>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">States · Type (Default / Bordered)</h4>
        <div className="ds-demo-col" style={{ width: 240, gap: 'var(--spacing-2)' }}>
          <MenuRowCheckbox label="Default" />
          <MenuRowCheckbox label="Checked" checked />
          <MenuRowCheckbox label="Bordered" bordered />
          <MenuRowCheckbox label="Bordered + checked" bordered checked />
          <MenuRowCheckbox label="Disabled" disabled />
          <MenuRowCheckbox label="Disabled + checked" disabled checked />
        </div>
      </div>
    </div>
  )
}
