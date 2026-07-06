import { useRef, useState, useEffect } from 'react'
import { GlobalSearch, GlobalSearchPanel, GlobalSearchResults } from '@odyssey/ui'
import { useGlobalSearch } from '../../search/useGlobalSearch'
import { shipmentsSearchAdapter } from '../../search/shipments/adapter'
import ShipmentsFiltersView from './ShipmentsFiltersView'

/**
 * ShipmentsGlobalSearch — Shipments-domain wiring of the GlobalSearch bar.
 * Owns the search state (via hook + adapter), renders chips in the bar, and
 * positions the GlobalSearchPanel below the bar. Two entry points: committing a chip
 * opens the Results preview, and the FilterButton opens the Filters view (its
 * active state is bound to the Filters view being open, however it was reached).
 * The panel closes on click-outside.
 *
 * `onQueryChange(value)` reports every raw query change (typing, clear, the
 * hook's own resets on chip commit) to the host route — on Shipments it feeds
 * the table's debounced searchTerm pipeline, making the navbar bar THE table
 * search (the in-table search box was retired in S79).
 */
export default function ShipmentsGlobalSearch({ onQueryChange }) {
  const {
    value, onChange, onClear, onFocus, onBlur,
    chips, onChipCommit, onChipRemove,
    suggestionSections, suggestionsOpen,
    results, resultTotal,
  } = useGlobalSearch(shipmentsSearchAdapter)

  // Effect (not an onChange wrapper) so internal value resets — e.g. the hook
  // clearing the input on chip commit — also reach the host.
  useEffect(() => { onQueryChange?.(value) }, [value, onQueryChange])

  const wrapperRef = useRef(null)
  const [resultsOpen, setResultsOpen] = useState(false)
  // Which view the overlay shows: the results list or the filters panel.
  const [panelView, setPanelView] = useState('results')

  // Mirror panelView into a ref so the chip effect below can read it WITHOUT
  // re-running when only the view changes — otherwise closing the panel (which
  // flips panelView back to 'results') would immediately re-open it while chips
  // exist.
  const panelViewRef = useRef('results')
  useEffect(() => { panelViewRef.current = panelView }, [panelView])

  // Commit the first chip → open the Results preview. Removing the last chip
  // closes the Results preview — but only while the Results view is showing; the
  // Filters view stays open (you can build filters with no chips committed yet,
  // e.g. opened via the FilterButton). Keyed to chip changes only.
  useEffect(() => {
    if (chips.length > 0) setResultsOpen(true)
    else if (panelViewRef.current === 'results') setResultsOpen(false)
  }, [chips.length])

  const openFilters = () => { setPanelView('filters'); setResultsOpen(true) }
  const closePanel = () => { setResultsOpen(false); setPanelView('results') }

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
    <div className="shipments-global-search" ref={wrapperRef}>
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

      {/* Results needs committed chips; Filters can show on its own (opened via
          the FilterButton even before any chip is committed). */}
      {resultsOpen && (panelView === 'filters' || chips.length > 0) && (
        <div className="shipments-results-panel">
          {panelView === 'results' ? (
            <GlobalSearchPanel
              count={resultTotal}
              onClear={() => chips.forEach((c) => onChipRemove(c.key))}
              onShowResults={() => {
                console.log('Show all results:', resultTotal)
              }}
            >
              <GlobalSearchResults
                matches={results}
                onFiltersClick={() => setPanelView('filters')}
              />
            </GlobalSearchPanel>
          ) : (
            <ShipmentsFiltersView
              chips={chips}
              resultTotal={resultTotal}
              onBack={() => { if (chips.length > 0) setPanelView('results'); else closePanel() }}
              onClose={closePanel}
              onClearAll={() => chips.forEach((c) => onChipRemove(c.key))}
              onShowResults={() => {
                console.log('Show all results:', resultTotal)
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
