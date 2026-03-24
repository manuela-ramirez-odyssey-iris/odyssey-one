import { useState, useMemo, useCallback, useRef } from 'react'
import AppShell from './components/layout/AppShell'
import MonitorPanels from './components/shipments/MonitorPanels'
import ShipmentTabs from './components/shipments/ShipmentTabs'
import TableControls from './components/shipments/TableControls'
import ShipmentTable from './components/shipments/ShipmentTable'
import BottomBar from './components/detail/BottomBar'
import FilterPanel from './components/shipments/FilterPanel'
import { getAllShipments, getShipmentDetails, SEARCH_ATTRIBUTES } from './data'

function App() {
  const [selectedShipmentId, setSelectedShipmentId] = useState(null)
  const [activePanel, setActivePanel] = useState('exceptions')
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeChipKey, setActiveChipKey] = useState(null)
  const debounceRef = useRef(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const allShipments = useMemo(() => getAllShipments(), [])

  const shipmentDetails = useMemo(() => {
    if (!selectedShipmentId) return null
    return getShipmentDetails(selectedShipmentId)
  }, [selectedShipmentId])

  const filteredShipments = useMemo(() => {
    if (!debouncedQuery.trim()) return allShipments
    const q = debouncedQuery.toLowerCase()

    if (activeChipKey) {
      const attr = SEARCH_ATTRIBUTES.find((a) => a.key === activeChipKey)
      if (attr) {
        return allShipments.filter((s) => {
          const val = s[attr.dataKey]
          if (Array.isArray(val)) return val.some((v) => String(v).toLowerCase().includes(q))
          return String(val || '').toLowerCase().includes(q)
        })
      }
    }

    return allShipments.filter((s) =>
      s.buyShipment.toLowerCase().includes(q) ||
      s.customerId.toLowerCase().includes(q) ||
      s.orders.some((o) => o.toLowerCase().includes(q)) ||
      s.origin.toLowerCase().includes(q) ||
      s.pickupDate.toLowerCase().includes(q) ||
      s.deliveryDate.toLowerCase().includes(q)
    )
  }, [allShipments, debouncedQuery, activeChipKey])

  const handlePanelSelect = useCallback((key) => {
    setActivePanel(key)
    setActiveTab('all')
  }, [])

  const handleRowSelect = useCallback((id) => {
    setSelectedShipmentId(id)
  }, [])

  const handleBottomBarClose = useCallback(() => {
    setSelectedShipmentId(null)
  }, [])

  const handleToggleFilters = useCallback(() => {
    setFiltersOpen((prev) => !prev)
  }, [])

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value)
    if (!value.trim()) {
      setActiveChipKey(null)
      setDebouncedQuery('')
      clearTimeout(debounceRef.current)
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value)
    }, 150)
  }, [])

  const handleChipSelect = useCallback((key) => {
    setActiveChipKey(key)
  }, [])

  return (
    <AppShell>
      <h1 className="text-3xl font-semibold mb-6" style={{ color: 'var(--text-primary)', lineHeight: '32px' }}>
        Shipments
      </h1>
      <MonitorPanels activePanel={activePanel} onPanelSelect={handlePanelSelect} />
      <ShipmentTabs activePanel={activePanel} activeTab={activeTab} onTabSelect={setActiveTab} />
      <TableControls
        itemCount={filteredShipments.length}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        activeChipKey={activeChipKey}
        onChipSelect={handleChipSelect}
        onToggleFilters={handleToggleFilters}
      />
      <ShipmentTable
        shipments={filteredShipments}
        selectedId={selectedShipmentId}
        onRowSelect={handleRowSelect}
      />
      <BottomBar
        selectedShipmentId={selectedShipmentId}
        shipmentDetails={shipmentDetails}
        onClose={handleBottomBarClose}
      />
      <FilterPanel
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        itemCount={filteredShipments.length}
      />
    </AppShell>
  )
}

export default App
