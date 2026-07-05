import { useState } from 'react'
import { WidgetMini } from '@odyssey/ui'

export const meta = {
  name: 'WidgetMini',
  tier: 'molecule',
  version: '0.6.0',
  createdVersion: '0.6.0',
  figmaNode: '4103:5027',
  codeConnect: 'packages/ui/src/WidgetMini.figma.tsx',
}

export const props = [
  { name: 'value', type: 'string | number', desc: 'The metric count, 24/24 semibold. Counts up on load (Widget’s CountUp sweep) and recounts on activation, together with the donut. (Figma: Value TEXT prop.)' },
  { name: 'label', type: 'string', desc: 'The metric name under the count, label/xs medium DSN/600. (Figma: Label TEXT prop.)' },
  { name: 'percentage', type: 'number', desc: '0–100. Drives the donut sweep AND the "N%" center text. (Figma: Percentage TEXT prop — numeric in code.)' },
  { name: 'selected', type: 'boolean', desc: 'Active-filter state: border DSN/900 + shadow/sm; renders aria-pressed. Becoming selected replays the donut grow-in animation. (Figma: State VARIANT Default|Selected.)' },
  { name: 'onClick', type: '() => void', desc: 'The card is a <button> — it is a clickable filter toggle, not a passive Widget.' },
  { name: 'showChart', type: 'boolean', desc: 'Escape hatch for metrics without a share. Default true.' },
  { name: 'chartColor', type: 'string', desc: "Donut arc color token. Default 'var(--ice-blue-600)' (the Figma binding)." },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the root element.' },
]

export const tokens = [
  { token: '--bg-primary', resolves: 'white', usage: 'card background' },
  { token: '--radius-xl', resolves: '12px', usage: 'card corner radius' },
  { token: '--border-subtle', resolves: 'DSN/200', usage: 'default border (→ DSN/300 on hover, code-only)' },
  { token: '--deep-sea-neutral-900', resolves: '#1b2537', usage: 'selected border' },
  { token: '--shadow-sm', resolves: '0 1 2 / 5%', usage: 'selected elevation' },
  { token: '--spacing-3 / --spacing-4', resolves: '12 / 16', usage: 'padding (v/h) + column gap' },
  { token: '--font-size-2xl / --line-height-lg', resolves: '24 / 24', usage: 'value typography (deliberate 1.0 leading, per Figma)' },
  { token: '--deep-sea-neutral-600', resolves: '#4c5463', usage: 'label + donut center text' },
  { token: '--ice-blue-600', resolves: '#296de7', usage: 'donut arc (was raw in the mock — bound during normalization)' },
  { token: '--chart-rest', resolves: 'DSN/200', usage: 'donut track' },
]

function TierBadge({ tier }) {
  return (
    <span style={{ display: 'inline-block', padding: '0 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: '11px', fontWeight: 'var(--font-weight-medium)', whiteSpace: 'nowrap' }}>{tier}</span>
  )
}
function LegendRow({ part, tier, nested = false, children }) {
  const cell = { padding: 'var(--spacing-2) 0', borderBottom: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }
  return (
    <li style={{ display: 'contents' }}>
      <span style={{ ...cell, display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', whiteSpace: 'nowrap', paddingLeft: nested ? 'var(--spacing-6)' : 0, color: 'var(--text-primary)', fontWeight: nested ? 'var(--font-weight-medium)' : 'var(--font-weight-semibold)' }}>
        {nested && <span style={{ color: 'var(--text-tertiary)' }} aria-hidden="true">└</span>}
        {part}{tier && <TierBadge tier={tier} />}
      </span>
      <span style={{ ...cell, color: 'var(--text-secondary)' }}>{children}</span>
    </li>
  )
}

function Schematic() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-8)', alignItems: 'flex-start', background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ flex: '0 0 auto', display: 'flex', gap: 'var(--spacing-3)' }}>
        <WidgetMini value={376} label="All" percentage={100} selected style={{ width: 198 }} />
        <WidgetMini value={24} label="Tender Issues" percentage={6} style={{ width: 198 }} />
      </div>
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="card" tier="molecule">Clickable metric filter card (<code>&lt;button aria-pressed&gt;</code>): <code>--bg-primary</code>, <code>--radius-xl</code>, <code>--border-subtle</code>, padding 12/16. Selected: border <code>DSN/900</code> + <code>--shadow-sm</code>. Deliberately NOT a <code>Widget</code> variant (no header chrome; stays out of the Home picker).</LegendRow>
        <LegendRow part="value" nested>The count — <code>--font-size-2xl</code>/<code>--line-height-lg</code> semibold, <code>--text-primary</code>, tabular-nums. (Figma: Value TEXT.)</LegendRow>
        <LegendRow part="label" nested><code>label/xs medium</code>, <code>--deep-sea-neutral-600</code>, truncates. (Figma: Label TEXT.)</LegendRow>
        <LegendRow part="donut" tier="molecule" nested>Nested <code>WidgetPieChart</code> — <code>size=64</code>, slim <code>strokeWidth=9</code> (14% of Ø, vs Widget's 18%), arc <code>--ice-blue-600</code> over <code>--chart-rest</code>, grow-in on mount; center = "N%" <code>label/sm medium</code>.</LegendRow>
      </ul>
    </div>
  )
}

function Toggle({ label, value, set }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  )
}

// The real consumer shape: a category row where exactly one card is the active
// filter — clicking a card selects it (that IS the component's intent).
const CATEGORIES = [
  { key: 'all', label: 'All', count: 376 },
  { key: 'date-issues', label: 'Date Issues', count: 316 },
  { key: 'tender-issues', label: 'Tender Issues', count: 24 },
  { key: 'tender-review', label: 'Tender Review', count: 35 },
  { key: 'bid-review', label: 'Bid Review', count: 1 },
]

function Playground() {
  const [active, setActive] = useState('all')
  const [showChart, setShowChart] = useState(true)
  const total = 376
  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Toggle label="showChart" value={showChart} set={setShowChart} />
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>click a card to select it — percentage = share of the panel total</span>
      </div>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-6)', display: 'flex', gap: 'var(--spacing-3)' }}>
        {CATEGORIES.map(c => (
          <WidgetMini
            key={c.key}
            style={{ flex: 1, minWidth: 0 }}
            value={c.count}
            label={c.label}
            percentage={(c.count / total) * 100}
            selected={active === c.key}
            onClick={() => setActive(c.key)}
            showChart={showChart}
          />
        ))}
      </div>
    </div>
  )
}

export default function WidgetMiniDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Compact clickable metric card — count + label + slim 64px donut showing the
        metric's share. The "Widget mode" rendering of the Shipments category row
        (replacing the retired MonitorPanels). Shares the <code>WidgetPieChart</code>{' '}
        primitive with <code>Widget</code> but is its own molecule: it's a filter
        <em> toggle</em> with a <code>selected</code> state, not a dashboard summary —
        and it must not appear in the Home widget picker.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — the Shipments category row: click to filter</h4>
        <Playground />
      </div>
    </div>
  )
}
