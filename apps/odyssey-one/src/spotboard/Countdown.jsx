import { useEffect, useRef, useState } from 'react'
import { Badge } from '@odyssey/ui'
import './spotboard.css'

export const URGENT_MS = 15 * 60000

export function formatMMSS(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const mm = Math.floor(totalSec / 60)
  const ss = totalSec % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

// H/M/S breakout for the CarrierBid countdown SummaryStrip (SPB-43 §2,
// Figma 5172:7856 — HOURS/MINUTES/SECONDS cells). A second formatter rather
// than reworking formatMMSS: Countdown (below) still needs MM:SS with no
// hour wrap, and this resolves the old ">99 minutes" question by giving
// minutes an actual hour bucket to overflow into instead. Each field is
// zero-padded to 2 digits — hours itself is a floor, not a ceiling, same as
// formatMMSS's minutes used to be (a >99-hour countdown just grows past 2
// digits rather than truncating).
export function formatHMS(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const hh = Math.floor(totalSec / 3600)
  const mm = Math.floor((totalSec % 3600) / 60)
  const ss = totalSec % 60
  return { hh: String(hh).padStart(2, '0'), mm: String(mm).padStart(2, '0'), ss: String(ss).padStart(2, '0') }
}

// Shared tick logic — extracted so CarrierBid's SummaryStrip countdown
// (SPB-43 §2) can reuse the same interval instead of a second setInterval
// implementation. Ticks every second until `closeAt`, firing `onExpire`
// once when remaining hits 0. Returns remaining ms (can go negative for one
// tick before the interval clears — callers clamp via `expired`).
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

export default function Countdown({ closeAt, onExpire }) {
  const remaining = useCountdown(closeAt, onExpire)
  const expired = remaining <= 0
  const urgent = !expired && remaining < URGENT_MS

  return (
    <span className={urgent ? 'countdown--urgent' : undefined}>
      <Badge variant="time">{expired ? 'Closed' : formatMMSS(remaining)}</Badge>
    </span>
  )
}
