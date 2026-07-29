import { useState } from 'react'
import { MatchSimpleRow } from '@odyssey/ui'

export const meta = {
  name: 'MatchSimpleRow',
  tier: 'molecule',
  version: '0.8.0',
  createdVersion: '0.6.0',
  figmaNode: '3169:2821',
  codeConnect: 'packages/ui/src/MatchSimpleRow.figma.tsx',
  normalizing: true,
  approved: true,
}

export const props = [
  { name: 'matchId', type: 'string', desc: 'Primary identifier — semibold, on the main line.' },
  { name: 'customer', type: 'string', desc: 'Customer name — medium weight, beside the id on the main line. Omit to hide.' },
  { name: 'address', type: 'string', desc: 'Address / additional info — label/xs regular, on the sub line. Omit to hide.' },
  { name: 'icon', type: 'ReactNode', desc: 'Override avatar icon. Falls back to iconType lookup (container/package/handshake), then Container.' },
  { name: 'iconType', type: "'container'|'package'|'handshake'", desc: 'Named avatar icon preset (Lucide glyph at ICON_LG).' },
  { name: 'showAvatar', type: 'boolean', desc: 'Mirrors Figma "Show avatar" boolean. Default true. false hides the 40×40 avatar span.' },
  { name: 'showInfo', type: 'boolean', desc: 'Mirrors Figma "Show additional info" boolean. Default true. false hides the address sub-line.' },
  { name: 'onClick', type: '() => void', desc: 'Makes the row a selectable button (adds .match-simple-row--clickable → hover/pressed affordance; works for role="option" rows too).' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the root element.' },
]

export const tokens = [
  { token: '--deep-sea-neutral-200', resolves: 'DSN/200', usage: 'avatar surface + pressed row background' },
  { token: '--bg-tertiary', resolves: 'DSN/100', usage: 'hover row background' },
  { token: '--text-primary', resolves: 'DSN/900', usage: 'match id' },
  { token: '--text-secondary', resolves: 'DSN/700', usage: 'customer + address' },
  { token: '--radius-lg', resolves: '8px', usage: 'row corner radius' },
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
      <div style={{ flex: '1 1 440px', minWidth: 340, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-1)' }}>
        <MatchSimpleRow
          matchId="61-CU0000010352"
          customer="HERCULES CHILE LIMITADA"
          address="1481 Dr. Carlos Charlin, 7500511 Providencia, Región Metropolitana, Chile"
          iconType="container"
        />
      </div>
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="root" tier="molecule">Flex row, <code>--radius-lg</code>: avatar left, details column right.</LegendRow>
        <LegendRow part="avatar" nested>40×40, DSN/200 surface, switchable 20px icon. Hidden when <code>showAvatar=false</code>.</LegendRow>
        <LegendRow part="details → main" nested>matchId (<code>label/sm semibold</code>) + customer (<code>label/sm medium</code>).</LegendRow>
        <LegendRow part="details → address" nested><code>label/xs regular</code>, <code>--text-secondary</code> — hidden when <code>showInfo=false</code>.</LegendRow>
        <LegendRow part="interaction ladder" nested><strong>Default</strong> (transparent) · <strong>Hover</strong> (DSN/100) · <strong>Pressed</strong> (DSN/200) — active via <code>.match-simple-row--clickable</code> (set when <code>onClick</code> is passed; works for <code>role="option"</code> too).</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────
const ROWS = [
  { matchId: '61-CU0000010352', customer: 'HERCULES CHILE LIMITADA', address: '1481 Dr. Carlos Charlin, 7500511 Providencia, Región Metropolitana, Chile', iconType: 'container' },
  { matchId: '61-CU0000010419', customer: 'Delaware Inc.', address: '200 W Madison St, Chicago, IL 60606, USA', iconType: 'package' },
  { matchId: '61-CU0000010488', customer: 'Pacific Cargo Group', address: '4200 W Valley Blvd, Los Angeles, CA 90032, USA', iconType: 'handshake' },
]

function Toggle({ label, checked, onChange }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <code>{label}</code>
    </label>
  )
}

function Playground() {
  const [showAvatar, setShowAvatar] = useState(true)
  const [showInfo, setShowInfo] = useState(true)
  const [lastClicked, setLastClicked] = useState(null)

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap' }}>
        <Toggle label="showAvatar" checked={showAvatar} onChange={setShowAvatar} />
        <Toggle label="showInfo" checked={showInfo} onChange={setShowInfo} />
      </div>
      <div style={{ width: 460, maxWidth: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-1)' }}>
        {ROWS.map((row) => (
          <MatchSimpleRow
            key={row.matchId}
            {...row}
            showAvatar={showAvatar}
            showInfo={showInfo}
            onClick={() => setLastClicked(row.matchId)}
          />
        ))}
      </div>
      {lastClicked && (
        <p style={{ marginTop: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
          Row clicked: <strong style={{ color: 'var(--text-primary)' }}>{lastClicked}</strong>
        </p>
      )}
    </div>
  )
}

export default function MatchSimpleRowDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Compact match row — a 40×40 avatar beside a two-line details column (match id +
        customer on top, address below). Simpler sibling of <code>MatchRow</code> (no
        route, no meta cells, no source Badge). The rows below are interactive —{' '}
        <strong>hover</strong> (DSN/100) then <strong>press</strong> (DSN/200) to
        exercise the Default | Hover | Pressed ladder. Toggle the Figma booleans{' '}
        <code>showAvatar</code> / <code>showInfo</code> to see the condensed variants.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — toggles + hover/press the rows</h4>
        <Playground />
      </div>
    </div>
  )
}
