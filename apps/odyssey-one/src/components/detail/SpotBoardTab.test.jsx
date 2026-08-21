// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import SpotBoardTab from './SpotBoardTab'
import { decodeToken } from '../../spotboard/token.js'
import { saveDraftSnapshot } from '../../spotboard/draftStore.js'

const shipment = { sellShipment: '0000000091105', buyShipment: '0000000091105' }

function makeShipmentDetails(options = []) {
  return {
    routingData: { options },
    stopsData: {
      summary: { distance: '245.00 mi', grossWeight: '12,000 LB', volume: '400 cuft', acceptedCarrier: '--', seedEquipment: 'Van', utilization: '--' },
      stops: [
        { type: 'pickup', stopNumber: 1, location: 'Atlanta, GA', address: '123 Main St', date: '08/10/2026', appointment: '--', weight: '--', volume: '--', packageCount: '--', pickupNo: '--', order: 'ORD-1', orderIds: ['ORD-1'] },
        { type: 'delivery', stopNumber: 2, location: 'Charlotte, NC', address: '456 Elm St', date: '08/11/2026', appointment: '--', weight: '--', volume: '--', packageCount: '--', pickupNo: '--', order: 'ORD-1', orderIds: ['ORD-1'] },
      ],
    },
    orderDetails: [
      { orderNumber: 'ORD-1', equipment: 'Van', hazmat: 'No', earliestPickup: '08/10/2026 08:00', latestPickup: '08/10/2026 12:00' },
    ],
  }
}

beforeEach(() => {
  localStorage.clear()
})

// Without this the previous test's tree stays mounted and document-wide
// `screen` queries hit ITS tabs instead of the current render's — a switch
// then silently does nothing (S112).
afterEach(cleanup)

describe('SpotBoardTab', () => {
  it('renders both sub-tabs for an eligible shipment', () => {
    render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
    // Each label now appears twice on the active tab — once as the Tab, once as
    // the SubAccordion card title wrapping that sub-tab's content (S112).
    expect(screen.getAllByText('Setup & Carriers').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Live Bids').length).toBeGreaterThan(0)
  })

  // 2026-08-20 (user): the S112 order-view field grid inside the Setup card
  // is replaced by a sticky SpotSummaryStrip rendered by the tab itself,
  // ABOVE the pane-col, on the setup sub-tab only.
  it('renders the shipment context as a sticky strip on the Setup sub-tab only', () => {
    const { container } = render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
    const strip = container.querySelector('.spot-sticky-strip')
    expect(strip).toBeTruthy()
    expect(strip.textContent).toContain('Atlanta, GA')
    expect(strip.textContent).toContain('Charlotte, NC')
    // The old field grid is gone.
    expect(container.querySelector('.order-pane__fields-grid')).toBeFalsy()

    fireEvent.click(screen.getAllByText('Live Bids')[0])
    expect(container.querySelector('.spot-sticky-strip')).toBeFalsy()
  })

  // Round 2 (2026-08-21, user): "duration should ... always be visible even
  // if unset" — the Quote Duration cell is now ALWAYS in the strip, showing
  // '--' before the planner has committed one via Quote Setup → Apply
  // (SetupCarriers.jsx onTermsChange, wired through SpotBoardTab's `terms`).
  it('the strip always shows a Quote Duration cell, "--" until Quote Setup → Apply commits one', async () => {
    const { waitFor } = await import('@testing-library/react')
    const { container } = render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)

    await waitFor(() => {
      expect(container.querySelector('[data-testid^="pickup-"]')).toBeTruthy()
    })
    const strip = container.querySelector('.spot-sticky-strip')
    expect(strip.textContent).toContain('Quote Duration')
    expect(strip.textContent).toContain('--')

    fireEvent.click(screen.getByRole('button', { name: 'Quote Setup' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(container.querySelector('.spot-sticky-strip').textContent).toContain('Quote Duration')
    expect(container.querySelector('.spot-sticky-strip').textContent).toContain('30 min')
  })

  // Round 2 (2026-08-21, user): "when sent the quote duration cell should
  // show the countdown in a badge and not show another sudden field for it."
  // Once the RFQ is open, the Quote Duration cell's VALUE swaps to a live
  // countdown (mm:ss), not the plain "N min" string — and the old
  // running-state DurationPicker field that used to render in SetupCarriers'
  // head is gone entirely (no `.duration-picker__running` anywhere).
  it('shows a live countdown in the Quote Duration cell once the RFQ is open, with no separate running field', () => {
    localStorage.setItem(
      `spotboard:${shipment.sellShipment}`,
      JSON.stringify({
        quoteId: 'q1',
        shipmentId: shipment.sellShipment,
        listId: 'tl-se',
        listName: 'TL Southeast Overflow',
        durationMin: 60,
        openAt: Date.now(),
        closeAt: Date.now() + 30 * 60_000,
        status: 'open',
        awardType: null,
        awardedScac: null,
        carriers: [],
        flexiblePickup: false,
      })
    )
    const { container } = render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
    const strip = container.querySelector('.spot-sticky-strip')
    expect(strip.textContent).toContain('Quote Duration')
    // A live mm:ss countdown, not the flat "60 min" the unset/draft case shows.
    expect(strip.textContent).toMatch(/\d{2}:\d{2}/)
    expect(strip.textContent).not.toContain('60 min')
    // The "sudden field" is gone — no running-state DurationPicker anywhere.
    expect(container.querySelector('.duration-picker__running')).toBeFalsy()
  })

  // The strip compacts Origin/Destination to "City, ST" and shows the full
  // stop-location string in a hover tooltip (TooltipTrigger — mouseenter,
  // since @testing-library/user-event isn't in this repo).
  it('shows the full stop location in a tooltip on hover over a compacted cell', () => {
    const details = makeShipmentDetails([])
    details.stopsData.stops[0].location = 'NOURYON COLUMBUS PL, Kansas City, MO 64101 US'
    const { container } = render(<SpotBoardTab shipmentDetails={details} shipment={shipment} />)
    const strip = container.querySelector('.spot-sticky-strip')
    expect(strip.textContent).toContain('Kansas City, MO')
    expect(strip.textContent).not.toContain('NOURYON')

    const trigger = strip.querySelector('[data-tooltip-trigger]')
    fireEvent.mouseEnter(trigger)
    expect(screen.getByText('NOURYON COLUMBUS PL, Kansas City, MO 64101 US')).toBeTruthy()
  })

  // The carrier rows' Planned Pickup/Delivery default off the order's LATEST
  // dates, not its earliest (user ruling 2026-08-19). The order guarantees one
  // late date via the Planning Date Type anchor; earliest is optional on both
  // sides, so defaulting off it was defaulting off a nullable field. Earliest
  // and latest are deliberately different DAYS here — with the same day the
  // assertion passes either way, since `dateOnly` drops the time.
  it('defaults the carrier rows to the order LATEST pickup/delivery, not earliest', async () => {
    const { within, waitFor } = await import('@testing-library/react')
    const details = makeShipmentDetails([])
    details.orderDetails = [{
      orderNumber: 'ORD-1', equipment: 'Van', hazmat: 'No',
      earliestPickup: '08/09/2026 08:00', latestPickup: '08/10/2026 12:00',
      earliestDelivery: '08/11/2026 08:00', latestDelivery: '08/12/2026 17:00',
    }]
    const { container } = render(<SpotBoardTab shipmentDetails={details} shipment={shipment} />)

    // The carrier pool is fetched async by the tab (getLookupOptions), so the
    // rows don't exist on the first paint.
    await waitFor(() => {
      expect(container.querySelector('[data-testid^="pickup-"]')).toBeTruthy()
    })
    // Read the SCAC off the rendered table rather than rebuilding the row list
    // — buildOverflowRows needs the carrier options the tab resolves internally.
    const pickupWrap = container.querySelector('[data-testid^="pickup-"]')
    const scac = pickupWrap.getAttribute('data-testid').replace('pickup-', '')
    // The row existing (waitFor above) doesn't mean its default-date effect has
    // landed yet — that's a separate tick. Assert the values inside their own
    // waitFor so a slow tick retries instead of racing (S128 suite growth
    // started tripping this deterministically).
    await waitFor(() => {
      const pickup = within(pickupWrap).getByRole('textbox')
      const delivery = within(screen.getByTestId(`delivery-${scac}`)).getByRole('textbox')
      expect(pickup.value).toBe('08/10/2026')    // latestPickup, NOT 08/09
      expect(delivery.value).toBe('08/12/2026')  // latestDelivery, NOT 08/11
    })
  })

  it('shows the EmptyState (not the sub-tabs) when the shipment has an Accepted tender', () => {
    const details = makeShipmentDetails([
      { rank: 1, status: 'Accepted', scac: 'ODFL', carrierName: 'Old Dominion' },
    ])
    render(<SpotBoardTab shipmentDetails={details} shipment={shipment} />)
    expect(screen.getByText(/already has an? Accepted tender with Old Dominion/)).toBeTruthy()
    expect(screen.queryByText('Setup & Carriers')).toBeFalsy()
    expect(screen.queryByText('Live Bids')).toBeFalsy()
  })

  // 2026-08-19 (user): the actions no longer disappear when the pane is
  // read-only — they stay mounted and go disabled, so an awarded quote still
  // shows where Send RFQ / Save Draft were rather than silently reflowing.
  it('keeps Setup & Carriers read-only (actions present but disabled) once a quote is awarded', () => {
    localStorage.setItem(
      `spotboard:${shipment.sellShipment}`,
      JSON.stringify({
        quoteId: 'q1',
        shipmentId: shipment.sellShipment,
        listId: 'list-1',
        listName: 'Regional Van',
        durationMin: 60,
        openAt: 1000,
        closeAt: 2000,
        status: 'awarded',
        awardType: 'manual',
        awardedScac: 'ODFL',
        carriers: [],
        flexiblePickup: false,
      })
    )
    render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
    // Send RFQ's label is now dynamic ("Send x/y RFQ", Task 7).
    expect(screen.getByRole('button', { name: /^Send \d+\/\d+ RFQ$/ }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Save Draft' }).disabled).toBe(true)
  })

  it('on Send RFQ, surfaces one working bid link per included carrier and none for excluded ones', () => {
    localStorage.setItem(
      `spotboard:${shipment.sellShipment}`,
      JSON.stringify({
        quoteId: 'q1',
        shipmentId: shipment.sellShipment,
        listId: 'tl-se',
        listName: 'TL Southeast Overflow',
        durationMin: 120,
        openAt: null,
        closeAt: null,
        status: 'draft',
        awardType: null,
        awardedScac: null,
        carriers: [
          { scac: 'ODFL', name: 'Old Dominion', email: 'ops@odfl.example.com', equipment: 'Van', incl: true, plannedPickup: '2026-08-10 08:00', plannedDelivery: '2026-08-11 17:00', flags: [] },
          { scac: 'SAIA', name: 'Saia', email: 'ops@saia.example.com', equipment: 'Van', incl: false, plannedPickup: '', plannedDelivery: '', flags: [] },
        ],
        flexiblePickup: false,
      })
    )

    render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
    // Send RFQ is a trailing button below the table, behind a confirmation
    // modal (S112). Its label is dynamic ("Send x/y RFQ", Task 7).
    fireEvent.click(screen.getByRole('button', { name: /^Send \d+\/\d+ RFQ$/ }))
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Send/ }))
    // RFQ links banner is collapsed by default (S125) — expand to reach the rows.
    fireEvent.click(screen.getByLabelText('Expand list'))

    const odflLink = screen.getByRole('link', { name: /ODFL.*Old Dominion/ })
    expect(odflLink).toBeTruthy()
    expect(screen.queryByRole('link', { name: /SAIA/ })).toBeFalsy()

    const href = odflLink.getAttribute('href')
    expect(href.startsWith('/spot-bid/')).toBe(true)
    const token = href.slice('/spot-bid/'.length)
    expect(decodeToken(token)).toEqual({ shipmentId: shipment.sellShipment, scac: 'ODFL' })
  })

  // Task 7 (2026-08-20, user): "when sent should take us to live bids
  // automatically" — Confirm & Send switches the sub-tab band to Live Bids.
  it('switches to the Live Bids sub-tab automatically after Confirm & Send', () => {
    localStorage.setItem(
      `spotboard:${shipment.sellShipment}`,
      JSON.stringify({
        quoteId: 'q1',
        shipmentId: shipment.sellShipment,
        listId: 'tl-se',
        listName: 'TL Southeast Overflow',
        durationMin: 120,
        openAt: null,
        closeAt: null,
        status: 'draft',
        awardType: null,
        awardedScac: null,
        carriers: [
          { scac: 'ODFL', name: 'Old Dominion', email: 'ops@odfl.example.com', equipment: 'Van', incl: true, plannedPickup: '2026-08-10 08:00', plannedDelivery: '2026-08-11 17:00', flags: [] },
        ],
        flexiblePickup: false,
      })
    )

    render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
    // Setup & Carriers is the sub-tab shown by default.
    expect(screen.queryByRole('button', { name: /^Send \d+\/\d+ RFQ$/ })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /^Send \d+\/\d+ RFQ$/ }))
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Send/ }))

    // Setup & Carriers' own content (the Send RFQ button) is gone — Live Bids
    // is now the active sub-tab.
    expect(screen.queryByRole('button', { name: /^Send \d+\/\d+ RFQ$/ })).toBeFalsy()
    expect(screen.getByRole('button', { name: 'Live Bids' }).className).toContain('tab--current')
  })

  // Bug: RFQ links must survive a reload/remount — Send RFQ is never clicked
  // in this component's lifetime here, the quote is already 'open' in the
  // store with minted tokens (as spotStore.sendRFQ leaves it).
  it('recovers bid links on fresh mount when the persisted quote is already open with tokens', () => {
    localStorage.setItem(
      `spotboard:${shipment.sellShipment}`,
      JSON.stringify({
        quoteId: 'q1',
        shipmentId: shipment.sellShipment,
        listId: 'tl-se',
        listName: 'TL Southeast Overflow',
        durationMin: 120,
        openAt: 1000,
        closeAt: 999999999999,
        status: 'open',
        awardType: null,
        awardedScac: null,
        carriers: [
          { scac: 'ODFL', name: 'Old Dominion', email: 'ops@odfl.example.com', equipment: 'Van', incl: true, plannedPickup: '2026-08-10 08:00', plannedDelivery: '2026-08-11 17:00', flags: [], token: 'fake-token-odfl' },
        ],
        flexiblePickup: false,
      })
    )

    render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
    fireEvent.click(screen.getByLabelText('Expand list'))

    const odflLink = screen.getByRole('link', { name: /ODFL.*Old Dominion/ })
    expect(odflLink).toBeTruthy()
    expect(odflLink.getAttribute('href')).toBe('/spot-bid/fake-token-odfl')
  })

  it('shows no links panel for a draft quote (no tokens minted yet)', () => {
    localStorage.setItem(
      `spotboard:${shipment.sellShipment}`,
      JSON.stringify({
        quoteId: 'q1',
        shipmentId: shipment.sellShipment,
        listId: 'tl-se',
        listName: 'TL Southeast Overflow',
        durationMin: 120,
        openAt: null,
        closeAt: null,
        status: 'draft',
        awardType: null,
        awardedScac: null,
        carriers: [
          { scac: 'ODFL', name: 'Old Dominion', email: 'ops@odfl.example.com', equipment: 'Van', incl: true, plannedPickup: '2026-08-10 08:00', plannedDelivery: '2026-08-11 17:00', flags: [] },
        ],
        flexiblePickup: false,
      })
    )

    render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
    expect(screen.queryByRole('link', { name: /ODFL/ })).toBeFalsy()
  })

  it('shows no links panel for a closed/awarded quote', () => {
    localStorage.setItem(
      `spotboard:${shipment.sellShipment}`,
      JSON.stringify({
        quoteId: 'q1',
        shipmentId: shipment.sellShipment,
        listId: 'tl-se',
        listName: 'TL Southeast Overflow',
        durationMin: 120,
        openAt: 1000,
        closeAt: 2000,
        status: 'awarded',
        awardType: 'manual',
        awardedScac: 'ODFL',
        carriers: [
          { scac: 'ODFL', name: 'Old Dominion', email: 'ops@odfl.example.com', equipment: 'Van', incl: true, plannedPickup: '2026-08-10 08:00', plannedDelivery: '2026-08-11 17:00', flags: [], token: 'fake-token-odfl' },
        ],
        flexiblePickup: false,
      })
    )

    render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
    expect(screen.queryByRole('link', { name: /ODFL/ })).toBeFalsy()
  })

  // Task 9: Drafts sub-tab — save + restore.
  describe('Drafts', () => {
    it('shows a saved snapshot in the Drafts tab after Save Draft', () => {
      render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)

      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }))
      fireEvent.click(screen.getByRole('button', { name: 'Drafts' }))

      expect(screen.getByText('30 min')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Restore' })).toBeTruthy()
    })

    // Regression: SetupCarriers used to remount on `quote?.quoteId`, which a
    // fresh Save Draft also mints — silently resetting the planner's TL/LTL/
    // All pill back to All. The remount is now keyed off `restoreKey`, bumped
    // only by Restore (see handleRestore), so Save Draft must leave it alone.
    it('Save Draft does not reset the selected mode pill', () => {
      render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)

      const band = screen.getByRole('group', { name: 'Carrier list mode' })
      const [, tlPill] = within(band).getAllByRole('button')
      fireEvent.click(tlPill)
      expect(tlPill.getAttribute('aria-pressed')).toBe('true')

      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }))

      expect(tlPill.getAttribute('aria-pressed')).toBe('true')
    })

    it('Restore repopulates Setup with the draft and switches to the Setup tab', () => {
      saveDraftSnapshot(shipment.sellShipment, {
        listId: 'tl-se', listName: 'TL Southeast Overflow', durationMin: 99, carriers: [], flexiblePickup: false,
      }, 1000)

      render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
      fireEvent.click(screen.getByRole('button', { name: 'Drafts' }))
      fireEvent.click(screen.getByRole('button', { name: 'Restore' }))

      expect(screen.getByRole('button', { name: 'Setup & Carriers' }).className).toContain('tab--current')
      // Duration comes back off the restored quote, into the sticky strip.
      expect(document.querySelector('.spot-sticky-strip').textContent).toContain('99 min')
    })

    // The strip's duration is computed at SpotBoardTab level straight off
    // quote.durationMin — it proves the quote object came back, but nothing
    // above proves SetupCarriers' keyed remount (key={restoreKey}) actually
    // reseeded ITS OWN table from the snapshot's carrier rows. Pin that here.
    it('Restore reseeds the Setup & Carriers table with the snapshot carrier rows', () => {
      saveDraftSnapshot(shipment.sellShipment, {
        listId: 'tl-se', listName: 'TL Southeast Overflow', durationMin: 45,
        carriers: [{
          scac: 'ODFL', name: 'Old Dominion', email: 'ops@odfl.example.com', equipment: 'Van',
          incl: true, plannedPickup: '08/10/2026', plannedDelivery: '08/11/2026', flags: [],
        }],
        flexiblePickup: false,
      }, 1000)

      render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
      fireEvent.click(screen.getByRole('button', { name: 'Drafts' }))
      fireEvent.click(screen.getByRole('button', { name: 'Restore' }))

      expect(screen.getByText('ODFL · Old Dominion')).toBeTruthy()
      const pickup = within(screen.getByTestId('pickup-ODFL')).getByRole('textbox')
      const delivery = within(screen.getByTestId('delivery-ODFL')).getByRole('textbox')
      expect(pickup.value).toBe('08/10/2026')
      expect(delivery.value).toBe('08/11/2026')
    })

    it('disables Restore while a quote is open', () => {
      localStorage.setItem(
        `spotboard:${shipment.sellShipment}`,
        JSON.stringify({
          quoteId: 'q1', shipmentId: shipment.sellShipment, listId: 'l', listName: 'L', durationMin: 60,
          openAt: 1000, closeAt: 999999999999, status: 'open', awardType: null, awardedScac: null,
          carriers: [], flexiblePickup: false,
        })
      )
      saveDraftSnapshot(shipment.sellShipment, {
        listId: 'l', listName: 'L', durationMin: 30, carriers: [], flexiblePickup: false,
      }, 1000)

      render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
      fireEvent.click(screen.getByRole('button', { name: 'Drafts' }))

      expect(screen.getByRole('button', { name: 'Restore' }).disabled).toBe(true)
    })

    it('Delete removes a draft row', () => {
      saveDraftSnapshot(shipment.sellShipment, {
        listId: 'l', listName: 'L', durationMin: 30, carriers: [], flexiblePickup: false,
      }, 1000)

      render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
      fireEvent.click(screen.getByRole('button', { name: 'Drafts' }))
      expect(screen.getByRole('button', { name: 'Restore' })).toBeTruthy()

      fireEvent.click(screen.getByLabelText('Delete draft'))

      expect(screen.queryByRole('button', { name: 'Restore' })).toBeFalsy()
      expect(screen.getByText(/No saved drafts yet/)).toBeTruthy()
    })
  })
})
