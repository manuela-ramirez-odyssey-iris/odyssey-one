import { Handshake, Star, Trash2 } from 'lucide-react'
import { ICON_MD, ICON_LG } from '@odyssey/tokens'

/**
 * CustomerRow — molecule. Single row inside a selector list (e.g. Add Customers modal).
 *
 * Anatomy: 24×24 icon container (2px DSN/300 ring, radius-full, 4px padding, swappable
 * icon inside — default Handshake) + label + favorite Star (filled when `favorite`) +
 * Trash. Border-bottom DSN/200 — last child in a list should null its own border via
 * `:last-child` CSS or by the consumer.
 *
 * Figma master: `CustomerRow` set at `2029:461` on Components-Molecules.
 * Variants: `Favorite=False | True` (drives the star fill).
 */
export default function CustomerRow({
  label,
  icon,
  favorite = false,
  onFavoriteToggle,
  onDelete,
  className = '',
  ...rest
}) {
  const cls = `customer-row ${className}`.trim()
  return (
    <div className={cls} {...rest}>
      <div className="customer-row__info">
        <span className="customer-row__icon-container" aria-hidden="true">
          {icon || <Handshake {...ICON_MD} />}
        </span>
        <span className="text-label-sm-medium customer-row__label">{label}</span>
      </div>
      <div className="customer-row__actions">
        <button
          type="button"
          className="customer-row__action"
          onClick={onFavoriteToggle}
          aria-pressed={favorite}
          aria-label={favorite ? 'Unfavorite' : 'Favorite'}
        >
          <Star
            {...ICON_LG}
            fill={favorite ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          className="customer-row__action"
          onClick={onDelete}
          aria-label="Delete"
        >
          <Trash2 {...ICON_LG} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
