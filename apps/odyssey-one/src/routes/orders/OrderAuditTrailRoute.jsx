// apps/odyssey-one/src/routes/orders/OrderAuditTrailRoute.jsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { Breadcrumb, EmptyState, PageHeader } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import AuditTrailTable from '../../components/orders/audit-trail/AuditTrailTable.jsx'
import { formatAuditTimestamp } from '../../components/orders/audit-trail/auditTrailColumns.jsx'
import { useAuditTrail } from '../../api/queries/useAuditTrail'
import { getErrorDetail } from '../../components/common/errorDetail.js'
import '../../components/orders/audit-trail/audit-trail.css'

/**
 * Order Audit Trail — /orders/:orderId/audit-trail (LINX-8091 / LINX-9128,
 * ORD-27). AppShell renders its normal chrome (standard search navbar, no
 * title mode); breadcrumb reduces to `Orders › <orderNumber> Audit Trail`,
 * with `Orders` the way back (user ruling 2026-09-14 — the old "View order
 * <n>" middle crumb was misleading and is gone). Then a PageHeader whose
 * supporting text carries what the AC lists as the Order ID column —
 * constant on every row of a per-order log, so it lives here instead.
 * Entered from the Orders grid ⋮ menu (user ruling 2026-09-14: no secondary
 * button, no tab).
 *
 * Paging + sorting are route state so the query key tracks them; the table is
 * a pure shell. Default 25 rows, newest first (AC §I / §II).
 */
export default function OrderAuditTrailRoute() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
  const [sorting, setSorting] = useState([{ id: 'timestamp', desc: true }])

  const { data, isPending, isError, error, isPlaceholderData, refetch } = useAuditTrail({
    orderNumber: orderId,
    pageNumber: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    sortDirection: sorting[0]?.desc === false ? 'asc' : 'desc',
  })

  const order = data?.order
  const supporting = order
    ? `Order ${order.orderNumber} · ${order.orderSource} · Created ${formatAuditTimestamp(order.createdAt, order.createdTimeZoneCode)}`
      + (order.createdBy ? ` by ${order.createdBy}` : '')
    : null

  return (
    <AppShell>
      <div className="audit-trail">
        <nav className="audit-trail__crumbs" aria-label="Breadcrumb">
          <Breadcrumb label="Orders" onClick={() => navigate('/orders')} />
          <Breadcrumb label={`${orderId} Audit Trail`} current />
        </nav>

        {isPending ? (
          <div className="audit-trail__status text-label-sm-regular">Loading audit trail…</div>
        ) : !isError && !order ? (
          <EmptyState icon={<Inbox size={32} />} message="Order not found" />
        ) : (
          <div className="audit-trail__content">
            <PageHeader title="Audit Trail" supportingText={supporting} />
            {!isError && data.rows.length === 0 && data.totalCount === 0 ? (
              <EmptyState icon={<Inbox size={32} />} message="No changes recorded yet" />
            ) : (
              // Part 5 (2026-09-23, "OIF & Audit Trail review" 2026-09-16): a
              // failed load is now the table's OWN third body state (the
              // ShipmentTable `error` idiom — src/components/shipments/
              // ShipmentTable.jsx ~505-520), not a surface this route renders
              // instead of the table. `order` is unset on error (the query
              // never resolved), so the header above has no supporting text —
              // that's fine, the Retry button is what matters here.
              <AuditTrailTable
                rows={data?.rows ?? []}
                totalCount={data?.totalCount ?? 0}
                pagination={pagination}
                onPaginationChange={setPagination}
                sorting={sorting}
                onSortingChange={setSorting}
                loadingRows={isPlaceholderData}
                error={isError ? {
                  message: "Couldn't load the audit trail.",
                  detail: getErrorDetail(error),
                  onRetry: () => refetch(),
                } : undefined}
              />
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
