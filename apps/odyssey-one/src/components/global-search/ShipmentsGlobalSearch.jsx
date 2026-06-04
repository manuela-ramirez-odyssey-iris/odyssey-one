import { useRef, useState, useEffect } from 'react'
import { GlobalSearch, ResultsPreview } from '@odyssey/ui'
import { useGlobalSearch } from '../../search/useGlobalSearch'
import { shipmentsSearchAdapter } from '../../search/shipments/adapter'

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

  // Open when the first chip is committed; close when all chips are removed.
  useEffect(() => {
    if (chips.length > 0) setResultsOpen(true)
    else setResultsOpen(false)
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
        suggestionSections={suggestionSections}
        suggestionsOpen={suggestionsOpen}
        onSuggestionSelect={onChipCommit}
      />

      {resultsOpen && chips.length > 0 && (
        <div className="shipments-results-panel">
          <ResultsPreview
            matches={results}
            resultCount={resultTotal}
            onClear={() => chips.forEach((c) => onChipRemove(c.key))}
            onShowResults={() => {
              console.log('Show all results:', resultTotal)
            }}
          />
        </div>
      )}
    </div>
  )
}
