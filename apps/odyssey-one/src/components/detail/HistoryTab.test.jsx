// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import HistoryTab from './HistoryTab'

afterEach(cleanup)

describe('HistoryTab', () => {
  it('renders entries with an absolute MM/DD/YYYY HH:MM timestamp', () => {
    const data = {
      entries: [
        { user: 'Jana Soundararajan', timestamp: '2026-06-02T14:05:00.000Z', action: 'Order Created', category: 'create', details: 'Order L14372086 created for USALCO' },
      ],
    }
    render(<HistoryTab data={data} />)
    expect(screen.getByText('Jana Soundararajan')).toBeTruthy()
    expect(screen.getByText('Order Created')).toBeTruthy()
    expect(screen.getByText('Order L14372086 created for USALCO')).toBeTruthy()
    const d = new Date('2026-06-02T14:05:00.000Z')
    const hh = String(d.getHours()).padStart(2, '0')
    expect(screen.getByText(`06/02/2026 ${hh}:05`)).toBeTruthy()
  })

  it('renders a field: oldValue → newValue diff row', () => {
    const data = {
      entries: [
        { user: 'David Johns', timestamp: '2026-06-02T14:05:00.000Z', action: 'Carrier Updated', category: 'update', details: 'Carrier changed', field: 'carrier', oldValue: 'ABC Freight', newValue: 'XYZ Logistics' },
      ],
    }
    render(<HistoryTab data={data} />)
    expect(screen.getByText('carrier:')).toBeTruthy()
    expect(screen.getByText('ABC Freight')).toBeTruthy()
    expect(screen.getByText('XYZ Logistics')).toBeTruthy()
  })

  it('renders a system-actor entry with the System badge', () => {
    const data = {
      entries: [
        { user: 'ERP', source: 'ERP', timestamp: '2026-06-02T14:05:00.000Z', action: 'Status Changed', category: 'update', details: 'Shipment status changed', field: 'status', oldValue: 'Review', newValue: 'Done' },
      ],
    }
    render(<HistoryTab data={data} />)
    expect(screen.getByText('ERP')).toBeTruthy()
    expect(screen.getByText('System')).toBeTruthy()
  })

  it('shows PaneEmpty when there are no entries', () => {
    render(<HistoryTab data={{ entries: [] }} />)
    expect(screen.getByText('No history available.')).toBeTruthy()
  })

  it('shows PaneEmpty when data is missing entirely', () => {
    render(<HistoryTab data={undefined} />)
    expect(screen.getByText('No history available.')).toBeTruthy()
  })
})
