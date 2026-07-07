import { useLayoutEffect, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'
import { EllipsisVertical } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Checkbox, DataTable, Paginator, ActionMenu } from '@odyssey/ui'

/**
 * OrdersTable — the Orders-specific configuration of the normalized DataTable
 * shell. Owns only the column defs + the TanStack instance (selection +
 * server-side pagination) + the toolbar-measured stickyTop. The shell owns the
 * chrome/scroll; the `.odyssey-table` Cell contract owns the cell skin
 * (Figma Cell set 2714:505). manualPagination/manualSorting: the table holds
 * one server-shaped page; the service does the real work. The @odyssey/ui
 * Paginator drives the page state (footer slot).
 */

const columnHelper = createColumnHelper()

// Canonical row actions (spec §2). Each selection reports (label, row) to the
// route via onRowAction — View/Edit navigate today; Copy/Cancel/Restore/Delete
// stay no-ops there until their features land.
const ORDER_ACTION_LABELS = ['View', 'Edit', 'Copy', 'Cancel', 'Restore', 'Delete']

const buildOrderActions = (row, onRowAction) =>
  ORDER_ACTION_LABELS.map((label) => ({
    label,
    onSelect: () => onRowAction?.(label, row),
  }))

const DATA_COLUMNS = [
  columnHelper.display({
    id: 'select',
    enableResizing: false, // pinned system column — never resized or reordered
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllRowsSelected()}
        indeterminate={table.getIsSomeRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
        showLabel={false}
        aria-label="Select all orders on this page"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        showLabel={false}
        aria-label={`Select order ${row.original.idLabel}`}
      />
    ),
    meta: {
      headClass: 'odyssey-table__cell--control',
      cellClass: 'odyssey-table__cell--control',
      fixedWidth: true,
    },
  }),
  // Plain text — the ROW is the click target (order summary / draft reopen);
  // the old per-ID link affordance is gone.
  columnHelper.accessor('idLabel', { header: 'ID' }),
  columnHelper.accessor('customer', {
    header: 'Customer',
    // Cell Variant=Title — the row's emphasis column
    meta: { cellClass: 'odyssey-table__cell--title text-label-sm-medium' },
  }),
  columnHelper.accessor('origin', { header: 'Origin' }),
  columnHelper.accessor('destination', { header: 'Destination' }),
  columnHelper.accessor('weight', { header: 'Weight' }),
  columnHelper.accessor('volume', { header: 'Volume' }),
  columnHelper.accessor('commodity', { header: 'Commodity' }),
  columnHelper.accessor('equipment', { header: 'Equipment' }),
  columnHelper.accessor('earlyPickup', { header: 'Early Pickup' }),
]

export default function OrdersTable({
  rows,
  rowSelection,
  onRowSelectionChange,
  pagination,
  onPaginationChange,
  totalCount,
  onRowClick,
  onRowAction,
}) {
  const [stickyTop, setStickyTop] = useState(0)

  // The action column needs row context (its options close over the row), so it
  // is built here rather than at module level (Shipments-style columns memo).
  const columns = useMemo(() => [
    ...DATA_COLUMNS,
    columnHelper.display({
      id: 'action',
      enableResizing: false, // pinned system column — never resized or reordered
      header: 'Action',
      cell: ({ row }) => (
        <ActionMenu
          icon={<EllipsisVertical {...ICON_MD} />}
          options={buildOrderActions(row.original, onRowAction)}
          align="right"
          ariaLabel={`Actions for order ${row.original.idLabel}`}
        />
      ),
      // forwardClick: the ⋮ trigger alone is too small a target — clicking anywhere
      // in the cell forwards to it (DataTable whole-cell click delegation, S81).
      meta: { sticky: 'right', fixedWidth: true, forwardClick: true },
    }),
  ], [onRowAction])

  // Anchor line = the stuck toolbar's bottom edge: its sticky `top` is negative
  // (scrolls partially away), so stuck bottom = height + top.
  useLayoutEffect(() => {
    const toolbar = document.querySelector('.orders-toolbar')
    if (!toolbar) return
    const measure = () =>
      setStickyTop(toolbar.offsetHeight + parseFloat(getComputedStyle(toolbar).top))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const table = useReactTable({
    data: rows,
    columns,
    state: { rowSelection, pagination },
    onRowSelectionChange,
    onPaginationChange,
    enableRowSelection: true,
    getRowId: row => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    rowCount: totalCount,
  })

  return (
    <DataTable
      table={table}
      stickyTop={stickyTop}
      ariaLabel="Orders"
      // Row click (Shipments-style full-row target): the shell's onCellClick fires
      // for every non-interactive cell, so the checkbox + action-menu cells keep
      // their own clicks and everything else opens the order.
      onCellClick={onRowClick ? (_cell, row) => onRowClick(row.original) : undefined}
      footer={<Paginator table={table} pageSizeOptions={[20, 50, 100]} />}
    />
  )
}
