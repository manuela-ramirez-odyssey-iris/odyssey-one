import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseDisplayDate, chunk } from './seed.mjs'

test('parseDisplayDate converts MM/DD/YYYY HH:MM <TZ> to ISO', () => {
  assert.equal(parseDisplayDate('04/18/2026 10:30 CST'), '2026-04-18T10:30:00-06:00')
  // DST abbreviations carry their OWN offset — hardcoding -06:00 would shift
  // every summer timestamp by an hour (and previously NULLed them outright)
  assert.equal(parseDisplayDate('07/18/2026 10:30 CDT'), '2026-07-18T10:30:00-05:00')
  assert.equal(parseDisplayDate('07/18/2026 10:30 EDT'), '2026-07-18T10:30:00-04:00')
  assert.equal(parseDisplayDate('01/18/2026 10:30 MST'), '2026-01-18T10:30:00-07:00')
  assert.equal(parseDisplayDate('07/18/2026 10:30 PDT'), '2026-07-18T10:30:00-07:00')
  assert.equal(parseDisplayDate('07/18/2026 10:30 ZZZ'), null) // unknown zone
  assert.equal(parseDisplayDate(null), null)
  assert.equal(parseDisplayDate(''), null)
})

test('chunk splits arrays', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
})
