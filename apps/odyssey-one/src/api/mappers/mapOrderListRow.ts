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

// { 4300, "lbs" } → "4300 lbs" (spec §5 example — no thousands separator).
function formatMeasure(m: { value: number; uom: string } | undefined): string {
  if (!m || m.value == null) return ''
  return [String(m.value), m.uom].filter(Boolean).join(' ')
}

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
    weight: formatMeasure(row.grossWeight),
    volume: formatMeasure(row.volume),
    commodity: s(row.commodity),
    equipment: s(row.equipment),
    earlyPickup: formatDateTime(row.consignor?.earliestPickupDateTime),
    status: s(row.orderStatus),
  }
}
