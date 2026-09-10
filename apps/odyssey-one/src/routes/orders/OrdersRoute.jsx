import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Inbox, Plus } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Button, EmptyState, ModalMedium, PageHeader, Tab } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import OrdersToolbar from '../../components/orders/OrdersToolbar'
import OrdersTable from '../../components/orders/OrdersTable'
import { primaryRowAction } from '../../components/orders/ordersColumns'
import OrdersExportModal, { EXPORT_ROW_CAP } from '../../components/orders/OrdersExportModal'
import OrdersGlobalSearch from '../../components/global-search/OrdersGlobalSearch'
import { toRequestFilters } from '../../search/orders/toRequest'
import { useOrderList } from '../../api/queries/useOrderList'
import { useOrderTabCounts } from '../../api/queries/useOrderTabCounts'
import { useSubmitDraftOrder } from '../../api/queries/useSubmitDraftOrder'
import { useCancelOrder } from '../../api/queries/useCancelOrder'
import { getOrderList } from '../../api/services/orderService'
import { mapOrderListRow } from '../../api/mappers/mapOrderListRow'
import { useCustomers } from '../../contexts/CustomersContext'
import '../../components/orders/orders.css'

/**
 * OrdersRoute — the Order Summary Page (screen 0 of Efrain's Orders design).
 * PageHeader (+ inert Create Order in the S50b actions cluster) · toolbar ·
 * TanStack grid · pagination via the @odyssey/ui Paginator (driven by the table
 * instance). Mock-mode data layer shaped like POST /order-service/v3/order/list
 * (Phase-2 LLD) — live flip is an env var.
 */
// Main tabs are three disjoint POPULATIONS, not status filters over one list
// (ORD-24, user ruling 2026-09-05 — supersedes the ORD-23 status-intersection
// model this comment used to describe). The population predicate travels on
// the request as `tab` (OrderListRequest.tab) and is applied SERVER-SIDE
// (mock matcher + SQL) before the panel's own filters AND on top — see
// orderService.ts's matchesTab / api/_lib/orders.mjs's TAB_PREDICATES.
const MAIN_TABS = [
  { key: 'created', label: 'Created', countKey: 'created' },
  { key: 'draft', label: 'Draft', countKey: 'draft' },
  { key: 'validation-errors', label: 'Validation Errors', countKey: 'validationErrors' },
]

// Legacy deep-link compatibility (ORD-24): old bookmarks/widgets sent
// `state: { tab: 'all' }` before the All → Created rename. One-line map so a
// stale link still lands on the right tab.
const LEGACY_TAB_MAP = { all: 'created' }

// Per-tab default header sort (S94 decision — Draft's is an inference, cheap
// to change: lastEdit desc). Reapplied whenever the tab switches.
// Created defaults to newest-first (created_at DESC) — S113 Task 3 (Fix A). The
// prior default (idLabel/order_number DESC) lexicographically sorted a TEXT
// column: letter-prefixed order numbers sort above every 13-digit zero-padded
// number the server mints for a blank Order Number, burying a freshly created
// order dozens of pages deep. Order Number stays selectable via its column header.
const DEFAULT_SORT = {
  created: [{ id: 'created', desc: true }],
  draft: [{ id: 'lastEdit', desc: true }],
  'validation-errors': [{ id: 'errorCount', desc: true }],
}

// Column id → OrderListRequest sort field (ids that differ from wire names).
const SORT_FIELD_BY_COLUMN = {
  idLabel: 'orderNumber', status: 'orderStatus', weight: 'weight', volume: 'volume',
  shipperLocation: 'shipperLocation', destinationLocation: 'destinationLocation',
}

export default function OrdersRoute() {
  const navigate = useNavigate()
  // Tab deep-link (S91 Home widgets): navigate('/orders', { state: { tab } }).
  const location = useLocation()
  // Navbar customer scope — same first-order filter the Shipments grid applies
  // (CustomersContext.selectedDataIds → gridService customerIds).
  const { selectedDataIds } = useCustomers()
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 }) // pageIndex 0-based (TanStack)
  // Main tabs (Orders Tabs mock) — three populations (ORD-24). LEGACY_TAB_MAP
  // covers a deep link built before the All → Created rename.
  const [activeTab, setActiveTab] = useState(() => {
    const requested = location.state?.tab ?? 'created'
    return LEGACY_TAB_MAP[requested] ?? requested
  })
  // Never strand the planner on an empty tab (user, 2026-09-07). Set whenever
  // the CRITERIA change (search commit, filter apply); consumed once the new
  // counts arrive. Not set by a tab CLICK — an explicitly chosen tab sticks
  // even at zero, so a genuinely empty Draft stays reachable. Same shape as
  // ShipmentsRoute's GS-18 landing jump (one-shot flag + render-time adjust).
  const [landOnTab, setLandOnTab] = useState(false)
  // Header sorting (S94) — TanStack-shaped, lifted here so it can drive the
  // request; resets to the tab's default on every tab switch (handleTabSelect).
  const [sorting, setSorting] = useState(() => DEFAULT_SORT[activeTab] ?? DEFAULT_SORT.created)
  // Submit/Cancel row actions confirm before mutating (LINX-11663/10258).
  const [confirmAction, setConfirmAction] = useState(null) // { type: 'submit' | 'cancel', row }
  const submitDraftOrder = useSubmitDraftOrder()
  const cancelOrder = useCancelOrder()
  // Export to Excel (LINX-9896 BR V) — toolbar Export opens the confirm modal.
  const [exportOpen, setExportOpen] = useState(false)
  // Panel filters (LINX-10285/11663/11659). ONE shared bag now, not per-tab
  // (user ruling, 2026-09-04, Ramesh meeting: "merge all filters into one so
  // results are then applied to tabs" — overrides the old per-tab scoping).
  // Survives a tab switch: switching tabs must not clear what the user typed.
  const [filters, setFilters] = useState({})
  // Panel open state lives HERE, not in OrdersGlobalSearch: the panel also
  // opens from the results preview's "filters" link, a different subtree.
  const [filtersOpen, setFiltersOpen] = useState(false)
  // Committed GlobalSearch free text (S128). Deliberately NOT per-tab: a search
  // is a question about ORDERS, not about the tab you happen to be on, and the
  // Shipments bar behaves the same way across its panels. The tab's own status
  // filter still applies on top, so the tab keeps its meaning.
  const [searchText, setSearchText] = useState('')
  // Committed bar CHIPS (S130) — the structured half of a search commit, the
  // twin of `searchText`'s free half. A SEPARATE path from `filters`: the
  // panel writes a subset of its fields out as chips (panelChips.js), so bar
  // criteria and panel state are two different shapes over the same fields,
  // not one bag. Not per-tab, for the same reason `searchText` isn't: a
  // search is a question about ORDERS.
  const [searchChips, setSearchChips] = useState([])

  const sortField = SORT_FIELD_BY_COLUMN[sorting[0]?.id] ?? sorting[0]?.id ?? 'orderNumber'
  const panelFilters = useMemo(() => toRequestFilters(activeTab, filters), [activeTab, filters])

  const request = useMemo(() => {
    const reqFilters = {
      ...panelFilters,
      // Raw text; getOrderList resolves it into needles where the full dataset
      // is (mock) or by asking the server (live).
      ...(searchText ? { searchText } : {}),
      ...(searchChips.length ? { searchChips } : {}),
    }
    return {
      tab: activeTab,
      pagination: { pageNumber: pagination.pageIndex + 1, pageSize: pagination.pageSize },
      sort: { field: sortField, direction: sorting[0]?.desc ? 'desc' : 'asc' },
      ...(Object.keys(reqFilters).length ? { filters: reqFilters } : {}),
    }
  }, [activeTab, pagination, sortField, sorting, panelFilters, searchText, searchChips])

  // Reset to the first page when the customer scope changes (query identity
  // change — the Shipments-proven pattern).
  const scopeKey = selectedDataIds.join(',')
  useEffect(() => {
    setPagination(p => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }))
  }, [scopeKey])

  // The badges count what the grid is filtered by, WITHOUT any tab restriction
  // — each badge applies its OWN population predicate over the same filtered
  // set server-side (D1), which is what makes the three numbers differ
  // (S131: "tabs badge counters are not updating in orders"). Panel params +
  // bar chips + free text all ride along; no `tab` key here on purpose.
  const countFilters = useMemo(() => ({
    ...panelFilters,
    ...(searchText ? { searchText } : {}),
    ...(searchChips.length ? { searchChips } : {}),
  }), [panelFilters, searchText, searchChips])

  const { data, isPending, isFetching, isError, refetch } = useOrderList(request, selectedDataIds)
  const { data: tabCounts } = useOrderTabCounts(selectedDataIds, countFilters)

  // Consume the landing flag: if the active population came back empty under
  // the new criteria and another has rows, move to the fullest. Render-time
  // adjust (React's "derive state during render" pattern, as ShipmentsRoute
  // does) rather than an effect, so the empty tab never paints first.
  if (landOnTab && tabCounts) {
    const active = MAIN_TABS.find(t => t.key === activeTab)
    const fullest = MAIN_TABS
      .filter(t => (tabCounts[t.countKey] ?? 0) > 0)
      .sort((a, b) => tabCounts[b.countKey] - tabCounts[a.countKey])[0]
    if ((tabCounts[active?.countKey] ?? 0) === 0 && fullest) {
      setActiveTab(fullest.key)
      setSorting(DEFAULT_SORT[fullest.key] ?? DEFAULT_SORT.created)
    }
    setLandOnTab(false)
  }

  const handleTabSelect = (key) => {
    if (key === activeTab) return
    setActiveTab(key)
    setPagination(p => ({ ...p, pageIndex: 0 }))
    setSorting(DEFAULT_SORT[key] ?? DEFAULT_SORT.created)
    // Filters deliberately survive the switch (ORD-23) — one field set on
    // every tab means the panel's criteria still make sense on the new one.
  }

  // A committed search re-ranks the whole list — page 5 of the old result set
  // is meaningless against the new one.
  const handleSearch = useCallback((text) => {
    setSearchText(text)
    setPagination(p => ({ ...p, pageIndex: 0 }))
    setLandOnTab(true)
  }, [])

  // "Show all results" — both halves of a bar commit land in one gesture, so
  // the list is never briefly filtered by the chips without the text (or the
  // reverse). Same page reset: a narrowed list has fewer pages.
  const handleCommitCriteria = useCallback((chips, text) => {
    setSearchChips(chips)
    setSearchText(text)
    setPagination(p => ({ ...p, pageIndex: 0 }))
    setLandOnTab(true)
  }, [])

  // Every way into an order goes through here — the grid's ⋮ menu, the VE tab's
  // Resolve button, and (S131) a click on a search-preview row. One handler, so
  // "Edit" cannot mean two different destinations depending on where it started.
  const handleRowAction = useCallback((action, row) => {
    // View mirrors the full-row click; Edit reopens the order in the
    // create flow (?draft hydrates via getDraft, falling back to
    // getOrderView for non-session rows). Submit/Cancel confirm first
    // (below); Resolve/Copy/Restore stay no-ops until their features land.
    if (action === 'View') navigate(`/orders/${encodeURIComponent(row.id)}`)
    else if (action === 'Edit') navigate(`/orders/create?draft=${encodeURIComponent(row.id)}`)
    else if (action === 'Submit') setConfirmAction({ type: 'submit', row })
    else if (action === 'Cancel') setConfirmAction({ type: 'cancel', row })
    // Resolve reopens the order in resolution mode (LINX-11137); the
    // row's errorCount/customer/source ride in history state so the
    // seeded errors match what the Validation Errors tab claims.
    else if (action === 'Resolve')
      navigate(`/orders/create?resolve=${encodeURIComponent(row.id)}`, {
        state: { errorCount: row.errorCount, interfaceErrorCount: row.interfaceErrorCount, interfaceErrorClass: row.interfaceErrorClass, customer: row.customer, orderSource: row.orderSource },
      })
  }, [navigate])

  /**
   * A search-preview row click (S131) opens the order the same way the grid
   * would: the row's own status picks View / Edit / Resolve (`primaryRowAction`),
   * and the destination is `handleRowAction`'s. The preview row carries the
   * status fields as `data-*` (see the adapter's `buildOrderRow`), so this maps
   * them back onto the grid VM's field names the rule expects.
   */
  const handleMatchClick = useCallback((match) => {
    const row = {
      id: match.id,
      status: match['data-order-status'],
      draftOrderStatus: match['data-draft-status'],
      orderSource: match['data-order-source'],
      errorCount: match['data-error-count'] === '' ? null : Number(match['data-error-count']),
      customer: match.customer,
    }
    if (row.id) handleRowAction(primaryRowAction(row), row)
  }, [handleRowAction])

  const handleApplyFilters = useCallback((draft) => {
    setFilters(draft)
    setPagination(p => ({ ...p, pageIndex: 0 })) // a narrowed list may have fewer pages than the current index
    setLandOnTab(true)
  }, [])
  // Paging during a background refetch is intentionally NOT gated: the @odyssey/ui
  // Paginator disables nav via getCan{Previous,Next}Page(), and
  // `placeholderData: keepPreviousData` keeps the current page visible during an
  // in-flight refetch — so free mid-fetch paging is fine (the standard TanStack
  // pattern; accepted over the old freeze-while-fetching).

  // Paginator drives setPageSize on the table → onPaginationChange. Reset to the
  // first page on a page-size change (preserves the prior UX, regardless of
  // TanStack's internal pageIndex math).
  const handlePaginationChange = (updater) => {
    setPagination(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return next.pageSize !== prev.pageSize ? { ...next, pageIndex: 0 } : next
    })
  }

  // Export current tab → Excel (LINX-9896 BR V), same request (filters+sort)
  // re-paged to the 25k cap; dynamic `xlsx` import keeps it out of the main chunk.
  const handleExport = async () => {
    const res = await getOrderList(
      { ...request, pagination: { pageNumber: 1, pageSize: EXPORT_ROW_CAP } },
      selectedDataIds,
    )
    const vms = res.orders.map(mapOrderListRow)
    const EXPORT_SHAPES = {
      created: r => ({ 'Order Number': r.idLabel, Hazardous: r.hazardous ? 'Hazmat' : '-', 'Order Source': r.orderSource,
        'Order Status': r.status, Customer: r.customer, 'Ship Direction': r.shipDirection,
        'Freight Terms': r.freightTerms, Equipment: r.equipment,
        'Shipper Location': `${r.shipperLocation.id} ${r.shipperLocation.name} ${r.shipperLocation.address}`.trim(),
        'Destination Location': `${r.destinationLocation.id} ${r.destinationLocation.name} ${r.destinationLocation.address}`.trim(),
        'Latest Pickup Date and Time': r.latestPickup, 'Latest Delivery Date and Time': r.latestDelivery,
        'Gross Weight': r.weight, Volume: r.volume }),
      draft: r => ({ 'Order Number': r.idLabel, Customer: r.customer, Created: r.created,
        'Created By': r.createdBy, 'Last Edit': r.lastEdit }),
      'validation-errors': r => ({ 'Order Number': r.idLabel, Customer: r.customer,
        'Draft Order Status': r.draftOrderStatus, 'Errors Count': r.errorCount ?? '' }),
    }
    const shaped = vms.map(EXPORT_SHAPES[activeTab] ?? EXPORT_SHAPES.created)
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(shaped)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Orders')
    XLSX.writeFile(wb, `orders-${activeTab}-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <AppShell
      // Filters live in the navbar bar's FilterButton, with the panel dropping
      // beneath it — the same slot + placement Shipments uses (user ruling,
      // 2026-08-20). The Orders search half is phase 2.
      searchSlot={
        <OrdersGlobalSearch
          tab={activeTab}
          filters={filters}
          onApply={handleApplyFilters}
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          onSearch={handleSearch}
          onCommitCriteria={handleCommitCriteria}
          onMatchClick={handleMatchClick}
        />
      }
    >
      <div className="orders-page">
        {/* marginBottom 25 = the Shipments header→tabs gap (ShipmentsRoute) */}
        <PageHeader title="Orders" style={{ marginBottom: 25 }}>
          <Button variant="primary" icon={<Plus {...ICON_MD} />} onClick={() => navigate('/orders/create')}>
            Create Order
          </Button>
        </PageHeader>

        <div className="orders-tabs">
          {MAIN_TABS.map(tab => (
            <Tab
              key={tab.key}
              label={tab.label}
              count={tabCounts?.[tab.countKey] ?? null}
              current={activeTab === tab.key}
              onClick={() => handleTabSelect(tab.key)}
            />
          ))}
        </div>

        {/* The secondary Filters trigger is gone (ORD-23) — the bar's own
            FilterButton is the only way in; the panel still renders in the
            GlobalSearch slot above, never next to the grid. */}
        <OrdersToolbar
          totalCount={data?.totalCount}
          onExportClick={() => setExportOpen(true)}
        />

        {isError ? (
          <div className="orders-page__status">
            <span className="text-label-sm-regular">Something went wrong loading orders.</span>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : !isPending && (data?.rows.length ?? 0) === 0 ? (
          <EmptyState icon={<Inbox size={32} />} message="No orders found" />
        ) : (
          /* Row clicking removed (user, 2026-07-29) — the kebab's View action
             is the single way into the Order Summary page; full-row targets
             fought the per-row action buttons. isPending (first mount, no data
             yet) → the shell's whole-table Spinner; isFetching (background
             refetch/tab-change) → per-cell "Loading…" text. */
          <OrdersTable
            tab={activeTab}
            loading={isPending}
            loadingRows={isFetching}
            rows={data?.rows ?? []}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            sorting={sorting}
            onSortingChange={setSorting}
            totalCount={data?.totalCount ?? 0}
            onRowAction={handleRowAction}
          />
        )}

        {confirmAction?.type === 'submit' && (
          <ModalMedium
            title="Submit order"
            onClose={() => setConfirmAction(null)}
            ariaLabel="Submit order"
            footer={
              <>
                <Button variant="secondary" size="lg" onClick={() => setConfirmAction(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    submitDraftOrder.mutate(confirmAction.row.id)
                    setConfirmAction(null)
                  }}
                >
                  Submit
                </Button>
              </>
            }
          >
            <p className="text-label-sm-regular">Are you sure you want to submit?</p>
          </ModalMedium>
        )}

        {confirmAction?.type === 'cancel' && (
          <ModalMedium
            title="Cancel order"
            onClose={() => setConfirmAction(null)}
            ariaLabel="Cancel order"
            footer={
              <>
                <Button variant="secondary" size="lg" onClick={() => setConfirmAction(null)}>
                  Keep order
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    cancelOrder.mutate(confirmAction.row.id)
                    setConfirmAction(null)
                  }}
                >
                  Cancel order
                </Button>
              </>
            }
          >
            <p className="text-label-sm-regular">Are you sure you want to cancel the order?</p>
          </ModalMedium>
        )}

        {exportOpen && (
          <OrdersExportModal
            tab={activeTab}
            rowCount={data?.totalCount ?? 0}
            onExport={handleExport}
            onClose={() => setExportOpen(false)}
          />
        )}
      </div>
    </AppShell>
  )
}
