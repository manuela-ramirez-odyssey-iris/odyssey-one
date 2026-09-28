import { describe, expect, test } from 'vitest'
import { SHIPMENT_STATUSES, SHIPMENT_STATUS_VARIANT, shipmentStatusFor } from './shipmentStatus'

describe('shipmentStatusFor (DEC-204)', () => {
  test.each([
    ['monitoring', 'hold', 'Hold'],
    ['monitoring', 'consolidation', 'Consolidation'],
    ['monitoring', 'sent', 'Approved'],
    ['monitoring', 'approved', 'Done'],
    ['monitoring', 'spotbid', 'Review'],
    ['exceptions', 'bid-review', 'Review'],
    ['exceptions', 'order-change', 'Review'],
    ['exceptions', 'tender-review', 'Review'],
  ])('%s/%s → %s', (panel, category, status) => {
    expect(shipmentStatusFor({ panel, category })).toBe(status)
  })

  test('every status has a badge variant', () => {
    for (const s of SHIPMENT_STATUSES) expect(SHIPMENT_STATUS_VARIANT[s]).toBeTruthy()
  })
})
