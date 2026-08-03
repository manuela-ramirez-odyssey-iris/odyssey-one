import { useLayoutEffect, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'
import { EllipsisVertical } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { DataTable, Paginator, ActionMenu, Button } from '@odyssey/ui'
import { TAB_COLUMNS, allTabActionLabels, DRAFT_ACTION_LABELS } from './ordersColumns'

/**
 * OrdersTable — tab-driven configuration of the normalized DataTable shell.
 * Column sets swap per MAIN_TAB (ordersColumns.jsx); the Action column is
 * built here (row-context callbacks). No row selection (S94 decision — PO
 * feedback + user call). Header sorting is server-driven (manualSorting;
 * sorting state lifts to the route).
 */
const columnHelper = createColumnHelper()

const buildActions = (labels, row, onRowAction) =>
  labels.map((label) => ({ label, onSelect: () => onRowAction?.(label, row) }))

export default function OrdersTable({
  tab = 'all',
  rows,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  totalCount,
  onRowAction,
  // Background refetch (keepPreviousData) → the shell's centered Spinner.
  loadingRows = false,
}) {
  const [stickyTop, setStickyTop] = useState(0)

  const columns = useMemo(() => {
    const dataCols = TAB_COLUMNS[tab] ?? TAB_COLUMNS.all
    if (tab === 'validation-errors') {
      // Direct Resolve button (Figma) — enabled only while status is Ready.
      return [...dataCols, columnHelper.display({
        id: 'action',
        enableResizing: false,
        header: 'Action',
        cell: ({ row }) => (
          <Button
            variant="secondary"
            size="sm"
            disabled={row.original.draftOrderStatus !== 'Ready'}
            onClick={() => onRowAction?.('Resolve', row.original)}
          >
            Resolve
          </Button>
        ),
        meta: { sticky: 'right', fixedWidth: true },
      })]
    }
    return [...dataCols, columnHelper.display({
      id: 'action',
      enableResizing: false,
      header: 'Action',
      cell: ({ row }) => (
        <ActionMenu
          icon={<EllipsisVertical {...ICON_MD} />}
          options={buildActions(
            tab === 'draft' ? DRAFT_ACTION_LABELS : allTabActionLabels(row.original),
            row.original,
            onRowAction,
          )}
          align="right"
          ariaLabel={`Actions for order ${row.original.idLabel}`}
        />
      ),
      meta: { sticky: 'right', fixedWidth: true, forwardClick: true },
    })]
  }, [tab, onRowAction])

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
    state: { pagination, sorting },
    onPaginationChange,
    onSortingChange,
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
      loadingRows={loadingRows}
      ariaLabel="Orders"
      sortable
      footer={<Paginator table={table} />}
    />
  )
}
