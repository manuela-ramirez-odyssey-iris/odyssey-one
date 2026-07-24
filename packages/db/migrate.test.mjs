import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pendingMigrations } from './migrate.mjs'

test('pendingMigrations sorts and filters applied', () => {
  const files = ['003_c.sql', '001_a.sql', '002_b.sql', 'README.md']
  const applied = new Set(['001_a.sql'])
  assert.deepEqual(pendingMigrations(files, applied), ['002_b.sql', '003_c.sql'])
})

test('pendingMigrations orders lexicographically at the 3-digit convention', () => {
  const files = ['010_j.sql', '003_c.sql', '001_a.sql']
  const out = pendingMigrations(files, new Set())
  assert.deepEqual(out, ['001_a.sql', '003_c.sql', '010_j.sql'])
  assert.ok(out.indexOf('010_j.sql') > out.indexOf('003_c.sql'))
})
