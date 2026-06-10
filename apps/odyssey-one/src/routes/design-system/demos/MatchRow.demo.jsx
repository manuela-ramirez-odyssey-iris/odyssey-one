import { useState } from 'react'
import { MatchRow } from '@odyssey/ui'

export const meta = {
  name: 'MatchRow',
  tier: 'molecule',
  figmaNode: '2460:2',
  codeConnect: 'packages/ui/src/MatchRow.figma.tsx',
}

export const props = [
  { name: 'matchId', type: 'string', desc: 'Primary identifier shown in semibold on the main line.' },
  { name: 'route', type: 'string', desc: 'Route description shown next to matchId in regular weight.' },
  { name: 'customer', type: 'string', desc: 'Customer value in the meta line.' },
  { name: 'carrier', type: 'string', desc: 'Carrier value in the meta line.' },
  { name: 'bol', type: 'string', desc: 'Bill of Lading value in the meta line.' },
  { name: 'shipmentId', type: 'string', desc: 'Optional fourth meta cell (Shipment #). When provided, adds a trailing divider to the BOL cell.' },
  { name: 'source', type: '{ label: string, variant: string }', desc: "Source Badge shown on the right of the main line. Default { label: 'FourKites, Inc.', variant: 'blue' }." },
  { name: 'icon', type: 'ReactNode', desc: 'Override avatar icon. Falls back to iconType lookup (container/package/handshake), then Container.' },
  { name: 'iconType', type: "'container'|'package'|'handshake'", desc: 'Named avatar icon preset (uses the matching Lucide glyph at ICON_LG).' },
  { name: 'onClick', type: '() => void', desc: 'Makes the row a selectable button (adds role=button + hover affordance).' },
]

export const tokens = [
  { token: '--match-row-bg', resolves: 'var(--bg-primary)', usage: 'row background' },
  { token: '--match-row-bg-hover', resolves: 'var(--bg-secondary)', usage: 'row hover tint (when onClick set)' },
  { token: '--bg-secondary', resolves: 'Bg/secondary', usage: 'avatar container fill' },
  { token: '--text-primary', resolves: 'Text/primary', usage: 'matchId + meta label text' },
  { token: '--text-secondary', resolves: 'Text/secondary', usage: 'route + meta value text' },
  { token: '--border-subtle', resolves: 'Border/subtle', usage: 'row bottom divider + panel border' },
  { token: '--font-size-xs', resolves: '11px', usage: 'all row text' },
]

const ROWS = [
  {
    matchId: 'M-20481',
    route: 'Chicago, IL → Atlanta, GA',
    customer: 'Delaware Inc.',
    carrier: 'XPO Logistics',
    bol: 'BOL-994821',
    source: { label: 'FourKites, Inc.', variant: 'blue' },
    iconType: 'container',
  },
  {
    matchId: 'M-20479',
    route: 'Memphis, TN → Dallas, TX',
    customer: 'Midwest Freight Co.',
    carrier: 'Werner Enterprises',
    bol: 'BOL-993107',
    shipmentId: 'SHP-00215',
    source: { label: 'EDI 214', variant: 'purple' },
    iconType: 'package',
  },
  {
    matchId: 'M-20466',
    route: 'Los Angeles, CA → Phoenix, AZ',
    customer: 'Pacific Cargo Group',
    carrier: 'Old Dominion',
    bol: 'BOL-991044',
    source: { label: 'FourKites, Inc.', variant: 'blue' },
    iconType: 'handshake',
  },
]

export default function MatchRowDemo() {
  const [lastClicked, setLastClicked] = useState(null)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Search-result row for GlobalSearch. A 40×40 avatar sits left; the main
        line shows the match ID + route with a source <code>Badge</code> on the
        right; the meta line surfaces Customer, Carrier, and BOL cells. Pass{' '}
        <code>onClick</code> to make rows interactive (hover tint + role=button).
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">3 rows — blue source (FourKites) and purple (EDI 214), one with shipmentId</h4>
        <div style={{ width: 520, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {ROWS.map((row) => (
            <MatchRow
              key={row.matchId}
              matchId={row.matchId}
              route={row.route}
              customer={row.customer}
              carrier={row.carrier}
              bol={row.bol}
              shipmentId={row.shipmentId}
              source={row.source}
              iconType={row.iconType}
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

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Non-interactive rows — no onClick (no hover affordance)</h4>
        <div style={{ width: 520, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {ROWS.slice(0, 2).map((row) => (
            <MatchRow
              key={row.matchId}
              matchId={row.matchId}
              route={row.route}
              customer={row.customer}
              carrier={row.carrier}
              bol={row.bol}
              source={row.source}
              iconType={row.iconType}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
