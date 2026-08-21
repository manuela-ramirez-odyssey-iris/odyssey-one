import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Badge, EmptyState, Tab } from '@odyssey/ui'
import SetupCarriers from '../../spotboard/SetupCarriers.jsx'
import LiveBids from '../../spotboard/LiveBids.jsx'
import RfqLinksPanel from '../../spotboard/RfqLinksPanel.jsx'
import SpotSummaryStrip from '../../spotboard/SpotSummaryStrip.jsx'
import DraftsPanel from '../../spotboard/DraftsPanel.jsx'
import { listDrafts, saveDraftSnapshot, removeDraft, hydrateDrafts } from '../../spotboard/draftStore.js'
import { getApiMode } from '../../api/config'
import { cityState, compactWindow } from '../../spotboard/stripFormat.js'
import { useSpotQuote } from '../../spotboard/useSpotQuote.js'
import { useCountdown } from '../../spotboard/Countdown.jsx'
import { formatRemaining, countdownVariant } from '../fields/DurationPicker.jsx'
import { isSpotEligible, eligibilityReason } from '../../spotboard/eligibility.js'
import { benchmark as computeBenchmark } from '../../spotboard/tolerance.js'
import { buildSpotRateOption } from '../../spotboard/award.js'
import { getLookupOptions } from '../../api/services/lookupService'
import { saveTenderOption } from '../../api/services/shipmentService'

const SUB_TABS = [
  { key: 'setup', label: 'Setup & Carriers' },
  { key: 'bids', label: 'Live Bids' },
  { key: 'drafts', label: 'Drafts' },
]

// ponytail: no markup UI control exists anywhere in SpotBoard V1 (neither
// SetupCarriers nor LiveBids carry a markup field) — award defaults to a flat
// $0 markup, matching QuoteModal's own blank-markup default
// (RoutingGuideTab.jsx:368, numMarkup = Number('') || 0). Add a real control
// (and wire it here) once the design calls for one.
const DEFAULT_MARKUP = { type: 'flat', value: 0 }

// header (origin/destination/equipment/distance/hazmat/pickup window) for the
// sticky SpotSummaryStrip — sourced from the same fields the other panes
// already read off shipmentDetails (StopsTab, ShipmentDetailsModal):
// stopsData.stops[].location/type, stopsData.summary.{distance,seedEquipment},
// orderDetails[].{equipment,hazmat,earliestPickup,latestPickup}.
// Distance/Equipment/Hazmat were dropped 2026-08-20 then RESTORED 2026-08-21
// (user, round 2: "you forgot to add the other summary values to the strip").
// S128 (user, 2026-08-21: "make sure distance cell value is calculated").
// stopsData.summary.distance only resolves off an Accepted/Sent tender
// option (mapSellShipmentOutToDetail.ts currentTenderOption) — on a spot-
// ELIGIBLE shipment there is no such option (eligibility.js blocks
// Accepted/Sent), so it is almost always '--'. Falls back to the first
// routed option carrying a real distance, then the shipment header's own
// distanceMiles (stopsData.summary.headerDistance). This fallback is
// SpotBoard-strip-local only — the Stops tab's own `distance` field/semantics
// (LINX-12067) are untouched.
function isRealDistance(v) {
  return !!v && v !== '--'
}

function stripDistance(shipmentDetails) {
  const summary = shipmentDetails?.stopsData?.summary ?? {}
  if (isRealDistance(summary.distance)) return summary.distance
  const routed = (shipmentDetails?.routingData?.options ?? [])
    .find((o) => isRealDistance(o.distance))
  if (routed) return routed.distance
  return isRealDistance(summary.headerDistance) ? summary.headerDistance : '--'
}

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
    distance: stripDistance(shipmentDetails),
    hazmat: orders.some((o) => o.hazmat === 'Yes') ? 'Yes' : 'No',
    pickupWindow: firstOrder ? `${firstOrder.earliestPickup} - ${firstOrder.latestPickup}` : undefined,
  }
}

// Quote Duration strip cell — ALWAYS present (user, round 2: "duration
// should ... always be visible even if unset"). Once the RFQ is open it
// swaps from a plain "N min" string to a live countdown Badge, reusing
// DurationPicker's own running-state pieces (useCountdown, formatRemaining,
// countdownVariant) rather than a second implementation — this replaces the
// running-state DurationPicker that used to render in SetupCarriers' head
// (the "sudden field" the user flagged; that block is now deleted).
function QuoteDurationCountdown({ closeAt, totalMs }) {
  const remaining = useCountdown(closeAt)
  return <Badge variant={countdownVariant(remaining, totalMs)} statusDot>{formatRemaining(remaining)}</Badge>
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
  // Mirrors the Setup modal's applied duration/flexible (onTermsChange) so
  // the strip's Duration cell can show before an RFQ exists; quote.durationMin
  // wins once a quote is saved (see durationMin below).
  const [terms, setTerms] = useState(null)
  // Forces a SetupCarriers remount ONLY on Restore (see handleRestore) — a
  // key off quote?.quoteId would also remount on the FIRST Save Draft (a
  // fresh quote mints a quoteId too), wiping the planner's just-picked
  // TL/LTL/All pill mode for no reason.
  const [restoreKey, setRestoreKey] = useState(0)
  const timersRef = useRef([])

  const sid = shipment?.sellShipment
  const { quote, saveDraft, sendRFQ, submitBid, closeQuote, award, clearQuote } =
    useSpotQuote(sid)

  // Saved snapshots (Task 9) — separate from the live `quote`, listed fresh
  // whenever the shipment changes (the tab is not remounted on a shipment
  // switch, so this can't rely on useState's lazy initializer alone).
  const [drafts, setDrafts] = useState(() => listDrafts(sid))
  useEffect(() => {
    // live mode: DB is authoritative, hydrate async. mock mode: unchanged
    // synchronous re-list (jsdom suite is always mock — vite.config.js pins
    // VITE_API_MODE — so this branch keeps the existing tests byte-identical).
    if (getApiMode() !== 'live') { setDrafts(listDrafts(sid)); return }
    let cancelled = false
    hydrateDrafts(sid)
      .then((d) => { if (!cancelled) setDrafts(d) })
      .catch(() => {
        // ponytail: swallow — a failed hydrate leaves the existing local
        // drafts list on screen (degraded, not blanked); no retry machinery.
      })
    return () => { cancelled = true }
  }, [sid])

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
  // Sticky shipment-context strip (user, 2026-08-20; round-2 fixes
  // 2026-08-21). Quote Duration is ALWAYS present (unset renders '--' via
  // SummaryStrip's own placeholder — see stripItems below) and swaps to a
  // live countdown Badge once the RFQ is open. Distance/Equipment/Hazmat are
  // back (round 2) — see buildHeader.
  const firstOrder = shipmentDetails?.orderDetails?.[0]
  const durationMin = quote?.durationMin ?? terms?.durationMin ?? null
  const quoteOpen = quote?.status === 'open' && !!quote?.closeAt
  const durationValue = quoteOpen
    ? <QuoteDurationCountdown closeAt={quote.closeAt} totalMs={quote.durationMin * 60_000} />
    : (durationMin != null ? `${durationMin} min` : null)
  const stripItems = [
    { label: 'Quote Duration', value: durationValue },
    { label: 'Origin', value: cityState(header?.origin), full: header?.origin },
    { label: 'Destination', value: cityState(header?.destination), full: header?.destination },
    { label: 'Pickup Window', value: compactWindow(firstOrder?.earliestPickup, firstOrder?.latestPickup), full: header?.pickupWindow },
    { label: 'Distance', value: header?.distance },
    { label: 'Equipment', value: header?.equipment },
    { label: 'Hazmat', value: header?.hazmat },
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
    // "when sent should take us to live bids automatically" (user, Task 7,
    // 2026-08-20) — jump the sub-tab band the moment the RFQ goes out.
    setSubTab('bids')
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

  // Restore replaces whatever quote is live with the snapshot's payload —
  // spotStore.saveDraft refuses over a non-draft quote, hence clearQuote()
  // first (restoreDisabled below keeps this out of reach while a quote is
  // open/awarded). Also drops `terms` — a stale Setup Quote modal draft must
  // not out-live the quote it was drafted against.
  const handleRestore = useCallback((draft) => {
    clearQuote()
    saveDraft(draft.payload)
    setTerms(null)
    setSubTab('setup')
    setRestoreKey((k) => k + 1)
  }, [clearQuote, saveDraft])

  const handleDeleteDraft = useCallback((draft) => {
    removeDraft(sid, draft.id)
    setDrafts(listDrafts(sid))
  }, [sid])

  const restoreDisabled = quote?.status === 'open' || quote?.status === 'awarded'

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

      {subTab === 'setup' ? (
        <div className="pane-col pane-col--wide">
          <SetupCarriers
            // Remounts ONLY on Restore (restoreKey, bumped in handleRestore)
            // so its rows/duration/flexible/mode state re-seed from the
            // just-restored `quote` at mount — the same way it already seeds
            // from a persisted quote on initial load. Save Draft and other
            // quote changes must NOT remount this (they'd wipe the planner's
            // TL/LTL/All pill selection for no reason).
            key={restoreKey}
            quote={quote}
            carrierOptions={carrierOptions}
            // The route guide + dropped carriers the overflow list derives
            // from, per shipment (S128) — buildOverflowRows (carrierList.js).
            shipmentDetails={shipmentDetails}
            // Seeds the overflow hash — the stable per-shipment id, NOT
            // orderDetails[0].orderNumber (pending orders seed that '').
            shipmentId={sid}
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
            onSaveDraft={(payload) => {
              saveDraft(payload)
              saveDraftSnapshot(sid, payload, Date.now())
              setDrafts(listDrafts(sid))
            }}
            onSendRFQ={handleSendRFQ}
          />
        </div>
      ) : subTab === 'drafts' ? (
        <DraftsPanel
          drafts={drafts}
          restoreDisabled={restoreDisabled}
          onRestore={handleRestore}
          onDelete={handleDeleteDraft}
        />
      ) : quote ? (
        // LiveBids is self-contained here (components.css:6227-6228, "full-width
        // bands sit OUTSIDE .pane-col, directly on .pane-canvas") — its quote
        // SummaryStrip renders straight on .pane-canvas like SpotSummaryStrip
        // above, and LiveBids wraps its own SubAccordion in pane-col internally.
        <LiveBids
          quote={quote}
          benchmark={benchmarkValue}
          onForceClose={() => closeQuote(Date.now())}
          onAward={handleAward}
          onModify={handleModify}
          onClear={clearQuote}
        />
      ) : (
        <div className="pane-col pane-col--wide">
          <EmptyState
            icon={<TriangleAlert size={32} />}
            message="No active quote yet — send an RFQ from Setup & Carriers."
          />
        </div>
      )}
    </div>
  )
}
