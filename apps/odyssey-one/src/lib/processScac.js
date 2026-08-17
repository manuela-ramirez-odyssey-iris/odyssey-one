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

/** Crosses JSON as a number from the generator and a string from the VM. */
const code = (c) => String(c?.dropCode ?? '')

const key = (scac, equipment) =>
  `${String(scac ?? '').toUpperCase()}|${String(equipment ?? '').toUpperCase()}`

/**
 * AC: "validate whether the same SCAC and Equipment combination already exists
 * within the Tender List." Both, together — the same carrier on different
 * equipment is a legitimate second option.
 *
 * Load-bearing, not defensive: the action COPIES rather than moves, so the
 * dropped row survives its own success and WILL be pressed again.
 */
export function isDuplicate(carrier, tenderOptions = []) {
  const target = key(carrier?.scac, carrier?.equipment)
  return tenderOptions.some((o) => key(o.scac, o.equipment) === target)
}

/** SIMULATED — see the file header. */
function routingReturnsDates(carrier) {
  return code(carrier) !== DROP_CODE_MISSING_TRANSIT_TIME
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
 */
export function planProcessScac(carrier, tenderOptions = []) {
  if (isDuplicate(carrier, tenderOptions)) return ['duplicate']
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
 */
export function nextRank(tenderOptions = []) {
  return tenderOptions.reduce((max, o) => Math.max(max, Number(o.rank) || 0), 0) + 1
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
