import { describe, it, expect } from 'vitest'
import { heroPosition, HERO_POSITIONS, HERO_IMAGES, HERO_IMAGES_LAND } from './heroImages'

// The ocean-freight photos, by file. CarrierBid is TL/LTL-only (user ruling,
// 2026-08-24) so none of these may reach it — this is the guard that fails if
// someone re-points the page at the full set or drops a maritime shot into the
// land subset.
const MARITIME = ['/bg1.webp', '/bg2.webp', '/bg3.webp']

describe('HERO_IMAGES_LAND (CarrierBid / TL-LTL background set)', () => {
  it('excludes every maritime photo', () => {
    for (const src of MARITIME) expect(HERO_IMAGES_LAND).not.toContain(src)
  })

  it('is a subset of the canonical set and still cross-fadeable (2+ images)', () => {
    for (const src of HERO_IMAGES_LAND) expect(HERO_IMAGES).toContain(src)
    expect(HERO_IMAGES_LAND.length).toBeGreaterThan(1)
  })
})

describe('heroPosition', () => {
  it('passes through an in-range configured position', () => {
    expect(heroPosition('/bg2.webp')).toBe('center 90%')
  })

  it('clamps a Y% above 100 down to 100 (bottom-aligned ceiling)', () => {
    HERO_POSITIONS['/bg-test-overflow.webp'] = 'center 150%'
    expect(heroPosition('/bg-test-overflow.webp')).toBe('center 100%')
    delete HERO_POSITIONS['/bg-test-overflow.webp']
  })

  it('clamps a negative Y% up to 0', () => {
    HERO_POSITIONS['/bg-test-negative.webp'] = 'center -20%'
    expect(heroPosition('/bg-test-negative.webp')).toBe('center 0%')
    delete HERO_POSITIONS['/bg-test-negative.webp']
  })

  it('every currently configured position is already in range (no gap)', () => {
    expect(heroPosition('/bg3.webp')).toBe('center 100%')
    expect(heroPosition('/bg4.webp')).toBe('center 100%')
    expect(heroPosition('/bg5.webp')).toBe('center 100%')
  })

  it('never lets a configured value exceed 100%', () => {
    for (const src of Object.keys(HERO_POSITIONS)) {
      const [, y] = heroPosition(src).split(' ')
      expect(parseFloat(y)).toBeLessThanOrEqual(100)
      expect(parseFloat(y)).toBeGreaterThanOrEqual(0)
    }
  })

  it('defaults an unknown src to center', () => {
    expect(heroPosition('/does-not-exist.webp')).toBe('center')
  })
})
