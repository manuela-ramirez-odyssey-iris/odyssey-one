import { describe, it, expect } from 'vitest'
import { createSearchIndex } from './searchIndex-core'

describe('createSearchIndex.clear', () => {
  it('forgets the cached distinct values so rows added at runtime become visible', () => {
    const rows = [{ scac: 'ABCD' }]
    const index = createSearchIndex(() => rows)
    expect(index.distinctMatches('scac', '')).toEqual(['ABCD'])
    rows.push({ scac: 'WXYZ' })
    expect(index.distinctMatches('scac', '')).toEqual(['ABCD']) // cached — the documented ceiling
    index.clear()
    expect(index.distinctMatches('scac', '')).toEqual(['ABCD', 'WXYZ'])
  })
})
