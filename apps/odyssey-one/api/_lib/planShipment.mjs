// apps/odyssey-one/api/_lib/planShipment.mjs — order created → ONE direct shipment.
//
// Dave Schultz (designed the old TMS; highest authority on the shipments
// domain — call 2026-09-17): the moment an order exists, the shipment domain
// creates its load AND a direct shipment holding that load; the shipment is
// then parked in the optimization pool (eligible for consolidation) or Hold
// (not eligible / too early). Nothing tenders on creation and the system never
// auto-re-tenders. This module is that step, pure, shared by the mock service
// (src/api/services/orderService.ts) and the live handler (api/_lib/orders.mjs)
// — same precedent as candidateOrders.mjs, which the client already imports.
//
// It is a REPRODUCTION of documented behaviour, never the source of a rule.
import { projectRow } from './search-registry.mjs'

// Same table seed.mjs uses to turn the generator's display strings into
// timestamptz — the abbreviation already encodes the DST decision.
const TZ_OFFSETS = {
  EST: '-05:00', EDT: '-04:00', CST: '-06:00', CDT: '-05:00', MST: '-07:00', MDT: '-06:00',
  PST: '-08:00', PDT: '-07:00', AKST: '-09:00', AKDT: '-08:00', HST: '-10:00',
}

// Identifier bands. Seeded shipments: sell 25xxxxxx, buy 8-digit random,
// odyssey seq from 50,000,000 (S148). Every band here is disjoint from those,
// and derived from the order's serial id so both runtimes mint the same ids
// without a sequence or a MAX() race.
//   odyssey  O + (60_000_000 + orderId)   — 'O' = single-order (Dave, 2026-09-15)
//   sell     26_000_000 + orderId
//   buy      900_000_000 + orderId        — 9 digits, never collides with an 8-digit seed
//   load     String(orderId)              — order ↔ load is 1:1 (Dave 00:59:20)
export function idsFor(orderId) {
  return {
    odysseyShipmentIdentifier: `O${60_000_000 + orderId}`,
    sellShipment: String(26_000_000 + orderId),
    buyShipment: String(900_000_000 + orderId),
    load: String(orderId),
  }
}

// The form's header checkbox rides the wire as a FLAG user field
// (mapFormToOrderInterface.ts:66). Checked by default (Q15), so absent = Y.
export function consolidatableOf(mo) {
  const f = (mo.userFieldList ?? []).find((u) => u.userfieldType === 'FLAG' && u.name === 'CONSOLIDATABLE')
  return f ? f.value !== 'N' : true
}

// 'United States' (the form's COUNTRIES vocabulary) → 'US' (the grid's lane
// string and the stop's country code). Codes pass through unchanged.
const COUNTRY_CODE = { 'United States': 'US', Canada: 'CA', Mexico: 'MX' }
const countryCode = (c) => COUNTRY_CODE[c] ?? (c || 'US')

// '2026-06-15T08:00:00' + 'CST' → '06/15/2026 08:00 CST' (generate.mjs formatDateTime shape)
function fmtDisplay(iso, tz) {
  if (!iso) return ''
  const [d, t = '00:00'] = iso.split('T')
  const [yyyy, mm, dd] = d.split('-')
  return `${mm}/${dd}/${yyyy} ${t.slice(0, 5)} ${tz || 'CST'}`
}
// '2026-06-15T08:00:00' + 'CST' → '2026-06-15T08:00:00-06:00'; null when unknown
function toTs(iso, tz) {
  if (!iso) return null
  const offset = TZ_OFFSETS[tz || 'CST']
  if (!offset) return null
  const [d, t = '00:00:00'] = iso.split('T')
  return `${d}T${t.length === 5 ? `${t}:00` : t}${offset}`
}

// ponytail: mode from weight — LTL under 10,000 lb, TL otherwise. Real mode
// comes from routing, which does not exist here; replace when it does.
const modeFor = (w) => (Number(w ?? 0) < 10_000 ? 'LTL' : 'TL')

function toAddress(mo, p) {
  return {
    externalIdentifier: mo[`${p}PartnerId`] ?? '',
    partnerId: mo[`${p}PartnerId`] ?? '',
    fullName: mo[`${p}FullName`] ?? mo[`${p}PartnerId`] ?? '',
    address1: mo[`${p}Address1`] ?? '',
    address2: mo[`${p}Address2`] || undefined,
    city: mo[`${p}City`] ?? '',
    region: mo[`${p}Region`] ?? '',
    postal: mo[`${p}Postal`] ?? '',
    country: countryCode(mo[`${p}Country`]),
    contactName: mo[`${p}ContactName`] ?? '',
    phone: mo[`${p}Phone`] ?? '',
    email: mo[`${p}Email`] ?? '',
  }
}

function toLine(l, i) {
  return {
    orderLineId: String(l.lineIdentifier ?? i + 1),
    lineNumber: String(l.lineIdentifier ?? i + 1),
    itemCode: l.shipItemIdentifier ?? '',
    itemDescription: l.productDescription ?? '',
    packageCount: l.handlingUnitCount ?? null,
    packageType: l.handlingUnit ?? undefined,
    grossWeightValue: l.grossWeightValue ?? 0,
    grossWeightUomCode: l.grossWeightUomCode ?? 'lb',
    volumeValue: l.volumeValue ?? undefined,
    volumeUomCode: l.volumeUomCode ?? undefined,
    // Only the flag reaches the wire (LINX-13893); 'HZ' is enough for
    // mapSellShipmentOutToDetail's hasHazmat (truthy hazmatCode).
    hazmatCode: l.hazardous ? 'HZ' : null,
    shippingClass: l.shipClass ?? undefined,
    declaredValue: l.declaredValue ?? undefined,
    declaredValueCurrency: l.declaredValueCurrency ?? undefined,
    lengthValue: l.lengthValue ?? undefined,
    widthValue: l.widthValue ?? undefined,
    heightValue: l.heightValue ?? undefined,
    countryOfOrigin: l.manufacturingCountryCode ?? undefined,
  }
}

/**
 * @param {object} a
 * @param {object} a.mo            ManualOrder (src/api/types/createOrder.ts)
 * @param {string} a.orderNumber   the assigned order number (user-supplied or padded id)
 * @param {number} a.orderId       the order's serial id (drives every shipment id)
 * @param {string} a.customerName  display name for mo.customerId
 * @param {Date}   a.now           creation instant (history timestamps)
 * @param {string} a.userName      creating user (kept for the caller's audit; not on the row)
 * @returns {{ row: object, detail: object, pickupTs: string|null, deliveryTs: string|null }}
 */
export function buildDirectShipment({ mo, orderNumber, orderId, customerName, now = new Date(), userName }) {
  const ids = idsFor(orderId)
  const consolidatable = consolidatableOf(mo)
  const lines = mo.orderLines ?? []
  const pickupIso = mo.requestedPickupDate, pickupTz = mo.requestedPickupTimeZoneCode
  const deliveryIso = mo.deliveryAppointment ?? mo.requestedDeliveryDate
  const deliveryTz = mo.deliveryAppointment ? mo.deliveryAppointmentTimeZoneCode : mo.requestedDeliveryTimeZoneCode
  const pickupDate = fmtDisplay(pickupIso, pickupTz)
  const deliveryDate = fmtDisplay(deliveryIso, deliveryTz)
  const grossWeight = mo.grossWeightValue ?? lines.reduce((s, l) => s + (l.grossWeightValue ?? 0), 0)
  const volume = mo.volumeValue ?? lines.reduce((s, l) => s + (l.volumeValue ?? 0), 0)
  const packageCount = lines.reduce((s, l) => s + (l.handlingUnitCount ?? 0), 0)
  const equipmentCode = mo.orderCarrierEquipDetailList?.[0]?.equipmentCode ?? ''
  const origin = toAddress(mo, 'origin')
  const destination = toAddress(mo, 'destination')
  // Optimization pool = the grid's Monitoring › Consolidation tab (Jana/Ramesh's
  // "Consolidation" status); Hold = not eligible. Review (no carrier list) is
  // not modelled — this prototype has no routing call to fail.
  const category = consolidatable ? 'consolidation' : 'hold'

  const row = {
    odysseyShipmentIdentifier: ids.odysseyShipmentIdentifier,
    buyShipment: ids.buyShipment,
    sellShipment: ids.sellShipment,
    orders: [orderNumber],
    pickupNumbers: mo.pickupNumber ? [mo.pickupNumber] : [],
    poNumbers: mo.poNumber ? [mo.poNumber] : [],
    shipmentType: 'Direct',               // LINX-11597: one mapped order
    planningType: mo.requestedDateType === 'DELIVERY' ? 'RDD' : 'SSD', // LINX-12902
    legType: null, shipmentSequenceLeg: null, nextShipmentId: null,
    pro: null,                            // no carrier yet
    customerId: mo.customerId ?? '',
    customerName: customerName ?? mo.customerId ?? '',
    consignor: origin.fullName,
    consignee: destination.fullName,
    origin: `${origin.city} ${origin.region} ${origin.country} ${origin.postal}`.trim(),
    destination: `${destination.city} ${destination.region} ${destination.country} ${destination.postal}`.trim(),
    pickupDate, deliveryDate,
    mode: modeFor(grossWeight),
    equipmentCode,
    equipment: '',                        // equipment NUMBER is assigned by the carrier
    seal: null,
    scac: null,
    tenderStatus: '',                     // never tendered on creation (Dave 00:21:30)
    shipmentStatus: '',
    panel: 'monitoring',
    category,
    validationMessage: null,
    grossWeight: String(grossWeight),
    load: ids.load,
    loadCount: String(lines.length || 1), // generate.mjs: Σ line count
    orderCount: '1',
    apFreightCost: '',                    // not rated
  }

  const t0 = new Date(now)
  const t1 = new Date(t0.getTime() + 30_000)
  const author = { name: 'OdysseyONE', kind: 'system' } // a MANUAL order did not come from an ERP
  const historyList = [
    { user: 'OdysseyONE', source: 'OdysseyONE', timestamp: t0.toISOString(), action: 'Shipment Created', category: 'create', outcome: 'update', author,
      details: `Buy Shipment ${ids.buyShipment} and Sell Shipment ${ids.sellShipment} created successfully for Order ${orderNumber}.` },
    { user: 'OdysseyONE', source: 'OdysseyONE', timestamp: t1.toISOString(), action: 'Optimization Evaluation', category: 'update', author,
      details: consolidatable
        ? 'Optimization evaluation completed. Shipment moved to Consolidation.'
        : 'Optimization evaluation completed. Shipment moved to Hold.',
      outcome: consolidatable ? 'update' : 'neutral' }, // DEC-87 outcome contract (generate.mjs:1664)
  ]

  const order = {
    orderId: orderNumber,
    orderNumber,
    customerId: mo.customerId ?? '',
    owningOrganization: row.customerName,
    consolidatable,
    equipmentCode,
    equipmentReferenceNumber: mo.equipmentNumber ?? null,
    customerRequiredCarrier: null,
    pickupNumber: mo.pickupNumber ?? null,
    specialServices: (mo.orderAccessorialDetails ?? []).map((a) => ({ code: a.accessorialCode, desc: a.accessorialCode })),
    userDefinedFieldList: (mo.userFieldList ?? []).filter((u) => u.userfieldType === 'REFERENCE').map((u) => ({ name: u.name, value: u.value })),
    poNumber: mo.poNumber ?? null,
    planningDateType: row.planningType,
    bolNo: null,
    shipDirectionCode: mo.shipDirectionCode ?? '',
    origin, destination,
    scheduledShipDate: pickupDate,
    requestedShipDate: fmtDisplay(mo.pickupAppointment, mo.pickupAppointmentTimeZoneCode) || pickupDate,
    scheduledDeliveryDate: fmtDisplay(mo.requestedDeliveryDate, mo.requestedDeliveryTimeZoneCode) || deliveryDate,
    requestedDeliveryDate: deliveryDate,
    pickupAppointment: null,
    deliveryAppointment: null,
    grossWeightValue: grossWeight,
    grossWeightUomCode: mo.grossWeightUomCode ?? 'lb',
    volumeValue: volume,
    volumeUomCode: mo.volumeUomCode ?? 'cuft',
    orderLines: lines.map(toLine),
    instructionList: (mo.orderInstructionList ?? []).map((ins, i) => ({ sequenceNumber: i + 1, text: ins.instructionText ?? ins.text ?? String(ins) })),
  }

  const stop = (seq, type, a, when) => ({
    stopSequence: seq, stopType: type, orderIds: [orderNumber],
    facilityName: a.fullName, address1: a.address1, city: a.city, region: a.region, postal: a.postal, country: a.country,
    timeZone: undefined, scheduledDateTime: when || null, appointmentTime: null,
    grossWeightValue: grossWeight, grossWeightUomCode: 'LB',
    volumeValue: volume, volumeUomCode: 'cuft',
    packageCount, pickupNumber: type === 'pickup' ? (mo.pickupNumber ?? null) : null,
  })

  const detail = {
    shipmentId: ids.sellShipment,
    odysseyShipmentIdentifier: ids.odysseyShipmentIdentifier,
    shipmentType: 'Direct',
    customerId: row.customerId,
    customerName: row.customerName,
    shipDirection: mo.shipDirectionCode ?? '',
    freightTerms: mo.freightTermCode ?? '',
    incotermInfo: null,
    numberOfStops: 2,
    pgiFlag: false,
    ratingStatus: 'Not Rated',
    trackingUrl: null,                    // only an ACCEPTED tender is trackable (S149)
    distanceMiles: null,
    totalVolumeValue: volume,
    totalVolumeUomCode: mo.volumeUomCode ?? 'cuft',
    acceptedCarrierLabel: null,
    seedEquipment: equipmentCode || null,
    utilizationPercent: null,
    costSummary: undefined,               // mapCost tolerates absence → '--'
    orderList: [order],
    shipmentStopList: [stop(1, 'pickup', origin, pickupDate), stop(2, 'delivery', destination, deliveryDate)],
    shippingOptionList: [],               // no routing yet → Tender tab "No routing options available."
    droppedCarrierList: [],
    documentList: [],
    noteList: [],
    historyList,
  }

  return { row, detail, pickupTs: toTs(pickupIso, pickupTz), deliveryTs: toTs(deliveryIso, deliveryTz) }
}

// ── Live SQL ────────────────────────────────────────────────────────────────
// Column order = tools/seed.mjs:110-116, so a runtime shipment is
// indistinguishable from a seeded one to every reader (ROW_COLUMNS,
// buildDetailQuery, the counts query). stops/tenders/events are NOT written:
// no read path selects from them (grep "FROM stops|FROM events" api/_lib → 0),
// and the detail blob carries the stops and history the modal renders.
const INSERT_COLS = [
  'sell_shipment', 'buy_shipment', 'orders', 'pro', 'customer_id', 'customer_name', 'consignor', 'consignee',
  'origin', 'destination', 'pickup_date', 'delivery_date', 'pickup_ts', 'delivery_ts', 'mode', 'equipment_code',
  'equipment', 'seal', 'scac', 'tender_status', 'shipment_status', 'panel', 'category', 'validation_message',
  'gross_weight', 'load', 'load_count', 'order_count', 'ap_freight_cost', 'pickup_numbers', 'detail',
  'shipment_type', 'planning_type', 'po_numbers', 'leg_type', 'sequence_leg', 'next_shipment_id',
  'odyssey_shipment_id',
]

export function buildInsertShipmentQuery({ row: s, detail, pickupTs, deliveryTs }) {
  const values = [
    s.sellShipment, s.buyShipment, s.orders, s.pro, s.customerId, s.customerName, s.consignor, s.consignee,
    s.origin, s.destination, s.pickupDate, s.deliveryDate, pickupTs, deliveryTs, s.mode, s.equipmentCode,
    s.equipment, s.seal, s.scac, s.tenderStatus, s.shipmentStatus, s.panel, s.category, s.validationMessage,
    s.grossWeight, s.load, s.loadCount, s.orderCount, s.apFreightCost, s.pickupNumbers ?? [],
    JSON.stringify(detail),
    s.shipmentType ?? null, s.planningType ?? null, s.poNumbers ?? [], s.legType ?? null, s.shipmentSequenceLeg ?? null, s.nextShipmentId ?? null,
    s.odysseyShipmentIdentifier,
  ]
  const placeholders = INSERT_COLS.map((c, i) => {
    const p = `$${i + 1}`
    if (c === 'detail') return `${p}::jsonb`
    if (c === 'pickup_ts' || c === 'delivery_ts') return `${p}::timestamptz`
    return p
  })
  return { text: `INSERT INTO shipments (${INSERT_COLS.join(', ')}) VALUES (${placeholders.join(', ')})`, values }
}

// orders.shipment_sell_id (001_schema.sql:52) — the FK the seed fills and the
// runtime never did. Ordered AFTER the shipment insert so a failure between
// the two leaves a truthful 'Ready for Planning', never a dangling link.
export function buildLinkOrderQuery(orderNumber, sellShipment) {
  return {
    text: `UPDATE orders SET shipment_sell_id = $1, order_status = 'Planned Shipment' WHERE order_number = $2`,
    values: [sellShipment, orderNumber],
  }
}

// search_index is the live free-text/attribute probe (003_search_index.sql);
// a shipment missing here is invisible to the search bar. Same projection the
// seed uses (project-search.mjs → search-registry.mjs projectRow), fed the
// snake_case keys the registry reads.
export function buildSearchIndexQuery(row) {
  const src = {
    odyssey_shipment_id: row.odysseyShipmentIdentifier, buy_shipment: row.buyShipment, sell_shipment: row.sellShipment,
    orders: row.orders, pro: row.pro, pickup_numbers: row.pickupNumbers, customer_id: row.customerId,
    customer_name: row.customerName, consignor: row.consignor, consignee: row.consignee, origin: row.origin,
    destination: row.destination, equipment: row.equipment, seal: row.seal, scac: row.scac, load: row.load,
    shipment_type: row.shipmentType, planning_type: row.planningType,
  }
  const rows = projectRow('shipments', src, row.sellShipment)
  const values = [], tuples = []
  rows.forEach((r, i) => {
    const b = i * 5
    tuples.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5})`)
    values.push(r.domain, r.entity_id, r.attr, r.value, r.display)
  })
  return {
    text: `INSERT INTO search_index (domain, entity_id, attr, value, display) VALUES ${tuples.join(', ')} ON CONFLICT DO NOTHING`,
    values,
  }
}
