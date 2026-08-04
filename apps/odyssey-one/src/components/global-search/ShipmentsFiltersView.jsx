import { useState } from 'react'
import { Info, Copy } from 'lucide-react'
import { GlobalSearchPanel, PillTab, ComboBox, FormField, DatePicker } from '@odyssey/ui'
import { SHIPMENTS_PROGRESSION } from '../../search/shipments/progression'
import { shipmentsSearchAdapter } from '../../search/shipments'
import { formatDateMDY } from '../../lib/dates'

/**
 * ShipmentsFiltersView — the Filters *content* of the GlobalSearch overlay.
 *
 * Renders inside the normalized `<GlobalSearchPanel>` shell (same component as the
 * Results state + Figma) — GlobalSearchPanel owns the card, the header (‹ back · Filters ·
 * × close) and the footer (Save Filters link / Clear all / Show N). This component
 * supplies only the content: the All/Saved tabs + the filter controls.
 *
 * Controls are normalized @odyssey/ui components (S107 spec —
 * docs/superpowers/specs/2026-08-03-filters-view-normalized-controls-design.md),
 * chosen by the attribute's `match` type:
 *   letters → ComboBox (typable select) fed by adapter.getAttributeValues
 *             (mock = distinct-value index; live = [] until the values endpoint
 *             exists — free text still commits)
 *   digits/both → FormField
 *   date    → TWO DatePickers per attribute: single ("Pickup Date") + range
 *             ("Pickup Date Range"), mirroring the search bar's plain + Range
 *             chip pairing (user ruling, 2026-08-03)
 *   enum    → multi-select tag chips; value packs as a comma list ("TL,LTL"),
 *             which the chip layer already treats as a GS-12 IN-list — the
 *             chip visual stays app-local pending Efrain's FilterChip master
 *
 * Filter-state keys: `<attr.key>` for every control EXCEPT the date range,
 * which owns `<attr.key>-range` (single date = ISO "YYYY-MM-DD", range =
 * ISO "from|to"). The committed searchbar chips pre-fill the matching
 * controls; "Save Filters" persists the current set as a local profile
 * (local-only — no persistence yet).
 */

// Seed list for the Saved tab (mirrors the old FilterPanel's sample queries).
// Clicking a row APPLIES its query to the search bar (replaces the chips).
const INITIAL_SAVED = [
  { name: 'Review Shipments -- West Coast', query: 'mode:LTL shipment-status:Review destination:CA' },
  { name: 'Sent Tenders -- JBHT', query: 'scac:JBHT tender-status:Sent' },
  { name: 'TL Shipments -- G2O Tech', query: 'mode:TL customer-name:G2O' },
  { name: 'Done -- Dallas Origin', query: 'origin:Dallas shipment-status:Done' },
  { name: 'Early-April Pickups -- FXFE', query: 'scac:FXFE pickup-date-range:2026-04-01|2026-04-15' },
]

// ── ISO ⇄ M/D/YYYY ⇄ Date conversions (filters state is ISO) ────────────────
const mdyToIso = (s) => {
  const m = String(s ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : ''
}
const isoToMdy = (s) => {
  const m = String(s ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? formatDateMDY(m[2], m[3], m[1]) : null
}
const isoToDate = (s) => {
  const m = String(s ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null
}
const dateToIso = (d) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : ''

// Map committed chips → initial filter values. Date chips (Case 12) route by
// their `single` flag: a single-date chip fills `<key>` (one ISO day), a range
// chip fills `<key>-range` ("from|to"). Invalid date chips fill nothing.
export function chipsToFilters(chips) {
  const f = {}
  chips.forEach((c) => {
    if (c.kind === 'date-range') {
      if (c.invalid) return
      const attrKey = c.key.replace(/^date(-range)?-/, '')
      if (c.single) {
        const day = mdyToIso(c.from)
        if (day) f[attrKey] = day
      } else {
        const from = mdyToIso(c.from)
        const to = mdyToIso(c.to)
        if (from || to) f[`${attrKey}-range`] = `${from}|${to}`
      }
    } else if (c.queryValue) {
      f[c.key] = c.queryValue
    }
  })
  return f
}

// ── Outbound direction: filter values → committed chips ─────────────────────
const ATTR_BY_KEY = new Map(
  SHIPMENTS_PROGRESSION.flatMap((g) => g.attributes.map((a) => [a.key, { ...a, group: g.group }])),
)
// A filter key is `<attr.key>` or, for the date-range control, `<attr.key>-range`.
const baseAttrKey = (key) => (key.endsWith('-range') ? key.slice(0, -'-range'.length) : key)
// The filter key a committed chip belongs to (inverse of the above).
const chipFilterKey = (c) => {
  if (c.kind !== 'date-range') return c.key
  const attrKey = c.key.replace(/^date(-range)?-/, '')
  return c.single ? attrKey : `${attrKey}-range`
}

/**
 * Merge edited filter values back into a chip set. Keys PRESENT in `filters`
 * are authoritative for their control (empty value = remove the chip); keys
 * never touched keep their existing chips untouched — which also preserves
 * set/date chip metadata when the value didn't change. Date attributes build
 * `kind: 'date-range'` chips: `<key>` → a single-date chip, `<key>-range` → a
 * range chip (ISO → M/D/YYYY bounds).
 */
export function mergeFiltersIntoChips(chips, filters) {
  const next = [...chips]
  for (const [key, value] of Object.entries(filters)) {
    const isRange = key.endsWith('-range')
    const attr = ATTR_BY_KEY.get(baseAttrKey(key))
    if (!attr || (isRange && attr.match !== 'date')) continue
    const ix = next.findIndex((c) => chipFilterKey(c) === key)
    const existing = ix >= 0 ? next[ix] : null
    if (attr.match === 'date') {
      const base = {
        attrLabel: attr.label, dataKey: attr.dataKey, group: attr.group,
        kind: 'date-range', open: false,
      }
      let chip
      if (isRange) {
        const [fromIso = '', toIso = ''] = String(value || '').split('|')
        const from = isoToMdy(fromIso)
        const to = isoToMdy(toIso)
        if (!from && !to) { if (existing) next.splice(ix, 1); continue }
        const sameFrom = (existing?.from ?? null) === (from ?? null)
        const sameTo = (existing?.to ?? null) === (to ?? null)
        if (existing?.kind === 'date-range' && !existing.single && sameFrom && sameTo) continue
        chip = { ...base, key: `date-range-${baseAttrKey(key)}`, single: false, from, to }
        chip.label = `${attr.label} Range: ${from || ''}-${to || ''}`
      } else {
        const from = isoToMdy(value)
        if (!from) { if (existing) next.splice(ix, 1); continue }
        if (existing?.kind === 'date-range' && existing.single && existing.from === from) continue
        chip = { ...base, key: `date-${key}`, single: true, from, to: null }
        chip.label = `${attr.label}: ${from}`
      }
      if (existing) next[ix] = chip; else next.push(chip)
    } else {
      const v = String(value || '').trim()
      if (!v) { if (existing) next.splice(ix, 1); continue }
      if (existing && existing.queryValue === v) continue
      const chip = {
        key, label: `${attr.label}: ${v}`, attrLabel: attr.label, queryValue: v,
        dataKey: attr.dataKey, group: attr.group, ...(attr.exact && { exact: true }), kind: 'attribute',
      }
      if (existing) next[ix] = chip; else next.push(chip)
    }
  }
  return next
}

// A saved profile's query string ("scac:JBHT tender-status:Sent") → filters.
// `-range` keys are legal only on date attributes.
export function queryStringToFilters(query) {
  const f = {}
  String(query || '').split(/\s+/).forEach((tok) => {
    const i = tok.indexOf(':')
    if (i <= 0) return
    const key = tok.slice(0, i)
    const attr = ATTR_BY_KEY.get(baseAttrKey(key))
    if (!attr || (key.endsWith('-range') && attr.match !== 'date')) return
    f[key] = tok.slice(i + 1)
  })
  return f
}

function SectionHeader({ children }) {
  return <div className="shipments-filters__section-title text-label-sm-semibold">{children}</div>
}

function FieldLabel({ label, info = false }) {
  return (
    <label className="shipments-filters__label text-label-xs-medium">
      {label}
      {info && <Info size={14} style={{ color: 'var(--text-placeholder)' }} />}
    </label>
  )
}

// Multi-select tag chips (enum attrs). Value packs as a comma list in catalog
// order — the chip layer reads it as a GS-12 IN-list. App-local visual pending
// Efrain's FilterChip master.
function EnumChips({ attr, value, onChange }) {
  const selected = new Set(value ? value.split(',') : [])
  const toggle = (v) => {
    if (selected.has(v)) selected.delete(v)
    else selected.add(v)
    onChange(attr.values.filter((x) => selected.has(x)).join(','))
  }
  return (
    <div className="shipments-filters__chips">
      {attr.values.map((v) => (
        <button
          key={v}
          type="button"
          className={`shipments-filters__chip text-label-xs-medium${selected.has(v) ? ' is-selected' : ''}`}
          aria-pressed={selected.has(v)}
          onClick={() => toggle(v)}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

// letters attrs — typable select; suggestions come from the adapter (mock =
// distinct-value index, live = none — S107 addendum). Free-typed text IS a
// legal filter. Live mode has NO suggestion source (`getAttributeValues` is
// `null`): omit every typeahead prop so the ComboBox falls back to a plain
// field instead of showing the "No matching values" empty panel, which reads
// as "this value doesn't exist" rather than "no suggestions available yet."
function ValueComboBox({ attr, value, onChange }) {
  const hasSuggestions = !!shipmentsSearchAdapter.getAttributeValues
  return (
    <ComboBox
      variant="select"
      placeholder={`Select ${attr.label}`}
      value={value}
      onChange={onChange}
      {...(hasSuggestions && {
        onSelect: (v) => onChange(v || ''),
        loadOptions: (q) => shipmentsSearchAdapter.getAttributeValues(attr.dataKey, q),
        emptyMessage: 'No matching values',
      })}
    />
  )
}

function renderControl(attr, value, onChange) {
  if (attr.match === 'enum') return <EnumChips attr={attr} value={value} onChange={onChange} />
  if (attr.match === 'letters') return <ValueComboBox attr={attr} value={value} onChange={onChange} />
  return (
    <FormField
      showLabel={false}
      placeholder={`Enter ${attr.label}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

// One date attribute renders TWO fields — single + range — mirroring the
// search bar's plain/Range chip pairing. Split into two builders (S107
// addendum) so Schedule & Appointments can lay them out as two PAIRED rows
// (all singles, then all ranges) instead of vertically per attribute.
function dateSingleField(attr, filters, setFilter) {
  return (
    <div key={attr.key} className="shipments-filters__field">
      <FieldLabel label={attr.label} />
      <DatePicker
        value={isoToDate(filters[attr.key])}
        onChange={(d) => setFilter(attr.key, dateToIso(d))}
      />
    </div>
  )
}
function dateRangeField(attr, filters, setFilter) {
  const rangeKey = `${attr.key}-range`
  const [fromIso = '', toIso = ''] = (filters[rangeKey] || '').split('|')
  return (
    <div key={rangeKey} className="shipments-filters__field">
      <FieldLabel label={`${attr.label} Range`} />
      <DatePicker
        mode="range"
        value={{ start: isoToDate(fromIso), end: isoToDate(toIso) }}
        onChange={(r) => {
          const from = dateToIso(r?.start)
          const to = dateToIso(r?.end)
          setFilter(rangeKey, from || to ? `${from}|${to}` : '')
        }}
      />
    </div>
  )
}

// Section-level field, unwrapped from the two-column-pairs special cases below.
function plainField(attr, filters, setFilter) {
  return (
    <div key={attr.key} className="shipments-filters__field">
      <FieldLabel label={attr.label} info={attr.match === 'letters'} />
      {renderControl(attr, filters[attr.key] || '', (v) => setFilter(attr.key, v))}
    </div>
  )
}

// Group body layout (S107 addendum, user ruling 2026-08-03):
//   Schedule & Appointments — singles row (Pickup Date + Delivery Date side
//     by side), then a ranges row (their Range twins side by side).
//   Customers & Parties     — all fields in a two-column grid.
//   everything else         — unchanged single column.
function renderGroupBody(group, filters, setFilter) {
  if (group.group === 'Schedule & Appointments') {
    return (
      <>
        <div className="shipments-filters__grid-2">
          {group.attributes.map((attr) => dateSingleField(attr, filters, setFilter))}
        </div>
        <div className="shipments-filters__grid-2">
          {group.attributes.map((attr) => dateRangeField(attr, filters, setFilter))}
        </div>
      </>
    )
  }
  if (group.group === 'Customers & Parties') {
    return (
      <div className="shipments-filters__grid-2">
        {group.attributes.map((attr) => plainField(attr, filters, setFilter))}
      </div>
    )
  }
  return group.attributes.flatMap((attr) =>
    attr.match === 'date'
      ? [dateSingleField(attr, filters, setFilter), dateRangeField(attr, filters, setFilter)]
      : [plainField(attr, filters, setFilter)],
  )
}

export default function ShipmentsFiltersView({
  chips = [],
  resultTotal = 0,
  onBack,
  onClose,
  onClearAll,
  // Outbound wiring: (filters, { commit, replace }) — "Show N results" commits
  // the edited filters; clicking a Saved profile replaces the bar with it.
  onApplyFilters,
}) {
  const [activeTab, setActiveTab] = useState('all')
  const [filters, setFilters] = useState(() => chipsToFilters(chips))
  const [saved, setSaved] = useState(INITIAL_SAVED)

  const setFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val }))
  const activeCount = Object.values(filters).filter(Boolean).length

  const handleSaveFilters = () => {
    const summary = Object.entries(filters)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}:${v}`)
      .join(' ')
    if (!summary) return
    setSaved((s) => [{ name: `Saved Filter ${s.length + 1}`, query: summary }, ...s])
    setActiveTab('saved')
  }

  const tabs = [
    { key: 'all', label: 'All', count: activeCount },
    { key: 'saved', label: 'Saved', count: saved.length },
  ]

  return (
    <GlobalSearchPanel
      className="global-search-panel--filters"
      showHeader
      showBack
      title="Filters"
      onBack={onBack}
      onClose={onClose}
      showLink={activeTab === 'all'}
      linkLabel="Save Filters"
      onLink={handleSaveFilters}
      showSecondary={activeTab !== 'all'}
      showTrailSecondary={activeTab === 'all'}
      secondaryLabel="Clear all"
      onClear={onClearAll}
      count={resultTotal}
      onShowResults={() => onApplyFilters?.(filters, { commit: true })}
    >
      <div className="shipments-filters__tabs">
        {tabs.map((tab) => (
          <PillTab
            key={tab.key}
            label={tab.label}
            count={tab.count}
            selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          />
        ))}
      </div>

      <div className="shipments-filters__body">
        {activeTab === 'all' ? (
          SHIPMENTS_PROGRESSION.map((group) => (
            <div key={group.group} className="shipments-filters__section">
              <SectionHeader>{group.group}</SectionHeader>
              {renderGroupBody(group, filters, setFilter)}
            </div>
          ))
        ) : (
          <div className="shipments-filters__saved">
            {saved.map((sq) => (
              // The row itself applies the profile: its query replaces the
              // bar's chips (a saved profile IS a whole search).
              <div
                key={sq.name}
                className="shipments-filters__saved-row"
                role="button"
                tabIndex={0}
                onClick={() => onApplyFilters?.(queryStringToFilters(sq.query), { replace: true })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onApplyFilters?.(queryStringToFilters(sq.query), { replace: true })
                }}
              >
                <div className="shipments-filters__saved-name text-label-sm-medium">{sq.name}</div>
                <div className="shipments-filters__saved-query">{sq.query}</div>
                <button
                  type="button"
                  className="shipments-filters__icon-btn"
                  aria-label="Copy query"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Copy size={16} style={{ color: 'var(--text-tertiary)' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlobalSearchPanel>
  )
}
