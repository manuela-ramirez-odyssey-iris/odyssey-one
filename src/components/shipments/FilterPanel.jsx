import { useState, useCallback, useEffect, useMemo } from 'react'
import { X, Copy, Check, Info, ChevronDown } from 'lucide-react'
import { PrimaryButton, SecondaryButton } from '../ui/Button'

const SAVED_QUERIES = [
  { name: 'Review Shipments -- West Coast', query: 'mode:LTL shipment-status:Review destination:CA delivery:<2026-01-15' },
  { name: 'Sent Tenders -- JBHT', query: 'scac:JBHT tender-status:Sent' },
  { name: 'TL Shipments -- G2O Tech', query: 'mode:TL customer-name:G2O' },
  { name: 'Declined Tenders -- January', query: 'tender-status:Declined pickup:01/*/2026' },
  { name: 'Review Orders -- USALCO', query: 'customer-name:USALCO shipment-status:Review' },
  { name: 'Done -- Dallas Origin', query: 'origin:Dallas shipment-status:Done' },
]

const INITIAL_FILTERS = {
  origin: '',
  destination: '',
  shipmentStatus: '',
  scac: '',
  pickupDateFrom: '',
  pickupDateTo: '',
  deliveryDateFrom: '',
  deliveryDateTo: '',
}

function FilterSelect({ label, value, options, onChange, placeholder = 'Select an option' }) {
  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      <label className="flex items-center" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', gap: 4 }}>
        {label}
        <Info size={14} style={{ color: 'var(--text-placeholder)' }} />
      </label>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 30px 8px 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--input-border)',
            background: 'var(--input-bg)',
            color: value ? 'var(--input-text)' : 'var(--text-placeholder)',
            fontFamily: 'var(--font-primary)',
            fontSize: 13,
            appearance: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: 'var(--text-placeholder)',
          }}
        />
      </div>
    </div>
  )
}

function DateRangeField({ label, fromValue, toValue, onFromChange, onToChange }) {
  const inputStyle = {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--input-border)',
    background: 'var(--input-bg)',
    color: 'var(--input-text)',
    fontFamily: 'var(--font-primary)',
    fontSize: 13,
    minWidth: 0,
  }

  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      <label className="flex items-center" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', gap: 4 }}>
        {label}
        <Info size={14} style={{ color: 'var(--text-placeholder)' }} />
      </label>
      <div className="flex items-center" style={{ gap: 8 }}>
        <input
          type="date"
          value={fromValue}
          onChange={(e) => onFromChange(e.target.value)}
          placeholder="From"
          style={inputStyle}
        />
        <span style={{ fontSize: 12, color: 'var(--text-placeholder)', flexShrink: 0 }}>to</span>
        <input
          type="date"
          value={toValue}
          onChange={(e) => onToChange(e.target.value)}
          placeholder="To"
          style={inputStyle}
        />
      </div>
    </div>
  )
}

function SectionHeader({ children, first }) {
  return (
    <div
      style={{
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: 12,
        marginTop: first ? 0 : 20,
      }}
    >
      {children}
    </div>
  )
}

export default function FilterPanel({ isOpen, onClose, itemCount, onApplyFilters, onClearFilters, onApplySavedQuery, initialTab = 'all', allShipments = [] }) {
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  const [filters, setFilters] = useState({ ...INITIAL_FILTERS })
  const [copiedIdx, setCopiedIdx] = useState(null)

  // Compute unique dropdown options from shipment data
  const origins = useMemo(
    () => [...new Set(allShipments.map((s) => s.origin))].filter(Boolean).sort(),
    [allShipments]
  )
  const destinations = useMemo(
    () => [...new Set(allShipments.map((s) => s.destination))].filter(Boolean).sort(),
    [allShipments]
  )
  const scacs = useMemo(
    () => [...new Set(allShipments.map((s) => s.scac))].filter(Boolean).sort(),
    [allShipments]
  )
  const statuses = useMemo(() => ['Done', 'Review'], [])

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleClear = useCallback(() => {
    setFilters({ ...INITIAL_FILTERS })
    if (onClearFilters) onClearFilters()
  }, [onClearFilters])

  const handleApply = useCallback(() => {
    if (onApplyFilters) onApplyFilters(filters)
  }, [filters, onApplyFilters])

  const handleCopy = useCallback((query, idx) => {
    navigator.clipboard.writeText(query).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 1500)
    })
  }, [])

  return (
    <div
      className="flex flex-col shrink-0"
      style={{
        width: isOpen ? 354 : 0,
        minWidth: isOpen ? 354 : 0,
        background: 'var(--bg-primary)',
        borderLeft: isOpen ? '1px solid var(--border-subtle)' : '0px solid var(--border-subtle)',
        overflow: 'hidden',
        transition: 'width var(--transition-slow), min-width var(--transition-slow), border-left-width var(--transition-slow)',
      }}
    >
      {/* Header */}
      <div
        className="flex flex-col shrink-0"
        style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-primary)' }}>
            Filters
          </span>
          <button
            onClick={onClose}
            className="flex items-center justify-center bg-transparent border-none cursor-pointer"
            style={{ color: 'var(--text-placeholder)', padding: 4, borderRadius: 'var(--radius-sm)', transition: 'color 0.15s ease, background 0.15s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-tertiary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-placeholder)'; e.currentTarget.style.background = 'transparent' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs as pill buttons */}
        <div className="flex items-center" style={{ gap: 12 }}>
          {[{ key: 'all', label: 'All', count: 8 }, { key: 'saved', label: 'Saved', count: SAVED_QUERIES.length }].map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center border-none cursor-pointer"
                style={{
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-placeholder)',
                  fontFamily: 'var(--font-primary)',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? 'var(--bg-tertiary)' : 'transparent' }}
              >
                {tab.label}
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: isActive ? 'var(--text-secondary)' : 'var(--text-placeholder)',
                  background: isActive ? 'var(--border-subtle)' : 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-full)',
                  padding: '1px 7px',
                  minWidth: 20,
                  textAlign: 'center',
                }}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto" style={{ padding: 'var(--spacing-4)' }}>
        {activeTab === 'all' ? (
          <div>
            {/* Location */}
            <SectionHeader first>Location</SectionHeader>
            <div className="flex flex-col" style={{ gap: 14 }}>
              <FilterSelect
                label="Origin"
                value={filters.origin}
                options={origins}
                onChange={(v) => updateFilter('origin', v)}
              />
              <FilterSelect
                label="Destination"
                value={filters.destination}
                options={destinations}
                onChange={(v) => updateFilter('destination', v)}
              />
            </div>

            {/* Status */}
            <SectionHeader>Status</SectionHeader>
            <div className="flex flex-col" style={{ gap: 14 }}>
              <FilterSelect
                label="Status"
                value={filters.shipmentStatus}
                options={statuses}
                onChange={(v) => updateFilter('shipmentStatus', v)}
              />
            </div>

            {/* Carrier Information */}
            <SectionHeader>Carrier Information</SectionHeader>
            <div className="flex flex-col" style={{ gap: 14 }}>
              <FilterSelect
                label="SCAC"
                value={filters.scac}
                options={scacs}
                onChange={(v) => updateFilter('scac', v)}
              />
            </div>

            {/* Date Range */}
            <SectionHeader>Date Range</SectionHeader>
            <div className="flex flex-col" style={{ gap: 14 }}>
              <DateRangeField
                label="Pickup Date"
                fromValue={filters.pickupDateFrom}
                toValue={filters.pickupDateTo}
                onFromChange={(v) => updateFilter('pickupDateFrom', v)}
                onToChange={(v) => updateFilter('pickupDateTo', v)}
              />
              <DateRangeField
                label="Delivery Date Range"
                fromValue={filters.deliveryDateFrom}
                toValue={filters.deliveryDateTo}
                onFromChange={(v) => updateFilter('deliveryDateFrom', v)}
                onToChange={(v) => updateFilter('deliveryDateTo', v)}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {SAVED_QUERIES.map((sq, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 cursor-pointer"
                onClick={() => onApplySavedQuery && onApplySavedQuery({ name: sq.name, query: sq.query })}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-primary)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)', marginBottom: 2 }}>
                    {sq.name}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-placeholder)' }}>
                    {sq.query}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleCopy(sq.query, idx) }}
                  className="flex items-center justify-center shrink-0 bg-transparent border-none cursor-pointer"
                  style={{ width: 28, height: 28, color: copiedIdx === idx ? 'var(--text-success)' : 'var(--text-placeholder)' }}
                  title="Copy to clipboard"
                >
                  {copiedIdx === idx ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer (only on All tab) */}
      {activeTab === 'all' && (
        <div
          className="flex items-center justify-between shrink-0"
          style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)' }}
        >
          <SecondaryButton onClick={handleClear}>
            Clear all
          </SecondaryButton>
          <PrimaryButton onClick={handleApply}>
            Show {itemCount} results
          </PrimaryButton>
        </div>
      )}
    </div>
  )
}
