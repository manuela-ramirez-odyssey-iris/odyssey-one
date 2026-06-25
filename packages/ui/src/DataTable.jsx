import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * DataTable — a thin presentation shell for a TanStack v8 table. It owns the
 * table chrome (split sticky header + colgroup width-lock + horizontal
 * scroll-sync) and applies the normalized `.odyssey-table` Cell contract.
 * Driven by a duck-typed `table` instance — this package takes NO @tanstack
 * dependency. The consumer owns columns / data / state. See the design spec
 * 2026-06-25-datatable-shell-design.md.
 */

/**
 * Per-column locked widths: max(header, body) per column, then any leftover
 * container width is split evenly among the FLEX columns (flexFlags[i] === true).
 * Flex membership is by flag, not by position — so column reorder/resize never
 * mis-targets the distribution (Refinement R1).
 *
 * `headerWidths`/`bodyWidths` are raw `getBoundingClientRect().width` values
 * (subpixel floats) measured by the caller — hence the per-column `Math.ceil`.
 */
export function getColWidths(headerWidths, bodyWidths, containerWidth, flexFlags) {
  const widths = headerWidths.map((hw, i) =>
    Math.ceil(Math.max(hw, bodyWidths[i] ?? 0))
  )
  const total = widths.reduce((a, b) => a + b, 0)
  if (total < containerWidth) {
    const flexIdxs = widths.map((_, i) => i).filter((i) => flexFlags[i])
    if (flexIdxs.length) {
      const extra = Math.floor((containerWidth - total) / flexIdxs.length)
      flexIdxs.forEach((i) => { widths[i] += extra })
    }
  }
  return widths
}

/** Inlined flexRender: call a function renderer with its context, else return
 *  the value (a plain header string, a number, etc.). Nullish → null. Keeps the
 *  library free of any @tanstack import. */
export function renderCell(renderer, context) {
  if (renderer == null) return null
  return typeof renderer === 'function' ? renderer(context) : renderer
}

/** `<th>` classes: the `text-label-sm-semibold` base is ALWAYS included;
 *  `meta.headClass` is additive on top of it; `odyssey-table__cell--sticky-right`
 *  when the column is pinned right. */
export function headClassName(meta, isStickyRight) {
  return [
    'text-label-sm-semibold',
    meta?.headClass,
    isStickyRight && 'odyssey-table__cell--sticky-right',
  ].filter(Boolean).join(' ')
}

/** `<td>` classes: `meta.cellClass` REPLACES the `text-label-sm-regular` default
 *  entirely (a Title cell passes `'odyssey-table__cell--title text-label-sm-medium'`);
 *  `odyssey-table__cell--sticky-right` when the column is pinned right. */
export function cellClassName(meta, isStickyRight) {
  return [
    meta?.cellClass ?? 'text-label-sm-regular',
    isStickyRight && 'odyssey-table__cell--sticky-right',
  ].filter(Boolean).join(' ')
}

export default function DataTable({ table, stickyTop = 0, footer, ariaLabel, className = '' }) {
  const headRef = useRef(null)       // head-inner (overflow:hidden); scrollLeft set on it mirrors the body — the split-header trick, NOT a bug
  const wrapRef = useRef(null)       // body horizontal scroller
  const headTableRef = useRef(null)
  const bodyTableRef = useRef(null)
  const [colWidths, setColWidths] = useState(null)

  const rowModel = table.getRowModel()
  // R2 — re-measure when the column set changes (add/remove/reorder), not just
  // when rows change. A by-value string keeps this stable across renders.
  const columnSignature = table.getVisibleLeafColumns().map((c) => c.id).join('|')

  // Two-pass sizing: render shrink-to-fit (colWidths null) so each column
  // reports its true content width, then lock max(header, firstRow) per column
  // into a shared <colgroup> and hand leftover space to flex columns.
  useLayoutEffect(() => { setColWidths(null) }, [rowModel.rows, columnSignature])
  useLayoutEffect(() => {
    if (colWidths) return
    const ths = headTableRef.current?.querySelectorAll('thead th')
    const tds = bodyTableRef.current?.querySelectorAll('tbody tr:first-child td')
    // No body rows to measure (e.g. an empty result set) → skip the lock; the
    // table renders at width:auto. Consumers render their own empty state in
    // place of a 0-row DataTable (as OrdersRoute does), so this stays an edge.
    if (!ths?.length || !tds?.length) return
    const headerWidths = Array.from(ths).map((th) => th.getBoundingClientRect().width)
    const bodyWidths = Array.from(tds).map((td) => td.getBoundingClientRect().width)
    const container = wrapRef.current?.clientWidth ?? 0
    const flexFlags = table.getVisibleLeafColumns().map((c) => !c.columnDef.meta?.fixedWidth)
    setColWidths(getColWidths(headerWidths, bodyWidths, container, flexFlags))
  }, [colWidths, rowModel.rows, columnSignature]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-measure on resize (debounced).
  useEffect(() => {
    let t = 0
    const onResize = () => { clearTimeout(t); t = setTimeout(() => setColWidths(null), 150) }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t) }
  }, [])

  // Horizontal sync: the body wrap drives the header strip's scrollLeft.
  // (Setting scrollLeft on the overflow:hidden head-inner is intentional — it
  //  keeps the header columns aligned with the body with no second scrollbar.)
  useEffect(() => {
    const wrap = wrapRef.current
    const head = headRef.current
    if (!wrap || !head) return
    const onScroll = () => { head.scrollLeft = wrap.scrollLeft }
    wrap.addEventListener('scroll', onScroll, { passive: true })
    return () => wrap.removeEventListener('scroll', onScroll)
  }, [])

  const totalWidth = colWidths ? colWidths.reduce((a, b) => a + b, 0) : 0
  const tableStyle = colWidths
    ? { tableLayout: 'fixed', width: '100%', minWidth: `${totalWidth}px` }
    : { width: 'auto' }
  const colgroup = colWidths && (
    <colgroup>
      {colWidths.map((w, i) => <col key={i} style={{ width: `${w}px` }} />)}
    </colgroup>
  )

  return (
    <div className={`odyssey-data-table${className ? ` ${className}` : ''}`}>
      <div className="odyssey-data-table__head" style={{ top: `${stickyTop}px` }}>
        <div className="odyssey-data-table__head-inner" ref={headRef}>
          <table className="odyssey-table" ref={headTableRef} style={tableStyle}>
            {colgroup}
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => {
                    const meta = header.column.columnDef.meta
                    return (
                      <th key={header.id} className={headClassName(meta, meta?.sticky === 'right')}>
                        {renderCell(header.column.columnDef.header, header.getContext())}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
          </table>
        </div>
      </div>
      <div className="odyssey-data-table__body" ref={wrapRef}>
        <table className="odyssey-table" ref={bodyTableRef} style={tableStyle} aria-label={ariaLabel}>
          {colgroup}
          <tbody>
            {rowModel.rows.map((row) => (
              <tr key={row.id} data-selected={row.getIsSelected() || undefined}>
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta
                  return (
                    <td key={cell.id} className={cellClassName(meta, meta?.sticky === 'right')}>
                      {renderCell(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {footer && <div className="odyssey-data-table__footer">{footer}</div>}
      </div>
    </div>
  )
}
