import { useRef, useState, useEffect } from 'react'
import { GlobalSearch, ResultsPreview } from '@odyssey/ui'
import { useGlobalSearch } from '../../search/useGlobalSearch'
import { shipmentsSearchAdapter } from '../../search/shipments/adapter'
import ShipmentsFiltersView from './ShipmentsFiltersView'

/**
 * ShipmentsGlobalSearch — Shipments-domain wiring of the GlobalSearch bar.
 * Owns the search state (via hook + adapter), renders chips in the bar, and
 * positions ResultsPreview below the bar once the first chip is committed.
 * ResultsPreview closes on click-outside.
 */
export default function ShipmentsGlobalSearch() {
  const {
    value, onChange, onClear, onFocus, onBlur,
    chips, onChipCommit, onChipRemove,
    suggestionSections, suggestionsOpen,
    results, resultTotal,
  } = useGlobalSearch(shipmentsSearchAdapter)

  const wrapperRef = useRef(null)
  const [resultsOpen, setResultsOpen] = useState(false)
  // Which view the overlay shows: the results list or the filters panel.
  const [panelView, setPanelView] = useState('results')

  // Open when the first chip is committed; close when all chips are removed.
  // Always return to the results view when the panel reopens.
  useEffect(() => {
    if (chips.length > 0) setResultsOpen(true)
    else { setResultsOpen(false); setPanelView('results') }
  }, [chips.length])

  // Close on click outside the entire wrapper (bar + panel).
  useEffect(() => {
    if (!resultsOpen) return
    const handleMouseDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setResultsOpen(false)
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
        suggestionSections={suggestionSections}
        suggestionsOpen={suggestionsOpen}
        onSuggestionSelect={onChipCommit}
      />

      {resultsOpen && chips.length > 0 && (
        <div className="shipments-results-panel">
          {panelView === 'results' ? (
            <ResultsPreview
              matches={results}
              resultCount={resultTotal}
              onFiltersClick={() => setPanelView('filters')}
              onClear={() => chips.forEach((c) => onChipRemove(c.key))}
              onShowResults={() => {
                console.log('Show all results:', resultTotal)
              }}
            />
          ) : (
            <ShipmentsFiltersView
              chips={chips}
              resultTotal={resultTotal}
              onBack={() => setPanelView('results')}
              onClose={() => setResultsOpen(false)}
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
