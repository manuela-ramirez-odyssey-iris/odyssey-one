import { useState, useMemo, useCallback } from 'react'
import AppShell from '../../components/layout/AppShell'
import ShipmentsPanelTabs from '../../components/shipments/ShipmentsPanelTabs'
import TableControls from '../../components/shipments/TableControls'
import ShipmentTable from '../../components/shipments/ShipmentTable'
import BottomBar, { DEFAULT_TAB_ORDER } from '../../components/detail/BottomBar'
import FilterPanel from '../../components/shipments/FilterPanel'
import ColumnPanel, { ALL_COLUMNS, EXCEPTIONS_DEFAULT_COLUMNS, MONITORING_DEFAULT_COLUMNS } from '../../components/detail/ColumnPanel'
import TabArrangementPanel from '../../components/detail/TabArrangementPanel'
import { COLUMN_CONFIG } from '../../components/shipments/ShipmentTable'
import { FileText } from 'lucide-react'
import { PageHeader } from '@odyssey/ui'
import ShipmentsGlobalSearch from '../../components/global-search/ShipmentsGlobalSearch'
import { getAllShipments, SEARCH_ATTRIBUTES } from '../../data'
import { PANEL_CONFIG } from '../../data/panelConfig'
import { useCustomers } from '../../contexts/CustomersContext.jsx'
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
  // Customer scoping (S79c decision 10) — the FIRST-order data filter. The
  // navbar Customers popover drives the selection; its data-backed dataIds
  // pre-scope the list, the category counts and the search glimpse. A selection
  // with no data-backed customers (empty array) = an honest empty table.
  const { selectedDataIds } = useCustomers()
  const [selectedShipmentId, setSelectedShipmentId] = useState(null)
  const [activePanel, setActivePanel] = useState('exceptions')
  const [activeTab, setActiveTab] = useState('all')
  // Committed GlobalSearch criteria — { chips, text } or null (S79c decision 7).
  // Set only by an explicit commit in the navbar search (Show all / Enter);
  // cleared only by an explicit Clear all. Feeds listParams.searchCriteria AND
  // the category-count queries, so table, tab badges and pills stay coherent.
  const [searchCriteria, setSearchCriteria] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [columnPanelOpen, setColumnPanelOpen] = useState(false)
  const [tabPanelOpen, setTabPanelOpen] = useState(false)
  // Ordered visible ShipmentsBar tab keys (hidden = absent; Orders pinned first).
  // Route-state lifespan only — same persistence as the column arrangement.
  const [tabOrder, setTabOrder] = useState(DEFAULT_TAB_ORDER)
  const [filters, setFilters] = useState({})
  const [appliedSavedQuery, setAppliedSavedQuery] = useState(null)
  const [pageNumber, setPageNumber] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  // 'pills' | 'widgets' — how the category row renders (PillTabs vs WidgetMini
  // cards), toggled by the header ButtonToggle. Pill mode is the Figma default.
  const [viewMode, setViewMode] = useState('pills')
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
  const queryIdentity = JSON.stringify([activePanel, activeTab, filters, appliedSavedQuery, searchCriteria, selectedDataIds])
  const [prevQueryIdentity, setPrevQueryIdentity] = useState(queryIdentity)
  if (queryIdentity !== prevQueryIdentity) {
    setPrevQueryIdentity(queryIdentity)
    if (pageNumber !== 0) setPageNumber(0)
  }

  // Committed filter state → server params. The free-text search + FilterPanel
  // filters + applied saved query all become query params the grid service applies.
  const listParams = useMemo(() => {
    // FilterPanel dropdown selections → exact-equality filters.
    const filter = {}
    if (filters.origin) filter.origin = filters.origin
    if (filters.destination) filter.destination = filters.destination
    if (filters.shipmentStatus) filter.shipmentStatus = filters.shipmentStatus
    if (filters.scac) filter.scac = filters.scac
    // Saved-query conditions are substring matches (e.g. customer-name:G2O matches
    // "G2O Technologies LLC") — kept separate from the exact dropdown filters.
    const searchFilters = {}
    if (appliedSavedQuery) {
      for (const { key, value } of parseSavedQuery(appliedSavedQuery.query)) {
        const attr = SEARCH_ATTRIBUTES.find(a => a.key === key)
        if (attr) searchFilters[attr.dataKey] = value
      }
    }
    return {
      panel: activePanel,
      category: activeTab,
      pageNumber,
      pageSize,
      // FIRST-order customer scope (S79c decision 10) — the selected customers'
      // shipment dataIds, applied by gridService before panel/category/search.
      customerIds: selectedDataIds,
      filter,
      searchFilters,
      // Committed GlobalSearch criteria (S79c). The legacy searchTerm /
      // searchAttributeKey params are still supported by gridService (and
      // tested) but the route no longer sends them — searchCriteria replaces
      // that path with the shared chip+text matcher.
      searchCriteria: searchCriteria ?? undefined,
      dateFilters: {
        pickupDateFrom: filters.pickupDateFrom,
        pickupDateTo: filters.pickupDateTo,
        deliveryDateFrom: filters.deliveryDateFrom,
        deliveryDateTo: filters.deliveryDateTo,
      },
    }
  }, [activePanel, activeTab, pageNumber, pageSize, filters, appliedSavedQuery, searchCriteria, selectedDataIds])

  const {
    data: listData,
    isLoading: listLoading,
    isError: listError,
    refetch: refetchList,
  } = useShipmentErrorList(listParams)

  const pageRows = listData?.rows ?? []
  const totalCount = listData?.totalCount ?? 0

  // Tab badges + metrics strip: counts come from the count endpoint per panel,
  // scoped to the selected customers (decision 10) and filtered by the committed
  // search criteria (decision 7) so panel totals, category pills and the glimpse
  // total all agree.
  const { data: exceptionCounts = [], isLoading: exceptionsCountsLoading } = useCategoryCounts('exceptions', searchCriteria ?? undefined, selectedDataIds)
  const { data: monitoringCounts = [], isLoading: monitoringCountsLoading } = useCategoryCounts('monitoring', searchCriteria ?? undefined, selectedDataIds)
  const { data: pgipgrCounts = [], isLoading: pgipgrCountsLoading } = useCategoryCounts('pgipgr', searchCriteria ?? undefined, selectedDataIds)
  const countsReady = !exceptionsCountsLoading && !monitoringCountsLoading && !pgipgrCountsLoading

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

  // Zero-count hiding while committed criteria exist (S79c decision 8):
  // panel tabs with a 0 criteria-filtered total hide — EXCEPT PGI/PGR, which
  // always shows (demo); category pills hide via ShipmentsPanelTabs's
  // hideZeroCategories. Gated on searchActive so no-search = today's full
  // display; countsReady stops a not-yet-loaded [] from hiding everything.
  const searchActive = !!searchCriteria && countsReady
  const visiblePanels = useMemo(() => {
    const keys = Object.keys(PANEL_CONFIG)
    if (!searchActive) return keys
    const panelTotal = (key) =>
      (PANEL_CONFIG[key]?.categories ?? []).reduce((sum, c) => sum + (metrics[c.badgeKey] ?? 0), 0)
    return keys.filter(key => key === 'pgipgr' || panelTotal(key) > 0)
  }, [searchActive, metrics])

  // Selection fallbacks for the hiding (decision 8), adjusted during render
  // (same "adjust state on change" pattern as the page reset above): hidden
  // selected panel → first visible; hidden selected category → 'all'. The
  // subtab stays always-selected through both (decision 9).
  if (!visiblePanels.includes(activePanel)) {
    setActivePanel(visiblePanels[0] ?? 'exceptions')
    setActiveTab('all')
  } else if (searchActive && activeTab !== 'all') {
    const activeCat = (PANEL_CONFIG[activePanel]?.categories ?? []).find(c => c.key === activeTab)
    if (!activeCat || (metrics[activeCat.badgeKey] ?? 0) === 0) setActiveTab('all')
  }

  // Compute right offset for bottom bar based on the open panel (the three right
  // panels — filters, column arrangement, tab arrangement — are mutually exclusive).
  const rightOffset = (filtersOpen ? 354 : 0) + (columnPanelOpen ? 343 : 0) + (tabPanelOpen ? 343 : 0)

  const handlePanelSelect = useCallback((key) => {
    setActivePanel(key)
    setActiveTab('all')
  }, [])

  const handleRowSelect = useCallback((id) => {
    setSelectedShipmentId(prev => prev === id ? null : id)
  }, [])

  // Only one right panel at a time — opening any of the three closes the others.
  // NOTE (S79c decision 6): the FilterPanel's toggle lived on the SearchChipPanel
  // row that was removed from TableControls; the drawer currently has no open
  // trigger (its successor is the GlobalSearch panel's Filters view). The
  // filtersOpen state + drawer stay wired for the follow-up that re-homes it.
  const handleToggleColumnPanel = useCallback(() => {
    setColumnPanelOpen((prev) => !prev)
    setFiltersOpen(false)
    setTabPanelOpen(false)
  }, [])

  const handleToggleTabPanel = useCallback(() => {
    setTabPanelOpen((prev) => !prev)
    setFiltersOpen(false)
    setColumnPanelOpen(false)
  }, [])

  const handleColumnsChange = useCallback((newVisibleColumns) => {
    setVisibleColumns(newVisibleColumns)
  }, [setVisibleColumns])

  // Prev/next shipment navigation for the ShipmentsBar arrows — steps the
  // selection through the rows of the current page (Figma adds the affordance;
  // page-boundary crossing deferred until the interaction is specced).
  const selectedRowIndex = useMemo(
    () => (selectedShipmentId ? pageRows.findIndex(r => r.sellShipment === selectedShipmentId) : -1),
    [pageRows, selectedShipmentId],
  )
  const handlePrevShipment = useCallback(() => {
    if (selectedRowIndex > 0) setSelectedShipmentId(pageRows[selectedRowIndex - 1].sellShipment)
  }, [selectedRowIndex, pageRows])
  const handleNextShipment = useCallback(() => {
    if (selectedRowIndex !== -1 && selectedRowIndex < pageRows.length - 1) {
      setSelectedShipmentId(pageRows[selectedRowIndex + 1].sellShipment)
    }
  }, [selectedRowIndex, pageRows])

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

  // Fed by the NAVBAR GlobalSearch (the table's search box was retired in S79).
  // S79b (decision 5): typing never filters the table. S79c (decision 7): the
  // commit is a { chips, text } criteria SET — chips-only commits work, and an
  // empty text no longer clears anything; only an explicit Clear all (null /
  // empty criteria) does.
  const handleCommitQuery = useCallback((criteria) => {
    const chips = criteria?.chips ?? []
    const text = (criteria?.text ?? '').trim()
    setSearchCriteria(chips.length || text ? { chips, text } : null)
  }, [])

  // Match-row click in the navbar search glimpse → select that shipment. The
  // docked ShipmentsBar opens with its details regardless of table visibility
  // (detail fetch + row summary are keyed off allShipments, not the page); if
  // the row IS on the current page, the table's selectedId effect auto-scrolls
  // to it.
  const handleSelectShipment = useCallback((id) => {
    if (id) setSelectedShipmentId(id)
  }, [])

  return (
    <AppShell
      onMainClick={useCallback(() => {
        if (filtersOpen) setFiltersOpen(false)
        if (columnPanelOpen) setColumnPanelOpen(false)
        if (tabPanelOpen) setTabPanelOpen(false)
      }, [filtersOpen, columnPanelOpen, tabPanelOpen])}
      searchSlot={<ShipmentsGlobalSearch onCommitQuery={handleCommitQuery} onSelectShipment={handleSelectShipment} />}
      filterPanel={
        <>
          <FilterPanel
            isOpen={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            itemCount={totalCount}
            initialTab="all"
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
          <TabArrangementPanel
            isOpen={tabPanelOpen}
            onClose={() => setTabPanelOpen(false)}
            tabOrder={tabOrder}
            onTabOrderChange={setTabOrder}
          />
        </>
      }
    >
      <PageHeader title="Shipments" style={{ marginBottom: 25 }} />
      <ShipmentsPanelTabs
        activePanel={activePanel}
        onPanelSelect={handlePanelSelect}
        activeTab={activeTab}
        onTabSelect={setActiveTab}
        metrics={metrics}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        visiblePanels={visiblePanels}
        hideZeroCategories={searchActive}
      />
      <TableControls
        itemCount={totalCount}
        filtersOpen={filtersOpen}
        onExport={async (mode) => {
          // Export all matching rows (not just the current page) — fetch them through
          // the grid service with the current filters and a large page size. In live
          // mode the dedicated /error/download endpoint would replace this (deferred).
          // "Visible columns" mode follows the user's live column profile (the same
          // `visibleColumns` the table renders) — so reordering/toggling columns or
          // switching panels changes the export, exactly as if done through the UI.
          const res = await getShipmentErrorList({ ...listParams, pageNumber: 0, pageSize: 10000 })
          const data = res.rows
          const headers = mode === 'all' ? Object.keys(data[0] || {}) : visibleColumns
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
        onClose={() => setSelectedShipmentId(null)}
        shipmentDetails={shipmentDetails}
        shipment={selectedShipment}
        rightOffset={rightOffset}
        onToggleColumnPanel={handleToggleColumnPanel}
        onTabArrangement={handleToggleTabPanel}
        tabOrder={tabOrder}
        detailsLoading={detailsLoading}
        detailsError={detailsError}
        onRetryDetails={refetchDetails}
        onPrevShipment={handlePrevShipment}
        onNextShipment={handleNextShipment}
        prevDisabled={selectedRowIndex <= 0}
        nextDisabled={selectedRowIndex === -1 || selectedRowIndex >= pageRows.length - 1}
      />
    </AppShell>
  )
}

export default ShipmentsRoute
