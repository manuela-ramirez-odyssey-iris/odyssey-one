import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper } from '@tanstack/react-table'
import { Bell, Upload } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { DataTable, Checkbox, Button } from '@odyssey/ui'
import useSheet from '../../routes/useSheet'

const columnHelper = createColumnHelper()

function escapeCSV(val) {
  const str = String(val ?? '')
  return (str.includes(',') || str.includes('"') || str.includes('\n'))
    ? `"${str.replace(/"/g, '""')}"`
    : str
}

// PgipgrTable — one sortable DataTable per PGI/PGR category card (S159). All
// four cards share the same shell (checkbox select, a linked Shipment ID
// column, a trailing Alert bell column, an "N Records Found" + Export
// actions row); `columns` (FULL_COLUMNS / ALL_SELL_SHIPMENTS_COLUMNS in
// pgipgrTableData.js) supplies the per-card data columns in between.
export default function PgipgrTable({ rows, columns, toolbarActions, exportFilename, linkMode = 'view' }) {
  const { openSheet } = useSheet()
  const linkColumn = columns.find((c) => c.link)
  const [sorting, setSorting] = useState([{ id: linkColumn.key, desc: false }])
  const [rowSelection, setRowSelection] = useState({})

  const tableColumns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      enableSorting: false,
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          indeterminate={table.getIsSomeRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          showLabel={false}
          aria-label="Toggle all rows checkbox"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          showLabel={false}
          // Not "Select …" — consolidateMode.test.jsx asserts zero
          // startsWith('Select ') checkboxes outside consolidate mode
          // (the ShipmentTable convention); this is a different table.
          aria-label={`Row ${row.original[linkColumn.key]} checkbox`}
        />
      ),
      meta: { headClass: 'odyssey-table__cell--control', cellClass: 'odyssey-table__cell--control', fixedWidth: true },
    }),
    ...columns.map((c) =>
      columnHelper.accessor(c.key, {
        header: c.label,
        cell: c.link
          ? (info) => (
            <button
              type="button"
              className="text-label-sm-medium"
              style={{ color: 'var(--carolina-blue-600)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => openSheet(`/shipments/executed/${info.getValue()}?mode=${linkMode}`)}
            >
              {info.getValue()}
            </button>
          )
          : (info) => info.getValue(),
      }),
    ),
    columnHelper.display({
      id: 'alert',
      enableSorting: false,
      header: 'Alert',
      cell: () => <Bell {...ICON_MD} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />,
      meta: { sticky: 'right', fixedWidth: true },
    }),
  ], [columns, linkColumn.key, openSheet, linkMode])

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row[linkColumn.key],
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const handleExport = () => {
    const headers = columns.map((c) => c.key)
    const csv = '﻿' + [headers.join(','), ...rows.map((r) => headers.map((h) => escapeCSV(r[h])).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportFilename}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Custom actions row, not DataTable's actionsRow — that prop's count is
          hardcoded to "N items" (itemCountLabel) and the mock wants
          "N Records Found"; packages/ui is off-limits to edit. */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 'var(--spacing-3)' }}
      >
        <span className="text-label-sm-regular" style={{ color: 'var(--text-tertiary)' }}>
          {rows.length} Records Found
        </span>
        <div className="flex items-center" style={{ gap: 'var(--spacing-2)' }}>
          {toolbarActions}
          <Button variant="secondary" size="sm" icon={<Upload {...ICON_MD} />} onClick={handleExport}>Export</Button>
        </div>
      </div>
      <DataTable table={table} sortable stickyTop="calc(-1 * var(--spacing-8))" ariaLabel="PGI/PGR shipments" />
    </div>
  )
}
