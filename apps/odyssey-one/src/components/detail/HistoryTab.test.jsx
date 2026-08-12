// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
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

  it('renders a system-actor entry without the removed System badge (DEC-70, 2026-08-10)', () => {
    // Superseded assertion: this test used to also assert
    // screen.getByText('System') — the user removed that Badge on
    // 2026-08-10 because entry.source + the actor's own
    // history-actor--system muted styling already say "not a human", making
    // the badge redundant. The actor text itself must still render.
    const data = {
      entries: [
        { user: 'ERP', source: 'ERP', timestamp: '2026-06-02T14:05:00.000Z', action: 'Status Changed', category: 'update', outcome: 'update', details: 'Shipment status changed', field: 'status', oldValue: 'Review', newValue: 'Done' },
      ],
    }
    render(<HistoryTab data={data} />)
    expect(screen.getByText('ERP')).toBeTruthy()
    expect(screen.queryByText('System')).toBeNull()
  })

  it('colors the action badge from entry.outcome, not category (DEC-81, 2026-08-10 + neutral/amber follow-up)', () => {
    // Superseded assertion: HistoryTab used to key BADGE_VARIANTS/getDotColor
    // off entry.category (create→green, tender→blue, update→amber,
    // completion→purple). The user's verbatim ruling replaced that with an
    // outcome-driven mapping (failure→red, success→green, update→blue,
    // neutral→amber) — a 'create'-category entry marked outcome: 'failure'
    // must now render RED, which the old category mapping could never
    // produce. Asserting all FOUR outcome directions (not just the new one)
    // so this can't pass against a hardcoded variant.
    const data = {
      entries: [
        { user: 'A', timestamp: '2026-06-02T14:05:00.000Z', action: 'Delivery Failed', category: 'create', outcome: 'failure', details: 'd1' },
        { user: 'B', timestamp: '2026-06-02T14:05:00.000Z', action: 'Message Sent', category: 'tender', outcome: 'success', details: 'd2' },
        { user: 'C', timestamp: '2026-06-02T14:05:00.000Z', action: 'Carrier Updated', category: 'completion', outcome: 'update', details: 'd3' },
        { user: 'D', timestamp: '2026-06-02T14:05:00.000Z', action: 'Tender Response Received', category: 'tender', outcome: 'neutral', details: 'd4' },
      ],
    }
    render(<HistoryTab data={data} />)
    const failureBadge = screen.getByText('Delivery Failed')
    const successBadge = screen.getByText('Message Sent')
    const updateBadge = screen.getByText('Carrier Updated')
    const neutralBadge = screen.getByText('Tender Response Received')
    expect(failureBadge.getAttribute('style')).toContain('--badge-red-bg')
    expect(successBadge.getAttribute('style')).toContain('--badge-green-bg')
    expect(updateBadge.getAttribute('style')).toContain('--badge-blue-bg')
    expect(neutralBadge.getAttribute('style')).toContain('--badge-yellow-bg')
  })

  it('falls back to the neutral gray variant when entry.outcome is missing', () => {
    // The reseed that back-fills `outcome` onto every history entry is
    // separately user-gated and has not run — this is the real shape
    // existing seed data will have until then. Must not crash, and must not
    // fall back to the old category mapping (that would leave two live
    // colour systems); 'gray' is the file's existing neutral variant.
    const data = {
      entries: [
        { user: 'A', timestamp: '2026-06-02T14:05:00.000Z', action: 'Order Created', category: 'create', details: 'no outcome yet' },
      ],
    }
    render(<HistoryTab data={data} />)
    const badge = screen.getByText('Order Created')
    expect(badge.getAttribute('style')).toContain('--badge-gray-bg')
  })

  it('shows PaneEmpty when there are no entries', () => {
    render(<HistoryTab data={{ entries: [] }} />)
    expect(screen.getByText('No history available.')).toBeTruthy()
  })

  it('shows PaneEmpty when data is missing entirely', () => {
    render(<HistoryTab data={undefined} />)
    expect(screen.getByText('No history available.')).toBeTruthy()
  })

  // 2026-08-12 correction: author LEADS the row (left of the badge) — a
  // prior pass (2026-08-11) trailed the author next to the timestamp on the
  // right, which the user rejected verbatim ("i said next to the badge
  // (left side of the badge)"). This test must fail against that prior
  // layout.
  it('renders the author before the badge, and the badge before the timestamp, in DOM order', () => {
    const data = {
      entries: [
        {
          user: 'ERP', source: 'ERP', timestamp: '2026-06-02T14:05:00.000Z', action: 'Shipment Created',
          category: 'create', outcome: 'success', details: 'd1',
          author: { name: 'Net Native', kind: 'system' },
        },
      ],
    }
    render(<HistoryTab data={data} />)
    const author = screen.getByText('Net Native')
    const badge = screen.getByText('Shipment Created')
    const timestamp = badge.closest('.history-row1').querySelector('.history-timestamp')
    // DOCUMENT_POSITION_FOLLOWING (4) — author precedes badge, badge precedes timestamp
    expect(author.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(badge.compareDocumentPosition(timestamp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders a system author (entry.author.kind === "system") with its name and NO tooltip', () => {
    const data = {
      entries: [
        {
          user: 'Net Native', source: 'Net Native', timestamp: '2026-06-02T14:05:00.000Z', action: 'Tender Sent',
          category: 'tender', outcome: 'success', details: 'd1',
          author: { name: 'Net Native', kind: 'system' },
        },
      ],
    }
    render(<HistoryTab data={data} />)
    const actor = screen.getByText('Net Native')
    fireEvent.mouseEnter(actor)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('shows the author name and a hover tooltip with full name + email for a human-authored entry', () => {
    const data = {
      entries: [
        {
          user: 'Dana Whitfield', timestamp: '2026-06-02T14:05:00.000Z', action: 'Shipment Updated',
          category: 'update', outcome: 'update', details: 'd1',
          author: { name: 'Dana Whitfield', email: 'dana.whitfield@odysseylogistics.com', kind: 'internal' },
        },
      ],
    }
    render(<HistoryTab data={data} />)
    const name = screen.getByText('Dana Whitfield')
    fireEvent.mouseEnter(name)
    expect(screen.getByText('dana.whitfield@odysseylogistics.com')).toBeTruthy()
  })

  it('renders an internal author email ending @odysseylogistics.com', () => {
    const data = {
      entries: [
        { user: 'A', timestamp: '2026-06-02T14:05:00.000Z', action: 'Shipment Updated', category: 'update', details: 'd1', author: { name: 'Amy Cook', email: 'amy.cook@odysseylogistics.com', kind: 'internal' } },
      ],
    }
    render(<HistoryTab data={data} />)
    fireEvent.mouseEnter(screen.getByText('Amy Cook'))
    expect(screen.getByText(/@odysseylogistics\.com$/)).toBeTruthy()
  })

  it('renders an external author email NOT ending @odysseylogistics.com', () => {
    const data = {
      entries: [
        { user: 'A', timestamp: '2026-06-02T14:05:00.000Z', action: 'Shipment Updated', category: 'update', details: 'd1', author: { name: 'Marcus Webb', email: 'marcus.webb@usalco.com', kind: 'external' } },
      ],
    }
    render(<HistoryTab data={data} />)
    fireEvent.mouseEnter(screen.getByText('Marcus Webb'))
    const email = screen.getByText('marcus.webb@usalco.com')
    expect(email.textContent.endsWith('@odysseylogistics.com')).toBe(false)
  })

  it('falls back to the system source with NO tooltip when entry.author is absent (reseed-pending shape)', () => {
    const data = {
      entries: [
        { user: 'ERP', source: 'ERP', timestamp: '2026-06-02T14:05:00.000Z', action: 'Shipment Created', category: 'create', outcome: 'success', details: 'd1' },
      ],
    }
    render(<HistoryTab data={data} />)
    const actor = screen.getByText('ERP')
    fireEvent.mouseEnter(actor)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})
