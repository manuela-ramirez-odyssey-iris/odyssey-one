import { useState, useRef, useCallback } from 'react'
import { Search, Bookmark, ArrowUpDown, Upload, ChevronDown, X, FileSpreadsheet } from 'lucide-react'
import SearchChipPanel from './SearchChipPanel'
import DarkTooltip from '../ui/DarkTooltip'

export default function TableControls({
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
}) {
  const [focused, setFocused] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const inputRef = useRef(null)

  const handleClear = useCallback(() => {
    onSearchChange('')
    if (onChipSelect) onChipSelect(null)
    inputRef.current?.focus()
  }, [onSearchChange, onChipSelect])

  const bookmarkActive = savedSearchesOpen || !!appliedSavedQuery

  return (
    <div style={{ marginBottom: 'var(--spacing-3)' }}>
      {/* Row 1: Controls */}
      <div className="flex items-center justify-between">
        {/* Left group: item count + search bar */}
        <div className="flex items-center gap-4">
        <span className="text-sm shrink-0" style={{ color: 'var(--text-tertiary)' }}>
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
            border: `1px solid ${focused ? 'var(--border-strong, var(--deep-sea-neutral-900))' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '0 12px',
            height: 36,
            boxShadow: 'var(--shadow-sm)',
            transition: 'border-color 0.15s ease',
          }}
        >
          <Search
            size={16}
            style={{
              color: focused ? 'var(--text-tertiary)' : 'var(--text-placeholder)',
              flexShrink: 0,
              transition: 'color 0.15s ease',
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
          <input
            ref={inputRef}
            type="text"
            placeholder="Search shipments..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
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
            className="flex items-center justify-center bg-transparent border-none cursor-pointer shrink-0"
            style={{
              padding: '0 0 0 8px',
              marginLeft: 4,
              color: bookmarkActive ? 'var(--text-primary)' : 'var(--text-placeholder)',
              borderLeft: '1px solid var(--border-subtle)',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => { if (!bookmarkActive) e.currentTarget.style.color = 'var(--text-secondary)' }}
            onMouseLeave={(e) => { if (!bookmarkActive) e.currentTarget.style.color = 'var(--text-placeholder)' }}
            title="Saved searches"
          >
            <Bookmark size={16} fill={bookmarkActive ? 'currentColor' : 'none'} />
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
            <ArrowUpDown size={16} style={{ color: 'var(--btn-secondary-text)' }} />
          </button>
          <DarkTooltip text="Only the first 10,000 records will be exported to Excel" width={220}>
            <button
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{
                background: 'var(--btn-secondary-bg)',
                border: '1px solid var(--btn-secondary-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '6px 12px',
                cursor: 'pointer',
                color: 'var(--btn-secondary-text)',
                transition: 'color 0.15s ease, background 0.15s ease',
              }}
              onClick={() => setExportModalOpen(true)}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-tertiary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--btn-secondary-text)'; e.currentTarget.style.background = 'var(--btn-secondary-bg)' }}
            >
              <Upload size={16} />
              <span>Export</span>
            </button>
          </DarkTooltip>
        </div>
      </div>

      {/* Row 2: Chips row — only visible when there's a search query */}
      {searchQuery.trim() && (
        <SearchChipPanel
          query={searchQuery}
          activeChipKey={activeChipKey}
          onChipSelect={onChipSelect}
          onToggleFilters={onToggleFilters}
        />
      )}

      {/* Export modal */}
      {exportModalOpen && (
        <div
          onClick={() => setExportModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              padding: '24px',
              width: 380,
              fontFamily: 'var(--font-primary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileSpreadsheet size={20} style={{ color: 'var(--text-tertiary)' }} />
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Export to CSV</span>
              </div>
              <button
                onClick={() => setExportModalOpen(false)}
                className="flex items-center justify-center bg-transparent border-none cursor-pointer"
                style={{ color: 'var(--text-placeholder)', padding: 0, transition: 'color 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-placeholder)'}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 20px', lineHeight: 1.5 }}>
              Choose which columns to include in the export. Only the first 10,000 records will be exported.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => {
                  if (onExport) onExport('all')
                  setExportModalOpen(false)
                }}
                className="flex items-center justify-between text-sm font-medium"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-primary)',
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border-strong, var(--deep-sea-neutral-900))' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.borderColor = 'var(--border-default)' }}
              >
                <span>Export all columns</span>
                <span style={{ fontSize: 12, color: 'var(--text-placeholder)' }}>{itemCount} records</span>
              </button>
              <button
                onClick={() => {
                  if (onExport) onExport('filtered')
                  setExportModalOpen(false)
                }}
                className="flex items-center justify-between text-sm font-medium"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-primary)',
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border-strong, var(--deep-sea-neutral-900))' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.borderColor = 'var(--border-default)' }}
              >
                <span>Export visible columns</span>
                <span style={{ fontSize: 12, color: 'var(--text-placeholder)' }}>{itemCount} records</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
