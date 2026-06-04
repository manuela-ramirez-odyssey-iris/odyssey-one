import { SlidersHorizontal } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import Button from './Button.jsx'
import MatchRow from './MatchRow.jsx'

/**
 * ResultsPreview — organism. The "Best Match" preview panel that drops below the
 * GlobalSearch bar once filter criteria are committed. White rounded panel
 * (shadow/2xl) with a scrollable list of `MatchRow` results, a filters link, and
 * a footer action bar (Clear all · Show N results).
 *
 * Figma master: `ResultsPreview` `2462:149` on Components-Organisms (Modals artboard).
 *
 * `matches` is an array of MatchRow props (`{ matchId, route, customer, carrier,
 * bol, source, icon, id }`). The footer "Show N results" count defaults to
 * `matches.length` unless `resultCount` is given. The filters link uses
 * `Button variant="link"` with a leading icon (the new ButtonLink leading-icon slot).
 */
export default function ResultsPreview({
  title = 'Best Match',
  matches = [],
  resultCount,
  filtersLabel = 'All Filters',
  filtersIcon = <SlidersHorizontal {...ICON_LG} />,
  onFiltersClick,
  onClear,
  onShowResults,
  onMatchClick,
  className = '',
  style,
  ...rest
}) {
  const count = resultCount ?? matches.length
  return (
    <div className={`results-preview ${className}`.trim()} style={style} {...rest}>
      <div className="results-preview__body">
        {title && (
          <span className="results-preview__title text-label-sm-medium">{title}</span>
        )}
        <div className="results-preview__list">
          {matches.map((m, i) => (
            <MatchRow
              key={m.id ?? m.matchId ?? i}
              {...m}
              onClick={onMatchClick ? () => onMatchClick(m) : m.onClick}
            />
          ))}
        </div>
      </div>
      <div className="results-preview__filters">
        <Button variant="link" size="sm" icon={filtersIcon} onClick={onFiltersClick}>
          {filtersLabel}
        </Button>
      </div>
      <div className="results-preview__actions">
        <Button variant="secondary" size="md" onClick={onClear}>
          Clear all
        </Button>
        <Button variant="primary" size="md" onClick={onShowResults}>
          Show {count} {count === 1 ? 'result' : 'results'}
        </Button>
      </div>
    </div>
  )
}
