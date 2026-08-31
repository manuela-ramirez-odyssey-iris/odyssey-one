import { Badge, useCountdown, formatHMS, formatMMSS } from '@odyssey/ui'
import './spotboard.css'

// The tick hook and the two clock formatters were PROMOTED to @odyssey/ui
// (2026-08-27) so DurationPicker could join the library — a library component
// may not import from an app folder. Re-exported here so SpotBid's existing
// importers (CarrierBid, AwardModal, RfqLinksPanel, SetupCarriers) keep their
// current import path and nothing in the product had to be rewritten to move a
// component into the design system.
export { useCountdown, formatHMS, formatMMSS }

export const URGENT_MS = 15 * 60000

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
