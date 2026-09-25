// LINX-15870 — Search & Add Orders candidates. Pure; runs over the mock
// datasets (shipments.json + orders.json shapes) in the app and over the
// same shapes read from Neon in the handler (orders.consignor/consignee/
// gross_weight/volume are jsonb of exactly these objects — tools/seed.mjs).
export const EMPTY_FILTERS = {
  orderNumber: '', buyShipment: '', shipDate: { from: '', to: '' }, deliveryDate: { from: '', to: '' },
  origin: '', destination: '', shipmentStatus: '', tenderStatus: '',
}
// Seed vocabulary (OC-open-20: the AC lists eight statuses the seed does not carry).
export const SHIPMENT_STATUSES = ['Review', 'Done']
export const TENDER_STATUSES = ['Sent', 'Accepted', 'Cancelled', 'Declined']
// LINX-15872 — what Save refuses; shipments.mjs imports these for the server check.
export const MOVE_BLOCKED_STATUS = ['Approved', 'Done', 'SpotBid', 'Bid Review']
export const MOVE_BLOCKED_TENDER = ['To Be Tendered', 'Sent', 'Accepted']
export const MOVE_BLOCKED_TOOLTIP = 'This order cannot be moved: its shipment is approved, completed, or in an active tender or bid.'
// OC-open-23 — moving the only order off its shipment would empty it; Save
// itself blocks this (LINX-15872 has no answer, user ruling: block at add).
export const LAST_ORDER_MOVE_TOOLTIP = 'This order cannot be moved: it is the only order on its shipment.'
const isBlocked = (s) => MOVE_BLOCKED_STATUS.includes(s.shipmentStatus) || MOVE_BLOCKED_TENDER.includes(s.tenderStatus)
// status wins when both apply — it's the more specific/actionable message.
const blockReasonFor = (s) => (isBlocked(s) ? 'status' : (s.orders ?? []).length === 1 ? 'last-order' : null)

const place = (a) => (a ? `${a.city}, ${a.state} ${a.country}` : '--')
const measure = (m) => (m && m.value != null ? `${m.value} ${m.uom}` : '--')
const day = (iso) => (iso ? String(iso).slice(0, 10) : '')

/**
 * @param {{ shipments: object[], orders: object[], customerId: string, sellShipment: string, excludeOrderIds?: string[] }} args
 * @returns {{ orderNumber: string, sourceSellShipment: string, customer: string, origin: string, destination: string,
 *   weight: string, volume: string, buyShipment: string, shipmentStatus: string, tenderStatus: string,
 *   shipmentType: string, ordersInShipment: string[], shipDate: string, deliveryDate: string, blocked: boolean,
 *   blockReason: 'status' | 'last-order' | null }[]}
 */
export function buildCandidateRows({ shipments, orders, customerId, sellShipment, excludeOrderIds = [] }) {
  const skip = new Set(excludeOrderIds)
  const byNumber = new Map(orders.map((o) => [o.orderNumber, o]))
  const rows = []
  for (const s of shipments) {
    if (s.customerId !== customerId || s.sellShipment === sellShipment) continue
    const blockReason = blockReasonFor(s)
    for (const id of s.orders ?? []) {
      const o = byNumber.get(id)
      if (!o || skip.has(id)) continue
      rows.push({
        orderNumber: id, sourceSellShipment: s.sellShipment, customer: s.customerName,
        origin: place(o.consignor), destination: place(o.consignee),
        weight: measure(o.grossWeight), volume: measure(o.volume),
        buyShipment: s.buyShipment, shipmentStatus: s.shipmentStatus, tenderStatus: s.tenderStatus,
        shipmentType: s.shipmentType, ordersInShipment: [...(s.orders ?? [])],
        shipDate: day(o.consignor?.earliestPickupDateTime), deliveryDate: day(o.consignee?.earliestDeliveryDateTime),
        blocked: blockReason !== null,
        blockReason,
      })
    }
  }
  return rows.sort((a, b) => String(a.buyShipment).localeCompare(String(b.buyShipment), undefined, { numeric: true }))
}

const has = (hay, needle) => String(hay ?? '').toLowerCase().includes(needle.trim().toLowerCase())
const inRange = (d, { from, to }) => (!from || d >= from) && (!to || d <= to)

export function filterCandidates(rows, { q = '', filters = EMPTY_FILTERS }) {
  const f = { ...EMPTY_FILTERS, ...filters }
  return rows.filter((r) => {
    if (q.trim() && ![r.orderNumber, r.buyShipment, r.origin, r.destination, ...r.ordersInShipment].some((v) => has(v, q))) return false
    if (f.orderNumber && !has(r.orderNumber, f.orderNumber)) return false
    if (f.buyShipment && !has(r.buyShipment, f.buyShipment)) return false
    if (f.origin && !has(r.origin, f.origin)) return false
    if (f.destination && !has(r.destination, f.destination)) return false
    if (!inRange(r.shipDate, f.shipDate)) return false
    if (!inRange(r.deliveryDate, f.deliveryDate)) return false
    if (f.shipmentStatus && r.shipmentStatus !== f.shipmentStatus) return false
    if (f.tenderStatus && r.tenderStatus !== f.tenderStatus) return false
    return true
  })
}
