// api/_lib/router.mjs — path table for the OdysseyONE-shaped endpoints.
import { categoryCounts, shipmentErrorList, sellShipmentDetail, saveTender, saveShipmentOverrides, resolveOrderChange } from './shipments.mjs'
import { orderList, orderTabCounts, orderView, updateOrder, updateOrderStatus, createOrder } from './orders.mjs'
import { getPreference, putPreference } from './preferences.mjs'
import { listSharedFilters, createSharedFilter, renameSharedFilter, deleteSharedFilter } from './sharedFilters.mjs'
import { getSpotState, putSpotState, deleteSpotState } from './spot.mjs'
import { searchHandler, suggestHandler, valuesHandler } from './search.mjs'

// Exact `path` match, or `pattern` (RegExp) whose capture groups become handler params.
export const ROUTES = [
  { name: 'categoryCounts',    method: 'GET',  path: '/shipment-service/v1/shipment/error/category/count', handler: categoryCounts },
  { name: 'shipmentErrorList', method: 'POST', path: '/shipment-service/pgi-pgr/v1/error/list',            handler: shipmentErrorList },
  { name: 'orderList',         method: 'POST', path: '/order-service/v3/order/list',                       handler: orderList },
  { name: 'orderTabCounts',    method: 'GET',  path: '/order-service/v3/order/tab-counts',                 handler: orderTabCounts },
  { name: 'sellShipmentDetail', method: 'GET', pattern: /^\/shipment-service\/v1\/sell-shipment-out\/(\d+)$/, handler: sellShipmentDetail },
  { name: 'saveTender',        method: 'PUT',  pattern: /^\/shipment-service\/v1\/sell-shipment-out\/(\d+)\/tender$/, handler: saveTender },
  { name: 'saveShipmentOverrides', method: 'PATCH', pattern: /^\/shipment-service\/v1\/sell-shipment-out\/(\d+)\/overrides$/, handler: saveShipmentOverrides },
  { name: 'resolveOrderChange', method: 'PATCH', pattern: /^\/shipment-service\/v1\/sell-shipment-out\/(\d+)\/order-change$/, handler: resolveOrderChange },
  { name: 'orderView',         method: 'POST', path: '/order-service/v3/order/view',                        handler: orderView },
  { name: 'updateOrder',       method: 'PUT',  path: '/order-service/v3/order',                             handler: updateOrder },
  { name: 'updateOrderStatus', method: 'PATCH', path: '/order-service/v3/order/status',                     handler: updateOrderStatus },
  { name: 'createOrder',       method: 'POST', path: '/order-service/v3/manual-order',                      handler: createOrder },
  { name: 'getPreference',     method: 'GET',  path: '/user-service/v1/preference',                         handler: getPreference },
  { name: 'putPreference',     method: 'PUT',  path: '/user-service/v1/preference',                         handler: putPreference },
  { name: 'listSharedFilters',  method: 'GET',    path: '/filter-service/v1/shared-filters',                  handler: listSharedFilters },
  { name: 'createSharedFilter', method: 'POST',   path: '/filter-service/v1/shared-filters',                  handler: createSharedFilter },
  { name: 'renameSharedFilter', method: 'PATCH',  pattern: /^\/filter-service\/v1\/shared-filters\/([^/]+)$/, handler: renameSharedFilter },
  { name: 'deleteSharedFilter', method: 'DELETE', pattern: /^\/filter-service\/v1\/shared-filters\/([^/]+)$/, handler: deleteSharedFilter },
  { name: 'getSpotState',    method: 'GET',    pattern: /^\/spot-service\/v1\/spot\/([^/]+)$/, handler: getSpotState },
  { name: 'putSpotState',    method: 'PUT',    pattern: /^\/spot-service\/v1\/spot\/([^/]+)$/, handler: putSpotState },
  { name: 'deleteSpotState', method: 'DELETE', pattern: /^\/spot-service\/v1\/spot\/([^/]+)$/, handler: deleteSpotState },
  // Paths here are POST-/api-STRIPPED (index.js:12) — the client posts to
  // /api/v1/search. QUERY-shaped in everything but the verb: RFC 10008 QUERY is
  // the target, but Vercel 400s it and CloudFront rejects it outright (spec §5).
  { name: 'search',            method: 'POST', path: '/v1/search',                                          handler: searchHandler },
  { name: 'searchSuggest',     method: 'POST', path: '/v1/search/suggest',                                  handler: suggestHandler },
  { name: 'searchValues',      method: 'POST', path: '/v1/search/values',                                   handler: valuesHandler },
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
