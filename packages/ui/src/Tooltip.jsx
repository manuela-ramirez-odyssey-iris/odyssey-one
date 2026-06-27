import Badge from './Badge.jsx'

/**
 * Tooltip — molecule. A dark info card (DSN/900) with an optional header
 * (icon Badge + label + right-aligned status) and a body of {subtitle, content}
 * groups. The 3 Figma presentations fall out of props:
 *  1. header (badge + label + status) + groups with subtitles
 *  2. header (badge + label) + content-only groups (subtitle off)
 *  3. plain content (no header)
 *
 * Width hugs content. The header uses CSS `gap` (the minimum separation) +
 * `justify-content: space-between` so a narrow card keeps a guaranteed gap
 * between label and status, while a wider card (long body) pushes the status to
 * the right edge — the native equivalent of the Figma "Minimum Gap" transparent
 * shape.
 *
 * @param badgeVariant 'time' | 'info' — header icon Badge (omit → no badge)
 * @param leftIcon     optional icon that overrides the badge's baked default
 * @param label        header label text
 * @param status       header right-aligned status text (omit → no status)
 * @param groups       [{ subtitle?, content }] — body rows; subtitle optional per group
 */
export default function Tooltip({
  badgeVariant,
  leftIcon,
  label,
  status,
  groups = [],
  className = '',
  ...rest
}) {
  const hasHeader = !!badgeVariant || !!label || !!status
  const classes = ['tooltip', className].filter(Boolean).join(' ')

  return (
    <div className={classes} role="tooltip" {...rest}>
      {hasHeader && (
        <div className="tooltip__header">
          <div className="tooltip__header-lead">
            {badgeVariant && <Badge variant={badgeVariant} iconOnly leftIcon={leftIcon} />}
            {label && <span className="tooltip__label text-label-xs-regular">{label}</span>}
          </div>
          {status && <span className="tooltip__status text-label-xs-regular">{status}</span>}
        </div>
      )}
      {groups.length > 0 && (
        <div className="tooltip__body">
          {groups.map((g, i) => (
            <div className="tooltip__group" key={i}>
              {g.subtitle && (
                <span className="tooltip__subtitle text-label-xs-regular">{g.subtitle}</span>
              )}
              <span className="tooltip__content text-label-xs-regular">{g.content}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
