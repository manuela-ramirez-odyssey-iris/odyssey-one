// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import TenderHistoryTab from './TenderHistoryTab'

afterEach(cleanup)

const row = (over) => ({ user: 'Net Native', source: 'Net Native', author: { name: 'Net Native', kind: 'system' }, outcome: 'update', category: 'tender', ...over })

describe('TenderHistoryTab (LINX-17756)', () => {
  it('AC-08: verbatim empty state when no tender events exist', () => {
    render(<TenderHistoryTab data={{ entries: [row({ category: 'create', action: 'Shipment Created', details: 'x', timestamp: '2026-10-01T10:00:00Z' })] }} />)
    expect(screen.getByText('No tender history is available')).toBeTruthy()
    expect(screen.getByText('Tender history will appear here once tender-related events are recorded for this shipment.')).toBeTruthy()
  })

  it('AC-02/03: only tender events, newest first', () => {
    const { container } = render(<TenderHistoryTab data={{ entries: [
      row({ action: 'Tender Sent', details: 'older tender', timestamp: '2026-10-01T10:00:00Z' }),
      row({ action: 'Shipment Created', category: 'create', details: 'not tender', timestamp: '2026-10-01T12:00:00Z' }),
      row({ action: 'Tender Response Received', details: 'newer tender', timestamp: '2026-10-01T11:00:00Z' }),
    ] }} />)
    expect(screen.queryByText('not tender')).toBe(null)
    const details = [...container.querySelectorAll('.history-details')].map((d) => d.textContent)
    expect(details.indexOf('newer tender')).toBeLessThan(details.indexOf('older tender'))
  })

  it('AC-04/06/07: carrier, notify and response methods; status diff; Option Note', () => {
    render(<TenderHistoryTab data={{ entries: [row({
      action: 'Decline', details: 'Decline on carrier BBBB.', timestamp: '2026-10-01T10:00:00Z',
      scac: 'BBBB', carrierName: 'Bravo Freight', notifyMethod: 'Email', responseMethod: 'Email Links Update',
      field: 'Tender Status', oldValue: 'Accepted', newValue: 'Declined',
      optionNote: { code: 'WRP', description: 'Wrong Price', comment: 'driver quit', carrierGaveBack: true },
    })] }} />)
    expect(screen.getByText('Carrier: BBBB – Bravo Freight · Notify: Email · Response: Email Links Update')).toBeTruthy()
    expect(screen.getByText('Accepted')).toBeTruthy()
    expect(screen.getByText('Declined')).toBeTruthy()
    expect(screen.getByText('Option Note: WRP - Wrong Price · "driver quit" · ☑ Carrier Gave Back the Load')).toBeTruthy()
  })

  it('AC-05: a system actor reads System (OdysseyOne)', () => {
    render(<TenderHistoryTab data={{ entries: [row({ action: 'Tender Sent', details: 'd', timestamp: '2026-10-01T10:00:00Z' })] }} />)
    expect(screen.getByText('System (OdysseyOne)')).toBeTruthy()
  })
})
