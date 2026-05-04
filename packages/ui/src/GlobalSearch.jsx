import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, CircleX } from 'lucide-react'
import { ICON_MD, ICON_LG } from '@odyssey/tokens'

export default function GlobalSearch({
  scope = 'All',
  onScopeClick,
  dropdownOpen = false,
  dropdownIcon,
  value = '',
  onChange,
  onClear,
  onBack,
  onForward,
  placeholder = 'Search',
  minWidth = 400,
  maxWidth = 800,
}) {
  const [inputFocused, setInputFocused] = useState(false)
  const focused = inputFocused || dropdownOpen
  const accent = focused
    ? 'var(--deep-sea-neutral-200)'
    : 'var(--deep-sea-neutral-400)'
  const ChevronIcon = dropdownOpen ? ChevronUp : ChevronDown

  return (
    <div className="flex items-center" style={{ gap: 'var(--spacing-2)', flex: 1, minWidth: 0 }}>
      <div className="flex items-center" style={{ gap: 'var(--spacing-1)', height: 32 }}>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center border-none bg-transparent cursor-pointer"
          style={{ padding: 'var(--spacing-1) 6px', color: 'var(--deep-sea-neutral-400)' }}
          aria-label="Back"
        >
          <ChevronLeft {...ICON_LG} />
        </button>
        <button
          type="button"
          onClick={onForward}
          className="flex items-center justify-center border-none bg-transparent cursor-pointer"
          style={{ padding: 'var(--spacing-1) 6px', color: 'var(--deep-sea-neutral-400)' }}
          aria-label="Forward"
        >
          <ChevronRight {...ICON_LG} />
        </button>
      </div>

      <div
        className={`global-search-wrapper relative flex items-center overflow-hidden${focused ? ' focused' : ''}`}
        style={{
          flex: 1,
          minWidth,
          maxWidth,
          background: 'var(--deep-sea-neutral-900)',
          boxShadow: 'var(--shadow-sm)',
          borderRadius: 'var(--radius-lg)',
          gap: 'var(--spacing-3)',
          paddingRight: 'var(--spacing-3)',
        }}
      >
        <button
          type="button"
          onClick={onScopeClick}
          className="global-search-scope flex items-center shrink-0 whitespace-nowrap border-none cursor-pointer"
          style={{
            gap: 'var(--spacing-3)',
            padding: '6px 8px 6px 12px',
            background: 'var(--deep-sea-neutral-700)',
            borderRight: '1px solid var(--deep-sea-neutral-600)',
            color: accent,
            fontFamily: 'var(--font-primary)',
            fontSize: 'var(--font-size-sm)',
            lineHeight: 'var(--line-height-sm)',
          }}
        >
          {scope}
          {dropdownIcon ?? <ChevronIcon {...ICON_MD} />}
        </button>

        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          className="global-search-input flex-1 bg-transparent border-none outline-none min-w-0"
          style={{
            color: 'var(--text-inverse)',
            fontFamily: 'var(--font-primary)',
            fontSize: 'var(--font-size-sm)',
            lineHeight: 'var(--line-height-sm)',
          }}
        />

        <button
          type="button"
          // Prevent the click from stealing focus from the input — keeps the
          // searchbar in its focused state while clearing.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { if (value) onClear?.() }}
          className="global-search-clear flex items-center justify-center border-none bg-transparent cursor-pointer p-0 shrink-0"
          style={{ color: accent }}
          aria-label="Clear search"
        >
          <CircleX {...ICON_MD} />
        </button>
      </div>
    </div>
  )
}
