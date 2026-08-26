import { useState } from 'react'
import { Alert } from '@odyssey/ui'
import { useCountdown, countdownTone } from './Countdown'
import { lowestBid } from './spotStore'

// The countdown ramp expressed in Alert's own variants (user, 2026-08-24:
// "alert should be blue, orange, and red to match badge") — one source of
// truth for the tone, two vocabularies for rendering it.
const TONE_VARIANT = { blue: 'info', amber: 'warning', red: 'error' }

/**
 * RfqLinksPanel — the send confirmation, and then the state of the bid it
 * sent. It used to be the CE-1 email stand-in, carrying an expandable
 * `/spot-bid/:token` link per included carrier; those links now live on each
 * carrier's own Live Bids row (2026-08-24), so this is a STOCK Alert:
 * default anatomy, default X, no `className` and no layout override (the old
 * `.rfq-links .alert__body` align rule was what pushed it out of alignment).
 *
 * It tracks the quote through two states:
 *  • open   — how many carriers were sent the RFQ, and where to open one.
 *  • closed — who is in line to be awarded, and what to do about it.
 *
 * Colour follows the same `countdownTone` ramp as the countdown badges, so
 * the banner and the clock never disagree about how urgent the bid is.
 */
export default function RfqLinksPanel({ quote, carriers }) {
  const [dismissed, setDismissed] = useState(false)
  // Hook order can't depend on the quote — 0 is a safe "already expired"
  // stand-in when there is no window to count.
  const remaining = useCountdown(quote?.closeAt ?? 0)

  const included = (carriers ?? quote?.carriers ?? []).filter((c) => c.incl)
  if (included.length === 0 || dismissed) return null

  const count = `${included.length} carrier${included.length === 1 ? '' : 's'}`
  // Expiry counts as closed here independently of the store: the planner may
  // be sitting on Setup & Carriers, where LiveBids (which fires the actual
  // closeQuote on expiry) isn't mounted to have done it yet.
  const closed = quote?.status === 'closed' || quote?.status === 'awarded'
    || (!!quote?.closeAt && remaining <= 0)
  const tone = countdownTone(remaining, quote?.openAt ? quote.closeAt - quote.openAt : 0)

  // Closed: name who the award is staged on — the lowest bid, which is what
  // Live Bids pre-selects — so the banner states the actual next decision
  // rather than repeating the send.
  const winner = closed ? lowestBid(quote) : null
  const message = closed
    ? (winner
      ? `RFQ sent to ${count} — bid is closed, ${winner.scac} · ${winner.name} to be awarded — press Stage to confirm award and tender.`
      : `RFQ sent to ${count} — bid is closed, no bids were received.`)
    : `RFQ sent to ${count} — open a carrier's bid page from the link on its row below.`

  return (
    <Alert variant={closed ? 'error' : TONE_VARIANT[tone]} onClose={() => setDismissed(true)}>
      {message}
    </Alert>
  )
}
