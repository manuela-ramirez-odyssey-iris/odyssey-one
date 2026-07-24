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
