import { useState, useRef, useMemo, useId, useCallback, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, CircleX, Info, ChevronDown, Check } from 'lucide-react'
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
 *                   { showAvatar: false, showInfo: false } (compact rows).
 *                   Options may also carry per-row fields (matchId, customer,
 *                   address, icon) — forwarded to their MatchSimpleRow, so rich
 *                   two-line rows (e.g. location results) work per option.
 *   panelError    — string; renders FieldSearchResults' red alert state in the
 *                   dropdown slot INSTEAD of the option list (e.g. duplicate
 *                   Consignor/Consignee location ID)
 *
 * Form-field mode (typeahead + committed value):
 *   value         — in typeahead mode, the COMMITTED label; the input text
 *                   resyncs to it whenever it changes while unfocused (draft
 *                   hydration, external clears)
 *   onChange      — in typeahead mode fires with the raw typed text (lets a
 *                   form invalidate a stale pick / commit free text on blur)
 *   onSelect      — fires (value, option) — option is the full { value, label }
 *   error         — message string; red border + inline error text (aria-invalid,
 *                   aria-describedby → the message element). Renders in ALL modes
 *                   (was typeahead-only pre-2026-07-28). Figma `State=Error`.
 *   validated     — boolean; success border (`--border-success`), trailing check
 *                   (text-tertiary), green "Validated" line below. `error` wins.
 *                   Figma `State=Validated` (2026-07-28).
 *   required      — boolean; `*` after the label + aria-required
 *   disabled      — disables the input + trailing buttons, muted surface
 *   emptyMessage  — string, or (inputText) => string for query-dependent copy
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
 * chevron TOGGLES the popover (2026-07-28 — was open-only); it rotates 180°
 * while open. Convention: when both the clear-X and the chevron are visible,
 * clear-X comes first (nearer the text), chevron last — mirrors FieldSelect's
 * trailing-chevron placement and common combobox anatomy.
 *
 * ── typable ─────────────────────────────────────────────────────────────────
 * `typable` (default true) selects the data-entry mode of the typeahead face:
 * - `typable` — the input filters `options` / drives `loadOptions` as you type;
 *   `value` is the committed TEXT (label).
 * - `typable={false}` — a pick-only select: the input is readOnly, clicking
 *   anywhere on the bar toggles the full unfiltered option list, and `value`
 *   is the committed option VALUE (the matching label renders). Replaces the
 *   retired app-local SelectField. No Figma variant: zero visual delta — the
 *   Select face already models the appearance (control-state convention).
 * Mode ladder: local list → `typable={false}`; local list w/ filter-as-you-type
 * → `typable`; fetched/lazy catalog → `typable` + `loadOptions`.
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
  placeholder,
  onClear,
  variant = 'search',
  disabled = false,
  error,
  validated = false,
  required = false,
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
  'aria-describedby': ariaDescribedBy,
  id,
  // ── Typeahead props ──────────────────────────────────────────────────────
  options,                    // { value, label }[] | string[] — static list
  loadOptions,                // (query: string) => Promise<Option[]> — async, debounced
  onSelect,                   // (value: string | null) => void
  emptyMessage = 'No options',
  panelError,
  filter = defaultFilter,
  typable = true,             // false → pick-only select (readOnly input, full list, value = option value)
  // Typeahead rows default to the compact single-line look; pass rowProps to re-enable.
  rowProps = { showAvatar: false, showInfo: false },
  ...rest
}) {
  const typeaheadMode = !!(options || loadOptions)

  // ── Shared focus state ───────────────────────────────────────────────────
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)

  // ── Typeahead state (inert when typeaheadMode=false) ─────────────────────
  const [inputText, setInputText] = useState(typeaheadMode ? String(value ?? '') : '')
  const [activeIdx, setActiveIdx] = useState(-1)
  const [asyncOptions, setAsyncOptions] = useState([])
  const [loading, setLoading] = useState(false)

  const seqRef = useRef(0)
  const debounceRef = useRef(null)

  // Form-field mode: `value` is the committed label — resync the visible text
  // when it changes externally (draft hydration, dependent-field clears), but
  // never mid-typing.
  useEffect(() => {
    if (typeaheadMode && !focused) setInputText(String(value ?? ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // ── Paged (infinite scroll) state — inert for legacy plain-array loaders ──
  // loadOptions(query, skip) may resolve { options, total }; totalRef null = legacy.
  const [loadingMore, setLoadingMore] = useState(false)
  const totalRef = useRef(null)
  const queryRef = useRef('')
  const loadingMoreRef = useRef(false)

  const { open, setOpen, wrapperRef, wrapperProps, fieldProps, popoverProps, closeAndBlur } =
    useFieldPopover()

  // Body-portal anchoring for the typeahead panel — a position:absolute panel
  // gets clipped by any overflow ancestor (e.g. the product grid's h-scroll
  // wrap), so the panel renders position:fixed in a portal, tracking the
  // wrapper rect on open/scroll/resize. React portals bubble events through
  // the React tree, so the wrapper's blur/keydown handling is unchanged.
  const [panelRect, setPanelRect] = useState(null)
  useLayoutEffect(() => {
    if (!open) {
      setPanelRect(null)
      return
    }
    const measure = () => {
      const r = wrapperRef.current?.getBoundingClientRect()
      if (r) {
        // Cap the results viewport to the space below the anchor (24px viewport
        // breathing room + the 8px panel gap) so the panel never overflows the
        // window; floor keeps it usable when the field sits near the bottom.
        const maxListHeight = Math.max(120, window.innerHeight - r.bottom - 48)
        setPanelRect({ top: r.bottom, left: r.left, width: r.width, maxListHeight })
      }
    }
    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [open, wrapperRef])

  const listboxId = useId()

  const normalised = useMemo(
    () => (options || []).map(toOption),
    [options],
  )

  const filtered = useMemo(() => {
    if (!typeaheadMode) return []
    if (loadOptions) return asyncOptions
    if (!typable || !inputText) return normalised // pick-only: always the full list
    return normalised.filter((o) => filter(inputText, o))
  }, [typeaheadMode, loadOptions, asyncOptions, normalised, inputText, filter, typable])

  // Pick-only mode: `value` is the option VALUE — render its label
  const displayText = useMemo(() => {
    if (typable || !typeaheadMode) return null
    return normalised.find((o) => o.value === value)?.label ?? String(value ?? '')
  }, [typable, typeaheadMode, normalised, value])

  // Map options → MatchSimpleRow match shape: matchId = label (overridable),
  // per-option row fields (customer/address/icon) pass through for rich rows
  const matches = useMemo(
    () => filtered.map((o) => ({
      matchId: o.matchId ?? o.label,
      customer: o.customer,
      address: o.address,
      icon: o.icon,
      id: o.value,
      _value: o.value,
      _option: o,
    })),
    [filtered],
  )

  const handleSelect = useCallback(
    (match) => {
      setInputText(match._option?.label ?? match.matchId)
      setActiveIdx(-1)
      onSelect?.(match._value ?? match.id, match._option)
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
      onChange?.(rawValue)
      runLoad(rawValue, 200)
    },
    [runLoad, setOpen, onChange],
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
      if (e.key === 'Enter') {
        // No highlighted option: close + blur so free-text consumers commit
        // the typed value via their onBlur (was a silent no-op — the text
        // stayed visible but never committed; caught 2026-07-28)
        e.preventDefault()
        closeAndBlur()
        return
      }
      // Delegate Tab/Escape/etc to useFieldPopover
      wrapperProps.onKeyDown?.(e)
    },
    [filtered.length, activeIdx, handleSelect, matches, wrapperProps, closeAndBlur],
  )

  // ── Render ───────────────────────────────────────────────────────────────

  const showClear = !!onClear && !!(typeaheadMode ? (typable ? inputText : value) : value)

  const effectiveRole           = typeaheadMode ? 'combobox'  : role
  const effectiveAriaExpanded   = typeaheadMode ? open        : ariaExpanded
  const effectiveAriaControls   = typeaheadMode ? listboxId   : ariaControls
  const effectiveAriaActiveDesc = typeaheadMode
    ? (activeIdx >= 0 ? `${listboxId}-option-${activeIdx}` : undefined)
    : ariaActiveDescendant
  const effectiveAriaAutocomplete = typeaheadMode ? (typable ? 'list' : 'none') : ariaAutocomplete
  const effectiveAriaHasPopup     = typeaheadMode ? 'listbox' : ariaHasPopup

  // Positioning ONLY — the card chrome (bg/radius/shadow/padding) is
  // .field-search-results, the SAME class the legacy results slot renders,
  // so typeahead and slot mode look identical. 8px gap per Figma root stack.
  const popoverStyle = panelRect
    ? {
        position: 'fixed',
        top: panelRect.top,
        left: panelRect.left,
        width: panelRect.width,
        zIndex: 200,
        marginTop: 'var(--spacing-2)',
      }
    : { position: 'fixed', top: 0, left: 0, visibility: 'hidden', zIndex: 200 }

  // Error/validated/disabled borders mirror FormField (bittersweet ramp /
  // caribbean-green ramp / muted surface). Precedence: error > validated >
  // neutral; each state has its own focused treatment (200-idle → 600-focused,
  // Figma `State=Focused Error` / `State=Focused Validated`).
  const isValidated = validated && !error
  const borderStyle = error
    ? (focused ? '2px solid var(--bittersweet-600)' : '1px solid var(--bittersweet-200)')
    : isValidated
    ? (focused ? '2px solid var(--caribbean-green-600)' : '1px solid var(--border-success)')
    : focused ? '2px solid var(--deep-sea-neutral-600)'
    : '1px solid var(--border-default)'

  // Error message element id — links the input via aria-describedby (parity
  // with FormField's errorId wiring; reuses listboxId as the stable base).
  const errorId = error ? `${id ?? listboxId}-error` : undefined
  const helperText = error ? (
    <p className="combo-box__error text-label-xs-regular" id={errorId} role="alert">
      {error}
    </p>
  ) : isValidated ? (
    <p className="combo-box__validated text-label-xs-regular">Validated</p>
  ) : null

  const labelRow = showLabel ? (
    <div className="combo-box__label-row">
      <span className="combo-box__label text-label-sm-medium">
        {label}{required && <span aria-hidden="true"> *</span>}
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
  ) : null

  const inputBar = (
    <div
      className="flex items-center"
      style={{
        // 36px = 20px content row + 8px vertical padding each side (was 32/6px —
        // fixed 2026-07-28 to match the 36px field height, Figma synced)
        height: 36,
        // A chevron reads heavier than text at the same inset — the select
        // variant pulls its right padding to 10px for optical balance (S102).
        padding: variant === 'select' ? '0 10px 0 var(--spacing-3)' : '0 var(--spacing-3)',
        gap: 'var(--spacing-1)',
        background: disabled ? 'var(--bg-secondary)' : 'var(--bg-primary)',
        border: borderStyle,
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
        value={displayText ?? (typeaheadMode ? inputText : value)}
        placeholder={placeholder ?? (variant === 'select' ? 'Select' : 'Search')}
        readOnly={typeaheadMode && !typable}
        onChange={(e) =>
          typeaheadMode
            ? handleTypeaheadChange(e.target.value)
            : onChange?.(e.target.value)
        }
        onMouseDown={
          typeaheadMode && !typable && !disabled
            ? () => {
                // Pick-only: a click on the (already-focused) bar toggles the
                // panel; the first click focuses, and onFocus opens it.
                if (open) setOpen(false)
                else if (focused) setOpen(true)
              }
            : undefined
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
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={[errorId, ariaDescribedBy].filter(Boolean).join(' ') || undefined}
        aria-required={required || undefined}
        disabled={disabled}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        className="flex-1 bg-transparent border-none min-w-0"
        style={{
          color: disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
          cursor: disabled ? 'not-allowed' : (typeaheadMode && !typable ? 'pointer' : undefined),
          fontFamily: 'var(--font-primary)',
          fontSize: 'var(--font-size-sm)',
          lineHeight: 'var(--line-height-sm)',
          outline: 'none',
          boxShadow: 'none',
        }}
      />
      {showClear && !disabled && (
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
      {/* Trailing order matches FormField: clear-X → validated check → chevron. */}
      {isValidated && (
        <Check
          {...ICON_MD}
          style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}
          aria-hidden="true"
        />
      )}
      {variant === 'select' && (
        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            // Toggle (2026-07-28 — was open-only): close keeps focus in the field
            if (typeaheadMode && open) {
              setOpen(false)
              return
            }
            inputRef.current?.focus()
            if (typeaheadMode) setOpen(true)
          }}
          className="flex items-center justify-center border-none bg-transparent cursor-pointer p-0 shrink-0"
          style={{ color: disabled ? 'var(--text-placeholder)' : 'var(--text-tertiary)', cursor: disabled ? 'not-allowed' : undefined }}
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
  const resolvedEmptyMessage =
    typeof emptyMessage === 'function' ? emptyMessage(inputText) : emptyMessage

  const typeaheadPopover = typeaheadMode && !results && open && !disabled ? createPortal(
    <div style={popoverStyle} {...popoverProps}>
      {panelError ? (
        <FieldSearchResults id={listboxId} matches={[]} error={panelError} />
      ) : loading ? (
        <FieldSearchResults id={listboxId} matches={[]} emptyMessage="Loading…" />
      ) : matches.length === 0 ? (
        <FieldSearchResults id={listboxId} matches={[]} emptyMessage={resolvedEmptyMessage} />
      ) : (
        <FieldSearchResults
          id={listboxId}
          matches={matches}
          maxHeight={Math.min(320, panelRect?.maxListHeight ?? 320)}
          activeIndex={activeIdx}
          optionIdPrefix={listboxId}
          onMatchClick={handleSelect}
          rowProps={rowProps}
          onEndReached={hasMore ? loadMore : undefined}
          loadingMore={loadingMore}
        />
      )}
    </div>,
    document.body,
  ) : null

  // ── Layout variants ──────────────────────────────────────────────────────

  // State suffixes are CSS hooks (e.g. resolve-mode re-enables fields by state),
  // so every branch's root has to carry them.
  const rootClass = (extra = '') =>
    ['combo-box', error && 'combo-box--error', isValidated && 'combo-box--validated', extra, className]
      .filter(Boolean)
      .join(' ')

  if (typeaheadMode) {
    return (
      <div
        className={rootClass('combo-box--relative')}
        ref={wrapperProps.ref}
        onBlur={wrapperProps.onBlur}
        onKeyDown={handleTypeaheadKeyDown}
      >
        {labelRow}
        {inputBar}
        {helperText}
        {typeaheadPopover}
      </div>
    )
  }

  if (!showLabel) {
    return (
      <div className={rootClass()} {...rest}>
        {inputBar}
        {helperText}
        {results && <div className="combo-box__results">{results}</div>}
      </div>
    )
  }

  return (
    <div className={rootClass()} {...rest}>
      {labelRow}
      {inputBar}
      {helperText}
      {/* ponytail: display:block overrides the slot's `display: contents` so this
          margin lands — margins are dropped on display:contents boxes. */}
      {results && (
        <div className="combo-box__results">{results}</div>
      )}
    </div>
  )
}
