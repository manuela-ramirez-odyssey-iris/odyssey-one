/**
 * LINX-13954 — Process SCAC, the pure core.
 *
 * Every branch this feature can take is decided here so RoutingGuideTab holds
 * only dialogs and state. All of it is testable without a DOM.
 *
 * ⚠️ ROUTING AND RATING ARE SIMULATED. This prototype has no routing or rating
 * service. The outcome is derived deterministically from the drop code routing
 * already gave us, so a demo is repeatable and every branch is reachable.
 * Replace `routingReturnsDates` with the real call when one exists — nothing
 * else in this file needs to change.
 */

const DASH = '--'

// Routing could not compute dates for exactly the carriers it told us it could
// not compute transit for. Any other drop reason is a rate or policy problem,
// which does not stop date calculation.
const DROP_CODE_MISSING_TRANSIT_TIME = '23'

/**
 * PS3 (ours, not the ticket's) — a carrier added through the ProcessScacBar
 * picker has no `dropCode` at all, so without this list `routingReturnsDates`
 * below would always see a non-'23' code and always succeed: 15076's
 * failure branch and 15077's failed-routing indicator would be unreachable
 * on screen. Deterministic and repeatable so a demo always shows both paths.
 * One line to delete once real routing exists for the picker doorway.
 */
export const ROUTING_FAILS = ['EXLA']

/** Crosses JSON as a number from the generator and a string from the VM. */
const code = (c) => String(c?.dropCode ?? '')

// Exported (S136) — RoutingGuideTab and DroppedCarrierSection both need to ask
// "is this scac+equipment in the tender list", so the key format lives here
// once rather than drifting between two files.
export const tenderKey = (scac, equipment) =>
  `${String(scac ?? '').toUpperCase()}|${String(equipment ?? '').toUpperCase()}`

/** Every scac+equipment pair currently in the tender list, as a Set of keys. */
export function tenderKeySet(tenderOptions = []) {
  return new Set(tenderOptions.map((o) => tenderKey(o.scac, o.equipment)))
}

/**
 * AC: "validate whether the same SCAC and Equipment combination already exists
 * within the Tender List." Both, together — the same carrier on different
 * equipment is a legitimate second option.
 *
 * Load-bearing, not defensive: the action COPIES rather than moves, so the
 * dropped row survives its own success and WILL be pressed again.
 */
export function isDuplicate(carrier, tenderOptions = []) {
  return tenderKeySet(tenderOptions).has(tenderKey(carrier?.scac, carrier?.equipment))
}

// S136 — the tint `getRowBg` (RoutingGuideTab.jsx) falls back to for a
// highlighted row with no tender status yet — exactly the shape every
// freshly-processed carrier lands in (`droppedCarrierToOption` always sets
// `status: null`). Shared here so DroppedCarrierSection's "already added"
// button tint, and the action-lane's background + truck icon color for that
// same highlighted row, all reuse the SAME pair instead of hardcoding it
// three times. Same blue STATUS_STYLES already uses for 'Sent' — a highlighted
// no-status row reads as "just added", not a fourth, invented color.
export const PROCESSED_HIGHLIGHT_BG = 'var(--badge-blue-bg)'
export const PROCESSED_HIGHLIGHT_TEXT = 'var(--badge-blue-text)'

/** SIMULATED — see the file header. */
function routingReturnsDates(carrier) {
  return code(carrier) !== DROP_CODE_MISSING_TRANSIT_TIME
}

/**
 * True only for the picker doorway: a dropped carrier ALWAYS carries a
 * `dropCode` (routing put it there), so this only fires for a carrier the
 * user picked directly. PS3 — see ROUTING_FAILS above.
 */
function isManualRoutingFailure(carrier) {
  return carrier?.dropCode == null && ROUTING_FAILS.includes(String(carrier?.scac ?? '').toUpperCase())
}

/**
 * The ordered steps for one Process SCAC press. The component walks this list;
 * it does not decide anything itself.
 *
 * Order is the AC's, not ours:
 *   • the duplicate check runs "before processing the carrier", so it precedes
 *     the routing call and short-circuits everything
 *   • the whole rating block is nested INSIDE routing-failure
 *   • "Add carrier to list" sits at the END of the failure branch
 *   • the "Routing completed successfully" message belongs to Routing Success
 *     only — there is deliberately no 'success' step on the failure path
 *
 * The picker doorway (LINX-15076) is a THIRD branch, not a reuse of the
 * dropped-carrier failure branch: no ManualDatesModal, no rating call — one
 * step, 'routing-failed', that means "insert the row with blanks and show
 * the failure message." Keeping it distinct from 'manual-dates'/
 * 'rating-failed' is deliberate — see the spec's "Failure paths" section.
 */
export function planProcessScac(carrier, tenderOptions = []) {
  if (isDuplicate(carrier, tenderOptions)) return ['duplicate']
  if (isManualRoutingFailure(carrier)) return ['routing-failed']
  if (routingReturnsDates(carrier)) return ['copy', 'success']
  // Rating runs only here (follow the ticket: failure branch only), and always
  // fails: we hold no rate data for a dropped carrier, so "no rate available"
  // is the truthful outcome rather than a coin flip.
  return ['manual-dates', 'rating-failed', 'copy']
}

/**
 * Append only. The write endpoint addresses rows `WHERE rank = $8`
 * (api/_lib/shipments.mjs), so shifting an existing row would overwrite
 * whichever row currently holds the destination rank. MAX rather than length
 * because ranks can have gaps.
 *
 * Un-exported (S136): `RoutingGuideTab.jsx` called this directly until both
 * doorways swapped to `insertRank` below (LINX-15075, supersedes plan
 * decision D3) — it now survives only as `insertRank`'s own no-match/empty
 * fallback, so it dropped its export and its dedicated test block with it.
 */
function nextRank(tenderOptions = []) {
  return tenderOptions.reduce((max, o) => Math.max(max, Number(o.rank) || 0), 0) + 1
}

/**
 * LINX-15075 — group-aware rank insertion; supersedes plan decision D3 (see
 * docs/superpowers/specs/2026-08-31-process-scac-picker-design.md, "Rank
 * insertion"). Swapped in at BOTH call sites in `RoutingGuideTab.jsx`
 * (they share one function, `runProcessScac`) — one insertion rule, not a
 * second rank function that drifts.
 *
 * "Matching equipment group" = the contiguous run of rows, in rank order,
 * sharing the new carrier's equipment (compared case-insensitively — a code,
 * not free text, same as `isDuplicate`). The new row lands at the BOTTOM of
 * that run: everything above keeps its rank, the new row takes the rank the
 * next row down used to hold, and that row plus everything below it shifts
 * +1. No match → bottom of the whole list, same as `nextRank`.
 *
 * PS1 (ours): equipment can appear in more than one run once dropped carriers
 * and manual adds interleave (e.g. TL, LTL, TL). We take the LAST matching
 * run — the new row belongs at the true bottom of the list for that
 * equipment, not wedged mid-list above a later occurrence of the same value.
 *
 * `shifts` is ordered highest `from` first. This is load-bearing, not
 * cosmetic: the write endpoint is addressed `WHERE rank = $8`
 * (`api/_lib/shipments.mjs`), so a destination rank must be vacated before
 * something is written into it, or the write clobbers the current occupant.
 */
export function insertRank(equipment, tenderOptions = []) {
  if (tenderOptions.length === 0) return { rank: 1, shifts: [] }

  const target = String(equipment ?? '').toUpperCase()
  const sorted = [...tenderOptions].sort((a, b) => Number(a.rank) - Number(b.rank))
  const equipAt = (i) => String(sorted[i].equipment ?? '').toUpperCase()

  // Single pass, tracking the END index of the last contiguous run whose
  // equipment matches. A run breaks wherever equipment changes.
  let lastMatchEnd = -1
  let runStart = 0
  for (let i = 1; i <= sorted.length; i++) {
    if (i === sorted.length || equipAt(i) !== equipAt(runStart)) {
      if (equipAt(runStart) === target) lastMatchEnd = i - 1
      runStart = i
    }
  }

  if (lastMatchEnd === -1) return { rank: nextRank(sorted), shifts: [] }

  const after = sorted.slice(lastMatchEnd + 1)
  if (after.length === 0) return { rank: Number(sorted[lastMatchEnd].rank) + 1, shifts: [] }

  return {
    rank: Number(after[0].rank),
    shifts: after.map((o) => ({ from: Number(o.rank), to: Number(o.rank) + 1 })).reverse(),
  }
}

/**
 * The dates the SIMULATED routing call comes back with on the success branch.
 *
 * The AC defines Routing Success as "(Pickup and Delivery date available)" and
 * then says "Routing results shall be refreshed for the carrier copied" — so a
 * carrier we announce "Routing completed successfully." for must NOT land with
 * empty dates. That is a different rule from the Dropped Carrier row's own
 * dashes: those are what routing sent when it EXCLUDED the carrier (13953);
 * these are what a fresh routing call returns when it accepts it (13954).
 *
 * Taken from the lane's existing tender options rather than invented. Every
 * option on this shipment is the same origin/destination pair, so their pickup
 * and delivery window is the coherent answer — a fabricated date could
 * contradict the shipment it sits on. Returns null when there is nothing to
 * copy from (a shipment with no other options), and the row then legitimately
 * shows '--' because we have no basis for anything else.
 */
export function simulatedRoutingDates(tenderOptions = []) {
  const donor = tenderOptions.find((o) => o.pickupDateTime && o.deliveryDateTime)
  if (!donor) return null
  return { pickupDateTime: donor.pickupDateTime, deliveryDateTime: donor.deliveryDateTime }
}

/**
 * Build the Tender List row from the dropped carrier.
 *
 * Shaped as a RoutingOptionVM, because RoutingGuideTab's `options` state is
 * VM-shaped and `persistTender` runs it back through `routingOptionVmToDto`
 * on the way out.
 *
 * Route Rank and RPC-ID are CARRIED, per the AC — which on today's data means
 * both arrive blank, since routing returns neither for a dropped carrier. That
 * matches what the AC's own "from scratch" branch prescribes, and it starts
 * carrying real values for free if routing ever widens.
 */
export function droppedCarrierToOption(carrier, { rank, dates } = {}) {
  return {
    rank,
    routeRank: carrier.routeRank ?? DASH,
    scac: carrier.scac,
    carrierName: carrier.carrierName,
    equipment: carrier.equipment,
    // Nothing rated this carrier. Zeroes rather than nulls because the Cost
    // column formats numbers and `rateDetails` is read unconditionally.
    rate: DASH,
    cost: DASH,
    rateDetails: { baseRate: 0, currency: 'USD', markup: 0, additionalCharges: [], apTotal: 0, arTotal: 0 },
    // Untendered. Must NOT arrive with a quoteFlag — the point of landing here
    // is that the user MAY add a quote (LINX-13896).
    status: null,
    pickupDateTime: dates?.pickupDateTime ?? (carrier.pickup !== DASH ? carrier.pickup : null),
    pickupTZ: '',
    pickupOrgHours: DASH,
    pickupOrgDay: '',
    deliveryDateTime: dates?.deliveryDateTime ?? (carrier.delivery !== DASH ? carrier.delivery : null),
    deliveryTZ: '',
    deliveryOrgHours: DASH,
    transit: carrier.transitTime ?? DASH,
    distance: DASH,
    sl: DASH,
    linehaul: DASH,
    routeGroup: carrier.routeGroup ?? DASH,
    api: DASH,
    notifyDateTime: DASH,
    responseMethod: DASH,
    responseDateTime: DASH,
    carrierPickup: DASH,
    deliveryNum: DASH,
    transitTimeSource: carrier.transitSource ?? DASH,
    description: DASH,
    responseUser: null,
    carrierQuoted: 'No',
    networkLeverage: DASH,
    proNumber: null,
    transportingCarrier: DASH,
    equipNumber: DASH,
    commitment: null,
    uom: null,
    vcEquipNumber: null,
    vcOpen: null,
    vcAccept: null,
    vcDecline: null,
    carrierApiTenderId: null,
    breakPoint: DASH,
    rateSource: DASH,
    distanceSource: DASH,
    transitTimeId: DASH,
    loadboardExpiry: DASH,
    // AC: "Use the RPC-ID from the dropped carrier list." The dropped-carrier
    // field is spelled `rpcId` (DroppedCarrierVM); the tender field it lands
    // in is spelled `rcpId` (RoutingOptionVM) — an existing naming
    // inconsistency between the two VMs, not introduced here.
    rcpId: carrier.rpcId ?? DASH,
    lcePkId: null,
    modifyUser: DASH,
    modifyDate: DASH,
    indirectPoint: DASH,
    roundTrip: DASH,
    customerPreferred: DASH,
    orderEquip: DASH,
    contactExped: DASH,
    note: DASH,
  }
}
