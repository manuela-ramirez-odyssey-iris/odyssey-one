import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox, Plus } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Button, EmptyState, PageHeader } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import OrdersToolbar from '../../components/orders/OrdersToolbar'
import OrdersTable from '../../components/orders/OrdersTable'
import { useOrderList } from '../../api/queries/useOrderList'
import '../../components/orders/orders.css'

/**
 * OrdersRoute — the Order Summary Page (screen 0 of Efrain's Orders design).
 * PageHeader (+ inert Create Order in the S50b actions cluster) · toolbar ·
 * TanStack grid · pagination via the @odyssey/ui Paginator (driven by the table
 * instance). Mock-mode data layer shaped like POST /order-service/v3/order/list
 * (Phase-2 LLD) — live flip is an env var.
 */
export default function OrdersRoute() {
  const navigate = useNavigate()
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 }) // pageIndex 0-based (TanStack)
  const [sortDirection, setSortDirection] = useState('desc') // newest-first proxy (A3/Q31)
  const [rowSelection, setRowSelection] = useState({})

  const request = useMemo(() => ({
    pagination: { pageNumber: pagination.pageIndex + 1, pageSize: pagination.pageSize },
    sort: { field: 'orderNumber', direction: sortDirection },
  }), [pagination, sortDirection])

  const { data, isPending, isError, isFetching, refetch } = useOrderList(request)
  // `isFetching` gates only the toolbar's sort toggle. It is intentionally NOT
  // threaded to the Paginator footer: the @odyssey/ui Paginator disables nav via
  // getCan{Previous,Next}Page(), and `placeholderData: keepPreviousData` keeps the
  // current page visible during an in-flight refetch — so free mid-fetch paging is
  // fine (the standard TanStack pattern; accepted over the old freeze-while-fetching).

  // Reset to the first page whenever the query identity changes (Shipments-proven pattern).
  const handleToggleSort = () => {
    setSortDirection(d => (d === 'desc' ? 'asc' : 'desc'))
    setPagination(p => ({ ...p, pageIndex: 0 }))
  }
  // Paginator drives setPageSize on the table → onPaginationChange. Reset to the
  // first page on a page-size change (preserves the prior UX, regardless of
  // TanStack's internal pageIndex math).
  const handlePaginationChange = (updater) => {
    setPagination(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return next.pageSize !== prev.pageSize ? { ...next, pageIndex: 0 } : next
    })
  }

  return (
    <AppShell>
      <div className="orders-page">
        <PageHeader title="Orders">
          <Button variant="primary" icon={<Plus {...ICON_MD} />} onClick={() => navigate('/orders/create')}>
            Create Order
          </Button>
        </PageHeader>

        <OrdersToolbar
          totalCount={data?.totalCount}
          sortDirection={sortDirection}
          onToggleSort={handleToggleSort}
          disabled={isFetching}
        />

        {isPending ? (
          <div className="orders-page__status text-label-sm-regular">Loading orders…</div>
        ) : isError ? (
          <div className="orders-page__status">
            <span className="text-label-sm-regular">Something went wrong loading orders.</span>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : (data?.rows.length ?? 0) === 0 ? (
          <EmptyState icon={<Inbox size={32} />} message="No orders found" />
        ) : (
          <OrdersTable
            rows={data.rows}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            totalCount={data.totalCount}
            onRowIdClick={(row) => {
              // Draft rows reopen in the create form (spec §4); others stay
              // inert until the order-detail build. Draft key = orderNumber
              // (plan decision 17 — the save-gate guarantees one).
              if (row.status === 'Draft') navigate(`/orders/create?draft=${encodeURIComponent(row.id)}`)
            }}
          />
        )}
      </div>
    </AppShell>
  )
}
