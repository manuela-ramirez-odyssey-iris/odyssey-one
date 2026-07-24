import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseDisplayDate, chunk } from './seed.mjs'

test('parseDisplayDate converts MM/DD/YYYY HH:MM CST to ISO', () => {
  assert.equal(parseDisplayDate('04/18/2026 10:30 CST'), '2026-04-18T10:30:00-06:00')
  assert.equal(parseDisplayDate(null), null)
  assert.equal(parseDisplayDate(''), null)
})

test('chunk splits arrays', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
})
