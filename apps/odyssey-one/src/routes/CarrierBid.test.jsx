// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within, cleanup, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CarrierBid, { BidCountdownStrip } from './CarrierBid.jsx'
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
  // A single 'Quoted' (not Accepted/Sent) option — no *current tender*, so
  // stopsData.summary.distance itself still resolves to '--', exercising
  // CarrierBid.jsx's routing-options fallback (never-empty Distance ruling).
  shippingOptionList: [
    { rank: 1, scac: SCAC, status: 'Quoted', distanceMiles: 842.3 },
  ],
  orderList: [
    {
      orderId: ORDER_ID,
      orderNumber: ORDER_NUMBER,
      equipmentCode: 'VAN',
      grossWeightValue: 22416,
      grossWeightUomCode: 'LB',
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

function stubFetch(dto = DTO) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => dto }))
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
  it('renders the bid form and no AppShell chrome (sidebar); the page Navbar itself is absent on this branch (ponytail experiment)', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')
    expect(screen.getByRole('button', { name: /submit/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /decline/i })).toBeTruthy()

    // No AppShell chrome: no <nav> landmark, none of the Sidebar's domain
    // labels.
    expect(document.querySelector('nav')).toBe(null)
    expect(screen.queryByText('User Management')).toBe(null)

    // ponytail experiment: the countdown strip becomes this page's navbar
    // on the open-bid branch, so the package <Navbar> (a <header>) is
    // removed from the tree entirely here — not just hidden. See the
    // "countdown-strip-as-navbar" describe block below for the bar's own
    // assertions, and the closed/expired/invalid describe block for proof
    // the real Navbar still renders unchanged on that other branch.
    expect(document.querySelector('header')).toBe(null)
    // GlobalSearch's "Carrier Portal" title lived inside that Navbar —
    // gone along with it on this branch (out of scope for the experiment's
    // 3-region bar: logo, cells, trail).
    expect(screen.queryByText('Carrier Portal')).toBe(null)
  })

  it('maps the resolved carrier onto the TrailNav profile (SCAC on top, full name as role)', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    // SCAC is the prominent top line (`name` slot), full carrier name is
    // the smaller second line (`role` slot) — matches the Figma External
    // variant (5152:3904): "KNGT" over "KNIGHT-SWIFT TRANSPORTATION". No
    // <header> to scope into on this branch (see above) — TrailNav now
    // lives directly inside the countdown bar.
    expect(screen.getByText(SCAC).classList.contains('trail-nav-profile-name')).toBe(true)
    expect(screen.getByText('Old Dominion').classList.contains('trail-nav-profile-role')).toBe(true)
    // TrailNav showBell={false} / showCustomers={false}, unchanged from the
    // original Navbar-hosted instance.
    expect(screen.queryByLabelText('Notifications')).toBe(null)
    expect(screen.queryByLabelText('Customers')).toBe(null)
  })

  it('TrailNav avatar: initials from the first two words of the carrier name, split on space AND hyphen', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    // CARRIERS[0].name === 'Old Dominion' → "O" + "D". Decorative next to
    // the visible SCAC/name text, so it must not announce redundantly.
    const avatar = document.querySelector('.carrier-bid-avatar')
    expect(avatar.textContent).toBe('OD')
    expect(avatar.getAttribute('aria-hidden')).toBe('true')
  })

  it('TrailNav avatar: falls back to the first two SCAC characters when the carrier name is unresolved', async () => {
    saveDraft(SHIPMENT_ID, {
      listId: 'tl-se',
      listName: 'TL Southeast Overflow',
      durationMin: 120,
      carriers: [{ scac: 'XPOL', name: '', email: 'ops@xpol.example.com', equipment: 'Van', incl: true, plannedPickup: '', plannedDelivery: '', flags: [] }],
    })
    const quote = sendRFQ(SHIPMENT_ID, Date.now())
    const token = tokenFor(quote, 'XPOL')
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    const avatar = document.querySelector('.carrier-bid-avatar')
    expect(avatar.textContent).toBe('XP')
  })

  it('opens a profile dropdown reading "Soon, your operations in ONE place"', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    expect(screen.queryByText('Soon, your operations in ONE place')).toBe(null)
    fireEvent.click(screen.getByRole('button', { name: 'User menu' }))
    expect(screen.getByText('Soon, your operations in ONE place')).toBeTruthy()
  })

  it('submitting a bid writes it into spotStore for that scac, with a correctly computed total', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    const linehaulInput = screen.getByLabelText(/linehaul/i)
    fireEvent.change(linehaulInput, { target: { value: '1500' } })

    // Additional Charges — the DTO's one special service (LFT/Lift Gate)
    // seeds a derived row whose Amount stays editable; typing into it is
    // enough to exercise submission without touching the ComboBox at all.
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } })

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
    // The derived row's own code/description (order.specialServices) ride
    // straight through to the wire — blank rows submit as ABSENT, not
    // zero-amount lines.
    expect(row.bid.accessorials).toEqual([{ code: 'LFT', description: 'Lift Gate', amount: 100 }])
    expect(row.bid.total).toBe(1850.5)

    // Other carrier's row untouched.
    expect(stored.carriers.find((c) => c.scac === 'SAIA').bid).toBeUndefined()
  })

  it('never renders an Order ID or Load ID anywhere in the DOM, incl. portals and attributes', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

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

    await screen.findByText('Acme Houston Plant')
    // SubAccordion's title renders as a styled span inside the toggle
    // button, not a heading element — query by text instead.
    expect(screen.getByText(new RegExp(`Quote ${quote.quoteId}`))).toBeTruthy()
  })

  it('both sections render expanded by default and can be collapsed', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    const toggles = screen.getAllByRole('button', { name: /shipment detail|your bid/i })
    expect(toggles.length).toBe(2)
    toggles.forEach((t) => expect(t.getAttribute('aria-expanded')).toBe('true'))

    fireEvent.click(toggles[0])
    expect(toggles[0].getAttribute('aria-expanded')).toBe('false')
    expect(toggles[1].getAttribute('aria-expanded')).toBe('true')
  })

  it('shipment detail reads as descriptive TitleSubtitle values, not disabled/readonly form fields', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    const detailSection = screen.getByRole('button', { name: /shipment detail/i }).closest('.sub-accordion')
    // No input/textarea/select and no disabled control anywhere in the section —
    // the S112 Rate Details conversion idiom: values render as text, not blocked fields.
    expect(detailSection.querySelectorAll('input, textarea, select, [disabled]').length).toBe(0)
    // TitleSubtitle pair: subtitle (label) + title (value) both present as text.
    expect(within(detailSection).getByText('Shipper')).toBeTruthy()
    expect(within(detailSection).getByText('Acme Houston Plant')).toBeTruthy()

    // "Your Bid" keeps real inputs — only the read-only shipment detail changed.
    const bidSection = screen.getByRole('button', { name: /your bid/i }).closest('.sub-accordion')
    expect(bidSection.querySelectorAll('input').length).toBeGreaterThan(0)
  })

  it('both sections resolve to the same width constraint via the shared .sub-accordion rule, no per-section override', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    const toggles = screen.getAllByRole('button', { name: /shipment detail|your bid/i })
    const sections = toggles.map((t) => t.closest('.sub-accordion'))
    expect(sections.length).toBe(2)
    // Width is governed solely by `.carrier-bid-page .sub-accordion` (base + the
    // 640px bump). If either section carried its own modifier class, that class
    // could carry its own max-width override and the two would diverge again —
    // assert the shared class/rule rather than a computed pixel value (jsdom
    // doesn't lay out).
    const knownStateClasses = ['sub-accordion', 'sub-accordion--expanded', 'sub-accordion--static']
    for (const section of sections) {
      const extra = Array.from(section.classList).filter((c) => !knownStateClasses.includes(c))
      expect(extra).toEqual([])
    }
  })

  it('top-level sections carry the entrance class with a strictly increasing, non-random --enter-delay, top to bottom (SPB-43 plan §3c)', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    // Shipment Detail, Your Bid, Summary — in that DOM order. Each
    // SubAccordion is wrapped in a plain div carrying the entrance class +
    // inline --enter-delay (SubAccordion itself has no `style` prop and is
    // an untouched @odyssey/ui component — see CarrierBid.jsx).
    const toggles = screen.getAllByRole('button', { name: /^shipment detail|^your bid|^summary$/i })
    expect(toggles.length).toBe(3)
    const wrappers = toggles.map((t) => t.closest('.sub-accordion').parentElement)

    // Deterministic — no Math.random(), no shuffle (deliberate deviation
    // from Home's randomized order): must render identically every reload.
    wrappers.forEach((w) => {
      expect(w.classList.contains('hero-enter') || w.classList.contains('hero-enter-waiting')).toBe(true)
    })
    const delays = wrappers.map((w) => parseInt(w.style.getPropertyValue('--enter-delay'), 10))
    expect(delays).toEqual([0, 90, 180])
  })

  it('renders shipment gross weight in Shipment Detail (SPB-43 §4)', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')
    expect(screen.getByText('Weight')).toBeTruthy()
    // stopsData.summary.grossWeight, from DTO orderList[0].grossWeightValue (22416 LB).
    expect(screen.getByText('22,416 LB')).toBeTruthy()
  })

  it('Distance never renders "--": falls back to a non-current routing option\'s distance', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')
    // DTO's one routing option is 'Quoted' (not Accepted/Sent), so
    // stopsData.summary.distance itself is '--' — this is the fallback path.
    expect(screen.getByText('842.30 mi')).toBeTruthy()
  })

  it('Distance ceiling: renders the dash without crashing when the shipment has zero routing options', async () => {
    // ponytail-documented ceiling — no coords/header distance surfaced by the
    // VM at all when there are no routing options; '--' is the honest floor.
    stubFetch({ ...DTO, shippingOptionList: [] })
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    expect(() => renderAt(`/spot-bid/${token}`)).not.toThrow()

    await screen.findByText('Acme Houston Plant')
    const detailSection = screen.getByRole('button', { name: /shipment detail/i }).closest('.sub-accordion')
    expect(within(detailSection).getByText('Distance')).toBeTruthy()
  })

  it('Fuel is disabled (not readOnly) and labelled "Fuel (Estimated)" (SPB-43 §5)', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')
    const fuelInput = screen.getByLabelText('Fuel (Estimated)')
    expect(fuelInput.disabled).toBe(true)
    expect(fuelInput.value).toBe('$250.50')
  })

  it('a special-service row (order.specialServices) prefills derived, disabled, and preselected (SPB-43 restore)', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    const bidSection = screen.getByRole('button', { name: /your bid/i }).closest('.sub-accordion')
    // The DTO's one special service (LFT / Lift Gate) — exactly one row,
    // seeded by the async effect once `order` loads (not a lazy useState
    // initializer, which can't see order.specialServices at mount).
    const combo = within(bidSection).getByRole('combobox')
    expect(combo.value).toBe('LFT')
    expect(combo.disabled).toBe(true)

    const description = within(bidSection).getByLabelText('Description')
    expect(description.value).toBe('Lift Gate')
    expect(description.disabled).toBe(true)

    const removeBtn = within(bidSection).getByRole('button', { name: 'Remove charge 1' })
    expect(removeBtn.disabled).toBe(true)
    expect(removeBtn.getAttribute('title')).toMatch(/required for this shipment/i)

    // Amount is NOT disabled — the special service is mandatory, its dollar
    // figure is still the carrier's own quote.
    expect(within(bidSection).getByLabelText('Amount').disabled).toBe(false)
  })

  it('Add Row appends a fully editable row; its remove button works (SPB-43 restore)', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    const bidSection = screen.getByRole('button', { name: /your bid/i }).closest('.sub-accordion')
    expect(within(bidSection).getAllByRole('combobox')).toHaveLength(1) // derived LFT row only

    fireEvent.click(within(bidSection).getByRole('button', { name: /add row/i }))
    const combos = within(bidSection).getAllByRole('combobox')
    expect(combos).toHaveLength(2)
    const newCombo = combos[combos.length - 1]
    expect(newCombo.disabled).toBe(false)
    const removeBtns = within(bidSection).getAllByRole('button', { name: /remove charge/i })
    expect(removeBtns[removeBtns.length - 1].disabled).toBe(false)

    fireEvent.click(removeBtns[removeBtns.length - 1])
    expect(within(bidSection).getAllByRole('combobox')).toHaveLength(1)
  })

  it('every Additional Charges field carries a real accessible name (SPB-43 labelling job)', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    const bidSection = screen.getByRole('button', { name: /your bid/i }).closest('.sub-accordion')
    // Code: a real <label for>, not ComboBox's own (unlinked) showLabel span.
    const combo = within(bidSection).getByRole('combobox')
    const label = bidSection.querySelector(`label[for="${combo.id}"]`)
    expect(label).toBeTruthy()
    expect(label.textContent).toBe('Code')
    // Description / Amount: FormField / MeasureField's own showLabel, which
    // DOES render a real <label htmlFor>.
    expect(within(bidSection).getByLabelText('Description')).toBeTruthy()
    expect(within(bidSection).getByLabelText('Amount')).toBeTruthy()
    // No hand-rolled Code/Description/Amount header row left over.
    expect(within(bidSection).queryByText('Code')).toBe(label) // the one real label, nothing else
  })

  it('Additional Charges totals (Summary card + Grand Total) include both a derived and a carrier-added charge', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    fireEvent.change(screen.getByLabelText(/linehaul/i), { target: { value: '1500' } })

    const bidSection = screen.getByRole('button', { name: /your bid/i }).closest('.sub-accordion')
    // Derived LFT row's own Amount (only row present so far — unambiguous).
    fireEvent.change(within(bidSection).getByLabelText('Amount'), { target: { value: '25' } })

    // Add a carrier row and pick a code the same way QuoteModal.test.jsx does
    // — keyboard-select off the loadOptions popover (its virtualized rows
    // aren't otherwise assertable in jsdom).
    fireEvent.click(within(bidSection).getByRole('button', { name: /add row/i }))
    const rows = bidSection.querySelectorAll('.carrier-bid-charges__row')
    const newRow = rows[rows.length - 1]
    const codeInput = within(newRow).getByRole('combobox')
    await act(async () => {
      fireEvent.focus(codeInput)
      await new Promise((resolve) => setTimeout(resolve, 10)) // flush the 0-debounce load
    })
    fireEvent.keyDown(codeInput, { key: 'ArrowDown' }) // highlights HZC — highest frequency (50)
    fireEvent.keyDown(codeInput, { key: 'Enter' })
    fireEvent.change(within(newRow).getByLabelText('Amount'), { target: { value: '100' } })

    const summarySection = screen.getByRole('button', { name: 'Summary' }).closest('.sub-accordion')
    // 1500 linehaul + 250.50 fuel + 25 LFT + 100 HZC = 1875.50.
    expect(within(summarySection).getByText('$1,875.50')).toBeTruthy()
    expect(within(summarySection).getByText('LFT')).toBeTruthy()
    expect(within(summarySection).getByText('HZC')).toBeTruthy()
  })

  it('Summary section (renamed from "Price Summary") Grand Total equals linehaul + fuel + charges (SPB-43 §6, no markup line)', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    fireEvent.change(screen.getByLabelText(/linehaul/i), { target: { value: '1500' } })
    // Derived LFT row's own Amount — only row present, unambiguous.
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } })

    const summarySection = screen.getByRole('button', { name: 'Summary' }).closest('.sub-accordion')
    // 1500 linehaul + 250.50 fuel + 100 charge = 1850.50.
    expect(within(summarySection).getByText('$1,850.50')).toBeTruthy()
    // SPB-15: QMU is Odyssey-side, applied after award — never shown to carriers.
    expect(within(summarySection).queryByText(/markup/i)).toBe(null)
  })

  it('Decline/Submit actions live inside the Summary section, below the grand total (fix 2026-08-18)', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    const summarySection = screen.getByRole('button', { name: 'Summary' }).closest('.sub-accordion')
    expect(within(summarySection).getByRole('button', { name: /decline/i })).toBeTruthy()
    expect(within(summarySection).getByRole('button', { name: /submit/i })).toBeTruthy()

    // No longer inside "Your Bid".
    const bidSection = screen.getByRole('button', { name: /your bid/i }).closest('.sub-accordion')
    expect(within(bidSection).queryByRole('button', { name: /decline/i })).toBe(null)
    expect(within(bidSection).queryByRole('button', { name: /submit/i })).toBe(null)
  })
})

describe('CarrierBid — bid countdown SummaryStrip (SPB-43 §2)', () => {
  afterEach(() => vi.useRealTimers())

  it('renders as a SummaryStrip: hours, minutes, seconds, then a "Bid Open" status Badge cell (Figma 5180:7978)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-17T12:00:00Z'))
    // durationMin defaults to 120 => remaining is 02:00:00 — the hours cell
    // now absorbs what used to be a >99-minute overflow into minutes.
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    const strip = document.querySelector('.carrier-bid-countdown-strip')
    expect(strip).toBeTruthy()
    expect(strip.tagName).toBe('DL')

    const cells = strip.querySelectorAll('.summary-strip__cell')
    expect(cells).toHaveLength(4) // Hours, Minutes, Seconds, Remaining

    expect(cells[0].querySelector('dd').textContent).toBe('02')
    // Natural-case in the DOM — SummaryStrip's CSS (.summary-strip__label
    // { text-transform: uppercase }) does the visual uppercasing, which
    // jsdom's textContent doesn't reflect; the component must pass natural
    // case per the component's own contract.
    expect(cells[0].querySelector('dt').textContent).toBe('Hours')
    expect(cells[0].querySelector('dd').className).toContain('summary-strip__value--display')

    expect(cells[1].querySelector('dd').textContent).toBe('00')
    expect(cells[1].querySelector('dt').textContent).toBe('Minutes')
    expect(cells[1].querySelector('dd').className).toContain('summary-strip__value--display')

    expect(cells[2].querySelector('dd').textContent).toBe('00')
    expect(cells[2].querySelector('dt').textContent).toBe('Seconds')
    expect(cells[2].querySelector('dd').className).toContain('summary-strip__value--display')

    // Fourth cell — label-less status Badge, not a label+value pair.
    expect(cells[3].querySelector('dt')).toBeNull()
    const badgeCell = cells[3].querySelector('dd')
    expect(badgeCell.textContent).toBe('Bid Open')
    expect(badgeCell.className).not.toContain('summary-strip__value--display')

    // No colon anywhere in the digit values.
    expect(cells[0].querySelector('dd').textContent).not.toContain(':')
    expect(cells[1].querySelector('dd').textContent).not.toContain(':')
    expect(cells[2].querySelector('dd').textContent).not.toContain(':')
  })

  it('applies the urgent modifier once remaining time drops under 15 minutes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-17T12:00:00Z'))
    const quote = openQuote(10) // 10 min remaining, under the 15-min threshold
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    const strip = document.querySelector('.carrier-bid-countdown-strip')
    expect(strip.className).toContain('carrier-bid-countdown-strip--urgent')
  })

  it('does not apply the urgent modifier above the 15-minute threshold', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-17T12:00:00Z'))
    const quote = openQuote(20)
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    const strip = document.querySelector('.carrier-bid-countdown-strip')
    expect(strip.className).not.toContain('carrier-bid-countdown-strip--urgent')
  })
})

describe('CarrierBid — countdown strip as navbar (ponytail experiment, SPB-43)', () => {
  it('renders the Odyssey logo and the carrier TrailNav inside the strip bar wrapper', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    const wrap = document.querySelector('.carrier-bid-countdown-strip-wrap')
    expect(wrap).toBeTruthy()
    // Logo — OdysseyLogo's own aria-label, same for both variants.
    expect(within(wrap).getByRole('img', { name: 'Odyssey One' })).toBeTruthy()
    // The four SummaryStrip cells still live inside the same wrapper.
    expect(wrap.querySelector('.carrier-bid-countdown-strip')).toBeTruthy()
    // TrailNav's profile button, still wired to the same dropdown.
    expect(within(wrap).getByRole('button', { name: 'User menu' })).toBeTruthy()

    // The package Navbar (a <header>) is gone from this branch — see the
    // "open quote" describe block above for the fuller assertion.
    expect(document.querySelector('header')).toBe(null)
  })

  it('toggles the compact class on the strip wrapper past a 20px scroll threshold, and back below it', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    const wrap = document.querySelector('.carrier-bid-countdown-strip-wrap')
    expect(wrap.classList.contains('carrier-bid-countdown-strip-wrap--compact')).toBe(false)

    Object.defineProperty(window, 'scrollY', { value: 25, configurable: true })
    fireEvent.scroll(window)
    expect(wrap.classList.contains('carrier-bid-countdown-strip-wrap--compact')).toBe(true)

    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
    fireEvent.scroll(window)
    expect(wrap.classList.contains('carrier-bid-countdown-strip-wrap--compact')).toBe(false)
  })

  it('stays non-compact at exactly the 20px threshold (strict > 20 check)', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    const wrap = document.querySelector('.carrier-bid-countdown-strip-wrap')
    Object.defineProperty(window, 'scrollY', { value: 20, configurable: true })
    fireEvent.scroll(window)
    expect(wrap.classList.contains('carrier-bid-countdown-strip-wrap--compact')).toBe(false)
  })
})

describe('BidCountdownStrip — closed/expired degrade (unit)', () => {
  it('once remaining hits 0, renders a single "Closed" value cell instead of stale/negative digits', () => {
    render(<BidCountdownStrip closeAt={Date.now() - 5000} />)

    const cells = document.querySelectorAll('.summary-strip__cell')
    expect(cells).toHaveLength(1)
    expect(cells[0].querySelector('dt')).toBeNull()
    expect(cells[0].querySelector('dd').textContent).toBe('Closed')
    expect(document.querySelector('.carrier-bid-countdown-strip--urgent')).toBeNull()
    // The open-bid "Bid Open" badge must not survive into the closed
    // degrade — it would misreport an already-closed bid as open.
    expect(screen.queryByText('Bid Open')).toBeNull()
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
    // The external Navbar still renders in the closed/expired/invalid
    // branch — no <h1> anymore (GlobalSearch title mode replaced it).
    expect(document.querySelector('header.navbar--external')).toBeTruthy()
    expect(document.querySelectorAll('h1').length).toBe(0)
    expect(document.querySelector('main')).toBeTruthy()
  })

  it('shows the closed-window state when the quote status is closed', async () => {
    const quote = openQuote()
    closeQuote(SHIPMENT_ID, Date.now())
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('This bidding window has closed.')
    expect(screen.queryByRole('button', { name: /submit/i })).toBe(null)
    // The external Navbar still renders in the closed/expired/invalid
    // branch — no <h1> anymore (GlobalSearch title mode replaced it).
    expect(document.querySelector('header.navbar--external')).toBeTruthy()
    expect(document.querySelectorAll('h1').length).toBe(0)
    expect(document.querySelector('main')).toBeTruthy()
  })

  it('shows an invalid state for a malformed token without throwing', async () => {
    expect(() => renderAt('/spot-bid/!!not-a-real-token!!')).not.toThrow()
    await screen.findByText('This link is invalid.')
    expect(screen.queryByRole('button', { name: /submit/i })).toBe(null)
    // The external Navbar still renders in the closed/expired/invalid
    // branch — no <h1> anymore (GlobalSearch title mode replaced it).
    expect(document.querySelector('header.navbar--external')).toBeTruthy()
    expect(document.querySelectorAll('h1').length).toBe(0)
    expect(document.querySelector('main')).toBeTruthy()
  })
})

describe('CarrierBid — hero background (SPB-43 plan, changes 1 & 2, 2026-08-18)', () => {
  it('scopes the flipped mask to this page only, and rotates through more than one photo layer', async () => {
    const quote = openQuote()
    const token = tokenFor(quote, SCAC)
    renderAt(`/spot-bid/${token}`)

    await screen.findByText('Acme Houston Plant')

    const bg = document.querySelector('.carrier-bid-page__bg')
    expect(bg).toBeTruthy()
    // Base shared layer class stays present (Home consumes the same one)
    // PLUS the page-scoped flip modifier — the class name itself is the
    // opt-in mechanism keeping Home's masks (which never get this class)
    // untouched. jsdom can't see the mask render, so this class assertion
    // is the assertable proxy for it.
    expect(bg.classList.contains('hero-bg')).toBe(true)
    expect(bg.classList.contains('hero-bg--flipped')).toBe(true)

    // One stacked .hero-bg__photo per HERO_IMAGES entry (cross-fade
    // mechanism, same as Home) — not a single static photo anymore.
    const photos = bg.querySelectorAll('.hero-bg__photo')
    expect(photos.length).toBeGreaterThan(1)
    // Exactly one photo starts opaque (the deterministic initial index).
    const opaque = Array.from(photos).filter((p) => p.style.opacity === '1')
    expect(opaque).toHaveLength(1)
  })

  it("never opts Home into the flipped modifier — Home's own hero div source has no '--flipped' class", () => {
    // Static-source guard (no Home render harness exists in this repo) —
    // reads Home.jsx directly to confirm it still applies only the plain
    // shared `.hero-bg` class, never `hero-bg--flipped`. Paired with
    // hero.css's own scoping (the flip rules only fire under
    // `.hero-bg--flipped`), this is the assertable half of "Home's
    // appearance must not change".
    const homeSrc = readFileSync(resolve(process.cwd(), 'src/routes/Home.jsx'), 'utf8')
    expect(homeSrc).not.toContain('hero-bg--flipped')
    expect(homeSrc).toContain('className="hero-bg home-background"')
  })
})
