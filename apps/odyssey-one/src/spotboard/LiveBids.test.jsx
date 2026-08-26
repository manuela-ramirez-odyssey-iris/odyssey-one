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
    // Minted at draft→open by spotStore.sendRFQ; the per-row RFQ link reads it.
    token: `tok-${scac}`,
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
  test('the main row carries identity + state + trailing Cost and Client Cost (SPB-68), no other money', () => {
    render(<LiveBids quote={CLOSED_QUOTE} />)
    const headers = [...document.querySelectorAll('.odyssey-group-table__table > thead th')]
      .map((th) => th.textContent)
    // trailing 'Award' is the pinned action column header (stickyActions),
    // 'RFQ' the per-carrier bid-link column (user, 2026-08-24).
    expect(headers).toEqual(['Carrier', 'Status', 'Submitted By', 'Response', 'Cost', 'Client Cost', 'RFQ', 'Award'])
  })

  test('outer row Cost/Client Cost: a bid carrier shows fmtDollar of both (SPB-68), a bidless carrier shows —', () => {
    // 10% markup → client cost = cost × 1.10 (applyMarkup over the bid's own
    // linehaul/fuel/accessorials, same math as the award hand-off).
    const { container } = render(<LiveBids quote={CLOSED_QUOTE} markup={{ type: 'pct', value: 10 }} />)
    const table = within(container.querySelector('.odyssey-group-table'))

    // ODFL bid total is 2275 — collapsed, so this can only be the outer row's
    // value (the nested breakdown table doesn't exist until expanded).
    const odflRow = table.getByText(/ODFL/).closest('tr')
    expect(within(odflRow).getByText('$2,275.00')).toBeTruthy()
    expect(within(odflRow).getByText('$2,502.50')).toBeTruthy() // client cost, +10%

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

  // SPB-63: award is a radio SELECTION, executed through the Stage dialog.
  test('the LOWEST bid is pre-selected, and the planner can override it', () => {
    render(<LiveBids quote={CLOSED_QUOTE} />)
    expect(screen.getByRole('radio', { name: /Select ODFL/ }).checked).toBe(true) // lowest
    const saia = screen.getByRole('radio', { name: /Select SAIA/ })
    expect(saia.checked).toBe(false)

    fireEvent.click(saia)
    expect(saia.checked).toBe(true)
    expect(screen.getByRole('radio', { name: /Select ODFL/ }).checked).toBe(false)
  })

  test('Stage opens the award dialog; confirming there fires onAward with the SELECTED scac (not the lowest)', () => {
    const onAward = vi.fn()
    render(<LiveBids quote={CLOSED_QUOTE} onAward={onAward} />)

    // Override the pre-selected lowest, then stage.
    fireEvent.click(screen.getByRole('radio', { name: /Select SAIA/ }))
    expect(onAward).not.toHaveBeenCalled() // selection alone must not tender

    fireEvent.click(screen.getByRole('button', { name: 'Stage' }))
    const dialog = screen.getByRole('dialog', { name: 'Award and Tender' })
    expect(within(dialog).getByText(/SAIA · Saia Motor Freight/)).toBeTruthy()

    // Cancel leads; Force Close and Award and Tender trail, in that order.
    const trail = [...dialog.querySelectorAll('.award-modal__footer-trail button')]
      .map((b) => b.textContent)
    expect(trail).toEqual(['Force Close', 'Award and Tender'])

    const confirm = within(dialog).getByRole('button', { name: 'Award and Tender' })
    expect(confirm.disabled).toBe(false) // quote is closed + carrier picked
    fireEvent.click(confirm)
    expect(onAward).toHaveBeenCalledWith('SAIA')
  })

  // The countdown lives in the modal HEADER's trail slot (user, 2026-08-24),
  // not in the body — one placement across both views.
  test('the award dialog renders its countdown in the header, beside the close X', () => {
    render(<LiveBids quote={OPEN_QUOTE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Stage' }))
    const dialog = screen.getByRole('dialog', { name: 'Award and Tender' })

    const trail = dialog.querySelector('.modal-header__trail')
    expect(within(trail).getByText('Bid Live')).toBeTruthy()
    expect(trail.querySelector('.award-modal__header-countdown')).toBeTruthy()
    // …and nowhere in the body.
    expect(dialog.querySelector('.modal-medium__content .award-modal__header-countdown')).toBeFalsy()

    // Carried into the sibling view too.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Force Close' }))
    const closeView = screen.getByRole('dialog', { name: 'Close Bidding' })
    expect(within(closeView.querySelector('.modal-header__trail')).getByText('Bid Live')).toBeTruthy()
  })

  test('on an OPEN quote the dialog blocks confirm and routes to a Force Close sibling view', () => {
    const onForceClose = vi.fn()
    const onAward = vi.fn()
    render(<LiveBids quote={OPEN_QUOTE} onForceClose={onForceClose} onAward={onAward} />)

    fireEvent.click(screen.getByRole('button', { name: 'Stage' }))
    const dialog = screen.getByRole('dialog', { name: 'Award and Tender' })
    expect(within(dialog).getByRole('button', { name: 'Award and Tender' }).disabled).toBe(true)

    // Sibling view — same dialog, new title, and the force-close action.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Force Close' }))
    const closeView = screen.getByRole('dialog', { name: 'Close Bidding' })
    fireEvent.click(within(closeView).getByRole('button', { name: 'Force Close Bidding' }))
    expect(onForceClose).toHaveBeenCalled()
    expect(onAward).not.toHaveBeenCalled()

    // …and it lands back on the confirm view rather than dismissing.
    expect(screen.getByRole('dialog', { name: 'Award and Tender' })).toBeTruthy()
  })

  // SPB-63 makes selection a staging cue that "will not trigger tendering",
  // so close gates the EXECUTION, never the picking.
  test('while the quote is OPEN the radios are selectable but the dialog cannot confirm', () => {
    const { container } = render(<LiveBids quote={OPEN_QUOTE} />)
    const headers = [...container.querySelectorAll('.odyssey-group-table__table > thead th')]
      .map((th) => th.textContent)
    expect(headers).toContain('Award')

    const radios = screen.getAllByRole('radio')
    expect(radios.length).toBe(3) // one per bidding carrier
    radios.forEach((r) => expect(r.disabled).toBe(false))

    fireEvent.click(radios[1])
    expect(radios[1].checked).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Stage' }))
    const dialog = screen.getByRole('dialog', { name: 'Award and Tender' })
    expect(within(dialog).getByRole('button', { name: 'Award and Tender' }).disabled).toBe(true)
  })

  test('an awarded quote swaps that row\'s radio for a static Award icon and drops the other radios', () => {
    const AWARDED = { ...CLOSED_QUOTE, status: 'awarded', awardedScac: 'ODFL', awardType: 'manual' }
    render(<LiveBids quote={AWARDED} />)
    expect(screen.getByLabelText('ODFL awarded')).toBeTruthy()
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
  })

  test('every carrier row carries an RFQ link to its own /spot-bid/:token page', () => {
    const { container } = render(<LiveBids quote={CLOSED_QUOTE} />)
    const link = within(container).getByRole('link', { name: /Open bid link for ODFL/ })
    expect(link.getAttribute('href')).toBe('/spot-bid/tok-ODFL')
  })

  test('open state shows no closed actions (Force Close now lives in the award dialog)', () => {
    render(<LiveBids quote={OPEN_QUOTE} />)
    expect(screen.queryByRole('button', { name: 'Force Close' })).toBeFalsy()
    expect(screen.queryByRole('button', { name: /Modify/ })).toBeFalsy()
    expect(screen.queryByRole('button', { name: /Clear/ })).toBeFalsy()
  })

  // Modify & Resend / Clear & Start Over / Force Close all live in the award
  // dialog's Force Close view now (user, 2026-08-24), beside the tolerance
  // verdict they're decided against — none of them render on the tab itself.
  // The award dialog and the Shipment Details modal share one section rhythm
  // (user, 2026-08-24) — the pairing rule lives on both selectors at once in
  // components.css, so this pins the MARKUP contract it needs: sections are
  // adjacent siblings, which is what makes the `+` separator land.
  test('award dialog sections are adjacent siblings, so the shared separator rule applies', () => {
    render(<LiveBids quote={CLOSED_QUOTE} markup={{ type: 'pct', value: 10 }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Stage' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Force Close' }))

    const body = screen.getByRole('dialog', { name: 'Close Bidding' })
      .querySelector('.award-modal')
    const sections = [...body.children].filter((el) => el.tagName === 'SECTION')
    expect(sections.length).toBeGreaterThan(1)
    // Every section is a direct child of the same flex column — no wrapper
    // between them, or `section + section` would never match.
    for (const el of sections) expect(el.parentElement).toBe(body)
    expect(sections[0].className).toContain('award-modal__section')
  })

  test('the Live Bids tab no longer renders the Tolerance Evaluation card', () => {
    const { container } = render(<LiveBids quote={CLOSED_QUOTE} markup={{ type: 'pct', value: 10 }} />)
    expect(container.querySelector('.tolerance-panel')).toBeFalsy()
    expect(within(container).queryByText('Tolerance Evaluation')).toBeFalsy()
  })

  test('closed state shows none of the bid-management actions inline — they moved into the dialog', () => {
    render(<LiveBids quote={CLOSED_QUOTE} />)
    expect(screen.queryByRole('button', { name: /Modify/ })).toBeFalsy()
    expect(screen.queryByRole('button', { name: /Clear/ })).toBeFalsy()
    expect(screen.queryByRole('button', { name: 'Force Close' })).toBeFalsy()

    fireEvent.click(screen.getByRole('button', { name: 'Stage' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Force Close' }))
    const closeView = screen.getByRole('dialog', { name: 'Close Bidding' })
    expect(within(closeView).getByRole('button', { name: /Modify/ })).toBeTruthy()
    expect(within(closeView).getByRole('button', { name: /Clear/ })).toBeTruthy()
    // Already closed → the close action is present but spent.
    expect(within(closeView).getByRole('button', { name: 'Bidding Closed' }).disabled).toBe(true)
    // Tolerance Evaluation rides along — it's what the decision is made on —
    // and it must be COMPLETE, since the Live Bids tab no longer shows it
    // (user, 2026-08-24): the same eight fields the old card had, plus the
    // verdict banner.
    expect(within(closeView).getByText('Tolerance Evaluation')).toBeTruthy()
    for (const label of [
      'Highest routed cost (benchmark)',
      'Tolerance (% above)',
      'Tolerance ceiling',
      'Lowest bid (cost)',
      'Markup',
      'Lowest bid (client cost)',
      'Result',
      'Manual-review flag',
    ]) {
      expect(within(closeView).getByText(label)).toBeTruthy()
    }
    // The verdict appears twice on purpose: the Result field echoes the banner.
    expect(within(closeView).getAllByText(/Within tolerance — eligible for auto-award/))
      .toHaveLength(2)
    expect(closeView.querySelector('.alert')).toBeTruthy()
  })

  test('the Force Close view offers no second Back button — ModalMedium\'s header owns that', () => {
    render(<LiveBids quote={CLOSED_QUOTE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Stage' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Force Close' }))
    const dialog = screen.getByRole('dialog', { name: 'Close Bidding' })
    const footer = within(dialog.querySelector('.modal-medium__footer'))
    expect(footer.queryByRole('button', { name: 'Back' })).toBeFalsy()
    // Cancel on the lead edge, every action grouped on the trail edge.
    expect(footer.getByRole('button', { name: 'Cancel' })).toBeTruthy()
    const trail = [...dialog.querySelectorAll('.award-modal__footer-trail button')]
      .map((b) => b.textContent)
    expect(trail).toEqual(['Modify & Resend', 'Clear & Start Over', 'Bidding Closed'])
    // The header's own back affordance is the one that stays.
    expect(screen.getByRole('dialog', { name: 'Close Bidding' })
      .querySelector('.modal-header__back, [aria-label="Back"]')).toBeTruthy()
  })

  test('closed state keeps the Award ≠ tender framing sentence verbatim (the heading is gone — the action moved to the strip)', () => {
    render(<LiveBids quote={CLOSED_QUOTE} />)
    expect(screen.queryByText('Award Action')).toBeFalsy()
    expect(
      screen.getByText(
        'Select a carrier, then Stage to award. Award moves the carrier into the shipment tendering flow — it does not assign the load until tendered.'
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

    // Status and Award type cells were REMOVED (user, 2026-08-24).
    expect(within(strip).queryByText('Status')).toBeFalsy()
    expect(within(strip).queryByText('Award type')).toBeFalsy()

    // CLOSES IN is node-valued (the countdown Badge) — no `full`, stays bare.
    const closesCell = within(strip).getByText('CLOSES IN').closest('.summary-strip__cell')
    expect(closesCell.querySelector('[data-tooltip-trigger]')).toBeFalsy()

    // The merged window cell is hoverable and explains BOTH timestamps.
    const windowCell = within(strip).getByText('BID CLOSED').closest('.summary-strip__cell')
    expect(windowCell.querySelector('[data-tooltip-trigger]')).toBeTruthy()
  })

  // One cell replaces the old Opened + Closed pair (user, 2026-08-24): it
  // shows the TIME of whichever event the quote is at, both full timestamps
  // in the tooltip.
  test('the window cell shows the OPEN time while open and the CLOSE time once closed', () => {
    const { container, unmount } = render(<LiveBids quote={OPEN_QUOTE} />)
    const strip = () => container.querySelector('.live-bids__summary')
    const timeOf = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    expect(within(strip()).getByText('BID OPEN')).toBeTruthy()
    expect(within(strip()).getAllByText(timeOf(OPEN_QUOTE.openAt)).length).toBeGreaterThan(0)
    unmount()

    const closed = render(<LiveBids quote={CLOSED_QUOTE} />)
    const closedStrip = closed.container.querySelector('.live-bids__summary')
    expect(within(closedStrip).getByText('BID CLOSED')).toBeTruthy()
    expect(within(closedStrip).getAllByText(timeOf(CLOSED_QUOTE.closeAt)).length).toBeGreaterThan(0)
  })

  // Expiry IS a close (SPB-63) — spotStore has no timer of its own, so the
  // countdown reaching zero is what performs the transition. Without it an
  // expired quote reads BID OPEN forever AND can never be awarded, since
  // `award()` rejects anything whose status isn't 'closed'.
  test('an EXPIRED but still-open quote reads BID CLOSED and fires the close', () => {
    const onForceClose = vi.fn()
    const EXPIRED = { ...CLOSED_QUOTE, status: 'open', closeAt: NOW - 60000 }
    const { container } = render(<LiveBids quote={EXPIRED} onForceClose={onForceClose} />)

    const strip = within(container.querySelector('.live-bids__summary'))
    expect(strip.getByText('BID CLOSED')).toBeTruthy()
    expect(strip.queryByText('BID OPEN')).toBeFalsy()
    // …and the store transition actually fired, so the bid is awardable.
    expect(onForceClose).toHaveBeenCalled()
  })

  // An open quote has no close EVENT — only a scheduled closeAt, which the
  // CLOSES IN countdown already expresses (user, 2026-08-24).
  test('the window tooltip carries Bid Closed ONLY once the quote is actually closed', () => {
    const open = render(<LiveBids quote={OPEN_QUOTE} />)
    const openCell = within(open.container.querySelector('.live-bids__summary'))
      .getByText('BID OPEN').closest('.summary-strip__cell')
    fireEvent.mouseEnter(openCell.querySelector('[data-tooltip-trigger]'))
    expect(screen.getByText('Bid Opened')).toBeTruthy()
    expect(screen.queryByText('Bid Closed')).toBeFalsy()
    open.unmount()

    const closed = render(<LiveBids quote={CLOSED_QUOTE} />)
    const closedCell = within(closed.container.querySelector('.live-bids__summary'))
      .getByText('BID CLOSED').closest('.summary-strip__cell')
    fireEvent.mouseEnter(closedCell.querySelector('[data-tooltip-trigger]'))
    expect(screen.getByText('Bid Opened')).toBeTruthy()
    expect(screen.getByText('Bid Closed')).toBeTruthy()
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
    expect(headers).toEqual(['Carrier', 'Status', 'Submitted By', 'Response', 'Cost', 'Client Cost', 'RFQ'])
    expect(container.querySelector('.odyssey-group-table__cell--sticky-right')).toBeFalsy()
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
  })

  test('the actions column is present, headed "Award", when at least one carrier has bid on a CLOSED quote', () => {
    const { container } = render(<LiveBids quote={CLOSED_QUOTE} />)
    const headers = [...container.querySelectorAll('.odyssey-group-table__table > thead th')]
      .map((th) => th.textContent)
    expect(headers).toEqual(['Carrier', 'Status', 'Submitted By', 'Response', 'Cost', 'Client Cost', 'RFQ', 'Award'])
    expect(container.querySelector('.odyssey-group-table__cell--sticky-right')).toBeTruthy()

    const table = within(container.querySelector('.odyssey-group-table'))
    const odflRow = table.getByText(/ODFL/).closest('tr')
    // A radio now, not a Button — selection stages, the strip executes.
    expect(within(odflRow).getByRole('radio', { name: /Select ODFL/ })).toBeTruthy()
  })
})
