import { useState, useMemo } from 'react'
import { X, ChevronRight, ChevronLeft, Search, GripVertical } from 'lucide-react'

export const ALL_COLUMNS = [
  { key: 'buyShipment', label: 'Buy Shipment #' },
  { key: 'sellShipment', label: 'Sell Shipment #' },
  { key: 'orders', label: 'Order #' },
  { key: 'orderCount', label: 'Order Count' },
  { key: 'proBookingNumber', label: 'Pro#/Booking #' },
  { key: 'customerId', label: 'Customer ID' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'consignor', label: 'Consignor' },
  { key: 'consignee', label: 'Consignee' },
  { key: 'origin', label: 'Origin' },
  { key: 'destination', label: 'Destination' },
  { key: 'distance', label: 'Distance' },
  { key: 'stops', label: 'Stops' },
  { key: 'shipDirection', label: 'Ship Direction' },
  { key: 'pickupDate', label: 'Pickup Date' },
  { key: 'deliveryDate', label: 'Delivery Date' },
  { key: 'earliestPickupDate', label: 'Earliest Pickup Date' },
  { key: 'latestPickupDate', label: 'Latest Pickup Date' },
  { key: 'earliestDeliveryDate', label: 'Earliest Delivery Date' },
  { key: 'latestDeliveryDate', label: 'Latest Delivery Date' },
  { key: 'mode', label: 'Mode' },
  { key: 'equipmentCode', label: 'Equipment Code' },
  { key: 'equipmentNumber', label: 'Equipment #' },
  { key: 'sealNumber', label: 'Seal Number' },
  { key: 'incotermInfo', label: 'Incoterm Info' },
  { key: 'freightTerms', label: 'Freight Terms' },
  { key: 'scac', label: 'SCAC' },
  { key: 'tenderStatus', label: 'Tender Status' },
  { key: 'shipmentStatus', label: 'Shipment Status' },
  { key: 'grossWeight', label: 'Gross Weight' },
  { key: 'netWeight', label: 'Net Weight' },
  { key: 'tareWeight', label: 'Tare Weight' },
  { key: 'pkgCount', label: 'Pkg Count' },
  { key: 'hazardous', label: 'Hazardous (Y/N)' },
  { key: 'apFreightCost', label: 'AP Freight Cost' },
  { key: 'preferredApDirectCost', label: 'Preferred AP Direct Cost' },
  { key: 'arFreightCost', label: 'AR Freight Cost' },
  { key: 'preferredArDirectCost', label: 'Preferred AR Direct Cost' },
  { key: 'loadNumber', label: 'Load #' },
  { key: 'loadCount', label: 'Load Count' },
  { key: 'loadStatus', label: 'Load Status' },
  { key: 'shipmentType', label: 'Shipment Type' },
  { key: 'shipmentSequenceLeg', label: 'Shipment Sequence Leg' },
  { key: 'nextShipmentId', label: 'Next Shipment ID' },
  { key: 'validationMessage', label: 'Validation Message' },
]

const DEFAULT_COLUMNS = [
  'buyShipment', 'customerId', 'shipmentStatus', 'orders', 'orderCount',
  'pickupDate', 'deliveryDate', 'origin', 'destination', 'grossWeight',
  'mode', 'equipmentCode', 'scac', 'apFreightCost', 'validationMessage',
]

export const PRESETS = {
  custom: [
    { id: 'default', name: 'Default', columns: DEFAULT_COLUMNS },
  ],
  odyssey: [
    { id: 'logistics', name: 'Logistics View', columns: ['buyShipment', 'customerId', 'shipmentStatus', 'origin', 'destination', 'mode', 'equipmentCode', 'grossWeight', 'pickupDate', 'deliveryDate'] },
    { id: 'financial', name: 'Financial View', columns: ['buyShipment', 'customerId', 'shipmentStatus', 'orders', 'apFreightCost', 'grossWeight', 'mode', 'scac'] },
    { id: 'carrier', name: 'Carrier View', columns: ['buyShipment', 'shipmentStatus', 'scac', 'mode', 'equipmentCode', 'pickupDate', 'deliveryDate', 'origin', 'destination', 'apFreightCost'] },
  ],
}

export { DEFAULT_COLUMNS }

function getPresetById(id) {
  const all = [...PRESETS.custom, ...PRESETS.odyssey]
  return all.find(p => p.id === id)
}

function getPresetByColumns(columns) {
  const all = [...PRESETS.custom, ...PRESETS.odyssey]
  return all.find(p => {
    if (p.columns.length !== columns.length) return false
    return p.columns.every((c, i) => c === columns[i])
  })
}

export default function ColumnPanel({ isOpen, onClose, visibleColumns, onColumnsChange }) {
  const [view, setView] = useState('presets')
  const [activePresetId, setActivePresetId] = useState('default')
  const [searchQuery, setSearchQuery] = useState('')
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const activePreset = getPresetById(activePresetId)
  const matchedPreset = getPresetByColumns(visibleColumns)
  const activePresetName = matchedPreset ? matchedPreset.name : (activePreset ? activePreset.name : 'Custom')

  const selectedColumns = useMemo(() => {
    return visibleColumns
      .map(key => ALL_COLUMNS.find(c => c.key === key))
      .filter(Boolean)
  }, [visibleColumns])

  const availableColumns = useMemo(() => {
    const visibleSet = new Set(visibleColumns)
    let cols = ALL_COLUMNS.filter(c => !visibleSet.has(c.key))
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      cols = cols.filter(c => c.label.toLowerCase().includes(q))
    }
    return cols
  }, [visibleColumns, searchQuery])

  const handlePresetSelect = (presetId) => {
    setActivePresetId(presetId)
    const preset = getPresetById(presetId)
    if (preset) {
      onColumnsChange(preset.columns)
    }
  }

  const handleToggleColumn = (key, checked) => {
    if (checked) {
      // Add to end of visible
      onColumnsChange([...visibleColumns, key])
    } else {
      // Remove from visible
      onColumnsChange(visibleColumns.filter(k => k !== key))
    }
  }

  const handleDrop = (e, toIndex) => {
    e.preventDefault()
    setDragOverIndex(null)
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'))
    if (isNaN(fromIndex) || fromIndex === toIndex) return
    const newCols = [...visibleColumns]
    const [moved] = newCols.splice(fromIndex, 1)
    newCols.splice(toIndex, 0, moved)
    onColumnsChange(newCols)
  }

  const handleNavigateToArrangement = (presetId) => {
    setActivePresetId(presetId)
    const preset = getPresetById(presetId)
    if (preset) {
      onColumnsChange(preset.columns)
    }
    setView('arrangement')
    setSearchQuery('')
  }

  const renderPresets = () => (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: '0 16px 16px' }}>
      {/* Custom Presets */}
      <div style={{ marginTop: 16 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
          color: 'var(--text-placeholder)', marginBottom: 8,
        }}>
          Custom Presets
        </div>
        {PRESETS.custom.map(preset => (
          <PresetRow
            key={preset.id}
            preset={preset}
            isActive={activePresetId === preset.id && !!matchedPreset && matchedPreset.id === preset.id}
            onSelect={() => handlePresetSelect(preset.id)}
            onNavigate={() => handleNavigateToArrangement(preset.id)}
          />
        ))}
      </div>

      {/* Odyssey Presets */}
      <div style={{ marginTop: 20 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
          color: 'var(--text-placeholder)', marginBottom: 8,
        }}>
          Odyssey Presets
        </div>
        {PRESETS.odyssey.map(preset => (
          <PresetRow
            key={preset.id}
            preset={preset}
            isActive={activePresetId === preset.id && !!matchedPreset && matchedPreset.id === preset.id}
            onSelect={() => handlePresetSelect(preset.id)}
            onNavigate={() => handleNavigateToArrangement(preset.id)}
          />
        ))}
      </div>
    </div>
  )

  const renderArrangement = () => (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: '0 16px 16px' }}>
      {/* Back button */}
      <button
        onClick={() => { setView('presets'); setSearchQuery('') }}
        className="flex items-center gap-1 bg-transparent border-none cursor-pointer"
        style={{ color: 'var(--text-link, var(--border-focus))', fontSize: 13, fontWeight: 500, padding: '12px 0 8px', fontFamily: 'var(--font-primary)' }}
      >
        <ChevronLeft size={14} />
        Back
      </button>

      {/* Selected columns */}
      <div style={{ marginBottom: 4 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
          color: 'var(--text-placeholder)', marginBottom: 8,
        }}>
          Selected columns ({selectedColumns.length})
        </div>
        {selectedColumns.map((col, index) => (
          <div
            key={col.key}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', index)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setDragOverIndex(index)
            }}
            onDragLeave={() => setDragOverIndex(null)}
            onDrop={(e) => handleDrop(e, index)}
            className="flex items-center gap-2"
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              marginBottom: 4,
              cursor: 'grab',
              borderTop: dragOverIndex === index ? '2px solid var(--border-focus)' : '1px solid var(--border-subtle)',
              transition: 'border-top 0.1s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-primary)' }}
          >
            <input
              type="checkbox"
              checked
              onChange={() => handleToggleColumn(col.key, false)}
              style={{ accentColor: 'var(--border-focus)', width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>{col.label}</span>
            <GripVertical size={14} style={{ color: 'var(--text-placeholder)', flexShrink: 0 }} />
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '12px 0' }} />

      {/* Available columns */}
      <div>
        <div style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
          color: 'var(--text-placeholder)', marginBottom: 8,
        }}>
          Available columns
        </div>

        {/* Search */}
        <div className="flex items-center gap-2" style={{
          padding: '6px 10px', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)', marginBottom: 8,
          background: 'var(--bg-primary)',
        }}>
          <Search size={14} style={{ color: 'var(--text-placeholder)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search columns"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontSize: 13, color: 'var(--text-secondary)', width: '100%',
              fontFamily: 'var(--font-primary)',
            }}
          />
        </div>

        {availableColumns.map(col => (
          <div
            key={col.key}
            className="flex items-center gap-2"
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              marginBottom: 4,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <input
              type="checkbox"
              checked={false}
              onChange={() => handleToggleColumn(col.key, true)}
              style={{ accentColor: 'var(--border-focus)', width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>{col.label}</span>
            <GripVertical size={14} style={{ color: 'var(--text-placeholder)', flexShrink: 0, opacity: 0.4 }} />
          </div>
        ))}

        {availableColumns.length === 0 && searchQuery.trim() && (
          <div style={{ fontSize: 13, color: 'var(--text-placeholder)', padding: '8px 10px' }}>
            No columns match "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  )

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
        className="flex items-center justify-between shrink-0"
        style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontSize: 16 }}>
            Fixed columns
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-placeholder)', marginTop: 2 }}>
            {activePresetName}
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center bg-transparent border-none cursor-pointer"
          style={{ color: 'var(--text-placeholder)' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      {view === 'presets' ? renderPresets() : renderArrangement()}
    </div>
  )
}

function PresetRow({ preset, isActive, onSelect, onNavigate }) {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-subtle)',
        marginBottom: 6,
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-primary)' }}
      onClick={onSelect}
    >
      <input
        type="radio"
        name="preset-select"
        checked={isActive}
        readOnly
        style={{ accentColor: 'var(--border-focus)', width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
      />
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1, fontWeight: 500 }}>
        {preset.name}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onNavigate() }}
        className="flex items-center justify-center bg-transparent border-none cursor-pointer p-0"
        style={{ color: 'var(--text-placeholder)' }}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
