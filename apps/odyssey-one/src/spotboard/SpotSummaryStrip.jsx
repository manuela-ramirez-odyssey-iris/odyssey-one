import { SummaryStrip } from '@odyssey/ui'
import TooltipTrigger from '../components/ui/TooltipTrigger.jsx'

// SpotSummaryStrip — sticky shipment-context band for the SpotBid tab
// (user, 2026-08-20): Duration (once set) · Origin · Destination · Pickup
// Window, each cell compacted to its distinctive info with the FULL value in
// a hover Tooltip (cost-allocation strip look, bid-page sticky treatment).
// `items`: [{ label, value, full? }] — `full` (when present, even if it
// equals `value`) wraps the value in a TooltipTrigger, making the cell
// hoverable (user, round 2: "make the strip cells hoverable too" — callers
// decide which cells opt in by passing `full`).
// `groups` (optional) overrides the default one-group tooltip for cells whose
// compact value stands in for MORE than one field — the Live Bids BID OPEN /
// BID CLOSED cell shows one time but explains both (opened AND closed).
export default function SpotSummaryStrip({ items, className = '', ...rest }) {
  const cells = items.map(({ label, value, full, groups }) => ({
    label,
    value: (full != null || groups)
      ? (
        <TooltipTrigger asSpan tooltipProps={{ groups: groups ?? [{ subtitle: label, content: full }] }}>
          <span>{value ?? '--'}</span>
        </TooltipTrigger>
      )
      : value,
  }))
  return <SummaryStrip className={`spot-sticky-strip ${className}`.trim()} items={cells} {...rest} />
}
