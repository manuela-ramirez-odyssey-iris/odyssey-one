import { useState } from 'react'
import { GlobalSearch } from '@odyssey/ui'

export const meta = {
  name: 'GlobalSearch',
  tier: 'molecule',
  figmaNode: '658:18',
  codeConnect: 'packages/ui/src/GlobalSearch.figma.tsx',
}

export const props = [
  { name: 'mode', type: "'search'|'title'", desc: "Rendering mode. 'search' = full interactive bar; 'title' = centered white heading text. Default 'search'." },
  { name: 'value', type: 'string', desc: 'Controlled input value (search mode).' },
  { name: 'onChange', type: '(value: string) => void', desc: 'Called on every keystroke.' },
  { name: 'onClear', type: '() => void', desc: 'Called when the CircleX clear button is clicked.' },
  { name: 'onBack', type: '() => void', desc: 'Called when the ChevronLeft back button is clicked.' },
  { name: 'onForward', type: '() => void', desc: 'Called when the ChevronRight forward button is clicked.' },
  { name: 'placeholder', type: 'string', desc: "Input placeholder. Default 'Search'." },
  { name: 'minWidth', type: 'number', desc: 'Minimum bar width in px. Default 590.' },
  { name: 'maxWidth', type: 'number', desc: 'Maximum bar width in px. Default 900.' },
  { name: 'showFilter', type: 'boolean', desc: 'Show the FilterButton at the right edge. Default true.' },
  { name: 'filterCount', type: 'number', desc: 'Active-filter count shown on the count Badge overlay. Default 0.' },
  { name: 'filterActive', type: 'boolean', desc: 'Controlled filter-drawer open state (optional). Uncontrolled when omitted.' },
  { name: 'onFilterClick', type: '(next: boolean) => void', desc: 'Called when FilterButton is clicked; receives the next active state.' },
  { name: 'chips', type: 'Chip[]', desc: 'Committed filter chips rendered inside the bar. Each chip: { key, label }.' },
  { name: 'onChipRemove', type: '(key: string) => void', desc: 'Called when a chip X button is clicked.' },
  { name: 'onChipClick', type: '(chip) => void', desc: 'Called when the chip body (not the X) is clicked.' },
  { name: 'suggestionSections', type: 'Section[]', desc: 'Suggestion dropdown sections: [{ title, items, onSelect }].' },
  { name: 'suggestionsOpen', type: 'boolean', desc: 'Whether the suggestion dropdown is visible. Default false.' },
  { name: 'onSuggestionSelect', type: '(item) => void', desc: 'Fallback onSelect for suggestion sections that omit their own.' },
  { name: 'resultsOpen', type: 'boolean', desc: 'Keeps bar expanded (chips visible) while a results panel is open. Default false.' },
  { name: 'title', type: 'string', desc: "Heading text shown in 'title' mode. Default 'Edit Dashboard'." },
]

export const tokens = [
  { token: '--deep-sea-neutral-900', resolves: 'DSN/900', usage: 'bar background' },
  { token: '--deep-sea-neutral-200', resolves: 'DSN/200', usage: 'clear-button icon color when focused' },
  { token: '--deep-sea-neutral-400', resolves: 'DSN/400', usage: 'nav arrow + clear-button icon color at rest' },
  { token: '--text-inverse', resolves: 'white', usage: 'input text color' },
  { token: '--radius-lg', resolves: 'radius/lg', usage: 'bar border-radius' },
  { token: '--shadow-sm', resolves: 'shadow/sm', usage: 'bar elevation' },
  { token: '--spacing-3', resolves: '12px', usage: 'bar horizontal padding (left side)' },
  { token: '--white', resolves: 'white', usage: 'title-mode text color' },
]

export default function GlobalSearchDemo() {
  const [searchValue, setSearchValue] = useState('')
  const [chips, setChips] = useState([
    { key: 'status', label: 'Status: In Transit' },
    { key: 'carrier', label: 'Carrier: XPO' },
  ])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [lastSuggestion, setLastSuggestion] = useState(null)
  const [filterCount, setFilterCount] = useState(2)

  const handleChange = (v) => {
    setSearchValue(v)
    setSuggestionsOpen(v.length > 0)
  }

  const handleClear = () => {
    setSearchValue('')
    setSuggestionsOpen(false)
  }

  const handleChipRemove = (key) => {
    setChips((prev) => prev.filter((c) => c.key !== key))
    setFilterCount((n) => Math.max(0, n - 1))
  }

  const handleSuggestionSelect = (item) => {
    const label = typeof item === 'string' ? item : item.label
    setLastSuggestion(label)
    const key = `chip-${Date.now()}`
    setChips((prev) => [...prev, { key, label }])
    setSearchValue('')
    setSuggestionsOpen(false)
    setFilterCount((n) => n + 1)
  }

  const suggestionSections = [
    {
      title: 'Suggested Filters',
      items: [
        'Status: Delivered',
        'Status: At Risk',
        'Carrier: Werner',
        'Client: Delaware Inc.',
        'Mode: TL',
      ],
      onSelect: handleSuggestionSelect,
    },
  ]

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Dark-surface navbar component that unifies back/forward navigation, a
        chip-based filter bar, and a floating suggestion dropdown. Renders on
        DSN/900 — displayed here inside a dark cell to match the real navbar context.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Search mode — interactive (type to open suggestions, click chips to remove)</h4>
        <div className="ds-demo-cell ds-demo-cell--dark" style={{ padding: 'var(--spacing-5)', alignItems: 'flex-start', minHeight: 80, overflow: 'visible', position: 'relative' }}>
          <GlobalSearch
            mode="search"
            value={searchValue}
            onChange={handleChange}
            onClear={handleClear}
            onBack={() => {}}
            onForward={() => {}}
            placeholder="Search shipments…"
            minWidth={400}
            maxWidth={700}
            filterCount={filterCount}
            chips={chips}
            onChipRemove={handleChipRemove}
            suggestionSections={suggestionSections}
            suggestionsOpen={suggestionsOpen}
          />
        </div>
        {lastSuggestion && (
          <p style={{ marginTop: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
            Last suggestion selected: <strong>{lastSuggestion}</strong>
          </p>
        )}
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Title mode — centered heading (e.g. dashboard rename)</h4>
        <div className="ds-demo-cell ds-demo-cell--dark" style={{ padding: 'var(--spacing-5)', minHeight: 56 }}>
          <GlobalSearch
            mode="title"
            title="Edit Dashboard"
            minWidth={400}
            maxWidth={700}
          />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Search mode — no filter button</h4>
        <div className="ds-demo-cell ds-demo-cell--dark" style={{ padding: 'var(--spacing-5)', minHeight: 56 }}>
          <GlobalSearch
            mode="search"
            value=""
            onChange={() => {}}
            onBack={() => {}}
            onForward={() => {}}
            placeholder="Search…"
            showFilter={false}
            minWidth={400}
            maxWidth={700}
          />
        </div>
      </div>
    </div>
  )
}
