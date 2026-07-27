import { useState, useMemo } from 'react'
import { ComboBox, FieldSearchResults } from '@odyssey/ui'

export const meta = {
  name: 'ComboBox',
  tier: 'organism',
  version: '0.8.0',
  createdVersion: '0.2.0',
  figmaNode: '4715:6142',
  codeConnect: 'packages/ui/src/ComboBox.figma.tsx',
  normalizing: true,
}

export const props = [
  { name: 'value', type: 'string', desc: 'Controlled input value.' },
  { name: 'onChange', type: '(value: string) => void', desc: 'Called on every keystroke.' },
  { name: 'placeholder', type: 'string', desc: "Input placeholder text (editable per instance). Variant-aware default: 'Search' (search face) / 'Select' (select face)." },
  { name: 'onClear', type: '() => void', desc: 'When provided + value is non-empty, shows a CircleX clear button that calls this on click.' },
  { name: 'variant', type: "'search' | 'select'", desc: "Figma `Variant`. 'search' (default) = leading Search icon, no chevron — byte-identical to the former SearchField. 'select' = no leading icon; trailing ChevronDown (20px) that focuses the input on click, opens the typeahead popover when options/loadOptions are present, and rotates 180° while open." },
  { name: 'showLabel', type: 'boolean', desc: 'Render a label row above the input bar. Default false.' },
  { name: 'label', type: 'string', desc: "Label text (only shown when showLabel=true). Default 'Label'." },
  { name: 'showInfoIcon', type: 'boolean', desc: 'Append an Info icon to the label row. Default false.' },
  { name: 'onInfoClick', type: '() => void', desc: 'When provided the Info icon becomes a clickable button; otherwise it is decorative.' },
  { name: 'results', type: 'ReactNode', desc: 'Content slot — rendered below the input. Wins over typeahead popover if passed alongside options/loadOptions.' },
  { name: 'options', type: '{ value, label }[] | string[]', desc: 'Typeahead: static option list. Filtered synchronously (case-insensitive substring).' },
  { name: 'loadOptions', type: '(query, skip?) => Promise<Option[] | { options, total }>', desc: 'Typeahead: async loader. Debounced 200ms, stale-response guarded. Resolve { options, total } for paged mode: scrolling near the list end lazily fetches the next page (skip = accumulated count) until total is reached. Plain array = legacy single-shot.' },
  { name: 'onSelect', type: '(value: string | null) => void', desc: 'Typeahead: fired with the selected option value, or null on clear.' },
  { name: 'emptyMessage', type: 'string', desc: "Typeahead: shown when filter matches nothing. Default 'No options'." },
  { name: 'filter', type: '(inputText, option) => bool', desc: 'Typeahead: custom filter fn. Default case-insensitive substring.' },
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

// ── Shared helpers ───────────────────────────────────────────────────────────

function TierBadge({ tier }) {
  return (
    <span style={{ display: 'inline-block', padding: '0 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: '11px', fontWeight: 'var(--font-weight-medium)', whiteSpace: 'nowrap' }}>{tier}</span>
  )
}
function ChildLink({ to, children }) {
  return <a href={`#comp-${to}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-link)', textDecoration: 'underline', fontWeight: 'var(--font-weight-semibold)', whiteSpace: 'nowrap' }}>{children}</a>
}
function LegendRow({ part, tier, nested = false, depth, children }) {
  // depth: explicit nesting level (1 = nested, 2 = nested-in-nested); `nested` = depth 1.
  const level = depth ?? (nested ? 1 : 0)
  const cell = { padding: 'var(--spacing-2) 0', borderBottom: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }
  return (
    <li style={{ display: 'contents' }}>
      <span style={{ ...cell, display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', whiteSpace: 'nowrap', paddingLeft: level ? `calc(var(--spacing-6) * ${level})` : 0, color: 'var(--text-primary)', fontWeight: level ? 'var(--font-weight-medium)' : 'var(--font-weight-semibold)' }}>
        {level > 0 && <span style={{ color: 'var(--text-tertiary)' }} aria-hidden="true">└</span>}
        {part}{tier && <TierBadge tier={tier} />}
      </span>
      <span style={{ ...cell, color: 'var(--text-secondary)' }}>{children}</span>
    </li>
  )
}

// ── Section A — Slot (base) schematic ────────────────────────────────────────

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

function SlotSchematic() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-8)', alignItems: 'flex-start', background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ flex: '1 1 380px', minWidth: 320 }}>
        <ComboBox showLabel label="Location" showInfoIcon value="" onChange={() => {}} results={<SlotPlaceholder />} />
      </div>
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="root" tier="organism">Search input + optional results-dropdown slot below it.</LegendRow>
        <LegendRow part="label + info" nested>Optional label row (<code>showLabel</code>) with an info glyph (<code>showInfoIcon</code>).</LegendRow>
        <LegendRow part="input bar" nested>Search icon + text input + optional clear <code>X</code>; border steps 1px → 2px on focus.</LegendRow>
        <LegendRow part="Slot"><strong style={{ color: SLOT_TEXT }}>The pink region</strong> — the <code>results</code> slot, a <strong>transparent passthrough</strong>. The content brings its own card (e.g. <ChildLink to="FieldSearchResults">FieldSearchResults</ChildLink> = white bg, <code>radius-md</code>, <code>shadow-2xl</code>). Wins over the typeahead popover when passed alongside <code>options</code>/<code>loadOptions</code>.</LegendRow>
      </ul>
    </div>
  )
}

// ── Section A — Slot playground (base mode) ──────────────────────────────────

const LOCATIONS = [
  { matchId: '61-CU0000010352', customer: 'HERCULES CHILE LIMITADA', address: '1481 Dr. Carlos Charlin, 7500511 Providencia, Región Metropolitana, Chile', iconType: 'container' },
  { matchId: '61-CU0000010419', customer: 'Delaware Inc.', address: '200 W Madison St, Chicago, IL 60606, USA', iconType: 'package' },
  { matchId: '61-CU0000010488', customer: 'Pacific Cargo Group', address: '4200 W Valley Blvd, Los Angeles, CA 90032, USA', iconType: 'handshake' },
  { matchId: '61-CU0000010512', customer: 'Kemira Americas', address: '90 State St, Albany, NY 12207, USA', iconType: 'container' },
]

function Toggle({ label, value, set }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  )
}

function SlotPlayground() {
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
        <ComboBox
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

// ── Section B — Typeahead playground ─────────────────────────────────────────

const inputStyle = { padding: '4px 8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }
const labelStyle = { display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-primary)', color: 'var(--text-primary)' }

const SIZES = [
  { label: '10',   count: 10 },
  { label: '100',  count: 100 },
  { label: '1k',   count: 1000 },
  { label: '10k',  count: 10000 },
]

const FRUITS = [
  'Apple', 'Apricot', 'Avocado', 'Banana', 'Blackberry', 'Blueberry', 'Cherry', 'Clementine',
  'Coconut', 'Cranberry', 'Date', 'Dragonfruit', 'Elderberry', 'Fig', 'Grape', 'Grapefruit',
  'Guava', 'Jackfruit', 'Kiwi', 'Kumquat', 'Lemon', 'Lime', 'Lychee', 'Mango', 'Melon',
  'Nectarine', 'Orange', 'Papaya', 'Passionfruit', 'Peach', 'Pear', 'Pineapple', 'Plum',
  'Pomegranate', 'Raspberry', 'Starfruit', 'Strawberry', 'Tangerine', 'Watermelon',
]

function makeOptions(count) {
  const opts = []
  for (let i = 0; i < count; i++) {
    const fruit = FRUITS[i % FRUITS.length]
    const suffix = Math.floor(i / FRUITS.length)
    const label = suffix === 0 ? fruit : `${fruit} ${suffix + 1}`
    opts.push({ value: `${fruit.toLowerCase()}-${i}`, label })
  }
  return opts
}

function TypeaheadPlayground() {
  const [sizeIdx, setSizeIdx] = useState(0)
  const [source, setSource] = useState('static') // 'static' | 'async'
  const [value, setValue] = useState(null)
  const [variant, setVariant] = useState('search') // 'search' | 'select'

  const staticOptions = useMemo(() => makeOptions(SIZES[sizeIdx].count), [sizeIdx])

  const [chunk, setChunk] = useState(20)

  // ponytail: inline loadOptions — no abstraction needed for a single demo case
  const loadOptions = useMemo(() => {
    if (source === 'async')
      // Paged like the API source: one `chunk`-sized slice per call after a 300ms delay.
      return (query, skip = 0) =>
        new Promise((resolve) => {
          setTimeout(() => {
            const q = query.toLowerCase()
            const filtered = staticOptions.filter((o) => o.label.toLowerCase().includes(q))
            resolve({ options: filtered.slice(skip, skip + chunk), total: filtered.length })
          }, 300)
        })
    if (source === 'api')
      // Real paged API: dummyjson products search, ONE `chunk`-sized page per call.
      // Returning { options, total } puts ComboBox in paged mode — scrolling the
      // results near the end lazily fetches the next page (infinite scroll).
      return async (query, skip = 0) => {
        const res = await fetch(
          `https://dummyjson.com/products/search?q=${encodeURIComponent(query)}&limit=${chunk}&skip=${skip}`,
        )
        const { products, total } = await res.json()
        return {
          options: products.map((p) => ({ value: String(p.id), label: p.title })),
          total,
        }
      }
    return undefined
  }, [source, staticOptions, chunk])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      {/* Controls */}
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={labelStyle}>
          Options size
          <select value={sizeIdx} onChange={(e) => { setSizeIdx(Number(e.target.value)); setValue(null) }} style={inputStyle}>
            {SIZES.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Source
          <select value={source} onChange={(e) => { setSource(e.target.value); setValue(null) }} style={inputStyle}>
            <option value="static">Static options</option>
            <option value="async">Async paged (300ms)</option>
            <option value="api">API (dummyjson products)</option>
          </select>
        </label>
        <label style={labelStyle}>
          Variant
          <select value={variant} onChange={(e) => setVariant(e.target.value)} style={inputStyle}>
            <option value="search">Search (leading icon)</option>
            <option value="select">Select (trailing chevron)</option>
          </select>
        </label>
        {source !== 'static' && (
          <label style={labelStyle}>
            Chunk size (limit)
            <select value={chunk} onChange={(e) => setChunk(Number(e.target.value))} style={inputStyle}>
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-primary)', color: 'var(--text-secondary)' }}>
          <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-primary)' }}>Selected value</span>
          <code style={{ background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', whiteSpace: 'nowrap' }}>{value ?? '—'}</code>
        </div>
      </div>

      {/* ComboBox in typeahead mode + anatomy legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-8)', alignItems: 'flex-start', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-6)', minHeight: 400 }}>
        <div style={{ flex: '1 1 340px', minWidth: 280 }}>
          <ComboBox
            id="ds-sf-typeahead-playground"
            label="Fruit"
            showLabel
            variant={variant}
            placeholder="Type to filter…"
            options={source === 'static' ? staticOptions : undefined}
            loadOptions={source !== 'static' ? loadOptions : undefined}
            onSelect={setValue}
            emptyMessage={source === 'api' ? 'No matching products' : 'No matching fruits'}
          />
          <p style={{ marginTop: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-primary)' }}>
            ↑ ↓ navigate · Enter select · Esc close
          </p>
        </div>
        <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
          <LegendRow part="typeahead mode">Activated by passing <code>options</code> or <code>loadOptions</code>. No separate Autocomplete component.</LegendRow>
          <LegendRow part="variant" nested><code>search</code> (default, leading icon) vs <code>select</code> (no leading icon, trailing 20px ChevronDown — click focuses the input and opens the popover; rotates 180° while open).</LegendRow>
          <LegendRow part="useFieldPopover" nested>Manages open/close lifecycle — focus opens, blur/click-outside closes, Tab/Esc/Enter handled.</LegendRow>
          <LegendRow part="FieldSearchResults" tier="organism" nested>Renders ALL panel states (loading / empty / populated) — same card chrome as slot mode. Owns virtualization internally (@tanstack/react-virtual, ~320px max panel) for 10k+ options.</LegendRow>
          <LegendRow part="MatchSimpleRow" tier="molecule" depth={2}>Each row, nested inside <ChildLink to="FieldSearchResults">FieldSearchResults</ChildLink>. <strong>Typeahead default is the compact row</strong>: <code>showAvatar</code> + <code>showInfo</code> are OFF (label line only) — pass <code>rowProps</code> to re-enable. Keyboard highlight via <code>is-active</code>; <code>aria-selected</code> + <code>aria-activedescendant</code> on the input.</LegendRow>
        </ul>
      </div>
    </div>
  )
}

// ── Demo root ────────────────────────────────────────────────────────────────

export default function ComboBoxDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        <strong>ComboBox</strong> (former SearchField) — light-surface search/select input. Two modes:{' '}
        <strong>slot mode</strong> (pass <code>results</code> — transparent passthrough, content supplies
        its own card chrome) and <strong>typeahead mode</strong> (pass <code>options</code> or{' '}
        <code>loadOptions</code> — built-in virtualised popover with keyboard nav, absorbed from the
        former Autocomplete composite). With no typeahead props, behaviour is byte-identical to before.
        The <code>variant</code> prop (<code>search</code> default | <code>select</code>) swaps the
        leading Search icon for a trailing chevron — see the Typeahead playground below.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — slot anatomy</h4>
        <SlotSchematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — slot mode (results = FieldSearchResults)</h4>
        <SlotPlayground />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Typeahead — anatomy + playground (options size · static/async · live value readout)</h4>
        <TypeaheadPlayground />
      </div>
    </div>
  )
}
