import { useState, useRef, useCallback } from 'react'
import { Search, Bookmark, SlidersHorizontal, Upload, ChevronDown, ArrowUpDown } from 'lucide-react'
import SearchChipPanel from './SearchChipPanel'

export default function TableControls({
  itemCount,
  searchQuery,
  onSearchChange,
  activeChipKey,
  onChipSelect,
  onToggleFilters,
}) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)

  const handleClear = useCallback(() => {
    onSearchChange('')
    if (onChipSelect) onChipSelect(null)
    inputRef.current?.focus()
  }, [onSearchChange, onChipSelect])

  return (
    <div className="flex items-center gap-4 relative" style={{ marginBottom: 12 }}>
      {/* Item count */}
      <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
        {itemCount} items
      </span>

      {/* Search bar wrapper */}
      <div className="flex-1 relative">
        <div
          className="flex items-center gap-2"
          style={{
            background: 'var(--bg-primary)',
            border: `1px solid ${focused ? 'var(--input-border-focus)' : 'var(--input-border)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '0 12px',
            height: 36,
            transition: 'border-color 0.15s ease',
          }}
        >
          <Search size={16} style={{ color: 'var(--text-placeholder)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search shipments..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              // Delay blur to allow chip clicks
              setTimeout(() => setFocused(false), 200)
            }}
            className="flex-1 bg-transparent border-none outline-none text-sm min-w-0"
            style={{ color: 'var(--input-text)', fontFamily: 'var(--font-primary)' }}
          />
          {searchQuery && (
            <button
              className="flex items-center justify-center bg-transparent border-none cursor-pointer p-0.5"
              onClick={handleClear}
              style={{ color: 'var(--text-placeholder)' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          <button
            className="flex items-center justify-center bg-transparent border-none cursor-pointer p-0.5"
            style={{ color: 'var(--text-placeholder)' }}
          >
            <Bookmark size={16} />
          </button>
        </div>

        {/* Chip suggestions panel */}
        {focused && searchQuery.trim() && (
          <SearchChipPanel
            query={searchQuery}
            activeChipKey={activeChipKey}
            onChipSelect={onChipSelect}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
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
          className="flex items-center justify-center"
          onClick={onToggleFilters}
          style={{
            width: 32, height: 32,
            background: 'var(--btn-secondary-bg)',
            border: '1px solid var(--btn-secondary-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
          }}
          title="Filters"
        >
          <SlidersHorizontal size={16} style={{ color: 'var(--btn-secondary-text)' }} />
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
  )
}
