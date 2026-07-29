import { useState } from 'react'
import { FieldSearchResults } from '@odyssey/ui'

export const meta = {
  name: 'FieldSearchResults',
  tier: 'organism',
  version: '0.8.0',
  createdVersion: '0.6.0',
  figmaNode: '3170:2989',
  codeConnect: 'packages/ui/src/FieldSearchResults.figma.tsx',
  // Demoted back to NORMALIZING (S89): added the additive `maxHeight` prop
  // (default 320 preserves prior behavior) so MultiSelect can cap its dropdown
  // to a 4-row viewport. Re-runs GATE B; the Angular twin picks up the delta.
  normalizing: true,
  approved: true,
  ported: true,
}

export const props = [
  { name: 'matches', type: 'Array<MatchSimpleRow props>', desc: 'MatchSimpleRow data objects ({ matchId, customer, address, icon, id }). Empty [] → the no-match state.' },
  { name: 'maxHeight', type: 'number', desc: 'Scroll-viewport cap in px (default 320). MultiSelect passes 4*56 to show a 4-row dropdown.' },
  { name: 'emptyMessage', type: 'string', desc: "Centered muted message when matches is empty (Figma SearchNoMatch). Default 'No matching locations found.'." },
  { name: 'error', type: 'string', desc: 'When set, renders a centered red alert message instead of rows/empty (Figma SearchAlert). Highest precedence.' },
  { name: 'onMatchClick', type: '(match) => void', desc: 'Shared row click handler; overrides individual row onClick when provided. Also adds role="listbox" to the container.' },
  { name: 'activeIndex', type: 'number', desc: 'Index of the highlighted row — gets .is-active + aria-selected=true. Rows get ids `${optionIdPrefix}-option-${i}`.' },
  { name: 'optionIdPrefix', type: 'string', desc: 'Prefix for option node ids (used by combobox aria-controls + aria-activedescendant).' },
  { name: 'rowProps', type: 'object', desc: 'Spread onto every MatchSimpleRow (e.g. { showAvatar: false, showInfo: false }).' },
]

export const tokens = [
  { token: '--text-tertiary', resolves: 'DSN/500', usage: 'empty-state message' },
  { token: '--text-error', resolves: 'Bittersweet/600', usage: 'alert-state message' },
  { token: '--spacing-2', resolves: '8px', usage: 'body padding' },
  { token: '--spacing-1', resolves: '4px', usage: 'row gap' },
]

const MOCK = [
  { matchId: '61-CU0000010352', customer: 'HERCULES CHILE LIMITADA', address: '1481 Dr. Carlos Charlin, 7500511 Providencia, Región Metropolitana, Chile', iconType: 'container' },
  { matchId: '61-CU0000010419', customer: 'Delaware Inc.', address: '200 W Madison St, Chicago, IL 60606, USA', iconType: 'package' },
  { matchId: '61-CU0000010488', customer: 'Pacific Cargo Group', address: '4200 W Valley Blvd, Los Angeles, CA 90032, USA', iconType: 'handshake' },
]

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
      <div style={{ flex: '1 1 420px', minWidth: 320 }}>
        <FieldSearchResults matches={MOCK} />
      </div>
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="root" tier="organism">Compact field-lookup results body (typeahead within a form field). Adds <code>role="listbox"</code> when <code>onMatchClick</code> is provided.</LegendRow>
        <LegendRow part={<ChildLink to="MatchSimpleRow">MatchSimpleRow</ChildLink>} tier="molecule" nested>Compact rows (id + customer + address), 4px-gapped. Always virtualized via @tanstack/react-virtual — transparent for small sets.</LegendRow>
        <LegendRow part="empty state" nested>Figma SearchNoMatch — centered <code>emptyMessage</code>, <code>--text-tertiary</code>, when <code>matches</code> is empty.</LegendRow>
        <LegendRow part="alert state" nested>Figma SearchAlert — centered <code>error</code>, <code>--text-error</code>, highest precedence.</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────
function Playground() {
  const [state, setState] = useState('populated') // 'populated' | 'empty' | 'alert'
  const [note, setNote] = useState(null)
  const matches = state === 'populated' ? MOCK : []
  const error = state === 'alert' ? 'Invalid location ID entered. Please check the value and enter the correct location ID' : undefined

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)' }}>
          state
          <select value={state} onChange={(e) => setState(e.target.value)} style={{ padding: '4px 8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }}>
            <option value="populated">populated</option>
            <option value="empty">empty (no match)</option>
            <option value="alert">alert (error)</option>
          </select>
        </label>
      </div>
      <div style={{ width: 460, maxWidth: '100%', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-6)' }}>
        <FieldSearchResults matches={matches} error={error} onMatchClick={(m) => setNote(m.matchId)} />
      </div>
      {note && (
        <p style={{ marginTop: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
          Row clicked: <strong style={{ color: 'var(--text-primary)' }}>{note}</strong>
        </p>
      )}
    </div>
  )
}

export default function FieldSearchResultsDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        The compact results body for a focalized field lookup (a typeahead within a form field):
        a list of compact <code>MatchSimpleRow</code> rows, a centered no-match message when empty,
        and a centered red alert when <code>error</code> is set. Sibling of{' '}
        <a href="#comp-GlobalSearchResults" style={{ color: 'var(--text-link)', textDecoration: 'underline' }}>GlobalSearchResults</a>{' '}
        (global search) — same shape, different intent, so a separate component (they share the row molecule, not the container).
        The populated list is always virtualized via <code>@tanstack/react-virtual</code> — transparent for small sets,
        DOM-bounded for large ones. Pass <code>activeIndex</code> + <code>optionIdPrefix</code> for keyboard navigation
        in a combobox; <code>rowProps</code> spreads onto every row (e.g. <code>{'{ showAvatar: false }'}</code>).
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — switch state (populated / empty / alert)</h4>
        <Playground />
      </div>
    </div>
  )
}
