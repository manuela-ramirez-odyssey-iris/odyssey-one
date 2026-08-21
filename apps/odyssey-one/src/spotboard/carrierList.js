// SpotBoard overflow carrier list — derived PER SHIPMENT (S128) from the
// route guide (shipmentDetails.routingData.options) + dropped carriers
// (shipmentDetails.droppedCarriers), plus deterministic overflow additions
// from the master carrier pool (getLookupOptions('carrier', '')).
//
// User's ruling (verbatim intent, 2026-08-21): "Carriers that are in the
// overflow list and were part of the route guide and declined or did not
// respond to their previous tender offer will by default be unselected...
// is very unlikely we have the same amount of TL and LTL carriers in that
// list and is the same for every shipment — that is why I told you to wire
// to DB so everything there makes sense like in reality." This replaces the
// old NAMED_LISTS/buildCarrierRows static-fixture scheme (identical 7+7
// SCACs on every shipment) entirely.

// Flag IDENTITY strings drive logic — only 'Routed' gates a row's default
// `incl`. Everything else in a row's `flags` array is DISPLAY ONLY (the WHY
// behind Routed: 'Declined' | 'No Response' | a dropped-carrier reason like
// 'Missing Transit Time'). FLAG_LABELS is the override point for display
// text without touching the identity string a flag is matched on — every
// identity string here already reads fine standalone, so it starts empty.
export const FLAG_LABELS = {}

function reasonForStatus(status) {
  if (status === 'Declined') return 'Declined'
  if (status === 'Cancelled') return 'Cancelled'
  return 'No Response'
}

// ponytail: a tiny string hash stands in for the real OCM carrier-list
// membership profile (which would define per-shipment overflow membership
// server-side) — deterministic per shipment+SCAC so composition varies
// ACROSS shipments (the user's "very unlikely we have the same amount"
// ruling) but replays identically for the SAME shipment on every reload.
// Keeps roughly 2/3 of eligible candidates. Upgrade to a fetched OCM list
// when that service exists.
function hashKeep(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return Math.abs(h) % 3 !== 0
}

// Mode classifies a carrier TL vs LTL. Prefers the master pool's own
// `meta.mode` (getLookupOptions('carrier') → lookupService.ts, sourced from
// master-data.js CARRIERS); route-guide participants that aren't in the pool
// (routing/dropped carriers are seeded from a separate, smaller pool in
// tools/generate.mjs) fall back to their own equipment code — LTL/LTR/LTH
// all start "LT", every other code (TL, TLR, TT, ...) does not.
function modeFor(equipment, poolEntry) {
  if (poolEntry?.meta?.mode) return poolEntry.meta.mode
  if (equipment && equipment !== '--') return equipment.startsWith('LT') ? 'LTL' : 'TL'
  return 'TL' // ponytail: no pool/equipment signal to classify by — defaults TL
}

function equipmentFor(equipment, mode) {
  if (equipment && equipment !== '--') return equipment
  return mode === 'LTL' ? 'LTL' : 'Van'
}

function poolName(scac, poolByScac) {
  const label = poolByScac.get(scac)?.label
  if (!label) return scac
  const sep = label.indexOf(' - ')
  return sep === -1 ? label : label.slice(sep + 3)
}

function buildRow(scac, name, equipment, incl, flags, listId) {
  return {
    scac,
    name,
    email: `ops@${scac.toLowerCase()}.example.com`,
    equipment,
    incl,
    plannedPickup: '',
    plannedDelivery: '',
    flags,
    listId,
  }
}

// carrierOptions come from the resolved async carrier pool
// (getLookupOptions('carrier', q)) — { value: scac, label: 'SCAC - Name',
// meta: { mode } }. This function stays pure/sync; the caller awaits the fetch.
//
// shipmentId seeds the overflow hash — must be the shipment's own stable id
// (SpotBoardTab's `sid` = shipment.sellShipment), NOT orderDetails[0]
// .orderNumber: pending orders seed orderNumber '' (generator I9), which
// would collapse every such shipment's overflow membership to the same set.
export function buildOverflowRows(shipmentDetails, carrierOptions, shipmentId) {
  const poolByScac = new Map((carrierOptions ?? []).map((opt) => [opt.value, opt]))
  const routeGuideScacs = new Set()
  const routeRows = []

  // Route-guide participants: every carrier the route guide actually
  // considered — sent an option OR was dropped before rating. Declined/
  // no-response/dropped carriers arrive UNSELECTED by default (the user's
  // ruling) but still visible, flagged 'Routed' plus the why.
  for (const o of shipmentDetails?.routingData?.options ?? []) {
    if (!o.scac || o.scac === '--') continue
    routeGuideScacs.add(o.scac)
    const mode = modeFor(o.equipment, poolByScac.get(o.scac))
    const equipment = equipmentFor(o.equipment, mode)
    const name = o.carrierName && o.carrierName !== '--' ? o.carrierName : poolName(o.scac, poolByScac)
    routeRows.push(buildRow(o.scac, name, equipment, false, ['Routed', reasonForStatus(o.status)], mode))
  }

  for (const d of shipmentDetails?.droppedCarriers ?? []) {
    if (!d.scac || d.scac === '--' || routeGuideScacs.has(d.scac)) continue
    routeGuideScacs.add(d.scac)
    const mode = modeFor(d.equipment, poolByScac.get(d.scac))
    const equipment = equipmentFor(d.equipment, mode)
    const name = d.carrierName && d.carrierName !== '--' ? d.carrierName : poolName(d.scac, poolByScac)
    const reason = d.reason && d.reason !== '--' ? d.reason : 'No Response'
    routeRows.push(buildRow(d.scac, name, equipment, false, ['Routed', reason], mode))
  }

  // Overflow additions: master-pool carriers NOT in the route guide, PRE-
  // SELECTED, deterministic membership per shipment (~2/3 of the eligible
  // pool). '(DNU)' entries are QA/master-data noise, never real carriers —
  // excluded outright, not just unselected.
  const seed = String(shipmentId ?? '')
  const overflowRows = []
  for (const opt of carrierOptions ?? []) {
    const scac = opt.value
    if (routeGuideScacs.has(scac)) continue
    if (opt.label.includes('(DNU)')) continue
    if (!hashKeep(`${seed}:${scac}`)) continue
    const mode = opt.meta?.mode === 'LTL' ? 'LTL' : 'TL'
    overflowRows.push(buildRow(scac, poolName(scac, poolByScac), equipmentFor(undefined, mode), true, [], mode))
  }

  // Overflow additions first, route-guide participants last — a table's
  // first row is then a normal preselected carrier rather than always the
  // unselected/flagged one, which reads better and matches the legacy
  // "Maintain Carrier Overflow" screen's own layout (routed carriers listed
  // as the exceptions, not the lead rows).
  return [...overflowRows, ...routeRows]
}
