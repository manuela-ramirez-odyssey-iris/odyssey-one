import { useEffect, useState } from 'react'

// Fetches the Odyssey Tracking platform's load-statistics payload through
// the Vite proxy. Returns { data, error }. data is the raw API response or
// null while pending; error is the caught error or null. Callers are
// expected to keep their existing static fallback rendered when data is
// null — this hook deliberately does not plumb a loading flag.
export function useTrackingLoadStatistics() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/odyssey-tracking-api/tracking/api/uiapi/loads/statistics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn(
            '[useTrackingLoadStatistics] fetch failed; widget falls back to mock data:',
            err.message,
          )
          setError(err)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { data, error }
}
