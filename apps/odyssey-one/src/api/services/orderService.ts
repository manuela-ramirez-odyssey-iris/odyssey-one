import { getApiMode } from '../config'
import { apiPost } from '../client'
import { getAllOrders } from '../../data/orders'
import type { OrderListRequest, OrderListResponse, OrderListRow } from '../types/orderList'
import { mapFormToOrderInterface } from '../mappers/mapFormToOrderInterface'
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

export async function getOrderList(request: OrderListRequest): Promise<OrderListResponse> {
  if (getApiMode() === 'live') {
    return apiPost<OrderListResponse>('/order-service/v3/order/list', request)
  }

  let rows = [...overlayRows, ...(getAllOrders() as OrderListRow[])]

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

  // LLD example default: orderNumber asc. Top-level string fields only — the
  // toolbar only sorts orderNumber in this build (A4/Q31).
  const sort = request.sort ?? { field: 'orderNumber', direction: 'asc' }
  const dir = sort.direction === 'desc' ? -1 : 1
  rows = [...rows].sort((a, b) => {
    const av = String((a as unknown as Record<string, unknown>)[sort.field] ?? '')
    const bv = String((b as unknown as Record<string, unknown>)[sort.field] ?? '')
    return av.localeCompare(bv) * dir
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
      country: 'US',
      earliestPickupDateTime: mo.requestedPickupDate ?? '',
      latestPickupDateTime: mo.pickupAppointment ?? '',
    },
    consignee: {
      locationId: mo.destinationPartnerId ?? '',
      city: mo.destinationCity ?? '',
      state: mo.destinationRegion ?? '',
      country: 'US',
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
