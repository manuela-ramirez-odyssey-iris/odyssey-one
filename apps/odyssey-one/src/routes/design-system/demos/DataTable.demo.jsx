import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  createColumnHelper,
} from '@tanstack/react-table'
import { EllipsisVertical } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { DataTable, Paginator, Checkbox, Badge } from '@odyssey/ui'

export const meta = {
  name: 'DataTable',
  tier: 'molecule',
  version: '0.3.0',
  // React shell built S66; Angular twin + Figma retro-sync pending → clears at the full-cycle GATE.
  normalizing: true,
}

export const props = [
  { name: 'table', type: 'Table (TanStack v8)', desc: 'A TanStack table instance — duck-typed (the library takes no TanStack dependency). The shell renders headers/rows from it; the consumer owns columns, data, and state.' },
  { name: 'stickyTop', type: 'number', desc: 'Px offset where the sticky header parks (the consumer measures its own toolbar/header). Default 0.' },
  { name: 'footer', type: 'ReactNode', desc: 'Rendered in a sticky-left footer band below the body — put a <Paginator table={table}/> here.' },
  { name: 'ariaLabel', type: 'string', desc: 'Optional aria-label applied to the body <table> element (per ARIA table semantics).' },
  { name: 'className', type: 'string', desc: 'Merged onto the root.' },
]

export const tokens = [
  { token: '--radius-2xl', resolves: '16px', usage: 'card radius + the header strip top corners' },
  { token: '--bg-primary', resolves: 'White', usage: 'card / header-inner / body background' },
  { token: '--bg-secondary', resolves: 'Deep Sea Neutral/50', usage: 'sticky header strip background' },
  { token: '--border-subtle', resolves: 'Deep Sea Neutral/200', usage: 'footer top border' },
]

// Per-column behavior is set on the consumer's TanStack column.meta:
//   cellClass / headClass → Cell contract classes
//   sticky: 'right'       → pinned action column
//   fixedWidth: true      → excluded from flex-width distribution (stays snug)

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
        aria-label="Select all rows"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        showLabel={false}
        aria-label={`Select ${row.original.name}`}
      />
    ),
    meta: { headClass: 'odyssey-table__cell--control', cellClass: 'odyssey-table__cell--control', fixedWidth: true },
  }),
  columnHelper.accessor('name', {
    header: 'Customer',
    meta: { cellClass: 'odyssey-table__cell--title text-label-sm-medium' },
  }),
  columnHelper.accessor('origin', { header: 'Origin' }),
  columnHelper.accessor('destination', { header: 'Destination' }),
  columnHelper.accessor('weight', { header: 'Weight' }),
  columnHelper.accessor('commodity', { header: 'Commodity' }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={info.getValue() === 'Active' ? 'green' : 'gray'}>{info.getValue()}</Badge>,
  }),
  columnHelper.display({
    id: 'action',
    header: 'Action',
    // The three-dot row-action icon — same affordance teams see in real tables
    // (Orders' OrderRowActionMenu trigger), so the pattern reads consistently.
    cell: () => <EllipsisVertical {...ICON_MD} />,
    meta: { sticky: 'right', fixedWidth: true },
  }),
]

const CITIES = ['Atlanta', 'Dallas', 'Chicago', 'Denver', 'Newark', 'Seattle', 'Miami', 'Phoenix']
const GOODS = ['Electronics', 'Produce', 'Steel Coil', 'Apparel', 'Auto Parts']
const DATA = Array.from({ length: 32 }, (_, i) => ({
  id: String(i + 1),
  name: `Customer ${String.fromCharCode(65 + (i % 26))}${i}`,
  origin: CITIES[i % CITIES.length],
  destination: CITIES[(i + 3) % CITIES.length],
  weight: `${(i + 1) * 120} lb`,
  commodity: GOODS[i % GOODS.length],
  status: i % 4 === 0 ? 'Draft' : 'Active',
}))

function LiveDataTable() {
  const [rowSelection, setRowSelection] = useState({})
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const table = useReactTable({
    data: DATA,
    columns: COLUMNS,
    state: { rowSelection, pagination },
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })
  return (
    <DataTable
      table={table}
      ariaLabel="Sample data"
      footer={<Paginator table={table} pageSizeOptions={[10, 25, 50]} />}
    />
  )
}

export default function DataTableDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Thin chrome over a <code>@tanstack/react-table</code> instance: split sticky header,
        colgroup width-lock, horizontal scroll-sync, a <strong>sticky-right</strong> action column
        (<code>meta.sticky:'right'</code>), and a <strong>Paginator</strong> footer. The consumer
        owns columns / data / state. Scroll the table horizontally — the header tracks the body and
        the Action column stays pinned.
      </p>
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Live — selection · sticky action · pagination</h4>
        <div style={{ resize: 'horizontal', overflow: 'hidden', maxWidth: '100%', width: 720, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-2xl)' }}>
          <LiveDataTable />
        </div>
      </div>
    </div>
  )
}
