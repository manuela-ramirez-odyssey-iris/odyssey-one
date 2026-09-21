// apps/odyssey-one/api/_lib/consolidateShipments.mjs — manual consolidation
// takes loads (CNS-01 / DEC-156): N source shipments become ONE consolidated
// shipment carrying every source's orders and stops, and the emptied source
// shells go away.
//
// Pure, and shaped EXACTLY like planShipment.mjs's buildDirectShipment so the
// same `buildInsertShipmentQuery` / `buildSearchIndexQuery` write it — one
// builder, both runtimes (mock: src/api/services/consolidationService.ts;
// live: api/_lib/consolidations.mjs). Like planShipment it is a REPRODUCTION
// of documented behaviour, never the source of a rule.
import { TZ_OFFSETS, modeFor } from './planShipment.mjs'

// Identifier bands, disjoint from the seed (sell 25xxxxxx / odyssey seq
// 50,000,000) and from planShipment (sell 26xxxxxx / odyssey 60,000,000 /
// buy 9xxxxxxxx). `C` = consolidated (CNS-09: the Consolidation ID IS the
// Odyssey Shipment Identifier).
export function idsForConsolidation(seq) {
  return {
    odysseyShipmentIdentifier: `C${70_000_000 + seq}`,
    sellShipment: String(27_000_000 + seq),
    buyShipment: String(910_000_000 + seq),
  }
}

// LINX-11597 vocabulary. NOTE: the spec wrote 'Consolidated'; the enum the
// seed, the grid and ShipmentTable's row menu all use is 'Consolidation'
// (1,245 seeded rows) — a second spelling would fracture the data.
export const CONSOLIDATED_TYPE = 'Consolidation'

// '06/15/2026 08:00 CST' → epoch ms (for earliest/latest picking), or null.
// ponytail: zone-blind — compares the wall clock, not the instant. Every
// consolidatable set is one customer's freight and in practice one zone;
// swap in the offset if a cross-zone set ever mis-orders a stop.
export function parseDisplayDate(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/.exec(String(s ?? ''))
  if (!m) return null
  return Date.UTC(+m[3], +m[1] - 1, +m[2], +(m[4] ?? 0), +(m[5] ?? 0))
}

// '06/15/2026 08:00 CST' → '2026-06-15T08:00:00-06:00' (the timestamptz the
// sort/filter columns read). Derived from the DISPLAY string rather than
// carried on the row so mock and live agree: mock rows have no *_ts at all.
export function tsFromDisplay(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?(?:\s+([A-Z]{3,4}))?/.exec(String(s ?? ''))
  if (!m) return null
  const offset = TZ_OFFSETS[m[6] || 'CST']
  if (!offset) return null
  return `${m[3]}-${m[1]}-${m[2]}T${m[4] ?? '00'}:${m[5] ?? '00'}:00${offset}`
}

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}
const union = (lists) => [...new Set(lists.flat().filter(Boolean))]

/**
 * @param {object} a
 * @param {{ row: object, detail: object }[]} a.sources  grid rows + raw SellShipmentOut, in the planner's selection order
 * @param {number} a.seq   consolidation sequence (drives the C…/sell/buy ids)
 * @param {Date}   a.now   creation instant (history timestamps)
 * @returns {{ row: object, detail: object, pickupTs: string|null, deliveryTs: string|null, removedSellShipments: string[] }}
 */
export function buildConsolidatedShipment({ sources, seq, now = new Date() }) {
  if (!Array.isArray(sources) || sources.length < 2) {
    throw new Error('a consolidation needs at least two source shipments')
  }
  const rows = sources.map((s) => s.row)
  const details = sources.map((s) => s.detail ?? {})
  const anchor = rows[0]

  // Editing a consolidation keeps its Consolidation ID (CNS-09): re-applying
  // with exactly one existing C… source reuses that shipment's three ids, so
  // the planner's consolidation does not get renamed under them. Two C sources
  // is a genuine merge — neither id wins, a new one is minted.
  const existing = rows.filter((r) => r.shipmentType === CONSOLIDATED_TYPE)
  const ids = existing.length === 1
    ? {
      odysseyShipmentIdentifier: existing[0].odysseyShipmentIdentifier,
      sellShipment: existing[0].sellShipment,
      buyShipment: existing[0].buyShipment,
    }
    : idsForConsolidation(seq)

  // Earliest pickup / latest delivery own the lane the grid shows. Ties keep
  // selection order (find/reduce are stable on `<`).
  const byDate = (key, pick) => rows.reduce((best, r) => {
    const t = parseDisplayDate(r[key])
    if (t == null) return best
    const bt = parseDisplayDate(best?.[key])
    return bt == null || pick(t, bt) ? r : best
  }, rows[0])
  const firstPickup = byDate('pickupDate', (a, b) => a < b)
  const lastDelivery = byDate('deliveryDate', (a, b) => a > b)

  const orders = union(rows.map((r) => r.orders ?? []))
  const grossWeight = rows.reduce((s, r) => s + num(r.grossWeight), 0)

  const row = {
    odysseyShipmentIdentifier: ids.odysseyShipmentIdentifier,
    buyShipment: ids.buyShipment,
    sellShipment: ids.sellShipment,
    orders,
    pickupNumbers: union(rows.map((r) => r.pickupNumbers ?? [])),
    poNumbers: union(rows.map((r) => r.poNumbers ?? [])),
    shipmentType: CONSOLIDATED_TYPE,
    planningType: anchor.planningType ?? null,
    legType: null, shipmentSequenceLeg: null, nextShipmentId: null,
    pro: null,                            // no carrier yet
    customerId: anchor.customerId ?? '',
    customerName: anchor.customerName ?? '',
    consignor: firstPickup.consignor ?? '',
    consignee: lastDelivery.consignee ?? '',
    origin: firstPickup.origin ?? '',
    destination: lastDelivery.destination ?? '',
    pickupDate: firstPickup.pickupDate ?? '',
    deliveryDate: lastDelivery.deliveryDate ?? '',
    mode: modeFor(grossWeight),
    equipmentCode: anchor.equipmentCode ?? '',
    equipment: '',                        // equipment NUMBER is assigned by the carrier
    seal: null,
    scac: null,
    tenderStatus: '',                     // a consolidation is born untendered (Dave, 2026-09-17)
    shipmentStatus: '',
    panel: 'monitoring',
    category: 'consolidation',            // born in the optimization pool (DEC-156/157)
    validationMessage: null,
    grossWeight: String(grossWeight),
    // ponytail: `load` is not in ROW_COLUMNS, so the review screen's rows
    // never carry it — both runtimes re-read the sources before building,
    // which is where these come from.
    load: rows.map((r) => r.load).filter(Boolean).join(','),
    loadCount: String(rows.reduce((s, r) => s + num(r.loadCount), 0)),
    orderCount: String(orders.length),
    apFreightCost: '',                    // not rated
  }

  // Stops: every source's pickups in selection order, then every source's
  // deliveries, re-sequenced 1..n. V1 proposes; the planner re-sequences later
  // (Dave 2026-09-17 00:33:20) — same rule src/consolidation/proposal.js draws.
  const stopsOf = (d, type) => (d.shipmentStopList ?? []).filter((s) => s.stopType === type)
  const shipmentStopList = [
    ...details.flatMap((d) => stopsOf(d, 'pickup')),
    ...details.flatMap((d) => stopsOf(d, 'delivery')),
  ].map((s, i) => ({ ...s, stopSequence: i + 1 }))

  const t0 = new Date(now)
  const t1 = new Date(t0.getTime() + 30_000)
  const author = { name: 'OdysseyONE', kind: 'system' }
  const sourceNames = rows.map((r) => r.odysseyShipmentIdentifier || r.sellShipment).join(', ')
  const historyList = [
    { user: 'OdysseyONE', source: 'OdysseyONE', timestamp: t0.toISOString(), action: 'Shipment Created', category: 'create', outcome: 'update', author,
      details: `Buy Shipment ${ids.buyShipment} and Sell Shipment ${ids.sellShipment} created successfully.` },
    { user: 'OdysseyONE', source: 'OdysseyONE', timestamp: t1.toISOString(), action: 'Manual Consolidation', category: 'update', outcome: 'update', author,
      details: `Consolidated from ${sourceNames}.` }, // DEC-87 outcome contract
  ]

  const detail = {
    shipmentId: ids.sellShipment,
    odysseyShipmentIdentifier: ids.odysseyShipmentIdentifier,
    shipmentType: CONSOLIDATED_TYPE,
    customerId: row.customerId,
    customerName: row.customerName,
    shipDirection: details[0].shipDirection ?? '',
    freightTerms: details[0].freightTerms ?? '',
    incotermInfo: null,
    numberOfStops: shipmentStopList.length,
    pgiFlag: false,
    ratingStatus: 'Not Rated',
    trackingUrl: null,                    // only an ACCEPTED tender is trackable (S149)
    distanceMiles: null,
    totalVolumeValue: details.reduce((s, d) => s + num(d.totalVolumeValue), 0),
    totalVolumeUomCode: details[0].totalVolumeUomCode ?? 'cuft',
    acceptedCarrierLabel: null,
    seedEquipment: row.equipmentCode || null,
    utilizationPercent: null,
    costSummary: undefined,               // mapCost tolerates absence → '--'
    orderList: details.flatMap((d) => d.orderList ?? []),
    shipmentStopList,
    shippingOptionList: [],               // no routing yet → Tender tab "No routing options available."
    droppedCarrierList: [],
    documentList: [],
    noteList: [],
    historyList,
  }

  return {
    row,
    detail,
    pickupTs: tsFromDisplay(row.pickupDate),
    deliveryTs: tsFromDisplay(row.deliveryDate),
    removedSellShipments: rows.map((r) => r.sellShipment),
  }
}
