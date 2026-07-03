import { Container, Package, Handshake } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'

const AVATAR_ICONS = {
  container: <Container {...ICON_LG} />,
  package: <Package {...ICON_LG} />,
  handshake: <Handshake {...ICON_LG} />,
}

/**
 * MatchSimpleRow — molecule. A compact match row: a 40×40 avatar (DSN/200 surface,
 * switchable 20px icon) beside a two-line details column — a main line with the
 * match ID (semibold) + customer (medium), and a sub line with the address
 * (label/xs regular).
 *
 * Simpler sibling of `MatchRow` (no route, no Customer/Carrier/BOL meta cells, no
 * source Badge). Figma master `3169:2821` — TEXT props Match ID / Customer / Address,
 * a switchable `Icon` INSTANCE_SWAP (placeholder-20). Interaction ladder lives in CSS
 * (Figma State = Default | Hover | Pressed): rest transparent → hover DSN/100 →
 * pressed DSN/200.
 *
 * `onClick` makes the whole row a selectable button (adds the hover/pressed affordance).
 */
export default function MatchSimpleRow({
  matchId,
  customer,
  address,
  icon,
  iconType,
  onClick,
  className = '',
  ...rest
}) {
  return (
    <div
      className={`match-simple-row ${className}`.trim()}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...rest}
    >
      <span className="match-simple-row__avatar" aria-hidden="true">
        {icon || AVATAR_ICONS[iconType] || AVATAR_ICONS.container}
      </span>
      <div className="match-simple-row__details">
        <div className="match-simple-row__main">
          <span className="match-simple-row__id text-label-sm-semibold">{matchId}</span>
          {customer && (
            <span className="match-simple-row__customer text-label-sm-medium">{customer}</span>
          )}
        </div>
        {address && (
          <span className="match-simple-row__address text-label-xs-regular">{address}</span>
        )}
      </div>
    </div>
  )
}
