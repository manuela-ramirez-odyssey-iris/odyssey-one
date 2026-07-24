import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Upload } from 'lucide-react'
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
      // S82: no longer sticky — the toolbar scrolls away so the table header
      // and scrollbar are the only elements that stick (S79c decision 11 reversed).
      // Bottom padding removed — the sticky gap filler div in ShipmentTable replaces it.
      paddingTop: 'var(--spacing-6)',
    }}>
      {/* Row 1: Controls */}
      <div className="flex items-center justify-between">
        {/* Left: item count */}
        <span className="text-sm shrink-0" style={{ color: 'var(--text-tertiary)', transition: 'color 0.15s ease' }}>
          {itemCount} items
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <TooltipTrigger tooltipProps={{ groups: [{ content: 'Only the first 10,000 records will be exported to Excel' }] }}>
            {/* Nothing to export at 0 results — keep the control visible but inert */}
            <Button variant="secondary" size="sm" icon={<Upload size={20} />} disabled={itemCount === 0} onClick={() => setExportModalOpen(true)}>
              Export
            </Button>
          </TooltipTrigger>
        </div>
      </div>

      {/* Export modal — portaled to <body>: rendered in place it sits inside the
          sticky toolbar's stacking context, so its fixed overlay paints UNDER the
          navbar/sidebar. From <body> the z-200 overlay dims the whole viewport. */}
      {exportModalOpen && createPortal(
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
        </ModalMedium>,
        document.body,
      )}
    </div>
  )
})
export default TableControls
