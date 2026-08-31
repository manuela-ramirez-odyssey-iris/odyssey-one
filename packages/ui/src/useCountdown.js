import { useEffect, useRef, useState } from 'react'

/**
 * Countdown timing primitives — the tick hook and the two clock formatters.
 *
 * Promoted out of the app's SpotBid `Countdown.jsx` (2026-08-27) so
 * `DurationPicker` could join `@odyssey/ui`: a library component may not reach
 * back into an app folder for its logic. The SpotBid-specific pieces —
 * `countdownTone`, `URGENT_MS` and the `Countdown` badge itself — deliberately
 * stayed behind: they encode one product's colour policy, not a shared control.
 *
 * These are pure timing, no rendering, so they carry no tokens and no Figma
 * master. `DurationPicker`'s countdown and SpotBid's badge share this one
 * implementation, which is the point — two setIntervals drift.
 */

/** Remaining ms → "MM:SS", clamped at zero. Minutes do NOT wrap into hours. */
export function formatMMSS(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const mm = Math.floor(totalSec / 60)
  const ss = totalSec % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

/**
 * Remaining ms → `{ hh, mm, ss }`, each zero-padded to 2 digits and clamped at
 * zero. The H/M/S breakout, for surfaces where minutes need an hour bucket to
 * overflow into rather than running past 99. `hh` is a floor, not a ceiling —
 * a >99-hour countdown grows past 2 digits rather than truncating.
 */
export function formatHMS(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const hh = Math.floor(totalSec / 3600)
  const mm = Math.floor((totalSec % 3600) / 60)
  const ss = totalSec % 60
  return { hh: String(hh).padStart(2, '0'), mm: String(mm).padStart(2, '0'), ss: String(ss).padStart(2, '0') }
}

/**
 * Ticks once a second until `closeAt`, firing `onExpire` exactly once when
 * remaining hits 0. Returns remaining ms — which can go negative for a single
 * tick before the interval clears, so callers clamp (both formatters above
 * already do).
 *
 * `onExpire` is held in a ref so a caller passing an inline arrow does not
 * restart the interval on every render.
 */
export function useCountdown(closeAt, onExpire) {
  const [remaining, setRemaining] = useState(() => closeAt - Date.now())
  const expiredRef = useRef(false)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    expiredRef.current = false
    let interval
    const tick = () => {
      const next = closeAt - Date.now()
      setRemaining(next)
      if (next <= 0 && !expiredRef.current) {
        expiredRef.current = true
        clearInterval(interval)
        onExpireRef.current?.()
      }
    }
    tick()
    interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [closeAt])

  return remaining
}
