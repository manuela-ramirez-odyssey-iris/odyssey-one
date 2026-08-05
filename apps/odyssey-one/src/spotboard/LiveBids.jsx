import { Badge, Button, GroupTable } from '@odyssey/ui'
import Countdown from './Countdown'
import TolerancePanel from './TolerancePanel'
import { lowestBid } from './spotStore'
import { fmtDollar } from '../utils/money'
import './liveBids.css'

const STATUS_BADGE_VARIANT = {
  draft: 'gray',
  open: 'blue',
  closed: 'amber',
  awarded: 'green',
}

const COLUMNS = [
  { key: 'carrier', label: 'Carrier' },
  { key: 'status', label: 'Status' },
  { key: 'linehaul', label: 'Linehaul', align: 'right' },
  { key: 'fuel', label: 'Fuel', align: 'right' },
  { key: 'accessorials', label: 'Accessorials', align: 'right' },
  { key: 'total', label: 'Total', align: 'right' },
  { key: 'submittedBy', label: 'Submitted By' },
  { key: 'response', label: 'Response' },
]

const DETAIL_COLUMNS = [
  { key: 'code', label: 'Code' },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount', align: 'right' },
]

function sumAccessorials(bid) {
  return (bid.accessorials ?? []).reduce((sum, a) => sum + a.amount, 0)
}

// A bid's charge lines: linehaul + fuel + each accessorial, in the shape
// detailColumns expects (code/description/amount).
function chargeLines(bid) {
  return [
    { code: 'LH', description: 'Linehaul', amount: fmtDollar(bid.linehaul) },
    { code: 'FSC', description: 'Fuel', amount: fmtDollar(bid.fuel) },
    ...(bid.accessorials ?? []).map((a) => ({
      code: a.code,
      description: a.description || a.code,
      amount: fmtDollar(a.amount),
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

function headerField(label, value) {
  return (
    <div className="live-bids__header-field">
      <span className="live-bids__header-label">{label}</span>
      <span className="live-bids__header-value">{value}</span>
    </div>
  )
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
        linehaul: bid ? fmtDollar(bid.linehaul) : '—',
        fuel: bid ? fmtDollar(bid.fuel) : '—',
        accessorials: bid ? fmtDollar(sumAccessorials(bid)) : '—',
        total: bid ? fmtDollar(bid.total) : '—',
        submittedBy: bid?.submittedBy ?? '—',
        response: bid?.respondedAt ? new Date(bid.respondedAt).toLocaleString() : '—',
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

  return (
    <div className="live-bids">
      <div className="live-bids__header">
        {headerField('Quote ID', quote.quoteId)}
        <Badge variant={STATUS_BADGE_VARIANT[quote.status] ?? 'gray'}>{quote.status}</Badge>
        {headerField('Opened', quote.openAt ? new Date(quote.openAt).toLocaleString() : '—')}
        {headerField('Closed', closed && quote.closeAt ? new Date(quote.closeAt).toLocaleString() : '—')}
        {headerField('List', quote.listName)}
        {headerField('Award type', quote.awardType ?? '—')}
        {quote.status === 'open' && <Countdown closeAt={quote.closeAt} />}
      </div>

      <GroupTable
        columns={COLUMNS}
        groups={groups}
        detailColumns={DETAIL_COLUMNS}
        defaultExpanded={false}
        stickyActions
        actionsHeader={null}
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
  )
}
