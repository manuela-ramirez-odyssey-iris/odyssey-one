import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildGetPreferenceQuery, buildPutPreferenceQuery, getPreference, putPreference } from './preferences.mjs'

test('get preference: parameterized by user + key', () => {
  const q = buildGetPreferenceQuery('planner-ava', 'shipments.columnPresets')
  assert.match(q.text, /user_id = \$1 AND key = \$2/)
  assert.deepEqual(q.values, ['planner-ava', 'shipments.columnPresets'])
})

test('put preference: upsert on (user_id, key), value serialized as jsonb', () => {
  const q = buildPutPreferenceQuery('guest', 'k', { a: 1 })
  assert.match(q.text, /ON CONFLICT \(user_id, key\) DO UPDATE/)
  assert.deepEqual(q.values, ['guest', 'k', '{"a":1}'])
})

test('getPreference handler: defaults userId to guest, null when missing', async () => {
  let seen
  const db = { query: async (q) => { seen = q; return { rows: [] } } }
  const out = await getPreference({ query: new URLSearchParams('key=shipments.columnPresets'), db })
  assert.equal(seen.values[0], 'guest')
  assert.deepEqual(out, { key: 'shipments.columnPresets', value: null })
})

test('getPreference handler: returns stored value, 400 without key', async () => {
  const db = { query: async () => ({ rows: [{ value: { x: 2 } }] }) }
  const out = await getPreference({ query: new URLSearchParams('key=k&userId=planner-ava'), db })
  assert.deepEqual(out.value, { x: 2 })
  await assert.rejects(() => getPreference({ query: new URLSearchParams(), db }), (e) => e.status === 400)
})

test('putPreference handler: writes and returns success; 400 on missing key/value', async () => {
  let seen
  const db = { query: async (q) => { seen = q; return { rows: [] } } }
  const out = await putPreference({ body: { key: 'k', value: [1, 2], userId: 'planner-ava' }, db })
  assert.deepEqual(out, { success: true })
  assert.deepEqual(seen.values, ['planner-ava', 'k', '[1,2]'])
  await assert.rejects(() => putPreference({ body: { value: 1 }, db }), (e) => e.status === 400)
  await assert.rejects(() => putPreference({ body: { key: 'k' }, db }), (e) => e.status === 400)
})

test('putPreference handler: FK violation surfaces as 400 unknown user', async () => {
  const db = { query: async () => { const e = new Error('fk'); e.code = '23503'; throw e } }
  await assert.rejects(
    () => putPreference({ body: { key: 'k', value: 1, userId: 'nobody' }, db }),
    (e) => e.status === 400 && /Unknown user/.test(e.message),
  )
})
