import { useEffect, useState } from 'react'

// ~250ms debounce for the typeahead contract (LINX-7553 / spec §2.3)
export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
