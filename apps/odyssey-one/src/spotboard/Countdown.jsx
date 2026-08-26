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

// SpotBid countdown color ramp (user, 2026-08-24, restated): the badge
// tracks how much of the BIDDING WINDOW is left — BLUE from 100% down to
// 30%, AMBER 30→10%, RED under 10% (and once expired). Blue is the
// open-bid color, so a healthy countdown reads as "bid is live" and only
// leaves that color as it runs out.
//
// `windowMs` is `closeAt - openAt`. Without it there is no percentage to
// take, so the fallback keeps the same three bands on absolute time:
// >30 min blue, 10–30 amber, <10 red.
//
// ONE function, used by every countdown surface — the Live Bids strip badge,
// the award dialog's header badge and the carrier bid page's H/M/S title —
// so the three can never drift apart (user: "countdown color change should
// be the same for the bidpage countdown and floating badge").
export function countdownTone(remaining, windowMs) {
  if (remaining <= 0) return 'red'
  if (windowMs > 0) {
    const pct = remaining / windowMs
    if (pct > 0.30) return 'blue'
    if (pct > 0.10) return 'amber'
    return 'red'
  }
  if (remaining > 30 * 60000) return 'blue'
  if (remaining > 10 * 60000) return 'amber'
  return 'red'
}

// `zeroWhenExpired` (default false): an expired countdown holds at 00:00
// instead of collapsing to the word "Closed" — the LiveBids strip cell wants
// the clock to stay a clock, because its own LABEL already flips BID OPEN →
// BID CLOSED beside it (user, 2026-08-24). Default off keeps SpotBidRoute's
// grid cell reading "Closed" as before.
//
// `openAt` (optional) is what turns the tone into a real percentage of the
// window rather than the absolute fallback.
export default function Countdown({ closeAt, openAt, onExpire, zeroWhenExpired = false }) {
  const remaining = useCountdown(closeAt, onExpire)
  const expired = remaining <= 0
  const tone = countdownTone(remaining, openAt ? closeAt - openAt : 0)

  return (
    // The class is kept ONLY at the red end, where CSS still tints the badge
    // beyond what the variant does; green/amber ride the Badge variant alone.
    <span className={tone === 'red' ? 'countdown--urgent' : undefined}>
      <Badge variant={tone}>
        {expired ? (zeroWhenExpired ? formatMMSS(0) : 'Closed') : formatMMSS(remaining)}
      </Badge>
    </span>
  )
}
