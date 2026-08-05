import { describe, test, expect, beforeEach } from 'vitest'
import {
  listSharedFilters,
  shareFilter,
  renameSharedFilter,
  deleteSharedFilter,
  __clearMockSharedFilters,
} from './sharedFilterService'
import { currentUser } from '../../data/sso-mock'

// Mock mode must behave like live: everyone reads, only the author writes.
// A divergence here would let the panel work in mock and fail in the browser.
beforeEach(() => __clearMockSharedFilters())

describe('sharedFilterService (mock mode)', () => {
  test('a shared filter is listed and carries its author', async () => {
    await shareFilter('f1', 'West Coast', [{ key: 'origin', label: 'Origin: CA' }])
    const all = await listSharedFilters()
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('West Coast')
    expect(all[0].ownerId).toBe(currentUser.id)
    // dotted lowercase, mirroring the server's usernameFor at seed time
    expect(all[0].ownerUsername).toMatch(/^[a-z]+(\.[a-z]+)*$/)
  })

  test('a SET chip keeps codes + typeLabel through the round-trip', async () => {
    const setChip = { key: '__free-text__', kind: 'set', typeLabel: 'Order', codes: [{ code: 'A1' }, { code: 'B2' }] }
    await shareFilter('f2', 'Bulk', [setChip])
    const [stored] = await listSharedFilters()
    const chip = stored.chips[0] as { kind: string; typeLabel: string; codes: unknown[] }
    expect(chip).toMatchObject({ kind: 'set', typeLabel: 'Order' })
    expect(chip.codes).toHaveLength(2)
  })

  test('a DATE-RANGE chip keeps its bounds through the round-trip', async () => {
    await shareFilter('f3', 'Early April', [
      { key: 'date-range-pickup', kind: 'date-range', from: '04/01/2026', to: '04/15/2026', single: false },
    ])
    const [stored] = await listSharedFilters()
    expect(stored.chips[0]).toMatchObject({ from: '04/01/2026', to: '04/15/2026', single: false })
  })

  test('the author can rename and delete', async () => {
    await shareFilter('f4', 'Before', [{ key: 'scac' }])
    const renamed = await renameSharedFilter('f4', 'After')
    expect(renamed.name).toBe('After')
    await deleteSharedFilter('f4')
    expect(await listSharedFilters()).toHaveLength(0)
  })

  test('a non-author can neither rename nor delete', async () => {
    // Written directly with a different owner — simulates someone else's row
    // arriving from the server.
    await shareFilter('f5', 'Theirs', [{ key: 'scac' }])
    const all = await listSharedFilters()
    all[0].ownerId = 'somebody-else'

    await expect(renameSharedFilter('f5', 'Hijacked')).rejects.toThrow(/Not the author/)
    await expect(deleteSharedFilter('f5')).rejects.toThrow(/Not the author/)
    // still there, still named as its author left it
    expect((await listSharedFilters())[0].name).toBe('Theirs')
  })

  test('listing is newest first', async () => {
    await shareFilter('a', 'First', [{ key: 'scac' }])
    await shareFilter('b', 'Second', [{ key: 'scac' }])
    expect((await listSharedFilters()).map((f) => f.name)).toEqual(['Second', 'First'])
  })
})
