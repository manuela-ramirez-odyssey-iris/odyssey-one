import { SlidersHorizontal } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import Button from './Button.jsx'
import MatchRow from './MatchRow.jsx'

/**
 * SearchResults — organism. The "Best Match" content that fills the SearchPanel
 * content slot in the Results state: a title + a scrollable list of `MatchRow`
 * results, followed by a link row that opens the Filters view. The panel chrome
 * (card, header, footer) lives on <SearchPanel>; this component owns only the body.
 *
 * Figma master: `SearchResults` 2684:1040 on Components-Organisms (Modals artboard).
 *
 * `matches` is an array of MatchRow props (`{ matchId, route, customer, carrier,
 * bol, source, icon, id }`). The link row uses `Button variant="link"` with a
 * leading icon.
 */
export default function SearchResults({
  title = 'Best Match',
  matches = [],
  filtersLabel = 'All Filters',
  filtersIcon = <SlidersHorizontal {...ICON_LG} />,
  onFiltersClick,
  onMatchClick,
  className = '',
  ...rest
}) {
  return (
    <div className={`search-results ${className}`.trim()} {...rest}>
      <div className="search-results__body">
        {title && (
          <span className="search-results__title text-label-sm-medium">{title}</span>
        )}
        <div className="search-results__list">
          {matches.map((m, i) => (
            <MatchRow
              key={m.id ?? m.matchId ?? i}
              {...m}
              onClick={onMatchClick ? () => onMatchClick(m) : m.onClick}
            />
          ))}
        </div>
      </div>
      <div className="search-results__filters">
        <Button variant="link" size="sm" icon={filtersIcon} onClick={onFiltersClick}>
          {filtersLabel}
        </Button>
      </div>
    </div>
  )
}
