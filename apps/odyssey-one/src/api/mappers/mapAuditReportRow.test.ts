import { describe, it, expect } from 'vitest'
import { mapAuditReportRow } from './mapAuditReportRow'

describe('mapAuditReportRow', () => {
  it('maps enum codes to the AC labels and a user actor to "email · name"', () => {
    const row = mapAuditReportRow({
      auditId: 12, changeTimestamp: '2026-09-10T14:30:00', timeZoneCode: 'CDT',
      changeMadeBy: 'USER', userEmail: 'jane@odyssey.local', userName: 'Jane Doe',
      changeType: 'ORDER_EVENT', changeCategory: 'HOLD_RELEASED_LINE', lineItemId: 3,
      changes: [{ fieldName: 'Gross Weight', oldValue: '100 lb', newValue: '150 lb' }],
    })
    expect(row).toEqual({
      id: '12', timestamp: '2026-09-10T14:30:00', timeZoneCode: 'CDT',
      changedBy: 'User', source: 'jane@odyssey.local · Jane Doe',
      changeType: 'Order Event', changeCategory: 'Order Released from Hold (Line Item Editing)',
      lineItemId: '3', changes: [{ field: 'Gross Weight', oldValue: '100 lb', newValue: '150 lb' }],
    })
  })
  it('passes an already-labelled category through and tolerates missing pieces', () => {
    const row = mapAuditReportRow({ auditId: 1, changeTimestamp: '2026-01-01T00:00:00', changeMadeBy: 'SYSTEM', source: 'LINX', changeType: 'Order Event', changeCategory: 'Order Full Cancellation', lineItemId: '' })
    expect(row.changeCategory).toBe('Order Full Cancellation')
    expect(row.source).toBe('LINX')
    expect(row.timeZoneCode).toBe('')
    expect(row.lineItemId).toBeNull()
    expect(row.changes).toEqual([])
  })
})
