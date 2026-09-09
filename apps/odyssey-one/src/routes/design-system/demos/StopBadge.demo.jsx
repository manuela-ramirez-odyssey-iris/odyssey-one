import { useState } from 'react'
import { StopBadge } from '@odyssey/ui'
import { DemoControls, DemoField, DemoSelect } from '../demoControls.jsx'

export const meta = {
  name: 'StopBadge',
  tier: 'atom',
  version: '1.8.0',
  createdVersion: '0.7.0',
  normalizing: false,
  figmaNode: '4279:5101',
  codeConnect: 'packages/ui/src/StopBadge.figma.tsx',
}

export const props = [
  { name: 'label', type: 'string', desc: 'The stop marker text — pickup/delivery sequence like "P1" or "D2". Also folded into the aria-label together with the status.' },
  { name: 'status', type: "'completed' | 'issue' | 'pending' | 'changed'", desc: 'Drives pill + circle colors and the circle glyph: completed = green pill + check circle; issue = red pill + "!" circle; pending = white outlined pill, no circle by default; changed = light purple pill + dark purple label, circle = light purple with a dark purple ring and dot (an order change). Default completed.' },
  { name: 'showStatusBadge', type: 'boolean', desc: 'Force-HIDES the circle when false. Shown by default on completed / issue / changed; `pending` never renders one, and passing true does NOT override that — the pending check short-circuits first, and no pending-circle styling exists. (Until 2026-09-09 this table promised a "gray-outline" pending circle that was never built.)' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the root element.' },
]

export const tokens = [
  { token: '--caribbean-green-600', resolves: 'Caribbean Green/600', usage: 'completed pill + status-circle fill (white label/glyph)' },
  { token: '--bittersweet-600', resolves: 'Bittersweet/600', usage: 'issue pill + status-circle fill (white label/glyph)' },
  { token: '--deep-sea-neutral-400', resolves: 'DSN/400', usage: 'pending pill 1.5px border + label; pending circle ring + glyph' },
  { token: '--white', resolves: 'white', usage: 'pending pill fill · 1.25px ring around every status circle' },
  { token: '--purple-100', resolves: 'Purple/100', usage: 'changed pill + status-circle fill' },
  { token: '--purple-800', resolves: 'Purple/800', usage: 'changed label, dot glyph, and the circle ring (white cannot separate a pale circle from a pale pill)' },
  { token: '--radius-full', resolves: 'Radius/full', usage: 'pill + status-circle rounding' },
  { token: 'label/xs medium', resolves: '12 / 16 / 500', usage: 'label typography (--font-size-xs / --line-height-xs / --font-weight-medium)' },
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

function Schematic() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-8)', alignItems: 'flex-start', background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ display: 'flex', gap: 'var(--spacing-6)', alignItems: 'center', background: 'var(--bg-primary)', borderRadius: 'var(--radius-2xl)', padding: 'var(--spacing-6)' }}>
        <StopBadge label="P1" status="completed" />
        <StopBadge label="P2" status="issue" />
        <StopBadge label="D1" status="pending" />
        <StopBadge label="P3" status="changed" />
      </div>
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="pill" tier="atom">32×20 <strong>min</strong> pill (grows with the label), <code>--radius-full</code>, <code>label/xs medium</code> text. Status picks the skin: <code>completed</code> = <code>--caribbean-green-600</code> fill / white label; <code>issue</code> = <code>--bittersweet-600</code>; <code>pending</code> = white fill, 1.5px <code>--deep-sea-neutral-400</code> border + DSN/400 label; <code>changed</code> = <code>--purple-100</code> fill / <code>--purple-800</code> label, the one status that inverts (pale fill, dark ink) since no purple 600 exists to sit beside the other two.</LegendRow>
        <LegendRow part="status circle" nested>10px disc overlapping top-right (top −4 / right −5, per the Figma frame) with a 1.25px <code>--white</code> ring. Glyph: white check (completed — lucide <code>Check</code> at 6px) or white "!" (issue — bespoke 2-dot micro-path; no standalone lucide exclamation). <code>changed</code> carries a <code>--purple-100</code> disc with a <code>--purple-800</code> ring and dot. <code>pending</code> never renders one at all, and <code>showStatusBadge</code> only force-HIDES — it cannot add a circle to pending.</LegendRow>
        <LegendRow part="a11y" nested>Root carries <code>aria-label="P1 — completed"</code> (label + status); the visual label and circle are <code>aria-hidden</code>.</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────
function Playground() {
  const [label, setLabel] = useState('P1')
  const [status, setStatus] = useState('completed')
  const [circle, setCircle] = useState('default')

  const showStatusBadge = circle === 'default' ? undefined : circle === 'shown'

  return (
    <div>
      <DemoControls>
        <DemoField label="label" value={label} onChange={setLabel} />
        <DemoSelect label="status" value={status} onChange={setStatus} options={['completed', 'issue', 'pending', 'changed']} />
        <DemoSelect
          label="showStatusBadge"
          value={circle}
          onChange={setCircle}
          options={[
            { value: 'default', label: 'default (hidden only for pending)' },
            { value: 'shown', label: 'true' },
            { value: 'hidden', label: 'false' },
          ]}
        />
      </DemoControls>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-8)' }}>
        <StopBadge label={label || 'P1'} status={status} showStatusBadge={showStatusBadge} />
      </div>
    </div>
  )
}

export default function StopBadgeDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Stop-marker pill for the shipment timeline — a compact P/D sequence
        badge (P1, D2…) with a 10px status circle riding its top-right corner.
        Status drives both skins: green + check (completed), red + "!" (issue),
        or a white outlined pill with no circle (pending). Composed by{' '}
        <code>Timeline</code>; first consumer is the Stops tab All Stops card.
        Figma master is still a staging <strong>frame</strong> ("NewBadge",
        4274:15599) — componentization pending.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy (all four statuses)</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — label, status, showStatusBadge override</h4>
        <Playground />
      </div>
    </div>
  )
}
