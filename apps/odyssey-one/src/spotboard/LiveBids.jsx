import { Badge, Button, GroupTable, SubAccordion } from '@odyssey/ui'
import Countdown from './Countdown'
import SpotSummaryStrip from './SpotSummaryStrip'
import TolerancePanel from './TolerancePanel'
import { lowestBid } from './spotStore'
import { fmtDollar } from '../utils/money'
import './spotboard.css'
import './liveBids.css'

const STATUS_BADGE_VARIANT = {
  draft: 'gray',
  open: 'blue',
  closed: 'amber',
  awarded: 'green',
}

// Pricing lives in the NESTED table, not the main row (user, S112) — the outer
// row identifies the carrier and its bid state; the money is the breakdown you
// expand to see, Total included as its own line. The user has since reversed
// that ruling for Total specifically: it now also appears on the outer row,
// last (money right-aligned at the row's end), so the total is visible
// without expanding.
const COLUMNS = [
  { key: 'carrier', label: 'Carrier' },
  { key: 'status', label: 'Status' },
  { key: 'submittedBy', label: 'Submitted By' },
  { key: 'response', label: 'Response' },
  { key: 'total', label: 'Total', align: 'right' },
]

// Six columns (user, S112): the pricing keeps its COLUMN shape one level down
// — the same four headings the outer row used to carry — and Code/Description
// stay real columns rather than being folded into a cell's text.
const DETAIL_COLUMNS = [
  { key: 'code', label: 'Code' },
  { key: 'description', label: 'Description' },
  { key: 'linehaul', label: 'Linehaul', align: 'right' },
  { key: 'fuel', label: 'Fuel', align: 'right' },
  { key: 'accessorials', label: 'Accessorials', align: 'right' },
  { key: 'total', label: 'Total', align: 'right' },
]

function sumAccessorials(bid) {
  return (bid.accessorials ?? []).reduce((sum, a) => sum + a.amount, 0)
}

// The priced row carries the bid's four money columns and leaves Code /
// Description empty (they describe accessorials, not the bid). Each accessorial
// then gets its own line: code + description filled, its amount under the
// Accessorials column it rolls into, the other money columns blank.
const DASH = '--'

function chargeLines(bid) {
  return [
    {
      code: DASH,
      description: DASH,
      linehaul: fmtDollar(bid.linehaul),
      fuel: fmtDollar(bid.fuel),
      accessorials: fmtDollar(sumAccessorials(bid)),
      total: fmtDollar(bid.total),
    },
    ...(bid.accessorials ?? []).map((a) => ({
      code: a.code,
      description: a.description || a.code,
      linehaul: DASH,
      fuel: DASH,
      accessorials: fmtDollar(a.amount),
      total: DASH,
    })),
  ]
}

// Status badge: green "Lowest bid" wins over everything else; otherwise Bid /
// Declined from bid.status; a carrier with NO bid key at all (silence, not a
// decline) reads "No Bid Submitted" once the quote has closed, "Awaiting"
// while it's still open.
function statusBadge(bid, isLowest, closed) {
  if (isLowest) return <Badge variant="green">Lowest bid</Badge>
  if (bid?.status === 'bid') return <Badge variant="blue">Bid</Badge>
  if (bid?.status === 'declined') return <Badge variant="gray">Declined</Badge>
  return <Badge variant="gray">{closed ? 'No Bid Submitted' : 'Awaiting'}</Badge>
}

/**
 * LiveBids — SpotBoard sub-tab: quote header strip + nested GroupTable
 * (one group per carrier, each group's detail table is that carrier's charge
 * breakdown) + TolerancePanel once closed + the state-driven actions row.
 */
export default function LiveBids({
  quote,
  onForceClose,
  onAward,
  onModify,
  onClear,
  // ponytail: benchmark/tolerancePct/manualReview/caps aren't in the required
  // contract (LiveBids only receives `quote`) — SpotBoardTab (Task 10) owns the
  // shipment's routing options and can pass a real `benchmark` once wired.
  // Until then this falls back to the highest submitted bid total.
  benchmark,
  tolerancePct = 5,
  manualReview = false,
  monetaryCap,
  totalCap,
}) {
  const lowest = lowestBid(quote)
  const closed = quote.status === 'closed'
  // 'awarded' is also terminal — badge wording (No Bid Submitted vs Awaiting)
  // must not revert once the quote is past bidding. ACTIONS row and
  // TolerancePanel stay gated on `closed` only (unchanged behavior there).
  const terminal = closed || quote.status === 'awarded'

  const groups = quote.carriers.map((carrier) => {
    const { bid } = carrier
    const isLowest = !!lowest && lowest.scac === carrier.scac
    const isBiddable = bid?.status === 'bid'

    return {
      id: carrier.scac,
      label: `${carrier.scac} · ${carrier.name}`,
      values: {
        status: statusBadge(bid, isLowest, terminal),
        submittedBy: bid?.submittedBy ?? '—',
        response: bid?.respondedAt ? new Date(bid.respondedAt).toLocaleString() : '—',
        total: bid?.status === 'bid' ? fmtDollar(bid.total) : '—',
      },
      detailRows: bid ? chargeLines(bid) : [],
      action: isBiddable ? (
        <Button size="sm" variant="secondary" onClick={() => onAward?.(carrier.scac)}>
          Award
        </Button>
      ) : null,
    }
  })

  const fallbackBenchmark = Math.max(
    0,
    ...quote.carriers.map((c) => c.bid?.total).filter((n) => n != null)
  )

  // No carrier has bid → no Award button would ever render → the GroupTable's
  // pinned action column has nothing to show (user, round 2: "when no bid is
  // submitted no need to show the actions column").
  const hasAnyBid = quote.carriers.some((c) => c.bid?.status === 'bid')

  // The quote header is a stat strip, not a bespoke field row (user, S112) —
  // same SpotSummaryStrip the Setup & Carriers tab uses, so both read alike
  // AND both get hoverable cells (user, round 2: "make the strip cells
  // hoverable too"). `full` is passed alongside `value` for every text cell
  // so SpotSummaryStrip wraps it in a Tooltip; node-valued cells (Status
  // badge, Countdown) are left without `full` and render bare.
  const openedStr = quote.openAt ? new Date(quote.openAt).toLocaleString() : null
  const closedStr = closed && quote.closeAt ? new Date(quote.closeAt).toLocaleString() : null
  const summaryItems = [
    { label: 'Quote ID', value: quote.quoteId, full: quote.quoteId },
    { label: 'Status', value: <Badge variant={STATUS_BADGE_VARIANT[quote.status] ?? 'gray'}>{quote.status}</Badge> },
    { label: 'Opened', value: openedStr, full: openedStr },
    { label: 'Closed', value: closedStr, full: closedStr },
    { label: 'List', value: quote.listName, full: quote.listName },
    { label: 'Award type', value: quote.awardType, full: quote.awardType },
    ...(quote.status === 'open'
      ? [{ label: 'Closes in', value: <Countdown closeAt={quote.closeAt} /> }]
      : []),
  ]

  return (
    <>
      {/* Quote header strip lives OUTSIDE the accordion AND outside .pane-col
          (user, 2026-08-20; components.css:6227-6228 — full-width bands sit
          directly on .pane-canvas, same as Setup & Carriers' SpotSummaryStrip)
          and sticks via spotboard.css `.spot-sticky-strip`, so it stays
          visible while the bids table scrolls underneath it. */}
      <SpotSummaryStrip
        className="live-bids__summary"
        aria-label="Quote Summary"
        items={summaryItems}
      />

      <div className="pane-col pane-col--wide">
      <SubAccordion title="Live Bids" showIcon={false} collapsible={false}>
        <div className="live-bids">
          <GroupTable
            columns={COLUMNS}
            groups={groups}
            detailColumns={DETAIL_COLUMNS}
            defaultExpanded={false}
            stickyActions={hasAnyBid}
            actionsHeader={hasAnyBid ? null : undefined}
            aria-label="Live bids"
          />

          {closed && (
            lowest ? (
              <TolerancePanel
                benchmark={benchmark ?? fallbackBenchmark}
                tolerancePct={tolerancePct}
                lowestBid={lowest.bid.total}
                manualReview={manualReview}
                monetaryCap={monetaryCap}
                totalCap={totalCap}
              />
            ) : (
              <p className="live-bids__no-bids">No bids received</p>
            )
          )}

          <div className="live-bids__actions">
            {quote.status === 'open' && (
              <Button variant="secondary" onClick={onForceClose}>Force Close</Button>
            )}
            {closed && (
              <>
                <h3 className="text-label-base-semibold live-bids__actions-heading">Award Action</h3>
                <p className="text-label-sm-regular live-bids__actions-note">
                  Select a carrier and award. Award moves the carrier into the shipment tendering flow — it does not assign the load until tendered.
                </p>
                <Button variant="primary" disabled={!lowest} onClick={() => lowest && onAward?.(lowest.scac)}>
                  Award Carrier &amp; Send to Tender
                </Button>
                <Button variant="secondary" onClick={onModify}>Modify &amp; Resend</Button>
                <Button variant="secondary" onClick={onClear}>Clear &amp; Start Over</Button>
              </>
            )}
          </div>
        </div>
      </SubAccordion>
      </div>
    </>
  )
}
