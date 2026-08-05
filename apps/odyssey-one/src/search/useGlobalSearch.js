import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

/**
 * useGlobalSearch — domain-agnostic orchestration for the GlobalSearch bar.
 * Owns focus / query / debounce and asks a domain `adapter` (the contract:
 * `getInitial()` + `getSuggestions(query)`) for suggestion sections. Returns the
 * props to spread onto `<GlobalSearch>`.
 *
 * Knows nothing about Shipments — pass any domain's adapter. Pass no adapter
 * (e.g. on routes without functional search) and the bar stays inert: no
 * suggestions, no dropdown.
 *
 * Stale-response guard: each fetch is tagged; only the latest applies. Empty
 * focus fetches `getInitial(chips)`; typing fetches `getSuggestions(query)` debounced.
 *
 * Committed chips:
 * - `onChipCommit(item)` — appends chip (one per key), clears input.
 * - `onChipRemove(key)` — removes by key.
 * - Committed attribute keys are filtered out of suggestions automatically.
 * - Empty-input suggestion CONTENT (entry points vs next progression group) is
 *   the adapter's job — the hook just passes the committed chips to
 *   `getInitial(chips)`. The hook stays domain-agnostic: it knows nothing about
 *   progression order or group advancement.
 * - `adapter.searchShipments(chips, query)` is called whenever chips or the
 *   DEBOUNCED query change (if the adapter implements it) to populate
 *   GlobalSearchResults results — a non-empty query alone is enough (the
 *   results-panel "glimpse"); the hook exposes the debounced query as `query`.
 *
 * Committed free text (S80 — "every entered search is a query"):
 * - `onTextCommit()` — turns the CURRENT typed text into a single committed
 *   text chip (`textChip`) and clears the input, so a free-text Enter renders
 *   as a query badge in the bar just like attribute chips do. One term at a
 *   time — committing again REPLACES it (mirrors the `{ chips, text }` commit
 *   contract, which carries exactly one text string).
 * - `onTextRemove()` — removes it; `onClear` wipes it along with everything else.
 * - The glimpse search falls back to the text chip's value while the input is
 *   empty (typed text previews the REPLACEMENT, so it wins while present).
 *
 * Last-removal = explicit clear (S81): removing the LAST remaining committed
 * item in the bar — the final attribute chip with no text badge, or the text
 * badge with no chips — is treated as the user's full clear gesture: the input
 * is wiped too and the `onLastRemoved` option callback fires (the consumer uses
 * it to clear the committed table criteria, same as the clear-X). Removing a
 * chip while OTHERS remain stays a no-recommit local edit. Detection uses
 * synchronous mirrors of chips/textChip so batched removals (e.g. the Filters
 * view's remove-each "Clear all") still see the emptying transition.
 */
export function useGlobalSearch(adapter, { debounceMs = 120, onLastRemoved } = {}) {
  const [value, setValue] = useState('')
  const [debouncedValue, setDebouncedValue] = useState('')
  const [focused, setFocused] = useState(false)
  const [sections, setSections] = useState([])
  const [chips, setChips] = useState([])
  // Committed free-text term shown as a query badge: { key, label, value, kind: 'text' }.
  const [textChip, setTextChip] = useState(null)
  const [results, setResults] = useState([])
  const [resultTotal, setResultTotal] = useState(0)
  const [searching, setSearching] = useState(false)
  const reqId = useRef(0)
  const searchReqId = useRef(0)

  // Synchronous mirrors of chips/textChip — updated in the mutators themselves so
  // several removals in ONE event (Filters "Clear all" removes chips one by one)
  // still detect the exact call that emptied the bar. Latest-callback ref keeps
  // the removal handlers identity-stable regardless of the consumer's closure.
  const chipsRef = useRef(chips)
  const textChipRef = useRef(textChip)
  const onLastRemovedRef = useRef(onLastRemoved)
  onLastRemovedRef.current = onLastRemoved

  // Debounced mirror of the raw input — drives the results search (and is
  // exposed to consumers, e.g. to open the results panel on non-empty query).
  // `searching` starts HERE, not at the adapter call — the debounce window is
  // part of the wait, and without this the panel shows a stale "No results"
  // for the first debounceMs of every keystroke.
  useEffect(() => {
    if (value.trim() && value !== debouncedValue) setSearching(true)
    const t = setTimeout(() => setDebouncedValue(value), debounceMs)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, debounceMs])

  const run = useCallback(async (q, chipList = [], setChip = null) => {
    if (!adapter) { setSections([]); return }
    const id = ++reqId.current
    const result = q && q.trim()
      ? await adapter.getSuggestions(q)
      : await adapter.getInitial(chipList, setChip)
    if (id === reqId.current) setSections(result || [])
  }, [adapter])

  // Fetch suggestions while focused, debounced on value change. Re-runs when
  // chips change too, so committing a chip advances the empty-state suggestions
  // to the next progression group. The textChip rides along so an untyped
  // code-set badge can surface its "Define set type" section (GS-21 rule 7).
  useEffect(() => {
    if (!focused) return
    const t = setTimeout(() => run(value, chips, textChip), debounceMs)
    return () => clearTimeout(t)
  }, [value, focused, chips, textChip, run, debounceMs])

  // Search-relevant serialization of chips — excludes UI-only fields (`open`,
  // `monthHint`) so toggling a date chip's calendar open/closed (Fix A, user
  // 2026-08-03) doesn't change this key. Strings compare by VALUE, so the
  // effect below correctly skips re-running when only those fields differ,
  // even though `chips` itself is a fresh array reference every toggle.
  const chipsSearchKey = useMemo(
    () => JSON.stringify(chips.map(({ open, monthHint, ...rest }) => rest)),
    [chips],
  )

  // Run results search whenever committed chips' SEARCH-RELEVANT content, the
  // committed text chip, OR the debounced query change. Stale-response
  // guarded (same pattern as suggestions) so a slow earlier search can't
  // overwrite a newer one. Typed text wins over the committed text chip (it
  // previews the replacement); an empty input falls back to the committed
  // term so its glimpse stays live. `searching` covers the in-flight window
  // (visible on the async live adapter; the sync mock resolves within the
  // same tick) — consumers show the Spinner off it.
  useEffect(() => {
    const q = debouncedValue.trim() || textChip?.value || ''
    if (!adapter?.searchShipments || (!chips.length && !q)) {
      setResults([])
      setResultTotal(0)
      setSearching(false)
      return
    }
    const id = ++searchReqId.current
    setSearching(true)
    adapter.searchShipments(chips, q).then(({ results: r, total }) => {
      if (id !== searchReqId.current) return
      setResults(r)
      setResultTotal(total)
      setSearching(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chipsSearchKey, debouncedValue, textChip, adapter])

  // Generic safety net: never suggest an already-committed attribute. (Counts +
  // group advancement are the adapter's job — the hook doesn't slice.)
  const committedKeys = useMemo(() => new Set(chips.map((c) => c.key)), [chips])
  const filteredSections = useMemo(() =>
    sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => !committedKeys.has(item.key)),
      }))
      .filter((s) => s.items.length > 0),
  [sections, committedKeys])

  const onFocus = useCallback(() => setFocused(true), [])
  const onBlur = useCallback(() => setFocused(false), [])
  const onChange = useCallback((v) => {
    setValue(v)
    // Emptying the input clears the glimpse IMMEDIATELY (S80 req 1) — bypass
    // the debounce so stale results never linger on an empty field.
    if (!v.trim()) setDebouncedValue('')
  }, [])
  const onClear = useCallback(() => {
    setValue('')
    setDebouncedValue('')
    chipsRef.current = []
    textChipRef.current = null
    setChips([])
    setTextChip(null)
  }, [])

  // Case 12 (GS-22) — a date chip's label always mirrors its bounds.
  const dateChipLabel = (chip) => {
    if (chip.invalid) return `${chip.attrLabel}${chip.single ? '' : ' Range'}: Invalid Date`
    const range = !chip.single
    const from = chip.from || ''
    const to = chip.to || ''
    return `${chip.attrLabel}${range ? ' Range' : ''}: ${from}${range ? `-${to}` : ''}`
  }

  const onChipCommit = useCallback((item) => {
    // Case 12 — a date / date-range suggestion commits an EXPANDED date chip:
    // the CalendarPicker opens right away (defaultOpen) so the user finishes
    // the bound(s) in place. A complete typed date pre-fills `from`.
    if (item.kind === 'date' || item.kind === 'date-range-suggest') {
      const chip = {
        key: item.key,
        attrLabel: item.attr.label,
        dataKey: item.attr.dataKey,
        group: item.attr.group,
        kind: 'date-range',
        single: item.kind === 'date',
        from: item.from || null,
        to: null,
        monthHint: item.monthHint || null, // steers the calendar's initial month
        invalid: !!item.invalid, // "40/" — chip reads "Invalid Date" in red
        // Calendar opens right away (controlled — see onDateToggle), EXCEPT
        // for an invalid date: it commits collapsed and never opens.
        open: !item.invalid,
      }
      chip.label = dateChipLabel(chip)
      chipsRef.current = [...chipsRef.current.filter((c) => c.key !== chip.key), chip]
      setChips(chipsRef.current)
      setValue('')
      setDebouncedValue('')
      return
    }
    // GS-21 rule 7 — a "Define set type" suggestion asserts the whole code-set
    // badge as ONE attribute: it becomes a typed IN-list set chip (GS-12
    // matching via queryValue), revalidated per that attribute; codes that
    // don't match under it stay in the chip but red + decounted.
    if (item.kind === 'set-type' && textChipRef.current?.kind === 'set') {
      const values = textChipRef.current.codes.map((c) => c.value)
      const codes = adapter?.validateCodes
        ? adapter.validateCodes(values, item.attr.dataKey)
        : values.map((value) => ({ value, valid: true }))
      const chip = {
        key: item.attr.key,
        label: `${item.attr.label} Set`,
        attrLabel: item.attr.label,
        queryValue: values.join(', '),
        dataKey: item.attr.dataKey,
        group: item.attr.group,
        kind: 'set',
        codes,
        typeLabel: item.attr.label,
      }
      chipsRef.current = [...chipsRef.current.filter((c) => c.key !== chip.key), chip]
      textChipRef.current = null
      setTextChip(null)
      setChips(chipsRef.current)
      setValue('')
      setDebouncedValue('')
      return
    }
    chipsRef.current = [...chipsRef.current.filter((c) => c.key !== item.key), item]
    setChips(chipsRef.current)
    setValue('')
    setDebouncedValue('')
  }, [adapter])

  // Commit the CURRENT typed text as the (single) free-text query badge.
  // No-op on empty input; a repeat commit replaces the previous term.
  // GS-21: when the text is a CODE LIST (≥2 tokens, phrase matches nothing),
  // the badge upgrades to a SET chip — per-code validity + named-set type
  // from the adapter; search semantics unchanged (the raw text still drives
  // the GS-20 union match).
  const onTextCommit = useCallback(() => {
    const t = value.trim()
    if (!t) return
    const set = adapter?.resolveCodeSet ? adapter.resolveCodeSet(t) : null
    textChipRef.current = set
      ? { key: '__free-text__', label: t, value: t, kind: 'set', ...set }
      : { key: '__free-text__', label: t, value: t, kind: 'text' }
    setTextChip(textChipRef.current)
    setValue('')
    setDebouncedValue('')
  }, [value, adapter])

  // Case 12 — date picks from an open chip's CalendarPicker. Updates the
  // chip's bounds + label; the glimpse re-runs off the chips change (the
  // committed TABLE criteria still move only on explicit commit).
  const onDateCommit = useCallback((key, { from, to }) => {
    chipsRef.current = chipsRef.current.map((c) => {
      if (c.key !== key) return c
      const next = { ...c, from: from ?? null, to: to ?? null }
      next.label = dateChipLabel(next)
      return next
    })
    setChips(chipsRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filters-view outbound wiring: replace the committed chip set wholesale
  // (the Filters "Show results" / a Saved profile). The textChip survives BY
  // DEFAULT — filters-view edits only own attribute criteria, so its caller
  // (`applyChips(nextChips)`, one arg) must not disturb an in-progress free-
  // text badge. `nextTextChip` is a SENTINEL param, not a plain default: only
  // `undefined` (the arg omitted) leaves textChip alone; an explicit `null` or
  // object REPLACES it. A saved-filter apply (S108 1e) is the one caller that
  // passes it — a saved filter's chips may include its own free-text/set query
  // badge (split out via `savedFilters.js`'s `splitFreeText`, since it can't
  // ride in `next` the way a real attribute chip does — see that function's
  // header), and applying a filter WHOLESALE means the old bar's stray text
  // must go too, hence explicit `null` when the saved filter carried none.
  const applyChips = useCallback((next, nextTextChip) => {
    chipsRef.current = next
    setChips(next)
    if (nextTextChip !== undefined) {
      textChipRef.current = nextTextChip
      setTextChip(nextTextChip)
    }
    setValue('')
    setDebouncedValue('')
  }, [])

  // Case 12 — the date chip's open state is CONTROLLED here so consumers can
  // close it from outside (Enter in the bar) and so "results only after the
  // chip closes" has a single source of truth (see pendingDateChip).
  const onDateToggle = useCallback((key, open) => {
    // An invalid date chip never opens — there is nothing to pick for it.
    chipsRef.current = chipsRef.current.map((c) =>
      c.key === key ? { ...c, open: open && !c.invalid } : c,
    )
    setChips(chipsRef.current)
  }, [])

  // Edit-commit from an expanded set chip (Enter / collapse / outside click in
  // the EditableMiniPanel). `key` routes: the free-text set badge re-resolves
  // (it may gain/lose its named type); a TYPED set chip revalidates under its
  // asserted attribute and updates its IN-list queryValue. Emptying the codes
  // removes the chip (same last-removal semantics as any removal).
  const onSetCommit = useCallback((key, values) => {
    if (!values.length) {
      if (textChipRef.current?.key === key) onTextRemove()
      else onChipRemove(key)
      return
    }
    const text = values.join(', ')
    if (textChipRef.current?.key === key) {
      const set = adapter?.resolveCodeSet?.(text)
      textChipRef.current = set
        ? { key, label: text, value: text, kind: 'set', ...set }
        : { key, label: text, value: text, kind: 'text' }
      setTextChip(textChipRef.current)
      return
    }
    const chip = chipsRef.current.find((c) => c.key === key)
    if (!chip) return
    const codes = adapter?.validateCodes
      ? adapter.validateCodes(values, chip.dataKey)
      : values.map((value) => ({ value, valid: true }))
    chipsRef.current = chipsRef.current.map((c) =>
      c.key === key ? { ...c, queryValue: text, codes } : c,
    )
    setChips(chipsRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter])

  // Removal that leaves the bar EMPTY (no chips, no text badge) = the user's
  // explicit full clear: wipe any in-progress input too and notify the consumer
  // (onLastRemoved) so the committed criteria clear like the X button.
  const handleBarEmptiedByRemoval = () => {
    setValue('')
    setDebouncedValue('')
    onLastRemovedRef.current?.()
  }

  const onTextRemove = useCallback(() => {
    const had = !!textChipRef.current
    textChipRef.current = null
    setTextChip(null)
    if (had && chipsRef.current.length === 0) handleBarEmptiedByRemoval()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onChipRemove = useCallback((key) => {
    const before = chipsRef.current.length
    chipsRef.current = chipsRef.current.filter((c) => c.key !== key)
    setChips(chipsRef.current)
    if (before > 0 && chipsRef.current.length === 0 && !textChipRef.current) {
      handleBarEmptiedByRemoval()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Case 12: an OPEN date chip — its CalendarPicker owns the space below the
  // bar, so suggestions hold off until the chip CLOSES (chevron / Enter /
  // outside click / single-pick auto-close). Refinement (user, 2026-08-03):
  // an open date chip suppresses the panel only while it has no date yet; a
  // reopened chip with a date leaves the panel as-is — that distinction is
  // computed by the consumer from `chips` directly. Suggestions gating here
  // is unchanged: suggestions stay suppressed while ANY date chip is open.
  const pendingDateChip = chips.some((c) => c.kind === 'date-range' && c.open)

  const suggestionsOpen = focused && !pendingDateChip && filteredSections.some((s) => s.items.length)

  return {
    value,
    query: debouncedValue,
    onChange,
    onClear,
    onFocus,
    onBlur,
    chips,
    onChipCommit,
    onChipRemove,
    textChip,
    onTextCommit,
    onTextRemove,
    onSetCommit,
    onDateCommit,
    onDateToggle,
    applyChips,
    suggestionSections: filteredSections,
    suggestionsOpen,
    results,
    resultTotal,
    searching,
    pendingDateChip,
  }
}
