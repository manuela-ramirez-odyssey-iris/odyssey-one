import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Inbox, Plus } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Button, EmptyState, ModalMedium, PageHeader, Tab } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import OrdersToolbar from '../../components/orders/OrdersToolbar'
import OrdersTable from '../../components/orders/OrdersTable'
import OrdersExportModal, { EXPORT_ROW_CAP } from '../../components/orders/OrdersExportModal'
import OrdersGlobalSearch from '../../components/global-search/OrdersGlobalSearch'
import { activeFilterCount, toRequestFilters } from '../../search/orders/toRequest'
import { useOrderList } from '../../api/queries/useOrderList'
import { useOrderTabCounts } from '../../api/queries/useOrderTabCounts'
import { useSubmitDraftOrder } from '../../api/queries/useSubmitDraftOrder'
import { useCancelOrder } from '../../api/queries/useCancelOrder'
import { getOrderList, VALIDATION_ERROR_STATUSES } from '../../api/services/orderService'
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
// Main tabs act as status filters (Shipments-pattern): All = unfiltered,
// Draft = the Draft status, Validation Errors = the failure statuses (orders
// needing error validation — VALIDATION_ERROR_STATUSES).
const MAIN_TABS = [
  { key: 'all', label: 'All', statuses: null, countKey: 'all' },
  { key: 'draft', label: 'Draft', statuses: ['Draft'], countKey: 'draft' },
  { key: 'validation-errors', label: 'Validation Errors', statuses: VALIDATION_ERROR_STATUSES, countKey: 'validationErrors' },
]

// Per-tab default header sort (S94 decision — Draft's is an inference, cheap
// to change: lastEdit desc). Reapplied whenever the tab switches.
// All defaults to newest-first (created_at DESC) — S113 Task 3 (Fix A). The
// prior default (idLabel/order_number DESC) lexicographically sorted a TEXT
// column: letter-prefixed order numbers sort above every 13-digit zero-padded
// number the server mints for a blank Order Number, burying a freshly created
// order dozens of pages deep. Order Number stays selectable via its column header.
const DEFAULT_SORT = {
  all: [{ id: 'created', desc: true }],
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
  // Main tabs (Orders Tabs mock) — status filters over the same list query.
  const [activeTab, setActiveTab] = useState(() => location.state?.tab ?? 'all')
  // Header sorting (S94) — TanStack-shaped, lifted here so it can drive the
  // request; resets to the tab's default on every tab switch (handleTabSelect).
  const [sorting, setSorting] = useState(() => DEFAULT_SORT[activeTab] ?? DEFAULT_SORT.all)
  // Submit/Cancel row actions confirm before mutating (LINX-11663/10258).
  const [confirmAction, setConfirmAction] = useState(null) // { type: 'submit' | 'cancel', row }
  const submitDraftOrder = useSubmitDraftOrder()
  const cancelOrder = useCancelOrder()
  // Export to Excel (LINX-9896 BR V) — toolbar Export opens the confirm modal.
  const [exportOpen, setExportOpen] = useState(false)
  // Panel filters (LINX-10285/11663/11659), keyed BY TAB: the three tabs
  // specify disjoint filter sets, so one shared bag would carry a value into a
  // tab whose panel never shows that field — an invisible filter.
  const [filtersByTab, setFiltersByTab] = useState({})
  const tabFilters = filtersByTab[activeTab]
  // Panel open state lives HERE, not in OrdersGlobalSearch: two triggers drive
  // one panel — the navbar bar's FilterButton and the table toolbar's Filters
  // button — and they sit in different subtrees, so neither can own it.
  const [filtersOpen, setFiltersOpen] = useState(false)
  // Committed GlobalSearch free text (S128). Deliberately NOT per-tab: a search
  // is a question about ORDERS, not about the tab you happen to be on, and the
  // Shipments bar behaves the same way across its panels. The tab's own status
  // filter still applies on top, so the tab keeps its meaning.
  const [searchText, setSearchText] = useState('')

  const tabStatuses = MAIN_TABS.find(t => t.key === activeTab)?.statuses
  const sortField = SORT_FIELD_BY_COLUMN[sorting[0]?.id] ?? sorting[0]?.id ?? 'orderNumber'
  const request = useMemo(() => {
    // Tab statuses first, panel filters over them. They can't collide: only the
    // All tab exposes an Order Status field, and its tabStatuses is null; the
    // VE tab's status filter is the separate `draftOrderStatuses`.
    const filters = {
      ...(tabStatuses ? { orderStatuses: tabStatuses } : {}),
      ...toRequestFilters(activeTab, tabFilters),
      // Raw text; getOrderList resolves it into needles where the full dataset
      // is (mock) or by asking the server (live).
      ...(searchText ? { searchText } : {}),
    }
    return {
      pagination: { pageNumber: pagination.pageIndex + 1, pageSize: pagination.pageSize },
      sort: { field: sortField, direction: sorting[0]?.desc ? 'desc' : 'asc' },
      ...(Object.keys(filters).length ? { filters } : {}),
    }
  }, [pagination, sortField, sorting, tabStatuses, activeTab, tabFilters, searchText])

  // Reset to the first page when the customer scope changes (query identity
  // change — the Shipments-proven pattern).
  const scopeKey = selectedDataIds.join(',')
  useEffect(() => {
    setPagination(p => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }))
  }, [scopeKey])

  const { data, isPending, isFetching, isError, refetch } = useOrderList(request, selectedDataIds)
  const { data: tabCounts } = useOrderTabCounts(selectedDataIds)

  const handleTabSelect = (key) => {
    if (key === activeTab) return
    setActiveTab(key)
    setPagination(p => ({ ...p, pageIndex: 0 }))
    setSorting(DEFAULT_SORT[key] ?? DEFAULT_SORT.all)
    // OrdersGlobalSearch closes its own panel on a tab change — the field set
    // changes with the tab, so an open panel would show the previous one.
  }

  // A committed search re-ranks the whole list — page 5 of the old result set
  // is meaningless against the new one.
  const handleSearch = useCallback((text) => {
    setSearchText(text)
    setPagination(p => ({ ...p, pageIndex: 0 }))
  }, [])

  const handleApplyFilters = useCallback((draft) => {
    setFiltersByTab(prev => ({ ...prev, [activeTab]: draft }))
    setPagination(p => ({ ...p, pageIndex: 0 })) // a narrowed list may have fewer pages than the current index
  }, [activeTab])
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
      all: r => ({ 'Order Number': r.idLabel, Hazardous: r.hazardous ? 'Hazmat' : '-', 'Order Source': r.orderSource,
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
    const shaped = vms.map(EXPORT_SHAPES[activeTab] ?? EXPORT_SHAPES.all)
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
          filters={tabFilters}
          onApply={handleApplyFilters}
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          onSearch={handleSearch}
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

        {/* Filters here is a TRIGGER only — the panel renders in the
            GlobalSearch slot above, never next to the grid. */}
        <OrdersToolbar
          totalCount={data?.totalCount}
          onExportClick={() => setExportOpen(true)}
          onFiltersClick={() => setFiltersOpen(o => !o)}
          filterCount={activeFilterCount(activeTab, tabFilters)}
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
            onRowAction={(action, row) => {
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
                  state: { errorCount: row.errorCount, customer: row.customer, orderSource: row.orderSource },
                })
            }}
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
