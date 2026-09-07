import { Badge, useCountdown, formatHMS, formatMMSS } from '@odyssey/ui'
import './spotboard.css'

// The tick hook and the two clock formatters were PROMOTED to @odyssey/ui
// (2026-08-27) so DurationPicker could join the library — a library component
// may not import from an app folder. Re-exported here so SpotBid's existing
// importers (CarrierBid, AwardModal, RfqLinksPanel, SetupCarriers) keep their
// current import path and nothing in the product had to be rewritten to move a
// component into the design system.
export { useCountdown, formatHMS, formatMMSS }

// SpotBid countdown color ramp (designer amendment, 2026-09-03): RED is now
// reserved EXCLUSIVELY for a closed/expired quote — a live quote is never
// red. Above 40% of the BIDDING WINDOW remaining is BLUE, 0% (exclusive) up
// to 40% is AMBER, and only remaining <= 0 is RED.
//
// `windowMs` is `closeAt - openAt`. Without it there is no percentage to
// take, so the fallback keeps a time-based split under the same rule (red
// only at expiry): >10 min blue, otherwise (but still > 0) amber.
//
// ONE function, used by every countdown surface — the Live Bids strip badge,
// the Live Bids sub-tab dot, the award dialog's header badge and the carrier
// bid page's H/M/S title — so none of them can ever drift apart (user:
// "countdown color change should be the same for the bidpage countdown and
// floating badge").
// Two tones only (designer, 2026-09-07 — supersedes the 2026-09-03 three-step
// ramp): blue while more than 10% of the window remains, red at or under 10%
// and once expired. Amber is gone everywhere this tone feeds.
export function countdownTone(remaining, windowMs) {
  if (remaining <= 0) return 'red'
  if (windowMs > 0) return remaining / windowMs > 0.10 ? 'blue' : 'red'
  return remaining > 10 * 60000 ? 'blue' : 'red'
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
