// LINX-15870 — Search & Add Orders candidates. Pure; runs over the mock
// datasets (shipments.json + orders.json shapes) in the app and over the
// same shapes read from Neon in the handler (orders.consignor/consignee/
// gross_weight/volume are jsonb of exactly these objects — tools/seed.mjs).
// OC-open-11's 2026-09-09 grey-at-add ruling (a row whose source is
// status/tender-blocked shown greyed and unselectable) was REVERSED
// 2026-09-25 per LINX-15870/15872 + Jana (transcript @00:06:06): every row
// here is now a normal, selectable candidate — the block happens only at
// Save (shipments.mjs pullExternalOrders). Rows no longer carry
// blocked/blockReason.
export const EMPTY_FILTERS = {
  orderNumber: '', buyShipment: '', shipDate: { from: '', to: '' }, deliveryDate: { from: '', to: '' },
  origin: '', destination: '', shipmentStatus: '', tenderStatus: '',
}
// DEC-204 vocabulary (closes OC-open-20). Re-exported so AddOrdersModal keeps one import.
export { SHIPMENT_STATUSES } from '../../src/lib/shipmentStatus.js'
// C15 (S163, LINX-15870) — + 'To Be Tendered' and 'Not Tendered'. The latter
// is a filter token only: it matches a blank/null tenderStatus, which the
// column still shows as `--`.
export const NOT_TENDERED = 'Not Tendered'
export const TENDER_STATUSES = ['To Be Tendered', 'Sent', 'Accepted', 'Cancelled', 'Declined', NOT_TENDERED]
// LINX-15872 — what Save refuses; shipments.mjs imports these for the server check.
// The AC's list is "Approved, Done, SpotBid, Bid Review". Read off the CATEGORY,
// not the status label: SpotBid and Bid Review both display as Review (DEC-204)
// while a Review from any other exception is movable. sent → Approved,
// approved → Done.
export const MOVE_BLOCKED_CATEGORY = ['sent', 'approved', 'spotbid', 'bid-review']
export const MOVE_BLOCKED_TENDER = ['To Be Tendered', 'Sent', 'Accepted']

const place = (a) => (a ? `${a.city}, ${a.state} ${a.country}` : '--')
// C15 (S163, LINX-15870) — Origin/Destination filter on "siteId city, ST
// postal country", so a planner can match a site id or ZIP the displayed
// `origin`/`destination` string doesn't carry. locationId = the site id
// (partnerId on the wire).
const placeHaystack = (a) => (a ? `${a.locationId ?? ''} ${a.city}, ${a.state} ${a.postal ?? ''} ${a.country}` : '')
const measure = (m) => (m && m.value != null ? `${m.value} ${m.uom}` : '--')
const day = (iso) => (iso ? String(iso).slice(0, 10) : '')

/**
 * @param {{ shipments: object[], orders: object[], customerId: string, sellShipment: string, excludeOrderIds?: string[] }} args
 * @returns {{ orderNumber: string, sourceSellShipment: string, customer: string, origin: string, destination: string,
 *   originMatch: string, destinationMatch: string,
 *   weight: string, volume: string, buyShipment: string, shipmentStatus: string, tenderStatus: string,
 *   shipmentType: string, ordersInShipment: string[], shipDate: string, deliveryDate: string }[]}
 */
export function buildCandidateRows({ shipments, orders, customerId, sellShipment, excludeOrderIds = [] }) {
  const skip = new Set(excludeOrderIds)
  const byNumber = new Map(orders.map((o) => [o.orderNumber, o]))
  const rows = []
  for (const s of shipments) {
    if (s.customerId !== customerId || s.sellShipment === sellShipment) continue
    for (const id of s.orders ?? []) {
      const o = byNumber.get(id)
      if (!o || skip.has(id)) continue
      rows.push({
        orderNumber: id, sourceSellShipment: s.sellShipment, customer: s.customerName,
        origin: place(o.consignor), destination: place(o.consignee),
        originMatch: placeHaystack(o.consignor), destinationMatch: placeHaystack(o.consignee),
        weight: measure(o.grossWeight), volume: measure(o.volume),
        buyShipment: s.buyShipment, shipmentStatus: s.shipmentStatus, tenderStatus: s.tenderStatus,
        shipmentType: s.shipmentType, ordersInShipment: [...(s.orders ?? [])],
        shipDate: day(o.consignor?.earliestPickupDateTime), deliveryDate: day(o.consignee?.earliestDeliveryDateTime),
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
    if (f.origin && !has(r.originMatch ?? r.origin, f.origin)) return false
    if (f.destination && !has(r.destinationMatch ?? r.destination, f.destination)) return false
    if (!inRange(r.shipDate, f.shipDate)) return false
    if (!inRange(r.deliveryDate, f.deliveryDate)) return false
    if (f.shipmentStatus && r.shipmentStatus !== f.shipmentStatus) return false
    if (f.tenderStatus === NOT_TENDERED ? !!r.tenderStatus : f.tenderStatus && r.tenderStatus !== f.tenderStatus) return false
    return true
  })
}
