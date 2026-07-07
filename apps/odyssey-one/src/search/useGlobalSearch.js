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
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), debounceMs)
    return () => clearTimeout(t)
  }, [value, debounceMs])

  const run = useCallback(async (q, chipList = []) => {
    if (!adapter) { setSections([]); return }
    const id = ++reqId.current
    const result = q && q.trim()
      ? await adapter.getSuggestions(q)
      : await adapter.getInitial(chipList)
    if (id === reqId.current) setSections(result || [])
  }, [adapter])

  // Fetch suggestions while focused, debounced on value change. Re-runs when
  // chips change too, so committing a chip advances the empty-state suggestions
  // to the next progression group.
  useEffect(() => {
    if (!focused) return
    const t = setTimeout(() => run(value, chips), debounceMs)
    return () => clearTimeout(t)
  }, [value, focused, chips, run, debounceMs])

  // Run results search whenever committed chips, the committed text chip, OR
  // the debounced query change. Stale-response guarded (same pattern as
  // suggestions) so a slow earlier search can't overwrite a newer one.
  // Typed text wins over the committed text chip (it previews the replacement);
  // an empty input falls back to the committed term so its glimpse stays live.
  useEffect(() => {
    const q = debouncedValue.trim() || textChip?.value || ''
    if (!adapter?.searchShipments || (!chips.length && !q)) {
      setResults([])
      setResultTotal(0)
      return
    }
    const id = ++searchReqId.current
    adapter.searchShipments(chips, q).then(({ results: r, total }) => {
      if (id !== searchReqId.current) return
      setResults(r)
      setResultTotal(total)
    })
  }, [chips, debouncedValue, textChip, adapter])

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

  const onChipCommit = useCallback((item) => {
    chipsRef.current = [...chipsRef.current.filter((c) => c.key !== item.key), item]
    setChips(chipsRef.current)
    setValue('')
    setDebouncedValue('')
  }, [])

  // Commit the CURRENT typed text as the (single) free-text query badge.
  // No-op on empty input; a repeat commit replaces the previous term.
  const onTextCommit = useCallback(() => {
    const t = value.trim()
    if (!t) return
    textChipRef.current = { key: '__free-text__', label: t, value: t, kind: 'text' }
    setTextChip(textChipRef.current)
    setValue('')
    setDebouncedValue('')
  }, [value])

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

  const suggestionsOpen = focused && filteredSections.some((s) => s.items.length)

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
    suggestionSections: filteredSections,
    suggestionsOpen,
    results,
    resultTotal,
  }
}
