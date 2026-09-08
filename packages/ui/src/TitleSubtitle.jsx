import { Info } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'

/**
 * TitleSubtitle — molecule: a compact section header. A subtitle eyebrow (label/xs,
 * tertiary) sits above a title (label/sm, primary) with an optional trailing icon.
 * Fills its parent width; both lines wrap (no truncation). Non-interactive.
 *
 * Figma master 3016:2056 — TEXT props Title / Subtitle, BOOLEANs Show Icon (a static
 * glyph), Show Badge and Show Text. The Badge is an EXPOSED nested instance, so its
 * Variant dropdown is on every instance — same treatment as HeaderStrip's badge, and
 * for the same reason: an INSTANCE_SWAP picker lists components, never a set's variants.
 * `title` is optional because Show Text can hide it, leaving a subtitle over a badge.
 *
 * Distinct from SectionHeader (single-row big H2 + timestamp) — this is the compact
 * stacked label pair.
 */
export default function TitleSubtitle({
  title,
  subtitle,
  // Optional Badge (or any node) on the TITLE row, after the title and before
  // the trailing icon — the order the master lays them out. It qualifies the
  // title, so it shares the title's row rather than the eyebrow's.
  badge,
  showIcon = false,
  className = '',
}) {
  return (
    <div className={`title-subtitle ${className}`.trim()}>
      {subtitle && (
        <span className="text-label-xs-medium title-subtitle__subtitle">{subtitle}</span>
      )}
      <div className="title-subtitle__title-row">
        {title != null && title !== '' && (
          <span className="text-label-sm-medium title-subtitle__title">{title}</span>
        )}
        {badge}
        {showIcon && (
          <span className="title-subtitle__icon" aria-hidden="true">
            <Info {...ICON_MD} />
          </span>
        )}
      </div>
    </div>
  )
}
