import { Handshake, Star, Trash2 } from 'lucide-react'
import { ICON_MD, ICON_LG } from '@odyssey/tokens'
import Badge from './Badge.jsx'

/**
 * CustomerRow — molecule. Two modes for two contexts in the customer-picker flow:
 *
 * - `mode="list"` (default) — selected-list row. 48h, 32×32 logo container with 20px icon.
 *   When `favorite=true` the logo gets a `<Badge variant="favorite" />` overlay at bottom-right.
 *   Trailing action is Trash (`onDelete`). No favorite-toggle button.
 *
 * - `mode="result"` — search-dropdown row. 40h, 24×24 logo container with 16px icon,
 *   no bottom border. Trailing action is a Star toggle (`onFavoriteToggle`) — filled when
 *   `favorite=true`, outlined when false. No badge overlay.
 *
 * Figma master: `CustomerRow` set `2029:461` on Components-Molecules.
 * Variant axes: `Mode=List|Result` × `Favorite=False|True` → 4 variants.
 */
export default function CustomerRow({
  label,
  icon,
  mode = 'list',
  favorite = false,
  onFavoriteToggle,
  onDelete,
  onClick,
  className = '',
  ...rest
}) {
  const isResult = mode === 'result'
  const iconProps = isResult ? ICON_MD : ICON_LG
  const cls = `customer-row${isResult ? ' customer-row--result' : ''} ${className}`.trim()

  return (
    <div
      className={cls}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...rest}
    >
      <div className="customer-row__info">
        <span className="customer-row__icon-container" aria-hidden="true">
          {icon || <Handshake {...iconProps} />}
          {favorite && !isResult && (
            <span className="customer-row__badge-overlay">
              <Badge variant="favorite" />
            </span>
          )}
        </span>
        <span className="text-label-sm-medium customer-row__label">{label}</span>
      </div>
      <div className="customer-row__actions">
        {isResult ? (
          <button
            type="button"
            className="customer-row__action"
            onClick={(e) => {
              e.stopPropagation()
              onFavoriteToggle?.()
            }}
            aria-pressed={favorite}
            aria-label={favorite ? 'Unfavorite' : 'Favorite'}
          >
            <Star
              {...ICON_MD}
              fill={favorite ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
          </button>
        ) : (
          onDelete && (
            <button
              type="button"
              className="customer-row__action"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              aria-label="Delete"
            >
              <Trash2 {...ICON_LG} aria-hidden="true" />
            </button>
          )
        )}
      </div>
    </div>
  )
}
