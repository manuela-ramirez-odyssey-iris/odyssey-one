import { Info } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'

/**
 * TitleSubtitle — molecule: a compact section header. A subtitle eyebrow (label/xs,
 * tertiary) sits above a title (label/sm, primary) with an optional trailing icon.
 * Fills its parent width; both lines wrap (no truncation). Non-interactive.
 *
 * Figma master 3016:2056 — TEXT props Title / Subtitle, BOOLEAN Show Icon (a static glyph).
 *
 * Distinct from SectionHeader (single-row big H2 + timestamp) — this is the compact
 * stacked label pair.
 */
export default function TitleSubtitle({
  title,
  subtitle,
  showIcon = false,
  className = '',
}) {
  return (
    <div className={`title-subtitle ${className}`.trim()}>
      {subtitle && (
        <span className="text-label-xs-medium title-subtitle__subtitle">{subtitle}</span>
      )}
      <div className="title-subtitle__title-row">
        <span className="text-label-sm-medium title-subtitle__title">{title}</span>
        {showIcon && (
          <span className="title-subtitle__icon" aria-hidden="true">
            <Info {...ICON_MD} />
          </span>
        )}
      </div>
    </div>
  )
}
