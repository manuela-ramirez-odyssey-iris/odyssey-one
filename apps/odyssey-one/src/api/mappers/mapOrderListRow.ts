import type { OrderListRow } from '../types/orderList'
import type { OrderRowVM } from '../types/orderRowVm'
import { freightTermLabel, shipDirectionLabel } from '../../data/master-data'

// LLD row DTO → flat grid view-model. This is the single place to reconcile
// real field names / formats when the live Swagger lands.

const s = (v: string | undefined) => v ?? ''

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
    equipment: s(row.equipment),
    status: s(row.orderStatus),
    hazardous: row.hazardous === true,
    orderSource: titleCase(row.orderSource),
    shipDirection: shipDirectionLabel(s(row.shipDirection)),
    freightTerms: freightTermLabel(s(row.freightTerms)),
    shipperLocation: locationCell(row.consignor),
    destinationLocation: locationCell(row.consignee),
    latestPickup: formatLongDateTime(row.consignor?.latestPickupDateTime),
    latestDelivery: formatLongDateTime(row.consignee?.latestDeliveryDateTime),
    weight: formatMeasureDashed(row.grossWeight),
    volume: formatMeasureDashed(row.volume),
    created: dash(formatLongDateTime(row.createdAt)),
    createdBy: dash(row.createdBy),
    lastEdit: dash(formatLongDateTime(row.lastEditAt)),
    draftOrderStatus: s(row.draftOrderStatus),
    errorCount: row.errorCount ?? null,
  }
}
