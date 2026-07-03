import { Info, ChevronDown } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'

/**
 * SubSectionHeader — molecule. A single-row subsection header: a title
 * (label/base semibold) with an optional trailing info glyph on the left, and an
 * optional dropdown chevron right-aligned.
 *
 * Figma master 3303:3665 — TEXT prop `Title`, BOOLEAN `Info Icon` (→ showInfo),
 * BOOLEAN `Dropdown` (→ showDropdown). Both icons are static (info / chevron-down)
 * and non-interactive by default.
 *
 * Distinct from SectionHeader (big H2 + "Last update" timestamp) and TitleSubtitle
 * (stacked eyebrow + title pair) — this is the compact single-row label used to head
 * a filter subsection (e.g. "Client", "Location").
 */
export default function SubSectionHeader({
  title,
  showInfo = true,
  showDropdown = true,
  className = '',
  ...rest
}) {
  return (
    <div className={`sub-section-header ${className}`.trim()} {...rest}>
      <span className="sub-section-header__lead">
        <span className="sub-section-header__title text-label-base-semibold">{title}</span>
        {showInfo && (
          <span className="sub-section-header__info" aria-hidden="true">
            <Info {...ICON_MD} />
          </span>
        )}
      </span>
      {showDropdown && (
        <span className="sub-section-header__dropdown" aria-hidden="true">
          <ChevronDown {...ICON_MD} />
        </span>
      )}
    </div>
  )
}
