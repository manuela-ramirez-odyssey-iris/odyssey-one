import { useState } from 'react'
import { ChevronLeft, X, Plus, ChevronDown, Info, Copy } from 'lucide-react'
import { Button } from '@odyssey/ui'
import { ICON_MD, ICON_LG } from '@odyssey/tokens'
import { SHIPMENTS_PROGRESSION } from '../../search/shipments/progression'

/**
 * ShipmentsFiltersView — PROTOTYPE (app-local, not normalized yet).
 *
 * The filters panel that swaps in over ResultsPreview when "All Filters" is
 * clicked in the GlobalSearch results overlay (back-arrow returns to results).
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
const INITIAL_SAVED = [
  { name: 'Review Shipments -- West Coast', query: 'mode:LTL shipment-status:Review destination:CA' },
  { name: 'Sent Tenders -- JBHT', query: 'scac:JBHT tender-status:Sent' },
  { name: 'TL Shipments -- G2O Tech', query: 'mode:TL customer-name:G2O' },
  { name: 'Done -- Dallas Origin', query: 'origin:Dallas shipment-status:Done' },
]

// Map committed chips → initial filter values, keyed by attribute key.
function chipsToFilters(chips) {
  const f = {}
  chips.forEach((c) => { if (c.queryValue) f[c.key] = c.queryValue })
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
  onShowResults,
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
    <div className="shipments-filters">
      <div className="shipments-filters__header">
        <button type="button" className="shipments-filters__icon-btn" onClick={onBack} aria-label="Back to results">
          <ChevronLeft {...ICON_LG} />
        </button>
        <span className="shipments-filters__title text-heading-lg-semibold">Filters</span>
        <button type="button" className="shipments-filters__icon-btn shipments-filters__close" onClick={onClose} aria-label="Close">
          <X {...ICON_LG} />
        </button>
      </div>

      <div className="shipments-filters__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`shipments-filters__tab text-label-sm-medium${activeTab === tab.key ? ' is-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className="shipments-filters__tab-count">{tab.count}</span>
          </button>
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
              <div key={sq.name} className="shipments-filters__saved-row">
                <div className="shipments-filters__saved-name text-label-sm-medium">{sq.name}</div>
                <div className="shipments-filters__saved-query">{sq.query}</div>
                <button type="button" className="shipments-filters__icon-btn" aria-label="Copy query">
                  <Copy size={16} style={{ color: 'var(--text-tertiary)' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shipments-filters__footer">
        <Button variant="link" size="sm" icon={<Plus {...ICON_MD} />} onClick={handleSaveFilters}>
          Save Filters
        </Button>
        <div className="shipments-filters__footer-actions">
          <Button variant="secondary" size="md" onClick={onClearAll}>Clear all</Button>
          <Button variant="primary" size="md" onClick={onShowResults}>
            Show {resultTotal} {resultTotal === 1 ? 'result' : 'results'}
          </Button>
        </div>
      </div>
    </div>
  )
}
