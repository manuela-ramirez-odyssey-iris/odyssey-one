import { useState } from 'react'
import { SearchResults, SearchPanel } from '@odyssey/ui'

export const meta = {
  name: 'SearchResults',
  tier: 'organism',
  figmaNode: '2684:1040',
  codeConnect: 'packages/ui/src/SearchResults.figma.tsx',
}

export const props = [
  { name: 'title', type: 'string', desc: "Section heading above the match list. Default 'Best Match'." },
  { name: 'matches', type: 'Array<MatchRow props>', desc: "Array of MatchRow data objects: { matchId, route, customer, carrier, bol, shipmentId?, source?, icon?, iconType?, onClick? }. Keyed by m.id ?? m.matchId." },
  { name: 'filtersLabel', type: 'string', desc: "Label for the All Filters link button at the bottom. Default 'All Filters'." },
  { name: 'filtersIcon', type: 'ReactNode', desc: 'Leading icon for the filters link. Default <SlidersHorizontal>.' },
  { name: 'onFiltersClick', type: '() => void', desc: 'Called when the All Filters link button is clicked.' },
  { name: 'onMatchClick', type: '(match) => void', desc: 'Shared click handler for all match rows. Overrides individual row onClick when provided.' },
]

export const tokens = [
  { token: '--search-results-bg', resolves: 'transparent (inherits panel bg)', usage: 'results body background' },
  { token: '--border-subtle', resolves: 'Border/subtle', usage: 'separator between body and filters row' },
  { token: '--text-link', resolves: 'Carolina Blue/500', usage: 'All Filters link color' },
  { token: '--spacing-5', resolves: '20px', usage: 'body + filters row padding' },
  { token: '--match-row-hover-bg', resolves: 'BG/secondary', usage: 'row hover surface' },
  { token: '--font-size-sm', resolves: '14px', usage: 'title and meta text size' },
]

const MOCK_MATCHES = [
  {
    matchId: 'C814956',
    route: 'Allentown, PA → Henderson, KY',
    customer: 'Kemira Americas',
    carrier: 'CAPITAL TRANSPORTATION',
    bol: 'S378003JB3',
    source: { label: 'FourKites, Inc.', variant: 'blue' },
  },
  {
    matchId: 'C7645814',
    route: 'Allentown, PA → Louisville, KY',
    customer: 'A Hartrodt',
    carrier: 'AACT - AAA COOPER',
    bol: 'TH545725',
    source: { label: 'EDI 214', variant: 'purple' },
  },
  {
    matchId: 'C9021344',
    route: 'Chicago, IL → Dallas, TX',
    customer: 'Global Chem Partners',
    carrier: 'XPO LOGISTICS',
    bol: 'XP00291847',
    shipmentId: 'SHP-00934',
    source: { label: 'FourKites, Inc.', variant: 'blue' },
  },
  {
    matchId: 'C5502178',
    route: 'Houston, TX → Memphis, TN',
    customer: 'Delaware Inc.',
    carrier: 'WERNER ENTERPRISES',
    bol: 'WE8847210',
    source: { label: 'EDI 214', variant: 'purple' },
  },
]

export default function SearchResultsDemo() {
  const [lastMatch, setLastMatch] = useState(null)
  const [filtersClicked, setFiltersClicked] = useState(0)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Best Match content block that fills the <code>SearchPanel</code> content slot
        in the Results state. Renders a title, a scrollable list of{' '}
        <code>MatchRow</code> cards, and an All Filters link row at the bottom. The
        panel chrome (card, shadow, footer buttons) lives on{' '}
        <code>SearchPanel</code> — this component owns only the body.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">4 mock matches — click a row or All Filters</h4>
        <div
          style={{
            maxWidth: 580,
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <SearchResults
            title="Best Match"
            matches={MOCK_MATCHES}
            onMatchClick={(m) => setLastMatch(m.matchId)}
            onFiltersClick={() => setFiltersClicked((n) => n + 1)}
          />
        </div>
        {(lastMatch || filtersClicked > 0) && (
          <p style={{ marginTop: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
            {lastMatch && <>Last row clicked: <strong>{lastMatch}</strong></>}
            {lastMatch && filtersClicked > 0 && ' · '}
            {filtersClicked > 0 && <>All Filters: {filtersClicked}×</>}
          </p>
        )}
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Composed inside SearchPanel — realistic drop-down context</h4>
        <div style={{ maxWidth: 620 }}>
          {/* Import SearchPanel inline via direct import to avoid circular demo dep */}
          <SearchResultsInPanel />
        </div>
      </div>
    </div>
  )
}

// Inline composition — SearchPanel already imported at top.
function SearchResultsInPanel() {
  const [cleared, setCleared] = useState(0)
  const [shown, setShown] = useState(0)

  return (
    <>
      <SearchPanel
        showHeader={false}
        showSecondary
        secondaryLabel="Clear all"
        count={MOCK_MATCHES.length}
        onClear={() => setCleared((n) => n + 1)}
        onShowResults={() => setShown((n) => n + 1)}
      >
        <SearchResults
          title="Best Match"
          matches={MOCK_MATCHES.slice(0, 3)}
          onFiltersClick={() => {}}
        />
      </SearchPanel>
      {(cleared > 0 || shown > 0) && (
        <p style={{ marginTop: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
          Clear all: {cleared}× · Show results: {shown}×
        </p>
      )}
    </>
  )
}
