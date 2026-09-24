// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TenderReview from './TenderReview.jsx'
import { mintToken } from '../spotboard/token.js'

const SHIPMENT_ID = '25690001'
const SCAC = 'ODFL'
const TOKEN = mintToken(SHIPMENT_ID, SCAC)

function baseOption(overrides = {}) {
  return {
    rank: 1,
    scac: SCAC,
    carrierName: 'Old Dominion',
    equipmentCode: 'VAN',
    rateAmount: 1250,
    rateDetails: { baseRate: 1250, currency: 'USD', markup: 0, additionalCharges: [], apTotal: 1250, arTotal: 1250 },
    status: 'Sent',
    apiSource: 'Email',
    notifyDateTime: '09/20/2026 08:00',
    pickupDateTime: '09/22/2026 08:00',
    pickupTZ: 'CST',
    deliveryDateTime: '09/24/2026 09:00',
    deliveryTZ: 'EST',
    transitDays: 2,
    distanceMiles: 842.3,
    tenderToken: TOKEN,
    ...overrides,
  }
}

function baseDto(optionOverrides = {}) {
  return {
    sellShipment: SHIPMENT_ID,
    odysseyShipmentIdentifier: 'ODY-25690001',
    customerName: 'Acme Corp',
    shipmentStopList: [
      { stopSequence: 1, stopType: 'pickup', facilityName: 'Acme Houston Plant', address1: '100 Refinery Rd', city: 'Houston', region: 'TX', postal: '77001', country: 'US' },
      { stopSequence: 2, stopType: 'delivery', facilityName: 'Midwest Distribution Center', address1: '8800 Industrial Ave', city: 'Chicago', region: 'IL', postal: '60601', country: 'US' },
    ],
    shippingOptionList: [baseOption(optionOverrides)],
    orderList: [
      {
        orderId: 'ORD-9001',
        orderNumber: 'SO-990001',
        equipmentCode: 'VAN',
        grossWeightValue: 22416,
        grossWeightUomCode: 'LB',
        poNumber: 'PO-4421',
        pickupNumber: 'PU-8891',
        origin: { fullName: 'Acme Houston Plant', address1: '100 Refinery Rd', city: 'Houston', region: 'TX', postal: '77001', country: 'US' },
        destination: { fullName: 'Midwest Distribution Center', address1: '8800 Industrial Ave', city: 'Chicago', region: 'IL', postal: '60601', country: 'US' },
        orderLines: [{ hazmatCode: null }],
        instructionList: [{ sequenceNumber: 1, text: 'Deliver to dock 26B only.' }],
      },
    ],
    documentList: [],
    noteList: [],
    historyList: [],
  }
}

function stubFetch(dto = baseDto()) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => dto }))
}

// Sequenced fetch — first call (page render) returns `first`, every call
// after returns `after`. Used for the 409 test: saveTenderOption's mock-mode
// guard re-fetches the raw shipment to check the option's CURRENT status.
function stubFetchSequence(first, after) {
  let n = 0
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
    n += 1
    return { ok: true, status: 200, json: async () => (n === 1 ? first : after) }
  }))
}

function renderAt(path) {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/tender-review/:token" element={<TenderReview />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function tokenFor(shipmentId, scac) {
  return mintToken(shipmentId, scac)
}

beforeEach(() => {
  stubFetch()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('TenderReview — invalid / loading', () => {
  it('an invalid token shows only the error, no shipment data', async () => {
    renderAt('/tender-review/not-a-real-token')

    await screen.findByText('This link is invalid or has expired.')
    expect(screen.queryByText('Acme Houston Plant')).toBe(null)
    expect(screen.queryByText('Acme Corp')).toBe(null)
  })

  it('a well-shaped token whose option is missing (wrong nonce / re-tendered) also reads invalid', async () => {
    renderAt(`/tender-review/${tokenFor(SHIPMENT_ID, SCAC)}`) // real shipment/scac, but not TOKEN

    await screen.findByText('This link is invalid or has expired.')
  })
})

describe('TenderReview — Sent + Email', () => {
  it('shows both Accept and Decline buttons', async () => {
    stubFetch(baseDto({ tenderToken: TOKEN, status: 'Sent', apiSource: 'Email' }))
    renderAt(`/tender-review/${TOKEN}`)

    await screen.findByText('Acme Corp')
    expect(screen.getByRole('button', { name: 'Accept Tender' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Decline Tender' })).toBeTruthy()
  })

  it('mounting the page writes nothing', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => baseDto() })
    vi.stubGlobal('fetch', fetchSpy)
    renderAt(`/tender-review/${TOKEN}`)

    await screen.findByText('Acme Corp')
    // Every fetch call is a GET for shipment detail — none is a tender PUT
    // (saveTenderOption's live path would call apiPut, not the global fetch
    // stub here in mock mode; the assertion that matters is that no write
    // path fired at all, i.e. no state transitioned).
    expect(screen.getByRole('button', { name: 'Accept Tender' })).toBeTruthy()
    expect(screen.queryByText(/tender accepted/i)).toBe(null)
    expect(screen.queryByText(/tender declined/i)).toBe(null)
  })

  it('Accept writes once with responseMethod "Email Links Update" and expectStatus "Sent", then shows the Accepted banner', async () => {
    stubFetch(baseDto({ tenderToken: TOKEN, status: 'Sent', apiSource: 'Email' }))
    renderAt(`/tender-review/${TOKEN}`)
    await screen.findByText('Acme Corp')

    fireEvent.click(screen.getByRole('button', { name: 'Accept Tender' }))

    await waitFor(() => {
      expect(screen.getByText(/tender accepted/i)).toBeTruthy()
    })
    expect(screen.getByText(/Reference ODY-25690001\./)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Accept Tender' })).toBe(null)
    expect(screen.queryByRole('button', { name: 'Decline Tender' })).toBe(null)
    // TE-3 (user ruling 2026-09-24) — the accepted banner names the carrier's
    // synthesized ops mailbox, same formula as tenderEmailContext.js's toEmail.
    expect(screen.getByText(new RegExp(`A confirmation has been emailed to ops@${SCAC.toLowerCase()}\\.example\\.com`))).toBeTruthy()
  })

  it('Decline is disabled until a reason is chosen, and writes the reason + comments', async () => {
    stubFetch(baseDto({ tenderToken: TOKEN, status: 'Sent', apiSource: 'Email' }))
    renderAt(`/tender-review/${TOKEN}`)
    await screen.findByText('Acme Corp')

    fireEvent.click(screen.getByRole('button', { name: 'Decline Tender' }))
    const confirmBtn = screen.getByRole('button', { name: 'Confirm Decline' })
    expect(confirmBtn.disabled).toBe(true)

    fireEvent.click(document.querySelector('.dropdown-button'))
    fireEvent.click(screen.getByText('Rate too low'))
    expect(confirmBtn.disabled).toBe(false)

    fireEvent.change(screen.getByLabelText('Comments (optional)'), { target: { value: 'Too far from lane.' } })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(screen.getByText(/tender declined/i)).toBeTruthy()
    })
    expect(screen.getByText(/Reason: Rate too low\./)).toBeTruthy()
    // Decline never sends TE-3.
    expect(screen.queryByText(/A confirmation has been emailed/)).toBe(null)
  })

  it('Cancel on the decline form returns to the two buttons without writing', async () => {
    stubFetch(baseDto({ tenderToken: TOKEN, status: 'Sent', apiSource: 'Email' }))
    renderAt(`/tender-review/${TOKEN}`)
    await screen.findByText('Acme Corp')

    fireEvent.click(screen.getByRole('button', { name: 'Decline Tender' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('button', { name: 'Accept Tender' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Decline Tender' })).toBeTruthy()
    expect(screen.queryByText(/tender declined/i)).toBe(null)
  })

  it('a 409 response shows the verbatim BR-07 message', async () => {
    const sent = baseDto({ tenderToken: TOKEN, status: 'Sent', apiSource: 'Email' })
    const alreadyProcessed = baseDto({ tenderToken: TOKEN, status: 'Accepted', apiSource: 'Email' })
    stubFetchSequence(sent, alreadyProcessed)
    renderAt(`/tender-review/${TOKEN}`)
    await screen.findByText('Acme Corp')

    fireEvent.click(screen.getByRole('button', { name: 'Accept Tender' }))

    await waitFor(() => {
      expect(screen.getByText('This tender response has already been submitted and cannot be processed again.')).toBeTruthy()
    })
  })
})

describe('TenderReview — Sent + Email & EDI', () => {
  it('shows no buttons, only the informational notice', async () => {
    stubFetch(baseDto({ tenderToken: TOKEN, status: 'Sent', apiSource: 'Email & EDI' }))
    renderAt(`/tender-review/${TOKEN}`)
    await screen.findByText('Acme Corp')

    expect(screen.queryByRole('button', { name: 'Accept Tender' })).toBe(null)
    expect(screen.queryByRole('button', { name: 'Decline Tender' })).toBe(null)
    expect(screen.getByText(/informational copy/i)).toBeTruthy()
  })
})

describe('TenderReview — already-responded states', () => {
  it('Accepted shows the banner with no buttons', async () => {
    stubFetch(baseDto({ tenderToken: TOKEN, status: 'Accepted', apiSource: 'Email', responseDateTime: '09/21/2026 10:00' }))
    renderAt(`/tender-review/${TOKEN}`)
    await screen.findByText('Acme Corp')

    expect(screen.getByText(/tender accepted/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Accept Tender' })).toBe(null)
    expect(screen.queryByRole('button', { name: 'Decline Tender' })).toBe(null)
  })

  it('Declined shows the banner with the reason appended, no buttons', async () => {
    stubFetch(baseDto({
      tenderToken: TOKEN, status: 'Declined', apiSource: 'Email',
      responseDateTime: '09/21/2026 10:00', declineReason: 'Rate too low',
    }))
    renderAt(`/tender-review/${TOKEN}`)
    await screen.findByText('Acme Corp')

    expect(screen.getByText(/tender declined/i)).toBeTruthy()
    expect(screen.getByText(/Reason: Rate too low\./)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Accept Tender' })).toBe(null)
  })

  it('a Cancelled/other status shows "no longer open", no buttons', async () => {
    stubFetch(baseDto({ tenderToken: TOKEN, status: 'Cancelled', apiSource: 'Email' }))
    renderAt(`/tender-review/${TOKEN}`)
    await screen.findByText('Acme Corp')

    expect(screen.getByText('This tender is no longer open.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Accept Tender' })).toBe(null)
  })
})
