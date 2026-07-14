import { useState, useMemo, useCallback, useRef } from 'react'
import AppShell from '../../components/layout/AppShell'
import ShipmentsPanelTabs from '../../components/shipments/ShipmentsPanelTabs'
import TableControls from '../../components/shipments/TableControls'
import ShipmentTable from '../../components/shipments/ShipmentTable'
import BottomBar, { DEFAULT_TAB_ORDER } from '../../components/detail/BottomBar'
import ColumnPanel, { ALL_COLUMNS, EXCEPTIONS_DEFAULT_COLUMNS, MONITORING_DEFAULT_COLUMNS, RIGHT_PANEL_WIDTH } from '../../components/detail/ColumnPanel'
import TabArrangementPanel from '../../components/detail/TabArrangementPanel'
import { COLUMN_CONFIG } from '../../components/shipments/ShipmentTable'
import { FileText } from 'lucide-react'
import { PageHeader } from '@odyssey/ui'
import ShipmentsGlobalSearch from '../../components/global-search/ShipmentsGlobalSearch'
import { getAllShipments } from '../../data'
import { PANEL_CONFIG } from '../../data/panelConfig'
import { useCustomers } from '../../contexts/CustomersContext.jsx'
import { useShipmentDetail } from '../../api/queries/useShipmentDetail'
import { useShipmentErrorList } from '../../api/queries/useShipmentErrorList'
import { useCategoryCounts } from '../../api/queries/useCategoryCounts'
import { getShipmentErrorList } from '../../api/services/gridService'

function ShipmentsRoute() {
  // Customer scoping (S79c decision 10) — the FIRST-order data filter. The
  // navbar Customers popover drives the selection; its data-backed dataIds
  // pre-scope the list, the category counts and the search glimpse. A selection
  // with no data-backed customers (empty array) = an honest empty table.
  const { selectedDataIds } = useCustomers()
  const [selectedShipmentId, setSelectedShipmentId] = useState(null)
  // Cell→tab mapping (S82): { key } token minted per qualifying cell click,
  // consumed by BottomBar to land the detail bar on the mapped tab.
  const [requestedTab, setRequestedTab] = useState(null)
  const [activePanel, setActivePanel] = useState('exceptions')
  const [activeTab, setActiveTab] = useState('all')
  // Committed GlobalSearch criteria — { chips, text } or null (S79c decision 7).
  // Set only by an explicit commit in the navbar search (Show all / Enter);
  // cleared only by an explicit Clear all. Feeds listParams.searchCriteria AND
  // the category-count queries, so table, tab badges and pills stay coherent.
  const [searchCriteria, setSearchCriteria] = useState(null)
  const [columnPanelOpen, setColumnPanelOpen] = useState(false)
  const [tabPanelOpen, setTabPanelOpen] = useState(false)
  // Ordered visible ShipmentsBar tab keys (hidden = absent; Orders pinned first).
  // Route-state lifespan only — same persistence as the column arrangement.
  const [tabOrder, setTabOrder] = useState(DEFAULT_TAB_ORDER)
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

  // Full set kept for: the grand-total count and the selected-row lookup
  // (BottomBar consumes the raw row shape). In live mode these become lookup
  // endpoints / the grid row already in hand — deferred.
  const allShipments = useMemo(() => getAllShipments(), [])

  const { data: shipmentDetails = null, isLoading: detailsLoading, isError: detailsError, refetch: refetchDetails } = useShipmentDetail(selectedShipmentId)

  // Selection id = sellShipment (the contract detail-link key). Look the raw row up
  // in the full set so BottomBar keeps its row summary even after paging away.
  const selectedShipment = useMemo(() => {
    if (!selectedShipmentId) return null
    return allShipments.find(s => s.sellShipment === selectedShipmentId) || null
  }, [selectedShipmentId, allShipments])

  // Reset to the first page whenever the query identity (panel/tab/search/customer
  // scope) changes. Done during render (React's documented "adjust state on change"
  // pattern) rather than in an effect, so the stale-page query never fires — avoids
  // a wasted round-trip on every filter interaction in live mode.
  const queryIdentity = JSON.stringify([activePanel, activeTab, searchCriteria, selectedDataIds])
  const [prevQueryIdentity, setPrevQueryIdentity] = useState(queryIdentity)
  if (queryIdentity !== prevQueryIdentity) {
    setPrevQueryIdentity(queryIdentity)
    if (pageNumber !== 0) setPageNumber(0)
  }

  // Committed query state → server params the grid service applies.
  const listParams = useMemo(() => ({
    panel: activePanel,
    category: activeTab,
    pageNumber,
    pageSize,
    // FIRST-order customer scope (S79c decision 10) — the selected customers'
    // shipment dataIds, applied by gridService before panel/category/search.
    customerIds: selectedDataIds,
    // Committed GlobalSearch criteria (S79c). The legacy searchTerm /
    // searchAttributeKey params are still supported by gridService (and
    // tested) but the route no longer sends them — searchCriteria replaces
    // that path with the shared chip+text matcher.
    searchCriteria: searchCriteria ?? undefined,
  }), [activePanel, activeTab, pageNumber, pageSize, searchCriteria, selectedDataIds])

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
  // The FORCED move is remembered (S80 QA nuance): when the user's panel comes
  // back — search cleared or counts recovered — we return to it, unless the
  // user manually picked a panel in between (handlePanelSelect clears the memo).
  const fallbackPanelRef = useRef(null)
  if (!visiblePanels.includes(activePanel)) {
    if (fallbackPanelRef.current === null) fallbackPanelRef.current = activePanel
    setActivePanel(visiblePanels[0] ?? 'exceptions')
    setActiveTab('all')
  } else {
    if (fallbackPanelRef.current && visiblePanels.includes(fallbackPanelRef.current)) {
      const restore = fallbackPanelRef.current
      fallbackPanelRef.current = null
      if (restore !== activePanel) {
        setActivePanel(restore)
        setActiveTab('all')
      }
    }
    if (searchActive && activeTab !== 'all') {
      const activeCat = (PANEL_CONFIG[activePanel]?.categories ?? []).find(c => c.key === activeTab)
      if (!activeCat || (metrics[activeCat.badgeKey] ?? 0) === 0) setActiveTab('all')
    }
  }

  // Compute right offset for bottom bar based on the open panel (the two right
  // panels — column arrangement, tab arrangement — are mutually exclusive).
  const rightOffset = (columnPanelOpen ? RIGHT_PANEL_WIDTH : 0) + (tabPanelOpen ? RIGHT_PANEL_WIDTH : 0)

  const handlePanelSelect = useCallback((key) => {
    fallbackPanelRef.current = null // a manual pick overrides the fallback memo
    setActivePanel(key)
    setActiveTab('all')
  }, [])

  const handleRowSelect = useCallback((id, tab, expandGeneral) => {
    if (tab) {
      // Mapped cell: open/keep the row selected AND land on the mapped tab —
      // no toggle-off, so clicking a cost cell of the open row switches tabs
      // instead of closing the bar.
      setSelectedShipmentId(id)
      setRequestedTab({ key: tab, expandGeneral: !!expandGeneral })
    } else {
      setSelectedShipmentId(prev => prev === id ? null : id)
    }
  }, [])

  // Every ColumnPanel dismissal funnels through its requestClose() guard so pending
  // (unsaved) changes can intercept with the exit-confirmation dialog. Returns false
  // when the close was intercepted (the panel stayed open).
  const columnPanelRef = useRef(null)
  const closeColumnPanel = useCallback(() => {
    if (columnPanelRef.current) return columnPanelRef.current.requestClose()
    setColumnPanelOpen(false)
    return true
  }, [])

  // Only one right panel at a time — opening either closes the other.
  const handleToggleColumnPanel = useCallback(() => {
    if (columnPanelOpen) { closeColumnPanel(); return }
    setColumnPanelOpen(true)
    setTabPanelOpen(false)
  }, [columnPanelOpen, closeColumnPanel])

  const handleToggleTabPanel = useCallback(() => {
    // Opening the tab panel first asks the column panel to close — if it intercepts
    // (unsaved changes), stay put; the user resolves the dialog first.
    if (!tabPanelOpen && columnPanelOpen && !closeColumnPanel()) return
    setTabPanelOpen((prev) => !prev)
  }, [tabPanelOpen, columnPanelOpen, closeColumnPanel])

  const handleColumnsChange = useCallback((newVisibleColumns) => {
    setVisibleColumns(newVisibleColumns)
  }, [setVisibleColumns])

  // Prev/next shipment navigation for the ShipmentsBar arrows — steps the
  // selection through the rows of the current page (Figma adds the affordance;
  // page-boundary crossing deferred until the interaction is specced).
  // When the selected row isn't in the current list (e.g. a search filtered it
  // out), prev/next re-enter the list at its edges: prev selects the last
  // visible row, next selects the first. Arrows only fully die on an empty list.
  const selectedRowIndex = useMemo(
    () => (selectedShipmentId ? pageRows.findIndex(r => r.sellShipment === selectedShipmentId) : -1),
    [pageRows, selectedShipmentId],
  )
  const handlePrevShipment = useCallback(() => {
    if (!pageRows.length) return
    if (selectedRowIndex === -1) setSelectedShipmentId(pageRows[pageRows.length - 1].sellShipment)
    else if (selectedRowIndex > 0) setSelectedShipmentId(pageRows[selectedRowIndex - 1].sellShipment)
  }, [selectedRowIndex, pageRows])
  const handleNextShipment = useCallback(() => {
    if (!pageRows.length) return
    if (selectedRowIndex === -1) setSelectedShipmentId(pageRows[0].sellShipment)
    else if (selectedRowIndex < pageRows.length - 1) setSelectedShipmentId(pageRows[selectedRowIndex + 1].sellShipment)
  }, [selectedRowIndex, pageRows])

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
  // Search match-row click — always selects (never toggles off), and lands on
  // the chip-mapped bar tab when the search carried one (same CELL_TAB_MAP as
  // table cells).
  const handleSelectShipment = useCallback((id, tab, expandGeneral) => {
    if (!id) return
    setSelectedShipmentId(id)
    if (tab) setRequestedTab({ key: tab, expandGeneral: !!expandGeneral })
  }, [])

  return (
    <AppShell
      onMainClick={useCallback(() => {
        if (columnPanelOpen) closeColumnPanel() // guarded — may intercept with the unsaved dialog
        if (tabPanelOpen) setTabPanelOpen(false)
      }, [columnPanelOpen, tabPanelOpen, closeColumnPanel])}
      searchSlot={<ShipmentsGlobalSearch onCommitQuery={handleCommitQuery} onSelectShipment={handleSelectShipment} />}
      filterPanel={
        <>
          {/* Invisible scrim while a right panel is open — the first outside
              click only DISMISSES the panel (guarded), it never reaches the
              element underneath (no accidental row selects / button presses).
              z-60: above the chrome (navbar/bar 40, search dropdowns 50),
              below the lifted dock (61) and modal dialogs (9000). */}
          {(columnPanelOpen || tabPanelOpen) && (
            <div
              className="right-panel-scrim"
              aria-hidden="true"
              onMouseDown={(e) => {
                e.preventDefault()
                if (columnPanelOpen) closeColumnPanel() // guarded — may intercept with the unsaved dialog
                if (tabPanelOpen) setTabPanelOpen(false)
              }}
            />
          )}
          <ColumnPanel
            ref={columnPanelRef}
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
        requestedTab={requestedTab}
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
        prevDisabled={pageRows.length === 0 || selectedRowIndex === 0}
        nextDisabled={pageRows.length === 0 || selectedRowIndex === pageRows.length - 1}
      />
    </AppShell>
  )
}

export default ShipmentsRoute
