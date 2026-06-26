import { useState } from 'react'
import { Tab } from '@odyssey/ui'

export const meta = {
  name: 'Tab',
  tier: 'atom',
  version: '0.2.0',
  figmaNode: '3057:362',
  codeConnect: 'packages/ui/src/Tab.figma.tsx',
}

export const props = [
  { name: 'label', type: 'string', desc: 'Tab label (label/sm medium).' },
  { name: 'count', type: 'number', desc: 'Optional count — renders our Badge variant="metric" after the label; the badge keeps its own colors in every tab state.' },
  { name: 'current', type: 'boolean', desc: 'Selected state — text --text-primary + 2px DSN/500 underline. Mirrors the Figma Current axis. Defaults to false.' },
  { name: 'onClick', type: '() => void', desc: 'Click handler; consumers manage which tab is current.' },
  { name: 'className', type: 'string', desc: 'Extra class names appended to the root button.' },
]

export const tokens = [
  { token: '--text-primary', resolves: 'DSN/900', usage: 'current label (canon Tabs-frame override; kit master said DSN/800)' },
  { token: '--text-tertiary', resolves: 'DSN/500', usage: 'idle label + current underline fill' },
  { token: '--deep-sea-neutral-800', resolves: '#283142', usage: 'hover label (not current) — code + DSM only' },
  { token: '--border-default', resolves: 'DSN/300', usage: 'hover underline (not current) — code + DSM only' },
  { token: '--spacing-4', resolves: '16px', usage: 'content bottom padding (above the underline)' },
  { token: '--spacing-2', resolves: '8px', usage: 'label ↔ count badge gap' },
  { token: '--spacing-1', resolves: '4px', usage: 'content h-padding' },
  { token: '--spacing-6', resolves: '24px', usage: '.tab-group gap (the plain Tabs frame in Figma)' },
  { token: '--border-focus', resolves: 'focus ring', usage: ':focus-visible outline' },
]

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'saved', label: 'Saved', count: 4 },
  { key: 'canceled', label: 'Canceled' },
  { key: 'failures', label: 'Interface Failures' },
]

export default function TabDemo() {
  const [filter, setFilter] = useState('all')

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Underline filter tab — the third sibling in the tab family (PillTab =
        pill style, ButtonToggle = segmented). Used as filter rows throughout
        Odyssey-One. Label over a 2px underline that fills DSN/500 when
        current; optional count via our Badge metric. Source master is a
        remote Tailwind kit restyled to our palette — only the Underline
        style is normalized, and a clean local master rebuild is pending.
        Hover (text DSN/800 + DSN/300 underline) is code + DSM only.
        ShipmentTabs migrates to this atom in a later Shipments pass.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">States (Current axis)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-end' }}>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Tab label="My account" />
            <span className="ds-demo-label">Current=False</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Tab label="My account" current />
            <span className="ds-demo-label">Current=True</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Tab label="Saved" count={4} />
            <span className="ds-demo-label">with count</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Tab label="Saved" count={4} current />
            <span className="ds-demo-label">current + count</span>
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground (the canon Tabs frame)</h4>
        <div className="tab-group">
          {FILTERS.map(f => (
            <Tab
              key={f.key}
              label={f.label}
              count={f.count}
              current={filter === f.key}
              onClick={() => setFilter(f.key)}
            />
          ))}
        </div>
        <span className="ds-demo-label" style={{ display: 'block', marginTop: 'var(--spacing-2)' }}>
          filter: {filter} — hover an unselected tab for the DSN/800 + DSN/300 ramp
        </span>
      </div>
    </div>
  )
}
