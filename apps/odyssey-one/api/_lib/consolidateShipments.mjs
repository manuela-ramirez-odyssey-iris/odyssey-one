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
import {
  OC_OUTCOMES, adoptNewTenderList, computeListAggregates, idOf, lineageNode, listCarrierFor, mergeStops, rowFromStops, tenderHistoryEntry,
} from './shipments.mjs'
import { applyStopDates } from '../../src/lib/orderChangeRouting.js'

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

// DEC-234 (Dave + user R1, 2026-10-01) — a stop's date/time may not be earlier
// than ANY stop above it, whatever the stop type. Both shapes a stop date
// arrives in ('June 7, 2026 20:00 CDT' / '06/07/2026 20:00 CDT') compare as
// instants via the zone abbreviation (unknown zone = UTC), exactly as the
// editor's stopsSandbox.js parseStamp/stampValue do. ponytail: a server copy on
// purpose — the API imports no editor module; the two must move together.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export function stopInstant(str) {
  let m = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?:\s+([A-Z]{2,4}))?/.exec(String(str ?? ''))
  let p = m && [+m[3], +m[1] - 1, +m[2], +m[4], +m[5], m[6]]
  if (!p) {
    m = /^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})(?:\s+([A-Z]{2,4}))?/.exec(String(str ?? ''))
    if (!m || !MONTHS.includes(m[1])) return null
    p = [+m[3], MONTHS.indexOf(m[1]), +m[2], +m[4], +m[5], m[6]]
  }
  return Date.UTC(p[0], p[1], p[2], p[3], p[4]) - parseInt(TZ_OFFSETS[p[5]] ?? '0', 10) * 3_600_000
}

// The first stop (in stopSequence order) dated before the latest dated stop
// above it, or null. Undated stops are skipped (C16 blocks them); equal is fine.
export function stopDateViolation(stops) {
  let latest = null
  for (const s of [...stops].sort((a, b) => a.stopSequence - b.stopSequence)) {
    const at = stopInstant(s.scheduledDateTime)
    if (at == null) continue
    if (latest != null && at < latest) return s
    if (latest == null || at > latest) latest = at
  }
  return null
}
export const DATES_OUT_OF_SEQUENCE = 'Stop dates are out of sequence.'

// LINX-15873 / CNS-23 — a C's tender counts as active only when it was SENT
// (useApproveOrderChange hasActivePriorTender; To Be Tendered sent nothing).
// Read off the options, which the live handler overlays from the tenders table.
const KEEPABLE_TENDER = ['Sent', 'Accepted']
const activeTenderOf = (detail) => (detail?.shippingOptionList ?? []).find((o) => KEEPABLE_TENDER.includes(o.status)) ?? null

const bad = (message) => Object.assign(new Error(message), { status: 400 })

// The guards every caller of a consolidation goes through (S7.2): the live
// handler and the mock service both call this before building. Order matters
// only for which message wins. `externalOrders` is the body's records, used to
// tell a placed external order from an unplaced one (C8, as save-stops does).
// `externalRows` are the grid rows of the shipments those orders come from
// (the body carries only their sell ids); needed only to spot a C among them.
// `tenderDecision` (LINX-15873 D1) is the planner's answer to Active Tender on
// a C edit: 'keep' | 'cancel' | null.
/** @param {{ sources: { row: object, detail: object }[], stops: object[], externalOrders?: { orderNumber: string, sourceSellShipment?: string }[], externalRows?: { sellShipment: string, odysseyShipmentIdentifier?: string }[], tenderDecision?: 'keep'|'cancel'|null }} a */
export function checkConsolidation({ sources, stops, externalOrders = [], externalRows = [], tenderDecision = null }) {
  const rows = sources.map((s) => s.row)
  const isC = (r) => String(r.odysseyShipmentIdentifier).startsWith('C')
  // LINX-15873 D2 — Edit Shipment Stops opens ANY C (CNS-23), filed wherever
  // its tender put it; Directs still must come from the pool (CNS-18).
  const editingC = rows.length === 1 && isC(rows[0])
  const notPool = editingC ? [] : rows.filter((r) => r.category !== 'consolidation').map((r) => r.sellShipment)
  if (notPool.length) throw bad(`Only shipments in Consolidation can be consolidated: ${notPool.join(', ')}`)
  // One customer per consolidation (CNS-10) — the client is not a trust boundary.
  const customers = new Set(rows.map((r) => r.customerId))
  if (customers.size > 1) throw bad(`A consolidation cannot span customers: ${[...customers].join(', ')}`)
  // At most one C per consolidation (S164 ruling, CNS-14/CNS-09): a C keeps its
  // id through every edit, so a second C would be a "C merged from C".
  // An order pulled off ANY other C is refused too, with or without a C source:
  // emptied, that C would become a hidden source of this one (Add Orders blocks
  // it in the UI; the client is not a trust boundary).
  const fromC = new Set(externalRows.filter(isC).map((r) => r.sellShipment))
  const cCount = rows.filter(isC).length
  if (cCount > 1) throw bad('A consolidation can include only one consolidated (C) shipment.')
  // LINX-15873 D2 — the button is greyed out while an order change is open
  // (AC), and the C's tender question must have been answered (Jana grooming).
  const cSources = sources.filter((s) => isC(s.row))
  if (cSources.some((s) => s.detail?.orderChange && !s.detail.orderChange.resolution)) throw bad('Resolve the open order change before editing stops.')
  if (!tenderDecision && cSources.some((s) => activeTenderOf(s.detail))) throw bad('Choose whether to keep the active tender.')
  if (externalOrders.some((e) => fromC.has(String(e.sourceSellShipment)))) throw bad("Orders on another consolidated (C) shipment can't be added to this consolidation.")
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
  if (stopDateViolation(stops)) throw bad(DATES_OUT_OF_SEQUENCE) // DEC-234 backstop (A5)
}

/**
 * @param {object} a
 * @param {{ row: object, detail: object }[]} a.sources  grid rows + raw SellShipmentOut, in the planner's selection order (1..n; a C being edited is 1)
 * @param {object[]} a.stops  the editor's StopDto[] (stopsSandbox toDto): a stop copies its full fields from the source stop at (sourceSellShipment, sourceStopSequence); a created stop (both null) keeps its DTO fields (C9)
 * @param {object[]} [a.externals]  order records pulled from other shipments (shipments.mjs pullExternalOrders)
 * @param {{ sellShipment?: string, row?: object, detail: object }[]} [a.externalSources]  the shipments those records came from; one emptied by the move becomes a hidden lineage node (S164 §1)
 * @param {{ orderNumber: string, sourceSellShipment: string }[]} [a.externalOrders]  the body's pulls (which orders left which source)
 * @param {object[]} [a.tenderList]  the evaluated carrier options, DTO-shaped (S7.7)
 * @param {'keep'|'cancel'|null} [a.tenderDecision]  a C edit's answer to Active Tender (LINX-15873 D3)
 * @param {number} a.seq   consolidation sequence (drives the C…/sell/buy ids)
 * @param {Date}   a.now   creation instant (history timestamps)
 * @returns {{ row: object, detail: object, pickupTs: string|null, deliveryTs: string|null, removedSellShipments: string[], splitOrders: { source: object, orderRec: object }[] }}
 */
export function buildConsolidatedShipment({ sources, stops: dto, externals = [], externalSources = [], externalOrders = [], tenderList = [], tenderDecision = null, seq, now = new Date() }) {
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
  // is refused by checkConsolidation (S164); the mint branch stays for direct callers.
  const existing = rows.filter(isC)
  const ids = existing.length === 1
    ? {
      odysseyShipmentIdentifier: existing[0].odysseyShipmentIdentifier,
      sellShipment: existing[0].sellShipment,
      buyShipment: existing[0].buyShipment,
    }
    : idsForConsolidation(seq)

  // LINX-15873 D3 / CNS-23 — the id-reused C's tender. `keep` files it as
  // order change's retender does (Sent, Monitoring › Sent) on the kept carrier;
  // `cancel` and null are today's filing (pool/Hold, untendered).
  const cDetail = existing.length === 1 ? details[rows.indexOf(existing[0])] : null
  const active = tenderDecision ? activeTenderOf(cDetail) : null
  const keep = tenderDecision === 'keep' && active

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
  const filing = keep ? OC_OUTCOMES.retender() : { tenderStatus: '', panel: 'monitoring', category }

  // S7.7 / CNS-16: the evaluated list, every option untendered — no status and
  // no notify/response fields, so the Tender tab lists them as never sent.
  const untendered = ({ notifyDateTime, responseMethod, responseDateTime, responseUser, responseComments, declineReason, tenderToken, ...o }) => ({ ...o, status: '' })
  let shippingOptionList = tenderList.map(untendered)
  let carrier = { scac: null, apFreightCost: '' }
  if (keep) {
    // `keep` (D3): the kept carrier's row is 'Sent', inserted through order
    // change's prior-carrier insert when routing dropped it (LINX-14513
    // Scenario 2) and then dated from the new stops, as resolveOrderChange
    // dates its inserted prior.
    const stopDates = shipmentStopList.map((s) => ({ type: s.stopType, date: s.scheduledDateTime, timeZone: s.timeZone }))
    const oc = { prior: { scac: active.scac }, newTenderList: shippingOptionList, priorTenderList: applyStopDates([untendered(active)], stopDates) }
    shippingOptionList = adoptNewTenderList('retender', oc, null, filing)
    carrier = listCarrierFor('retender', shippingOptionList, oc)
  }

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
    scac: carrier.scac,
    tenderStatus: filing.tenderStatus,    // a consolidation is born untendered (Dave, 2026-09-17); a kept C edit is Sent
    shipmentStatus: shipmentStatusFor(filing), // DEC-204
    panel: filing.panel,
    category: filing.category,
    validationMessage: null,
    grossWeight: agg.grossWeight,
    // ponytail: `load` is not in ROW_COLUMNS, so consolidate mode's grid rows
    // never carry it — both runtimes re-read the sources before building,
    // which is where these come from.
    load: consumed.map((s) => s.row.load).filter(Boolean).join(','),
    loadCount: agg.loadCount,
    orderCount: String(orderList.length),
    apFreightCost: carrier.apFreightCost ?? '', // not rated, unless a kept carrier carries its cost
  }

  // S164 §1 — one hidden node per consumed source (an id-reused C is the
  // result, not a source: its own lineage carries over), plus any external
  // contributor the move emptied. A partial contributor that stays live is
  // not a source — the order's own trail covers that move.
  const carried = existing.length === 1 ? (details[rows.indexOf(existing[0])].lineage?.sources ?? []) : []
  const emptiedExternals = externalSources.filter((src) => {
    const moved = new Set(externalOrders.filter((e) => e.sourceSellShipment === (src.sellShipment ?? src.row?.sellShipment)).map((e) => e.orderNumber))
    const held = (src.detail?.orderList ?? []).map(idOf)
    return held.length > 0 && held.every((id) => moved.has(id))
  })
  const lineageSources = [
    ...carried,
    ...consumed.filter((s) => s.row.sellShipment !== ids.sellShipment).map((s) => lineageNode(s, true)),
    ...emptiedExternals.map((s) => lineageNode(s, true)),
  ]

  const t0 = new Date(now)
  const t1 = new Date(t0.getTime() + 30_000)
  const author = { name: 'OdysseyONE', kind: 'system' }
  const sourceNames = consumed.map((s) => s.row.odysseyShipmentIdentifier || s.row.sellShipment).join(', ')
  // LINX-15873 D4 — editing one C is not a creation: its own history carries
  // over plus ONE 'Shipment Stops Edited' entry (the lineage carries above).
  const historyList = sources.length === 1 && existing.length === 1
    ? [...(cDetail.historyList ?? []),
      { user: 'OdysseyONE', source: 'OdysseyONE', timestamp: t0.toISOString(), action: 'Shipment Stops Edited', category: 'update', outcome: 'update', author,
        details: keep ? `Shipment stops edited. Updated shipment sent to ${active.scac}.` : 'Shipment stops edited.' }]
    : [
      { user: 'OdysseyONE', source: 'OdysseyONE', timestamp: t0.toISOString(), action: 'Shipment Created', category: 'create', outcome: 'update', author,
        details: `Buy Shipment ${ids.buyShipment} and Sell Shipment ${ids.sellShipment} created successfully.` },
      { user: 'OdysseyONE', source: 'OdysseyONE', timestamp: t1.toISOString(), action: 'Manual Consolidation', category: 'update', outcome: 'update', author,
        details: `Consolidated from ${sourceNames}.` }, // DEC-87 outcome contract
    ]
  // D3 `cancel` — recorded as the Tender tab's Cancel records it (saveTender's
  // tenderHistoryEntry). The list above is all-blank, so no tender stays active
  // (LINX-15899: at most one active). ponytail: authored by the system, as every
  // entry here; the builder has no planner identity to put on it.
  if (tenderDecision === 'cancel' && active) {
    historyList.push(tenderHistoryEntry({ action: 'Cancel', option: { ...active, status: 'Cancelled' }, prevStatus: active.status, author, comm: 'Success', now: t1 }))
  }

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
    ...(lineageSources.length ? { lineage: { sources: lineageSources } } : {}),
    historyList,
  }

  return {
    row,
    detail,
    pickupTs: lane.pickupTs ?? null,
    deliveryTs: lane.deliveryTs ?? null,
    removedSellShipments: consumed.map((s) => s.row.sellShipment),
    // sourceHidden (S164 §2): a C source empties unless it is the id-reused result.
    splitOrders: splitOrders.map((p) => ({ ...p, sourceHidden: p.source.row.sellShipment !== ids.sellShipment })),
  }
}
