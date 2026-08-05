import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildListSharedFiltersQuery, buildInsertSharedFilterQuery, buildGetOwnerQuery,
  buildRenameSharedFilterQuery, buildDeleteSharedFilterQuery,
  listSharedFilters, createSharedFilter, renameSharedFilter, deleteSharedFilter,
} from './sharedFilters.mjs'

// ── Builders: parameterized SQL, no raw concatenation ───────────────────────

test('list query: no params, joins users for the author username, newest first', () => {
  const q = buildListSharedFiltersQuery()
  assert.deepEqual(q.values, [])
  assert.match(q.text, /JOIN users u ON u\.id = sf\.owner_user_id/)
  assert.match(q.text, /ORDER BY sf\.created_at DESC/)
})

test('insert query: $1-$4 params, chips serialized as jsonb, nothing concatenated', () => {
  const evil = `x'); DROP TABLE shared_filters;--`
  const q = buildInsertSharedFilterQuery('f1', 'planner-ava', evil, [{ key: 'k', value: 1 }])
  assert.match(q.text, /VALUES \(\$1, \$2, \$3, \$4::jsonb\)/)
  assert.deepEqual(q.values, ['f1', 'planner-ava', evil, '[{"key":"k","value":1}]'])
  assert.ok(!q.text.includes(evil), 'raw user value must never appear in the SQL text')
})

test('get-owner query: parameterized by id', () => {
  const q = buildGetOwnerQuery('f1')
  assert.match(q.text, /WHERE id = \$1/)
  assert.deepEqual(q.values, ['f1'])
})

test('rename query: parameterized id + name, nothing concatenated', () => {
  const evil = `Renamed'; DROP TABLE users;--`
  const q = buildRenameSharedFilterQuery('f1', evil)
  assert.match(q.text, /SET name = \$2 WHERE id = \$1/)
  assert.deepEqual(q.values, ['f1', evil])
  assert.ok(!q.text.includes(evil))
})

test('delete query: parameterized by id', () => {
  const q = buildDeleteSharedFilterQuery('f1')
  assert.match(q.text, /DELETE FROM shared_filters WHERE id = \$1/)
  assert.deepEqual(q.values, ['f1'])
})

// ── GET: unscoped — every caller sees every filter ──────────────────────────

test('listSharedFilters: returns all rows regardless of who is asking (no userId param taken)', async () => {
  const rows = [
    { id: 'f1', ownerId: 'planner-ava', ownerUsername: 'ava.planner', name: 'A', chips: [], createdAt: '2026-08-05T00:00:00Z' },
    { id: 'f2', ownerId: 'planner-ben', ownerUsername: 'ben.planner', name: 'B', chips: [], createdAt: '2026-08-04T00:00:00Z' },
  ]
  let seenQuery
  const db = { query: async (q) => { seenQuery = q; return { rows } } }
  const out = await listSharedFilters({ db })
  assert.deepEqual(out, { filters: rows })
  assert.deepEqual(seenQuery.values, []) // no scoping value sent at all
})

// ── POST: create/share ───────────────────────────────────────────────────────

test('createSharedFilter: 400 on missing id/name/chips', async () => {
  const db = { query: async () => ({ rows: [] }) }
  await assert.rejects(() => createSharedFilter({ body: { name: 'n', chips: [{}] }, db }), (e) => e.status === 400)
  await assert.rejects(() => createSharedFilter({ body: { id: 'f1', chips: [{}] }, db }), (e) => e.status === 400)
  await assert.rejects(() => createSharedFilter({ body: { id: 'f1', name: 'n', chips: [] }, db }), (e) => e.status === 400)
})

test('createSharedFilter: writes with owner = userId (defaults to guest), returns the row', async () => {
  let seen
  const returned = { id: 'f1', ownerId: 'guest', name: 'n', chips: [{ a: 1 }], createdAt: 'now' }
  const db = { query: async (q) => { seen = q; return { rows: [returned] } } }
  const out = await createSharedFilter({ body: { id: 'f1', name: 'n', chips: [{ a: 1 }] }, db })
  assert.deepEqual(out, { filter: returned })
  assert.equal(seen.values[1], 'guest')
})

test('createSharedFilter: FK violation -> 400, unique violation -> 409', async () => {
  const fkDb = { query: async () => { const e = new Error('fk'); e.code = '23503'; throw e } }
  await assert.rejects(
    () => createSharedFilter({ body: { id: 'f1', name: 'n', chips: [{}], userId: 'nobody' }, db: fkDb }),
    (e) => e.status === 400 && /Unknown user/.test(e.message),
  )
  const dupDb = { query: async () => { const e = new Error('dup'); e.code = '23505'; throw e } }
  await assert.rejects(
    () => createSharedFilter({ body: { id: 'f1', name: 'n', chips: [{}] }, db: dupDb }),
    (e) => e.status === 409,
  )
})

// ── PATCH/DELETE: author-only ────────────────────────────────────────────────

function ownerDb(ownerId, { onAct } = {}) {
  return {
    query: async (q) => {
      if (/SELECT owner_user_id/.test(q.text)) return { rows: ownerId ? [{ ownerId }] : [] }
      onAct?.(q)
      return { rows: [{ id: q.values[0], name: q.values[1] }] }
    },
  }
}

test('renameSharedFilter: rejects a non-author with 403', async () => {
  const db = ownerDb('planner-ava')
  await assert.rejects(
    () => renameSharedFilter({ params: ['f1'], body: { name: 'New', userId: 'planner-ben' }, db }),
    (e) => e.status === 403,
  )
})

test('renameSharedFilter: 404 when the filter does not exist', async () => {
  const db = ownerDb(null)
  await assert.rejects(
    () => renameSharedFilter({ params: ['nope'], body: { name: 'New', userId: 'planner-ava' }, db }),
    (e) => e.status === 404,
  )
})

test('renameSharedFilter: author succeeds', async () => {
  const db = ownerDb('planner-ava')
  const out = await renameSharedFilter({ params: ['f1'], body: { name: 'New Name', userId: 'planner-ava' }, db })
  assert.deepEqual(out, { filter: { id: 'f1', name: 'New Name' } })
})

test('deleteSharedFilter: rejects a non-author with 403', async () => {
  const db = ownerDb('planner-ava')
  await assert.rejects(
    () => deleteSharedFilter({ params: ['f1'], body: { userId: 'planner-ben' }, db }),
    (e) => e.status === 403,
  )
})

test('deleteSharedFilter: 404 when the filter does not exist', async () => {
  const db = ownerDb(null)
  await assert.rejects(
    () => deleteSharedFilter({ params: ['nope'], body: { userId: 'planner-ava' }, db }),
    (e) => e.status === 404,
  )
})

test('deleteSharedFilter: author succeeds', async () => {
  let deleted = false
  const db = {
    query: async (q) => {
      if (/SELECT owner_user_id/.test(q.text)) return { rows: [{ ownerId: 'planner-ava' }] }
      deleted = true
      return { rows: [] }
    },
  }
  const out = await deleteSharedFilter({ params: ['f1'], body: { userId: 'planner-ava' }, db })
  assert.deepEqual(out, { success: true })
  assert.ok(deleted)
})

// ── Round-trip: the whole reason storage is chip OBJECTS ────────────────────
// A GS-21 set chip (codes + typeLabel) and a GS-22 date-range chip must survive
// the jsonb round trip byte-for-byte — that's what distinguishes this store
// from the old flattened `{ id, title, conditions[] }` shape (GS-10, superseded).

test('round-trips a set chip (codes + typeLabel) through the chips jsonb param', () => {
  const setChip = {
    key: 'scac', kind: 'set', label: 'SCAC Set', attrLabel: 'SCAC',
    queryValue: 'FXFE, JBHT', dataKey: 'scac', group: 'Carrier',
    codes: [{ value: 'FXFE', valid: true }, { value: 'JBHT', valid: true }],
    typeLabel: 'SCAC',
  }
  const q = buildInsertSharedFilterQuery('f1', 'planner-ava', 'Two Carriers', [setChip])
  const roundTripped = JSON.parse(q.values[3])
  assert.deepEqual(roundTripped, [setChip])
  assert.deepEqual(roundTripped[0].codes, setChip.codes)
  assert.equal(roundTripped[0].typeLabel, 'SCAC')
})

test('round-trips a date-range chip through the chips jsonb param', () => {
  const dateChip = {
    key: 'ship-date', kind: 'date-range', dateLabel: 'Ship Date', single: false,
    from: '2026-08-01', to: '2026-08-10', label: 'Ship Date: 08/01/2026 - 08/10/2026',
  }
  const q = buildInsertSharedFilterQuery('f2', 'planner-ava', 'August window', [dateChip])
  const roundTripped = JSON.parse(q.values[3])
  assert.deepEqual(roundTripped, [dateChip])
  assert.equal(roundTripped[0].from, '2026-08-01')
  assert.equal(roundTripped[0].to, '2026-08-10')
})
