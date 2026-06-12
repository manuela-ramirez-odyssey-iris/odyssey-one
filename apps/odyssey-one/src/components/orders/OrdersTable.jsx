import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
 * Logic only lives here (columns, selection); the skin is the normalized
 * `.odyssey-table` Cell contract (components.css — Figma Cell set 2714:505).
 * orders.css keeps only page plumbing (card, scroll wrap, sticky action
 * column). Per-column looks map via `meta`: cellClass (Title/control cells)
 * and headClass. manualPagination/manualSorting: the table only ever holds
 * one server-shaped page; the service does the real work.
 *
 * Split sticky header: the thead lives in its own table inside a natively
 * `position: sticky` strip (anchors under the toolbar with zero scroll lag —
 * a JS-translated thead always trails composited scrolling by a frame).
 * Cost of the split: column widths are measured from both tables and locked
 * via <colgroup> + table-layout: fixed, and the strip's scrollLeft is synced
 * to the body wrap (the ShipmentTable-proven pattern). The shared card
 * (overflow: clip — NOT a scroll container, so sticky still binds to the
 * page scroller) carries the 16px radius and bounds the header's travel.
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
    meta: {
      headClass: 'odyssey-table__cell--control',
      cellClass: 'odyssey-table__cell--control',
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
    cell: () => <OrderRowActionMenu />,
  }),
]

// `children` renders inside the scroll container after the table — the
// pagination footer lives there so it sits at the END of the scroll
// (never anchored to the window).
export default function OrdersTable({ rows, rowSelection, onRowSelectionChange, onRowIdClick, children }) {
  const headRef = useRef(null)       // sticky strip (overflow hidden, programmatic scrollLeft)
  const wrapRef = useRef(null)       // body horizontal scroller
  const headTableRef = useRef(null)
  const bodyTableRef = useRef(null)
  const [stickyTop, setStickyTop] = useState(0)
  const [colWidths, setColWidths] = useState(null)

  // Anchor line = the stuck toolbar's bottom edge: its sticky `top` is
  // negative (scrolls partially away), so stuck bottom = height + top.
  useLayoutEffect(() => {
    const toolbar = document.querySelector('.orders-toolbar')
    if (!toolbar) return
    const measure = () =>
      setStickyTop(toolbar.offsetHeight + parseFloat(getComputedStyle(toolbar).top))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Two-pass column sizing: render both tables at shrink-to-fit (width auto,
  // colWidths null) so each column measures its TRUE content width — not the
  // inflated width auto-layout produces at width:100%. Lock the per-column
  // max of header vs first body row (auto layout has already resolved each
  // column to its widest cell) into a shared <colgroup>, then hand any
  // leftover container space to the data columns only — select and Action
  // stay snug at content width. Re-runs when the page of rows changes and on
  // resize (debounced).
  useLayoutEffect(() => { setColWidths(null) }, [rows])
  useLayoutEffect(() => {
    if (colWidths) return
    const ths = headTableRef.current?.querySelectorAll('thead th')
    const tds = bodyTableRef.current?.querySelectorAll('tbody tr:first-child td')
    if (!ths?.length || !tds?.length) return
    const widths = Array.from(ths).map((th, i) => Math.ceil(Math.max(
      th.getBoundingClientRect().width,
      tds[i] ? tds[i].getBoundingClientRect().width : 0,
    )))
    const container = wrapRef.current?.clientWidth ?? 0
    const total = widths.reduce((a, b) => a + b, 0)
    if (total < container) {
      const flexIdxs = widths.map((_, i) => i).filter(i => i !== 0 && i !== widths.length - 1)
      const extra = Math.floor((container - total) / flexIdxs.length)
      flexIdxs.forEach(i => { widths[i] += extra })
    }
    setColWidths(widths)
  }, [colWidths, rows])

  useEffect(() => {
    let t = 0
    const onResize = () => {
      clearTimeout(t)
      t = setTimeout(() => setColWidths(null), 150)
    }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t) }
  }, [])

  // Horizontal sync: body wrap drives the header strip.
  useEffect(() => {
    const wrap = wrapRef.current
    const head = headRef.current
    if (!wrap || !head) return
    const onScroll = () => { head.scrollLeft = wrap.scrollLeft }
    wrap.addEventListener('scroll', onScroll, { passive: true })
    return () => wrap.removeEventListener('scroll', onScroll)
  }, [])

  const table = useReactTable({
    data: rows,
    columns: COLUMNS,
    state: { rowSelection },
    onRowSelectionChange,
    enableRowSelection: true,
    getRowId: row => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    meta: { onRowIdClick },
  })

  const totalWidth = colWidths ? colWidths.reduce((a, b) => a + b, 0) : 0
  const tableStyle = colWidths
    ? { tableLayout: 'fixed', width: '100%', minWidth: `${totalWidth}px` }
    // measure pass: shrink-to-fit so columns report true content widths
    : { width: 'auto' }
  const colgroup = colWidths && (
    <colgroup>
      {colWidths.map((w, i) => <col key={i} style={{ width: `${w}px` }} />)}
    </colgroup>
  )

  return (
    <div className="orders-table-card">
      <div className="orders-table-head" style={{ top: `${stickyTop}px` }}>
        <div className="orders-table-head__inner" ref={headRef}>
          <table className="odyssey-table" ref={headTableRef} style={tableStyle}>
            {colgroup}
            <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    className={[
                      'text-label-sm-semibold',
                      header.column.columnDef.meta?.headClass,
                      header.column.id === 'action' && 'orders-table__cell--action',
                    ].filter(Boolean).join(' ')}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
            </thead>
          </table>
        </div>
      </div>
      <div className="orders-table-wrap" ref={wrapRef}>
        <table className="odyssey-table" ref={bodyTableRef} style={tableStyle}>
          {colgroup}
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} data-selected={row.getIsSelected() || undefined}>
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className={[
                      cell.column.columnDef.meta?.cellClass ?? 'text-label-sm-regular',
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
        {children}
      </div>
    </div>
  )
}
