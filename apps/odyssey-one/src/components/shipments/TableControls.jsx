import React, { useState } from 'react'
import { ArrowUpDown, Upload } from 'lucide-react'
import TooltipTrigger from '../ui/TooltipTrigger'
import { Button, ModalMedium } from '@odyssey/ui'

// The SearchChipPanel chips row (pre-S79c per-attribute scoping) was removed —
// search scoping now lives entirely in the navbar GlobalSearch, which commits
// { chips, text } criteria to the table pipeline (S79c decision 6).
const TableControls = React.memo(function TableControls({
  itemCount,
  onExport,
}) {
  const [exportModalOpen, setExportModalOpen] = useState(false)

  return (
    <div style={{
      // Sticky toolbar: clamps under the navbar as the table scrolls.
      // top compensates for AppShell <main> padding-top (--spacing-8 = 32px) so the
      // element parks flush with the scroller's visible clip edge — same reasoning as
      // DataTable's stickyTop prop (S79b header-gap fix, S79c decision 11).
      // z-index 4 sits above the table header (z-index 3).
      // Background must match <main> so rows scrolling underneath are hidden.
      // paddingBottom replaces marginBottom: margins don't paint background, so the
      // gap between the controls row and the table header would be transparent —
      // rows would peek through.
      position: 'sticky',
      top: 'calc(-1 * var(--spacing-8))',
      zIndex: 4,
      background: 'var(--bg-secondary)',
      // paddingTop matches --spacing-6 used by .orders-toolbar so the stuck bar
      // has the same breathing room above the controls row as Orders does.
      // Background paints that gap, hiding rows that scroll underneath.
      paddingTop: 'var(--spacing-6)',
      paddingBottom: 'var(--spacing-3)',
    }}>
      {/* Row 1: Controls */}
      <div className="flex items-center justify-between">
        {/* Left: item count */}
        <span className="text-sm shrink-0" style={{ color: 'var(--text-tertiary)', transition: 'color 0.15s ease' }}>
          {itemCount} items
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="icon"
            size="sm"
            icon={<ArrowUpDown size={20} />}
            aria-label="Sort"
          />
          <TooltipTrigger tooltipProps={{ groups: [{ content: 'Only the first 10,000 records will be exported to Excel' }] }}>
            {/* Nothing to export at 0 results — keep the control visible but inert */}
            <Button variant="secondary" icon={<Upload size={20} />} disabled={itemCount === 0} onClick={() => setExportModalOpen(true)}>
              Export
            </Button>
          </TooltipTrigger>
        </div>
      </div>

      {/* Export modal */}
      {exportModalOpen && (
        <ModalMedium
          title="Export to CSV"
          onClose={() => setExportModalOpen(false)}
          footer={
            <>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  if (onExport) onExport('all')
                  setExportModalOpen(false)
                }}
              >
                All Columns
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  if (onExport) onExport('filtered')
                  setExportModalOpen(false)
                }}
              >
                Visible Columns
              </Button>
            </>
          }
        >
          <p className="text-label-sm-regular" style={{ color: 'var(--text-tertiary)', margin: 0 }}>
            {itemCount > 10000
              ? 'Choose which columns to include in the export. Only the first 10,000 records will be exported.'
              : `${itemCount.toLocaleString()} records will be exported, choose which columns to include in the export.`}
          </p>
        </ModalMedium>
      )}
    </div>
  )
})
export default TableControls
