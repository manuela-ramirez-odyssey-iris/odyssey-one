// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import RoutingHistoryTab from './RoutingHistoryTab'

afterEach(cleanup)

// The AC's six sections, in the AC's own order.
const SECTIONS = ['Routing Options', 'Response Comments', 'View Volume Commitment',
  'Additional Info', 'Others', 'Dropped Carrier']

const option = (over = {}) => ({
  rank: 1, routeRank: 1, scac: 'CNWY', carrierName: 'CONWAY FREIGHT',
  equipment: 'TLF', cost: '$804.94', status: 'Accepted',
  pickupDateTime: '05/12/2026 12:00 CDT', deliveryDateTime: '05/14/2026 12:00 PDT',
  modifyUser: 'George Schultz', ...over,
})

const details = (over = {}) => ({
  odysseyShipmentIdentifier: 'SHP-B28826319',
  orderDetails: [{ orderNumber: 'ORD-S2600074M' }, { orderNumber: 'ORD-JAN7ERCO7' }],
  droppedCarriers: [{ scac: 'ODFL', carrierName: 'OLD DOMINION', reason: 'No Rates' }],
  routingData: { options: [option(), option({ rank: 2, routeRank: 2, scac: 'JBHT', carrierName: 'J.B. HUNT', status: 'Declined' })] },
  ...over,
})

/** Every version card, in rendered order. */
const cards = () => [...document.querySelectorAll('.routing-version')]

describe('RoutingHistoryTab (LINX-15895)', () => {
  it('shows the empty state when the shipment has no prior routing version', () => {
    // Never tendered ⇒ one routing execution, and the Tender tab owns it.
    render(<RoutingHistoryTab details={details({
      routingData: { options: [option({ status: null })] },
    })} />)
    expect(screen.getByText('No previous routing versions for this shipment.')).toBeTruthy()
    expect(cards()).toHaveLength(0)
  })

  it('renders one card per version, newest first, numbered down to V1', () => {
    render(<RoutingHistoryTab details={details()} />)
    const titles = cards().map((c) => within(c).getByText(/^Version \d+$/).textContent)
    expect(titles.length).toBeGreaterThan(0)
    expect(titles).toEqual(titles.map((_, i) => `Version ${titles.length - i}`))
    expect(titles.at(-1)).toBe('Version 1')
  })

  it('badges only the newest as the most recent historical version', () => {
    render(<RoutingHistoryTab details={details()} />)
    const badged = cards().map((c) => within(c).queryAllByText('Most recent historical').length)
    expect(badged[0]).toBe(1)
    expect(badged.slice(1).every((n) => n === 0)).toBe(true)
  })

  it('marks every version read-only and stamps the run in the History tab format', () => {
    render(<RoutingHistoryTab details={details()} />)
    for (const card of cards()) {
      expect(within(card).getByText('Read-only')).toBeTruthy()
      // MM/DD/YYYY HH:MM UTC — the shipment domain's instant format (D4).
      expect(within(card).getByText(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} UTC$/)).toBeTruthy()
    }
  })

  it('lists the orders the shipment carried at that routing execution', () => {
    render(<RoutingHistoryTab details={details()} />)
    for (const card of cards()) {
      expect(within(card).getByText('Orders')).toBeTruthy()
      // Always at least one order chip — a routing execution needs freight.
      expect(within(card).queryAllByText(/^ORD-/).length).toBeGreaterThan(0)
    }
  })

  it('starts every version collapsed, and opens them independently', () => {
    render(<RoutingHistoryTab details={details()} />)
    const headerOf = (card) => within(card).getByText(/^Version \d+$/).closest('button')
    const all = cards()
    expect(all.every((c) => headerOf(c).getAttribute('aria-expanded') === 'false')).toBe(true)

    fireEvent.click(headerOf(all[0]))
    expect(headerOf(all[0]).getAttribute('aria-expanded')).toBe('true')
    // "Users should be able to expand and review each routing version
    // independently" — opening one must not open its neighbours.
    expect(all.slice(1).every((c) => headerOf(c).getAttribute('aria-expanded') === 'false')).toBe(true)
  })

  it('gives each version the six AC sections, in order, each collapsed', () => {
    render(<RoutingHistoryTab details={details()} />)
    const card = cards()[0]
    expect(within(card).getByText('Routing details')).toBeTruthy()

    // Scoped to the BODY: the card is itself a .sub-accordion, so an
    // unscoped descendant query picks up its own header title too.
    const inner = [...card.querySelectorAll('.routing-version__body .sub-accordion__title')]
      .map((t) => t.textContent)
    expect(inner).toHaveLength(SECTIONS.length)
    SECTIONS.forEach((label, i) => expect(inner[i]).toContain(label))

    const innerHeaders = [...card.querySelectorAll('.routing-version__body .sub-accordion__header')]
    expect(innerHeaders.every((h) => h.getAttribute('aria-expanded') === 'false')).toBe(true)
  })

  it('shows response data under Response Comments, not the Tender tab\'s Pro #/Route Group group', () => {
    render(<RoutingHistoryTab details={details()} />)
    const section = [...cards()[0].querySelectorAll('.sub-accordion')]
      .find((s) => s.querySelector('.sub-accordion__title')?.textContent === 'Response Comments')
    const headers = [...section.querySelectorAll('th')].map((th) => th.textContent)
    expect(headers).toEqual(expect.arrayContaining([
      'SCAC', 'Carrier Name', 'Tender Status', 'Response Method', 'Response Date',
      'Response User', 'Comments',
    ]))
    expect(headers).not.toContain('Pro #')
  })

  it('carries the AC\'s verbatim line for a version with no dropped carriers', () => {
    render(<RoutingHistoryTab details={details({ droppedCarriers: [] })} />)
    expect(screen.getAllByText('This routing version does not contain any dropped carriers.').length)
      .toBe(cards().length)
  })

  it('is read-only — the only controls are the disclosures themselves', () => {
    render(<RoutingHistoryTab details={details()} />)
    const buttons = [...document.querySelectorAll('button')]
    expect(buttons.length).toBeGreaterThan(0)
    // Disclosures only — the version headers, the six section headers, and
    // GroupTable's own per-row expand in the Dropped Carrier section. No
    // Reinstate / Process SCAC / tender action reaches a past routing run
    // (DroppedCarrierSection renders its action lane only when given onProcess,
    // and this tab never passes it).
    const labels = buttons.map((b) => b.textContent)
    for (const forbidden of ['Reinstate', 'Reinstated', 'Process', 'Tender', 'Accept', 'Decline', 'Add Quote']) {
      expect(labels.some((l) => l.includes(forbidden))).toBe(false)
    }
    expect(document.querySelector('[data-dropped-carrier-table] .odyssey-group-table__action')).toBeNull()
  })

  it('falls back to the shipment ids when the detail carries no identifier', () => {
    // The PRNG key must never be '' for every shipment at once — that would give
    // the whole corpus one identical history.
    const bare = details({ odysseyShipmentIdentifier: '' })
    render(<RoutingHistoryTab details={bare} shipment={{ buyShipment: 'B111' }} />)
    const a = cards().length
    cleanup()
    render(<RoutingHistoryTab details={bare} shipment={{ buyShipment: 'B999' }} />)
    expect(document.querySelectorAll('.routing-version').length + a).toBeGreaterThan(1)
  })
})
