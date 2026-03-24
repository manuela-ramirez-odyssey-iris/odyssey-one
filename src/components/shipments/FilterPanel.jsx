import { useState, useCallback } from 'react'
import { X, Copy, Check } from 'lucide-react'

const DATE_FIELDS = [
  { label: 'Pickup Date', key: 'pickupDate' },
  { label: 'Delivery Date', key: 'deliveryDate' },
  { label: 'Earliest Pickup Date', key: 'earliestPickup' },
  { label: 'Latest Pickup Date', key: 'latestPickup' },
  { label: 'Earliest Delivery Date', key: 'earliestDelivery' },
  { label: 'Latest Delivery Date', key: 'latestDelivery' },
]

const SAVED_QUERIES = [
  { name: 'Late LTL Deliveries -- West Coast', query: 'mode:LTL status:"In Transit" destination:CA delivery:<2026-01-15' },
  { name: 'Pending Tenders -- JBHT', query: 'scac:JBHT tender-status:Pending' },
  { name: 'FTL Shipments -- G2O Tech', query: 'mode:FTL customer-name:G2O' },
  { name: 'Rejected Tenders -- January', query: 'tender-status:Rejected pickup:01/*/2026' },
  { name: 'Intermodal -- Hazardous Cargo', query: 'mode:INTERMODAL hazardous:Y' },
  { name: 'Open Orders -- USALCO', query: 'customer-name:USALCO status:Tender' },
  { name: 'Delivered -- Dallas Origin', query: 'origin:Dallas status:Delivered' },
]

export default function FilterPanel({ isOpen, onClose, itemCount, onApplyFilters, onClearFilters }) {
  const [activeTab, setActiveTab] = useState('all')
  const [dateFilters, setDateFilters] = useState({})
  const [copiedIdx, setCopiedIdx] = useState(null)

  const handleDateChange = useCallback((key, value) => {
    setDateFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleClear = useCallback(() => {
    setDateFilters({})
    if (onClearFilters) onClearFilters()
  }, [onClearFilters])

  const handleApply = useCallback(() => {
    if (onApplyFilters) onApplyFilters(dateFilters)
  }, [dateFilters, onApplyFilters])

  const handleCopy = useCallback((query, idx) => {
    navigator.clipboard.writeText(query).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 1500)
    })
  }, [])

  if (!isOpen) return null

  return (
    <div
      className="fixed top-16 bottom-0 right-0 z-30 flex flex-col"
      style={{
        width: 354,
        background: 'var(--bg-primary)',
        borderLeft: '1px solid var(--border-subtle)',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Filters
        </span>
        <button
          onClick={onClose}
          className="flex items-center justify-center bg-transparent border-none cursor-pointer"
          style={{ color: 'var(--text-placeholder)' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {[{ key: 'all', label: 'All' }, { key: 'saved', label: 'Saved' }].map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 text-xs font-semibold border-none cursor-pointer"
              style={{
                padding: '10px 0',
                background: 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-placeholder)',
                borderBottom: `2px solid ${isActive ? 'var(--text-tertiary)' : 'transparent'}`,
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto" style={{ padding: 16 }}>
        {activeTab === 'all' ? (
          <div>
            <div
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-tertiary)', marginBottom: 12 }}
            >
              Schedule & Dates
            </div>
            <div className="flex flex-col gap-3">
              {DATE_FIELDS.map((field) => (
                <div key={field.key} className="flex flex-col gap-1">
                  <label className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--input-label)' }}>
                    {field.label}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6.5" stroke="var(--text-placeholder)" strokeWidth="1" />
                      <path d="M8 7v4M8 5.5v.01" stroke="var(--text-placeholder)" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </label>
                  <input
                    type="date"
                    value={dateFilters[field.key] || ''}
                    onChange={(e) => handleDateChange(field.key, e.target.value)}
                    className="text-sm"
                    style={{
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--input-border)',
                      background: 'var(--input-bg)',
                      color: 'var(--input-text)',
                      fontFamily: 'var(--font-primary)',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {SAVED_QUERIES.map((sq, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 cursor-pointer"
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
          <button
            onClick={handleClear}
            className="text-xs font-medium border-none cursor-pointer"
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
            }}
          >
            Clear all
          </button>
          <button
            onClick={handleApply}
            className="text-xs font-medium border-none cursor-pointer"
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
            }}
          >
            Show {itemCount} results
          </button>
        </div>
      )}
    </div>
  )
}
