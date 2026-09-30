import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseDisplayDate, chunk, insertRows, seed } from './seed.mjs'

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

// The orders column list grew twice (migration 010's interface_error_* pair is
// the latest). insertRows numbers its $N placeholders from cols.length but
// pushes params by row length, so an off-by-one there is SILENT — every value
// lands one column over. This is the guard that makes it loud.
test('insertRows rejects rows that do not line up with the column list', async () => {
  const client = { calls: [], async query(text, params) { this.calls.push([text, params]) } }
  await assert.rejects(
    () => insertRows(client, 'orders', ['a', 'b', 'c'], [[1, 2, 3], [1, 2]]),
    /orders: row 1 has 2 values for 3 columns/,
  )
  assert.equal(client.calls.length, 0) // nothing reached the DB
  await insertRows(client, 'orders', ['a', 'b'], [[1, 2], [3, 4]])
  assert.equal(client.calls.length, 1)
  assert.match(client.calls[0][0], /INSERT INTO orders \(a,b\) VALUES \(\$1,\$2\),\(\$3,\$4\)/)
  assert.deepEqual(client.calls[0][1], [1, 2, 3, 4])
})

test('seed: lineage shells land in shipments (empty) and events only — no orders/tenders/stops/search_index rows (S164 §3)', async () => {
  const calls = []
  const client = { query: async (text, params = []) => { calls.push({ text, params }) } }
  const counts = await seed(client, { totalShipments: 300 })
  assert.ok(counts.hidden_shipments > 0)
  const into = (table) => calls.filter((c) => c.text.startsWith(`INSERT INTO ${table} `))
  const cols = /\(([^)]*)\) VALUES/.exec(into('shipments')[0].text)[1].split(',')
  const rows = into('shipments').flatMap((c) => chunk(c.params, cols.length))
  const hidden = rows.filter((r) => /^24\d{6}$/.test(r[0]))
  const hiddenSells = hidden.map((r) => r[0])
  assert.equal(hidden.length, counts.hidden_shipments)
  assert.ok(hidden.every((r) => r[cols.indexOf('order_count')] === '0' && r[cols.indexOf('orders')].length === 0))
  for (const t of ['orders', 'tenders', 'stops', 'search_index']) {
    assert.ok(!into(t).flatMap((c) => c.params).some((p) => typeof p === 'string' && hiddenSells.includes(p)), `${t} must not carry a hidden id`)
  }
  assert.ok(into('events').flatMap((c) => c.params).some((p) => hiddenSells.includes(p)))
})
