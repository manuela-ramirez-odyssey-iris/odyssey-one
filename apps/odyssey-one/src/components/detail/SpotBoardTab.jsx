import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { TriangleAlert } from 'lucide-react'
import { EmptyState, Tab } from '@odyssey/ui'
import SetupCarriers from '../../spotboard/SetupCarriers.jsx'
import LiveBids from '../../spotboard/LiveBids.jsx'
import RfqLinksPanel from '../../spotboard/RfqLinksPanel.jsx'
import SpotSummaryStrip from '../../spotboard/SpotSummaryStrip.jsx'
import { cityState, compactWindow } from '../../spotboard/stripFormat.js'
import { useSpotQuote } from '../../spotboard/useSpotQuote.js'
import { isSpotEligible, eligibilityReason } from '../../spotboard/eligibility.js'
import { benchmark as computeBenchmark } from '../../spotboard/tolerance.js'
import { buildSpotRateOption } from '../../spotboard/award.js'
import { getLookupOptions } from '../../api/services/lookupService'
import { saveTenderOption } from '../../api/services/shipmentService'

const SUB_TABS = [
  { key: 'setup', label: 'Setup & Carriers' },
  { key: 'bids', label: 'Live Bids' },
]

// ponytail: no markup UI control exists anywhere in SpotBoard V1 (neither
// SetupCarriers nor LiveBids carry a markup field) — award defaults to a flat
// $0 markup, matching QuoteModal's own blank-markup default
// (RoutingGuideTab.jsx:368, numMarkup = Number('') || 0). Add a real control
// (and wire it here) once the design calls for one.
const DEFAULT_MARKUP = { type: 'flat', value: 0 }

// header (origin/destination/equipment/distance/hazmat/pickup window) for
// SetupCarriers' read-only strip — sourced from the same fields the other
// panes already read off shipmentDetails (StopsTab, ShipmentDetailsModal):
// stopsData.stops[].location/type, stopsData.summary.{distance,seedEquipment},
// orderDetails[].{equipment,hazmat,earliestPickup,latestPickup}.
function buildHeader(shipmentDetails) {
  const stops = shipmentDetails?.stopsData?.stops ?? []
  const summary = shipmentDetails?.stopsData?.summary ?? {}
  const orders = shipmentDetails?.orderDetails ?? []
  const firstOrder = orders[0]
  const origin = stops.find((s) => s.type === 'pickup')?.location
  const destination = [...stops].reverse().find((s) => s.type === 'delivery')?.location
  return {
    origin,
    destination,
    equipment: summary.seedEquipment || firstOrder?.equipment,
    distance: summary.distance,
    hazmat: orders.some((o) => o.hazmat === 'Yes') ? 'Yes' : 'No',
    pickupWindow: firstOrder ? `${firstOrder.earliestPickup} - ${firstOrder.latestPickup}` : undefined,
  }
}

// Order dates arrive as "MM/DD/YYYY HH:MM TZ" (or DASH); the planner's date
// fields are date-only. Anything unparseable becomes '' — an empty field the
// planner fills, never a fabricated date.
function dateOnly(v) {
  return typeof v === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(v) ? v.slice(0, 10) : ''
}

// stopsData.summary.distance reads "245.00 mi" | "--" — pull the number out
// for the benchmark's ratePerMile*distanceMi fallback path.
function parseDistanceMi(distance) {
  const n = parseFloat(distance)
  return Number.isNaN(n) ? undefined : n
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// Demo convenience (explicitly requested by the user, S108 SpotBoard plan
// Task 10): once an RFQ opens, simulate 2-3 carrier bids landing across the
// open window so Live Bids has data without a human playing carrier. Bids
// land under the benchmark, staggered toward closeAt.
//
// The no-op-after-close/award/clear guard lives in spotStore.submitBid itself
// (it refuses once quote.status !== 'open' or nowMs > closeAt) — reusing that
// is the whole guard; this function's only remaining job is not leaking
// timers past unmount (done by the caller's cleanup effect).
function scheduleSimulatedBids({ carriers, durationMin }, benchmarkValue, submitBid, timersRef) {
  const eligible = (carriers ?? []).filter((c) => c.incl)
  if (eligible.length === 0 || !benchmarkValue) return
  const chosen = eligible.slice(0, Math.min(3, Math.max(2, eligible.length)))
  const windowMs = (durationMin || 0) * 60_000

  chosen.forEach((carrier, i) => {
    const delay = Math.max(1000, (windowMs / (chosen.length + 1)) * (i + 1))
    const linehaul = round2(benchmarkValue * (0.82 + i * 0.05))
    const fuel = round2(linehaul * 0.06)
    const timer = setTimeout(() => {
      submitBid(carrier.scac, {
        linehaul,
        fuel,
        accessorials: [],
        total: round2(linehaul + fuel),
        submittedBy: `ops@${carrier.scac.toLowerCase()}.example.com`,
      }, Date.now())
    }, delay)
    timersRef.current.push(timer)
  })
}

/**
 * SpotBoardTab — SpotBoard planner pane (S108 plan Task 10). Gates on
 * eligibility, then composes SetupCarriers + LiveBids under a sub-tab band,
 * wiring both to useSpotQuote and to the award → Tender handoff.
 */
export default function SpotBoardTab({ shipmentDetails, shipment }) {
  const eligible = isSpotEligible(shipmentDetails?.routingData)
  const [subTab, setSubTab] = useState('setup')
  const [carrierOptions, setCarrierOptions] = useState([])
  // Filled by Task 5's Quote Setup modal (onTermsChange) — wired now so the
  // strip's Duration cell is live the moment that modal lands.
  const [terms, setTerms] = useState(null)
  const timersRef = useRef([])

  const { quote, saveDraft, sendRFQ, submitBid, closeQuote, award, clearQuote } =
    useSpotQuote(shipment?.sellShipment)

  // Carrier pool is resolved async (SetupCarriers itself stays sync) —
  // fetching it is this component's job per the SetupCarriers contract.
  useEffect(() => {
    if (!eligible) return
    let cancelled = false
    getLookupOptions('carrier', '').then((opts) => {
      if (!cancelled) setCarrierOptions(opts)
    })
    return () => { cancelled = true }
  }, [eligible])

  // Clear any pending simulated-bid timers on unmount — the pane is
  // lazy-mounted per tab switch, so switching away must not setState later.
  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  const header = useMemo(() => buildHeader(shipmentDetails), [shipmentDetails])
  // Sticky shipment-context strip (user, 2026-08-20) — replaces the S112
  // order-view field grid. Only Duration/Origin/Destination/Pickup Window;
  // Distance/Equipment/Hazmat are deliberately dropped (not requested).
  const firstOrder = shipmentDetails?.orderDetails?.[0]
  const durationMin = quote?.durationMin ?? terms?.durationMin ?? null
  const stripItems = [
    ...(durationMin != null ? [{ label: 'Duration', value: `${durationMin} min` }] : []),
    { label: 'Origin', value: cityState(header?.origin), full: header?.origin },
    { label: 'Destination', value: cityState(header?.destination), full: header?.destination },
    { label: 'Pickup Window', value: compactWindow(firstOrder?.earliestPickup, firstOrder?.latestPickup), full: header?.pickupWindow },
  ]
  const distanceMi = parseDistanceMi(shipmentDetails?.stopsData?.summary?.distance)
  // Real benchmark: highest cost among the shipment's routed options (the
  // domain-correct definition — LiveBids' own "highest submitted bid"
  // fallback is wrong and must not be relied on here). No `ratePerMile`
  // field exists anywhere in the data model (shipmentDetails, routingData,
  // or master-data) — only `distanceMi` is real, sourced from
  // stopsData.summary.distance; ratePerMile is left undefined rather than
  // invented, per the plan's instruction.
  const benchmarkValue = useMemo(
    () => computeBenchmark(shipmentDetails?.routingData?.options ?? [], { distanceMi }),
    [shipmentDetails, distanceMi],
  )

  const handleSendRFQ = useCallback((payload) => {
    saveDraft(payload)
    sendRFQ(Date.now())
    scheduleSimulatedBids(payload, benchmarkValue, submitBid, timersRef)
  }, [saveDraft, sendRFQ, submitBid, benchmarkValue])

  const rfqLinksVisible =
    quote?.status === 'open' && (quote.carriers ?? []).some((c) => c.token)

  // spotStore has no closed -> draft transition (verified) — "Modify &
  // Resend" is clearQuote() + a fresh saveDraft() reseeded from the previous
  // quote's list/carriers, with bids stripped so it starts a clean auction.
  const handleModify = useCallback(() => {
    const prev = quote
    clearQuote()
    if (!prev) return
    saveDraft({
      listId: prev.listId,
      listName: prev.listName,
      durationMin: prev.durationMin,
      carriers: (prev.carriers ?? []).map(({ bid, ...c }) => c),
      flexiblePickup: prev.flexiblePickup,
    })
  }, [quote, clearQuote, saveDraft])

  const handleAward = useCallback((scac, awardType = 'manual') => {
    if (!quote) return
    const carrier = quote.carriers.find((c) => c.scac === scac)
    if (!carrier) return
    const option = buildSpotRateOption(
      carrier,
      quote,
      shipmentDetails?.routingData?.options ?? [],
      DEFAULT_MARKUP,
    )
    saveTenderOption(shipment.sellShipment, option)
    award(scac, awardType)
  }, [quote, shipmentDetails, shipment, award])

  if (!eligible) {
    return (
      <EmptyState
        icon={<TriangleAlert size={32} />}
        message={eligibilityReason(shipmentDetails?.routingData)}
      />
    )
  }

  return (
    <div className="pane-canvas spot-board-tab">
      <div className="pane-tabs-band">
        <div className="pane-band-inner pane-band-inner--wide">
          <div className="tab-group">
            {SUB_TABS.map((tab) => (
              <Tab
                key={tab.key}
                label={tab.label}
                current={subTab === tab.key}
                onClick={() => setSubTab(tab.key)}
              />
            ))}
          </div>
        </div>
      </div>

      {subTab === 'setup' && (
        <SpotSummaryStrip aria-label="Shipment summary" items={stripItems} />
      )}

      {rfqLinksVisible && (
        <div className="pane-col pane-col--wide">
          <RfqLinksPanel
            shipmentId={shipment?.sellShipment}
            carriers={quote.carriers}
          />
        </div>
      )}

      <div className="pane-col pane-col--wide">
        {subTab === 'setup' ? (
          <SetupCarriers
            quote={quote}
            carrierOptions={carrierOptions}
            onTermsChange={setTerms}
            // Kathleen's workflow (2026-08-07), node 1: the Spot Quote tab
            // opens with "Dates/transit + eligible carriers auto-filled".
            // Seeded from the ORDER's scheduled dates — the same values the
            // legacy overflow screen shows against every carrier.
            //
            // LATEST, not earliest (user ruling 2026-08-19, replacing the
            // "unratified" earliest pick that stood here). The order guarantees
            // exactly ONE late date and which one depends on the Planning Date
            // Type anchor — Ship Date → Late Pickup mandatory, Delivery Date →
            // Late Delivery mandatory (LINX-7586/7587/7822; PRD 2365915159's
            // "one of Late Pickup or Late Delivery must be present";
            // vault/10-domains/orders/domain-analysis.md §86). Earliest is
            // optional on BOTH sides, so it is the one value that can be
            // absent — defaulting off it was defaulting off a nullable field.
            // `dateOnly` drops the time component: time is not supported on the
            // quote (Kathleen, written answer #5, 2026-08-19).
            defaultPickup={dateOnly(shipmentDetails?.orderDetails?.[0]?.latestPickup)}
            defaultDelivery={dateOnly(shipmentDetails?.orderDetails?.[0]?.latestDelivery)}
            readOnly={quote?.status === 'open' || quote?.status === 'closed' || quote?.status === 'awarded'}
            onSaveDraft={saveDraft}
            onSendRFQ={handleSendRFQ}
            onCancel={clearQuote}
          />
        ) : quote ? (
          <LiveBids
            quote={quote}
            benchmark={benchmarkValue}
            onForceClose={() => closeQuote(Date.now())}
            onAward={handleAward}
            onModify={handleModify}
            onClear={clearQuote}
          />
        ) : (
          <EmptyState
            icon={<TriangleAlert size={32} />}
            message="No active quote yet — send an RFQ from Setup & Carriers."
          />
        )}
      </div>
    </div>
  )
}
