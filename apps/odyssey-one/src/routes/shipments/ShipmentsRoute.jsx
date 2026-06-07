import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import AppShell from '../../components/layout/AppShell'
import MonitorPanels from '../../components/shipments/MonitorPanels'
import ShipmentTabs from '../../components/shipments/ShipmentTabs'
import TableControls from '../../components/shipments/TableControls'
import ShipmentTable from '../../components/shipments/ShipmentTable'
import BottomBar from '../../components/detail/BottomBar'
import FilterPanel from '../../components/shipments/FilterPanel'
import ColumnPanel, { ALL_COLUMNS, EXCEPTIONS_DEFAULT_COLUMNS, MONITORING_DEFAULT_COLUMNS } from '../../components/detail/ColumnPanel'
import { COLUMN_CONFIG } from '../../components/shipments/ShipmentTable'
import { FileText } from 'lucide-react'
import { PageHeader } from '@odyssey/ui'
import ShipmentsGlobalSearch from '../../components/global-search/ShipmentsGlobalSearch'
import { getAllShipments, SEARCH_ATTRIBUTES } from '../../data'
import { useShipmentDetail } from '../../api/queries/useShipmentDetail'
import { useShipmentErrorList } from '../../api/queries/useShipmentErrorList'
import { useCategoryCounts } from '../../api/queries/useCategoryCounts'
import { getShipmentErrorList } from '../../api/services/gridService'

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

function ShipmentsRoute() {
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
  const [pageNumber, setPageNumber] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [metricsCollapsed, setMetricsCollapsed] = useState(false)
  const [columnsByPanel, setColumnsByPanel] = useState({
    exceptions: EXCEPTIONS_DEFAULT_COLUMNS,
    monitoring: MONITORING_DEFAULT_COLUMNS,
  })
  const visibleColumns = columnsByPanel[activePanel] || EXCEPTIONS_DEFAULT_COLUMNS
  const setVisibleColumns = useCallback((newCols) => {
    setColumnsByPanel(prev => ({ ...prev, [activePanel]: newCols }))
  }, [activePanel])

  // Full set kept for: FilterPanel dropdown options, the grand-total count, and the
  // selected-row lookup (BottomBar consumes the raw row shape). In live mode these
  // become lookup endpoints / the grid row already in hand — deferred.
  const allShipments = useMemo(() => getAllShipments(), [])

  const { data: shipmentDetails = null, isLoading: detailsLoading, isError: detailsError, refetch: refetchDetails } = useShipmentDetail(selectedShipmentId)

  // Collapse the metrics strip when a shipment is selected (was a side effect of
  // the old detail-fetch effect).
  useEffect(() => {
    if (selectedShipmentId) setMetricsCollapsed(true)
  }, [selectedShipmentId])

  // Selection id = sellShipment (the contract detail-link key). Look the raw row up
  // in the full set so BottomBar keeps its row summary even after paging away.
  const selectedShipment = useMemo(() => {
    if (!selectedShipmentId) return null
    return allShipments.find(s => s.sellShipment === selectedShipmentId) || null
  }, [selectedShipmentId, allShipments])

  // Reset to the first page whenever the query identity (panel/tab/filters/saved
  // query/chip/search) changes. Done during render (React's documented "adjust state
  // on change" pattern) rather than in an effect, so the stale-page query never fires
  // — avoids a wasted round-trip on every filter interaction in live mode.
  const queryIdentity = JSON.stringify([activePanel, activeTab, filters, appliedSavedQuery, activeChipKey, debouncedQuery])
  const [prevQueryIdentity, setPrevQueryIdentity] = useState(queryIdentity)
  if (queryIdentity !== prevQueryIdentity) {
    setPrevQueryIdentity(queryIdentity)
    if (pageNumber !== 0) setPageNumber(0)
  }

  // Committed filter state → server params. The free-text search + FilterPanel
  // filters + applied saved query all become query params the grid service applies.
  const listParams = useMemo(() => {
    const filter = {}
    if (filters.origin) filter.origin = filters.origin
    if (filters.destination) filter.destination = filters.destination
    if (filters.shipmentStatus) filter.shipmentStatus = filters.shipmentStatus
    if (filters.scac) filter.scac = filters.scac
    if (appliedSavedQuery) {
      for (const { key, value } of parseSavedQuery(appliedSavedQuery.query)) {
        const attr = SEARCH_ATTRIBUTES.find(a => a.key === key)
        if (attr) filter[attr.dataKey] = value
      }
    }
    const searchAttr = activeChipKey ? SEARCH_ATTRIBUTES.find(a => a.key === activeChipKey) : null
    return {
      panel: activePanel,
      category: activeTab,
      pageNumber,
      pageSize,
      filter,
      searchTerm: debouncedQuery.trim() || undefined,
      searchAttributeKey: searchAttr ? searchAttr.dataKey : undefined,
      dateFilters: {
        pickupDateFrom: filters.pickupDateFrom,
        pickupDateTo: filters.pickupDateTo,
        deliveryDateFrom: filters.deliveryDateFrom,
        deliveryDateTo: filters.deliveryDateTo,
      },
    }
  }, [activePanel, activeTab, pageNumber, pageSize, filters, appliedSavedQuery, activeChipKey, debouncedQuery])

  const {
    data: listData,
    isLoading: listLoading,
    isError: listError,
    refetch: refetchList,
  } = useShipmentErrorList(listParams)

  const pageRows = listData?.rows ?? []
  const totalCount = listData?.totalCount ?? 0

  // Tab badges + metrics strip: counts come from the count endpoint per panel.
  const { data: exceptionCounts = [] } = useCategoryCounts('exceptions')
  const { data: monitoringCounts = [] } = useCategoryCounts('monitoring')
  const { data: pgipgrCounts = [] } = useCategoryCounts('pgipgr')

  const metrics = useMemo(() => {
    const c = (arr, cat) => arr.find(x => x.category === cat)?.count ?? 0
    return {
      dateIssues: c(exceptionCounts, 'date-issues'),
      routingReview: c(exceptionCounts, 'routing-review'),
      tenderIssues: c(exceptionCounts, 'tender-issues'),
      tenderReview: c(exceptionCounts, 'tender-review'),
      bidReview: c(exceptionCounts, 'bid-review'),
      hold: c(monitoringCounts, 'hold'),
      consolidation: c(monitoringCounts, 'consolidation'),
      sent: c(monitoringCounts, 'sent'),
      spotBid: c(monitoringCounts, 'spotbid'),
      approved: c(monitoringCounts, 'approved'),
      pgipgrErrors: c(pgipgrCounts, 'pgipgr-errors'),
      ratingFailure: c(pgipgrCounts, 'rating-failure'),
      manualPgipgr: c(pgipgrCounts, 'manual-pgipgr'),
    }
  }, [exceptionCounts, monitoringCounts, pgipgrCounts])

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

  const handleScrollStart = useCallback(() => setMetricsCollapsed(true), [])

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
      searchSlot={<ShipmentsGlobalSearch />}
      filterPanel={
        <>
          <FilterPanel
            isOpen={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            itemCount={totalCount}
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
      <PageHeader title="Shipments" style={{ marginBottom: 25 }} />
      <MonitorPanels activePanel={activePanel} onPanelSelect={handlePanelSelect} metrics={metrics} collapsed={metricsCollapsed} onToggleCollapsed={() => setMetricsCollapsed(c => !c)} />
      <ShipmentTabs activePanel={activePanel} activeTab={activeTab} onTabSelect={setActiveTab} badgeCounts={metrics} />
      <TableControls
        itemCount={totalCount}
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
        onExport={async (mode) => {
          // Export all matching rows (not just the current page) — fetch them through
          // the grid service with the current filters and a large page size. In live
          // mode the dedicated /error/download endpoint would replace this (deferred).
          const VISIBLE_COLUMNS = ['buyShipment', 'customerId', 'orders', 'orderCount', 'pickupDate', 'deliveryDate', 'origin']
          const res = await getShipmentErrorList({ ...listParams, pageNumber: 0, pageSize: 10000 })
          const data = res.rows
          const headers = mode === 'all' ? Object.keys(data[0] || {}) : VISIBLE_COLUMNS
          const escapeCSV = (val) => {
            const str = Array.isArray(val) ? val.join('; ') : String(val ?? '')
            return (str.includes(',') || str.includes('"') || str.includes('\n'))
              ? `"${str.replace(/"/g, '""')}"`
              : str
          }
          const csv = '﻿' + [headers.join(','), ...data.map(r => headers.map(h => escapeCSV(r[h])).join(','))].join('\n')
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
          shipments={pageRows}
          selectedId={selectedShipmentId}
          onRowSelect={handleRowSelect}
          onToggleColumnPanel={handleToggleColumnPanel}
          visibleColumns={visibleColumns}
          onScrollStart={handleScrollStart}
          activeChipKey={activeChipKey}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPageNumber}
          onPageSizeChange={(n) => { setPageSize(n); setPageNumber(0) }}
          isLoading={listLoading}
          isError={listError}
          onRetry={refetchList}
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
        detailsError={detailsError}
        onRetryDetails={refetchDetails}
      />
    </AppShell>
  )
}

export default ShipmentsRoute
