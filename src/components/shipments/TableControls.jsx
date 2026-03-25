import { useState, useRef, useCallback } from 'react'
import { Search, Bookmark, ArrowUpDown, Upload, ChevronDown, X } from 'lucide-react'
import SearchChipPanel from './SearchChipPanel'

export default function TableControls({
  itemCount,
  searchQuery,
  onSearchChange,
  activeChipKey,
  onChipSelect,
  onToggleFilters,
  onToggleSavedSearches,
}) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)

  const handleClear = useCallback(() => {
    onSearchChange('')
    if (onChipSelect) onChipSelect(null)
    inputRef.current?.focus()
  }, [onSearchChange, onChipSelect])

  return (
    <div style={{ marginBottom: 'var(--spacing-3)' }}>
      {/* Row 1: Controls */}
      <div className="flex items-center justify-between">
        {/* Left group: item count + search bar */}
        <div className="flex items-center gap-4">
        <span className="text-sm shrink-0" style={{ color: 'var(--text-tertiary)' }}>
          {itemCount} items
        </span>

        {/* Search bar — constrained width */}
        <div
          className="flex items-center gap-2 shrink-0"
          style={{
            width: 420,
            background: 'var(--bg-primary)',
            border: `1px solid ${focused ? 'var(--input-border-focus)' : 'var(--input-border)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '0 12px',
            height: 36,
            boxShadow: 'var(--shadow-sm)',
            transition: 'border-color var(--transition-fast)',
          }}
        >
          <Search size={16} style={{ color: focused ? 'var(--text-tertiary)' : 'var(--text-placeholder)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search shipments..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="flex-1 bg-transparent border-none outline-none text-sm min-w-0"
            style={{ color: 'var(--input-text)', fontFamily: 'var(--font-primary)' }}
          />
          {searchQuery && (
            <button
              className="flex items-center justify-center bg-transparent border-none cursor-pointer p-0.5 shrink-0"
              onClick={handleClear}
              style={{ color: 'var(--text-placeholder)' }}
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
            className="flex items-center justify-center bg-transparent border-none cursor-pointer p-0.5 shrink-0"
            style={{
              color: 'var(--text-placeholder)',
              borderLeft: '1px solid var(--border-subtle)',
              paddingLeft: 8,
              marginLeft: 4,
            }}
            title="Saved searches"
          >
            <Bookmark size={16} />
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
          <button
            className="flex items-center gap-1.5 text-sm font-medium"
            style={{
              background: 'var(--btn-secondary-bg)',
              border: '1px solid var(--btn-secondary-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '6px 12px',
              cursor: 'pointer',
              color: 'var(--btn-secondary-text)',
            }}
          >
            <Upload size={16} />
            <span>Export</span>
          </button>
          <button
            className="flex items-center gap-1.5 text-sm font-medium"
            style={{
              background: 'var(--btn-secondary-bg)',
              border: '1px solid var(--btn-secondary-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '6px 12px',
              cursor: 'pointer',
              color: 'var(--btn-secondary-text)',
            }}
          >
            <span>Actions</span>
            <ChevronDown size={16} />
          </button>
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
    </div>
  )
}
