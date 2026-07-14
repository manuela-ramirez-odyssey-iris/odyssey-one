import { useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import MatchSimpleRow from './MatchSimpleRow.jsx'

const ROW_HEIGHT = 56 // ponytail: matches SearchField's previous constant; covers avatar row + gap

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
 *
 * The populated list is ALWAYS virtualized via @tanstack/react-virtual (transparent for
 * small sets — jsdom sees 0 rows, real browsers get an overscan window).
 *
 * New props:
 *   activeIndex      — index of the highlighted row; gets .is-active + aria-selected.
 *   optionIdPrefix   — id prefix for option nodes (ids: `${optionIdPrefix}-option-${i}`).
 *   rowProps         — object spread onto every MatchSimpleRow (e.g. { showAvatar: false }).
 */
export default function FieldSearchResults({
  matches = [],
  emptyMessage = 'No matching locations found.',
  error,
  onMatchClick,
  activeIndex = -1,
  optionIdPrefix,
  rowProps,
  className = '',
  ...rest
}) {
  const hasMatches = matches.length > 0
  const parentRef = useRef(null)

  const virtualizer = useVirtualizer({
    count: hasMatches && !error ? matches.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  })

  // Keyboard nav: keep the highlighted row inside the scroll window —
  // without this, arrowing past the visible rows leaves the highlight
  // off-screen in a virtualized list.
  useEffect(() => {
    if (activeIndex >= 0) virtualizer.scrollToIndex(activeIndex)
  }, [activeIndex, virtualizer])

  // listbox role when clickable (either shared handler or per-row onClick)
  const isListbox = !!onMatchClick || matches.some((m) => m.onClick)

  return (
    <div
      className={`field-search-results${className ? ` ${className}` : ''}`}
      role={isListbox ? 'listbox' : undefined}
      {...rest}
    >
      {error ? (
        <p className="field-search-results__alert text-label-sm-regular" role="alert">{error}</p>
      ) : hasMatches ? (
        <div
          ref={parentRef}
          className="field-search-results__list"
          style={{ maxHeight: 320, overflowY: 'auto' }}
        >
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((vrow) => {
              const m = matches[vrow.index]
              const isActive = vrow.index === activeIndex
              const optId = optionIdPrefix ? `${optionIdPrefix}-option-${vrow.index}` : undefined
              return (
                <div
                  key={vrow.key}
                  data-index={vrow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${vrow.start}px)`,
                    paddingBottom: 'var(--spacing-1)',
                  }}
                >
                  <MatchSimpleRow
                    key={m.id ?? m.matchId ?? vrow.index}
                    {...m}
                    {...rowProps}
                    id={optId ?? m.id}
                    role="option"
                    aria-selected={isActive}
                    className={isActive ? 'is-active' : ''}
                    onClick={onMatchClick ? () => onMatchClick(m) : m.onClick}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="field-search-results__empty text-label-sm-regular" role="status">{emptyMessage}</p>
      )}
    </div>
  )
}
