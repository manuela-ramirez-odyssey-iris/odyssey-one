import { Container, Package, Handshake } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import Badge from './Badge.jsx'

const AVATAR_ICONS = {
  container: <Container {...ICON_LG} />,
  package: <Package {...ICON_LG} />,
  handshake: <Handshake {...ICON_LG} />,
}

/**
 * MatchRow — molecule. One result row in the GlobalSearch `GlobalSearchResults` list.
 *
 * Layout: 40×40 avatar (gray surface, switchable icon) · a main line with the
 * match ID (semibold) + route (regular) on the left and a source Badge on the
 * right · a meta line of label/value cells separated by vertical dividers.
 *
 * The meta cells are DATA (`meta={[{label, value}]}`), not baked text: the row
 * is the shared search-result row for every domain, and the labels differ per
 * domain — Orders has no carrier and no BOL, so Shipments' three labels were
 * printing empty cells there. Omit `meta` and the `customer`/`carrier`/`bol`
 * (+ optional `shipmentId`) props build the Shipments set, unchanged.
 *
 * Figma master: `MatchRow` set `2460:2` on Components-Molecules.
 * The avatar icon is a switchable INSTANCE_SWAP slot (placeholder-20 in Figma);
 * in code it defaults to a neutral `Package` glyph — pass `icon` to override.
 * The source pill is a real `Badge` instance (`blue` default; `purple` for EDI feeds).
 *
 * `onClick` makes the whole row a selectable button (adds a hover affordance).
 */
export default function MatchRow({
  matchId,
  route,
  customer,
  carrier,
  bol,
  shipmentId,
  meta,
  source = { label: 'FourKites, Inc.', variant: 'blue' },
  icon,
  iconType,
  onClick,
  className = '',
  ...rest
}) {
  // Shipments' three cells (+ Shipment # when present) are the default set, so
  // every existing caller renders exactly as before.
  const cells = meta ?? [
    { label: 'Customer', value: customer },
    { label: 'Carrier', value: carrier },
    { label: 'BOL', value: bol },
    ...(shipmentId ? [{ label: 'Shipment #', value: shipmentId }] : []),
  ]
  return (
    <div
      className={`match-row ${className}`.trim()}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...rest}
    >
      <div className="match-row__info">
        <span className="match-row__avatar" aria-hidden="true">
          {icon || AVATAR_ICONS[iconType] || AVATAR_ICONS.container}
        </span>
        <div className="match-row__details">
          <div className="match-row__main">
            <span className="match-row__location text-label-xs-regular">
              <span className="text-label-xs-semibold">{matchId}</span>
              {route ? <span>&nbsp;{route}</span> : null}
            </span>
            {source && <Badge variant={source.variant}>{source.label}</Badge>}
          </div>
          <div className="match-row__meta text-label-xs-regular">
            {cells.map(({ label, value }, i) => (
              <span
                key={label}
                // Every cell but the last carries the divider — the rule the
                // hardcoded classes used to spell out one by one.
                className={`match-row__meta-cell${i < cells.length - 1 ? ' match-row__meta-cell--divider' : ''}`}
              >
                <span>{label}:</span>
                <span>{value}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
