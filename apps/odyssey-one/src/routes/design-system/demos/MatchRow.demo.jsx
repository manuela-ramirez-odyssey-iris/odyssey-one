import { useState } from 'react'
import { MatchRow } from '@odyssey/ui'

export const meta = {
  name: 'MatchRow',
  tier: 'molecule',
  version: '1.5.0',
  createdVersion: '0.2.0',
  figmaNode: '3548:6994',
  codeConnect: 'packages/ui/src/MatchRow.figma.tsx',
  normalizing: false,
}

export const props = [
  { name: 'matchId', type: 'string', desc: 'Primary identifier shown in semibold on the main line.' },
  { name: 'route', type: 'string', desc: 'Route description shown next to matchId in regular weight.' },
  { name: 'customer', type: 'string', desc: 'Customer value in the meta line.' },
  { name: 'carrier', type: 'string', desc: 'Carrier value in the meta line.' },
  { name: 'bol', type: 'string', desc: 'Bill of Lading value in the meta line.' },
  { name: 'shipmentId', type: 'string', desc: 'Optional fourth meta cell (Shipment #). When provided, adds a trailing divider to the BOL cell.' },
  { name: 'meta', type: '{ label: string, value: string }[]', desc: 'The meta line as DATA — labels included. Omit for the Shipments set built from customer/carrier/bol/shipmentId; pass it when a domain names its cells differently (Orders: Customer | PO # | Equipment). Every cell but the last gets the divider.' },
  { name: 'source', type: '{ label: string, variant: string }', desc: "Source Badge shown on the right of the main line. Default { label: 'FourKites, Inc.', variant: 'blue' }." },
  { name: 'icon', type: 'ReactNode', desc: 'Override avatar icon. Falls back to iconType lookup (container/package/handshake), then Container.' },
  { name: 'iconType', type: "'container'|'package'|'handshake'", desc: 'Named avatar icon preset (uses the matching Lucide glyph at ICON_LG).' },
  { name: 'onClick', type: '() => void', desc: 'Makes the row a selectable button (adds role=button + hover affordance).' },
]

export const tokens = [
  { token: '--bg-tertiary', resolves: 'DSN/100', usage: 'avatar container fill + row hover background (interactive)' },
  { token: '--deep-sea-neutral-200', resolves: 'DSN/200', usage: 'row pressed background (interactive)' },
  { token: '--text-primary', resolves: 'Text/primary', usage: 'matchId + meta label text' },
  { token: '--text-secondary', resolves: 'Text/secondary', usage: 'route + meta value text' },
  { token: '--border-subtle', resolves: 'Border/subtle', usage: 'row bottom divider + panel border' },
]

// ── Schematic ───────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  return (
    <span style={{ display: 'inline-block', padding: '0 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: '11px', fontWeight: 'var(--font-weight-medium)', whiteSpace: 'nowrap' }}>{tier}</span>
  )
}
function ChildLink({ to, children }) {
  return <a href={`#comp-${to}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-link)', textDecoration: 'underline', fontWeight: 'var(--font-weight-semibold)', whiteSpace: 'nowrap' }}>{children}</a>
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
      <div style={{ flex: '1 1 500px', minWidth: 380, background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <MatchRow
          matchId="M-20481"
          route="Chicago, IL → Atlanta, GA"
          customer="Delaware Inc."
          carrier="XPO Logistics"
          bol="BOL-994821"
          source={{ label: 'FourKites, Inc.', variant: 'blue' }}
          iconType="container"
        />
      </div>
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="root" tier="molecule">Flex row with bottom divider (<code>--border-subtle</code>): avatar left, details column right.</LegendRow>
        <LegendRow part="avatar" nested>40×40, DSN/100 surface, switchable 20px icon (container / package / handshake).</LegendRow>
        <LegendRow part="details → main" nested>matchId (<code>label/xs semibold</code>) + route (regular) on the left; <ChildLink to="Badge">Badge</ChildLink> <TierBadge tier="atom" /> source pill on the right.</LegendRow>
        <LegendRow part="details → meta" nested>Label/value cells (<code>label/xs regular</code>) separated by vertical dividers — data-driven via <code>meta</code>, defaulting to Customer | Carrier | BOL (+ optional Shipment #).</LegendRow>
        <LegendRow part="interaction ladder" nested><strong>Default</strong> (transparent) · <strong>Hover</strong> (DSN/100) · <strong>Pressed</strong> (DSN/200) — active only when <code>onClick</code> is passed.</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────
const ROWS = [
  { matchId: 'M-20481', route: 'Chicago, IL → Atlanta, GA', customer: 'Delaware Inc.', carrier: 'XPO Logistics', bol: 'BOL-994821', source: { label: 'FourKites, Inc.', variant: 'blue' }, iconType: 'container' },
  { matchId: 'M-20479', route: 'Memphis, TN → Dallas, TX', customer: 'Midwest Freight Co.', carrier: 'Werner Enterprises', bol: 'BOL-993107', shipmentId: 'SHP-00215', source: { label: 'EDI 214', variant: 'purple' }, iconType: 'package' },
  { matchId: 'M-20466', route: 'Los Angeles, CA → Phoenix, AZ', customer: 'Pacific Cargo Group', carrier: 'Old Dominion', bol: 'BOL-991044', source: { label: 'FourKites, Inc.', variant: 'blue' }, iconType: 'handshake' },
  // A domain naming its own cells (Orders): no carrier, no BOL — the case the
  // `meta` prop exists for.
  {
    matchId: 'Order Number 0000000091000', route: 'Bastrop, LA → Green River, WY',
    meta: [
      { label: 'Customer', value: 'WEYERH_01' },
      { label: 'PO #', value: '1BD9TCAJ5' },
      { label: 'Equipment', value: 'LTR' },
    ],
    source: { label: 'Load Planned', variant: 'blue' }, iconType: 'package',
  },
]

function Playground() {
  const [lastClicked, setLastClicked] = useState(null)

  return (
    <div>
      <div style={{ width: 520, maxWidth: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {ROWS.map((row) => (
          <MatchRow key={row.matchId} {...row} onClick={() => setLastClicked(row.matchId)} />
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

export default function MatchRowDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Search-result row for GlobalSearch. A 40×40 avatar sits left; the main line shows
        the match ID + route with a source <code>Badge</code> on the right; the meta line
        surfaces label/value cells — Customer, Carrier, BOL (+ an optional Shipment #) by
        default, or a domain's own set via <code>meta</code> (last row below: Orders, which
        has no carrier and no BOL). The rows below are interactive — <strong>hover</strong> (DSN/100) then <strong>press</strong>{' '}
        (DSN/200) to exercise the Default | Hover | Pressed ladder.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — hover + press the rows (Default | Hover | Pressed)</h4>
        <Playground />
      </div>
    </div>
  )
}
