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

// R2-3: appends the display zone abbreviation to a formatted date-time —
// "Jun 2, 2026 at 8:00 AM CDT". Blank/unknown zone (live default, older rows)
// leaves the string unchanged rather than trailing a stray space.
function joinZone(formatted: string, zone: string | undefined): string {
  return formatted && zone ? `${formatted} ${zone}` : formatted
}

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

/**
 * The "Errors Count" column's value: BOTH OIF levels added together.
 *
 * Ramesh, 2026-09-10: "Error = Order has structural and/or master data error".
 * Level 1 / structural is `interfaceErrorCount` (LINX-16049), Level 2 / master
 * data is `errorCount` (LINX-11137), and both are fixed in one login session —
 * so the queue's count has to be the work remaining, not half of it. Showing
 * `errorCount` alone displayed "2" for an order with 3 structural + 2 master
 * data faults and then made the planner fix 5.
 *
 * THIS IS THE ONLY DEFINITION. Display (the grid cell + the XLSX export, via
 * the VM below), the search-bar chip matcher (`orderSearchRow`) and the MOCK
 * filter/sort (`orderService`) all call it, so "what the row shows" and "what
 * the query matches" cannot drift apart — this repo has shipped that exact bug
 * five times. The LIVE (SQL) side is covered by `interface_error_count` not
 * existing in Neon at all: `interfaceErrorCount` is always null there, the total
 * therefore equals `error_count`, and the existing SQL is already right (see the
 * matching note in api/_lib/orders.mjs; Q-OIF-4).
 *
 * null (not 0) when NEITHER count is present — a non-VE row has no errors
 * count, and the grid renders '--' rather than a misleading zero.
 */
export function totalErrorCount(
  row: Pick<OrderListRow, 'errorCount' | 'interfaceErrorCount'>,
): number | null {
  if (row.errorCount == null && row.interfaceErrorCount == null) return null
  return (row.errorCount ?? 0) + (row.interfaceErrorCount ?? 0)
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
    created: dash(joinZone(formatLongDateTime(row.createdAt), row.createdTimeZoneCode)),
    createdBy: dash(row.createdBy),
    lastEditedBy: dash(row.lastEditedBy),
    lastEdit: dash(joinZone(formatLongDateTime(row.lastEditAt), row.lastEditTimeZoneCode)),
    draftOrderStatus: s(row.draftOrderStatus),
    // The DISPLAYED "Errors Count" — both levels (see totalErrorCount above).
    errorCount: totalErrorCount(row),
    // The master-data-only count, kept because the Step 2 resolution screen is
    // seeded from it (`deriveValidationErrors`): Step 2 fixes master-data faults
    // only, so seeding it with the total would invent Level 2 errors that do not
    // exist. Step 1's own count stays `interfaceErrorCount` below.
    masterDataErrorCount: row.errorCount ?? null,
    // Live too since migration 010 (S145): orders.interface_error_count /
    // interface_error_class exist and api/_lib/orders.mjs projects them, closing
    // Q-OIF-4 in code. Still null on any Neon row seeded BEFORE that migration
    // was applied + the DB reseeded — such a row opens at Step 2.
    interfaceErrorCount: row.interfaceErrorCount ?? null,
    interfaceErrorClass: row.interfaceErrorClass ?? null,
  }
}
