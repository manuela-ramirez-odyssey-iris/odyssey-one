import { useState, useRef, useMemo, useId, useCallback } from 'react'
import { Search, CircleX, Info, ChevronDown } from 'lucide-react'
import { ICON_MD, ICON_LG } from '@odyssey/tokens'
import FieldSearchResults from './FieldSearchResults.jsx'
import { useFieldPopover } from './useFieldPopover.js'
import { moveHighlight } from './GlobalSearch.jsx'

/**
 * ComboBox (former SearchField) — organism. Mirrors the Shipments TableControls search recipe:
 * `--bg-primary` surface, 1px `--border-default` border (2px `--deep-sea-neutral-600`
 * on focus), `--shadow-sm`. Leading Search icon shifts text-placeholder → text-tertiary
 * on focus. Controlled via `value` + `onChange`.
 *
 * Optional label row above the input bar (toggled via `showLabel`), with an optional
 * info icon (toggled via `showInfoIcon`). Both default off so existing call sites
 * keep their flat input-only rendering.
 *
 * ── Typeahead / Autocomplete mode ──────────────────────────────────────────
 * Pass any of these props to activate the built-in typeahead popover:
 *   options       — { value, label }[] | string[]  static option list
 *   loadOptions   — (query, skip?) => Promise<Option[] | { options, total }>
 *                   async (debounced 200ms). Resolving { options, total } enables
 *                   paged mode: pages accumulate per query, and scrolling near the
 *                   list end lazily fetches loadOptions(query, accumulated.length)
 *                   until accumulated.length >= total. Plain arrays = legacy mode.
 *   onSelect      — (value: string | null) => void  fired on selection or clear
 *   emptyMessage  — string shown when filter matches nothing (default "No options")
 *   filter        — (inputText, option) => bool; default case-insensitive substring
 *   rowProps      — object forwarded to every MatchSimpleRow; defaults to
 *                   { showAvatar: false, showInfo: false } (compact rows)
 *
 * With none of these passed → behaviour byte-identical to today; existing consumers
 * are untouched.
 *
 * NOTE: if `results` (the explicit slot) is also passed, it wins over the internal
 * typeahead popover — the slot renders as-is, typeahead is suppressed.
 *
 * The typeahead popover renders all three states (loading / empty / populated) via
 * FieldSearchResults, which owns virtualization internally.
 *
 * ── variant ─────────────────────────────────────────────────────────────────
 * `variant='search'` (default) — byte-identical to the original SearchField:
 * leading Search icon, no trailing chevron.
 * `variant='select'` — no leading Search icon; a trailing ChevronDown (20px,
 * matches the Figma `Select` variant) at the end of the input bar. Clicking the
 * chevron focuses the input (and opens the typeahead popover, when typeahead
 * props are present); it rotates 180° while open. Convention: when both the
 * clear-X and the chevron are visible, clear-X comes first (nearer the text),
 * chevron last — mirrors FieldSelect's trailing-chevron placement and common
 * combobox anatomy (clear affordance before the "open menu" affordance).
 */

// ── Typeahead internals ─────────────────────────────────────────────────────

function toOption(o) {
  return typeof o === 'string' ? { value: o, label: o } : o
}

function defaultFilter(inputText, option) {
  return option.label.toLowerCase().includes(inputText.toLowerCase())
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ComboBox({
  value = '',
  onChange,
  placeholder = 'Search',
  onClear,
  variant = 'search',
  showLabel = false,
  label = 'Label',
  showInfoIcon = false,
  onInfoClick,
  results = null,
  className = '',
  // NOTE(normalization): onFocus/onBlur/onKeyDown/ARIA forwarded post-Figma — flag in tracker on next sync
  onFocus,
  onBlur,
  onKeyDown,
  // ARIA + role props forwarded to the input, not the wrapper div
  role,
  'aria-expanded': ariaExpanded,
  'aria-controls': ariaControls,
  'aria-activedescendant': ariaActiveDescendant,
  'aria-autocomplete': ariaAutocomplete,
  'aria-haspopup': ariaHasPopup,
  id,
  // ── Typeahead props ──────────────────────────────────────────────────────
  options,                    // { value, label }[] | string[] — static list
  loadOptions,                // (query: string) => Promise<Option[]> — async, debounced
  onSelect,                   // (value: string | null) => void
  emptyMessage = 'No options',
  filter = defaultFilter,
  // Typeahead rows default to the compact single-line look; pass rowProps to re-enable.
  rowProps = { showAvatar: false, showInfo: false },
  ...rest
}) {
  const typeaheadMode = !!(options || loadOptions)

  // ── Shared focus state ───────────────────────────────────────────────────
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)

  // ── Typeahead state (inert when typeaheadMode=false) ─────────────────────
  const [inputText, setInputText] = useState('')
  const [activeIdx, setActiveIdx] = useState(-1)
  const [asyncOptions, setAsyncOptions] = useState([])
  const [loading, setLoading] = useState(false)

  const seqRef = useRef(0)
  const debounceRef = useRef(null)

  // ── Paged (infinite scroll) state — inert for legacy plain-array loaders ──
  // loadOptions(query, skip) may resolve { options, total }; totalRef null = legacy.
  const [loadingMore, setLoadingMore] = useState(false)
  const totalRef = useRef(null)
  const queryRef = useRef('')
  const loadingMoreRef = useRef(false)

  const { open, setOpen, wrapperProps, fieldProps, popoverProps, closeAndBlur } =
    useFieldPopover()

  const listboxId = useId()

  const normalised = useMemo(
    () => (options || []).map(toOption),
    [options],
  )

  const filtered = useMemo(() => {
    if (!typeaheadMode) return []
    if (loadOptions) return asyncOptions
    if (!inputText) return normalised
    return normalised.filter((o) => filter(inputText, o))
  }, [typeaheadMode, loadOptions, asyncOptions, normalised, inputText, filter])

  // Map options → MatchSimpleRow match shape: matchId = label, id preserved
  const matches = useMemo(
    () => filtered.map((o) => ({ matchId: o.label, id: o.value, _value: o.value })),
    [filtered],
  )

  const handleSelect = useCallback(
    (match) => {
      setInputText(match.matchId)
      setActiveIdx(-1)
      onSelect?.(match._value ?? match.id)
      closeAndBlur()
    },
    [onSelect, closeAndBlur],
  )

  // Async load with stale-guard. Flips to loading SYNCHRONOUSLY: during the
  // debounce window the panel must show "Loading…", not the empty state
  // ("No matching fruits" flash while typing). Bumping seq also invalidates
  // any in-flight response.
  const runLoad = useCallback(
    (rawValue, debounceMs) => {
      if (!loadOptions) return
      setLoading(true)
      // New query/focus load: reset page accumulation + invalidate in-flight pages
      // (the seq bump below also discards their responses).
      queryRef.current = rawValue
      totalRef.current = null
      loadingMoreRef.current = false
      setLoadingMore(false)
      const seq = ++seqRef.current
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        try {
          const raw = await loadOptions(rawValue, 0)
          if (seqRef.current !== seq) return // stale
          if (raw && !Array.isArray(raw) && Array.isArray(raw.options)) {
            // Paged mode: { options, total }
            totalRef.current = raw.total
            setAsyncOptions(raw.options.map(toOption))
          } else {
            setAsyncOptions((raw || []).map(toOption))
          }
        } finally {
          if (seqRef.current === seq) setLoading(false)
        }
      }, debounceMs)
    },
    [loadOptions],
  )

  // Next-page fetch, fired by FieldSearchResults' onEndReached. Appends to the
  // current query's accumulation; a seq bump mid-flight (new query) discards it.
  const loadMore = useCallback(async () => {
    if (!loadOptions || totalRef.current == null) return
    if (loadingMoreRef.current) return
    if (asyncOptions.length >= totalRef.current) return // no more pages
    loadingMoreRef.current = true
    setLoadingMore(true)
    const seq = seqRef.current
    try {
      const raw = await loadOptions(queryRef.current, asyncOptions.length)
      if (seqRef.current !== seq) return // stale page — query changed mid-flight
      const opts = Array.isArray(raw) ? raw : raw?.options || []
      if (raw && !Array.isArray(raw) && raw.total != null) totalRef.current = raw.total
      setAsyncOptions((cur) => [...cur, ...opts.map(toOption)])
    } finally {
      if (seqRef.current === seq) {
        loadingMoreRef.current = false
        setLoadingMore(false)
      }
    }
  }, [loadOptions, asyncOptions.length])

  const hasMore =
    totalRef.current != null && asyncOptions.length < totalRef.current

  const handleTypeaheadChange = useCallback(
    (rawValue) => {
      setInputText(rawValue)
      setActiveIdx(-1)
      setOpen(true)
      runLoad(rawValue, 200)
    },
    [runLoad, setOpen],
  )

  const handleTypeaheadKeyDown = useCallback(
    (e) => {
      const count = filtered.length
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((cur) => moveHighlight(count, cur, e.key === 'ArrowDown' ? 1 : -1))
        return
      }
      if (e.key === 'Enter' && activeIdx >= 0) {
        e.preventDefault()
        e.stopPropagation()
        handleSelect(matches[activeIdx])
        return
      }
      // Delegate Tab/Escape/etc to useFieldPopover
      wrapperProps.onKeyDown?.(e)
    },
    [filtered.length, activeIdx, handleSelect, matches, wrapperProps],
  )

  // ── Render ───────────────────────────────────────────────────────────────

  const showClear = !!onClear && !!(typeaheadMode ? inputText : value)

  const effectiveRole           = typeaheadMode ? 'combobox'  : role
  const effectiveAriaExpanded   = typeaheadMode ? open        : ariaExpanded
  const effectiveAriaControls   = typeaheadMode ? listboxId   : ariaControls
  const effectiveAriaActiveDesc = typeaheadMode
    ? (activeIdx >= 0 ? `${listboxId}-option-${activeIdx}` : undefined)
    : ariaActiveDescendant
  const effectiveAriaAutocomplete = typeaheadMode ? 'list'    : ariaAutocomplete
  const effectiveAriaHasPopup     = typeaheadMode ? 'listbox' : ariaHasPopup

  // Positioning ONLY — the card chrome (bg/radius/shadow/padding) is
  // .field-search-results, the SAME class the legacy results slot renders,
  // so typeahead and slot mode look identical. 8px gap per Figma root stack.
  const popoverStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    width: '100%',
    zIndex: 50,
    marginTop: 'var(--spacing-2)',
  }

  const inputBar = (
    <div
      className="flex items-center"
      style={{
        height: 32,
        padding: '0 var(--spacing-3)',
        gap: 'var(--spacing-2)',
        background: 'var(--bg-primary)',
        border: focused
          ? '2px solid var(--deep-sea-neutral-600)'
          : '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'border-color var(--transition-fast)',
      }}
    >
      {variant === 'search' && (
        <Search
          {...ICON_MD}
          style={{
            color: focused ? 'var(--text-tertiary)' : 'var(--text-placeholder)',
            flexShrink: 0,
            transition: 'color var(--transition-fast)',
          }}
          aria-hidden="true"
        />
      )}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={typeaheadMode ? inputText : value}
        placeholder={placeholder}
        onChange={(e) =>
          typeaheadMode
            ? handleTypeaheadChange(e.target.value)
            : onChange?.(e.target.value)
        }
        onFocus={(e) => {
          setFocused(true)
          if (typeaheadMode) {
            fieldProps.onFocus(e)
            // Async mode: load for the CURRENT text (incl. empty) the moment the
            // popover opens — without this the panel sits on the empty state
            // until the first keystroke, while static mode shows options on focus.
            runLoad(inputText, 0)
          }
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        onKeyDown={typeaheadMode ? undefined : onKeyDown}
        role={effectiveRole}
        aria-expanded={effectiveAriaExpanded}
        aria-controls={effectiveAriaControls}
        aria-activedescendant={effectiveAriaActiveDesc}
        aria-autocomplete={effectiveAriaAutocomplete}
        aria-haspopup={effectiveAriaHasPopup}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        className="flex-1 bg-transparent border-none min-w-0"
        style={{
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-primary)',
          fontSize: 'var(--font-size-sm)',
          lineHeight: 'var(--line-height-sm)',
          outline: 'none',
          boxShadow: 'none',
        }}
      />
      {showClear && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={
            typeaheadMode
              ? () => { setInputText(''); setActiveIdx(-1); onSelect?.(null) }
              : onClear
          }
          className="flex items-center justify-center border-none bg-transparent cursor-pointer p-0 shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
          aria-label="Clear search"
        >
          <CircleX {...ICON_MD} />
        </button>
      )}
      {variant === 'select' && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            inputRef.current?.focus()
            if (typeaheadMode) setOpen(true)
          }}
          className="flex items-center justify-center border-none bg-transparent cursor-pointer p-0 shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
          aria-label="Toggle options"
        >
          <ChevronDown
            {...ICON_LG}
            style={{
              transform: typeaheadMode && open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform var(--transition-fast)',
            }}
          />
        </button>
      )}
    </div>
  )

  // Typeahead popover — suppressed when caller passes explicit `results` slot.
  // All three states (loading / empty / populated) route through FieldSearchResults,
  // which owns virtualization internally. FieldSearchResults gets id=listboxId so
  // aria-controls on the combobox input points at the element that carries role=listbox.
  const typeaheadPopover = typeaheadMode && !results && open ? (
    <div style={popoverStyle} {...popoverProps}>
      {loading ? (
        <FieldSearchResults id={listboxId} matches={[]} emptyMessage="Loading…" />
      ) : matches.length === 0 ? (
        <FieldSearchResults id={listboxId} matches={[]} emptyMessage={emptyMessage} />
      ) : (
        <FieldSearchResults
          id={listboxId}
          matches={matches}
          activeIndex={activeIdx}
          optionIdPrefix={listboxId}
          onMatchClick={handleSelect}
          rowProps={rowProps}
          onEndReached={hasMore ? loadMore : undefined}
          loadingMore={loadingMore}
        />
      )}
    </div>
  ) : null

  // ── Layout variants ──────────────────────────────────────────────────────

  if (typeaheadMode) {
    return (
      <div
        className={`search-field ${className}`.trim()}
        style={{ position: 'relative' }}
        ref={wrapperProps.ref}
        onBlur={wrapperProps.onBlur}
        onKeyDown={handleTypeaheadKeyDown}
      >
        {showLabel && (
          <div
            className="flex items-center"
            style={{ gap: 'var(--spacing-1)', marginBottom: 'var(--spacing-2)' }}
          >
            <span className="text-label-sm-medium" style={{ color: 'var(--text-secondary)' }}>
              {label}
            </span>
            {showInfoIcon && (
              onInfoClick ? (
                <button
                  type="button"
                  onClick={onInfoClick}
                  className="inline-flex items-center justify-center border-none bg-transparent cursor-pointer p-0"
                  style={{ color: 'var(--text-tertiary)' }}
                  aria-label="More info"
                >
                  <Info {...ICON_MD} />
                </button>
              ) : (
                <span
                  className="inline-flex items-center justify-center"
                  style={{ color: 'var(--text-tertiary)' }}
                  aria-hidden="true"
                >
                  <Info {...ICON_MD} />
                </span>
              )
            )}
          </div>
        )}
        {inputBar}
        {typeaheadPopover}
      </div>
    )
  }

  if (!showLabel) {
    return (
      <div className={`search-field ${className}`.trim()} {...rest}>
        {inputBar}
        {results && <div className="search-field__results">{results}</div>}
      </div>
    )
  }

  return (
    <div
      className={`search-field flex flex-col ${className}`.trim()}
      style={{ gap: 'var(--spacing-2)', alignItems: 'stretch' }}
      {...rest}
    >
      <div className="flex items-center" style={{ gap: 'var(--spacing-1)' }}>
        <span
          className="text-label-sm-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </span>
        {showInfoIcon && (
          onInfoClick ? (
            <button
              type="button"
              onClick={onInfoClick}
              className="inline-flex items-center justify-center border-none bg-transparent cursor-pointer p-0"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="More info"
            >
              <Info {...ICON_MD} />
            </button>
          ) : (
            <span
              className="inline-flex items-center justify-center"
              style={{ color: 'var(--text-tertiary)' }}
              aria-hidden="true"
            >
              <Info {...ICON_MD} />
            </span>
          )
        )}
      </div>
      {inputBar}
      {results && <div className="search-field__results">{results}</div>}
    </div>
  )
}
