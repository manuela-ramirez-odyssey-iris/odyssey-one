import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import useSheet from '../useSheet'
import AppShell from '../../components/layout/AppShell'
import ShipmentsPanelTabs from '../../components/shipments/ShipmentsPanelTabs'
import TableControls from '../../components/shipments/TableControls'
import ShipmentTable from '../../components/shipments/ShipmentTable'
import BottomBar, { DEFAULT_TAB_ORDER, mergeTabOrder } from '../../components/detail/BottomBar'
import ColumnPanel, { ALL_COLUMNS, EXCEPTIONS_DEFAULT_COLUMNS, MONITORING_DEFAULT_COLUMNS, RIGHT_PANEL_WIDTH, PRESETS, mergeLateAddedColumns } from '../../components/detail/ColumnPanel'
import TabArrangementPanel from '../../components/detail/TabArrangementPanel'
import { COLUMN_CONFIG } from '../../components/shipments/ShipmentTable'
import { FileText, Boxes, Combine } from 'lucide-react'
import { PageHeader, Badge, Button } from '@odyssey/ui'
import ShipmentsGlobalSearch from '../../components/global-search/ShipmentsGlobalSearch'
import { attrChip } from '../../components/global-search/savedFilters'
import { getAllShipments } from '../../data'
import { PANEL_CONFIG, panelTotals, landingPanel } from '../../data/panelConfig'
import { PGIPGR_DEMO_COUNTS } from '../../data/pgipgrWidgets'
import { useCustomers } from '../../contexts/CustomersContext.jsx'
import { useShipmentDetail } from '../../api/queries/useShipmentDetail'
import { useUserPreference } from '../../api/queries/useUserPreference'
import { useShipmentErrorList } from '../../api/queries/useShipmentErrorList'
import { useCategoryCounts } from '../../api/queries/useCategoryCounts'
import { getShipmentErrorList, RELEVANCE_SORT } from '../../api/services/gridService'
import { consolidationEligibility, CONSOLIDATION_ATTRIBUTE_KEYS } from '../../consolidation/eligibility'

// Stable empty Map — `selection` must never change identity when nothing is
// selected (a fresh `new Map()` every render would re-identify it downstream).
const EMPTY_SELECTION = new Map()

// The table is never unsorted — this is the column that drives until a search
// commits (relevance) or the user picks another.
const DEFAULT_SORTING = [{ id: 'odysseyShipmentIdentifier', desc: false }]

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
  const { openSheet } = useSheet()
  // Consolidate mode (S154, spec §3). `null` = normal Shipments. In mode,
  // `rows` is the selection: Map<sellShipment, row VM> — the row snapshot
  // rides with the id so the review renders without a refetch and a row paged
  // or filtered away stays selected. Re-entered from the review screen's
  // "Modify Selection" via location.state.consolidate.rows (an array).
  const [consolidate, setConsolidate] = useState(() => (
    location.state?.consolidate
      ? { rows: new Map((location.state.consolidate.rows ?? []).map((r) => [r.id, r])) }
      : null
  ))
  const inMode = consolidate !== null
  const selection = consolidate?.rows ?? EMPTY_SELECTION
  // The first checked row locks the customer (user, 2026-09-19): derived from
  // the selection's insertion order, never stored separately.
  const anchor = selection.size ? selection.values().next().value : null
  const anchorCustomerId = anchor?.customerId ?? null
  // Customer lock (S154, reverses CNS-10): the lock used to be a private
  // `effectiveCustomerIds` override feeding listParams/useCategoryCounts
  // directly, invisible to the planner. Now it's a committed, visible filter
  // chip (`lockedChip` below) handed to ShipmentsGlobalSearch — the table,
  // the category counts and the search glimpse all narrow through the same
  // `searchCriteria` pipeline they already honour, so no override is needed
  // here at all.
  //
  // The customer lock is a real, visible filter chip — the same filtering the
  // planner already uses — not a private query override (user, 2026-09-20).
  // ShipmentsGlobalSearch commits it, so the table, the pills and the glimpse
  // all narrow through the normal criteria pipeline.
  const lockedChip = useMemo(
    // `exact` matters: attrChip inherits the attribute's matching rule, and
    // `customer-id` matches by SUBSTRING for ordinary typed searches. The lock
    // is a machine-derived customer identity, not a typed query, and it must
    // not admit a second customer whose id merely contains this one — the
    // scope parameter it replaced was exact everywhere.
    () => (anchorCustomerId ? { ...attrChip('customer-id', anchorCustomerId), exact: true, locked: true } : null),
    [anchorCustomerId],
  )
  // The customer attribute is owned by the lock while it's active — offering
  // it in suggestions would invite a commit the lock immediately overrides.
  // Stable reference (spec §3, GS-16 lesson): an inline array would
  // re-identify the search adapter every render and refire its suggestion
  // fetch, so the "nothing locked" path returns the module constant itself.
  const searchAttributeKeys = useMemo(() => {
    if (!inMode) return null
    return lockedChip
      ? CONSOLIDATION_ATTRIBUTE_KEYS.filter((k) => k !== 'customer-id' && k !== 'customer-name')
      : CONSOLIDATION_ATTRIBUTE_KEYS
  }, [inMode, lockedChip])
  // S155 §4.2 — "see what you created": a shipment just made elsewhere (the
  // consolidation Apply screen's "View Shipment") rides back as a full row VM.
  // The table's default sort is by identifier, so a new `C7…` id would land
  // pages away; while this is set the row is PINNED to the top of page 1 and
  // highlighted. Cleared the moment the planner moves the query on (effect
  // below) — the pin is a one-time "here it is", not a sticky row.
  const [created, setCreated] = useState(location.state?.createdShipment ?? null)
  // Part 3 (S158, user 2026-09-23): the row most recently CHECKED in
  // consolidate mode gets the same highlight pulse `created` uses below — "the
  // eye can follow it" as it floats to the top. Unchecking never re-highlights
  // anything; the row just returns to its sorted place without a flash.
  const [lastCheckedId, setLastCheckedId] = useState(null)
  const [selectedShipmentId, setSelectedShipmentId] = useState(location.state?.selectedShipmentId ?? null)
  // Cell→tab mapping (S82): { key } token minted per qualifying cell click,
  // consumed by BottomBar to land the detail bar on the mapped tab.
  const [requestedTab, setRequestedTab] = useState(location.state?.requestedTab ?? null)
  const [activePanel, setActivePanel] = useState(() => location.state?.panel ?? 'exceptions')
  const [activeTab, setActiveTab] = useState(() => location.state?.tab ?? 'all')
  // S149: Orders → "See in Shipments" arrives with `state.orderNumber`; it
  // becomes a committed Order # chip via the search bar's `seedChips`. Built
  // once — a new array each render would re-trigger the bar's mount effect.
  const seedChips = useMemo(
    () => (location.state?.orderNumber ? [attrChip('order', location.state.orderNumber)] : null),
    [location.state?.orderNumber],
  )
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
  //
  // S150 — this memo never re-runs, so a shipment created DURING a session
  // (order create → direct shipment, src/data/index.js's overlay) only lands
  // here because /orders/create is a separate top-level route: returning to
  // Shipments remounts this component. That remount is load-bearing, not
  // incidental — if create ever becomes a modal or this route gains a
  // persistent layout, this memo needs a real dependency or the new shipment
  // goes missing from the count and the selected-row fallback below.
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

  // Consolidate mode lists ONLY Direct shipments (user, 2026-09-20: "C
  // shipments can appear only in non consol mode"). Ineligible rows used to
  // stay listed behind a disabled checkbox, and re-entering the mode from the
  // review screen (location.state.consolidate) had no sort reseed at all, so
  // Consolidation rows surfaced anyway. This is a MODE RULE, structural like
  // hiding the PGI/PGR tab — and deliberately NOT a visible chip, unlike the
  // CNS-10 customer lock (which IS one, because the planner chose it by
  // checking a row). It rides on the same criteria pipeline the table, the
  // counts and the glimpse already honour, so `searchCriteria` — the BAR's
  // own state — is left untouched and the planner's filter is restored intact
  // on exit.
  const effectiveCriteria = useMemo(() => {
    if (!inMode) return searchCriteria
    return {
      chips: [...(searchCriteria?.chips ?? []), attrChip('shipment-type', 'Direct')],
      text: searchCriteria?.text ?? '',
    }
  }, [inMode, searchCriteria])

  // Reset to the first page whenever the query identity (panel/tab/search/customer
  // scope) changes. Done during render (React's documented "adjust state on change"
  // pattern) rather than in an effect, so the stale-page query never fires — avoids
  // a wasted round-trip on every filter interaction in live mode.
  const queryIdentity = JSON.stringify([activePanel, activeTab, effectiveCriteria, selectedDataIds, sorting])
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
    searchCriteria: effectiveCriteria ?? undefined,
    sortBy: sorting[0]?.id,
    orderBy: sorting[0]?.desc ? 'desc' : 'asc',
    // Part 3 (S158): the selection is floated to the top of page 1 client-side
    // (tableRows below) from its own row snapshots — the server must EXCLUDE
    // those ids or a selected row would come back a second time on its normal
    // sorted page, duplicating it and shifting every offset after it.
    ...(inMode && selection.size ? { filter: { excludeIds: [...selection.keys()] } } : {}),
  }), [activePanel, activeTab, pageNumber, pageSize, effectiveCriteria, selectedDataIds, sorting, inMode, selection])

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

  // Part 3 (S158): the selection's own row snapshots, ordered by the ACTIVE
  // sort — the same numeric-aware compare gridService's mock path applies
  // server-side (localeCompare + numeric:true) — so the floated block on top
  // and the server-sorted page beneath it read as one continuous order, not
  // two differently-ordered lists stitched together. listParams.filter.excludeIds
  // above asks the SERVER to exclude these ids too, but the query for a listParams
  // change is async (isPlaceholderData holds the PRIOR page while it resolves) —
  // tableRows below still filters pageRows against the selection so a just-checked
  // row can never render twice (duplicate React key) during that gap.
  const selectedRows = useMemo(() => {
    if (!inMode || selection.size === 0) return []
    const { id: sortId, desc } = sorting[0] ?? DEFAULT_SORTING[0]
    const dir = desc ? -1 : 1
    return [...selection.values()].sort((a, b) =>
      String(a[sortId] ?? '').localeCompare(String(b[sortId] ?? ''), undefined, { numeric: true }) * dir)
  }, [inMode, selection, sorting])

  // The pin (S155 §4.2) and the consolidate-mode float (Part 3) both only ever
  // apply to page 1 — pinning either onto every page would be a row that
  // follows the planner around. Mutually exclusive in practice (the pin is a
  // "just created elsewhere" arrival outside the mode), so inMode picks
  // between them rather than trying to interleave both pins into one order.
  const tableRows = useMemo(() => {
    if (pageNumber !== 0) return pageRows
    if (inMode) return [...selectedRows, ...pageRows.filter((r) => !selection.has(r.id))]
    return created ? [created, ...pageRows.filter((r) => r.id !== created.id)] : pageRows
  }, [created, pageNumber, pageRows, inMode, selectedRows, selection])

  // The planner moved on (sort, page, search, tab, customer scope) — the pin
  // has done its job and must not outlive the query it was pinned into. Skips
  // the first run: `listParams` is a fresh object on mount and would otherwise
  // clear the pin before it ever rendered.
  const pinnedParamsRef = useRef(null)
  useEffect(() => {
    if (pinnedParamsRef.current === null) { pinnedParamsRef.current = listParams; return }
    if (pinnedParamsRef.current !== listParams) setCreated(null)
  }, [listParams])

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
  const { data: exceptionCounts = [], isLoading: exceptionsCountsLoading } = useCategoryCounts('exceptions', effectiveCriteria ?? undefined, selectedDataIds)
  const { data: monitoringCounts = [], isLoading: monitoringCountsLoading } = useCategoryCounts('monitoring', effectiveCriteria ?? undefined, selectedDataIds)
  const { data: pgipgrCounts = [], isLoading: pgipgrCountsLoading } = useCategoryCounts('pgipgr', effectiveCriteria ?? undefined, selectedDataIds)
  const countsReady = !exceptionsCountsLoading && !monitoringCountsLoading && !pgipgrCountsLoading

  const metrics = useMemo(() => {
    const c = (arr, cat) => arr.find(x => x.category === cat)?.count ?? 0
    return {
      dateIssues: c(exceptionCounts, 'date-issues'),
      routingReview: c(exceptionCounts, 'routing-review'),
      tenderIssues: c(exceptionCounts, 'tender-issues'),
      tenderReview: c(exceptionCounts, 'tender-review'),
      bidReview: c(exceptionCounts, 'bid-review'),
      orderChange: c(exceptionCounts, 'order-change'),
      hold: c(monitoringCounts, 'hold'),
      consolidation: c(monitoringCounts, 'consolidation'),
      sent: c(monitoringCounts, 'sent'),
      spotBid: c(monitoringCounts, 'spotbid'),
      approved: c(monitoringCounts, 'approved'),
      // No shipment is seeded onto the PGI/PGR panel, so these are 0 and the
      // widget mode's donuts would sit beside "0" badges. Fall back to the
      // widgets' own totals so the tab, the pill and the widget all say the
      // same number — and the moment PGI/PGR is really modelled, the live
      // count is non-zero and wins without anyone editing this.
      pgipgrErrors: c(pgipgrCounts, 'pgipgr-errors') || PGIPGR_DEMO_COUNTS.pgipgrErrors,
      ratingFailure: c(pgipgrCounts, 'rating-failure') || PGIPGR_DEMO_COUNTS.ratingFailure,
      manualPgipgr: c(pgipgrCounts, 'manual-pgipgr') || PGIPGR_DEMO_COUNTS.manualPgipgr,
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
  //
  // S154: that ruling is about a SEARCH narrowing the tabs — it still stands.
  // Consolidate mode is a different thing: a distinct stage of the page, not a
  // filter. PGI/PGR holds no shipments (its panel is a "Coming soon"
  // placeholder; its counts come from PGIPGR_DEMO_COUNTS) and can never offer a
  // consolidation candidate, so the tab is noise for the DURATION of the mode
  // only — it returns the moment the planner leaves.
  const visiblePanels = useMemo(
    () => (inMode ? Object.keys(PANEL_CONFIG).filter((k) => k !== 'pgipgr') : Object.keys(PANEL_CONFIG)),
    [inMode],
  )

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
    // A committed search takes over the sort (GS-16) and can auto-jump the
    // panel (GS-18) — both wrong for the customer LOCK's own automatic
    // recommit (S154): ShipmentsGlobalSearch calls this same onCommitQuery
    // path the moment `lockedChip` changes, purely to narrow the criteria,
    // not because the planner searched anything. In consolidate mode the
    // planner's own sort is left exactly as it was on entry, and the panel is
    // theirs too (they are scanning to check rows, not landing on a search's
    // fullest panel) — a real commit from
    // the planner while in mode still narrows the table via searchCriteria
    // above, it just doesn't fight those two.
    if (!inMode) {
      setSorting(next ? [{ id: RELEVANCE_SORT, desc: false }] : DEFAULT_SORTING)
      setLandOnPanel(next ? (opts?.landOnPanel ?? 'auto') : null)
    }
  }, [inMode])

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

  // `seedRow` — the row the planner is EDITING (the actions-menu "Edit" on a
  // Consolidation row, S155). It starts in the selection, so the anchor (and
  // with it the customer lock) exists from the first render; `priorCriteria`
  // is snapshotted here for exactly the reason `handleSelectionChange` takes
  // it on the first check — the lock is about to narrow the bar and exiting
  // must give the planner their own filter back.
  //
  // The seeded C row is NOT listed in the table (effectiveCriteria above lists
  // Direct only) and eligibility would refuse its checkbox anyway — it lives
  // purely in the selection Map, the header count and the review screen. The
  // review's post-apply "Edit Consolidated Shipment" already re-enters this
  // way through location.state.consolidate.rows, so it needs no change.
  const enterConsolidate = useCallback((seedRow) => {
    // Snapshot the UI state this mode overwrites below, so exiting restores
    // what the planner actually had instead of a hardcoded default. Includes
    // the panel/category tab (S154) — the planner may be ON PGI/PGR (hidden
    // for the duration of the mode, see visiblePanels above) when they press
    // Consolidate, and `handleSelectionChange`'s `{ ...prev, rows: next }`
    // spread below carries these fields through the first checkbox click
    // unchanged, same as priorViewMode.
    setConsolidate({
      rows: seedRow ? new Map([[seedRow.id, seedRow]]) : new Map(),
      ...(seedRow ? { priorCriteria: searchCriteria } : {}),
      priorViewMode: viewMode,
      priorPanel: activePanel,
      priorTab: activeTab,
    })
    setSelectedShipmentId(null)   // the detail bar is hidden in mode; nothing stays "open"
    setViewMode('pills')          // the widgets toggle is hidden; pills are the mode's face
    // No sort reseed: the mode used to force `shipmentType desc` purely to
    // float Direct rows above Consolidation ones. The mode now LISTS only
    // Direct rows (effectiveCriteria above), so there is nothing to float and
    // the planner's own sort survives the round trip untouched.
    //
    // Land on the normal landing panel (same target/reset handlePanelSelect
    // uses) — PGI/PGR just vanished from the tab row and can hold no
    // consolidation candidate, so staying on it would strand the planner on
    // a tab that no longer renders.
    setActivePanel('exceptions')
    setActiveTab('all')
  }, [searchCriteria, viewMode, activePanel, activeTab])
  // Stable identity — ShipmentTable's column defs memo on it; an inline arrow
  // would rebuild every column on every render.
  const handleEditConsolidation = useCallback((row) => enterConsolidate(row), [enterConsolidate])
  const exitConsolidate = useCallback(() => {
    // Restore the snapshot taken on entry. Re-entering via "Modify Selection"
    // (the lazy useState initialiser above) creates `{ rows }` with no
    // snapshot — there is nothing prior to restore, so leave viewMode/panel
    // as they are; the optional chaining below no-ops in that case.
    if (consolidate?.priorViewMode) setViewMode(consolidate.priorViewMode)
    if (consolidate?.priorPanel) {
      setActivePanel(consolidate.priorPanel)
      setActiveTab(consolidate.priorTab ?? 'all')
    }
    // Cancelling while the customer lock is engaged restores whatever search
    // criteria were committed before the first checked row locked it — same
    // snapshot `handleSelectionChange` took, same restore as emptying the
    // selection by hand. `'priorCriteria' in consolidate` (not truthiness)
    // distinguishes "never locked this visit" from "locked, and there was
    // genuinely no prior filter" (a real `null` snapshot) — re-entry via
    // "Modify Selection" never took a snapshot, so this correctly no-ops.
    if (consolidate && 'priorCriteria' in consolidate) setSearchCriteria(consolidate.priorCriteria ?? null)
    setConsolidate(null)
  }, [consolidate])

  // Return-intent re-application (S158 plan §4). This page now stays MOUNTED
  // under every Shipments sheet (consolidation review, the two order-change
  // routes) instead of unmounting — the lazy useState initialisers above
  // still cover the FIRST mount (location.state read once), but a planner
  // closing a sheet back onto an already-mounted ShipmentsRoute needs the
  // SAME fields re-read from the fresh location.state, which only an effect
  // can do. `consolidateExit` only ever arrives on a return (a fresh mount
  // never carries it), so it lives here rather than in the initialisers too.
  const applyIntent = useCallback((state) => {
    if (!state) return
    if (state.consolidateExit) exitConsolidate()
    else if (state.consolidate) {
      setConsolidate({ rows: new Map((state.consolidate.rows ?? []).map((r) => [r.id, r])) })
    }
    if (state.createdShipment) setCreated(state.createdShipment)
    if (state.selectedShipmentId !== undefined) setSelectedShipmentId(state.selectedShipmentId)
    if (state.requestedTab !== undefined) setRequestedTab(state.requestedTab)
    // Unlike the mount-time defaults ('exceptions' / 'all'), a return with no
    // panel/tab key must leave whatever's already showing alone — e.g.
    // "Modify Selection" carries only `rows`, and stomping the current panel
    // here would fight exitConsolidate's own prior-panel restore above.
    if (state.panel) setActivePanel(state.panel)
    if (state.tab) setActiveTab(state.tab)
  }, [exitConsolidate])
  // Skip the first run — the lazy initialisers already applied this exact
  // location.state at mount; re-running it here too would be a harmless but
  // pointless double-apply for a fresh mount, and an actively wrong one the
  // one time it wouldn't be (a deep link seeded with `consolidateExit: true`,
  // which should never fire exitConsolidate against a mode that was never
  // entered).
  const intentAppliedOnceRef = useRef(false)
  useEffect(() => {
    if (!intentAppliedOnceRef.current) { intentAppliedOnceRef.current = true; return }
    applyIntent(location.state)
    // Fires only when the planner actually navigates back to this page
    // (location.key changes) — not on every re-render applyIntent's own
    // identity changes on, which would re-run the intent against a location
    // that hasn't moved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  const handleSelectionChange = useCallback((rows, checked) => {
    if (!consolidate) return
    // One customer per consolidation (CNS-10). The anchor normally enforces it
    // through `eligibility`, but a BATCH check arriving before any anchor
    // exists (the header checkbox on a fresh mode) would check every eligible
    // row across every customer — the first one then locks the customer, the
    // table narrows, and the rest stay selected but invisible. Narrowing here,
    // in the one path every caller routes through, is the whole fix (S155 §1.3).
    const scopeId = anchorCustomerId ?? rows[0]?.customerId
    const picked = checked ? rows.filter((r) => r.customerId === scopeId) : rows
    const next = new Map(consolidate.rows)
    for (const r of picked) checked ? next.set(r.id, r) : next.delete(r.id)
    // Part 3 (S158): highlight the last row THIS click checked (batch checks —
    // the header box — just pick the last; a pulse per row would be noise).
    // Unchecking sets nothing: the row returns to its sorted place unflashed.
    if (checked && picked.length) setLastCheckedId(picked[picked.length - 1].id)
    const wasEmpty = consolidate.rows.size === 0
    const nowEmpty = next.size === 0
    setConsolidate({
      ...consolidate,
      rows: next,
      // The first checked row locks the customer (anchor, derived above from
      // Map insertion order) — snapshot the planner's own committed filter
      // here so releasing the lock (emptying the selection, or Cancel above)
      // can restore it instead of leaving the lock's narrowing stuck.
      ...(wasEmpty && !nowEmpty ? { priorCriteria: searchCriteria } : {}),
    })
    // Unchecking back to zero releases the lock the same way Cancel does —
    // restore what was committed before the lock engaged. Guarded the same
    // way as exitConsolidate's restore above.
    if (!wasEmpty && nowEmpty && 'priorCriteria' in consolidate) {
      setSearchCriteria(consolidate.priorCriteria ?? null)
    }
  }, [consolidate, searchCriteria, anchorCustomerId])
  // Clear all in the search bar while the lock is engaged (S155 §1.2): the
  // planner confirmed they also want the selection gone. Deliberately does NOT
  // restore `priorCriteria` — they asked for an EMPTY bar, not their old
  // filter back — and drops the key so the next lock snapshots afresh.
  const handleClearLocked = useCallback(() => {
    setConsolidate((prev) => {
      if (!prev) return prev
      // eslint-disable-next-line no-unused-vars
      const { priorCriteria, ...rest } = prev
      return { ...rest, rows: new Map() }
    })
  }, [])
  const eligibility = useCallback((row) => consolidationEligibility(row, anchorCustomerId), [anchorCustomerId])
  const proceedToReview = useCallback(() => {
    openSheet('/shipments/consolidate/review', { state: { rows: [...selection.values()] } })
  }, [openSheet, selection])

  return (
    <AppShell
      sidebarHidden={inMode}
      onMainClick={useCallback(() => {
        if (columnPanelOpen) closeColumnPanel() // guarded — may intercept with the unsaved dialog
        if (tabPanelOpen) setTabPanelOpen(false)
      }, [columnPanelOpen, tabPanelOpen, closeColumnPanel])}
      searchSlot={
        <ShipmentsGlobalSearch
          onCommitQuery={handleCommitQuery}
          onSelectShipment={handleSelectShipment}
          seedChips={seedChips}
          attributeKeys={searchAttributeKeys}
          lockedChip={lockedChip}
          lockedClearMessage={anchor
            ? `Clearing the search will also clear all ${selection.size} selected shipment${selection.size === 1 ? '' : 's'} for ${anchor.customerName || anchor.customerId}.`
            : null}
          onClearLocked={handleClearLocked}
          placeholder={anchor ? `Search for ${anchor.customerName || anchor.customerId}` : 'Search in Shipments'}
        />
      }
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
      <PageHeader title={inMode ? 'Shipments Consolidation' : 'Shipments'} style={{ marginBottom: inMode ? 8 : 25 }}>
        {inMode && (
          <span className="consolidate-cancel">
            <Button variant="secondary" onClick={exitConsolidate}>Cancel</Button>
          </span>
        )}
        <Button
          variant="primary"
          icon={inMode ? <Combine size={20} /> : <Boxes size={20} />}
          disabled={inMode && selection.size < 2}
          onClick={inMode ? proceedToReview : () => enterConsolidate()}
        >
          {/* S154 (user, 2026-09-20): the primary reads "Select to Consolidate"
              at zero — "Consolidate 0 Shipments" implied a valid action —
              then pluralizes correctly from 1 up (was hardcoded plural,
              "Consolidate 1 Shipments"). The button itself stays disabled
              until 2 are selected regardless of label. */}
          {inMode
            ? (selection.size === 0 ? 'Select to Consolidate' : `Consolidate ${selection.size} Shipment${selection.size === 1 ? '' : 's'}`)
            : 'Consolidate'}
        </Button>
      </PageHeader>
      {/* The row holds the same slot for the whole mode (S155 §1.4) — before
          an anchor exists it carries the instruction, after it the locked
          customer. Rendering it only when anchored made the tabs jump the
          moment the first row was checked. */}
      {inMode && (
        <div className="consolidate-customer text-label-sm-regular">
          {anchor ? (
            <>
              <span>Selected Customer:</span>
              <Badge variant="blue">{anchor.customerName || anchor.customerId}</Badge>
            </>
          ) : (
            <span>Select to consolidate. Only direct shipments are consolidatable</span>
          )}
        </div>
      )}
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
        hideViewToggle={inMode}
      />
      <TableControls
        itemCount={totalCount}
        hideExport={inMode}
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
          shipments={tableRows}
          // Part 3 (S158): in consolidate mode the pulse follows the row just
          // checked (floating to the top), not the created-shipment pin —
          // the two never apply at once (see tableRows above).
          highlightId={inMode ? lastCheckedId : (created?.id ?? null)}
          selectedId={inMode ? null : selectedShipmentId}
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
          selectable={inMode}
          selection={selection}
          onSelectionChange={handleSelectionChange}
          eligibility={eligibility}
          onEditConsolidation={handleEditConsolidation}
        />
      )}
      {/* No onToggleColumnPanel prop here (Fix 3, 2026-08-10) — BottomBar dropped
          its own onToggleColumnPanel prop since the Routing Guide tab (its only
          consumer) removed the gear that used to call it; ShipmentTable above
          still gets handleToggleColumnPanel for the shipments-list column panel. */}
      {/* Part 6 (S158, user 2026-09-23): PGI/PGR is widget-only — no rows to
          open a detail bar against — so BottomBar (which hosts ShipmentsBar)
          never mounts there. Switching to PGI/PGR with a shipment open closes
          it, same as any other unmount. */}
      {!inMode && activePanel !== 'pgipgr' && (
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
      )}
    </AppShell>
  )
}

export default ShipmentsRoute
