import { useState } from 'react'
import { GlobalSearchResults } from '@odyssey/ui'

export const meta = {
  name: 'GlobalSearchResults',
  tier: 'organism',
  normalizing: true,
  approved: true,
  ported: true,
  figmaNode: '3237:3439',
  codeConnect: 'packages/ui/src/GlobalSearchResults.figma.tsx',
}

export const props = [
  { name: 'matches', type: 'Array<MatchRow props>', desc: 'MatchRow data objects ({ matchId, route, customer, carrier, bol, source, icon, id }). Only the first maxRows (12) render. Empty [] → the no-match state.' },
  { name: 'maxRows', type: 'number', desc: 'Cap on rendered rows. Default 12. Beyond this, the "Filter More" CTA is the refine path (no pagination).' },
  { name: 'title', type: 'string', desc: 'Header above the list. Defaults to a dynamic "Best N Matches" (N = min(matches.length, maxRows)). Scrolls with the rows.' },
  { name: 'emptyMessage', type: 'string', desc: "Centered muted message when matches is empty (Figma SearchNoMatch). Default 'No matching results found.'." },
  { name: 'error', type: 'string', desc: 'When set, renders a centered red alert message instead of rows/empty (Figma SearchAlert). Highest precedence.' },
  { name: 'filtersLabel', type: 'string', desc: "Filter CTA label while showing results. Default 'Filter More'." },
  { name: 'editFiltersLabel', type: 'string', desc: "Filter CTA label on the empty / error states (a refine affordance). Default 'Edit Filters'." },
  { name: 'filtersIcon', type: 'ReactNode', desc: 'Leading icon for the filters link. Default <SlidersHorizontal>.' },
  { name: 'onFiltersClick', type: '() => void', desc: 'When provided, renders the filter-link CTA at the end — in every state (populated / empty / error). Omit → no CTA.' },
  { name: 'onMatchClick', type: '(match) => void', desc: 'Shared row click handler; overrides individual row onClick when provided.' },
]

export const tokens = [
  { token: '--text-tertiary', resolves: 'DSN/500', usage: 'title + empty-state message' },
  { token: '--text-error', resolves: 'Bittersweet/600', usage: 'alert-state message' },
  { token: '--text-link', resolves: 'Carolina Blue/600', usage: '"Filter More" CTA' },
  { token: '--spacing-6', resolves: '24px', usage: 'body padding' },
  { token: 'max-height', resolves: '352px (raw)', usage: 'scroll window — header + rows + CTA scroll together' },
]

const MOCK = Array.from({ length: 14 }, (_, i) => ({
  matchId: `C${814956 + i * 137}`,
  route: 'Allentown, PA → Henderson, KY',
  customer: ['Kemira Americas', 'A Hartrodt', 'Global Chem Partners', 'AM Stabilizers', 'ADP Global Logistics'][i % 5],
  carrier: ['CAPITAL TRANSPORTATION', 'AACT - AAA COOPER', 'XPO LOGISTICS', 'AGVS - ATS LOGISTICS'][i % 4],
  bol: `S${378003 + i}JB3`,
  source: i % 3 === 1 ? { label: 'EDI 214', variant: 'purple' } : { label: 'FourKites, Inc.', variant: 'blue' },
  iconType: ['container', 'package', 'handshake'][i % 3],
}))

// ── Schematic ───────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  return (
    <span style={{ display: 'inline-block', padding: '0 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: '11px', fontWeight: 'var(--font-weight-medium)', whiteSpace: 'nowrap' }}>{tier}</span>
  )
}
function ChildLink({ to, children }) {
  return <a href={`#comp-${to}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-link)', textDecoration: 'underline', fontWeight: 'var(--font-weight-semibold)', whiteSpace: 'nowrap' }}>{children}</a>
}
function LegendRow({ part, tier, nested = false, children }) {
  const cell = { padding: 'var(--spacing-2) 0', borderBottom: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }
  return (
    <li style={{ display: 'contents' }}>
      <span style={{ ...cell, display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', whiteSpace: 'nowrap', paddingLeft: nested ? 'var(--spacing-6)' : 0, color: 'var(--text-primary)', fontWeight: nested ? 'var(--font-weight-medium)' : 'var(--font-weight-semibold)' }}>
        {nested && <span style={{ color: 'var(--text-tertiary)' }} aria-hidden="true">└</span>}
        {part}{tier && <TierBadge tier={tier} />}
      </span>
      <span style={{ ...cell, color: 'var(--text-secondary)' }}>{children}</span>
    </li>
  )
}

function Schematic() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-8)', alignItems: 'flex-start', background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ flex: '1 1 480px', minWidth: 360, background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {/* Compact illustration — 3 rows. The 12-row cap + scroll is exercised in the Playground. */}
        <GlobalSearchResults matches={MOCK.slice(0, 3)} title="Best 12 Matches" onFiltersClick={() => {}} />
      </div>
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="root" tier="organism">One scroll area. Populated: "Best N Matches" header + rows. Empty/error: a centered message. The filter CTA is always at the end.</LegendRow>
        <LegendRow part={<ChildLink to="MatchRow">MatchRow</ChildLink>} tier="molecule" nested>Rich rows: route + Customer/Carrier/BOL cells + source Badge. Capped at 12.</LegendRow>
        <LegendRow part={<ChildLink to="Button">Button (link)</ChildLink>} tier="atom" nested>Filters CTA — "Filter More" when populated, "Edit Filters" on empty / error.</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────
function Playground() {
  const [state, setState] = useState('populated') // 'populated' | 'empty' | 'alert'
  const [note, setNote] = useState(null)
  const matches = state === 'populated' ? MOCK : []
  const error = state === 'alert' ? 'Invalid query, try again.' : undefined

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)' }}>
          state
          <select value={state} onChange={(e) => setState(e.target.value)} style={{ padding: '4px 8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }}>
            <option value="populated">populated (14 → capped at 12, scrolls)</option>
            <option value="empty">empty (no match)</option>
            <option value="alert">alert (error)</option>
          </select>
        </label>
      </div>
      <div style={{ width: 560, maxWidth: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <GlobalSearchResults
          matches={matches}
          error={error}
          onFiltersClick={() => setNote('filters')}
          onMatchClick={(m) => setNote(m.matchId)}
        />
      </div>
      {note && (
        <p style={{ marginTop: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
          {note === 'filters' ? '"Filter More" clicked' : <>Row clicked: <strong style={{ color: 'var(--text-primary)' }}>{note}</strong></>}
        </p>
      )}
    </div>
  )
}

export default function GlobalSearchResultsDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        The global-search results body that fills the <code>GlobalSearchPanel</code> content slot.
        The whole body is <strong>one scroll area</strong> — a dynamic "Best N Matches" header and a
        trailing filter-link scroll <em>with</em> the rows (capped at 12). The filter CTA renders in
        <strong>every</strong> state — <strong>"Filter More"</strong> while showing results,
        <strong>"Edit Filters"</strong> on empty / error (a refine affordance). Three states:
        <code>error</code> → empty (<code>matches</code> empty) → populated. The compact field-lookup
        variant is a separate component — <a href="#comp-FieldSearchResults" style={{ color: 'var(--text-link)', textDecoration: 'underline' }}>FieldSearchResults</a>.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — switch state (populated / empty / alert); scroll to the "Filter More" CTA</h4>
        <Playground />
      </div>
    </div>
  )
}
