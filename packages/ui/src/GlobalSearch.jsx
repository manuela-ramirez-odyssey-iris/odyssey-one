import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, CircleX } from 'lucide-react'
import { ICON_MD, ICON_LG } from '@odyssey/tokens'

export default function GlobalSearch({ mode = 'search', ...rest }) {
  if (mode === 'title') return <GlobalSearchTitle {...rest} />
  return <GlobalSearchSearch {...rest} />
}

function GlobalSearchTitle({
  title = 'Edit Dashboard',
  minWidth = 590,
  maxWidth = 900,
}) {
  return (
    <div
      className="flex items-center justify-center text-heading-xl-semibold"
      style={{
        flex: 1,
        minWidth,
        maxWidth,
        paddingTop: 2,
        paddingBottom: 2,
        color: 'var(--white)',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {title}
    </div>
  )
}

function GlobalSearchSearch({
  value = '',
  onChange,
  onClear,
  onBack,
  onForward,
  placeholder = 'Search',
  minWidth = 590,
  maxWidth = 900,
}) {
  const [focused, setFocused] = useState(false)
  const accent = focused
    ? 'var(--deep-sea-neutral-200)'
    : 'var(--deep-sea-neutral-400)'

  return (
    <div className="flex items-center" style={{ gap: 'var(--spacing-2)', flex: 1, minWidth, maxWidth }}>
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
          minWidth: 0,
          background: 'var(--deep-sea-neutral-900)',
          boxShadow: 'var(--shadow-sm)',
          borderRadius: 'var(--radius-lg)',
          gap: 'var(--spacing-3)',
          padding: '0 var(--spacing-3)',
        }}
      >
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
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
