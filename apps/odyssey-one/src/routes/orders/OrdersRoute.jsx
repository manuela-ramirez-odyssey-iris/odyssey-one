import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox, Plus } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Button, EmptyState, PageHeader } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import OrdersToolbar from '../../components/orders/OrdersToolbar'
import OrdersTable from '../../components/orders/OrdersTable'
import OrdersTablePagination from '../../components/orders/OrdersTablePagination'
import { useOrderList } from '../../api/queries/useOrderList'
import '../../components/orders/orders.css'

/**
 * OrdersRoute — the Order Summary Page (screen 0 of Efrain's Orders design).
 * PageHeader (+ inert Create Order in the S50b actions cluster) · toolbar ·
 * TanStack grid · 1-based pagination. Mock-mode data layer shaped like
 * POST /order-service/v3/order/list (Phase-2 LLD) — live flip is an env var.
 */
export default function OrdersRoute() {
  const navigate = useNavigate()
  const [pageNumber, setPageNumber] = useState(1) // 1-based (LLD list example; Q29)
  const [pageSize, setPageSize] = useState(20)
  const [sortDirection, setSortDirection] = useState('desc') // newest-first proxy (A3/Q31)
  const [rowSelection, setRowSelection] = useState({})

  const request = useMemo(() => ({
    pagination: { pageNumber, pageSize },
    sort: { field: 'orderNumber', direction: sortDirection },
  }), [pageNumber, pageSize, sortDirection])

  const { data, isPending, isError, isFetching, refetch } = useOrderList(request)

  // Reset to page 1 whenever the query identity changes (Shipments-proven pattern).
  const handleToggleSort = () => {
    setSortDirection(d => (d === 'desc' ? 'asc' : 'desc'))
    setPageNumber(1)
  }
  const handlePageSizeChange = (n) => {
    setPageSize(n)
    setPageNumber(1)
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
            onRowIdClick={(row) => {
              // Draft rows reopen in the create form (spec §4); others stay
              // inert until the order-detail build. Draft key = orderNumber
              // (plan decision 17 — the save-gate guarantees one).
              if (row.status === 'Draft') navigate(`/orders/create?draft=${encodeURIComponent(row.id)}`)
            }}
          >
            <OrdersTablePagination
              pageNumber={pageNumber}
              pageSize={pageSize}
              totalCount={data.totalCount}
              onPageChange={setPageNumber}
              onPageSizeChange={handlePageSizeChange}
              disabled={isFetching}
            />
          </OrdersTable>
        )}
      </div>
    </AppShell>
  )
}
