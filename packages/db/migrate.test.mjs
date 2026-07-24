import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pendingMigrations } from './migrate.mjs'

test('pendingMigrations sorts and filters applied', () => {
  const files = ['003_c.sql', '001_a.sql', '002_b.sql', 'README.md']
  const applied = new Set(['001_a.sql'])
  assert.deepEqual(pendingMigrations(files, applied), ['002_b.sql', '003_c.sql'])
})
