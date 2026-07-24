// api/_lib/router.mjs — path table for the OdysseyONE-shaped endpoints.
import { categoryCounts, shipmentErrorList } from './shipments.mjs'
import { orderList, orderTabCounts } from './orders.mjs'

export const ROUTES = [
  { name: 'categoryCounts',    method: 'GET',  path: '/shipment-service/v1/shipment/error/category/count', handler: categoryCounts },
  { name: 'shipmentErrorList', method: 'POST', path: '/shipment-service/pgi-pgr/v1/error/list',            handler: shipmentErrorList },
  { name: 'orderList',         method: 'POST', path: '/order-service/v3/order/list',                       handler: orderList },
  { name: 'orderTabCounts',    method: 'GET',  path: '/order-service/v3/order/tab-counts',                 handler: orderTabCounts },
]

export function matchRoute(method, pathname) {
  return ROUTES.find((r) => r.method === method && r.path === pathname) ?? null
}
