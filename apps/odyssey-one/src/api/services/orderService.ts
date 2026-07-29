import { getApiMode } from '../config'
import { apiGet, apiPost } from '../client'
import { getAllOrders, getOrderEnrichment } from '../../data/orders'
import type { OrderListRequest, OrderListResponse, OrderListRow } from '../types/orderList'
import { mapFormToOrderInterface } from '../mappers/mapFormToOrderInterface'
import { mapOrderViewToFormVm } from '../mappers/mapOrderViewToFormVm'
import type { CreateOrderRequest, CreateOrderResponse, ManualOrder } from '../types/createOrder'
import type { OrderFormValues } from '../types/orderFormVm'

// Order list service. live → POST /order-service/v3/order/list with the request
// verbatim (the params type IS the LLD request shape). mock → simulate the
// paginated server over orders.json: filter (AND across fields, OR within an
// array) → sort → 1-based paginate (Q29 tracks 1- vs 0-based).

// Date-range bounds are yyyy-mm-dd; compare against the row's ISO datetime by
// date part so the To-bound is inclusive.
function dateInRange(iso: string | undefined, from?: string, to?: string): boolean {
  const d = iso?.slice(0, 10)
  if (!d) return false
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

const oneOf = (values: string[] | undefined, v: string | undefined) =>
  !values?.length || values.includes(v ?? '')

// Column id → row-value getter for header sorting (S94). Ids matching a
// top-level string field (orderNumber, customer, orderStatus, ...) need no
// entry — the comparator's default fallback reads the field directly.
const SORT_GETTERS: Record<string, (r: OrderListRow) => string | number> = {
  weight: r => r.grossWeight?.value ?? 0,
  volume: r => r.volume?.value ?? 0,
  latestPickup: r => r.consignor?.latestPickupDateTime ?? '',
  latestDelivery: r => r.consignee?.latestDeliveryDateTime ?? '',
  shipperLocation: r => r.consignor?.locationId ?? '',
  destinationLocation: r => r.consignee?.locationId ?? '',
  created: r => r.createdAt ?? '',
  lastEdit: r => r.lastEditAt ?? '',
  errorCount: r => r.errorCount ?? 0,
  hazardous: r => (r.hazardous ? 1 : 0),
  orderSource: r => r.orderSource ?? '',
  draftOrderStatus: r => r.draftOrderStatus ?? '',
}

// Mock row assembly shared by list + tab counts. Overlay rows SHADOW base rows
// with the same order number (a session draft saved over a generated Draft row
// must not duplicate it — duplicate ids would also collide as TanStack row keys).
function mockScopedRows(customerIds?: string[]): OrderListRow[] {
  const overlayNumbers = new Set(overlayRows.map(r => r.orderNumber).filter(Boolean))
  let rows = [
    ...overlayRows,
    ...(getAllOrders() as OrderListRow[]).filter(r => !overlayNumbers.has(r.orderNumber)),
  ]
  if (customerIds) {
    const scope = new Set(customerIds)
    rows = rows.filter(r => scope.has(r.customer))
  }
  return rows
}

/**
 * Statuses the "Validation Errors" main tab filters to (display labels — the
 * mock service matches labels; code→label mapping deferred, plan decision 8).
 * Inferred from the Orders Tabs mock: the failure statuses are the "orders that
 * need error validation".
 */
export const VALIDATION_ERROR_STATUSES = ['Planning Failed', 'Shipment Failed']

export interface OrderTabCounts {
  all: number
  draft: number
  validationErrors: number
}

/**
 * Counts for the Orders main tabs (All / Draft / Validation Errors), scoped by
 * the navbar customer selection — same semantics as getOrderList's customerIds.
 * live → GET /order-service/v3/order/tab-counts?customers=csv — OUR contract
 * extension (the LLD has no counts endpoint); mock computes over orders.json.
 */
export async function getOrderTabCounts(customerIds?: string[]): Promise<OrderTabCounts> {
  if (customerIds && customerIds.length === 0) return { all: 0, draft: 0, validationErrors: 0 }
  if (getApiMode() === 'live') {
    const params = customerIds !== undefined ? `?customers=${encodeURIComponent(customerIds.join(','))}` : ''
    return apiGet<OrderTabCounts>(`/order-service/v3/order/tab-counts${params}`)
  }
  const rows = mockScopedRows(customerIds)
  return {
    all: rows.length,
    draft: rows.filter(r => r.orderStatus === 'Draft').length,
    validationErrors: rows.filter(r => VALIDATION_ERROR_STATUSES.includes(r.orderStatus ?? '')).length,
  }
}

/**
 * Order list. `customerIds` is the navbar-customer FIRST-order scope — the same
 * semantics gridService applies to Shipments (S79c decision 10): `undefined` =
 * unscoped (legacy callers/tests), `[]` honestly yields nothing, otherwise rows
 * outside the selected customers don't exist for this user. Applied before the
 * LLD filters; in live mode it folds into `filters.customers`.
 */
export async function getOrderList(
  request: OrderListRequest,
  customerIds?: string[],
): Promise<OrderListResponse> {
  if (customerIds && customerIds.length === 0) {
    const { pageNumber, pageSize } = request.pagination
    return { success: true, orders: [], pagination: { pageNumber, pageSize, totalCount: 0 }, error: null }
  }
  if (getApiMode() === 'live') {
    const body = customerIds
      ? { ...request, filters: { ...request.filters, customers: customerIds } }
      : request
    return apiPost<OrderListResponse>('/order-service/v3/order/list', body)
  }

  let rows = mockScopedRows(customerIds)

  const f = request.filters
  if (f) {
    rows = rows.filter(r =>
      oneOf(f.customers, r.customer) &&
      oneOf(f.orderNumbers, r.orderNumber) &&
      // mock matches display labels; code→label mapping deferred until filters bind (plan decision 8)
      oneOf(f.orderStatuses, r.orderStatus) &&
      oneOf(f.originCities, r.consignor?.city) &&
      oneOf(f.originStates, r.consignor?.state) &&
      oneOf(f.originCountries, r.consignor?.country) &&
      oneOf(f.destinationCities, r.consignee?.city) &&
      oneOf(f.destinationStates, r.consignee?.state) &&
      oneOf(f.destinationCountries, r.consignee?.country))
    if (f.earliestPickupDateFrom || f.earliestPickupDateTo)
      rows = rows.filter(r => dateInRange(r.consignor?.earliestPickupDateTime, f.earliestPickupDateFrom, f.earliestPickupDateTo))
    if (f.latestPickupDateFrom || f.latestPickupDateTo)
      rows = rows.filter(r => dateInRange(r.consignor?.latestPickupDateTime, f.latestPickupDateFrom, f.latestPickupDateTo))
    if (f.earliestDeliveryDateFrom || f.earliestDeliveryDateTo)
      rows = rows.filter(r => dateInRange(r.consignee?.earliestDeliveryDateTime, f.earliestDeliveryDateFrom, f.earliestDeliveryDateTo))
    if (f.latestDeliveryDateFrom || f.latestDeliveryDateTo)
      rows = rows.filter(r => dateInRange(r.consignee?.latestDeliveryDateTime, f.latestDeliveryDateFrom, f.latestDeliveryDateTo))
  }

  // LLD example default: orderNumber asc. Header sorting (S94) needs more than
  // top-level string fields — SORT_GETTERS reaches into nested/typed values for
  // the ids OrdersRoute's column→field map sends; anything else falls back to
  // the raw top-level field as a string (the old behavior).
  const sort = request.sort ?? { field: 'orderNumber', direction: 'asc' }
  const dir = sort.direction === 'desc' ? -1 : 1
  const get = SORT_GETTERS[sort.field] ??
    ((r: OrderListRow) => String((r as unknown as Record<string, unknown>)[sort.field] ?? ''))
  rows = [...rows].sort((a, b) => {
    const av = get(a)
    const bv = get(b)
    // Number-less pending rows (async create in flight) are the NEWEST orders —
    // treat the empty orderNumber as greatest so the default "orderNumber desc"
    // (the newest-first proxy) surfaces them first.
    if (sort.field === 'orderNumber' && !av !== !bv) return (av === '' ? 1 : -1) * dir
    const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
    return cmp * dir
  })

  const { pageNumber, pageSize } = request.pagination
  const totalCount = rows.length
  const start = (pageNumber - 1) * pageSize // 1-based per the LLD list example (Q29)
  return {
    success: true,
    orders: rows.slice(start, start + pageSize),
    pagination: { pageNumber, pageSize, totalCount },
    error: null,
  }
}

// ─── Write layer (spec §2.3) ────────────────────────────────────────────────
// Mock mode keeps a module-level in-memory overlay over orders.json: created
// orders and drafts prepend grid rows; drafts also retain their form values
// for reopen via /orders/create?draft=<key>. Lost on refresh — accepted.

let overlayRows: OrderListRow[] = []
const draftValues = new Map<string, OrderFormValues>()
const draftIdByOrderNumber = new Map<string, string>()
const orderNumberByDraftId = new Map<string, string>()
let createSeq = 0
let draftSeq = 0

/** Test hook — resets all mock write state. */
export function __resetOrderWriteState(): void {
  overlayRows = []
  draftValues.clear()
  draftIdByOrderNumber.clear()
  orderNumberByDraftId.clear()
  createSeq = 0
  draftSeq = 0
}

// Shared by submitDraftOrder/cancelOrder: shadow the row into the overlay
// (copying it from the base seed the first time it's touched, same as
// saveDraft/createOrder above) and stamp the new status label.
function overlayUpdateStatus(orderNumber: string, status: string): void {
  const existing = overlayRows.find(r => r.orderNumber === orderNumber)
  const base = existing ?? (getAllOrders() as OrderListRow[]).find(r => r.orderNumber === orderNumber)
  if (!base) return
  overlayRows = [
    { ...base, orderStatus: status },
    ...overlayRows.filter(r => r.orderNumber !== orderNumber),
  ]
}

/** Draft-tab Submit (LINX-11663): Draft → 'Ready For Plan'; row moves to All. */
export async function submitDraftOrder(orderNumber: string): Promise<void> {
  if (getApiMode() === 'live') throw new Error('submitDraftOrder: live mapping pending — mock-mode only')
  overlayUpdateStatus(orderNumber, 'Ready For Plan')
}

/**
 * OIF resolution (LINX-11137): Save-with-all-resolved and Purge both send the
 * order to the re-processing queue → 'Ready For Plan' (the AC's "Ready for
 * Planning" in app vocabulary). The status flip alone moves the row out of the
 * status-filtered Validation Errors tab into All. Mock-only until the OIF
 * endpoint exists.
 */
export async function resolveOrder(orderNumber: string): Promise<void> {
  if (getApiMode() === 'live') throw new Error('resolveOrder: live mapping pending — mock-mode only')
  overlayUpdateStatus(orderNumber, 'Ready For Plan')
}

/** Cancel (LINX-10258 soft delete): status → 'Cancelled'. */
export async function cancelOrder(orderNumber: string): Promise<void> {
  if (getApiMode() === 'live') throw new Error('cancelOrder: live mapping pending — mock-mode only')
  overlayUpdateStatus(orderNumber, 'Cancelled')
}

function manualOrderToListRow(mo: ManualOrder, orderNumber: string, statusLabel: string): OrderListRow {
  return {
    orderNumber,
    orderSource: 'MANUAL',
    customer: mo.customerId ?? '',
    shipDirection: mo.shipDirectionCode ?? '',
    freightTerms: mo.freightTermCode ?? '',
    equipment: mo.orderCarrierEquipDetailList?.[0]?.equipmentCode ?? '',
    consignor: {
      locationId: mo.originPartnerId ?? '',
      city: mo.originCity ?? '',
      state: mo.originRegion ?? '',
      country: mo.originCountry ?? 'US',
      earliestPickupDateTime: mo.requestedPickupDate ?? '',
      latestPickupDateTime: mo.pickupAppointment ?? '',
    },
    consignee: {
      locationId: mo.destinationPartnerId ?? '',
      city: mo.destinationCity ?? '',
      state: mo.destinationRegion ?? '',
      country: mo.destinationCountry ?? 'US',
      earliestDeliveryDateTime: mo.requestedDeliveryDate ?? '',
      latestDeliveryDateTime: mo.deliveryAppointment ?? '',
    },
    grossWeight: { value: mo.grossWeightValue ?? 0, uom: mo.grossWeightUomCode ?? 'lbs' },
    volume: { value: mo.volumeValue ?? 0, uom: mo.volumeUomCode ?? 'cbf' },
    commodity: mo.orderLines?.[0]?.productDescription ?? '',
    orderStatus: statusLabel,
  }
}

export async function createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
  if (getApiMode() === 'live') {
    return apiPost<CreateOrderResponse>('/order-service/v3/manual-order', request)
  }
  createSeq += 1
  const mo = request.manualOrder
  // Screen-6 shape "S260004NGW"; deterministic suffix keeps tests stable
  const orderNumber = mo.orderNumber?.trim() || `S26${String(createSeq).padStart(4, '0')}NGW`
  overlayRows = [
    manualOrderToListRow(mo, orderNumber, 'Ready For Plan'),
    ...overlayRows.filter(r => r.orderNumber !== orderNumber),
  ]
  return {
    orderId: 90000 + createSeq,
    success: true,
    message: `Order ${orderNumber} created successfully`,
    data: {
      orderNumber,
      orderDate: new Date().toISOString(),
      orderDateTimeZoneCode: 'EST',
      shipmentMode: 'Ground', // Q28 open — derivation unknown; mock constant
    },
  }
}

export interface SaveDraftResult {
  draftId: string
  orderNumber: string
}

export async function saveDraft(values: OrderFormValues, draftId?: string | null): Promise<SaveDraftResult> {
  const request = mapFormToOrderInterface(values, { draft: true })
  if (getApiMode() === 'live') {
    // LLD remark: draft orders go through the same manual-order POST with
    // orderStatusCode DRAFT (the mapper already stamped it)
    await apiPost('/order-service/v3/manual-order', request)
    const orderNumber = request.manualOrder.orderNumber ?? ''
    return { draftId: orderNumber, orderNumber }
  }
  const id = draftId ?? `draft-${++draftSeq}`
  const orderNumber = values.general.orderNumber.trim() // save-gate guarantees non-empty
  const previousNumber = orderNumberByDraftId.get(id)
  if (previousNumber && previousNumber !== orderNumber) draftIdByOrderNumber.delete(previousNumber)
  overlayRows = [
    manualOrderToListRow(request.manualOrder, orderNumber, 'Draft'),
    ...overlayRows.filter(r => r.orderNumber !== orderNumber && r.orderNumber !== previousNumber),
  ]
  draftValues.set(id, structuredClone(values))
  draftIdByOrderNumber.set(orderNumber, id)
  orderNumberByDraftId.set(id, orderNumber)
  return { draftId: id, orderNumber }
}

export interface DraftRecord {
  draftId: string
  values: OrderFormValues
}

/** Resolves by internal draftId OR order number (the ?draft=<orderNumber> URL). */
export async function getDraft(key: string): Promise<DraftRecord | null> {
  if (getApiMode() === 'live') {
    // Reopening a live draft needs the inverse mapping (order/view → form
    // values) — out of scope this build (plan decision 21)
    throw new Error('getDraft: live mapping pending (order/view → form hydration); mock-mode only')
  }
  const draftId = draftValues.has(key) ? key : draftIdByOrderNumber.get(key)
  if (!draftId) return null
  const values = draftValues.get(draftId)
  return values ? { draftId, values: structuredClone(values) } : null
}

// ─── Order detail / View Order (spec §3.2) ──────────────────────────────────
// Inverse of manualOrderToListRow: promotes a lean grid row to the DTO subset
// it can fill, so getOrderView feeds the same reverse mapper for every tier.
// commodity → one product line carrying the row's header weight/volume.
function listRowToManualOrder(row: OrderListRow): ManualOrder {
  return {
    orderNumber: row.orderNumber,
    customerId: row.customer,
    freightTermCode: row.freightTerms,
    shipDirectionCode: row.shipDirection,
    requestedPickupDate: row.consignor?.earliestPickupDateTime,
    pickupAppointment: row.consignor?.latestPickupDateTime,
    requestedDeliveryDate: row.consignee?.earliestDeliveryDateTime,
    deliveryAppointment: row.consignee?.latestDeliveryDateTime,
    originPartnerId: row.consignor?.locationId,
    originCity: row.consignor?.city,
    originRegion: row.consignor?.state,
    originCountry: row.consignor?.country,
    destinationPartnerId: row.consignee?.locationId,
    destinationCity: row.consignee?.city,
    destinationRegion: row.consignee?.state,
    destinationCountry: row.consignee?.country,
    grossWeightValue: row.grossWeight?.value,
    grossWeightUomCode: row.grossWeight?.uom,
    volumeValue: row.volume?.value,
    volumeUomCode: row.volume?.uom,
    orderStatus: { orderStatusCode: '', orderStatusName: row.orderStatus ?? '' },
    orderCarrierEquipDetailList: row.equipment ? [{ carrierSequence: 1, equipmentCode: row.equipment }] : [],
    orderLines: row.commodity
      ? [{
          lineIdentifier: 1,
          shipItemIdentifier: '',
          productDescription: row.commodity,
          grossWeightValue: row.grossWeight?.value ?? 0,
          grossWeightUomCode: row.grossWeight?.uom ?? 'lbs',
          volumeValue: row.volume?.value ?? 0,
          volumeUomCode: row.volume?.uom ?? 'cbf',
          shipClass: '',
        }]
      : [],
  }
}

/**
 * View Order detail (LINX-10233/10700). live → POST /order-service/v3/order/view
 * → reverse-map the manualOrder. mock → resolution precedence:
 *   1) draft form values (full fidelity)  2) overlay grid row (lean)
 *   3) seeded orders.json (lean)          not found → null.
 * Returns the form-VM shape the read view consumes (OrderReadView, when built).
 */
export async function getOrderView(
  orderNumber: string,
  customerId?: string,
): Promise<OrderFormValues | null> {
  if (getApiMode() === 'live') {
    // OUR backend resolves by orderNumber alone (orders.order_number is UNIQUE;
    // 'pending-<orderId>' keys resolve by internal id) — the Q30 customerId gate
    // applied to the real order-service contract, not this one. The endpoint
    // returns the lean list row + the manual_order enrichment JSONB; compose
    // them exactly like the mock ladder below.
    const { row, manualOrder } = await apiPost<{ row: OrderListRow; manualOrder: Partial<ManualOrder> | null }>(
      '/order-service/v3/order/view', { orderNumber },
    )
    const dto = manualOrder ? { ...listRowToManualOrder(row), ...manualOrder } : listRowToManualOrder(row)
    return mapOrderViewToFormVm(dto)
  }

  const draftId = draftValues.has(orderNumber) ? orderNumber : draftIdByOrderNumber.get(orderNumber)
  if (draftId) {
    const values = draftValues.get(draftId)
    if (values) return structuredClone(values) // full fidelity
  }
  // Number-less pending orders (async create in flight) are addressed by their
  // synthetic grid key `pending-<orderId>` — resolve by internal orderId.
  const pendingId = orderNumber.startsWith('pending-') ? orderNumber.slice('pending-'.length) : null
  const row = pendingId
    ? (getAllOrders() as OrderListRow[]).find(r => !r.orderNumber && String(r.orderId) === pendingId)
    : overlayRows.find(r => r.orderNumber === orderNumber) ??
      (getAllOrders() as OrderListRow[]).find(r => r.orderNumber === orderNumber)
  if (!row) return null
  // Seeded enrichment (order-details.json — generator invariant I8): the full
  // ManualOrder detail (real lines, instructions, services, contacts) layered
  // over the lean row; enrichment line sums equal the row's header totals, so
  // both tiers tell the same story at different fidelity.
  const enrichment = getOrderEnrichment(orderNumber) as Partial<ManualOrder> | null
  const manualOrder = enrichment
    ? { ...listRowToManualOrder(row), ...enrichment }
    : listRowToManualOrder(row)
  return mapOrderViewToFormVm(manualOrder)
}
