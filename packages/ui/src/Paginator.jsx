import PaginationButton from './PaginationButton'
import Dropdown from './Dropdown'

/**
 * Paginator — molecule. The table's pagination bar: a muted results summary
 * (`Showing X to Y of Z results`) on the left, and on the right a "Rows per
 * page" bordered Dropdown + the separate bordered segmented PaginationButton
 * page bar (`‹ 1 2 3 … 10 ›`, current page filled dark). Composes
 * PaginationButton (atom) + Dropdown (molecule); no new visuals of its own.
 * Transparent — sits on the page canvas BELOW the DataTable card (S79b,
 * decision 6; the DataTable `footer` slot places it there).
 *
 * Presentation-only: it is driven entirely by a TanStack table instance passed
 * via `table` (duck-typed — this package takes no dependency on TanStack; the
 * consumer owns the engine wiring). The same API exists on @tanstack/react-table
 * and @tanstack/angular-table, so the Angular twin reads it identically.
 *
 * Props:
 *   - `table` — a TanStack table instance (v8). Reads `getState().pagination`,
 *     `getPageCount()`, `getRowCount()`, `getCan{Previous,Next}Page()`; calls
 *     `setPageIndex()`, `previousPage()`, `nextPage()`, `setPageSize()`.
 *   - `pageSizeOptions` — rows-per-page choices (default [10, 25, 50, 100]).
 *   - `siblingCount` — page numbers shown each side of the current page (default 1).
 *   - `className` — merged onto the root.
 *
 * Figma master: `Paginator` `3272:3890` (Components-Molecules).
 */

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

function range(start, end) {
  const out = []
  for (let i = start; i <= end; i += 1) out.push(i)
  return out
}

/**
 * Windowed page list: page 1 and the last page are always shown, plus
 * `current ± siblingCount`. Gaps wider than a single page collapse to an
 * 'ellipsis-left' / 'ellipsis-right' marker; a single hidden page is shown
 * instead of an ellipsis. (The MUI usePagination shape.)
 */
export function getPageItems(current, count, siblingCount = 1) {
  const boundary = 1
  // first + last + current + 2*siblings + 2 ellipsis slots
  const totalShown = siblingCount * 2 + 3 + boundary * 2
  if (count <= totalShown) return range(1, count)

  const leftSibling = Math.max(current - siblingCount, boundary + 1)
  const rightSibling = Math.min(current + siblingCount, count - boundary)
  const showLeftEllipsis = leftSibling > boundary + 2
  const showRightEllipsis = rightSibling < count - boundary - 1

  const items = []
  items.push(...range(1, boundary))
  if (showLeftEllipsis) items.push('ellipsis-left')
  else items.push(...range(boundary + 1, leftSibling - 1))
  items.push(...range(leftSibling, rightSibling))
  if (showRightEllipsis) items.push('ellipsis-right')
  else items.push(...range(rightSibling + 1, count - boundary))
  items.push(...range(count - boundary + 1, count))
  return items
}

export default function Paginator({
  table,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  siblingCount = 1,
  className = '',
}) {
  if (!table) return null

  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = table.getPageCount()
  const total = table.getRowCount()
  const currentPage = pageIndex + 1

  const start = total === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min((pageIndex + 1) * pageSize, total)

  const items = getPageItems(currentPage, pageCount, siblingCount)
  const sizeOptions = pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))

  const cls = `paginator${className ? ` ${className}` : ''}`
  return (
    <div className={cls}>
      <p className="paginator__summary">
        Showing {start} to {end} of {total} results
      </p>
      <div className="paginator__controls">
        <div className="paginator__page-size">
          <span className="paginator__page-size-label">Rows per page</span>
          <Dropdown
            value={String(pageSize)}
            options={sizeOptions}
            onChange={(v) => table.setPageSize(Number(v))}
          />
        </div>
        <div className="paginator__pages">
          <PaginationButton
            variant="prev"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          />
          {items.map((it) =>
            typeof it === 'number' ? (
              <PaginationButton
                key={it}
                variant="page"
                current={it === currentPage}
                onClick={() => table.setPageIndex(it - 1)}
              >
                {it}
              </PaginationButton>
            ) : (
              <span key={it} className="paginator__ellipsis" aria-hidden="true">
                …
              </span>
            )
          )}
          <PaginationButton
            variant="next"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          />
        </div>
      </div>
    </div>
  )
}
