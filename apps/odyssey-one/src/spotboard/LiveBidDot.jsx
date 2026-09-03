import { useCountdown, countdownTone } from './Countdown.jsx'
import './spotboard.css'

/**
 * LiveBidDot — small pulsing dot composed beside the "Live Bids" sub-tab
 * label (SpotBoardTab), signalling a bid is currently live. App-local: Tab
 * (`@odyssey/ui`) renders `label` as plain children, so this composes from
 * the outside rather than adding a prop to the shared, normalized component.
 *
 * Tone reuses `countdownTone` — same function the Countdown badge calls —
 * so the dot and the badge can never disagree on blue/amber/red.
 */
export default function LiveBidDot({ quote }) {
  const isOpen = quote?.status === 'open'
  // Hook must run every render regardless of `isOpen` (rules of hooks); a
  // missing closeAt just ticks a harmless NaN until a real quote arrives.
  const remaining = useCountdown(quote?.closeAt)
  if (!isOpen || remaining <= 0) return null

  const windowMs = quote.openAt ? quote.closeAt - quote.openAt : 0
  const tone = countdownTone(remaining, windowMs)

  return <span aria-hidden="true" className={`live-bid-dot live-bid-dot--${tone}`} />
}
