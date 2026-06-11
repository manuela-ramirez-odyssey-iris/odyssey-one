import { useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { Button, Checkbox } from '@odyssey/ui'
import OrderRowActionMenu from './OrderRowActionMenu'

/**
 * OrdersTable — headless TanStack grid over OrderRowVM rows.
 * Logic only lives here (columns, selection); ALL markup/skin is ours via
 * orders.css, so the table normalization (Phase 2) re-skins without touching
 * this logic. manualPagination/manualSorting: the table only ever holds one
 * server-shaped page; the service does the real work.
 */

const columnHelper = createColumnHelper()

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
  }),
  columnHelper.accessor('idLabel', {
    header: 'ID',
    // Link-styled, navigates nowhere yet — order detail build wires it (spec §2)
    cell: info => <Button variant="link">{info.getValue()}</Button>,
  }),
  columnHelper.accessor('customer', { header: 'Customer' }),
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
    cell: () => <OrderRowActionMenu />,
  }),
]

export default function OrdersTable({ rows, rowSelection, onRowSelectionChange }) {
  const data = useMemo(() => rows, [rows])

  const table = useReactTable({
    data,
    columns: COLUMNS,
    state: { rowSelection },
    onRowSelectionChange,
    enableRowSelection: true,
    getRowId: row => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  })

  return (
    <div className="orders-table-wrap">
      <table className="orders-table">
        <thead>
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(header => (
                <th
                  key={header.id}
                  className={[
                    'text-label-sm-medium',
                    header.column.id === 'action' && 'orders-table__cell--action',
                  ].filter(Boolean).join(' ')}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} data-selected={row.getIsSelected() || undefined}>
              {row.getVisibleCells().map(cell => (
                <td
                  key={cell.id}
                  className={[
                    'text-label-sm-regular',
                    cell.column.id === 'action' && 'orders-table__cell--action',
                  ].filter(Boolean).join(' ')}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
