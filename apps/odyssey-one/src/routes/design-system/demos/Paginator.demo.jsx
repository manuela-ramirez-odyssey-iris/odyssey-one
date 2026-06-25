import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table'
import { Paginator } from '@odyssey/ui'

export const meta = {
  name: 'Paginator',
  tier: 'molecule',
  figmaNode: '3272:3890',
  codeConnect: 'packages/ui/src/Paginator.figma.tsx',
  normalizing: true,
}

export const props = [
  { name: 'table', type: 'Table (TanStack v8)', desc: 'A TanStack table instance — duck-typed, the library takes no TanStack dependency. Drives everything (page index/size, counts, navigation).' },
  { name: 'pageSizeOptions', type: 'number[]', desc: 'Rows-per-page choices in the Dropdown. Default [10, 25, 50, 100].' },
  { name: 'siblingCount', type: 'number', desc: 'Page numbers shown each side of the current page before collapsing to an ellipsis. Default 1.' },
  { name: 'className', type: 'string', desc: 'Merged onto the root bar.' },
]

export const tokens = [
  { token: '--text-tertiary', resolves: 'Deep Sea Neutral/500 (#6b7280)', usage: 'results summary text' },
  { token: '--text-secondary', resolves: 'Deep Sea Neutral/700 (#384253)', usage: '"Row per page" label' },
  { token: '--spacing-8', resolves: '32px', usage: 'gap between the rows-per-page group and the page bar' },
  { token: '--spacing-4', resolves: '16px', usage: 'root horizontal padding + bottom padding' },
  { token: '--spacing-3', resolves: '12px', usage: 'root top padding; ellipsis horizontal padding' },
  { token: '--spacing-2', resolves: '8px', usage: 'gap between "Row per page" and the Dropdown' },
  { token: '--deep-sea-neutral-300', resolves: 'DSN/300 (#d0d4db)', usage: 'ellipsis-cell right divider' },
  { token: '--shadow-sm', resolves: 'shadow/sm', usage: 'ellipsis cell (matches the PaginationButton segments)' },
]

// Stable module-scope datasets — keep the table's data identity stable across renders.
const makeRows = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1 }))
const COLUMNS = [{ accessorKey: 'id', header: 'ID' }]
const DATA_97 = makeRows(97)
const DATA_240 = makeRows(240)
const DATA_5 = makeRows(5)
const DATA_0 = []

/** A live Paginator backed by a real TanStack table — clicking pages / changing
 *  the rows-per-page actually paginates the table state. */
function LivePaginator({ data, pageSize = 10, pageIndex = 0 }) {
  const [pagination, setPagination] = useState({ pageIndex, pageSize })
  const table = useReactTable({
    data,
    columns: COLUMNS,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })
  return <Paginator table={table} />
}

export default function PaginatorDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Presentation-only — driven entirely by a <code>@tanstack/react-table</code> instance
        passed as <code>table</code>. Composes the <strong>PaginationButton</strong> bar +
        the <strong>Dropdown</strong> rows-per-page selector. Click the pages and change the
        rows-per-page below — it really paginates.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive — 97 rows</h4>
        <div style={{ width: '100%', maxWidth: 920, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
          <LivePaginator data={DATA_97} pageSize={10} />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Windowing — both ellipses (page 5 of 24)</h4>
        <div style={{ width: '100%', maxWidth: 920, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
          <LivePaginator data={DATA_240} pageSize={10} pageIndex={4} />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Single page (5 rows) · prev/next disabled</h4>
        <div style={{ width: '100%', maxWidth: 920, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
          <LivePaginator data={DATA_5} pageSize={10} />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Empty (0 rows)</h4>
        <div style={{ width: '100%', maxWidth: 920, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
          <LivePaginator data={DATA_0} pageSize={10} />
        </div>
      </div>
    </div>
  )
}
