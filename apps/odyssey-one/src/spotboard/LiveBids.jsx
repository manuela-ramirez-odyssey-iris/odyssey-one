import { useState } from 'react'
import { Award, Link as LinkIcon } from 'lucide-react'
import { Alert, Badge, Button, GroupTable, SubAccordion, TitleSubtitle } from '@odyssey/ui'
import { ICON_MD, ICON_LG } from '@odyssey/tokens'
import Countdown from './Countdown'
import SpotSummaryStrip from './SpotSummaryStrip'
import { REASON_TEXT, WITHIN_TOLERANCE_TEXT } from './TolerancePanel'
import AwardModal from './AwardModal'
import { lowestBid } from './spotStore'
import { applyMarkup, evaluateTolerance } from './tolerance'
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
// Cost vs CLIENT COST (SPB-68, Kathleen email 2026-08-24 item #6): the
// planner judges against what the client pays, so the markup-applied value
// sits beside the carrier's own total on the outer row.
const COLUMNS = [
  { key: 'carrier', label: 'Carrier' },
  { key: 'status', label: 'Status' },
  { key: 'submittedBy', label: 'Submitted By' },
  { key: 'response', label: 'Response' },
  { key: 'total', label: 'Cost', align: 'right' },
  { key: 'clientCost', label: 'Client Cost', align: 'right' },
  // Per-carrier RFQ link (user, 2026-08-24) — the same `/spot-bid/:token`
  // link RfqLinksPanel lists, reachable from the carrier's own row so the
  // planner can open a carrier's bid page without leaving Live Bids.
  { key: 'rfq', label: 'RFQ', align: 'center' },
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
 * breakdown) + the state-driven actions row. The tolerance read lives in
 * the award dialog now (user, 2026-08-24), not on this tab.
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
  // Markup for the CLIENT COST display (SPB-68) — same {type, value} shape
  // applyMarkup/buildSpotRateOption take; SpotBoardTab passes the quote's
  // markup so display and award hand-off use the one config.
  markup = { type: 'flat', value: 0 },
  // The RFQ/bid-state banner, rendered BELOW this tab's own quote strip
  // (user, 2026-08-24) rather than above it by the parent.
  banner,
}) {
  const clientCost = (bid) => applyMarkup(
    { linehaul: bid.linehaul, fuel: bid.fuel, accessorials: bid.accessorials ?? [] },
    markup
  ).total

  // Award staging (SPB-63): the radio SELECTS, it never tenders. Execution is
  // the Stage action in the summary strip → AwardModal.
  //
  // `picked` is the planner's OVERRIDE, null until they touch a radio; the
  // effective selection falls back to the lowest bid, so the cheapest bid is
  // pre-selected the moment one exists (user, 2026-08-24) and re-points on
  // its own if a cheaper bid lands. Deriving it — rather than seeding state
  // in an effect — is what keeps "auto-select the lowest" true for bids that
  // arrive after mount without fighting the planner's own choice.
  const [picked, setPicked] = useState(null)
  const [staging, setStaging] = useState(false)
  const lowest = lowestBid(quote)
  const pickedStillInQuote = picked && quote.carriers.some((c) => c.scac === picked && c.bid?.status === 'bid')
  const selectedScac = (pickedStillInQuote ? picked : null) ?? lowest?.scac ?? null
  const setSelectedScac = setPicked
  // Expiry IS a close (SPB-63: the quote closes "by expiry or force close";
  // SPB-61: Send derives Quote Expires from Duration). spotStore has no timer
  // of its own — `status` stays 'open' past `closeAt` until something calls
  // closeQuote — so the countdown reaching zero is what fires it, below. That
  // is load-bearing rather than cosmetic: `award()` rejects any quote whose
  // status isn't 'closed', so without this an expired bid could never be
  // awarded. `expired` also drives this render directly, so the labels don't
  // wait a round-trip for the store write to land.
  const [expired, setExpired] = useState(() => !!quote.closeAt && Date.now() > quote.closeAt)
  const closed = quote.status === 'closed' || (quote.status === 'open' && expired)
  // 'awarded' is also terminal — badge wording (No Bid Submitted vs Awaiting)
  // must not revert once the quote is past bidding. ACTIONS row and
  // TolerancePanel stay gated on `closed` only (unchanged behavior there).
  const terminal = closed || quote.status === 'awarded'
  const handleExpire = () => {
    setExpired(true)
    onForceClose?.() // same store transition force-close performs
  }
  const awardedScac = quote.awardedScac ?? null

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
        clientCost: bid?.status === 'bid' ? fmtDollar(clientCost(bid)) : '—',
        // EXCLUDED carriers get no link: sendRFQ mints a token for every row
        // in the quote, but only included carriers were actually sent one —
        // same `incl` filter RfqLinksPanel used to apply to its list.
        rfq: carrier.incl && carrier.token ? (
          <a
            className="live-bids__rfq-link"
            href={`/spot-bid/${carrier.token}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open bid link for ${carrier.scac} · ${carrier.name}`}
            onClick={(e) => e.stopPropagation()} // never toggle the row
          >
            <LinkIcon {...ICON_MD} aria-hidden="true" />
          </a>
        ) : '—',
      },
      detailRows: bid ? chargeLines(bid) : [],
      // Awarded → a static Award icon (the decision is made). Otherwise a
      // radio that only STAGES the choice. The radio is ALWAYS selectable,
      // including while the quote is open: SPB-63 makes selection a visual
      // cue that "will not trigger tendering", so what close gates is the
      // EXECUTION (the strip's Award and Tender button), not the picking.
      action: awardedScac === carrier.scac ? (
        <Award {...ICON_LG} className="live-bids__awarded-icon" aria-label={`${carrier.scac} awarded`} />
      ) : (isBiddable && awardedScac == null ? (
        <input
          type="radio"
          name="live-bids-award"
          className="live-bids__award-radio"
          checked={selectedScac === carrier.scac}
          onChange={() => setSelectedScac(carrier.scac)}
          aria-label={`Select ${carrier.scac} · ${carrier.name} for award`}
        />
      ) : null),
    }
  })

  const fallbackBenchmark = Math.max(
    0,
    ...quote.carriers.map((c) => c.bid?.total).filter((n) => n != null)
  )

  // No carrier has bid → no radio would ever render → the GroupTable's pinned
  // action column has nothing to show (user, round 2: "when no bid is
  // submitted no need to show the actions column"). The column also stays
  // hidden while the quote is OPEN, since award is gated on close (SPB-63).
  const hasAnyBid = quote.carriers.some((c) => c.bid?.status === 'bid')

  // The quote header is a stat strip, not a bespoke field row (user, S112) —
  // same SpotSummaryStrip the Setup & Carriers tab uses, so both read alike
  // AND both get hoverable cells (user, round 2: "make the strip cells
  // hoverable too"). `full` is passed alongside `value` for every text cell
  // so SpotSummaryStrip wraps it in a Tooltip; node-valued cells (Status
  // badge, Countdown) are left without `full` and render bare.
  // Opened/Closed collapse into ONE cell (user, 2026-08-24): a bidding
  // window is short, so the distinguishing part is the TIME — the cell shows
  // the time of whichever event the quote is at, and the tooltip carries
  // both full timestamps. `closeAt` is the SCHEDULED close, which is also
  // the actual one once the quote is closed (force-close rewrites it).
  const fmtTime = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const openedStr = quote.openAt ? new Date(quote.openAt).toLocaleString() : null
  const closedStr = quote.closeAt ? new Date(quote.closeAt).toLocaleString() : null
  // An OPEN quote has no close event yet — only a scheduled `closeAt`, which
  // is what the CLOSES IN countdown already expresses. Showing it as "Bid
  // Closed" claimed something that hadn't happened (user, 2026-08-24), so the
  // group only exists once the quote is actually closed/awarded.
  const windowGroups = terminal
    ? [
      { subtitle: 'Bid Opened', content: openedStr ?? '--' },
      { subtitle: 'Bid Closed', content: closedStr ?? '--' },
    ]
    : [{ subtitle: 'Bid Opened', content: openedStr ?? '--' }]
  const selectedCarrier = quote.carriers.find((c) => c.scac === selectedScac) ?? null

  // The SAME evaluation as plain fields, for the award dialog — which shows
  // its information as Shipment-Details-style sections (user, 2026-08-24),
  // so the verdict must read at the same altitude as every other field there
  // rather than arriving as a bordered card with its own internal layout.
  // Derived from one `evaluateTolerance` call shared with the panel above, so
  // the two surfaces can never state different numbers.
  const toleranceVerdict = lowest
    ? evaluateTolerance({
      benchmark: benchmark ?? fallbackBenchmark,
      tolerancePct,
      lowestBid: lowest.bid.total,
      manualReview,
      monetaryCap,
      totalCap,
    })
    : null
  const markupText = markup
    ? (markup.type === 'pct' ? `${markup.value}%` : fmtDollar(markup.value))
    : null
  const verdictText = toleranceVerdict
    ? (toleranceVerdict.withinTolerance
      ? WITHIN_TOLERANCE_TEXT
      : (REASON_TEXT[toleranceVerdict.reason] || toleranceVerdict.reason))
    : null
  // The SAME eight fields the retired TolerancePanel card showed, so nothing
  // was lost in the move — only the layout changed.
  const toleranceFields = lowest ? (
    <>
      <TitleSubtitle subtitle="Highest routed cost (benchmark)" title={fmtDollar(benchmark ?? fallbackBenchmark)} />
      <TitleSubtitle subtitle="Tolerance (% above)" title={`${tolerancePct}%`} />
      <TitleSubtitle subtitle="Tolerance ceiling" title={fmtDollar(toleranceVerdict.ceiling)} />
      <TitleSubtitle subtitle="Lowest bid (cost)" title={fmtDollar(lowest.bid.total)} />
      {markupText != null && <TitleSubtitle subtitle="Markup" title={markupText} />}
      <TitleSubtitle subtitle="Lowest bid (client cost)" title={fmtDollar(clientCost(lowest.bid))} />
      <TitleSubtitle subtitle="Result" title={verdictText} />
      <TitleSubtitle subtitle="Manual-review flag" title={manualReview ? 'ON → routed to planner' : 'OFF'} />
    </>
  ) : null
  // …and the panel's verdict banner rides along with them.
  const toleranceBanner = lowest ? (
    <Alert variant={toleranceVerdict.withinTolerance ? 'success' : 'warning'} showClose={false}>
      {verdictText}
    </Alert>
  ) : null
  // Strip shape (user, 2026-08-24): the Status badge cell is GONE — the
  // countdown cell carries the same information better, its label flipping
  // BID OPEN → BID CLOSED while the clock holds at 00:00 in red. The final
  // cell is the single "Award and Tender" execution action (SPB-63), which
  // is why the per-row Award buttons and the bottom award button are gone.
  const summaryItems = [
    { label: 'Quote ID', value: quote.quoteId, full: quote.quoteId },
    {
      label: terminal ? 'BID CLOSED' : 'BID OPEN',
      value: fmtTime(terminal ? quote.closeAt : quote.openAt),
      groups: windowGroups,
    },
    { label: 'List', value: quote.listName, full: quote.listName },
    {
      label: 'CLOSES IN',
      value: <Countdown closeAt={quote.closeAt} openAt={quote.openAt} onExpire={handleExpire} zeroWhenExpired />,
    },
    {
      label: 'AWARD TO',
      value: selectedCarrier?.name ?? '--',
      full: selectedCarrier ? `${selectedCarrier.scac} · ${selectedCarrier.name}` : null,
    },
    {
      label: 'AWARD AND TENDER',
      // "Stage" opens the confirmation (user, 2026-08-24) — it never awards
      // directly. The close+selection gate lives on the modal's own Confirm,
      // so a planner can always OPEN the dialog and reach Force Close from
      // it; a disabled trigger would have hidden that exit.
      value: (
        <Button size="sm" variant="primary" onClick={() => setStaging(true)}>
          Stage
        </Button>
      ),
    },
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

      {banner && (
        <div className="pane-col pane-col--tight pane-col--wide">{banner}</div>
      )}

      {staging && (
        <AwardModal
          quote={quote}
          carrier={selectedCarrier}
          cost={selectedCarrier?.bid?.total}
          clientCost={selectedCarrier?.bid ? clientCost(selectedCarrier.bid) : undefined}
          tolerance={toleranceFields}
          toleranceBanner={toleranceBanner}
          closed={closed}
          onForceClose={onForceClose}
          onModify={() => { setStaging(false); onModify?.() }}
          onClear={() => { setStaging(false); onClear?.() }}
          onConfirm={() => { setStaging(false); onAward?.(selectedScac) }}
          onClose={() => setStaging(false)}
        />
      )}

      <div className="pane-col pane-col--wide">
      <SubAccordion title="Live Bids" showIcon={false} collapsible={false}>
        <div className="live-bids">
          <GroupTable
            columns={COLUMNS}
            groups={groups}
            detailColumns={DETAIL_COLUMNS}
            defaultExpanded={false}
            stickyActions={hasAnyBid}
            actionsHeader={hasAnyBid ? 'Award' : undefined}
            aria-label="Live bids"
          />

          {/* Tolerance Evaluation moved OUT of this tab and into the award
              dialog's Force Close view (user, 2026-08-24) — it is the read
              the close/award decision is made against, so it belongs beside
              those actions rather than as a card under the table. */}
          {closed && !lowest && <p className="live-bids__no-bids">No bids received</p>}

          {/* Force Close, Modify & Resend and Clear & Start Over all moved
              INTO the award dialog's Force Close view (user, 2026-08-24) —
              they belong beside the tolerance verdict they're decided on.
              Only the framing note is left out here, because the "award ≠
              tender" distinction (SPB-02) isn't self-evident from a label. */}
          {closed && (
            <div className="live-bids__actions">
              <p className="text-label-sm-regular live-bids__actions-note">
                Select a carrier, then Stage to award. Award moves the carrier into the shipment tendering flow — it does not assign the load until tendered.
              </p>
            </div>
          )}
        </div>
      </SubAccordion>
      </div>
    </>
  )
}
