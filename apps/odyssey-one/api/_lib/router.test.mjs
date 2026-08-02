import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchRoute, ROUTES } from './router.mjs'

test('matches category count route', () => {
  const m = matchRoute('GET', '/shipment-service/v1/shipment/error/category/count')
  assert.ok(m)
  assert.equal(m.name, 'categoryCounts')
})

test('matches error list + order list + tab counts', () => {
  assert.equal(matchRoute('POST', '/shipment-service/pgi-pgr/v1/error/list').name, 'shipmentErrorList')
  assert.equal(matchRoute('POST', '/order-service/v3/order/list').name, 'orderList')
  assert.equal(matchRoute('GET', '/order-service/v3/order/tab-counts').name, 'orderTabCounts')
})

test('unknown route returns null', () => {
  assert.equal(matchRoute('GET', '/nope'), null)
})

test('every route has a handler function', () => {
  for (const r of ROUTES) assert.equal(typeof r.handler, 'function')
})

test('matches sell-shipment-out detail route with id param', () => {
  const m = matchRoute('GET', '/shipment-service/v1/sell-shipment-out/25004876')
  assert.equal(m.name, 'sellShipmentDetail')
  assert.deepEqual(m.params, ['25004876'])
  assert.equal(matchRoute('GET', '/shipment-service/v1/sell-shipment-out/'), null)
  assert.equal(matchRoute('GET', '/shipment-service/v1/sell-shipment-out/abc'), null)
})

test('matches PATCH order status route', () => {
  const m = matchRoute('PATCH', '/order-service/v3/order/status')
  assert.equal(m.name, 'updateOrderStatus')
  assert.equal(matchRoute('POST', '/order-service/v3/order/status'), null)
})

// index.js strips the /api prefix before dispatch, so these paths must NOT carry
// it. Registering them as '/api/v1/search' matches nothing and 404s every search.
test('search routes match the /api-STRIPPED path the entry point passes', () => {
  assert.equal(matchRoute('POST', '/v1/search').name, 'search')
  assert.equal(matchRoute('POST', '/v1/search/suggest').name, 'searchSuggest')
  assert.equal(matchRoute('POST', '/api/v1/search'), null)
})

test('no route path carries the /api prefix the entry point already removed', () => {
  for (const r of ROUTES) {
    assert.ok(!r.path?.startsWith('/api/'), `route "${r.name}" would never match`)
  }
})
