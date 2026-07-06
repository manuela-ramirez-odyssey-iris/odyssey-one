import React, { useState } from 'react'
import { ArrowUpDown, Upload } from 'lucide-react'
import SearchChipPanel from './SearchChipPanel'
import TooltipTrigger from '../ui/TooltipTrigger'
import { Button, ModalMedium } from '@odyssey/ui'

const TableControls = React.memo(function TableControls({
  itemCount,
  totalCount,
  searchQuery,
  onSearchChange,
  activeChipKey,
  onChipSelect,
  onToggleFilters,
  onToggleSavedSearches,
  appliedSavedQuery,
  onClearSavedQuery,
  savedSearchesOpen,
  onExport,
  filtersOpen,
}) {
  const [exportModalOpen, setExportModalOpen] = useState(false)

  return (
    <div style={{ marginBottom: 'var(--spacing-3)' }}>
      {/* Row 1: Controls */}
      <div className="flex items-center justify-between">
        {/* Left: item count */}
        <span className="text-sm shrink-0" style={{ color: filtersOpen ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: filtersOpen ? 600 : 400, transition: 'color 0.15s ease' }}>
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
            <Button variant="secondary" icon={<Upload size={20} />} onClick={() => setExportModalOpen(true)}>
              Export
            </Button>
          </TooltipTrigger>
        </div>
      </div>

      {/* Row 2: Chips row — only visible when there's a search query */}
      {searchQuery && searchQuery.trim() && itemCount > 0 && (
        <SearchChipPanel
          query={searchQuery}
          activeChipKey={activeChipKey}
          onChipSelect={onChipSelect}
          onToggleFilters={onToggleFilters}
          filtersOpen={filtersOpen}
        />
      )}

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
