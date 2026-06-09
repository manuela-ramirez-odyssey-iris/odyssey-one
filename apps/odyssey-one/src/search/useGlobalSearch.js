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
 * - `adapter.searchShipments(chips)` is called whenever chips change (if the
 *   adapter implements it) to populate SearchResults results.
 */
export function useGlobalSearch(adapter, { debounceMs = 120 } = {}) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const [sections, setSections] = useState([])
  const [chips, setChips] = useState([])
  const [results, setResults] = useState([])
  const [resultTotal, setResultTotal] = useState(0)
  const reqId = useRef(0)

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

  // Run results search whenever committed chips change.
  useEffect(() => {
    if (!adapter?.searchShipments || !chips.length) {
      setResults([])
      setResultTotal(0)
      return
    }
    adapter.searchShipments(chips).then(({ results: r, total }) => {
      setResults(r)
      setResultTotal(total)
    })
  }, [chips, adapter])

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
  const onChange = useCallback((v) => setValue(v), [])
  const onClear = useCallback(() => { setValue(''); setChips([]) }, [])

  const onChipCommit = useCallback((item) => {
    setChips((prev) => {
      const without = prev.filter((c) => c.key !== item.key)
      return [...without, item]
    })
    setValue('')
  }, [])

  const onChipRemove = useCallback((key) => {
    setChips((prev) => prev.filter((c) => c.key !== key))
  }, [])

  const suggestionsOpen = focused && filteredSections.some((s) => s.items.length)

  return {
    value,
    onChange,
    onClear,
    onFocus,
    onBlur,
    chips,
    onChipCommit,
    onChipRemove,
    suggestionSections: filteredSections,
    suggestionsOpen,
    results,
    resultTotal,
  }
}
