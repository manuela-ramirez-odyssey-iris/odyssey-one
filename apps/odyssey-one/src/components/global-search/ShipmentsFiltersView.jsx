import { useState } from 'react'
import { ChevronDown, Info, Copy } from 'lucide-react'
import { GlobalSearchPanel, PillTab } from '@odyssey/ui'
import { SHIPMENTS_PROGRESSION } from '../../search/shipments/progression'

/**
 * ShipmentsFiltersView — the Filters *content* of the GlobalSearch overlay.
 *
 * Renders inside the normalized `<GlobalSearchPanel>` shell (same component as the
 * Results state + Figma) — GlobalSearchPanel owns the card, the header (‹ back · Filters ·
 * × close) and the footer (Save Filters link / Clear all / Show N). This component
 * supplies only the content: the All/Saved tabs + the filter controls. Swaps in over
 * the Results state when "All Filters" is clicked (back-arrow returns to results).
 * The controls are still PROTOTYPE stubs (app-local) pending the normalized
 * Select / FilterChip / SavedFilterRow.
 * Built from the shipments progression taxonomy: each attribute renders by its
 * `match` type — enum → selectable chips, date → date range, letters → dropdown
 * stub, digits → text input. The committed searchbar chips pre-fill the matching
 * controls; "Save Filters" persists the current set as a local profile.
 *
 * Known stubs (to replace once the dependencies land):
 *  - Dropdown controls are placeholder buttons — pending the normalized Dropdown
 *    component.
 *  - Saved profiles + Save Filters are local-only (no persistence).
 *  - Enum chips are single-select for now (multi-select is a later pass).
 */

// Seed list for the Saved tab (mirrors the old FilterPanel's sample queries).
// Clicking a row APPLIES its query to the search bar (replaces the chips).
const INITIAL_SAVED = [
  { name: 'Review Shipments -- West Coast', query: 'mode:LTL shipment-status:Review destination:CA' },
  { name: 'Sent Tenders -- JBHT', query: 'scac:JBHT tender-status:Sent' },
  { name: 'TL Shipments -- G2O Tech', query: 'mode:TL customer-name:G2O' },
  { name: 'Done -- Dallas Origin', query: 'origin:Dallas shipment-status:Done' },
  { name: 'Early-April Pickups -- FXFE', query: 'scac:FXFE pickup-date:2026-04-01|2026-04-15' },
]

// Map committed chips → initial filter values, keyed by attribute key.
// Date chips (Case 12) carry from/to instead of queryValue: they land in the
// matching date-range control as "from|to" (ISO, for the native date inputs);
// a single-date chip fills both ends with its one day.
const mdyToIso = (s) => {
  const m = String(s ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : ''
}
export function chipsToFilters(chips) {
  const f = {}
  chips.forEach((c) => {
    if (c.kind === 'date-range') {
      const attrKey = c.key.replace(/^date(-range)?-/, '')
      const from = mdyToIso(c.from)
      const to = mdyToIso(c.single ? c.from : c.to)
      if (from || to) f[attrKey] = `${from}|${to}`
    } else if (c.queryValue) {
      f[c.key] = c.queryValue
    }
  })
  return f
}

// ── Outbound direction: filter values → committed chips ─────────────────────
const isoToMdy = (s) => {
  const m = String(s ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${+m[2]}/${+m[3]}/${m[1]}` : null
}
const ATTR_BY_KEY = new Map(
  SHIPMENTS_PROGRESSION.flatMap((g) => g.attributes.map((a) => [a.key, { ...a, group: g.group }])),
)
const chipAttrKey = (c) => (c.kind === 'date-range' ? c.key.replace(/^date(-range)?-/, '') : c.key)

/**
 * Merge edited filter values back into a chip set. Keys PRESENT in `filters`
 * are authoritative for their attribute (empty value = remove the chip); keys
 * never touched keep their existing chips untouched — which also preserves
 * set/date chip metadata when the value didn't change. Date attributes build
 * `kind: 'date-range'` chips (ISO "from|to" → M/D/YYYY bounds).
 */
export function mergeFiltersIntoChips(chips, filters) {
  const next = [...chips]
  for (const [key, value] of Object.entries(filters)) {
    const attr = ATTR_BY_KEY.get(key)
    if (!attr) continue
    const ix = next.findIndex((c) => chipAttrKey(c) === key)
    const existing = ix >= 0 ? next[ix] : null
    if (attr.match === 'date') {
      const [fromIso = '', toIso = ''] = String(value || '').split('|')
      const from = isoToMdy(fromIso)
      const to = isoToMdy(toIso)
      if (!from && !to) { if (existing) next.splice(ix, 1); continue }
      const sameFrom = (existing?.from ?? null) === (from ?? null)
      const sameTo = ((existing?.single ? existing?.from : existing?.to) ?? null) === (to ?? null)
      if (existing?.kind === 'date-range' && sameFrom && sameTo) continue
      const chip = {
        key: `date-range-${key}`, attrLabel: attr.label, dataKey: attr.dataKey, group: attr.group,
        kind: 'date-range', single: false, from, to, open: false,
      }
      chip.label = `${attr.label} Range: ${from || ''}-${to || ''}`
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
export function queryStringToFilters(query) {
  const f = {}
  String(query || '').split(/\s+/).forEach((tok) => {
    const i = tok.indexOf(':')
    if (i <= 0) return
    const key = tok.slice(0, i)
    if (ATTR_BY_KEY.has(key)) f[key] = tok.slice(i + 1)
  })
  return f
}

function SectionHeader({ children }) {
  return <div className="shipments-filters__section-title text-label-sm-semibold">{children}</div>
}

function FieldLabel({ attr }) {
  return (
    <label className="shipments-filters__label text-label-xs-medium">
      {attr.label}
      {attr.match === 'letters' && <Info size={14} style={{ color: 'var(--text-placeholder)' }} />}
    </label>
  )
}

function EnumChips({ attr, value, onChange }) {
  return (
    <div className="shipments-filters__chips">
      {attr.values.map((v) => {
        const selected = value === v
        return (
          <button
            key={v}
            type="button"
            className={`shipments-filters__chip text-label-xs-medium${selected ? ' is-selected' : ''}`}
            onClick={() => onChange(selected ? '' : v)}
          >
            {v}
          </button>
        )
      })}
    </div>
  )
}

// Placeholder for the normalized Dropdown (dependency). Visual only for now.
function DropdownStub({ attr, value }) {
  return (
    <button type="button" className="shipments-filters__dropdown">
      <span className={value ? '' : 'shipments-filters__dropdown-placeholder'}>
        {value || `Select ${attr.label}`}
      </span>
      <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />
    </button>
  )
}

function TextField({ attr, value, onChange }) {
  return (
    <input
      type="text"
      className="shipments-filters__input"
      value={value}
      placeholder={`Enter ${attr.label}`}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function DateRange({ attr, value, onChange }) {
  // value packed as "from|to" for the prototype.
  const [from = '', to = ''] = (value || '').split('|')
  const set = (f, t) => onChange(`${f}|${t}`)
  return (
    <div className="shipments-filters__daterange">
      <input type="date" className="shipments-filters__input" value={from} onChange={(e) => set(e.target.value, to)} />
      <span className="shipments-filters__daterange-sep">to</span>
      <input type="date" className="shipments-filters__input" value={to} onChange={(e) => set(from, e.target.value)} />
    </div>
  )
}

function renderControl(attr, value, onChange) {
  if (attr.match === 'enum') return <EnumChips attr={attr} value={value} onChange={onChange} />
  if (attr.match === 'date') return <DateRange attr={attr} value={value} onChange={onChange} />
  if (attr.match === 'letters') return <DropdownStub attr={attr} value={value} />
  return <TextField attr={attr} value={value} onChange={onChange} />
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
              {group.attributes.map((attr) => (
                <div key={attr.key} className="shipments-filters__field">
                  <FieldLabel attr={attr} />
                  {renderControl(attr, filters[attr.key] || '', (v) => setFilter(attr.key, v))}
                </div>
              ))}
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
