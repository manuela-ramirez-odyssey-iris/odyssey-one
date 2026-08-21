// @vitest-environment jsdom
import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import LiveBids from './LiveBids'

const NOW = Date.now()

function carrier(scac, name, bid) {
  return {
    scac,
    name,
    email: `ops@${scac.toLowerCase()}.example.com`,
    equipment: 'Van',
    incl: true,
    plannedPickup: '',
    plannedDelivery: '',
    flags: [],
    ...(bid ? { bid } : {}),
  }
}

function bidOf({ linehaul, fuel, accessorials = [], total, submittedBy }) {
  return {
    linehaul,
    fuel,
    accessorials,
    total,
    status: 'bid',
    submittedBy,
    respondedAt: NOW,
  }
}

// Closed quote: 3 carriers with real bids (ODFL lowest), 1 declined, 1 silent.
const CLOSED_QUOTE = {
  quoteId: 'Q-1001',
  shipmentId: '0000000091105',
  listId: 'tl-se',
  listName: 'TL Southeast Overflow',
  durationMin: 120,
  openAt: NOW - 2 * 60 * 60000,
  closeAt: NOW - 60000,
  status: 'closed',
  awardType: null,
  awardedScac: null,
  carriers: [
    carrier('ODFL', 'Old Dominion', bidOf({
      linehaul: 2000, fuel: 200,
      accessorials: [{ code: 'LGT', description: 'Liftgate', amount: 75 }],
      total: 2275, submittedBy: 'ops@odfl.example.com',
    })),
    carrier('SAIA', 'Saia Motor Freight', bidOf({
      linehaul: 2100, fuel: 210,
      accessorials: [{ code: 'RES', description: 'Residential', amount: 50 }],
      total: 2360, submittedBy: 'ops@saia.example.com',
    })),
    carrier('RDWY', 'Roadway Express', bidOf({
      linehaul: 2250, fuel: 250,
      accessorials: [],
      total: 2500, submittedBy: 'ops@rdwy.example.com',
    })),
    carrier('FXFE', 'FedEx Freight', { status: 'declined', respondedAt: NOW }),
    carrier('XPO', 'XPO Logistics', null),
  ],
}

const OPEN_QUOTE = {
  ...CLOSED_QUOTE,
  status: 'open',
  closeAt: NOW + 20 * 60000,
}

describe('LiveBids', () => {
  test('closed quote with 3 bids renders the lowest with a green Lowest bid badge', () => {
    const { container } = render(<LiveBids quote={CLOSED_QUOTE} />)
    const table = within(container.querySelector('.odyssey-group-table'))
    const lowestBadge = table.getByText('Lowest bid')
    expect(lowestBadge).toBeTruthy()
    // Exactly one carrier is marked lowest.
    expect(table.queryAllByText('Lowest bid').length).toBe(1)
    // It's ODFL's row that carries it.
    const row = lowestBadge.closest('tr')
    expect(row.textContent).toContain('ODFL')
  })

  test('a silent carrier renders No Bid Submitted and NOT Declined', () => {
    const { container } = render(<LiveBids quote={CLOSED_QUOTE} />)
    const table = within(container.querySelector('.odyssey-group-table'))
    const noBidBadge = table.getByText('No Bid Submitted')
    const row = noBidBadge.closest('tr')
    expect(row.textContent).toContain('XPO')
    expect(row.textContent).not.toContain('Declined')
  })

  test('expanding a bid row reveals its priced breakdown as COLUMNS', () => {
    render(<LiveBids quote={CLOSED_QUOTE} />)
    expect(screen.queryByText(/LGT/)).toBeFalsy()
    fireEvent.click(screen.getByRole('button', { name: /ODFL/ }))

    // Scoped to the nested table — the closed quote's TolerancePanel prints the
    // same lowest-bid total, so document-wide queries are ambiguous here.
    const detail = within(document.querySelector('.odyssey-group-table__detail'))

    // Six columns (S112): code + description are real columns again, alongside
    // the four pricing headings the outer row used to carry.
    for (const heading of ['Code', 'Description', 'Linehaul', 'Fuel', 'Accessorials', 'Total']) {
      expect(detail.getByText(heading)).toBeTruthy()
    }
    // ODFL: 2000 linehaul + 200 fuel + 75 liftgate = 2275
    expect(detail.getByText('$2,000.00')).toBeTruthy()
    expect(detail.getByText('$200.00')).toBeTruthy()
    expect(detail.getByText('$2,275.00')).toBeTruthy()
    // …and the accessorial itemises into its OWN code/description cells,
    // with its amount under the Accessorials column it rolls into.
    expect(detail.getByText('LGT')).toBeTruthy()
    expect(detail.getByText('Liftgate')).toBeTruthy()
    const itemised = detail.getByText('LGT').closest('tr')
    expect(within(itemised).getByText('$75.00')).toBeTruthy()
  })

  // S112 kept pricing off the outer row entirely; the user has since reversed
  // that for Total only — the outer row now identifies + states + totals.
  test('the main row carries identity + state + a trailing Total, no other money', () => {
    render(<LiveBids quote={CLOSED_QUOTE} />)
    const headers = [...document.querySelectorAll('.odyssey-group-table__table > thead th')]
      .map((th) => th.textContent)
    // trailing '' is the pinned Award action column (stickyActions)
    expect(headers).toEqual(['Carrier', 'Status', 'Submitted By', 'Response', 'Total', ''])
  })

  test('outer row Total: a bid carrier shows fmtDollar(bid.total), a bidless carrier shows —', () => {
    const { container } = render(<LiveBids quote={CLOSED_QUOTE} />)
    const table = within(container.querySelector('.odyssey-group-table'))

    // ODFL bid total is 2275 — collapsed, so this can only be the outer row's
    // value (the nested breakdown table doesn't exist until expanded).
    const odflRow = table.getByText(/ODFL/).closest('tr')
    expect(within(odflRow).getByText('$2,275.00')).toBeTruthy()

    // XPO never submitted a bid at all — its Total cell (the right-aligned
    // trailing column) reads the em-dash, same as its other empty cells.
    const xpoRow = table.getByText(/XPO/).closest('tr')
    const xpoTotalCell = xpoRow.querySelector('.odyssey-group-table__cell--right')
    expect(xpoTotalCell.textContent).toBe('—')

    // FXFE declined — also no total.
    const fxfeRow = table.getByText(/FXFE/).closest('tr')
    const fxfeTotalCell = fxfeRow.querySelector('.odyssey-group-table__cell--right')
    expect(fxfeTotalCell.textContent).toBe('—')
  })

  test('onAward fires with the lowest carrier scac', () => {
    const onAward = vi.fn()
    render(<LiveBids quote={CLOSED_QUOTE} onAward={onAward} />)
    fireEvent.click(screen.getByRole('button', { name: /Award Carrier/ }))
    expect(onAward).toHaveBeenCalledWith('ODFL')
  })

  test('open state shows Force Close and not the closed actions', () => {
    render(<LiveBids quote={OPEN_QUOTE} />)
    expect(screen.getByRole('button', { name: 'Force Close' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Award Carrier/ })).toBeFalsy()
    expect(screen.queryByRole('button', { name: /Modify/ })).toBeFalsy()
    expect(screen.queryByRole('button', { name: /Clear/ })).toBeFalsy()
  })

  test('closed state shows Award/Modify/Clear and not Force Close', () => {
    render(<LiveBids quote={CLOSED_QUOTE} />)
    expect(screen.getByRole('button', { name: /Award Carrier/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Modify/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Clear/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Force Close' })).toBeFalsy()
  })

  test('closed state shows the Award Action heading and the Award ≠ tender framing sentence verbatim', () => {
    render(<LiveBids quote={CLOSED_QUOTE} />)
    expect(screen.getByText('Award Action')).toBeTruthy()
    expect(
      screen.getByText(
        'Select a carrier and award. Award moves the carrier into the shipment tendering flow — it does not assign the load until tendered.'
      )
    ).toBeTruthy()
  })

  test('open state does not show the Award Action heading', () => {
    render(<LiveBids quote={OPEN_QUOTE} />)
    expect(screen.queryByText('Award Action')).toBeFalsy()
  })

  test('closed quote with no bids at all shows a no-bids message, not a tolerance verdict', () => {
    const NO_BIDS_QUOTE = {
      ...CLOSED_QUOTE,
      carriers: [
        carrier('ODFL', 'Old Dominion', null),
        carrier('SAIA', 'Saia Motor Freight', { status: 'declined', respondedAt: NOW }),
      ],
    }
    render(<LiveBids quote={NO_BIDS_QUOTE} />)
    expect(screen.queryByText('Within tolerance — eligible for auto-award')).toBeFalsy()
    expect(document.querySelector('.alert--success')).toBeFalsy()
    expect(screen.getByText('No bids received')).toBeTruthy()
  })

  // Task 8: strip moves outside + above the accordion, sticky (Setup & Carriers convention).
  test('the quote SummaryStrip renders outside the Live Bids accordion and is sticky', () => {
    const { container } = render(<LiveBids quote={CLOSED_QUOTE} />)
    const strip = container.querySelector('.live-bids__summary')
    expect(strip).toBeTruthy()
    expect(strip.classList.contains('spot-sticky-strip')).toBe(true)

    // Not nested inside the SubAccordion's content wrapper.
    const content = container.querySelector('.sub-accordion__content')
    expect(content.contains(strip)).toBe(false)

    // Strip precedes the accordion in document order.
    const subAccordion = container.querySelector('.sub-accordion')
    expect(strip.compareDocumentPosition(subAccordion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    // Not inset inside .pane-col either — full-width bands sit directly on
    // .pane-canvas (components.css:6227-6228), same as the setup tab's
    // SpotSummaryStrip. Only the accordion keeps the column wrapper.
    expect(strip.closest('.pane-col')).toBeFalsy()
    expect(subAccordion.closest('.pane-col')).toBeTruthy()
  })

  test('an awarded quote still reads terminal status wording: silent carrier is No Bid Submitted, not Awaiting', () => {
    const AWARDED_QUOTE = { ...CLOSED_QUOTE, status: 'awarded', awardedScac: 'ODFL' }
    const { container } = render(<LiveBids quote={AWARDED_QUOTE} />)
    const table = within(container.querySelector('.odyssey-group-table'))
    const badge = table.getByText('No Bid Submitted')
    const row = badge.closest('tr')
    expect(row.textContent).toContain('XPO')
    expect(table.queryByText('Awaiting')).toBeFalsy()
  })

  // Round 2: "make the strip cells hoverable too" — SpotSummaryStrip wraps a
  // text cell in a TooltipTrigger whenever `full` is passed, even when it
  // equals `value`; node-valued cells (Status badge) are left bare.
  test('quote summary strip text cells are hoverable, node-valued cells are not', () => {
    const { container } = render(<LiveBids quote={CLOSED_QUOTE} />)
    const strip = container.querySelector('.live-bids__summary')

    const idCell = within(strip).getByText('Quote ID').closest('.summary-strip__cell')
    expect(idCell.querySelector('[data-tooltip-trigger]')).toBeTruthy()

    const listCell = within(strip).getByText('List').closest('.summary-strip__cell')
    expect(listCell.querySelector('[data-tooltip-trigger]')).toBeTruthy()

    // Status carries a Badge node, not text — no `full` is passed, so it
    // stays bare (SpotSummaryStrip must tolerate items without `full`).
    const statusCell = within(strip).getByText('Status').closest('.summary-strip__cell')
    expect(statusCell.querySelector('[data-tooltip-trigger]')).toBeFalsy()
  })

  test('hovering a hoverable strip cell opens its tooltip', () => {
    const { container } = render(<LiveBids quote={CLOSED_QUOTE} />)
    const strip = container.querySelector('.live-bids__summary')
    const trigger = within(strip)
      .getByText('Quote ID')
      .closest('.summary-strip__cell')
      .querySelector('[data-tooltip-trigger]')
    expect(trigger.getAttribute('aria-describedby')).toBeFalsy()
    fireEvent.mouseEnter(trigger)
    expect(trigger.getAttribute('aria-describedby')).toBeTruthy()
  })

  // Round 2: "when no bid is submitted no need to show the actions column."
  test('the actions column is absent from the DOM when no carrier has bid', () => {
    const NO_BID_QUOTE = {
      ...CLOSED_QUOTE,
      carriers: [
        carrier('ODFL', 'Old Dominion', null),
        carrier('SAIA', 'Saia Motor Freight', { status: 'declined', respondedAt: NOW }),
      ],
    }
    const { container } = render(<LiveBids quote={NO_BID_QUOTE} />)
    const headers = [...container.querySelectorAll('.odyssey-group-table__table > thead th')]
      .map((th) => th.textContent)
    expect(headers).toEqual(['Carrier', 'Status', 'Submitted By', 'Response', 'Total'])
    expect(container.querySelector('.odyssey-group-table__cell--sticky-right')).toBeFalsy()
    expect(screen.queryByRole('button', { name: 'Award' })).toBeFalsy()
  })

  test('the actions column is present with a per-row Award button when at least one carrier has bid', () => {
    const { container } = render(<LiveBids quote={CLOSED_QUOTE} />)
    const headers = [...container.querySelectorAll('.odyssey-group-table__table > thead th')]
      .map((th) => th.textContent)
    expect(headers).toEqual(['Carrier', 'Status', 'Submitted By', 'Response', 'Total', ''])
    expect(container.querySelector('.odyssey-group-table__cell--sticky-right')).toBeTruthy()

    const table = within(container.querySelector('.odyssey-group-table'))
    const odflRow = table.getByText(/ODFL/).closest('tr')
    expect(within(odflRow).getByRole('button', { name: 'Award' })).toBeTruthy()
  })
})
