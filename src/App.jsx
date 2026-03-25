import { useState, useMemo, useCallback, useRef } from 'react'
import AppShell from './components/layout/AppShell'
import MonitorPanels from './components/shipments/MonitorPanels'
import ShipmentTabs from './components/shipments/ShipmentTabs'
import TableControls from './components/shipments/TableControls'
import ShipmentTable from './components/shipments/ShipmentTable'
import BottomBar from './components/detail/BottomBar'
import FilterPanel from './components/shipments/FilterPanel'
import ColumnPanel from './components/detail/ColumnPanel'
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
  const [filtersInitialTab, setFiltersInitialTab] = useState('all')
  const [columnPanelOpen, setColumnPanelOpen] = useState(false)

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

  const metrics = useMemo(() => {
    const s = allShipments
    return {
      dateIssues: s.filter((x) => x.tenderStatus === 'Pending' && x.shipmentStatus === 'Tender').length,
      routingReview: s.filter((x) => x.tenderStatus === 'Rejected').length,
      tenderIssues: s.filter((x) => x.tenderStatus === 'Rejected' && x.shipmentStatus === 'Tender').length,
      tenderReview: s.filter((x) => x.tenderStatus === 'Pending').length,
      bidReview: s.filter((x) => x.mode === 'LTL' && x.tenderStatus === 'Pending').length,
      hold: s.filter((x) => x.shipmentStatus === 'Booked').length,
      consolidation: s.filter((x) => x.mode === 'LTL').length,
      spotBid: s.filter((x) => x.mode === 'INTERMODAL').length,
      approved: s.filter((x) => x.tenderStatus === 'Done' && x.shipmentStatus === 'In Transit').length,
      pgipgrErrors: s.filter((x) => x.shipmentStatus === 'Delivered' && x.tenderStatus === 'Rejected').length,
      ratingFailure: s.filter((x) => x.shipmentStatus === 'Delivered' && x.tenderStatus === 'Pending').length,
      manualPgipgr: s.filter((x) => x.shipmentStatus === 'Delivered' && x.tenderStatus === 'Done').length,
      missedPgipgr: s.filter((x) => x.shipmentStatus === 'Delivered' && x.mode === 'FTL').length,
    }
  }, [allShipments])

  // Compute right offset for bottom bar based on open panels
  const rightOffset = (filtersOpen ? 354 : 0) + (columnPanelOpen ? 354 : 0)

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
    setFiltersInitialTab('all')
    setFiltersOpen((prev) => !prev)
  }, [])

  const handleToggleSavedSearches = useCallback(() => {
    setFiltersInitialTab('saved')
    setFiltersOpen((prev) => !prev)
  }, [])

  const handleToggleColumnPanel = useCallback(() => {
    setColumnPanelOpen((prev) => !prev)
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
    <AppShell
      filterPanel={
        <>
          <FilterPanel
            isOpen={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            itemCount={filteredShipments.length}
            initialTab={filtersInitialTab}
          />
          <ColumnPanel
            isOpen={columnPanelOpen}
            onClose={() => setColumnPanelOpen(false)}
          />
        </>
      }
    >
      <h1 className="text-3xl font-semibold mb-6" style={{ color: 'var(--text-primary)', lineHeight: '32px' }}>
        Shipments
      </h1>
      <MonitorPanels activePanel={activePanel} onPanelSelect={handlePanelSelect} metrics={metrics} />
      <ShipmentTabs activePanel={activePanel} activeTab={activeTab} onTabSelect={setActiveTab} badgeCounts={metrics} />
      <TableControls
        itemCount={filteredShipments.length}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        activeChipKey={activeChipKey}
        onChipSelect={handleChipSelect}
        onToggleFilters={handleToggleFilters}
        onToggleSavedSearches={handleToggleSavedSearches}
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
        rightOffset={rightOffset}
        onToggleColumnPanel={handleToggleColumnPanel}
      />
    </AppShell>
  )
}

export default App
