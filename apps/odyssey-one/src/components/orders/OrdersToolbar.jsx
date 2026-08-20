import { SlidersHorizontal, Upload } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Button } from '@odyssey/ui'

/**
 * OrdersToolbar — count · Filters · Export (LINX-9896 BR V — current tab → Excel).
 * The old direction-only sort toggle is gone — header sorting owns it (S94).
 *
 * Filters is a TRIGGER only — it does not host the panel. The panel always
 * renders in the GlobalSearch place (beneath the navbar bar), so this button
 * and the bar's own FilterButton are two ways into ONE panel in ONE place
 * (user ruling, 2026-08-20). `data-filters-trigger` keeps OrdersGlobalSearch's
 * outside-click dismissal from firing on this button — without it, mousedown
 * would close the panel and the click would immediately reopen it, so the
 * button could never close what it opened.
 */
export default function OrdersToolbar({ totalCount, onExportClick, onFiltersClick, filterCount = 0 }) {
  return (
    <div className="orders-toolbar">
      <span className="orders-toolbar__count text-label-sm-regular">
        {totalCount == null ? '—' : `${totalCount.toLocaleString('en-US')} items`}
      </span>
      <div className="orders-toolbar__right">
        <Button
          variant="secondary"
          size="sm"
          icon={<SlidersHorizontal {...ICON_MD} />}
          onClick={onFiltersClick}
          data-filters-trigger=""
        >
          {filterCount > 0 ? `Filters (${filterCount})` : 'Filters'}
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
