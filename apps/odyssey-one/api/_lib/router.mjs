// api/_lib/router.mjs — path table for the OdysseyONE-shaped endpoints.
import { categoryCounts, shipmentErrorList, sellShipmentDetail, saveTender } from './shipments.mjs'
import { orderList, orderTabCounts, orderView, updateOrder, updateOrderStatus } from './orders.mjs'
import { getPreference, putPreference } from './preferences.mjs'

// Exact `path` match, or `pattern` (RegExp) whose capture groups become handler params.
export const ROUTES = [
  { name: 'categoryCounts',    method: 'GET',  path: '/shipment-service/v1/shipment/error/category/count', handler: categoryCounts },
  { name: 'shipmentErrorList', method: 'POST', path: '/shipment-service/pgi-pgr/v1/error/list',            handler: shipmentErrorList },
  { name: 'orderList',         method: 'POST', path: '/order-service/v3/order/list',                       handler: orderList },
  { name: 'orderTabCounts',    method: 'GET',  path: '/order-service/v3/order/tab-counts',                 handler: orderTabCounts },
  { name: 'sellShipmentDetail', method: 'GET', pattern: /^\/shipment-service\/v1\/sell-shipment-out\/(\d+)$/, handler: sellShipmentDetail },
  { name: 'saveTender',        method: 'PUT',  pattern: /^\/shipment-service\/v1\/sell-shipment-out\/(\d+)\/tender$/, handler: saveTender },
  { name: 'orderView',         method: 'POST', path: '/order-service/v3/order/view',                        handler: orderView },
  { name: 'updateOrder',       method: 'PUT',  path: '/order-service/v3/order',                             handler: updateOrder },
  { name: 'updateOrderStatus', method: 'PATCH', path: '/order-service/v3/order/status',                     handler: updateOrderStatus },
  { name: 'getPreference',     method: 'GET',  path: '/user-service/v1/preference',                         handler: getPreference },
  { name: 'putPreference',     method: 'PUT',  path: '/user-service/v1/preference',                         handler: putPreference },
]

export function matchRoute(method, pathname) {
  for (const r of ROUTES) {
    if (r.method !== method) continue
    if (r.path === pathname) return { ...r, params: [] }
    if (r.pattern) {
      const m = r.pattern.exec(pathname)
      if (m) return { ...r, params: m.slice(1) }
    }
  }
  return null
}
