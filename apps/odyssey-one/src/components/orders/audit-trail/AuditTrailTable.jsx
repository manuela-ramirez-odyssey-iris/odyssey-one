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
      truncationTooltip
      footer={<Paginator table={table} />}
    />
  )
}
