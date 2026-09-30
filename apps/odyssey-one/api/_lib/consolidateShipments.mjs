// apps/odyssey-one/api/_lib/consolidateShipments.mjs — manual consolidation
// takes loads (CNS-01 / DEC-156): N source shipments become ONE consolidated
// shipment carrying the orders and stops the planner left on it; the consumed
// sources (every order moved) go away, a Direct whose order was left pending
// stays in the pool untouched (S7.4).
//
// Pure, and shaped EXACTLY like planShipment.mjs's buildDirectShipment so the
// same `buildInsertShipmentQuery` / `buildSearchIndexQuery` write it — one
// builder, both runtimes (mock: src/api/services/consolidationService.ts;
// live: api/_lib/consolidations.mjs). Like planShipment it is a REPRODUCTION
// of documented behaviour, never the source of a rule.
import { TZ_OFFSETS, modeFor } from './planShipment.mjs'
import { shipmentStatusFor } from '../../src/lib/shipmentStatus.js'
// ponytail: shipments.mjs is the SQL layer and this file is in the client
// bundle (consolidationService.ts), so the mock drags it in. It is pure JS
// (no pg), and mergeStops/computeListAggregates/rowFromStops are the ONE
// implementation of stop + list-column derivation the order-change save
// already trusts. Split them into their own module if the bundle ever matters.
import { computeListAggregates, idOf, mergeStops, rowFromStops } from './shipments.mjs'

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

const bad = (message) => Object.assign(new Error(message), { status: 400 })

// The guards every caller of a consolidation goes through (S7.2): the live
// handler and the mock service both call this before building. Order matters
// only for which message wins. `externalOrders` is the body's records, used to
// tell a placed external order from an unplaced one (C8, as save-stops does).
/** @param {{ sources: { row: object, detail: object }[], stops: object[], externalOrders?: { orderNumber: string }[] }} a */
export function checkConsolidation({ sources, stops, externalOrders = [] }) {
  const rows = sources.map((s) => s.row)
  const notPool = rows.filter((r) => r.category !== 'consolidation').map((r) => r.sellShipment)
  if (notPool.length) throw bad(`Only shipments in Consolidation can be consolidated: ${notPool.join(', ')}`)
  // One customer per consolidation (CNS-10) — the client is not a trust boundary.
  const customers = new Set(rows.map((r) => r.customerId))
  if (customers.size > 1) throw bad(`A consolidation cannot span customers: ${[...customers].join(', ')}`)
  const onStops = new Set(stops.flatMap((s) => s.orderIds ?? []))
  if (onStops.size < 2) throw bad('A consolidation needs at least two orders.') // CNS-14
  const unplaced = externalOrders.map((e) => e.orderNumber).filter((id) => !onStops.has(id))
  if (unplaced.length) throw bad(`externalOrders must all be placed on stops: ${unplaced.join(', ')}`)
  const known = new Set([...sources.flatMap((s) => (s.detail?.orderList ?? []).map(idOf)), ...externalOrders.map((e) => e.orderNumber)])
  const unknown = [...onStops].filter((id) => !known.has(id))
  if (unknown.length) throw bad(`Unknown order(s) on stops: ${unknown.join(', ')}`)
  // LINX-15669 §2 / BR-3: no order's delivery above its pickup. The client
  // refuses the move; this re-checks what arrives on the wire.
  const ordered = [...stops].sort((a, b) => a.stopSequence - b.stopSequence)
  const pickedAt = new Map()
  const delivered = new Set()
  ordered.forEach((s, i) => {
    if (s.stopType === 'pickup') for (const id of s.orderIds ?? []) if (!pickedAt.has(id)) pickedAt.set(id, i)
    if (s.stopType === 'delivery') for (const id of s.orderIds ?? []) delivered.add(id)
  })
  // A delivery whose order has no pickup on any stop is out of order too.
  // ...and so is an order with a pickup but no delivery.
  const outOfOrder = [...onStops].some((id) => !delivered.has(id)) || ordered.some((s, i) => s.stopType === 'delivery' && (s.orderIds ?? []).some((id) => !(pickedAt.get(id) < i)))
  if (outOfOrder) throw bad('Stops are out of order.')
}

/**
 * @param {object} a
 * @param {{ row: object, detail: object }[]} a.sources  grid rows + raw SellShipmentOut, in the planner's selection order (1..n; a C being edited is 1)
 * @param {object[]} a.stops  the editor's StopDto[] (stopsSandbox toDto): a stop copies its full fields from the source stop at (sourceSellShipment, sourceStopSequence); a created stop (both null) keeps its DTO fields (C9)
 * @param {object[]} [a.externals]  order records pulled from other shipments (shipments.mjs pullExternalOrders)
 * @param {object[]} [a.tenderList]  the evaluated carrier options, DTO-shaped (S7.7)
 * @param {number} a.seq   consolidation sequence (drives the C…/sell/buy ids)
 * @param {Date}   a.now   creation instant (history timestamps)
 * @returns {{ row: object, detail: object, pickupTs: string|null, deliveryTs: string|null, removedSellShipments: string[], splitOrders: { source: object, orderRec: object }[] }}
 */
export function buildConsolidatedShipment({ sources, stops: dto, externals = [], tenderList = [], seq, now = new Date() }) {
  if (!Array.isArray(sources) || sources.length < 1) throw new Error('a consolidation needs at least one source shipment')
  const rows = sources.map((s) => s.row)
  const details = sources.map((s) => s.detail ?? {})
  const anchor = rows[0]

  // The orders the C holds: every order on the DTO's stops, from the sources'
  // rosters plus the external records, in that order.
  const onStops = new Set(dto.flatMap((s) => s.orderIds ?? []))
  const orderList = [...new Map(
    [...details.flatMap((d) => d.orderList ?? []), ...externals].map((o) => [idOf(o), o]),
  ).values()].filter((o) => onStops.has(idOf(o)))

  // A source is consumed when every order moved. A Direct whose order was left
  // pending is untouched (stays in the pool); a C source is always rewritten,
  // and each order it lost becomes its own Direct (C3, S7.4).
  const isC = (r) => r.shipmentType === CONSOLIDATED_TYPE
  const consumed = sources.filter((s) => isC(s.row) || ((s.detail?.orderList ?? []).length > 0 && s.detail.orderList.every((o) => onStops.has(idOf(o)))))
  const splitOrders = sources.filter((s) => isC(s.row)).flatMap((source) =>
    (source.detail?.orderList ?? []).filter((o) => !onStops.has(idOf(o))).map((orderRec) => ({ source, orderRec })))

  // Editing a consolidation keeps its Consolidation ID (CNS-09): re-applying
  // with exactly one existing C… source reuses that shipment's three ids, so
  // the planner's consolidation does not get renamed under them. Two C sources
  // is a genuine merge — neither id wins, a new one is minted.
  const existing = rows.filter(isC)
  const ids = existing.length === 1
    ? {
      odysseyShipmentIdentifier: existing[0].odysseyShipmentIdentifier,
      sellShipment: existing[0].sellShipment,
      buyShipment: existing[0].buyShipment,
    }
    : idsForConsolidation(seq)

  // S7.3: the stop's full fields come from the source stop it was built from.
  const bySell = new Map(rows.map((r, i) => [String(r.sellShipment), details[i]]))
  const shipmentStopList = mergeStops({ orderList }, dto, (row) =>
    row.sourceSellShipment != null
      ? bySell.get(String(row.sourceSellShipment))?.shipmentStopList?.find((s) => s.stopSequence === row.sourceStopSequence)
      : undefined)

  const agg = computeListAggregates(orderList)
  const lane = rowFromStops(shipmentStopList) ?? {}
  // R1 ruling: filed like a new O (planShipment.mjs:162) — the pool if every
  // order is consolidatable (a missing flag is Y), else Hold.
  const category = orderList.every((o) => o.consolidatable !== false) ? 'consolidation' : 'hold'

  const row = {
    odysseyShipmentIdentifier: ids.odysseyShipmentIdentifier,
    buyShipment: ids.buyShipment,
    sellShipment: ids.sellShipment,
    orders: orderList.map((o) => o.orderNumber ?? String(o.orderId)),
    pickupNumbers: agg.pickupNumbers,
    poNumbers: agg.poNumbers,
    shipmentType: CONSOLIDATED_TYPE,
    planningType: anchor.planningType ?? null,
    legType: null, shipmentSequenceLeg: null, nextShipmentId: null,
    pro: null,                            // no carrier yet
    customerId: anchor.customerId ?? '',
    customerName: anchor.customerName ?? '',
    consignor: lane.consignor ?? '',
    consignee: lane.consignee ?? '',
    origin: lane.origin ?? '',
    destination: lane.destination ?? '',
    pickupDate: lane.pickupDate ?? '',
    deliveryDate: lane.deliveryDate ?? '',
    mode: modeFor(agg.grossWeight),
    equipmentCode: anchor.equipmentCode ?? '',
    equipment: '',                        // equipment NUMBER is assigned by the carrier
    seal: null,
    scac: null,
    tenderStatus: '',                     // a consolidation is born untendered (Dave, 2026-09-17)
    shipmentStatus: shipmentStatusFor({ panel: 'monitoring', category }), // DEC-204
    panel: 'monitoring',
    category,
    validationMessage: null,
    grossWeight: agg.grossWeight,
    // ponytail: `load` is not in ROW_COLUMNS, so consolidate mode's grid rows
    // never carry it — both runtimes re-read the sources before building,
    // which is where these come from.
    load: consumed.map((s) => s.row.load).filter(Boolean).join(','),
    loadCount: agg.loadCount,
    orderCount: String(orderList.length),
    apFreightCost: '',                    // not rated
  }

  const t0 = new Date(now)
  const t1 = new Date(t0.getTime() + 30_000)
  const author = { name: 'OdysseyONE', kind: 'system' }
  const sourceNames = consumed.map((s) => s.row.odysseyShipmentIdentifier || s.row.sellShipment).join(', ')
  const historyList = [
    { user: 'OdysseyONE', source: 'OdysseyONE', timestamp: t0.toISOString(), action: 'Shipment Created', category: 'create', outcome: 'update', author,
      details: `Buy Shipment ${ids.buyShipment} and Sell Shipment ${ids.sellShipment} created successfully.` },
    { user: 'OdysseyONE', source: 'OdysseyONE', timestamp: t1.toISOString(), action: 'Manual Consolidation', category: 'update', outcome: 'update', author,
      details: `Consolidated from ${sourceNames}.` }, // DEC-87 outcome contract
  ]

  // S7.7 / CNS-16: the evaluated list, every option untendered — no status and
  // no notify/response fields, so the Tender tab lists them as never sent.
  const shippingOptionList = tenderList.map(({ notifyDateTime, responseMethod, responseDateTime, responseUser, responseComments, declineReason, tenderToken, ...o }) => ({ ...o, status: '' }))

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
    totalVolumeValue: orderList.reduce((s, o) => s + (o.volumeValue ?? 0), 0),
    totalVolumeUomCode: details[0].totalVolumeUomCode ?? 'cuft',
    acceptedCarrierLabel: null,
    seedEquipment: row.equipmentCode || null,
    utilizationPercent: null,
    costSummary: undefined,               // mapCost tolerates absence → '--'
    orderList,
    shipmentStopList,
    shippingOptionList,
    droppedCarrierList: [],
    documentList: [],
    noteList: [],
    historyList,
  }

  return {
    row,
    detail,
    pickupTs: lane.pickupTs ?? null,
    deliveryTs: lane.deliveryTs ?? null,
    removedSellShipments: consumed.map((s) => s.row.sellShipment),
    splitOrders,
  }
}
