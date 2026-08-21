// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { listDrafts, saveDraftSnapshot, removeDraft } from './draftStore.js'

const PAYLOAD = { listId: 'a', listName: 'TL', durationMin: 30, carriers: [], flexiblePickup: false }

beforeEach(() => localStorage.clear())

it('saves and lists snapshots, newest first', () => {
  saveDraftSnapshot('S1', PAYLOAD, 1000)
  saveDraftSnapshot('S1', { ...PAYLOAD, durationMin: 60 }, 2000)
  const drafts = listDrafts('S1')
  expect(drafts).toHaveLength(2)
  expect(drafts[0].payload.durationMin).toBe(60)
  expect(drafts[0].savedAt).toBe(2000)
})

it('removes by id and is scoped per shipment', () => {
  const d = saveDraftSnapshot('S1', PAYLOAD, 1000)
  saveDraftSnapshot('S2', PAYLOAD, 1000)
  removeDraft('S1', d.id)
  expect(listDrafts('S1')).toHaveLength(0)
  expect(listDrafts('S2')).toHaveLength(1)
})
