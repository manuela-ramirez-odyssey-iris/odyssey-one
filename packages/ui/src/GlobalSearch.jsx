import React, { useState, useRef, useLayoutEffect, useEffect, useMemo, useId } from 'react'
import { Check, ChevronLeft, ChevronRight, CircleX, Copy, X } from 'lucide-react'
import { ICON_MD, ICON_LG } from '@odyssey/tokens'
import FilterButton from './FilterButton.jsx'
import Badge from './Badge.jsx'
import FilterSuggestions from './FilterSuggestions.jsx'
import SearchChip from './SearchChip.jsx'

/**
 * Combobox highlight movement (S80 keyboard navigation). Pure so it's directly
 * unit-testable: wraps at both ends; from "no highlight" (-1) ArrowDown enters
 * the list at the top and ArrowUp at the bottom.
 */
export function moveHighlight(count, current, delta) {
  if (count <= 0) return -1
  if (current < 0) return delta > 0 ? 0 : count - 1
  return (current + delta + count) % count
}

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
      className="global-search-title flex items-center justify-center text-heading-xl-semibold"
      style={{
        flex: 1,
        minWidth,
        maxWidth,
        paddingTop: 2,
        paddingBottom: 2,
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
  // Copies the applied query (bar text + committed chips). Optional — the copy
  // button only renders when a consumer wires it, so bars that don't support
  // copying show no dead control. Figma `Copy Search Icon` on set `658:18`.
  onCopy,
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
  onChipClick,
  // GS-21: edit-commit from an expanded set chip — (chipKey, values[]).
  onSetCommit,
  // Case 12: date picks from an open date chip — (chipKey, { from, to }).
  onDateCommit,
  // Case 12: the date chip's controlled open state — (chipKey, open).
  onDateToggle,
  suggestionSections = [],
  suggestionsOpen = false,
  onSuggestionSelect,
  // When the consumer's results panel is open the bar stays expanded so the
  // committed chips stay fully visible while the user reads results.
  resultsOpen = false,
}) {
  const [focused, setFocused] = useState(false)
  const [internalActive, setInternalActive] = useState(false)
  const [dropdownLeft, setDropdownLeft] = useState(0)
  // Number of trailing chips collapsed behind the "+N" pill at rest.
  const [hiddenCount, setHiddenCount] = useState(0)
  // Keyboard highlight over the suggestion chips (S80): flat index across all
  // sections, -1 = none. aria-activedescendant pattern — DOM focus stays on the
  // input; the highlighted chip is only pointed at.
  const [activeIdx, setActiveIdx] = useState(-1)
  // Transient copy confirmation — the icon becomes a Check for 1.5s. No toast
  // system exists and one control doesn't justify inventing one.
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef(null)
  const listboxId = useId()
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)
  const chipsRef = useRef(null)
  const measurerRef = useRef(null)

  useEffect(() => () => clearTimeout(copiedTimer.current), [])

  const canCopy = !!value || chips.length > 0
  const handleCopy = () => {
    onCopy?.()
    setCopied(true)
    clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), 1500)
  }

  // `filterActive` is optional-controlled: when provided, the consumer owns the
  // drawer-open state; otherwise GlobalSearch toggles it internally on click.
  const controlled = filterActive !== undefined
  const active = controlled ? filterActive : internalActive

  // Bar reads as focused when the input is focused OR the filter is active.
  const barFocused = focused || active
  // Expanded = the chips wrap to multiple lines and the bar grows downward as
  // an overlay (navbar height stays fixed). Collapsed = single line + "+N".
  const expanded = focused || active || resultsOpen

  // Chips actually rendered in the bar: all of them when expanded; the leading
  // ones that fit when collapsed (the rest fold into the "+N" pill).
  const shownChips = expanded ? chips : chips.slice(0, chips.length - hiddenCount)

  // Measure how many trailing chips overflow the single-line width when
  // collapsed. Uses a hidden measurer that always holds every chip at full
  // width, so the count stays correct regardless of how many are shown.
  useLayoutEffect(() => {
    if (expanded) {
      if (hiddenCount !== 0) setHiddenCount(0)
      return
    }
    const group = chipsRef.current
    const measurer = measurerRef.current
    if (!group || !measurer) return
    const measure = () => {
      const avail = group.clientWidth
      const nodes = [...measurer.children]
      const GAP = 4
      const RESERVE = 48 // room for the "+N" pill
      let total = 0
      nodes.forEach((n, i) => { total += n.offsetWidth + (i ? GAP : 0) })
      if (total <= avail) { setHiddenCount(0); return }
      let used = 0
      let count = 0
      for (let i = 0; i < nodes.length; i++) {
        const w = nodes[i].offsetWidth + (i ? GAP : 0)
        if (used + w + RESERVE <= avail) { used += w; count++ } else break
      }
      setHiddenCount(Math.max(0, chips.length - count))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(group)
    return () => ro.disconnect()
  }, [chips, expanded])

  // Keep the suggestions dropdown aligned to the input (trailing edge of the
  // last committed chip). Re-measures on expand/collapse and chip changes so it
  // follows the input even after the chips wrap to a new line. Caps at the
  // wrapper's right edge so the panel never starts past the end of the field.
  useLayoutEffect(() => {
    if (!inputRef.current || !wrapperRef.current) return
    const inputLeft = inputRef.current.offsetLeft
    const wrapperWidth = wrapperRef.current.offsetWidth
    setDropdownLeft(Math.min(inputLeft, wrapperWidth))
  }, [chips, expanded, hiddenCount])

  const handleFilterClick = () => {
    const next = !active
    if (!controlled) setInternalActive(next)
    onFilterClick?.(next)
  }

  // ---- Suggestion keyboard navigation (S80) --------------------------------
  const dropdownVisible = suggestionsOpen && suggestionSections.length > 0
  // Flat list of every suggestion item (visual order) + its select handler.
  const flatItems = useMemo(
    () => suggestionSections.flatMap((section) =>
      section.items.map((item) => ({ item, onSelect: section.onSelect || onSuggestionSelect }))),
    [suggestionSections, onSuggestionSelect],
  )
  // Flat-index offset of each section's first item, for per-section option ids.
  const sectionOffsets = useMemo(() => {
    const offsets = []
    let acc = 0
    for (const s of suggestionSections) { offsets.push(acc); acc += s.items.length }
    return offsets
  }, [suggestionSections])
  const optionId = (i) => `${listboxId}-option-${i}`

  // Standard combobox behavior: the highlight resets whenever the suggestions
  // change or the dropdown closes.
  useEffect(() => { setActiveIdx(-1) }, [suggestionSections, dropdownVisible])

  // Keep the highlighted chip visible inside the capped, scrollable list.
  useEffect(() => {
    if (activeIdx < 0) return
    document.getElementById(`${listboxId}-option-${activeIdx}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIdx, listboxId])

  const handleInputKeyDown = (e) => {
    if (dropdownVisible && flatItems.length > 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const delta = e.key === 'ArrowDown' ? 1 : -1
        setActiveIdx((cur) => moveHighlight(flatItems.length, cur, delta))
        return
      }
      if (e.key === 'Enter' && activeIdx >= 0 && activeIdx < flatItems.length) {
        // A highlighted suggestion owns Enter: select it (same as clicking) and
        // stop the event so consumer commit-on-Enter handlers don't also fire.
        e.preventDefault()
        e.stopPropagation()
        const { item, onSelect } = flatItems[activeIdx]
        onSelect?.(item)
        setActiveIdx(-1)
        return
      }
    }
    if (e.key === 'Backspace' && !value && chips.length > 0) {
      onChipRemove?.(chips[chips.length - 1].key)
    }
  }

  const accent = barFocused
    ? 'var(--deep-sea-neutral-200)'
    : 'var(--deep-sea-neutral-400)'

  const showBadge = showFilter && filterCount > 0
  const badgeLabel = filterCount > 99 ? '99+' : String(filterCount)

  const renderChip = (chip) => chip.kind === 'date-range' ? (
    // Case 12 — a committed date / date-range criterion: SearchChip date mode
    // (CalendarPicker in the mini panel). Commits arrive pre-opened
    // (defaultOpen) so the pick finishes in place.
    <SearchChip
      key={chip.key}
      dateLabel={chip.single ? chip.attrLabel : `${chip.attrLabel} Range`}
      range={!chip.single}
      from={chip.from}
      to={chip.single ? null : chip.to}
      open={chip.open ?? false}
      invalid={chip.invalid}
      // The typed-month hint only aims the FIRST open; once a date is picked,
      // the calendar seeds from the picked value (defaultMonth outranks value
      // in CalendarPicker, so it must drop out here).
      defaultMonth={!chip.from && chip.monthHint ? new Date(chip.monthHint.y, chip.monthHint.m - 1, 1) : undefined}
      onOpenChange={(next) => onDateToggle?.(chip.key, next)}
      onDateChange={(next) => onDateCommit?.(chip.key, next)}
      onRemove={() => onChipRemove?.(chip.key)}
    />
  ) : chip.kind === 'set' ? (
    // GS-21 — a committed multi-code SET renders as the expandable SearchChip:
    // summary badge + EditableMiniPanel anchored below. Edits commit through
    // onSetCommit (Enter / collapse / outside click), removal through the
    // same remove routing as any chip.
    <SearchChip
      key={chip.key}
      typeLabel={chip.typeLabel}
      codes={chip.codes}
      onCommit={(values) => onSetCommit?.(chip.key, values)}
      onRemove={() => onChipRemove?.(chip.key)}
    />
  ) : (
    <span
      key={chip.key}
      className="global-search-chip text-label-xs-medium"
      role="button"
      tabIndex={0}
      // Keep the input focused on click so the bar doesn't collapse mid-click
      // (which would remove a wrapped second-row chip before onClick fires).
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onChipClick?.(chip)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onChipClick?.(chip) }}
    >
      {chip.label}
      <button
        type="button"
        className="global-search-chip__remove"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => { e.stopPropagation(); onChipRemove?.(chip.key) }}
        aria-label={`Remove ${chip.label}`}
      >
        <X size={12} strokeWidth={2.25} />
      </button>
    </span>
  )

  return (
    // Outer row is locked to 32px and aligns children to the top: the bar grows
    // downward out of this row (overflow stays visible) so the navbar height
    // never changes when chips wrap.
    <div className="flex" style={{ gap: 'var(--spacing-2)', flex: 1, minWidth, maxWidth, height: 32, alignItems: 'flex-start' }}>
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
        className={`global-search-wrapper relative flex${barFocused ? ' focused' : ''}${expanded ? ' expanded' : ''}`}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 32,
          // Content stays vertically centered; the bar's top is pinned by the
          // outer row (align flex-start) so growth goes downward.
          alignItems: 'center',
          background: 'var(--deep-sea-neutral-900)',
          boxShadow: 'var(--shadow-sm)',
          borderRadius: 'var(--radius-lg)',
          gap: 'var(--spacing-3)',
          // FilterButton sits flush to the right edge (its own rounded corners
          // follow the bar), so drop the right padding when it's shown. Expanded
          // adds 6px top/bottom so wrapped rows get breathing room.
          padding: `${expanded ? '6px' : '0'} ${showFilter ? '0' : 'var(--spacing-3)'} ${expanded ? '6px' : '0'} var(--spacing-3)`,
        }}
      >
        {/* Hidden measurer: always holds every chip at natural width so the
            "+N" overflow count stays accurate as the bar resizes. Out of flow,
            so it never affects layout. Only needed while collapsed. */}
        {!expanded && (
          <div ref={measurerRef} className="global-search-measurer" aria-hidden="true">
            {chips.map((chip) => (
              <span key={chip.key} className="global-search-chip text-label-xs-medium">
                {chip.label}
                <span className="global-search-chip__remove"><X size={12} strokeWidth={2.25} /></span>
              </span>
            ))}
          </div>
        )}

        {/* Inner group: chips + input share a 4px gap. Collapsed = nowrap +
            clipped; expanded = wraps to multiple lines. */}
        <div ref={chipsRef} className="global-search-chips">
          {shownChips.map(renderChip)}

          {!expanded && hiddenCount > 0 && (
            <button
              type="button"
              className="global-search-overflow text-label-xs-medium"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.focus()}
              aria-label={`Show ${hiddenCount} more ${hiddenCount === 1 ? 'filter' : 'filters'}`}
            >
              +{hiddenCount}
            </button>
          )}

          <input
            ref={inputRef}
            type="text"
            value={value}
            placeholder={chips.length ? '' : placeholder}
            onChange={(e) => onChange?.(e.target.value)}
            onFocus={() => { setFocused(true); onFocus?.() }}
            onBlur={() => { setFocused(false); onBlur?.() }}
            onKeyDown={handleInputKeyDown}
            role="combobox"
            aria-expanded={dropdownVisible}
            aria-controls={dropdownVisible ? listboxId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={activeIdx >= 0 ? optionId(activeIdx) : undefined}
            className="global-search-input flex-1 bg-transparent border-none outline-none min-w-0"
            style={{
              color: 'var(--text-inverse)',
              fontFamily: 'var(--font-primary)',
              fontSize: 'var(--font-size-sm)',
              lineHeight: 'var(--line-height-sm)',
              minWidth: 0,
            }}
          />
        </div>

        {onCopy && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCopy}
            disabled={!canCopy}
            className="global-search-copy flex items-center justify-center border-none bg-transparent cursor-pointer p-0 shrink-0"
            style={{ color: accent }}
            aria-label={copied ? 'Copied' : 'Copy search'}
          >
            {copied ? <Check {...ICON_MD} /> : <Copy {...ICON_MD} />}
          </button>
        )}

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
          <span key={badgeLabel} className="global-search-badge">
            <Badge variant="count">{badgeLabel}</Badge>
          </span>
        )}

        {/* Suggestions dropdown — anchored below the bar, spanning its width.
            onMouseDown preventDefault keeps the input focused so a chip click
            registers before blur would close the panel. Domain-agnostic: it just
            renders whatever sections the consumer passes (one FilterSuggestions
            per section). */}
        {dropdownVisible && (
          <div
            className="global-search-dropdown"
            id={listboxId}
            role="listbox"
            aria-label="Suggested filters"
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
                // Combobox wiring (S80): option ids + which chip carries the
                // keyboard highlight, translated into this section's local index.
                optionId={(j) => optionId(sectionOffsets[i] + j)}
                activeIndex={activeIdx - sectionOffsets[i]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
