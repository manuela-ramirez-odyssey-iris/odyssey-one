import { SlidersHorizontal, Upload } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Button } from '@odyssey/ui'

/**
 * OrdersToolbar — count · Filters (disabled: decision pending, may be
 * superseded by global search) · Export (LINX-9896 BR V — current tab → Excel).
 * The old direction-only sort toggle is gone — header sorting owns it (S94).
 */
export default function OrdersToolbar({ totalCount, onExportClick }) {
  return (
    <div className="orders-toolbar">
      <span className="orders-toolbar__count text-label-sm-regular">
        {totalCount == null ? '—' : `${totalCount.toLocaleString('en-US')} items`}
      </span>
      <div className="orders-toolbar__right">
        <Button variant="secondary" size="sm" icon={<SlidersHorizontal {...ICON_MD} />} disabled>
          Filters
        </Button>
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
