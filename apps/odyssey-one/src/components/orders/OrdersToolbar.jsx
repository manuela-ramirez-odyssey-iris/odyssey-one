import { Upload } from 'lucide-react'
import { Button } from '@odyssey/ui'

/**
 * OrdersToolbar — count · Export (LINX-9896 BR V — current tab → Excel).
 * The old direction-only sort toggle is gone — header sorting owns it (S94).
 *
 * The secondary Filters button is gone (user ruling, 2026-09-04, Ramesh
 * meeting) — the bar's own FilterButton is now the ONLY way into the panel
 * (plus the results preview's "filters" link). It used to be a second trigger
 * into the same panel (user ruling, 2026-08-20); that duplication is what got
 * removed.
 */
export default function OrdersToolbar({ totalCount, onExportClick }) {
  return (
    <div className="orders-toolbar">
      <span className="orders-toolbar__count text-label-sm-regular">
        {totalCount == null ? '—' : `${totalCount.toLocaleString('en-US')} items`}
      </span>
      <div className="orders-toolbar__right">
        <Button
          variant="secondary"
          size="sm"
          icon={<Upload size={20} />}
          onClick={onExportClick}
          disabled={totalCount === 0 || totalCount == null}
        >
          Export
        </Button>
      </div>
    </div>
  )
}
