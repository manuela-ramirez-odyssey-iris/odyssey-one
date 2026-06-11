import { Button } from '@odyssey/ui'

// 20 = the LLD example pageSize (A2); options pending Q29's max-page-size answer.
const PAGE_SIZE_OPTIONS = [20, 50, 100]

/**
 * OrdersTablePagination — Prev/Next + page-size select. App-local on purpose;
 * graduates with the table normalization (Phase 2). pageNumber is 1-BASED
 * (LLD list example; Q29).
 */
export default function OrdersTablePagination({
  pageNumber,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  disabled,
}) {
  const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / pageSize))
  return (
    <div className="orders-pagination">
      <label className="orders-pagination__size text-label-sm-regular">
        Rows per page
        <select
          className="orders-pagination__select text-label-sm-regular"
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          disabled={disabled}
        >
          {PAGE_SIZE_OPTIONS.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
      <span className="orders-pagination__page text-label-sm-regular">
        Page {pageNumber.toLocaleString('en-US')} of {totalPages.toLocaleString('en-US')}
      </span>
      <div className="orders-pagination__nav">
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || pageNumber <= 1}
          onClick={() => onPageChange(pageNumber - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || pageNumber >= totalPages}
          onClick={() => onPageChange(pageNumber + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
