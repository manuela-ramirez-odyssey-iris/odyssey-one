import { Container, Package, Handshake } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import Badge from './Badge.jsx'

const AVATAR_ICONS = {
  container: <Container {...ICON_LG} />,
  package: <Package {...ICON_LG} />,
  handshake: <Handshake {...ICON_LG} />,
}

/**
 * MatchRow — molecule. One result row in the GlobalSearch `ResultsPreview` panel.
 *
 * Layout: 40×40 avatar (gray surface, switchable icon) · a main line with the
 * match ID (semibold) + route (regular) on the left and a source Badge on the
 * right · a meta line of Customer | Carrier | BOL cells separated by vertical
 * dividers.
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
  source = { label: 'FourKites, Inc.', variant: 'blue' },
  icon,
  iconType,
  onClick,
  className = '',
  ...rest
}) {
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
            <span className="match-row__meta-cell match-row__meta-cell--divider">
              <span>Customer:</span>
              <span>{customer}</span>
            </span>
            <span className="match-row__meta-cell match-row__meta-cell--divider">
              <span>Carrier:</span>
              <span>{carrier}</span>
            </span>
            <span className={`match-row__meta-cell${shipmentId ? ' match-row__meta-cell--divider' : ''}`}>
              <span>BOL:</span>
              <span>{bol}</span>
            </span>
            {shipmentId && (
              <span className="match-row__meta-cell">
                <span>Shipment #:</span>
                <span>{shipmentId}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
