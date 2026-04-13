import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import AppShell from './components/layout/AppShell'
import MonitorPanels from './components/shipments/MonitorPanels'
import ShipmentTabs from './components/shipments/ShipmentTabs'
import TableControls from './components/shipments/TableControls'
import ShipmentTable from './components/shipments/ShipmentTable'
import BottomBar from './components/detail/BottomBar'
import FilterPanel from './components/shipments/FilterPanel'
import ColumnPanel, { ALL_COLUMNS, EXCEPTIONS_DEFAULT_COLUMNS, MONITORING_DEFAULT_COLUMNS } from './components/detail/ColumnPanel'
import { COLUMN_CONFIG } from './components/shipments/ShipmentTable'
import { FileText } from 'lucide-react'
import { getAllShipments, fetchShipmentDetails, getCachedShipmentDetails, getShipmentsByPanel, getShipmentsByPanelAndCategory, getCategoryCount, SEARCH_ATTRIBUTES } from './data'

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
  const [filters, setFilters] = useState({})
  const [appliedSavedQuery, setAppliedSavedQuery] = useState(null)
  const [shipmentDetails, setShipmentDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [metricsCollapsed, setMetricsCollapsed] = useState(false)
  const [columnsByPanel, setColumnsByPanel] = useState({
    exceptions: EXCEPTIONS_DEFAULT_COLUMNS,
    monitoring: MONITORING_DEFAULT_COLUMNS,
  })
  const visibleColumns = columnsByPanel[activePanel] || EXCEPTIONS_DEFAULT_COLUMNS
  const setVisibleColumns = useCallback((newCols) => {
    setColumnsByPanel(prev => ({ ...prev, [activePanel]: newCols }))
  }, [activePanel])

  const allShipments = useMemo(() => getAllShipments(), [])

  useEffect(() => {
    if (selectedShipmentId) {
      setMetricsCollapsed(true)
      // Check cache first (instant)
      const cached = getCachedShipmentDetails(selectedShipmentId)
      if (cached) {
        setShipmentDetails(cached)
        setDetailsLoading(false)
        return
      }
      // Fetch on demand (~30 KB per shipment)
      setDetailsLoading(true)
      let stale = false
      fetchShipmentDetails(selectedShipmentId).then(data => {
        if (!stale) {
          setShipmentDetails(data)
          setDetailsLoading(false)
        }
      }).catch(() => {
        if (!stale) setDetailsLoading(false)
      })
      return () => { stale = true }
    } else {
      setShipmentDetails(null)
    }
  }, [selectedShipmentId])

  const selectedShipment = useMemo(() => {
    if (!selectedShipmentId) return null
    return allShipments.find(s => s.buyShipment === selectedShipmentId) || null
  }, [selectedShipmentId, allShipments])

  const filteredShipments = useMemo(() => {
    // O(1) panel lookup instead of O(n) filter
    let result = activeTab === 'all'
      ? getShipmentsByPanel(activePanel)
      : getShipmentsByPanelAndCategory(activePanel, activeTab)

    // Apply saved query filters
    if (appliedSavedQuery) {
      const conditions = parseSavedQuery(appliedSavedQuery.query)
      result = result.filter((s) =>
        conditions.every(({ key, value }) => {
          const attr = SEARCH_ATTRIBUTES.find((a) => a.key === key)
          if (!attr) return true
          const fieldVal = s[attr.dataKey]
          if (Array.isArray(fieldVal)) return fieldVal.some((v) => String(v).toLowerCase().includes(value.toLowerCase()))
          return String(fieldVal || '').toLowerCase().includes(value.toLowerCase())
        })
      )
    }

    // Apply text/chip search filtering
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

    // Apply panel filters
    if (filters.origin) result = result.filter((s) => s.origin === filters.origin)
    if (filters.destination) result = result.filter((s) => s.destination === filters.destination)
    if (filters.shipmentStatus) result = result.filter((s) => s.shipmentStatus === filters.shipmentStatus)
    if (filters.scac) result = result.filter((s) => s.scac === filters.scac)

    // Date range filters
    if (filters.pickupDateFrom) {
      result = result.filter((s) => {
        const d = parseShipmentDate(s.pickupDate)
        return d && d >= filters.pickupDateFrom
      })
    }
    if (filters.pickupDateTo) {
      result = result.filter((s) => {
        const d = parseShipmentDate(s.pickupDate)
        return d && d <= filters.pickupDateTo
      })
    }
    if (filters.deliveryDateFrom) {
      result = result.filter((s) => {
        const d = parseShipmentDate(s.deliveryDate)
        return d && d >= filters.deliveryDateFrom
      })
    }
    if (filters.deliveryDateTo) {
      result = result.filter((s) => {
        const d = parseShipmentDate(s.deliveryDate)
        return d && d <= filters.deliveryDateTo
      })
    }

    // Sort by match relevance when chip search is active
    if (debouncedQuery.trim() && activeChipKey) {
      const q = debouncedQuery.toLowerCase()
      const attr = SEARCH_ATTRIBUTES.find(a => a.key === activeChipKey)
      if (attr) {
        const getMatchPriority = (s) => {
          const raw = s[attr.dataKey]
          const val = Array.isArray(raw) ? raw.join(' ') : String(raw || '')
          const lower = val.toLowerCase()
          if (lower.startsWith(q)) return 0
          // Word boundary: check if q appears after a space
          const wordIdx = lower.indexOf(' ' + q)
          if (wordIdx >= 0) return 1
          return 2
        }
        result = [...result].sort((a, b) => getMatchPriority(a) - getMatchPriority(b))
      }
    }

    return result
  }, [allShipments, activePanel, activeTab, debouncedQuery, activeChipKey, filters, appliedSavedQuery])

  const metrics = useMemo(() => {
    return {
      // Exception counts — O(1) lookups
      dateIssues: getCategoryCount('exceptions', 'date-issues'),
      routingReview: getCategoryCount('exceptions', 'routing-review'),
      tenderIssues: getCategoryCount('exceptions', 'tender-issues'),
      tenderReview: getCategoryCount('exceptions', 'tender-review'),
      bidReview: getCategoryCount('exceptions', 'bid-review'),
      // Monitoring counts
      hold: getCategoryCount('monitoring', 'hold'),
      consolidation: getCategoryCount('monitoring', 'consolidation'),
      sent: getCategoryCount('monitoring', 'sent'),
      spotBid: getCategoryCount('monitoring', 'spotbid'),
      approved: getCategoryCount('monitoring', 'approved'),
      // PGI/PGR counts
      pgipgrErrors: getCategoryCount('pgipgr', 'pgipgr-errors'),
      ratingFailure: getCategoryCount('pgipgr', 'rating-failure'),
      manualPgipgr: getCategoryCount('pgipgr', 'manual-pgipgr'),
    }
  }, [allShipments])

  // Compute right offset for bottom bar based on open panels
  const rightOffset = (filtersOpen ? 354 : 0) + (columnPanelOpen ? 354 : 0)

  const handlePanelSelect = useCallback((key) => {
    setActivePanel(key)
    setActiveTab('all')
  }, [])

  const handleRowSelect = useCallback((id) => {
    setSelectedShipmentId(prev => prev === id ? null : id)
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

  const handleColumnsChange = useCallback((newVisibleColumns) => {
    setVisibleColumns(newVisibleColumns)
  }, [setVisibleColumns])

  const handleApplyFilters = useCallback((newFilters) => {
    setFilters(newFilters)
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters({})
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
      onMainClick={useCallback(() => {
        if (filtersOpen) setFiltersOpen(false)
        if (columnPanelOpen) setColumnPanelOpen(false)
      }, [filtersOpen, columnPanelOpen])}
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
            allShipments={allShipments}
          />
          <ColumnPanel
            isOpen={columnPanelOpen}
            onClose={() => setColumnPanelOpen(false)}
            visibleColumns={visibleColumns}
            onColumnsChange={handleColumnsChange}
          />
        </>
      }
    >
      <h1 className="text-3xl font-semibold" style={{ color: 'var(--text-primary)', lineHeight: '32px', marginBottom: 25 }}>
        Shipments
      </h1>
      <MonitorPanels activePanel={activePanel} onPanelSelect={handlePanelSelect} metrics={metrics} collapsed={metricsCollapsed} onToggleCollapsed={() => setMetricsCollapsed(c => !c)} />
      <ShipmentTabs activePanel={activePanel} activeTab={activeTab} onTabSelect={setActiveTab} badgeCounts={metrics} />
      <TableControls
        itemCount={filteredShipments.length}
        totalCount={allShipments.length}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        activeChipKey={activeChipKey}
        onChipSelect={handleChipSelect}
        onToggleFilters={handleToggleFilters}
        onToggleSavedSearches={handleToggleSavedSearches}
        appliedSavedQuery={appliedSavedQuery}
        onClearSavedQuery={handleClearSavedQuery}
        savedSearchesOpen={filtersOpen && filtersInitialTab === 'saved'}
        filtersOpen={filtersOpen && filtersInitialTab === 'all'}
        onExport={(mode) => {
          const VISIBLE_COLUMNS = ['buyShipment', 'customerId', 'orders', 'orderCount', 'pickupDate', 'deliveryDate', 'origin']
          const data = filteredShipments.slice(0, 10000)
          const headers = mode === 'all' ? Object.keys(data[0] || {}) : VISIBLE_COLUMNS
          const escapeCSV = (val) => {
            const str = Array.isArray(val) ? val.join('; ') : String(val ?? '')
            return (str.includes(',') || str.includes('"') || str.includes('\n'))
              ? `"${str.replace(/"/g, '""')}"`
              : str
          }
          const csv = '\uFEFF' + [headers.join(','), ...data.map(r => headers.map(h => escapeCSV(r[h])).join(','))].join('\n')
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `shipments-export-${new Date().toISOString().slice(0, 10)}.csv`
          a.click()
          URL.revokeObjectURL(url)
        }}
      />
      {activePanel === 'pgipgr' ? (
        <div
          className="flex flex-col items-center justify-center gap-3"
          style={{ padding: '48px 0', color: 'var(--text-placeholder)' }}
        >
          <FileText size={32} />
          <div className="text-sm font-medium">Coming soon</div>
          <div className="text-xs">PGI/PGR monitoring will be available in a future release.</div>
        </div>
      ) : (
        <ShipmentTable
          shipments={filteredShipments}
          selectedId={selectedShipmentId}
          onRowSelect={handleRowSelect}
          onToggleColumnPanel={handleToggleColumnPanel}
          visibleColumns={visibleColumns}
          onScrollStart={useCallback(() => setMetricsCollapsed(true), [])}
          activeChipKey={activeChipKey}
        />
      )}
      <BottomBar
        selectedShipmentId={selectedShipmentId}
        shipmentDetails={shipmentDetails}
        shipment={selectedShipment}
        onClose={handleBottomBarClose}
        rightOffset={rightOffset}
        onToggleColumnPanel={handleToggleColumnPanel}
        detailsLoading={detailsLoading}
      />
    </AppShell>
  )
}

export default App
