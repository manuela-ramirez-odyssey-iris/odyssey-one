import { SlidersHorizontal } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import Button from './Button.jsx'
import MatchRow from './MatchRow.jsx'

const MAX_ROWS = 12

/**
 * GlobalSearchResults — organism. The global-search results body that fills the
 * GlobalSearchPanel content slot. The whole body is one scroll area: a "Best N Matches"
 * header, up to 12 rich `MatchRow` rows, and a trailing filter-link CTA — the header and
 * the link scroll along with the rows, so the link reads as an end-of-list CTA.
 *
 * Three internal states, in precedence order (Figma State variants):
 * - `error` set → a centered red alert message (Figma SearchAlert).
 * - `matches` empty → a centered muted `emptyMessage` (Figma SearchNoMatch).
 * - otherwise → the scrollable header + rows (capped at 12).
 *
 * The **filter-link CTA renders in every state** (when `onFiltersClick` is set): labeled
 * `filtersLabel` ("Filter More") in the populated state, and `editFiltersLabel`
 * ("Edit Filters") on empty / error — a "refine your search" affordance.
 *
 * Figma master: `GlobalSearchResults` set 3237:3439 on Components-Organisms.
 *
 * For the compact field-lookup results, use the separate `FieldSearchResults`. They share
 * the row molecule (MatchRow / MatchSimpleRow), not the container. `matches` is an array of
 * MatchRow props ({ matchId, route, customer, carrier, bol, source, icon, id }); only the
 * first `maxRows` (12) render.
 */
export default function GlobalSearchResults({
  matches = [],
  maxRows = MAX_ROWS,
  title = `Best ${Math.min(matches.length, maxRows)} Matches`,
  emptyMessage = 'No matching results found.',
  error,
  filtersLabel = 'Filter More',
  editFiltersLabel = 'Edit Filters',
  filtersIcon = <SlidersHorizontal {...ICON_LG} />,
  onFiltersClick,
  onMatchClick,
  className = '',
  ...rest
}) {
  const hasMatches = matches.length > 0
  const shown = matches.slice(0, maxRows)
  // "Filter More" while showing results; "Edit Filters" (refine) on empty / error.
  const filtersText = hasMatches && !error ? filtersLabel : editFiltersLabel

  return (
    <div className={`global-search-results ${className}`.trim()} {...rest}>
      {error ? (
        <p className="global-search-results__alert text-label-sm-regular" role="alert">{error}</p>
      ) : hasMatches ? (
        <>
          {title && (
            <span className="global-search-results__title text-label-sm-medium">{title}</span>
          )}
          <div className="global-search-results__list">
            {shown.map((m, i) => (
              <MatchRow
                key={m.id ?? m.matchId ?? i}
                {...m}
                onClick={onMatchClick ? () => onMatchClick(m) : m.onClick}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="global-search-results__empty text-label-sm-regular" role="status">{emptyMessage}</p>
      )}
      {onFiltersClick && (
        <div className="global-search-results__filters">
          <Button variant="link" size="sm" icon={filtersIcon} onClick={onFiltersClick}>
            {filtersText}
          </Button>
        </div>
      )}
    </div>
  )
}
