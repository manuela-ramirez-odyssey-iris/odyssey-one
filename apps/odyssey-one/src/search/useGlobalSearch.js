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
 * focus fetches `getInitial()`; typing fetches `getSuggestions()` debounced.
 *
 * Committed chips:
 * - `onChipCommit(item)` — appends chip (one per key), clears input.
 * - `onChipRemove(key)` — removes by key.
 * - Committed attribute keys are filtered out of suggestions automatically.
 * - When no query is active (empty/initial), suggestions are sliced to
 *   INITIAL_COUNT after filtering — so each commit naturally advances to the
 *   next most-relevant attributes in the progression.
 * - `adapter.searchShipments(chips)` is called whenever chips change (if the
 *   adapter implements it) to populate ResultsPreview results.
 */
const INITIAL_COUNT = 5

export function useGlobalSearch(adapter, { debounceMs = 120 } = {}) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const [sections, setSections] = useState([])
  const [chips, setChips] = useState([])
  const [results, setResults] = useState([])
  const [resultTotal, setResultTotal] = useState(0)
  const reqId = useRef(0)

  const run = useCallback(async (q) => {
    if (!adapter) { setSections([]); return }
    const id = ++reqId.current
    const result = q && q.trim()
      ? await adapter.getSuggestions(q)
      : await adapter.getInitial()
    if (id === reqId.current) setSections(result || [])
  }, [adapter])

  // Fetch suggestions while focused, debounced on value change.
  useEffect(() => {
    if (!focused) return
    const t = setTimeout(() => run(value), debounceMs)
    return () => clearTimeout(t)
  }, [value, focused, run, debounceMs])

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

  // Filter committed keys out of sections; slice initial state to INITIAL_COUNT.
  const committedKeys = useMemo(() => new Set(chips.map((c) => c.key)), [chips])
  const isInitial = !value.trim()
  const filteredSections = useMemo(() =>
    sections
      .map((section) => {
        let items = section.items.filter((item) => !committedKeys.has(item.key))
        if (isInitial) items = items.slice(0, INITIAL_COUNT)
        return { ...section, items }
      })
      .filter((s) => s.items.length > 0),
  [sections, committedKeys, isInitial])

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
