// apps/odyssey-one/src/components/orders/audit-trail/AuditTrailTable.jsx
import { useReactTable, getCoreRowModel } from '@tanstack/react-table'
import { DataTable, Paginator } from '@odyssey/ui'
import { AUDIT_TRAIL_COLUMNS } from './auditTrailColumns.jsx'
import './audit-trail.css'

/**
 * AuditTrailTable — the normalized DataTable shell over the per-order trail
 * (ORD-27). Same server-driven configuration as OrdersTable: manual paging and
 * sorting, both lifted to the route, which owns the query. No row selection,
 * no row actions — the trail is read-only (Ramesh: "nothing, nothing").
 * Paginator's default options are already the AC's 10–40 step 5.
 *
 * no truncationTooltip — the stack cells are multi-line and the detector
 * concatenates them.
 */
export default function AuditTrailTable({
  rows,
  totalCount,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  loading = false,
  loadingRows = false,
}) {
  const table = useReactTable({
    data: rows,
    columns: AUDIT_TRAIL_COLUMNS,
    state: { pagination, sorting },
    onPaginationChange,
    onSortingChange,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    rowCount: totalCount,
  })

  return (
    <DataTable
      table={table}
      loading={loading}
      loadingRows={loadingRows}
      ariaLabel="Audit trail"
      sortable
      // AppShell's <main> scroller has padding-top: var(--spacing-8) and this
      // page has no toolbar to compensate (S79b header-gap fix; see
      // DataTable.jsx:301-306) — compensate here so the sticky header parks
      // flush with the scroller's visible clip edge.
      stickyTop="calc(-1 * var(--spacing-8))"
      footer={<Paginator table={table} />}
    />
  )
}
