import { computeVerticalPlacement } from './useAnchoredPortal.jsx'

describe('computeVerticalPlacement', () => {
  it('opens below (default) when the menu fits under the trigger', () => {
    // spaceBelow = 800 - 120 = 680 >= 80 + 2 → bottom; top = 120 + 2
    expect(computeVerticalPlacement(100, 120, 80, 800)).toEqual({ placement: 'bottom', top: 122 })
  })

  it('flips up when the menu does not fit below but fits above', () => {
    // spaceBelow = 760 - 720 = 40 < 102; spaceAbove = 700 >= 102 → top; top = 700 - 100 - 2
    expect(computeVerticalPlacement(700, 720, 100, 760)).toEqual({ placement: 'top', top: 598 })
  })

  it('fits neither side → picks the side with more room (above)', () => {
    // spaceBelow = 440 - 420 = 20; spaceAbove = 400; above has more → top; top = 400 - 500 - 2
    expect(computeVerticalPlacement(400, 420, 500, 440)).toEqual({ placement: 'top', top: -102 })
  })

  it('fits neither side → picks the side with more room (below)', () => {
    // spaceBelow = 300 - 40 = 260; spaceAbove = 20; below has more → bottom; top = 40 + 2
    expect(computeVerticalPlacement(20, 40, 500, 300)).toEqual({ placement: 'bottom', top: 42 })
  })

  it('applies the gap to the anchor offset', () => {
    // gap = 8, fits below → top = 120 + 8
    expect(computeVerticalPlacement(100, 120, 80, 800, 8)).toEqual({ placement: 'bottom', top: 128 })
  })
})
