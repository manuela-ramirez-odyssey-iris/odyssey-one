import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Button } from '@odyssey/ui'

/**
 * OrdersToolbar — count · sort-direction toggle · Filters (inert).
 * Direction-only sort on orderNumber is the A4 interim (header-click sorting is
 * Efrain's call, Q33). Filters button renders inert until the filter-panel
 * build (needs Efrain's open-panel export first).
 */
export default function OrdersToolbar({ totalCount, sortDirection, onToggleSort, disabled }) {
  const SortIcon = sortDirection === 'desc' ? ArrowDownWideNarrow : ArrowUpNarrowWide
  return (
    <div className="orders-toolbar">
      <span className="orders-toolbar__count text-label-sm-regular">
        {totalCount == null ? '—' : `${totalCount.toLocaleString('en-US')} items`}
      </span>
      <div className="orders-toolbar__right">
        <Button
          variant="icon"
          icon={<SortIcon {...ICON_MD} />}
          onClick={onToggleSort}
          aria-label={`Sorted ${sortDirection === 'desc' ? 'descending' : 'ascending'} — toggle direction`}
          disabled={disabled}
        />
        <Button variant="secondary" size="sm" onClick={() => {}}>Filters</Button>
      </div>
    </div>
  )
}
