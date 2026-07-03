import MatchSimpleRow from './MatchSimpleRow.jsx'

/**
 * FieldSearchResults — organism. The compact results body for a focalized field
 * lookup (a typeahead within a form field): a list of `MatchSimpleRow` rows, a
 * centered no-match message when `matches` is empty (Figma SearchNoMatch), and a
 * centered red alert message when `error` is set (Figma SearchAlert).
 *
 * Figma master: `SearchResultsMedium` set 3170:2989 on Components-Organisms.
 *
 * Sibling of `GlobalSearchResults` (global search): same "results list + empty" shape but a
 * different intent and far less functionality (no title, no filters footer, no source
 * badges), so it's a separate component. They share the row molecule, not the container.
 *
 * State precedence: error → empty (matches empty) → populated. `matches` is an array of
 * MatchSimpleRow props ({ matchId, customer, address, icon, id }).
 */
export default function FieldSearchResults({
  matches = [],
  emptyMessage = 'No matching locations found.',
  error,
  onMatchClick,
  className = '',
  ...rest
}) {
  const hasMatches = matches.length > 0

  return (
    <div className={`field-search-results ${className}`.trim()} {...rest}>
      {error ? (
        <p className="field-search-results__alert text-label-sm-regular" role="alert">{error}</p>
      ) : hasMatches ? (
        <div className="field-search-results__list">
          {matches.map((m, i) => (
            <MatchSimpleRow
              key={m.id ?? m.matchId ?? i}
              {...m}
              onClick={onMatchClick ? () => onMatchClick(m) : m.onClick}
            />
          ))}
        </div>
      ) : (
        <p className="field-search-results__empty text-label-sm-regular" role="status">{emptyMessage}</p>
      )}
    </div>
  )
}
