// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HistoryTab from './HistoryTab'
import { getSellShipmentDetail } from '../../api/services/shipmentService'

vi.mock('../../api/services/shipmentService', () => ({ getSellShipmentDetail: vi.fn() }))

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
    // 2026-08-12 user ruling: every system actor reads `System (OdysseyOne)`,
    // never the emitting service — `ERP` stays on the data as entry.source
    // but is no longer shown.
    expect(screen.getByText('System (OdysseyOne)')).toBeTruthy()
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
    const author = screen.getByText('System (OdysseyOne)')
    // The DATA still says 'Shipment Created'; the badge is the display label.
    const badge = screen.getByText('Shipment Creation')
    const timestamp = badge.closest('.history-row1').querySelector('.history-timestamp')
    // DOCUMENT_POSITION_FOLLOWING (4) — badge precedes author, author precedes timestamp
    expect(badge.compareDocumentPosition(author) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(author.compareDocumentPosition(timestamp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders every system author as "System (OdysseyOne)" with NO tooltip, whatever the emitting service', () => {
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
    expect(screen.getAllByText('System (OdysseyOne)')).toHaveLength(2)
    expect(screen.queryByText('Net Native')).toBeNull()
    expect(screen.queryByText('Linx')).toBeNull()
    const actor = screen.getAllByText('System (OdysseyOne)')[0]
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
  it('labels a source-only legacy entry as "System (OdysseyOne)" too, with NO tooltip', () => {
    const data = {
      entries: [
        { user: 'ERP', source: 'ERP', timestamp: '2026-06-02T14:05:00.000Z', action: 'Shipment Created', category: 'create', outcome: 'update', details: 'd1' },
      ],
    }
    render(<HistoryTab data={data} />)
    const actor = screen.getByText('System (OdysseyOne)')
    expect(screen.queryByText('ERP')).toBeNull()
    fireEvent.mouseEnter(actor)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
  // ── 2026-08-17 user asks: newest-first + two renamed labels ───────────────

  it('renders newest first, whatever order the producer sent', () => {
    // The generator emits lifecycle (oldest-first) order, so this is the shape
    // the component actually receives today — it must come out reversed.
    const data = {
      entries: [
        { user: 'A', timestamp: '2026-06-01T08:00:00.000Z', action: 'Shipment Created', category: 'create', details: 'first' },
        { user: 'A', timestamp: '2026-06-03T08:00:00.000Z', action: 'Tender Response Received', category: 'update', details: 'last' },
        { user: 'A', timestamp: '2026-06-02T08:00:00.000Z', action: 'Routing Completed', category: 'update', details: 'middle' },
      ],
    }
    const { container } = render(<HistoryTab data={data} />)
    const order = [...container.querySelectorAll('.history-details')].map(e => e.textContent)
    expect(order).toEqual(['last', 'middle', 'first'])
  })

  it('does not sort the caller\'s array in place', () => {
    const entries = [
      { user: 'A', timestamp: '2026-06-01T08:00:00.000Z', action: 'X', category: 'create', details: 'first' },
      { user: 'A', timestamp: '2026-06-03T08:00:00.000Z', action: 'Y', category: 'update', details: 'last' },
    ]
    render(<HistoryTab data={{ entries }} />)
    expect(entries.map(e => e.details)).toEqual(['first', 'last'])
  })

  it('reads "Shipment Created" and "Routing Completed" under their display names', () => {
    // Display-only: the wire value is untouched, so badge tone/category logic
    // and any live Neon row keep working without a reseed.
    const data = {
      entries: [
        { user: 'A', timestamp: '2026-06-01T08:00:00.000Z', action: 'Shipment Created', category: 'create', details: 'd1' },
        { user: 'A', timestamp: '2026-06-02T08:00:00.000Z', action: 'Routing Completed', category: 'update', details: 'd2' },
      ],
    }
    render(<HistoryTab data={data} />)
    expect(screen.getByText('Shipment Creation')).toBeTruthy()
    expect(screen.getByText('Routing Execution')).toBeTruthy()
    expect(screen.queryByText('Shipment Created')).toBeNull()
    expect(screen.queryByText('Routing Completed')).toBeNull()
  })

  it('leaves every other event name exactly as the backend sent it', () => {
    const data = {
      entries: [
        { user: 'A', timestamp: '2026-06-01T08:00:00.000Z', action: 'Optimization Evaluation', category: 'update', details: 'd1' },
      ],
    }
    render(<HistoryTab data={data} />)
    expect(screen.getByText('Optimization Evaluation')).toBeTruthy()
  })
})

// ── S164 / CNS-22: consolidation lineage ────────────────────────────────────
// Fixture matches spec §1's node shape exactly. C100 <- [C201 (hidden, 2 sources), O202 (hidden leaf)]
const leaf = (id, extra = {}) => ({ sellShipment: `s${id}`, odysseyShipmentIdentifier: id, origin: 'Dallas, TX', destination: 'Reno, NV', orders: ['L1'], hidden: true, sources: [], ...extra })
const lineage = {
  sources: [
    leaf('C201', { sources: [leaf('O301'), leaf('O302')] }),
    leaf('O202'),
  ],
}
const shipment = { sellShipment: 's100', odysseyShipmentIdentifier: 'C100', origin: 'Dallas, TX', destination: 'Reno, NV', customerId: 'USALCO' }
const data = { entries: [{ user: 'A', timestamp: '2026-06-02T14:05:00.000Z', action: 'Order Created', category: 'create', details: 'live-trail' }] }

function renderLineage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <HistoryTab data={data} lineage={lineage} shipment={shipment} />
    </QueryClientProvider>,
  )
}
const btn = (name) => screen.getByRole('button', { name })
// A tab and its tree row share a name; tabs come first in the DOM, tree rows live in .lineage-tree.
const row = (name) => within(document.querySelector('.lineage-tree')).getByRole('button', { name })
const tab = (name) => screen.getAllByRole('button', { name })[0]

describe('HistoryTab — lineage', () => {
  // User ruling 2026-09-30 (S164): summary in all, for consistency.
  it.each([
    ['C without sources', 'C100', 'Consolidated Shipment'],
    ['O', 'O100', 'Shipment'],
  ])('without lineage (%s) still renders the summary, "Created as a new shipment", one tab', (_n, id, kicker) => {
    const ship = { ...shipment, odysseyShipmentIdentifier: id, customerName: 'USALCO Inc' }
    const { container } = render(<HistoryTab data={data} lineage={null} shipment={ship} />)
    const summary = container.querySelector('.history-summary')
    expect(summary).toBeTruthy()
    expect(summary.querySelector('.history-summary__kicker').textContent).toBe(kicker)
    expect(within(summary).getByText(id)).toBeTruthy()
    expect(within(summary).getByText('USALCO Inc')).toBeTruthy()
    expect(within(summary).getAllByText('Dallas, TX')).toHaveLength(1)
    expect(within(summary).getByText('Reno, NV')).toBeTruthy()
    expect(screen.getByText('Created as a new shipment')).toBeTruthy()
    expect(container.querySelectorAll('.history-chip')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Shipment History' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Lineage Tree' })).toBeNull()
    expect(container.querySelector('.sub-accordion--headless')).toBeTruthy()
  })

  it('without lineage, the trail still renders newest-first with badge, author and UTC stamp', () => {
    const d = {
      entries: [
        { user: 'A', timestamp: '2026-06-01T08:00:00.000Z', action: 'Shipment Created', outcome: 'success', details: 'first' },
        { user: 'Dana', timestamp: '2026-06-03T08:00:00.000Z', action: 'Carrier Updated', outcome: 'update', details: 'last', author: { name: 'Dana', email: 'd@x.com', kind: 'internal' } },
      ],
    }
    const { container } = render(<HistoryTab data={d} lineage={null} shipment={shipment} />)
    expect([...container.querySelectorAll('.history-details')].map((e) => e.textContent)).toEqual(['last', 'first'])
    expect(screen.getByText('2 events')).toBeTruthy()
    expect(screen.getByText('06/03/2026 08:00 UTC')).toBeTruthy()
    expect(screen.getByText('Dana').className).toContain('history-actor--hoverable')
    expect(screen.getByText('Carrier Updated').getAttribute('style')).toContain('--badge-blue-bg')
  })

  it('without lineage and without entries keeps the summary and shows the empty status in the events card', () => {
    const { container } = render(<HistoryTab data={{ entries: [] }} lineage={null} shipment={shipment} />)
    expect(container.querySelector('.history-summary')).toBeTruthy()
    expect(within(container.querySelector('.history-events')).getByText('No history available.')).toBeTruthy()
    expect(container.querySelector('.history-list')).toBeNull()
  })

  it('shows both tabs and the summary with direct-source chips', () => {
    renderLineage()
    expect(screen.getByRole('button', { name: 'Shipment History' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Lineage Tree' })).toBeTruthy()
    expect(screen.getByText('CONSOLIDATED SHIPMENT', { exact: false })).toBeTruthy()
    expect(screen.getByText('USALCO')).toBeTruthy()
    expect(screen.getByText('Merged from:')).toBeTruthy()
    expect(btn('C201')).toBeTruthy()
    expect(btn('O202')).toBeTruthy()
    expect(screen.getByText('1 events')).toBeTruthy()
    expect(screen.getByText('live-trail')).toBeTruthy()
  })

  it('tree: root starts collapsed, expand shows Sources of, Expand/Collapse All', () => {
    renderLineage()
    fireEvent.click(btn('Lineage Tree'))
    expect(screen.getByText('5 shipments')).toBeTruthy()
    expect(screen.queryByText(/Sources of/)).toBeNull()
    fireEvent.click(btn('Expand C100'))
    expect(screen.getByText('Sources of C100')).toBeTruthy()
    expect(screen.queryByText('Sources of C201')).toBeNull()
    fireEvent.click(btn('Expand All'))
    expect(screen.getByText('Sources of C201')).toBeTruthy()
    fireEvent.click(btn('Collapse All'))
    expect(screen.queryByText(/Sources of/)).toBeNull()
  })

  it('Preview only appears on hidden rows only', () => {
    renderLineage()
    fireEvent.click(btn('Lineage Tree'))
    fireEvent.click(btn('Expand All'))
    // C201, O301, O302, O202 are hidden; the live root is not
    expect(screen.getAllByText('Preview only')).toHaveLength(4)
  })

  it('id click opens a closable tab: focuses without duplicating, close falls back left', () => {
    getSellShipmentDetail.mockResolvedValue({ historyData: { entries: [] } })
    renderLineage()
    fireEvent.click(btn('Lineage Tree'))
    fireEvent.click(btn('Expand C100'))
    fireEvent.click(row('C201'))
    fireEvent.click(btn('Lineage Tree'))
    fireEvent.click(row('C201')) // second click — same tab
    expect(screen.getAllByRole('button', { name: 'Close C201' })).toHaveLength(1)
    fireEvent.click(btn('Lineage Tree'))
    fireEvent.click(row('O202'))
    expect(screen.getAllByRole('button', { name: /^Close / })).toHaveLength(2)
    fireEvent.click(btn('Close O202'))
    // fell back to the tab on its left (C201)
    expect(tab('C201').getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(btn('Close C201'))
    expect(btn('Lineage Tree').getAttribute('aria-pressed')).toBe('true')
  })

  it('preview shows that shipment\'s own trail and how it came to be', async () => {
    getSellShipmentDetail.mockResolvedValue({
      historyData: { entries: [{ user: 'S', source: 'OdysseyONE', timestamp: '2026-05-01T10:00:00.000Z', action: 'Consolidation Completed', outcome: 'update', details: 'hidden-trail' }] },
    })
    renderLineage()
    fireEvent.click(btn('Lineage Tree'))
    fireEvent.click(btn('Expand All'))
    fireEvent.click(row('O301'))
    expect(await screen.findByText('hidden-trail')).toBeTruthy()
    expect(getSellShipmentDetail).toHaveBeenCalledWith('sO301')
    // O301 has no sources → created new, no ancestry chips (user 2026-09-30)
    expect(screen.getByText('Created as a new shipment')).toBeTruthy()
    expect(document.querySelectorAll('.history-band .history-chip')).toHaveLength(0)
    expect(screen.queryByText('Merged from:')).toBeNull()
  })

  it('preview of an O with [C, original] sources: Deconsolidated from original → C', async () => {
    getSellShipmentDetail.mockResolvedValue({ historyData: { entries: [] } })
    const lin = { sources: [leaf('O400', { sources: [leaf('C500'), leaf('O600')] })] }
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(
      <QueryClientProvider client={qc}><HistoryTab data={data} lineage={lin} shipment={shipment} /></QueryClientProvider>,
    )
    fireEvent.click(btn('Lineage Tree'))
    fireEvent.click(btn('Expand All'))
    fireEvent.click(row('O400'))
    const band = container.querySelector('.history-band')
    expect(within(band).getByText('Deconsolidated from:')).toBeTruthy()
    expect(Array.from(band.querySelectorAll('.history-chip')).map((c) => c.textContent)).toEqual(['O600', 'C500'])
    expect(band.querySelectorAll('svg.history-band__sep')).toHaveLength(1)
  })

  it('card is a headerless SubAccordion; events card + arrow separators render', () => {
    const { container } = renderLineage()
    expect(container.querySelector('.sub-accordion--headless')).toBeTruthy()
    expect(container.querySelector('.sub-accordion__header-row')).toBeNull()
    expect(container.querySelector('.history-events .history-list')).toBeTruthy()
    // C root, two source chips → one Merge separator; the `·` separator is gone
    expect(container.querySelectorAll('.history-band svg.history-band__sep')).toHaveLength(1)
    expect(container.querySelector('.history-band svg.lucide-merge')).toBeTruthy()
    expect(container.querySelector('.history-band').textContent).not.toContain('·')
  })

  it('closable tab keeps the x inside .tab__content, no nested buttons', () => {
    getSellShipmentDetail.mockResolvedValue({ historyData: { entries: [] } })
    renderLineage()
    fireEvent.click(btn('Lineage Tree'))
    fireEvent.click(btn('Expand C100'))
    fireEvent.click(row('C201'))
    const close = btn('Close C201')
    expect(close.closest('.tab__content')).toBeTruthy()
    expect(close.closest('.tab').tagName).toBe('DIV')
    expect(close.closest('button:not(.lineage-tab__close)')).toBeNull()
  })

  it('leaf rows have no chevron placeholder; last row has no rule', () => {
    const { container } = renderLineage()
    fireEvent.click(btn('Lineage Tree'))
    fireEvent.click(btn('Expand All'))
    expect(container.querySelector('.lineage-chevron--leaf')).toBeNull()
    const rows = container.querySelectorAll('.lineage-tree > .lineage-row, .lineage-tree > .lineage-strip')
    expect(rows[rows.length - 1].className).toContain('lineage-row--last')
  })
})
