import React, { useState, useRef, useCallback } from 'react'
import { Search, Bookmark, ArrowUpDown, Upload, ChevronDown, X } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import SearchChipPanel from './SearchChipPanel'
import DarkTooltip from '../ui/DarkTooltip'
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
  const [focused, setFocused] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const inputRef = useRef(null)

  const handleClear = useCallback(() => {
    onSearchChange('')
    if (onChipSelect) onChipSelect(null)
    inputRef.current?.blur()
  }, [onSearchChange, onChipSelect])

  const bookmarkActive = savedSearchesOpen || !!appliedSavedQuery

  return (
    <div style={{ marginBottom: 'var(--spacing-3)' }}>
      {/* Row 1: Controls */}
      <div className="flex items-center justify-between">
        {/* Left group: item count + search bar */}
        <div className="flex items-center gap-4">
        <span className="text-sm shrink-0" style={{ color: (searchQuery.trim() || filtersOpen) ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: (searchQuery.trim() || filtersOpen) ? 600 : 400, transition: 'color 0.15s ease' }}>
          {itemCount} items
        </span>

        {/* Search bar */}
        <div
          className="flex items-center shrink-0"
          style={{
            flex: 1,
            maxWidth: 420,
            width: 420,
            gap: 8,
            background: 'var(--bg-primary)',
            border: `${focused ? '2px' : '1px'} solid ${focused ? 'var(--deep-sea-neutral-600, #4C5463)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '0 12px',
            height: 36,
            boxShadow: 'var(--shadow-sm)',
            transition: 'border-color 0.15s ease',
          }}
        >
          <Search
            {...ICON_MD}
            style={{
              color: focused ? 'var(--text-tertiary)' : 'var(--text-placeholder)',
              flexShrink: 0,
              transition: 'color 0.15s ease',
            }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search shipments..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="flex-1 bg-transparent min-w-0"
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-primary)',
              fontSize: 14,
              fontWeight: 400,
              lineHeight: '20px',
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
            }}
          />
          {appliedSavedQuery && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 6px 2px 8px',
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--text-tertiary)',
                maxWidth: 200,
                flexShrink: 0,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {appliedSavedQuery.name}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onClearSavedQuery && onClearSavedQuery() }}
                className="flex items-center justify-center bg-transparent border-none cursor-pointer"
                style={{
                  padding: 0,
                  color: 'var(--text-tertiary)',
                  flexShrink: 0,
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
              >
                <X size={12} />
              </button>
            </span>
          )}
          {searchQuery && (
            <button
              className="flex items-center justify-center bg-transparent border-none cursor-pointer shrink-0"
              onClick={handleClear}
              style={{
                padding: 0,
                color: 'var(--text-placeholder)',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-placeholder)'}
            >
              <X size={14} />
            </button>
          )}
          {/* Bookmark button with divider */}
          <button
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (onToggleSavedSearches) onToggleSavedSearches()
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center bg-transparent border-none cursor-pointer shrink-0"
            style={{
              padding: '0 0 0 8px',
              marginLeft: 4,
              color: bookmarkActive ? 'var(--text-primary)' : 'var(--text-placeholder)',
              borderLeft: '1px solid var(--border-subtle)',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => { if (!bookmarkActive) e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { if (!bookmarkActive) e.currentTarget.style.color = 'var(--text-placeholder)' }}
            title="Saved searches"
          >
            <Bookmark {...ICON_MD} fill={bookmarkActive ? 'currentColor' : 'none'} />
          </button>
        </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="flex items-center justify-center"
            style={{
              width: 32, height: 32,
              background: 'var(--btn-secondary-bg)',
              border: '1px solid var(--btn-secondary-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
            }}
            title="Sort"
          >
            <ArrowUpDown {...ICON_MD} style={{ color: 'var(--btn-secondary-text)' }} />
          </button>
          <DarkTooltip text="Only the first 10,000 records will be exported to Excel" width={220} align="right">
            <Button variant="secondary" icon={<Upload size={20} />} onClick={() => setExportModalOpen(true)}>
              Export
            </Button>
          </DarkTooltip>
        </div>
      </div>

      {/* Row 2: Chips row — only visible when there's a search query */}
      {searchQuery.trim() && itemCount > 0 && (
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
