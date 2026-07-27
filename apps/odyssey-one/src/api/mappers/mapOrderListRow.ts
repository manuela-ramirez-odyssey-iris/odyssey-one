import type { OrderListRow } from '../types/orderList'
import type { OrderRowVM } from '../types/orderRowVm'

// LLD row DTO → flat grid view-model. This is the single place to reconcile
// real field names / formats when the live Swagger lands.

const s = (v: string | undefined) => v ?? ''

// "2026-06-15T08:00:00.000Z" → "06/15/2026 08:00". String-sliced from the ISO
// value — no Date object, no timezone shifting; display matches the wire value
// until a TZ policy exists.
function formatDateTime(iso: string | undefined): string {
  if (!iso) return ''
  const [date, time] = iso.split('T')
  if (!date || !time) return iso
  const [y, m, d] = date.split('-')
  return `${m}/${d}/${y} ${time.slice(0, 5)}`
}

// "RGC-STL-001: St Louis, MO" — full locationId as the prefix code (plan
// decision 4); degrades to whichever parts exist.
function formatPlace(loc: OrderListRow['consignor'] | OrderListRow['consignee'] | undefined): string {
  if (!loc) return ''
  const cityState = [loc.city, loc.state].filter(Boolean).join(', ')
  if (!loc.locationId) return cityState
  return cityState ? `${loc.locationId}: ${cityState}` : loc.locationId
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// "2026-06-08T08:45:00" → "Jun 8, 2026 at 8:45 AM". String-parsed local wall
// time — no Date/timezone shifting (matches Figma format minus tz; our wire
// values carry no tz — open item until a TZ policy exists).
function formatLongDateTime(iso: string | undefined): string {
  if (!iso) return ''
  const [date, time] = iso.split('T')
  if (!date || !time) return iso
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  const ampm = hh < 12 ? 'AM' : 'PM'
  return `${MONTHS[m - 1]} ${d}, ${y} at ${h12}:${String(mm).padStart(2, '0')} ${ampm}`
}

// { 24530, "LB" } → "24,530 LB"; '--' when absent (LINX-9896 note: optional
// empties render '--').
function formatMeasureDashed(m: { value: number; uom: string } | undefined): string {
  if (!m || m.value == null) return '--'
  return [m.value.toLocaleString('en-US'), m.uom].filter(Boolean).join(' ')
}

const dash = (v: string | undefined) => (v && v.trim() ? v : '--')

function locationCell(loc: OrderListRow['consignor'] | OrderListRow['consignee'] | undefined) {
  if (!loc) return { id: '--', name: '', address: '' }
  const cityLine = [loc.city, loc.state].filter(Boolean).join(', ')
  const address = [loc.address, cityLine].filter(Boolean).join(' ')
  return {
    id: loc.locationId || '--',
    name: loc.name ?? '',
    address: [address, loc.country].filter(Boolean).join(', '),
  }
}

const titleCase = (v: string | undefined) =>
  v ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : ''

export function mapOrderListRow(row: OrderListRow): OrderRowVM {
  // Pending = async creation still processing: no orderNumber yet, but the row
  // carries the internal orderId (LINX-11013) so it stays addressable. The grid
  // renders '-' for the ID; row key falls back to the internal id.
  const pending = !row.orderNumber && row.orderId != null
  return {
    id: s(row.orderNumber) || (pending ? `pending-${row.orderId}` : ''),
    idLabel: s(row.orderNumber) || (pending ? '-' : ''),
    pending,
    customer: s(row.customer),
    origin: formatPlace(row.consignor),
    destination: formatPlace(row.consignee),
    commodity: s(row.commodity),
    equipment: s(row.equipment),
    earlyPickup: formatDateTime(row.consignor?.earliestPickupDateTime),
    status: s(row.orderStatus),
    hazardous: row.hazardous === true,
    orderSource: titleCase(row.orderSource),
    shipDirection: s(row.shipDirection),
    freightTerms: s(row.freightTerms),
    shipperLocation: locationCell(row.consignor),
    destinationLocation: locationCell(row.consignee),
    latestPickup: formatLongDateTime(row.consignor?.latestPickupDateTime),
    latestDelivery: formatLongDateTime(row.consignee?.latestDeliveryDateTime),
    weight: formatMeasureDashed(row.grossWeight),
    volume: formatMeasureDashed(row.volume),
    created: row.createdAt ? formatLongDateTime(row.createdAt) : '--',
    createdBy: dash(row.createdBy),
    lastEdit: row.lastEditAt ? formatLongDateTime(row.lastEditAt) : '--',
    draftOrderStatus: s(row.draftOrderStatus),
    errorCount: row.errorCount ?? null,
  }
}
