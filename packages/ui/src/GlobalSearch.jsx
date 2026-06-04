import React, { useState, useRef, useLayoutEffect } from 'react'
import { ChevronLeft, ChevronRight, CircleX, X } from 'lucide-react'
import { ICON_MD, ICON_LG } from '@odyssey/tokens'
import FilterButton from './FilterButton.jsx'
import Badge from './Badge.jsx'
import FilterSuggestions from './FilterSuggestions.jsx'

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
  showFilter = true,
  filterCount = 0,
  filterActive,
  onFilterClick,
  onFocus,
  onBlur,
  chips = [],
  onChipRemove,
  suggestionSections = [],
  suggestionsOpen = false,
  onSuggestionSelect,
}) {
  const [focused, setFocused] = useState(false)
  const [internalActive, setInternalActive] = useState(false)
  const [dropdownLeft, setDropdownLeft] = useState(0)
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)

  // Reposition the suggestions dropdown to align with the start of the input
  // (trailing edge of the last committed chip). Caps at the wrapper's right
  // edge so the panel never starts past the end of the field.
  useLayoutEffect(() => {
    if (!inputRef.current || !wrapperRef.current) return
    const inputLeft = inputRef.current.offsetLeft
    const wrapperWidth = wrapperRef.current.offsetWidth
    setDropdownLeft(Math.min(inputLeft, wrapperWidth))
  }, [chips])

  // `filterActive` is optional-controlled: when provided, the consumer owns the
  // drawer-open state; otherwise GlobalSearch toggles it internally on click.
  const controlled = filterActive !== undefined
  const active = controlled ? filterActive : internalActive

  const handleFilterClick = () => {
    const next = !active
    if (!controlled) setInternalActive(next)
    onFilterClick?.(next)
  }

  // Bar reads as focused when the input is focused OR the filter is active.
  const barFocused = focused || active
  const accent = barFocused
    ? 'var(--deep-sea-neutral-200)'
    : 'var(--deep-sea-neutral-400)'

  const showBadge = showFilter && filterCount > 0
  const badgeLabel = filterCount > 99 ? '99+' : String(filterCount)

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
        ref={wrapperRef}
        className={`global-search-wrapper relative flex items-center${barFocused ? ' focused' : ''}`}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'var(--deep-sea-neutral-900)',
          boxShadow: 'var(--shadow-sm)',
          borderRadius: 'var(--radius-lg)',
          gap: 'var(--spacing-3)',
          // FilterButton sits flush to the right edge (its own rounded corners
          // follow the bar), so drop the right padding when it's shown.
          padding: showFilter ? '0 0 0 var(--spacing-3)' : '0 var(--spacing-3)',
        }}
      >
        {/* Inner group: chips + input share a 4px gap. The outer wrapper's
            12px gap then separates this group from the clear/filter buttons. */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 4, minWidth: 0 }}>
          {chips.map((chip) => (
            <span key={chip.key} className="global-search-chip text-label-xs-medium">
              {chip.label}
              <button
                type="button"
                className="global-search-chip__remove"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onChipRemove?.(chip.key)}
                aria-label={`Remove ${chip.label}`}
              >
                <X size={12} strokeWidth={2.25} />
              </button>
            </span>
          ))}

          <input
            ref={inputRef}
            type="text"
            value={value}
            placeholder={chips.length ? '' : placeholder}
            onChange={(e) => onChange?.(e.target.value)}
            onFocus={() => { setFocused(true); onFocus?.() }}
            onBlur={() => { setFocused(false); onBlur?.() }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !value && chips.length > 0) {
                onChipRemove?.(chips[chips.length - 1].key)
              }
            }}
            className="global-search-input flex-1 bg-transparent border-none outline-none min-w-0"
            style={{
              color: 'var(--text-inverse)',
              fontFamily: 'var(--font-primary)',
              fontSize: 'var(--font-size-sm)',
              lineHeight: 'var(--line-height-sm)',
              minWidth: 80,
            }}
          />
        </div>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { if (value || chips.length > 0) onClear?.() }}
          className="global-search-clear flex items-center justify-center border-none bg-transparent cursor-pointer p-0 shrink-0"
          style={{ color: accent }}
          aria-label="Clear search"
        >
          <CircleX {...ICON_MD} />
        </button>

        {showFilter && (
          <FilterButton active={active} onClick={handleFilterClick} />
        )}

        {/* Count badge — sibling overlay so it can overhang the bar's
            top-right corner without the wrapper clipping it. Sits after
            FilterButton so the press-pop can be driven via the sibling
            combinator (.filter-button:active ~ .global-search-badge). */}
        {showBadge && (
          <span className="global-search-badge">
            <Badge variant="count">{badgeLabel}</Badge>
          </span>
        )}

        {/* Suggestions dropdown — anchored below the bar, spanning its width.
            onMouseDown preventDefault keeps the input focused so a chip click
            registers before blur would close the panel. Domain-agnostic: it just
            renders whatever sections the consumer passes (one FilterSuggestions
            per section). */}
        {suggestionsOpen && suggestionSections.length > 0 && (
          <div
            className="global-search-dropdown"
            onMouseDown={(e) => e.preventDefault()}
            style={{
              // Aligns to the input's current left offset within the bar so the
              // dropdown tracks the trailing edge of committed chips. Capped at
              // wrapper width so it never starts past the end of the field.
              position: 'absolute',
              top: 'calc(100% + 2px)',
              left: dropdownLeft,
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 'var(--spacing-2)',
            }}
          >
            {suggestionSections.map((section, i) => (
              <FilterSuggestions
                key={i}
                title={section.title}
                items={section.items}
                onSelect={section.onSelect || onSuggestionSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
