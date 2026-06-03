import { useState, useEffect, useRef, useCallback } from 'react'

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
 */
export function useGlobalSearch(adapter, { debounceMs = 120 } = {}) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const [sections, setSections] = useState([])
  const reqId = useRef(0)

  const run = useCallback(async (q) => {
    if (!adapter) { setSections([]); return }
    const id = ++reqId.current
    const result = q && q.trim()
      ? await adapter.getSuggestions(q)
      : await adapter.getInitial()
    if (id === reqId.current) setSections(result || [])
  }, [adapter])

  // Fetch while focused: on open (empty → initial) and on every (debounced) keystroke.
  useEffect(() => {
    if (!focused) return
    const t = setTimeout(() => run(value), debounceMs)
    return () => clearTimeout(t)
  }, [value, focused, run, debounceMs])

  const onFocus = useCallback(() => setFocused(true), [])
  const onBlur = useCallback(() => setFocused(false), [])
  const onChange = useCallback((v) => setValue(v), [])
  const onClear = useCallback(() => setValue(''), [])

  const suggestionsOpen = focused && sections.some((s) => s.items && s.items.length)

  return {
    value,
    onChange,
    onClear,
    onFocus,
    onBlur,
    suggestionSections: sections,
    suggestionsOpen,
  }
}
