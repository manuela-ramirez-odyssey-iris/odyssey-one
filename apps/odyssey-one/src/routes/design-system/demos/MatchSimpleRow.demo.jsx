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
  ported: true,
}

export const props = [
  { name: 'matchId', type: 'string', desc: 'Primary identifier — semibold, on the main line.' },
  { name: 'customer', type: 'string', desc: 'Customer name — medium weight, beside the id on the main line. Omit to hide.' },
  { name: 'address', type: 'string', desc: 'Address / additional info — label/xs regular, on the sub line. Omit to hide.' },
  { name: 'icon', type: 'ReactNode', desc: 'Override avatar icon. Falls back to iconType lookup (container/package/handshake), then Container.' },
  { name: 'iconType', type: "'container'|'package'|'handshake'", desc: 'Named avatar icon preset (Lucide glyph at ICON_LG).' },
  { name: 'showAvatar', type: 'boolean', desc: 'Mirrors Figma "Show avatar" boolean. Default true. false hides the 40×40 avatar span.' },
  { name: 'showInfo', type: 'boolean', desc: 'Mirrors Figma "Show additional info" boolean. Default true. false hides the address sub-line.' },
  { name: 'twoColumn', type: 'boolean', desc: 'Figma Layout = Two column. Renders a two-cell grid — code (160px via --msr-col1 fallback) + description — 40px rows, both cells label/sm regular. Pairs with FieldSearchResults columnHeaders so the columns align.' },
  { name: 'isSelected', type: 'boolean', desc: 'Selected surface (DSN/200; DSN/300 on hover) via .match-simple-row--selected. Set by FieldSearchResults from selectedIds.' },
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
        <LegendRow part="layout axis" nested>Figma <code>Layout</code> = <strong>Default</strong> | <strong>Plain list</strong> | <strong>Two column</strong>. <strong>Plain-list rule:</strong> no avatar + no info line → the ID drops semibold → <code>label/sm regular</code> (14px/400). <strong>Two column</strong> (<code>twoColumn</code>): code (160px, <code>--msr-col1</code> fallback) + description grid, 40px rows, both cells <code>label/sm regular</code>.</LegendRow>
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

function Playground() {
  const [layout, setLayout] = useState('default') // 'default' | 'plain' | 'two-column'
  const [lastClicked, setLastClicked] = useState(null)
  const plain = layout === 'plain'
  const twoColumn = layout === 'two-column'

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)' }}>
          Layout
          <select value={layout} onChange={(e) => setLayout(e.target.value)} style={{ padding: '4px 8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }}>
            <option value="default">Default</option>
            <option value="plain">Plain list (showAvatar=false, showInfo=false)</option>
            <option value="two-column">Two column (twoColumn)</option>
          </select>
        </label>
      </div>
      {plain && (
        <p style={{ margin: '0 0 var(--spacing-3)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
          Plain-list rule: with no avatar and no info line the ID drops semibold → 14px/400 regular.
        </p>
      )}
      {twoColumn && (
        <p style={{ margin: '0 0 var(--spacing-3)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
          Two-column: code (160px) + description grid, 40px rows, both cells label/sm regular.
        </p>
      )}
      <div style={{ width: 460, maxWidth: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-1)' }}>
        {ROWS.map((row) => (
          <MatchSimpleRow
            key={row.matchId}
            {...row}
            showAvatar={!plain && !twoColumn}
            showInfo={!plain && !twoColumn}
            twoColumn={twoColumn}
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
        exercise the Default | Hover | Pressed ladder. The Figma <code>Layout</code> axis is{' '}
        <strong>Default | Plain list | Two column</strong>: <strong>plain list</strong> (no
        avatar + no info line) drops the ID from semibold to 14px/400 regular;{' '}
        <strong>two column</strong> (<code>twoColumn</code>) renders a code + description grid
        with 40px rows for in-panel tables (see <code>FieldSearchResults</code>{' '}
        <code>columnHeaders</code>). Switch the Layout control in the playground to compare.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — layout axis + hover/press the rows</h4>
        <Playground />
      </div>
    </div>
  )
}
