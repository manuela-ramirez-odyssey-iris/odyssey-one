import { GlobalSearch } from '@odyssey/ui'
import { useGlobalSearch } from '../../search/useGlobalSearch'
import { shipmentsSearchAdapter } from '../../search/shipments/adapter'

/**
 * ShipmentsGlobalSearch — the Shipments-domain wiring of the shared GlobalSearch
 * bar. Binds the agnostic orchestration hook to the Shipments adapter and renders
 * the normalized `<GlobalSearch>` (with its FilterSuggestions dropdown). Mounted
 * only here via AppShell's `searchSlot` — other routes get the plain bar.
 */
export default function ShipmentsGlobalSearch() {
  const {
    value, onChange, onClear, onFocus, onBlur,
    suggestionSections, suggestionsOpen,
  } = useGlobalSearch(shipmentsSearchAdapter)

  return (
    <GlobalSearch
      value={value}
      onChange={onChange}
      onClear={onClear}
      onFocus={onFocus}
      onBlur={onBlur}
      suggestionSections={suggestionSections}
      suggestionsOpen={suggestionsOpen}
      onSuggestionSelect={(item) => {
        // First user intention. The indexed value results render in the SECOND
        // panel (pending its own normalization) — not the table. No-op for now.
        console.log('FilterSuggestions selected:', item)
      }}
    />
  )
}
