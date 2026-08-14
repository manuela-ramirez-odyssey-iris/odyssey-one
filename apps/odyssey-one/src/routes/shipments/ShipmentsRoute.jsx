import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import AppShell from '../../components/layout/AppShell'
import ShipmentsPanelTabs from '../../components/shipments/ShipmentsPanelTabs'
import TableControls from '../../components/shipments/TableControls'
import ShipmentTable from '../../components/shipments/ShipmentTable'
import BottomBar, { DEFAULT_TAB_ORDER, mergeTabOrder } from '../../components/detail/BottomBar'
import ColumnPanel, { ALL_COLUMNS, EXCEPTIONS_DEFAULT_COLUMNS, MONITORING_DEFAULT_COLUMNS, RIGHT_PANEL_WIDTH, PRESETS, mergeLateAddedColumns } from '../../components/detail/ColumnPanel'
import TabArrangementPanel from '../../components/detail/TabArrangementPanel'
import { COLUMN_CONFIG } from '../../components/shipments/ShipmentTable'
import { FileText } from 'lucide-react'
import { PageHeader } from '@odyssey/ui'
import ShipmentsGlobalSearch from '../../components/global-search/ShipmentsGlobalSearch'
import { getAllShipments } from '../../data'
import { PANEL_CONFIG, panelTotals, landingPanel } from '../../data/panelConfig'
import { useCustomers } from '../../contexts/CustomersContext.jsx'
import { useShipmentDetail } from '../../api/queries/useShipmentDetail'
import { useUserPreference } from '../../api/queries/useUserPreference'
import { useShipmentErrorList } from '../../api/queries/useShipmentErrorList'
import { useCategoryCounts } from '../../api/queries/useCategoryCounts'
import { getShipmentErrorList, RELEVANCE_SORT } from '../../api/services/gridService'

// The table is never unsorted — this is the column that drives until a search
// commits (relevance) or the user picks another.
const DEFAULT_SORTING = [{ id: 'buyShipment', desc: false }]

function ShipmentsRoute() {
  // Customer scoping (S79c decision 10) — the FIRST-order data filter. The
  // navbar Customers popover drives the selection; its data-backed dataIds
  // pre-scope the list, the category counts and the search glimpse. A selection
  // with no data-backed customers (empty array) = an honest empty table.
  const { selectedDataIds } = useCustomers()
  // Panel/tab deep-link (S91 Home widgets): navigate('/shipments',
  // { state: { panel, tab } }) lands directly on that panel + category tab.
  // S113 extends the same seam with `selectedShipmentId` + `requestedTab`, so
  // the SpotBoard Dashboard's row action can drill from the cross-shipment
  // board straight into ONE shipment's Spot tab. Declared above the states
  // below because they now read from it (a lazy initialiser referencing
  // `location` before this line would hit the TDZ).
  const location = useLocation()
  const [selectedShipmentId, setSelectedShipmentId] = useState(location.state?.selectedShipmentId ?? null)
  // Cell→tab mapping (S82): { key } token minted per qualifying cell click,
  // consumed by BottomBar to land the detail bar on the mapped tab.
  const [requestedTab, setRequestedTab] = useState(location.state?.requestedTab ?? null)
  const [activePanel, setActivePanel] = useState(() => location.state?.panel ?? 'exceptions')
  const [activeTab, setActiveTab] = useState(() => location.state?.tab ?? 'all')
  // Committed GlobalSearch criteria — { chips, text } or null (S79c decision 7).
  // Set only by an explicit commit in the navbar search (Show all / Enter);
  // cleared only by an explicit Clear all. Feeds listParams.searchCriteria AND
  // the category-count queries, so table, tab badges and pills stay coherent.
  const [searchCriteria, setSearchCriteria] = useState(null)
  const [columnPanelOpen, setColumnPanelOpen] = useState(false)
  const [tabPanelOpen, setTabPanelOpen] = useState(false)
  const [pageNumber, setPageNumber] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  // Column sorting (S85) — one column always drives (DataTable flips asc↔desc, never
  // unsorted). Default driver: the first default-visible column. Server-side: mapped
  // to gridService sortBy/orderBy below (full dataset, before pagination).
  const [sorting, setSorting] = useState(DEFAULT_SORTING)
  // Set at commit time from the search preview (GS-18); consumed by the
  // render-time panel jump below. State, not a ref: it is READ during render,
  // and the commit that sets it also sets searchCriteria, so the two land in the
  // same batch.
  const [landOnPanel, setLandOnPanel] = useState(null)
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

  // Ordered visible ShipmentsBar tab keys (hidden = absent; Orders pinned
  // first). Fix D (LINX-11786, 2026-08-10): was route-state-lifespan-only
  // (plain useState reset on every reload) — mirrors `columnsByPanel` above
  // exactly: scoped per PANEL (Exceptions vs Monitoring — the only two
  // BottomBar actually opens against; PGI/PGR has no table/detail bar yet)
  // and persisted through the SAME useUserPreference contract as the column
  // presets below (load-once/save-on-commit, no optimistic updates).
  const [tabOrderByPanel, setTabOrderByPanel] = useState({
    exceptions: DEFAULT_TAB_ORDER,
    monitoring: DEFAULT_TAB_ORDER,
  })
  const { data: tabOrderPref, isLoading: tabOrderPrefLoading, save: saveTabOrderPref } = useUserPreference('shipments.tabOrder')
  // Hydrate once the preference loads — DURING RENDER (the "adjust state on
  // change" pattern used elsewhere in this file: queryIdentity/pageNumber,
  // the pill fallback, the GS-18 landing jump), not a useEffect. An effect
  // fires ONE TICK AFTER `tabOrderPrefLoading` flips to false, which would
  // race the ColumnPanel-style remount-on-load key below: the remount could
  // land in the SAME commit as `tabOrderPrefLoading` going false but with the
  // PRE-hydration (still-default) order, one tick before the effect actually
  // applied the real one — a real bug (found by this session's own Fix D
  // tests: TabArrangementPanel would only re-sync its draft from `tabOrder`
  // on its next isOpen false→true edge, so a panel opened in that one-tick
  // window would show/save the wrong order until closed and reopened).
  // Doing it here instead means the merged value and the loading flag change
  // together, in the exact same commit. Each panel's stored array is MERGED
  // against the live TABS list (mergeTabOrder — unknown keys dropped, missing
  // keys appended, Orders forced first) rather than trusted wholesale,
  // because a save can predate a tab shipped later (SpotBoard/S104) or
  // reference one since retired. One-shot via the ref guard.
  const tabOrderHydratedRef = useRef(false)
  let effectiveTabOrderByPanel = tabOrderByPanel
  if (tabOrderPref && !tabOrderHydratedRef.current) {
    tabOrderHydratedRef.current = true
    effectiveTabOrderByPanel = {
      exceptions: tabOrderPref.exceptions ? mergeTabOrder(tabOrderPref.exceptions) : tabOrderByPanel.exceptions,
      monitoring: tabOrderPref.monitoring ? mergeTabOrder(tabOrderPref.monitoring) : tabOrderByPanel.monitoring,
    }
    setTabOrderByPanel(effectiveTabOrderByPanel)
  }
  const tabOrder = effectiveTabOrderByPanel[activePanel] || DEFAULT_TAB_ORDER
  // Persists `{ order, knownKeys }` for ONLY the touched panel (see
  // mergeTabOrder's comment for what `knownKeys` — DEFAULT_TAB_ORDER as of
  // this save's epoch — disambiguates) — spread over whatever's already
  // STORED for the other panel, not over its local runtime default/hydrated
  // value, so saving Exceptions can never write a Monitoring entry the user
  // never actually committed (true separation, not just non-overwrite).
  const setTabOrder = useCallback((newOrder) => {
    setTabOrderByPanel(prev => ({ ...prev, [activePanel]: newOrder }))
    saveTabOrderPref({
      ...tabOrderPref,
      [activePanel]: { order: newOrder, knownKeys: DEFAULT_TAB_ORDER },
    })
  }, [activePanel, saveTabOrderPref, tabOrderPref])

  // Persisted ColumnPanel preset store (S101) — user_preferences row keyed
  // 'shipments.columnPresets'. Loaded once; saved only when the panel commits
  // (Save / confirmed delete). ColumnPanel hydrates via initialPresetState (its
  // key below remounts it once the load resolves — panel is closed, invisible).
  const { data: presetPref, isLoading: presetPrefLoading, save: savePresetPref } = useUserPreference('shipments.columnPresets')

  // On hydration, re-apply the committed columns of the last-active preset so
  // the table matches what the user last saved (mock mode: null, no-op).
  useEffect(() => {
    if (!presetPref) return
    const all = [...(presetPref.customPresets ?? []), ...PRESETS.odyssey]
    const cols = presetPref.presetColumns?.[presetPref.activePresetId]
      ?? all.find(p => p.id === presetPref.activePresetId)?.columns
    // A SAVED preset overrides the code defaults wholesale, so a column added
    // after the user last saved would never appear for them — which is exactly
    // what happened to Pickup #, Shipment Type and Planning Type. Merge those
    // in on hydrate; nothing else is added and nothing is removed.
    if (cols?.length) setVisibleColumns(mergeLateAddedColumns(cols))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once, on load
  }, [presetPref])

  // Full set kept for: the grand-total count and the selected-row lookup
  // (BottomBar consumes the raw row shape). In live mode these become lookup
  // endpoints / the grid row already in hand — deferred.
  const allShipments = useMemo(() => getAllShipments(), [])

  // Fix A (2026-08-10): `error` is the real ApiError/Error the query threw
  // (api/client.ts's apiErrorFrom parses the server's real {message, detail}
  // body onto it) — was never destructured before, so BottomBar could only
  // ever show its hardcoded generic string. Fix B (2026-08-10): `isPlaceholderData`
  // is react-query's flag for "this data is the PREVIOUS shipment's, held over
  // by placeholderData: keepPreviousData (useShipmentDetail.ts) while the new
  // one fetches" — replaces BottomBar's old hand-rolled `lastDetailsRef`.
  const {
    data: shipmentDetails = null,
    isLoading: detailsLoading,
    isError: detailsError,
    error: detailsErrorDetail,
    isPlaceholderData: detailsStale,
    refetch: refetchDetails,
  } = useShipmentDetail(selectedShipmentId)

  // Reset to the first page whenever the query identity (panel/tab/search/customer
  // scope) changes. Done during render (React's documented "adjust state on change"
  // pattern) rather than in an effect, so the stale-page query never fires — avoids
  // a wasted round-trip on every filter interaction in live mode.
  const queryIdentity = JSON.stringify([activePanel, activeTab, searchCriteria, selectedDataIds, sorting])
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
    sortBy: sorting[0]?.id,
    orderBy: sorting[0]?.desc ? 'desc' : 'asc',
  }), [activePanel, activeTab, pageNumber, pageSize, searchCriteria, selectedDataIds, sorting])

  const {
    data: listData,
    isLoading: listLoading,
    isPlaceholderData: listStale,
    isError: listError,
    error: listErrorDetail,
    refetch: refetchList,
  } = useShipmentErrorList(listParams)

  const pageRows = listData?.rows ?? []
  const totalCount = listData?.totalCount ?? 0

  // Selection id = sellShipment (the contract detail-link key). The raw row for
  // BottomBar (buy label + summary) comes from the LIVE page rows first — the
  // mock full set only covers live data by coincidence (S93: live sell ids
  // missed it, so the bar fell back to labeling with the sell id). The ref keeps
  // the last-found row so the summary survives paging away from the selection.
  const selectedRowRef = useRef(null)
  const selectedShipment = useMemo(() => {
    if (!selectedShipmentId) { selectedRowRef.current = null; return null }
    const row =
      pageRows.find(r => r.sellShipment === selectedShipmentId)
      ?? (selectedRowRef.current?.sellShipment === selectedShipmentId ? selectedRowRef.current : null)
      ?? allShipments.find(s => s.sellShipment === selectedShipmentId)
      ?? null
    selectedRowRef.current = row
    return row
  }, [selectedShipmentId, pageRows, allShipments])

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

  // Zero-count hiding while committed criteria exist (S79c decision 8), now
  // CATEGORY PILLS ONLY — see visiblePanels below. countsReady stops a
  // not-yet-loaded [] from hiding everything.
  const searchActive = !!searchCriteria && countsReady
  // Matches per panel for the committed criteria — drives both the zero-hiding
  // below and the auto-jump (GS-17).
  const totalsByPanel = useMemo(() => panelTotals(metrics), [metrics])
  // PANEL TABS ARE PERMANENT (user, S104): "PGI/PGR and the other top tabs
  // Exceptions and Monitoring are never meant to be gone." A search narrows the
  // NUMBERS on them, never the tabs themselves — the tab row is the shape of the
  // domain, and a tab vanishing mid-search reads as the app losing a feature.
  // This RETIRES the panel half of S79c decision 8 (zero-total panels used to
  // hide, with PGI/PGR exempt) and its selection-fallback machinery with it.
  // Category PILLS still hide at zero — those are a filter, not the structure.
  const visiblePanels = useMemo(() => Object.keys(PANEL_CONFIG), [])

  // A hidden category pill can still be the selected one — fall back to All.
  // Adjusted during render (same pattern as the page reset above).
  if (searchActive && activeTab !== 'all') {
    const activeCat = (PANEL_CONFIG[activePanel]?.categories ?? []).find(c => c.key === activeTab)
    if (!activeCat || (metrics[activeCat.badgeKey] ?? 0) === 0) setActiveTab('all')
  }

  // GS-18 landing jump — one-shot, render-time, deferred until the committed
  // criteria's counts arrive (searchActive requires countsReady) because the
  // fullest-panel fallback needs the NEW totals. S104 declared `landOnPanel`
  // and its setter but the consumer was never written — the landing rule
  // silently never fired in either mode (found by S105 browser verification:
  // a committed search stayed on an empty Exceptions tab while its one match
  // sat in Monitoring). Same adjust-during-render pattern as the pill fallback.
  if (searchActive && landOnPanel !== null) {
    const target = landingPanel(landOnPanel, totalsByPanel)
    if (target && target !== activePanel) {
      setActivePanel(target)
      setActiveTab('all')
    }
    setLandOnPanel(null) // one-shot: manual tab switches after landing stick
  }

  // Compute right offset for bottom bar based on the open panel (the two right
  // panels — column arrangement, tab arrangement — are mutually exclusive).
  const rightOffset = (columnPanelOpen ? RIGHT_PANEL_WIDTH : 0) + (tabPanelOpen ? RIGHT_PANEL_WIDTH : 0)

  const handlePanelSelect = useCallback((key) => {
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
  // `opts.landOnPanel` — the panel the PREVIEW's leading group lives in, computed
  // by the search component (GS-18). Null for a preview we couldn't read; the
  // render-time jump below then falls back to the fullest panel.
  const handleCommitQuery = useCallback((criteria, opts) => {
    const chips = criteria?.chips ?? []
    const text = (criteria?.text ?? '').trim()
    const next = chips.length || text ? { chips, text } : null
    setSearchCriteria(next)
    // A committed search takes over the sort (GS-16). Without this the seeded
    // column sort below keeps driving and relevance never reaches the grid.
    setSorting(next ? [{ id: RELEVANCE_SORT, desc: false }] : DEFAULT_SORTING)
    setLandOnPanel(next ? (opts?.landOnPanel ?? 'auto') : null)
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
            key={presetPrefLoading ? 'pref-loading' : 'pref-ready'}
            ref={columnPanelRef}
            isOpen={columnPanelOpen}
            onClose={() => setColumnPanelOpen(false)}
            visibleColumns={visibleColumns}
            onColumnsChange={handleColumnsChange}
            initialPresetState={presetPref ?? undefined}
            onPresetStateChange={savePresetPref}
          />
          <TabArrangementPanel
            // Fix D (2026-08-10): same remount-once-loaded trick as ColumnPanel
            // above (`presetPrefLoading` key) — TabArrangementPanel only re-syncs
            // its internal draft from `tabOrder` on an isOpen false→true edge, so
            // without this a panel opened before the preference resolves would
            // capture the pre-hydration (default) order and never pick up the
            // real saved one until closed and reopened. Safe: the panel is closed
            // (invisible) for this — same as ColumnPanel's.
            key={tabOrderPrefLoading ? 'tab-pref-loading' : 'tab-pref-ready'}
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
          sorting={sorting}
          onSortingChange={setSorting}
          isLoading={listLoading}
          isFetchingRows={listStale}
          isError={listError}
          error={listErrorDetail}
          onRetry={refetchList}
        />
      )}
      {/* No onToggleColumnPanel prop here (Fix 3, 2026-08-10) — BottomBar dropped
          its own onToggleColumnPanel prop since the Routing Guide tab (its only
          consumer) removed the gear that used to call it; ShipmentTable above
          still gets handleToggleColumnPanel for the shipments-list column panel. */}
      <BottomBar
        selectedShipmentId={selectedShipmentId}
        requestedTab={requestedTab}
        onClose={() => setSelectedShipmentId(null)}
        shipmentDetails={shipmentDetails}
        shipment={selectedShipment}
        rightOffset={rightOffset}
        onTabArrangement={handleToggleTabPanel}
        tabOrder={tabOrder}
        detailsLoading={detailsLoading}
        detailsError={detailsError}
        error={detailsErrorDetail}
        detailsStale={detailsStale}
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
