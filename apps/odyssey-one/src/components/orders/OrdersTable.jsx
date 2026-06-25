import { useLayoutEffect, useState } from 'react'
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'
import { EllipsisVertical } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Button, Checkbox, DataTable, Paginator, ActionMenu } from '@odyssey/ui'

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

// Canonical row actions (spec §2) — inert this build; each wires up with its
// own feature (detail page, edit, copy, cancel/restore, delete).
const ORDER_ACTIONS = ['View', 'Edit', 'Copy', 'Cancel', 'Restore', 'Delete'].map(
  (label) => ({ label, onSelect: () => {} }),
)

const COLUMNS = [
  columnHelper.display({
    id: 'select',
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
  columnHelper.accessor('idLabel', {
    header: 'ID',
    // Link-styled. Draft rows navigate to the create-form reopen; other rows
    // stay inert until the order-detail build (spec §2).
    cell: info => (
      <Button
        variant="link"
        onClick={() => info.table.options.meta?.onRowIdClick?.(info.row.original)}
      >
        {info.getValue()}
      </Button>
    ),
  }),
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
  columnHelper.display({
    id: 'action',
    header: 'Action',
    cell: () => (
      <ActionMenu
        icon={<EllipsisVertical {...ICON_MD} />}
        options={ORDER_ACTIONS}
        align="right"
        ariaLabel="Order actions"
      />
    ),
    meta: { sticky: 'right', fixedWidth: true },
  }),
]

export default function OrdersTable({
  rows,
  rowSelection,
  onRowSelectionChange,
  pagination,
  onPaginationChange,
  totalCount,
  onRowIdClick,
}) {
  const [stickyTop, setStickyTop] = useState(0)

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
    columns: COLUMNS,
    state: { rowSelection, pagination },
    onRowSelectionChange,
    onPaginationChange,
    enableRowSelection: true,
    getRowId: row => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    rowCount: totalCount,
    meta: { onRowIdClick },
  })

  return (
    <DataTable
      table={table}
      stickyTop={stickyTop}
      ariaLabel="Orders"
      footer={<Paginator table={table} pageSizeOptions={[20, 50, 100]} />}
    />
  )
}
