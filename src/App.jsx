import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import AppShell from './components/layout/AppShell'
import MonitorPanels from './components/shipments/MonitorPanels'
import ShipmentTabs from './components/shipments/ShipmentTabs'
import TableControls from './components/shipments/TableControls'
import ShipmentTable from './components/shipments/ShipmentTable'
import BottomBar from './components/detail/BottomBar'
import FilterPanel from './components/shipments/FilterPanel'
import ColumnPanel from './components/detail/ColumnPanel'
import { getAllShipments, getShipmentDetails, loadShipmentDetails, SEARCH_ATTRIBUTES } from './data'

function parseSavedQuery(queryStr) {
  const pairs = []
  const regex = /(\S+?):(\"[^\"]*\"|\S+)/g
  let match
  while ((match = regex.exec(queryStr)) !== null) {
    const key = match[1]
    const value = match[2].replace(/^"|"$/g, '')
    pairs.push({ key, value })
  }
  return pairs
}

function parseShipmentDate(dateStr) {
  if (!dateStr) return null
  // Format: "MM/DD/YYYY HH:MM TZ" → extract MM/DD/YYYY
  const parts = dateStr.split(' ')
  if (!parts[0]) return null
  const [mm, dd, yyyy] = parts[0].split('/')
  if (!mm || !dd || !yyyy) return null
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

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
  const [dateFilters, setDateFilters] = useState({})
  const [appliedSavedQuery, setAppliedSavedQuery] = useState(null)
  const [detailsLoaded, setDetailsLoaded] = useState(false)

  const allShipments = useMemo(() => getAllShipments(), [])

  useEffect(() => {
    if (selectedShipmentId) {
      loadShipmentDetails().then(() => {
        // Force re-render to pick up cached details
        setDetailsLoaded(true)
      })
    }
  }, [selectedShipmentId])

  const shipmentDetails = useMemo(() => {
    if (!selectedShipmentId) return null
    return getShipmentDetails(selectedShipmentId)
  }, [selectedShipmentId, detailsLoaded])

  const filteredShipments = useMemo(() => {
    let result = allShipments

    // 1. Apply saved query filters first
    if (appliedSavedQuery) {
      const conditions = parseSavedQuery(appliedSavedQuery.query)
      result = result.filter((s) =>
        conditions.every(({ key, value }) => {
          const attr = SEARCH_ATTRIBUTES.find((a) => a.key === key)
          if (!attr) return true // skip unknown keys
          const fieldVal = s[attr.dataKey]
          if (Array.isArray(fieldVal)) return fieldVal.some((v) => String(v).toLowerCase().includes(value.toLowerCase()))
          return String(fieldVal || '').toLowerCase().includes(value.toLowerCase())
        })
      )
    }

    // 2. Apply text/chip search filtering
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase()
      if (activeChipKey) {
        const attr = SEARCH_ATTRIBUTES.find((a) => a.key === activeChipKey)
        if (attr) {
          result = result.filter((s) => {
            const val = s[attr.dataKey]
            if (Array.isArray(val)) return val.some((v) => String(v).toLowerCase().includes(q))
            return String(val || '').toLowerCase().includes(q)
          })
        }
      } else {
        result = result.filter((s) =>
          s.buyShipment.toLowerCase().includes(q) ||
          s.customerId.toLowerCase().includes(q) ||
          s.orders.some((o) => o.toLowerCase().includes(q)) ||
          s.origin.toLowerCase().includes(q) ||
          s.pickupDate.toLowerCase().includes(q) ||
          s.deliveryDate.toLowerCase().includes(q)
        )
      }
    }

    // 3. Apply date filters
    const activeDateFilters = Object.entries(dateFilters).filter(([, v]) => v)
    if (activeDateFilters.length > 0) {
      result = result.filter((s) =>
        activeDateFilters.every(([key, filterDate]) => {
          const shipmentDate = parseShipmentDate(s[key])
          if (!shipmentDate) return false
          return shipmentDate >= filterDate
        })
      )
    }

    return result
  }, [allShipments, debouncedQuery, activeChipKey, dateFilters, appliedSavedQuery])

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

  const handleApplyFilters = useCallback((filters) => {
    setDateFilters(filters)
    setFiltersOpen(false)
  }, [])

  const handleClearFilters = useCallback(() => {
    setDateFilters({})
  }, [])

  const handleApplySavedQuery = useCallback((query) => {
    setAppliedSavedQuery(query)
    setFiltersOpen(false)
  }, [])

  const handleClearSavedQuery = useCallback(() => {
    setAppliedSavedQuery(null)
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
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
            onApplySavedQuery={handleApplySavedQuery}
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
        appliedSavedQuery={appliedSavedQuery}
        onClearSavedQuery={handleClearSavedQuery}
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
