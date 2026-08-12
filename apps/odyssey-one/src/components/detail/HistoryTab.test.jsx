// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import HistoryTab from './HistoryTab'

afterEach(cleanup)

describe('HistoryTab', () => {
  // 2026-08-12 user ruling: the trail stamps UTC, labelled. Previously this
  // asserted the LOCAL clock (`d.getHours()`), which passed everywhere while
  // rendering a different time to every viewer — the exact failure the ruling
  // fixes. The literal 14:05 below is the whole point: it is the UTC hour of
  // the input instant, so this test only passes if the component is genuinely
  // zone-independent, and it fails on a machine set to any non-UTC zone if
  // someone reverts to local formatting.
  it('renders an absolute MM/DD/YYYY HH:MM timestamp in UTC, labelled', () => {
    const data = {
      entries: [
        { user: 'Jana Soundararajan', timestamp: '2026-06-02T14:05:00.000Z', action: 'Order Created', category: 'create', details: 'Order L14372086 created for USALCO' },
      ],
    }
    render(<HistoryTab data={data} />)
    expect(screen.getByText('Jana Soundararajan')).toBeTruthy()
    expect(screen.getByText('Order Created')).toBeTruthy()
    expect(screen.getByText('Order L14372086 created for USALCO')).toBeTruthy()
    expect(screen.getByText('06/02/2026 14:05 UTC')).toBeTruthy()
  })

  // The date and the clock must come from the SAME zone. This instant is
  // 2026-06-02 in UTC but 2026-06-01 in every US zone, so a component that
  // formats the time in UTC while taking the date locally prints 06/01 14:05.
  it('takes the DATE from UTC too, not just the clock', () => {
    const data = {
      entries: [
        { user: 'A', timestamp: '2026-06-02T02:30:00.000Z', action: 'Shipment Created', category: 'create', details: 'd1' },
      ],
    }
    render(<HistoryTab data={data} />)
    expect(screen.getByText('06/02/2026 02:30 UTC')).toBeTruthy()
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
    // 2026-08-12 user ruling: every system actor reads `System OdysseyOne`,
    // never the emitting service — `ERP` stays on the data as entry.source
    // but is no longer shown.
    expect(screen.getByText('System OdysseyOne')).toBeTruthy()
    expect(screen.queryByText('ERP')).toBeNull()
    expect(screen.queryByText('System')).toBeNull()
  })

  it('colors the action badge from entry.outcome, not category (DEC-81, 2026-08-10 + neutral/amber follow-up + DEC-87 info/gray)', () => {
    // Superseded assertion: HistoryTab used to key BADGE_VARIANTS/getDotColor
    // off entry.category (create→green, tender→blue, update→amber,
    // completion→purple). The user's verbatim ruling replaced that with an
    // outcome-driven mapping (failure→red, success→green, update→blue,
    // neutral→amber, and DEC-87's info→gray) — a 'create'-category entry
    // marked outcome: 'failure' must now render RED, which the old category
    // mapping could never produce. Asserting all FIVE outcome directions (not
    // just the newest one) so this can't pass against a hardcoded variant.
    const data = {
      entries: [
        { user: 'A', timestamp: '2026-06-02T14:05:00.000Z', action: 'Delivery Failed', category: 'create', outcome: 'failure', details: 'd1' },
        { user: 'B', timestamp: '2026-06-02T14:05:00.000Z', action: 'Message Sent', category: 'tender', outcome: 'success', details: 'd2' },
        { user: 'C', timestamp: '2026-06-02T14:05:00.000Z', action: 'Carrier Updated', category: 'completion', outcome: 'update', details: 'd3' },
        { user: 'D', timestamp: '2026-06-02T14:05:00.000Z', action: 'Tender Response Received', category: 'tender', outcome: 'neutral', details: 'd4' },
        { user: 'E', timestamp: '2026-06-02T14:05:00.000Z', action: 'Planned Shipment Sent', category: 'completion', outcome: 'info', details: 'd5' },
      ],
    }
    render(<HistoryTab data={data} />)
    const failureBadge = screen.getByText('Delivery Failed')
    const successBadge = screen.getByText('Message Sent')
    const updateBadge = screen.getByText('Carrier Updated')
    const neutralBadge = screen.getByText('Tender Response Received')
    const infoBadge = screen.getByText('Planned Shipment Sent')
    expect(failureBadge.getAttribute('style')).toContain('--badge-red-bg')
    expect(successBadge.getAttribute('style')).toContain('--badge-green-bg')
    expect(updateBadge.getAttribute('style')).toContain('--badge-blue-bg')
    expect(neutralBadge.getAttribute('style')).toContain('--badge-yellow-bg')
    expect(infoBadge.getAttribute('style')).toContain('--badge-gray-bg')
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

  // Row order is `badge · author ———— date` (user, verbatim 2026-08-12:
  // "badge author ----------- date"). This test must fail against BOTH
  // rejected predecessors: author trailing next to the timestamp
  // (2026-08-11), and author leading with the badge second (earlier the
  // same day) — the first assertion below is the one that catches the
  // latter, so don't relax it to a set-membership check.
  it('renders the badge before the author, and the author before the timestamp, in DOM order', () => {
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
    const author = screen.getByText('System OdysseyOne')
    const badge = screen.getByText('Shipment Created')
    const timestamp = badge.closest('.history-row1').querySelector('.history-timestamp')
    // DOCUMENT_POSITION_FOLLOWING (4) — badge precedes author, author precedes timestamp
    expect(badge.compareDocumentPosition(author) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(author.compareDocumentPosition(timestamp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders every system author as "System OdysseyOne" with NO tooltip, whatever the emitting service', () => {
    // Two different emitting services, one displayed name — the substitution
    // must not be a rename of one particular source.
    const data = {
      entries: [
        {
          user: 'Net Native', source: 'Net Native', timestamp: '2026-06-02T14:05:00.000Z', action: 'Tender Sent',
          category: 'tender', outcome: 'update', details: 'd1',
          author: { name: 'Net Native', kind: 'system' },
        },
        {
          user: 'Linx', source: 'Linx', timestamp: '2026-06-02T15:05:00.000Z', action: 'Ready for Tender',
          category: 'update', outcome: 'update', details: 'd2',
          author: { name: 'Linx', kind: 'system' },
        },
      ],
    }
    render(<HistoryTab data={data} />)
    expect(screen.getAllByText('System OdysseyOne')).toHaveLength(2)
    expect(screen.queryByText('Net Native')).toBeNull()
    expect(screen.queryByText('Linx')).toBeNull()
    const actor = screen.getAllByText('System OdysseyOne')[0]
    fireEvent.mouseEnter(actor)
    expect(screen.queryByRole('tooltip')).toBeNull()
    // No tooltip, so no pointer cursor — the cursor must not promise an
    // interaction this actor doesn't have.
    expect(actor.className).not.toContain('history-actor--hoverable')
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
    // The hover target carries the pointer cursor (user, 2026-08-12) — the
    // class is asserted rather than the computed style because the rule lives
    // in panes/history.css, which jsdom never loads. Paired with the system
    // case below, which must NOT have it.
    expect(name.className).toContain('history-actor--hoverable')
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

  // Legacy rows (no `author` object at all, just a `source`) reach the same
  // system label — which is the point of doing the substitution at render
  // time: rows seeded before the ruling need no reseed to comply.
  it('labels a source-only legacy entry as "System OdysseyOne" too, with NO tooltip', () => {
    const data = {
      entries: [
        { user: 'ERP', source: 'ERP', timestamp: '2026-06-02T14:05:00.000Z', action: 'Shipment Created', category: 'create', outcome: 'update', details: 'd1' },
      ],
    }
    render(<HistoryTab data={data} />)
    const actor = screen.getByText('System OdysseyOne')
    expect(screen.queryByText('ERP')).toBeNull()
    fireEvent.mouseEnter(actor)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})
