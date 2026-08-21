import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGetSpotStateQuery,
  buildPutSpotStateQuery,
  buildDeleteSpotStateQuery,
  getSpotState,
  putSpotState,
  deleteSpotState,
} from './spot.mjs'

test('get spot state: parameterized by shipment + kind', () => {
  const q = buildGetSpotStateQuery('0000000091105', 'quote')
  assert.match(q.text, /shipment_id = \$1 AND kind = \$2/)
  assert.deepEqual(q.values, ['0000000091105', 'quote'])
})

test('put spot state: upsert on (shipment_id, kind), value serialized as jsonb', () => {
  const q = buildPutSpotStateQuery('0000000091105', 'drafts', [{ id: 'd1' }])
  assert.match(q.text, /ON CONFLICT \(shipment_id, kind\) DO UPDATE/)
  assert.deepEqual(q.values, ['0000000091105', 'drafts', '[{"id":"d1"}]'])
})

test('delete spot state: parameterized by shipment + kind', () => {
  const q = buildDeleteSpotStateQuery('0000000091105', 'quote')
  assert.match(q.text, /DELETE FROM spot_state WHERE shipment_id = \$1 AND kind = \$2/)
  assert.deepEqual(q.values, ['0000000091105', 'quote'])
})

test('getSpotState handler: returns null when nothing stored, 400 on bad kind', async () => {
  let seen
  const db = { query: async (q) => { seen = q; return { rows: [] } } }
  const out = await getSpotState({ params: ['S1'], query: new URLSearchParams('kind=quote'), db })
  assert.deepEqual(seen.values, ['S1', 'quote'])
  assert.deepEqual(out, { value: null })
  await assert.rejects(
    () => getSpotState({ params: ['S1'], query: new URLSearchParams('kind=nope'), db }),
    (e) => e.status === 400,
  )
})

test('getSpotState handler: returns stored value', async () => {
  const db = { query: async () => ({ rows: [{ value: { status: 'open' } }] }) }
  const out = await getSpotState({ params: ['S1'], query: new URLSearchParams('kind=quote'), db })
  assert.deepEqual(out.value, { status: 'open' })
})

test('putSpotState handler: writes and returns success; 400 on bad kind/missing value', async () => {
  let seen
  const db = { query: async (q) => { seen = q; return { rows: [] } } }
  const out = await putSpotState({ params: ['S1'], body: { kind: 'quote', value: { status: 'draft' } }, db })
  assert.deepEqual(out, { success: true })
  assert.deepEqual(seen.values, ['S1', 'quote', '{"status":"draft"}'])
  await assert.rejects(
    () => putSpotState({ params: ['S1'], body: { kind: 'nope', value: 1 }, db }),
    (e) => e.status === 400,
  )
  await assert.rejects(
    () => putSpotState({ params: ['S1'], body: { kind: 'quote' }, db }),
    (e) => e.status === 400,
  )
})

test('deleteSpotState handler: deletes and returns success; 400 on bad kind', async () => {
  let seen
  const db = { query: async (q) => { seen = q; return { rows: [] } } }
  const out = await deleteSpotState({ params: ['S1'], query: new URLSearchParams('kind=drafts'), db })
  assert.deepEqual(out, { success: true })
  assert.deepEqual(seen.values, ['S1', 'drafts'])
  await assert.rejects(
    () => deleteSpotState({ params: ['S1'], query: new URLSearchParams('kind=nope'), db }),
    (e) => e.status === 400,
  )
})
