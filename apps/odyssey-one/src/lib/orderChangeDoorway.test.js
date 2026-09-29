import { describe, expect, it } from 'vitest'
import { consolidatedReviewPending } from './orderChangeDoorway.js'

describe('consolidatedReviewPending (C20)', () => {
  it.each([
    [null, false],
    [{ resolution: null }, false],                                                    // Direct
    [{ consolidation: {}, resolution: null }, true],                                  // pending review
    [{ consolidation: { stopsSaved: true }, resolution: null }, false],              // Scenario A saved → Direct decision
    [{ consolidation: {}, resolution: { action: 'approve-plan' } }, false],          // resolved
  ])('%j → %s', (oc, want) => expect(consolidatedReviewPending(oc)).toBe(want))
})
