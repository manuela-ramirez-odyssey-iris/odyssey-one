import { useState } from 'react'
import { SearchField, FieldSearchResults } from '@odyssey/ui'

export const meta = {
  name: 'SearchField',
  tier: 'organism',
  normalizing: true,
  approved: true,
  ported: true,
  figmaNode: '1959:76',
  codeConnect: 'packages/ui/src/SearchField.figma.tsx',
}

export const props = [
  { name: 'value', type: 'string', desc: 'Controlled input value.' },
  { name: 'onChange', type: '(value: string) => void', desc: 'Called on every keystroke.' },
  { name: 'placeholder', type: 'string', desc: "Input placeholder text. Default 'Search'." },
  { name: 'onClear', type: '() => void', desc: 'When provided + value is non-empty, shows a CircleX clear button that calls this on click.' },
  { name: 'showLabel', type: 'boolean', desc: 'Render a label row above the input bar. Default false.' },
  { name: 'label', type: 'string', desc: "Label text (only shown when showLabel=true). Default 'Label'." },
  { name: 'showInfoIcon', type: 'boolean', desc: 'Append an Info icon to the label row. Default false.' },
  { name: 'onInfoClick', type: '() => void', desc: 'When provided the Info icon becomes a clickable button; otherwise it is decorative.' },
  { name: 'results', type: 'ReactNode', desc: 'Content slot (Figma Content SLOT, gated by Show results) — rendered below the input. A transparent passthrough: the content (e.g. <FieldSearchResults>) brings its own card chrome (bg / radius / shadow).' },
  { name: 'className', type: 'string', desc: 'Extra class names forwarded to the root element.' },
]

export const tokens = [
  { token: '--border-default', resolves: 'Border/default', usage: 'idle 1px input border' },
  { token: '--deep-sea-neutral-600', resolves: 'DSN/600', usage: 'focused 2px input border' },
  { token: '--shadow-sm', resolves: 'shadow/sm', usage: 'input bar elevation' },
  { token: '--bg-primary', resolves: 'white', usage: 'input bar background' },
  { token: '--text-placeholder', resolves: 'Text/placeholder', usage: 'Search icon at rest' },
  { token: '--text-secondary', resolves: 'Text/secondary', usage: 'label text' },
]

const LOCATIONS = [
  { matchId: '61-CU0000010352', customer: 'HERCULES CHILE LIMITADA', address: '1481 Dr. Carlos Charlin, 7500511 Providencia, Región Metropolitana, Chile', iconType: 'container' },
  { matchId: '61-CU0000010419', customer: 'Delaware Inc.', address: '200 W Madison St, Chicago, IL 60606, USA', iconType: 'package' },
  { matchId: '61-CU0000010488', customer: 'Pacific Cargo Group', address: '4200 W Valley Blvd, Los Angeles, CA 90032, USA', iconType: 'handshake' },
  { matchId: '61-CU0000010512', customer: 'Kemira Americas', address: '90 State St, Albany, NY 12207, USA', iconType: 'container' },
]

// ── Schematic ───────────────────────────────────────────────────────────────
// Slot-marker pink — a DSM annotation device (NOT a product design token; there is no pink
// in the palette). Kept local so it never reads as a real token. (RightPanel convention.)
const SLOT_BORDER = '#e85aad'
const SLOT_BG = 'rgba(232, 90, 173, 0.07)'
const SLOT_TEXT = '#b03b81'

function SlotPlaceholder() {
  return (
    <div style={{ margin: 'var(--spacing-3)', minHeight: 96, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 'var(--spacing-4)', border: `2px dashed ${SLOT_BORDER}`, borderRadius: 'var(--radius-md)', background: SLOT_BG, color: SLOT_TEXT, fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
      Slot (results)
      <span style={{ fontWeight: 'var(--font-weight-regular)' }}>&lt;FieldSearchResults&gt; renders here</span>
    </div>
  )
}

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
      <div style={{ flex: '1 1 380px', minWidth: 320 }}>
        <SearchField showLabel label="Location" showInfoIcon value="" onChange={() => {}} results={<SlotPlaceholder />} />
      </div>
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="root" tier="organism">A search input plus an optional results-dropdown slot below it.</LegendRow>
        <LegendRow part="label + info" nested>Optional label row (<code>showLabel</code>) with an info glyph (<code>showInfoIcon</code>).</LegendRow>
        <LegendRow part="input bar" nested>Search icon + text input + optional clear <code>X</code>; border steps 1px → 2px on focus.</LegendRow>
        <LegendRow part="Slot"><strong style={{ color: SLOT_TEXT }}>The pink region</strong> — the <code>results</code> slot, a <strong>transparent passthrough</strong>. The content brings its own card (e.g. <ChildLink to="FieldSearchResults">FieldSearchResults</ChildLink> = white bg, <code>radius-md</code>, <code>shadow-2xl</code>).</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────
function Toggle({ label, value, set }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  )
}

function Playground() {
  const [value, setValue] = useState('Chile')
  const [showLabel, setShowLabel] = useState(true)
  const [showInfoIcon, setShowInfoIcon] = useState(true)
  const [simulateError, setSimulateError] = useState(false)

  const q = value.trim().toLowerCase()
  const filtered = q
    ? LOCATIONS.filter((l) => `${l.customer} ${l.matchId} ${l.address}`.toLowerCase().includes(q))
    : []
  const showResults = q.length > 0

  const results = showResults
    ? (
        <FieldSearchResults
          matches={simulateError ? [] : filtered}
          error={simulateError ? 'Invalid query, try again.' : undefined}
          emptyMessage="No matching locations found."
          onMatchClick={(m) => setValue(m.customer)}
        />
      )
    : null

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap' }}>
        <Toggle label="label" value={showLabel} set={setShowLabel} />
        <Toggle label="info icon" value={showInfoIcon} set={setShowInfoIcon} />
        <Toggle label="simulate error" value={simulateError} set={setSimulateError} />
      </div>
      <div style={{ maxWidth: 420 }}>
        {/* Live typeahead: typing filters LOCATIONS into a FieldSearchResults in the results slot. */}
        <SearchField
          value={value}
          onChange={setValue}
          onClear={() => setValue('')}
          placeholder="Search locations…"
          showLabel={showLabel}
          label="Location"
          showInfoIcon={showInfoIcon}
          results={results}
        />
      </div>
      <p style={{ marginTop: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
        Type to filter · clear the field to hide the dropdown · toggle "simulate error" for the alert state.
      </p>
    </div>
  )
}

export default function SearchFieldDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Light-surface search input with an optional results-dropdown <strong>slot</strong> for a
        focalized field lookup. The border steps 1px → 2px on focus; an optional label row (with
        info icon) sits above. The <code>results</code> slot is a transparent passthrough — the
        content supplies its own card chrome, typically a live{' '}
        <a href="#comp-FieldSearchResults" style={{ color: 'var(--text-link)', textDecoration: 'underline' }}>FieldSearchResults</a>{' '}
        (white bg, <code>radius-md</code>, <code>shadow-2xl</code>).
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy &amp; slot</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — live typeahead (results slot = FieldSearchResults)</h4>
        <Playground />
      </div>
    </div>
  )
}
