// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CarrierBid from './CarrierBid.jsx'
import { saveDraft, sendRFQ, closeQuote, getQuote } from '../spotboard/spotStore.js'

const SHIPMENT_ID = '25690001'
const SCAC = 'ODFL'
// Deliberately identifier-shaped strings that must NEVER reach the DOM.
const ORDER_ID = 'ORD-9001'
const ORDER_NUMBER = 'SO-990001'

const CARRIERS = [
  { scac: SCAC, name: 'Old Dominion', email: 'ops@odfl.example.com', equipment: 'Van', incl: true, plannedPickup: '', plannedDelivery: '', flags: [] },
  { scac: 'SAIA', name: 'Saia', email: 'ops@saia.example.com', equipment: 'Van', incl: true, plannedPickup: '', plannedDelivery: '', flags: [] },
]

const DTO = {
  shipmentId: SHIPMENT_ID,
  distanceMiles: 1337,
  costSummary: { apFuelAmount: 250.5 },
  shipmentStopList: [
    { stopSequence: 1, stopType: 'pickup', facilityName: 'Acme Houston Plant', address1: '100 Refinery Rd', city: 'Houston', region: 'TX', postal: '77001', country: 'US' },
    { stopSequence: 2, stopType: 'delivery', facilityName: 'Midwest Distribution Center', address1: '8800 Industrial Ave', city: 'Chicago', region: 'IL', postal: '60601', country: 'US' },
  ],
  shippingOptionList: [],
  orderList: [
    {
      orderId: ORDER_ID,
      orderNumber: ORDER_NUMBER,
      equipmentCode: 'VAN',
      specialServices: [{ code: 'LFT', desc: 'Lift Gate' }],
      origin: { fullName: 'Acme Houston Plant', address1: '100 Refinery Rd', city: 'Houston', region: 'TX', postal: '77001', country: 'US' },
      destination: { fullName: 'Midwest Distribution Center', address1: '8800 Industrial Ave', city: 'Chicago', region: 'IL', postal: '60601', country: 'US' },
      scheduledShipDate: '06/10/2026 08:00 CST',
      scheduledDeliveryDate: '06/13/2026 09:00 CST',
      orderLines: [{ hazmatCode: 'UN1830', hazmatClass: 'Class 8' }],
      instructionList: [{ sequenceNumber: 1, text: 'Deliver to dock 26B only.' }],
    },
  ],
  documentList: [],
  noteList: [],
  historyList: [],
}

function stubFetch() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => DTO }))
}

function renderAt(path) {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/spot-bid/:token" element={<CarrierBid />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function openQuote(durationMin = 120) {
  saveDraft(SHIPMENT_ID, { listId: 'tl-se', listName: 'TL Southeast Overflow', durationMin, carriers: CARRIERS })
  return sendRFQ(SHIPMENT_ID, Date.now())
}

function tokenFor(quote, scac) {
  return quote.carriers.find((c) => c.scac === scac).token
}

beforeEach(() => {
  localStorage.clear()
  stubFetch()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CarrierBid — open quote', () => {
  it('renders the bid form and no app chrome (sidebar/navbar)', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByDisplayValue('Acme Houston Plant')
    expect(screen.getByRole('button', { name: /submit/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /decline/i })).toBeTruthy()

    // No AppShell chrome: no <nav>, none of the Sidebar's domain labels.
    expect(document.querySelector('nav')).toBe(null)
    expect(screen.queryByText('User Management')).toBe(null)
  })

  it('submitting a bid writes it into spotStore for that scac, with a correctly computed total', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByDisplayValue('Acme Houston Plant')

    const linehaulInput = screen.getByLabelText(/linehaul/i)
    fireEvent.change(linehaulInput, { target: { value: '1500' } })
    const accessorialInput = screen.getByLabelText(/lift gate/i)
    fireEvent.change(accessorialInput, { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      const stored = getQuote(SHIPMENT_ID)
      const row = stored.carriers.find((c) => c.scac === SCAC)
      expect(row.bid?.status).toBe('bid')
      expect(row.bid?.linehaul).toBe(1500)
    })

    // fuel (250.50 from the DTO's apFuelAmount) + linehaul + accessorials,
    // rounded to 2dp — this is the M3 fix: the computed Total was untested.
    const stored = getQuote(SHIPMENT_ID)
    const row = stored.carriers.find((c) => c.scac === SCAC)
    expect(row.bid.fuel).toBe(250.5)
    expect(row.bid.accessorials).toEqual([{ code: 'LFT', description: 'Lift Gate', amount: 100 }])
    expect(row.bid.total).toBe(1850.5)

    // Other carrier's row untouched.
    expect(stored.carriers.find((c) => c.scac === 'SAIA').bid).toBeUndefined()
  })

  it('never renders an Order ID or Load ID anywhere in the DOM, incl. portals and attributes', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByDisplayValue('Acme Houston Plant')

    // Scan document.body (not the render `container`) — MeasureField's UoM
    // menu renders through a portal (useAnchoredPortal → document.body),
    // which a container-scoped scan would miss (M5 fix).
    const allEls = Array.from(document.body.querySelectorAll('*'))
    const inputValues = allEls
      .filter((el) => el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
      .map((el) => el.value)
      .join('|')
    // Also scan attributes — an id leaked into href/title/aria-label/data-*
    // would pass a textContent-only + value-only scan (M5 fix).
    const attrValues = allEls
      .flatMap((el) => Array.from(el.attributes))
      .filter((attr) => attr.name === 'href' || attr.name === 'title' || attr.name === 'aria-label' || attr.name.startsWith('data-'))
      .map((attr) => attr.value)
      .join('|')
    const everything = document.body.textContent + inputValues + attrValues
    expect(everything).not.toContain(ORDER_ID)
    expect(everything).not.toContain(ORDER_NUMBER)
  })

  it('renders the quote ID in the card title (canon: "Shipment Detail — Quote QT-88421")', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByDisplayValue('Acme Houston Plant')
    // SubAccordion's title renders as a styled span inside the toggle
    // button, not a heading element — query by text instead.
    expect(screen.getByText(new RegExp(`Quote ${quote.quoteId}`))).toBeTruthy()
  })

  it('both sections render expanded by default and can be collapsed', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByDisplayValue('Acme Houston Plant')

    const toggles = screen.getAllByRole('button', { name: /shipment detail|your bid/i })
    expect(toggles.length).toBe(2)
    toggles.forEach((t) => expect(t.getAttribute('aria-expanded')).toBe('true'))

    fireEvent.click(toggles[0])
    expect(toggles[0].getAttribute('aria-expanded')).toBe('false')
    expect(toggles[1].getAttribute('aria-expanded')).toBe('true')
  })

  it('renders the carrier-portal identity line beside the logo, with the carrier name and SCAC', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByDisplayValue('Acme Houston Plant')
    expect(screen.getByText('OdysseyONE Carrier Portal · Old Dominion (ODFL)')).toBeTruthy()
  })

  it('exposes exactly one <h1>, containing the portal identity text', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByDisplayValue('Acme Houston Plant')
    const headings = document.querySelectorAll('h1')
    expect(headings.length).toBe(1)
    expect(headings[0].textContent).toBe('OdysseyONE Carrier Portal · Old Dominion (ODFL)')
  })
})

describe('CarrierBid — closed / expired / invalid', () => {
  it('shows the closed-window state (no form) once closeAt has passed', async () => {
    // durationMin -5 => closeAt is definitively 5 minutes in the past.
    // (durationMin 0 makes closeAt === openAt, a same-millisecond race
    // against CarrierBid.jsx's strict `>` expiry check — flaky.)
    const quote = openQuote(-5)
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    // await the guard's own text — not just button-absence, which is also
    // true during react-query's loading state regardless of the guard.
    await screen.findByText('This bidding window has closed.')
    expect(screen.queryByRole('button', { name: /submit/i })).toBe(null)
    expect(document.querySelectorAll('h1').length).toBe(1)
    expect(document.querySelector('main')).toBeTruthy()
  })

  it('shows the closed-window state when the quote status is closed', async () => {
    const quote = openQuote()
    closeQuote(SHIPMENT_ID, Date.now())
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('This bidding window has closed.')
    expect(screen.queryByRole('button', { name: /submit/i })).toBe(null)
    expect(document.querySelectorAll('h1').length).toBe(1)
    expect(document.querySelector('main')).toBeTruthy()
  })

  it('shows an invalid state for a malformed token without throwing', async () => {
    expect(() => renderAt('/spot-bid/!!not-a-real-token!!')).not.toThrow()
    await screen.findByText('This link is invalid.')
    expect(screen.queryByRole('button', { name: /submit/i })).toBe(null)
    expect(document.querySelectorAll('h1').length).toBe(1)
    expect(document.querySelector('main')).toBeTruthy()
  })
})
