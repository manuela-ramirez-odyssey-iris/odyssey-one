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
 * New Figma booleans: `showAvatar` (default true) hides the avatar span when false;
 * `showInfo` (default true) hides the address sub-line when false.
 */
export default function MatchSimpleRow({
  matchId,
  customer,
  address,
  icon,
  iconType,
  onClick,
  showAvatar = true,
  showInfo = true,
  twoColumn = false,
  isSelected = false,
  className = '',
  ...rest
}) {
  // ponytail: --clickable class drives hover/pressed CSS instead of [role="button"] so
  // role="option" rows (typeahead) get the same interaction affordance.
  const clickable = !!onClick
  // Plain-list mode: with no avatar and no info sub-line the row is a simple
  // item list — semibold reads too heavy, so the ID drops to label/sm regular
  // (14px/400). User rule 2026-07-28; Figma master sync owed with the batch.
  const plainList = !showAvatar && !(showInfo && address)

  // Two-column mode (Orders special-services mock 5427:13375): code | description
  // on a shared grid so rows align with FieldSearchResults' columnHeaders row.
  // Plain-list typography (14px/400) on both cells.
  if (twoColumn) {
    return (
      <div
        className={`match-simple-row match-simple-row--two-col${clickable ? ' match-simple-row--clickable' : ''}${isSelected ? ' match-simple-row--selected' : ''}${className ? ` ${className}` : ''}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        {...rest}
      >
        <span className="match-simple-row__id text-label-sm-regular">{matchId}</span>
        <span className="text-label-sm-regular" style={{ color: 'var(--text-primary)' }}>{address}</span>
      </div>
    )
  }

  return (
    <div
      className={`match-simple-row${clickable ? ' match-simple-row--clickable' : ''}${isSelected ? ' match-simple-row--selected' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...rest}
    >
      {showAvatar && (
        <span className="match-simple-row__avatar" aria-hidden="true">
          {icon || AVATAR_ICONS[iconType] || AVATAR_ICONS.container}
        </span>
      )}
      <div className="match-simple-row__details">
        <div className="match-simple-row__main">
          <span className={`match-simple-row__id ${plainList ? 'text-label-sm-regular' : 'text-label-sm-semibold'}`}>{matchId}</span>
          {customer && (
            <span className="match-simple-row__customer text-label-sm-medium">{customer}</span>
          )}
        </div>
        {showInfo && address && (
          <span className="match-simple-row__address text-label-xs-regular">{address}</span>
        )}
      </div>
    </div>
  )
}
