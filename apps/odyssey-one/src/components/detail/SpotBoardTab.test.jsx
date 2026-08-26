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

  // The Quote Duration cell was REMOVED on 2026-08-24 (user): Live Bids' own
  // strip already carries CLOSES IN on the shared countdown ramp, so a
  // second, differently-styled clock on the setup tab was duplicate state to
  // keep in agreement. Its place in the strip is now the Send RFQ cell.
  it('has no Quote Duration cell, and carries a Send RFQ cell instead', async () => {
    const { waitFor } = await import('@testing-library/react')
    const { container } = render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)

    await waitFor(() => {
      expect(container.querySelector('[data-testid^="pickup-"]')).toBeTruthy()
    })
    const strip = container.querySelector('.spot-sticky-strip')
    expect(strip.textContent).not.toContain('Quote Duration')
    expect(strip.textContent).toContain("Send RFQ's")
    // The button itself is portaled in by SetupCarriers, into that cell.
    expect(within(strip).getByRole('button', { name: /^Send \d+\/\d+$/ })).toBeTruthy()
    // …and the old running-state DurationPicker stays gone.
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
    // The button counts included/total ("Send x/y"); the strip cell's label
    // carries the "RFQ's" wording (user, 2026-08-24).
    expect(screen.getByRole('button', { name: /^\d+\/\d+ Sent$/ }).disabled).toBe(true)
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
    // Send lives in the strip cell now, behind a confirmation modal (S112).
    // Its label counts included vs total rows ("Send x/y").
    fireEvent.click(screen.getByRole('button', { name: /^Send \d+\/\d+$/ }))
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Send/ }))
    // The RFQ banner is a plain alert now (user, 2026-08-24) — the per-carrier
    // links live on the Live Bids rows, which is where this asserts them.
    expect(screen.getByText(/RFQ sent to 1 carrier/)).toBeTruthy()
    const odflLink = screen.getByRole('link', { name: /ODFL.*Old Dominion/ })
    expect(odflLink).toBeTruthy()
    expect(screen.queryByRole('link', { name: /SAIA/ })).toBeFalsy()

    const href = odflLink.getAttribute('href')
    expect(href.startsWith('/spot-bid/')).toBe(true)
    const token = href.slice('/spot-bid/'.length)
    expect(decodeToken(token)).toEqual({ shipmentId: shipment.sellShipment, scac: 'ODFL' })
  })

  // Placement (user, 2026-08-24): on Live Bids the banner belongs UNDER that
  // tab's own quote strip, not above it — so it reads as part of the bid.
  it('renders the RFQ banner below the Live Bids quote strip, and only once', () => {
    localStorage.setItem(
      `spotboard:${shipment.sellShipment}`,
      JSON.stringify({
        quoteId: 'q1',
        shipmentId: shipment.sellShipment,
        listId: 'tl-se',
        listName: 'TL Southeast Overflow',
        durationMin: 120,
        openAt: Date.now() - 60000,
        closeAt: Date.now() + 60 * 60000,
        status: 'open',
        awardType: null,
        awardedScac: null,
        carriers: [
          { scac: 'ODFL', name: 'Old Dominion', email: 'ops@odfl.example.com', equipment: 'Van', incl: true, plannedPickup: '', plannedDelivery: '', flags: [], token: 'tok-odfl' },
        ],
        flexiblePickup: false,
      })
    )

    const { container } = render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
    fireEvent.click(screen.getAllByText('Live Bids')[0])

    const banners = container.querySelectorAll('.alert')
    const bidBanner = [...banners].find((a) => /RFQ sent to/.test(a.textContent))
    expect(bidBanner).toBeTruthy()
    // Exactly one — the parent must not also render its own copy above.
    expect([...banners].filter((a) => /RFQ sent to/.test(a.textContent))).toHaveLength(1)

    // DOM order: the quote strip precedes the banner.
    const strip = container.querySelector('.live-bids__summary')
    expect(strip.compareDocumentPosition(bidBanner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
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
    // Setup & Carriers is the sub-tab shown by default; the quote is a draft,
    // so the button is still the ACTION.
    expect(screen.queryByRole('button', { name: /^Send \d+\/\d+$/ })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /^Send \d+\/\d+$/ }))
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Send/ }))

    // Setup & Carriers' own content (the Send RFQ button) is gone — Live Bids
    // is now the active sub-tab.
    expect(screen.queryByRole('button', { name: /^Send \d+\/\d+$/ })).toBeFalsy()
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
    // The links live on the Live Bids rows now, and a fresh mount opens on
    // Setup & Carriers — switch to the tab that renders them.
    fireEvent.click(screen.getAllByText('Live Bids')[0])

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
      // The strip no longer carries Quote Duration (removed 2026-08-24), so
      // the restored duration is asserted where the planner actually edits
      // it — the Quote Setup modal's own field.
      fireEvent.click(screen.getByRole('button', { name: 'Quote Setup' }))
      const duration = document.getElementById('setup-quote-duration')
      expect(duration.value).toContain('99')
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

  // S128 (user, 2026-08-21: "make sure distance cell value is calculated").
  // A spot-eligible shipment never has an Accepted/Sent tender option
  // (eligibility.js), so stopsData.summary.distance is almost always '--' —
  // the strip falls back to a routed option's own distance, then the
  // shipment header's distance, before finally giving up.
  describe('strip Distance fallback', () => {
    it('falls back to a routed option\'s distance when there is no tender-option distance', () => {
      const details = makeShipmentDetails([
        { rank: 1, status: 'Declined', scac: 'ODFL', carrierName: 'Old Dominion', distance: '412.30 mi' },
      ])
      details.stopsData.summary.distance = '--'
      const { container } = render(<SpotBoardTab shipmentDetails={details} shipment={shipment} />)
      const strip = container.querySelector('.spot-sticky-strip')
      expect(strip.textContent).toContain('412.30 mi')
    })

    it('falls back to the header distanceMiles when no tender option or routed option has one', () => {
      const details = makeShipmentDetails([
        { rank: 1, status: 'Declined', scac: 'ODFL', carrierName: 'Old Dominion' }, // no distance
      ])
      details.stopsData.summary.distance = '--'
      details.stopsData.summary.headerDistance = '900.00 mi'
      const { container } = render(<SpotBoardTab shipmentDetails={details} shipment={shipment} />)
      const strip = container.querySelector('.spot-sticky-strip')
      expect(strip.textContent).toContain('900.00 mi')
    })

    it('shows "--" when the tender option, every routed option, and the header distance are all missing', () => {
      const details = makeShipmentDetails([
        { rank: 1, status: 'Declined', scac: 'ODFL', carrierName: 'Old Dominion' },
      ])
      details.stopsData.summary.distance = '--'
      details.stopsData.summary.headerDistance = '--'
      const { container } = render(<SpotBoardTab shipmentDetails={details} shipment={shipment} />)
      const strip = container.querySelector('.spot-sticky-strip')
      expect(strip.textContent).toContain('Distance')
      // No stray real-looking distance value anywhere in the strip.
      expect(strip.textContent).not.toMatch(/\d+\.\d{2} mi/)
    })
  })
})
