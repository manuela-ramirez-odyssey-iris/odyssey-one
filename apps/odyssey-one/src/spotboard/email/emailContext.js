// Builds the template context from what the SpotBid tab already holds.
// Field paths mirror buildHeader() in components/detail/SpotBoardTab.jsx —
// if that changes, change this. Every accessor tolerates missing data.
import { fmtDollar } from '../../utils/money.js'
import { APP_ORIGIN } from './emailTheme.js'

// ponytail: FROMEMAIL is a TMS system profile per planning group (SPB-77);
// the prototype has no planning-group model, so one seeded mailbox stands in.
export const PLANNING_GROUP_MAILBOX = 'planning-charlotte@odysseylogistics.com'
export { APP_ORIGIN }

const pad = (n) => String(n).padStart(2, '0')
export function fmtDate(d) {
  if (!d) return ''
  const t = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(t.getTime())) return ''
  return `${pad(t.getMonth() + 1)}/${pad(t.getDate())}/${t.getFullYear()}`
}
// "09/08/2023 11:44 EST" — legacy stamp shape; zone from the browser.
export function fmtStamp(ms) {
  if (!ms) return ''
  const t = new Date(ms)
  if (Number.isNaN(t.getTime())) return ''
  const zone = t.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop()
  return `${fmtDate(t)} ${pad(t.getHours())}:${pad(t.getMinutes())} ${zone}`
}

function cityLine(s) {
  return [s?.city, s?.region, s?.postal, s?.country].filter(Boolean).join(' ')
}
function stopAddress(s) {
  if (!s) return { name: '', lines: [] }
  return { name: s.facilityName ?? s.location ?? '', lines: [s.address1, cityLine(s)].filter(Boolean) }
}
function fmtWeight(order) {
  if (!order?.grossWeightValue) return ''
  return `${Number(order.grossWeightValue).toLocaleString('en-US')} ${String(order.grossWeightUomCode ?? 'lb').toLowerCase()}`
}

export function buildEmailContext({ shipmentDetails, shipment, quote, benchmark, distanceMi }) {
  const stops = shipmentDetails?.stopsData?.stops ?? []
  const pickups = stops.filter((s) => s.type === 'pickup')
  const deliveries = stops.filter((s) => s.type === 'delivery')
  const first = pickups[0]
  const last = deliveries[deliveries.length - 1]
  const middle = stops.filter((s) => s !== first && s !== last)
  const orders = shipmentDetails?.orderDetails ?? []
  const firstOrder = orders[0]
  const id = String(shipment?.sellShipment ?? quote?.id ?? '')
  const consolidation = orders.length > 1

  const bidding = (quote?.carriers ?? []).filter((c) => c.incl && c.bid?.status === 'bid')
  const lowestCarrier = bidding.length
    ? bidding.reduce((lo, c) => (c.bid.total < lo.bid.total ? c : lo))
    : null
  const equipment = shipmentDetails?.summary?.seedEquipment ?? firstOrder?.equipment ?? ''

  return {
    quoteId: id,
    reference: `${consolidation ? 'C' : 'L'}${id}`,
    orderNumber: consolidation ? null : (firstOrder?.orderNumber ?? null),
    shipper: shipment?.customerName ?? shipmentDetails?.summary?.customerName ?? '',
    from: stopAddress(first),
    to: stopAddress(last),
    equipment,
    weight: fmtWeight(firstOrder),
    hazmat: orders.some((o) => o.hazmat === 'Yes') ? 'Yes' : 'No',
    distance: shipmentDetails?.stopsData?.summary?.distance
      ?? (Number.isFinite(distanceMi) && distanceMi > 0 ? `${Math.round(distanceMi).toLocaleString('en-US')} mi` : null),
    pickup: fmtDate(first?.scheduledDateTime),
    deliver: fmtDate(last?.scheduledDateTime),
    stops: middle.map((s, i) => ({
      label: `${i + 1} - ${cityLine(s)}`,
      date: `${s.type === 'pickup' ? 'Pickup' : 'Drop-off'}: ${fmtDate(s.scheduledDateTime)}`,
    })),
    offerExpires: fmtStamp(quote?.closeAt),
    sender: PLANNING_GROUP_MAILBOX,
    plannerGroup: PLANNING_GROUP_MAILBOX,
    appOrigin: APP_ORIGIN,
    benchmark: benchmark ?? 0,
    lowest: lowestCarrier ? {
      carrier: `${lowestCarrier.scac} - ${equipment}`,
      amount: `${fmtDollar(lowestCarrier.bid.total)} ${lowestCarrier.bid.currency ?? 'USD'}`,
      shipDate: fmtDate(first?.scheduledDateTime),
      deliveryDate: fmtDate(last?.scheduledDateTime),
    } : null,
  }
}
