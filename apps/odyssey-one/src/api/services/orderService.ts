import { getApiMode } from '../config'
import { apiPost } from '../client'
import { getAllOrders } from '../../data/orders'
import type { OrderListRequest, OrderListResponse, OrderListRow } from '../types/orderList'

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

  let rows = getAllOrders() as OrderListRow[]

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
