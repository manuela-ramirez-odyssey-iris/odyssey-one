import { useState } from 'react'
import { SummaryStrip } from '@odyssey/ui'

export const meta = {
  name: 'SummaryStrip',
  tier: 'molecule',
  version: '0.13.0',
  createdVersion: '0.7.0',
  normalizing: false,
  figmaNode: '4254:904',
  codeConnect: 'packages/ui/src/SummaryStrip.figma.tsx',
}

export const props = [
  { name: 'items', type: "[{ label, value, tone?, truncate? }]", desc: "The stat cells, in order. `label` renders uppercase (CSS transform — pass natural case); empty/nullish `value` renders '--'; `tone: 'positive' | 'negative'` colors the value (code extension — the Figma master has no tone axis); `truncate: 'lead'` caps the cell width and lead-ellipsizes the value (tail visible, '…' leads — for URL-ish values), full value via `title` (code extension)." },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the root element.' },
  { name: '...rest', type: 'aria-* etc.', desc: 'Forwarded to the root — pass `aria-label` to name the region (root is a <dl> with role="region").' },
]

export const tokens = [
  { token: '--bg-primary', resolves: 'white', usage: 'band background (Figma: Background/primary — gradient artifact flattened 2026-07-06)' },
  { token: '--border-subtle', resolves: 'DSN/200', usage: 'band bottom hairline (Figma: Border/subtle)' },
  { token: '--deep-sea-neutral-200', resolves: '#E4E6EB', usage: 'cell right divider — on EVERY cell incl. the last (Figma: Deep Sea Neutral/200)' },
  { token: '--spacing-12', resolves: '48px', usage: 'band horizontal padding (row centered inside it)' },
  { token: '--spacing-4 / --spacing-3', resolves: '16 / 12', usage: 'cell padding (v/h)' },
  { token: '--spacing-1', resolves: '4px', usage: 'label↔value gap' },
  { token: 'label/xs medium', resolves: '12 / 16 / 500', usage: 'label typography, --text-tertiary, letter-spacing 0' },
  { token: 'label/base semibold', resolves: '16 / 24 / 600', usage: 'value typography, --text-primary (Figma: Text/primary — bound 2026-07-06)' },
  { token: '--caribbean-green-600 / --bittersweet-600', resolves: 'green / red', usage: "tone: 'positive' / 'negative' value color (code-only)" },
]

// ── Schematic ───────────────────────────────────────────────────────────────
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

// The master's own sample content (Figma `SummaryStrip` 4254:904, verbatim).
const MASTER_ITEMS = [
  { label: 'Distance',         value: '364.14 mi' },
  { label: 'Gross Weight',     value: '54,907 LB' },
  { label: 'Volume',           value: '226 cuft' },
  { label: 'Accepted Carrier', value: 'SEFL - LTL' },
  { label: 'Seed Equipment',   value: 'LTH' },
  { label: 'Utilization',      value: '96%' },
]

function Schematic() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)', background: 'var(--bg-secondary)', padding: 'var(--spacing-6) 0', borderRadius: 'var(--radius-md)' }}>
      <SummaryStrip items={MASTER_ITEMS} aria-label="Schematic sample" />
      <ul style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: '0 var(--spacing-6)', padding: 0 }}>
        <LegendRow part="band" tier="molecule">Full-width <code>&lt;dl&gt;</code> strip on the pane canvas: <code>--bg-primary</code>, <code>--border-subtle</code> bottom hairline, <code>--spacing-12</code> (48px) side padding — the cell row is <strong>centered</strong> inside it (Figma: justify CENTER). Overflows scroll, never wrap.</LegendRow>
        <LegendRow part="cell" nested><code>min-width: 152px</code> (Figma: fixed 152 — code grows rather than truncates), padding <code>--spacing-4</code>/<code>--spacing-3</code>, gap <code>--spacing-1</code>; <code>--deep-sea-neutral-200</code> right divider on <strong>every</strong> cell, the last included (per the master).</LegendRow>
        <LegendRow part="label" nested><code>&lt;dt&gt;</code>, <code>label/xs medium</code>, <code>--text-tertiary</code>, CSS-uppercased (the master bakes uppercase into content, letter-spacing 0 — no tracking).</LegendRow>
        <LegendRow part="value" nested><code>&lt;dd&gt;</code>, <code>label/base semibold</code> (16/24), <code>--text-primary</code>; empty renders <code>--</code>; <code>tone</code> shifts it green/red (code extension — no Figma axis); <code>truncate: 'lead'</code> caps the cell and lead-ellipsizes long values, e.g. Tracking Link (code extension — no Figma axis).</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────
const inputStyle = { padding: '4px 8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }

function Field({ label, value, set }) {
  return (
    <label style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)' }}>
      {label}
      <input value={value} onChange={(e) => set(e.target.value)} style={inputStyle} />
    </label>
  )
}

function Playground() {
  const [items, setItems] = useState([
    { label: 'Base',     value: '$1,240.00' },
    { label: 'Discount', value: '-$124.00', tone: 'negative' },
    { label: 'AP Total', value: '$1,489.20' },
    { label: 'AR Total', value: '$1,720.00' },
    { label: 'Margin',   value: '+$230.80', tone: 'positive' },
  ])
  const [sel, setSel] = useState(0)

  const patch = (idx, part) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...part } : it)))
  const addCell = () => {
    setItems((prev) => [...prev, { label: `Metric ${prev.length + 1}`, value: '' }])
    setSel(items.length)
  }
  const removeCell = () => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== sel))
    setSel((s) => Math.max(0, s - 1))
  }

  const current = items[sel] || items[0]

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)' }}>
          cell
          <select value={sel} onChange={(e) => setSel(Number(e.target.value))} style={inputStyle}>
            {items.map((it, i) => <option key={i} value={i}>{i + 1} — {it.label}</option>)}
          </select>
        </label>
        <Field label="label" value={current.label} set={(v) => patch(sel, { label: v })} />
        <Field label="value (empty → --)" value={current.value} set={(v) => patch(sel, { value: v })} />
        <label style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)' }}>
          tone
          <select value={current.tone || 'default'} onChange={(e) => patch(sel, { tone: e.target.value === 'default' ? undefined : e.target.value })} style={inputStyle}>
            <option value="default">default</option>
            <option value="positive">positive</option>
            <option value="negative">negative</option>
          </select>
        </label>
        <label style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)' }}>
          truncate
          <select value={current.truncate || 'none'} onChange={(e) => patch(sel, { truncate: e.target.value === 'none' ? undefined : e.target.value })} style={inputStyle}>
            <option value="none">none</option>
            <option value="lead">lead</option>
          </select>
        </label>
        <button type="button" onClick={addCell} style={{ ...inputStyle, cursor: 'pointer' }}>+ cell</button>
        <button type="button" onClick={removeCell} disabled={items.length <= 1} style={{ ...inputStyle, cursor: items.length <= 1 ? 'default' : 'pointer', opacity: items.length <= 1 ? 0.4 : 1 }}>− cell</button>
      </div>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-6) 0' }}>
        <SummaryStrip items={items} aria-label="Playground summary" />
      </div>
    </div>
  )
}

export default function SummaryStripDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        The tab-summary band — a full-width strip of stat cells (uppercase muted
        label over a semibold value) that sits at the top of a detail-tab pane
        (Stops KPIs, Cost Allocation summary). Cells are fixed-width, centered
        as a group, and each closes with a vertical divider — the last one
        included, per the master. Replaces the ad-hoc <code>.pane-kpis*</code> band.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy (master sample data)</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — edit cells, tones, count</h4>
        <Playground />
      </div>
    </div>
  )
}
