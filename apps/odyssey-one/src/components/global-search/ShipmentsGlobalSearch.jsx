import { useRef, useState, useEffect, useCallback } from 'react'
import { GlobalSearch, GlobalSearchPanel, GlobalSearchResults } from '@odyssey/ui'
import { useGlobalSearch } from '../../search/useGlobalSearch'
import { shipmentsSearchAdapter } from '../../search/shipments/adapter'
import ShipmentsFiltersView from './ShipmentsFiltersView'

/**
 * ShipmentsGlobalSearch — Shipments-domain wiring of the GlobalSearch bar.
 * Owns the search state (via hook + adapter), renders chips in the bar, and
 * positions the GlobalSearchPanel below the bar. Entry points: a non-empty
 * (debounced) query or a committed chip opens the Results glimpse (top-12
 * matches), and the FilterButton opens the Filters view (its active state is
 * bound to the Filters view being open, however it was reached).
 * The panel closes on click-outside and on Escape.
 *
 * TYPING NEVER FILTERS THE TABLE (decision 5, S79b). The table pipeline is fed
 * only by explicit commits:
 * - `onCommitQuery(query)` — "Show all N results" click or Enter in the input.
 *   The host route feeds it into listParams.searchTerm.
 * - `onSelectShipment(sellShipmentId)` — a match-row click. The host route
 *   selects that shipment (opens the docked ShipmentsBar with its details).
 */
export default function ShipmentsGlobalSearch({ onCommitQuery, onSelectShipment }) {
  const {
    value, query, onChange, onClear, onFocus, onBlur,
    chips, onChipCommit, onChipRemove,
    suggestionSections, suggestionsOpen,
    results, resultTotal,
  } = useGlobalSearch(shipmentsSearchAdapter)

  const wrapperRef = useRef(null)
  const [resultsOpen, setResultsOpen] = useState(false)
  // Which view the overlay shows: the results list or the filters panel.
  const [panelView, setPanelView] = useState('results')

  // Mirror panelView into a ref so the open/close effect below can read it
  // WITHOUT re-running when only the view changes — otherwise closing the panel
  // (which flips panelView back to 'results') would immediately re-open it while
  // chips exist.
  const panelViewRef = useRef('results')
  useEffect(() => { panelViewRef.current = panelView }, [panelView])

  // A non-empty debounced query or a committed chip → open the Results glimpse.
  // Emptying both closes it — but only while the Results view is showing; the
  // Filters view stays open (you can build filters with no chips committed yet,
  // e.g. opened via the FilterButton). Keyed to the query STRING (not a boolean)
  // so continued typing re-opens the glimpse after an explicit close.
  const hasQuery = query.trim().length > 0
  useEffect(() => {
    if (chips.length > 0 || query.trim()) setResultsOpen(true)
    else if (panelViewRef.current === 'results') setResultsOpen(false)
  }, [chips.length, query])

  const openFilters = () => { setPanelView('filters'); setResultsOpen(true) }
  const closePanel = useCallback(() => { setResultsOpen(false); setPanelView('results') }, [])

  // Commit the typed query to the host's table-search pipeline and close the
  // glimpse. The bar keeps its text — it represents the active table search.
  const commitQuery = useCallback(() => {
    onCommitQuery?.(value.trim())
    closePanel()
  }, [value, onCommitQuery, closePanel])

  // Match-row click → select that shipment (docked bar opens with its details,
  // whether or not the row is on the current table page) and close the glimpse.
  const handleMatchClick = useCallback((match) => {
    const key = match?.['data-shipment-key']
    if (key) onSelectShipment?.(key)
    closePanel()
  }, [onSelectShipment, closePanel])

  // Keyboard: Enter in the input commits the query (same as "Show all N
  // results"); Escape closes the panel. Listens on the wrapper so we don't
  // reach into the GlobalSearch internals; chip Enter presses are scoped out
  // by the INPUT check.
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { closePanel(); return }
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && value.trim()) commitQuery()
  }, [closePanel, commitQuery, value])

  // Close on click outside the entire wrapper (bar + panel).
  useEffect(() => {
    if (!resultsOpen) return
    const handleMouseDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setResultsOpen(false)
        setPanelView('results')
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [resultsOpen])

  return (
    <div className="shipments-global-search" ref={wrapperRef} onKeyDown={handleKeyDown}>
      <GlobalSearch
        value={value}
        onChange={onChange}
        onClear={onClear}
        onFocus={onFocus}
        onBlur={onBlur}
        chips={chips}
        onChipRemove={onChipRemove}
        onChipClick={() => setResultsOpen(true)}
        resultsOpen={resultsOpen}
        filterCount={chips.length}
        // FilterButton opens the Filters view; its active state is bound to the
        // Filters view being open — whether reached via the button or the
        // GlobalSearchResults "All Filters" link.
        filterActive={resultsOpen && panelView === 'filters'}
        onFilterClick={(next) => { if (next) openFilters(); else closePanel() }}
        suggestionSections={suggestionSections}
        suggestionsOpen={suggestionsOpen}
        onSuggestionSelect={onChipCommit}
      />

      {/* Results needs a query or committed chips; Filters can show on its own
          (opened via the FilterButton even before any chip is committed). */}
      {resultsOpen && (panelView === 'filters' || chips.length > 0 || hasQuery) && (
        <div className="shipments-results-panel">
          {panelView === 'results' ? (
            <GlobalSearchPanel
              count={resultTotal}
              // "Clear all" wipes chips AND the typed query (the hook's onClear
              // does both) — with query-driven results, clearing only chips
              // would leave the glimpse open on the residual query.
              onClear={onClear}
              onShowResults={commitQuery}
            >
              <GlobalSearchResults
                matches={results}
                maxRows={12}
                onMatchClick={handleMatchClick}
                onFiltersClick={() => setPanelView('filters')}
              />
            </GlobalSearchPanel>
          ) : (
            <ShipmentsFiltersView
              chips={chips}
              resultTotal={resultTotal}
              onBack={() => { if (chips.length > 0 || hasQuery) setPanelView('results'); else closePanel() }}
              onClose={closePanel}
              onClearAll={() => chips.forEach((c) => onChipRemove(c.key))}
              onShowResults={closePanel}
            />
          )}
        </div>
      )}
    </div>
  )
}
