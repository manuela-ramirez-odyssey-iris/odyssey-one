// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import RoutingGuideTab from './RoutingGuideTab'

// Mocked so the persist-round-trip test below can inspect the EXACT payload
// `saveTenderOption` receives — the real function is a live-mode-only no-op
// in tests (getApiMode() defaults to 'mock'), which would hide a regression
// completely rather than surface it.
vi.mock('../../api/services/shipmentService', () => ({ saveTenderOption: vi.fn().mockResolvedValue(undefined) }))
import { saveTenderOption } from '../../api/services/shipmentService'

afterEach(cleanup)
// saveTenderOption's mock call log otherwise accumulates ACROSS tests (module
// state, not per-test) — every test below that asserts a specific call count
// needs a clean log, not a running total from whichever tests ran earlier.
afterEach(() => { saveTenderOption.mockClear() })

const baseOption = {
  rank: 1,
  routeRank: 1,
  scac: 'ODFL',
  carrierName: 'Old Dominion Freight Line',
  equipment: 'Van',
  cost: '$2,790.00 USD',
  status: 'Sent',
}

describe('RoutingGuideTab — SPOT RATE badge', () => {
  it('renders a SPOT RATE badge beside the carrier when spotRate is true', () => {
    const data = { options: [{ ...baseOption, routeGroup: 'Spot', spotRate: true }] }
    render(<RoutingGuideTab data={data} />)
    expect(screen.getByText('Old Dominion Freight Line')).toBeTruthy()
    expect(screen.getByText('SPOT RATE')).toBeTruthy()
  })

  it('does not render the badge for a non-Spot route group', () => {
    const data = { options: [{ ...baseOption, routeGroup: 'Network' }] }
    render(<RoutingGuideTab data={data} />)
    expect(screen.getByText('Old Dominion Freight Line')).toBeTruthy()
    expect(screen.queryByText('SPOT RATE')).toBeNull()
  })

  it('does not render the badge for a manually-keyed quote (routeGroup Spot, no spotRate marker)', () => {
    const data = { options: [{ ...baseOption, routeGroup: 'Spot', rateSource: 'Manual' }] }
    render(<RoutingGuideTab data={data} />)
    expect(screen.getByText('Old Dominion Freight Line')).toBeTruthy()
    expect(screen.queryByText('SPOT RATE')).toBeNull()
  })
})

// Persist round-trip (2026-08-10) — proves the FULL pipeline from a UI edit
// to the wire payload, not just that QuoteModal's onSave carries the right
// shape. Guards the bug found alongside adding Equipment to QuoteModal: the
// write path used to serialize persistTender's VM-shaped option verbatim,
// which the read path (mapRoutingOption) doesn't recognize — equipmentCode,
// totalCostAmount, etc. — so the FIRST save on any shipment silently
// degraded those fields to '--' on the next load. routingOptionVmToDto
// (mapSellShipmentOutToDetail.ts) is the fix; this exercises it from a real
// Edit Quote click through to saveTenderOption's actual argument, the same
// choke point every Add/Edit Quote and tender-status action goes through.
// CostTooltip AR Total / Margin (Fix 1, 2026-08-10) — arCost/arFreightCost never
// existed on RoutingOptionVM, so AR Total rendered '--' forever and the Margin
// row (gated on both AP and AR parsing) never rendered. The real AR figure is
// `rateDetails.arTotal`, a number.
describe('RoutingGuideTab — CostTooltip AR Total / Margin', () => {
  it('shows AR Total from rateDetails.arTotal and renders the Margin row', () => {
    const option = {
      ...baseOption,
      cost: '$2,790.00 USD',
      rateDetails: { baseRate: 2500, currency: 'USD', markup: 300, additionalCharges: [], apTotal: 2790, arTotal: 3090 },
    }
    const data = { options: [option] }
    render(<RoutingGuideTab data={data} />)
    fireEvent.mouseEnter(screen.getByText('$2,790.00 USD'))
    expect(document.body.textContent).toContain('AR Total: $3,090.00')
    expect(document.body.textContent).toContain('Margin: $300.00 (10.8%)')
  })

  it('treats a zero/missing arTotal as -- and hides the Margin row (zeroed rateDetails means "no rate details", not "$0.00 AR")', () => {
    const option = {
      ...baseOption,
      cost: '$500.00 USD',
      rateDetails: { baseRate: 500, currency: 'USD', markup: 0, additionalCharges: [], apTotal: 500, arTotal: 0 },
    }
    const data = { options: [option] }
    render(<RoutingGuideTab data={data} />)
    fireEvent.mouseEnter(screen.getByText('$500.00 USD'))
    expect(document.body.textContent).toContain('AR Total: --')
    expect(document.body.textContent).not.toContain('Margin:')
  })

  // Fix 8, 2026-08-10 — apTotal comes from the mapper pre-formatted with a
  // currency suffix ("$X USD"); arTotal was plain fmtDollar with no suffix,
  // so the tooltip read "AP Total: $3,150.00 USD / AR Total: $3,450.00" —
  // looks like a rendering bug. Currency CAD (not USD) here proves the
  // suffix is actually SOURCED from rateDetails.currency, not hardcoded.
  it("appends currency to AR Total, sourced from rateDetails.currency, matching the AP side's shape", () => {
    const option = {
      ...baseOption,
      cost: '$2,790.00 USD',
      rateDetails: { baseRate: 2500, currency: 'CAD', markup: 300, additionalCharges: [], apTotal: 2790, arTotal: 3090 },
    }
    const data = { options: [option] }
    render(<RoutingGuideTab data={data} />)
    fireEvent.mouseEnter(screen.getByText('$2,790.00 USD'))
    expect(document.body.textContent).toContain('AR Total: $3,090.00 CAD')
  })
})

// Edit Quote Rate persistence (Fix 2, 2026-08-10) — the edit branch of
// handleQuoteSave recomputed `cost` from apTotal but never touched `rate`, so
// a changed Base Rate never reached the wire (rate feeds rateAmount via
// routingOptionVmToDto). Asserted on the saveTenderOption payload, not a
// rendered "Rate" cell — the table has no such column; `rate` only round-trips.
describe('RoutingGuideTab — Edit Quote persists the Rate', () => {
  it('a changed Base Rate reaches saveTenderOption as the new rateAmount', () => {
    const option = {
      rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'Old Dominion Freight Line',
      equipment: 'Van', cost: '$1,000.00 USD', status: 'Sent', quoteFlag: 'Y',
      rateDetails: { baseRate: 1000, currency: 'USD', markup: 0, additionalCharges: [], apTotal: 1000, arTotal: 1000 },
    }
    const data = { options: [option] }
    const shipment = { sellShipment: 'SHIP-1' }
    render(<RoutingGuideTab data={data} shipment={shipment} />)

    const menuCell = document.querySelector('[data-right-table] tbody tr td:last-child')
    fireEvent.click(menuCell)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Quote' }))

    const dialog = screen.getByRole('dialog', { name: 'Edit Quote' })
    // "Base Rate" also labels a row in each read-only AP/AR SummaryCard further
    // down the same dialog — the editable FormField's label is the FIRST match.
    const baseRateField = within(dialog).getAllByText('Base Rate')[0].closest('.form-field')
    const baseRateInput = within(baseRateField).getByRole('textbox')
    fireEvent.change(baseRateInput, { target: { value: '1500' } })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save Quote' }))

    expect(saveTenderOption).toHaveBeenCalledTimes(1)
    const [, sentOption] = saveTenderOption.mock.calls[0]
    expect(sentOption.rateAmount).toBe(1500)
  })
})

// Accept/Decline/Cancel audit fields (Fix 4/5, 2026-08-10) — handleAction wrote
// ONLY `status`. The clicked row is a genuine RESPONSE (Accept/Decline/Cancel
// all count); the row auto-tendered by the Decline/Cancel cascade is a NOTIFY,
// not a response — that asymmetry is the point of the fix. modifyDate must be
// "MM/DD/YYYY HH:MM" (formatDateTimeMDYHM), not toLocaleString().
describe('RoutingGuideTab — Accept/Decline/Cancel write audit fields', () => {
  afterEach(() => { vi.useRealTimers() })

  it('the clicked row gets response fields; the cascaded row gets only notify fields; proNumber is untouched', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 10, 15, 30))

    const clicked = {
      rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'Old Dominion Freight Line',
      equipment: 'Van', cost: '$100.00 USD', status: 'Sent', proNumber: 'PRO-EXISTING',
    }
    const cascaded = {
      rank: 2, routeRank: 2, scac: 'FEDX', carrierName: 'FedEx Freight',
      equipment: 'Van', cost: '$200.00 USD', status: null, proNumber: null,
    }
    const data = { options: [clicked, cascaded] }
    const shipment = { sellShipment: 'SHIP-1' }
    render(<RoutingGuideTab data={data} shipment={shipment} />)

    const rows = document.querySelectorAll('[data-right-table] tbody tr')
    fireEvent.click(rows[0].querySelector('td:last-child'))
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }))

    expect(saveTenderOption).toHaveBeenCalledTimes(2)
    const calls = saveTenderOption.mock.calls
    const clickedSent = calls.find(([, o]) => o.rank === 1)[1]
    const cascadedSent = calls.find(([, o]) => o.rank === 2)[1]

    expect(clickedSent.responseUser).toBe('Amy Cook')
    expect(clickedSent.responseMethod).toBe('Manual Update')
    expect(clickedSent.responseDateTime).toBe('08/10/2026 15:30')
    expect(clickedSent.modifyUser).toBe('Amy Cook')
    expect(clickedSent.modifyDate).toBe('08/10/2026 15:30')
    expect(clickedSent.proNumber).toBe('PRO-EXISTING') // carrier-supplied — never fabricated

    expect(cascadedSent.notifyDateTime).toBe('08/10/2026 15:30')
    expect(cascadedSent.modifyDate).toBe('08/10/2026 15:30')
    // The asymmetry: being auto-tendered is a NOTIFY, not a RESPONSE.
    expect(cascadedSent.responseUser).toBeUndefined()
    expect(cascadedSent.responseDateTime).toBeUndefined()
    expect(cascadedSent.responseMethod).toBeUndefined()
    expect(cascadedSent.proNumber).toBeNull()
  })

  // Fix 6, 2026-08-10 — Tender/Re-Tender are NOTIFY events (same "being
  // tendered" moment as the Decline/Cancel cascade above, which already
  // stamps notifyDateTime + modifyUser/modifyDate) but were recording
  // nothing at all. isResponseAction correctly excludes them from response
  // fields; this pins that they still get the notify + audit fields.
  it('Tender on a null-status row sets notifyDateTime + modifyUser/modifyDate; response fields stay unset', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 10, 15, 30))

    const option = {
      rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'Old Dominion Freight Line',
      equipment: 'Van', cost: '$100.00 USD', status: null, proNumber: null,
    }
    const data = { options: [option] }
    const shipment = { sellShipment: 'SHIP-1' }
    render(<RoutingGuideTab data={data} shipment={shipment} />)

    const rows = document.querySelectorAll('[data-right-table] tbody tr')
    fireEvent.click(rows[0].querySelector('td:last-child'))
    fireEvent.click(screen.getByRole('button', { name: 'Tender' }))

    expect(saveTenderOption).toHaveBeenCalledTimes(1)
    const [, sentOption] = saveTenderOption.mock.calls[0]

    expect(sentOption.notifyDateTime).toBe('08/10/2026 15:30')
    expect(sentOption.modifyUser).toBe('Amy Cook')
    expect(sentOption.modifyDate).toBe('08/10/2026 15:30')
    // The negative half: a Tender is a notify, not a response.
    expect(sentOption.responseUser).toBeUndefined()
    expect(sentOption.responseDateTime).toBeUndefined()
    expect(sentOption.responseMethod).toBeUndefined()
  })

  // Fix 7, 2026-08-10 — a Re-Tender fires on a Declined/Cancelled row that
  // still carries the PREVIOUS cycle's response. Left in place, the row
  // would read "Declined by Amy Cook at ..." while status says Sent
  // (awaiting a fresh response). proNumber is a carrier-supplied identifier
  // from the prior cycle and must survive untouched.
  it("Re-Tender on a Declined row clears the prior cycle's response fields, sets notify/modify, and leaves proNumber untouched", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 10, 15, 30))

    const option = {
      rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'Old Dominion Freight Line',
      equipment: 'Van', cost: '$100.00 USD', status: 'Declined', proNumber: 'PRO-EXISTING',
      responseUser: 'Amy Cook', responseDateTime: '08/09/2026 14:23', responseMethod: 'Manual Update',
    }
    const data = { options: [option] }
    const shipment = { sellShipment: 'SHIP-1' }
    render(<RoutingGuideTab data={data} shipment={shipment} />)

    const rows = document.querySelectorAll('[data-right-table] tbody tr')
    fireEvent.click(rows[0].querySelector('td:last-child'))
    fireEvent.click(screen.getByRole('button', { name: 'Re-Tender' }))

    expect(saveTenderOption).toHaveBeenCalledTimes(1)
    const [, sentOption] = saveTenderOption.mock.calls[0]

    expect(sentOption.notifyDateTime).toBe('08/10/2026 15:30')
    expect(sentOption.modifyUser).toBe('Amy Cook')
    expect(sentOption.modifyDate).toBe('08/10/2026 15:30')
    // Cleared to the mapRoutingOption-matching empty shape (mapSellShipmentOutToDetail.ts):
    // responseDateTime/responseMethod are read through orDash(...) -> '--'; responseUser
    // through `?? null` -> null.
    expect(sentOption.responseDateTime).toBe('--')
    expect(sentOption.responseMethod).toBe('--')
    expect(sentOption.responseUser).toBeNull()
    // Carrier-supplied identifier from the prior cycle — deliberately not cleared.
    expect(sentOption.proNumber).toBe('PRO-EXISTING')
  })
})

// LINX-13894 (partial) — Add Quote moves from a page-level toolbar button
// (which added ONE new option regardless of which row a user cared about)
// into the per-row action menu, mutually exclusive with Edit Quote: an
// option with no quote yet offers "Add Quote"; an option that already has
// one offers "Edit Quote" — never both. "Has a quote" is read off
// `quoteFlag === 'Y'` (LINX-13896 sets it on save, LINX-13897 clears it on
// delete) — NOT rateDetails.apTotal: a CONTRACTED rate also carries a
// positive apTotal (generate.mjs seeds one on every option), so apTotal alone
// made "Add Quote" unreachable for every row in the app. The AP Cost column
// is a separate signal that only gates the contracted-rate confirm below.
describe('RoutingGuideTab — per-row Add/Edit Quote (LINX-13894)', () => {
  // Pickup/delivery dates present throughout this block — these tests exercise
  // the LINX-13894 Add/Edit/contracted-rate flows, not the LINX-13895 dates
  // guard (that guard has its own describe block below).
  const noQuoteOption = {
    rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'Old Dominion Freight Line',
    equipment: 'Van', cost: '--', status: 'Sent',
    pickupDateTime: '08/01/2026 09:00 CST', deliveryDateTime: '08/03/2026 09:00 CST',
  }
  const quotedOption = {
    ...noQuoteOption,
    cost: '$2,790.00 USD',
    quoteFlag: 'Y',
    rateDetails: { baseRate: 2500, currency: 'USD', markup: 300, additionalCharges: [], apTotal: 2790, arTotal: 3090 },
  }
  // AP Cost (Carrier) present, but no user-entered quote yet — the case the
  // contracted-rate confirm (AC 3) exists for.
  const costedButUnquotedOption = { ...noQuoteOption, cost: '$500.00 USD' }
  // A CONTRACTED rate: rateDetails carries a positive apTotal (same shape a
  // real quote would have) but no quoteFlag — the exact case that used to
  // make "Add Quote" unreachable everywhere (see block comment above).
  const contractedRateOption = {
    ...noQuoteOption,
    cost: '$2,790.00 USD',
    rateSource: 'Contract',
    rateDetails: { baseRate: 2500, currency: 'USD', markup: 300, additionalCharges: [], apTotal: 2790, arTotal: 3090 },
  }

  const openRowMenu = () => {
    const menuCell = document.querySelector('[data-right-table] tbody tr td:last-child')
    fireEvent.click(menuCell)
  }

  it('removes the page-level Add Quote toolbar button', () => {
    const data = { options: [noQuoteOption] }
    render(<RoutingGuideTab data={data} />)
    expect(screen.queryByRole('button', { name: 'Add Quote' })).toBeNull()
  })

  it('shows "Add Quote" (not "Edit Quote") in the row menu when the option has no quote', () => {
    const data = { options: [noQuoteOption] }
    render(<RoutingGuideTab data={data} />)
    openRowMenu()
    expect(screen.getByRole('button', { name: 'Add Quote' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Edit Quote' })).toBeNull()
  })

  it('shows "Edit Quote" (not "Add Quote") in the row menu when the option already has a quote', () => {
    const data = { options: [quotedOption] }
    render(<RoutingGuideTab data={data} />)
    openRowMenu()
    expect(screen.getByRole('button', { name: 'Edit Quote' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add Quote' })).toBeNull()
  })

  // The regression this whole discriminator change exists for: a contracted
  // rate has a POSITIVE apTotal (generate.mjs seeds one on every option) but
  // no quoteFlag — under the old `apTotal > 0` test this offered Edit Quote
  // for a quote that was never entered, and made Add Quote unreachable.
  it('offers "Add Quote", never Edit/Delete, for a contracted rate with a positive apTotal', () => {
    const data = { options: [contractedRateOption] }
    render(<RoutingGuideTab data={data} />)
    openRowMenu()
    expect(screen.getByRole('button', { name: 'Add Quote' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Edit Quote' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete Quote' })).toBeNull()
  })

  it('Add Quote goes straight to the quote entry dialog when AP Cost is blank', () => {
    const data = { options: [noQuoteOption] } // cost: '--'
    render(<RoutingGuideTab data={data} />)
    openRowMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Add Quote' }))
    expect(screen.queryByText(/contracted rate already exists/i)).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Add Quote' })).toBeTruthy()
  })

  it('Add Quote confirms first when AP Cost (Carrier) is non-blank; Cancel backs out without opening the dialog', () => {
    const data = { options: [costedButUnquotedOption] } // cost: '$500.00 USD', no rateDetails
    render(<RoutingGuideTab data={data} />)
    openRowMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Add Quote' }))

    expect(screen.getByText('A contracted rate already exists for this routing option. Entering a quote will override the existing contracted rate. Do you want to continue?')).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Add Quote' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText(/contracted rate already exists/i)).toBeNull()
    expect(screen.queryByRole('dialog', { name: 'Add Quote' })).toBeNull()
  })

  it('Add Quote confirm: OK proceeds to the quote entry dialog', () => {
    const data = { options: [costedButUnquotedOption] }
    render(<RoutingGuideTab data={data} />)
    openRowMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Add Quote' }))
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))

    expect(screen.queryByText(/contracted rate already exists/i)).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Add Quote' })).toBeTruthy()
  })

  // The hand-rolled AddQuoteConfirm (createPortal + inline styles, no Escape
  // handling) would have FAILED this test — it never listened for keydown at
  // all. ModalMedium's useEscapeStack is the fix (S119 replacement).
  it('Escape closes the confirm without proceeding to the quote modal', () => {
    const data = { options: [costedButUnquotedOption] }
    render(<RoutingGuideTab data={data} />)
    openRowMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Add Quote' }))
    expect(screen.getByText('A contracted rate already exists for this routing option. Entering a quote will override the existing contracted rate. Do you want to continue?')).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByText(/contracted rate already exists/i)).toBeNull()
    expect(screen.queryByRole('dialog', { name: 'Add Quote' })).toBeNull()
  })
})

describe('RoutingGuideTab — tender persist (VM → DTO)', () => {
  // LINX-13895 made Carrier Option (incl. Equipment) read-only in the Quote
  // Entry Page — there is no picker to drive any more; Equipment comes off
  // the selected routing option and round-trips unchanged through Save Quote.
  // The contract this guards predates that change and still matters: the
  // VM's `equipment` must reach saveTenderOption as `equipmentCode`, not
  // `equipment` — mapRoutingOption reads equipmentCode on the next load, so
  // the wrong key silently degrades the value to '--'.
  it("an option's Equipment survives Edit Quote save to saveTenderOption as equipmentCode, not equipment", () => {
    const option = {
      rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'Old Dominion Freight Line',
      equipment: 'LTL', cost: '$2,790.00 USD', status: 'Sent', quoteFlag: 'Y',
      rateDetails: { baseRate: 1000, currency: 'USD', markup: 0, additionalCharges: [], apTotal: 1000, arTotal: 1000 },
    }
    const data = { options: [option] }
    const shipment = { sellShipment: 'SHIP-1' }
    render(<RoutingGuideTab data={data} shipment={shipment} />)

    // Open the row's action menu (the truck-icon cell, last column of the
    // right table) and pick "Edit Quote".
    const menuCell = document.querySelector('[data-right-table] tbody tr td:last-child')
    fireEvent.click(menuCell)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Quote' }))

    const dialog = screen.getByRole('dialog', { name: 'Edit Quote' })
    // Equipment is read-only here (LINX-13895) — a TitleSubtitle value, not a
    // combobox — sourced straight from the option, confirming there is
    // nothing left to pick.
    expect(within(dialog).queryByRole('combobox')).toBeNull()
    expect(within(dialog).getByText('LTL')).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save Quote' }))

    expect(saveTenderOption).toHaveBeenCalledTimes(1)
    const [id, sentOption] = saveTenderOption.mock.calls[0]
    expect(id).toBe('SHIP-1')
    // The bug: this used to be `sentOption.equipment === 'LTL'` and
    // `equipmentCode` was absent entirely — mapRoutingOption reads
    // equipmentCode on the next load, so that shape silently degrades.
    expect(sentOption.equipmentCode).toBe('LTL')
    expect(sentOption.equipment).toBeUndefined()
    // Same bug class applies to cost/distance/transit/api; rate/cost happen
    // to be present here as numbers now instead of formatted VM strings.
    expect(sentOption.totalCostAmount).toBe(1000)
    expect(typeof sentOption.cost).toBe('undefined')
  })
})

// LINX-13894/13896 save behaviour. Add and Edit are ONE operation on the
// SELECTED option (see the block comment on handleQuoteSave) — until
// 2026-08-16 the add path instead APPENDED a brand-new option at maxRank+1,
// leftover from a deleted page-level "Add Quote" toolbar button. The first
// test below is the regression guard for exactly that: it fails loudly (an
// extra row, or a rank mismatch) if that append behaviour ever comes back.
describe('RoutingGuideTab — Add/Edit Quote save behaviour (LINX-13894/13896)', () => {
  const shipment = { sellShipment: 'SHIP-1' }

  // LINX-3966 Rule 5 removed the old 'USD' default: Add Quote now starts with
  // no currency selected, and Save is blocked until one is chosen (see
  // QuoteModal.test.jsx's "currency starts unselected" describe block). Every
  // caller below needs the currency picked to reach Save — including the Edit
  // Quote caller, whose currency is already 'USD' from seeded rateDetails, so
  // re-selecting the same option here is a no-op for that test's assertions,
  // not a risk. One helper, one place to add the step.
  const fillBaseRateAndSave = (dialog, value) => {
    // Same "first match is the editable field" note as the Edit Quote Rate
    // persistence test above — "Base Rate" also labels a read-only
    // SummaryCard row further down the same dialog.
    const baseRateField = within(dialog).getAllByText('Base Rate')[0].closest('.form-field')
    fireEvent.change(within(baseRateField).getByRole('textbox'), { target: { value: String(value) } })
    // Currency picker — same getByRole('button') -> getByRole('option') idiom
    // QuoteModal.test.jsx uses for its own currency-selection assertions.
    fireEvent.click(within(baseRateField).getByRole('button'))
    fireEvent.click(screen.getByRole('option', { name: 'USD' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save Quote' }))
  }

  it('Add Quote attaches the quote to the SAME option — no phantom row, rank unchanged', () => {
    const option = {
      rank: 7, routeRank: 7, scac: 'ODFL', carrierName: 'Old Dominion Freight Line',
      equipment: 'Van', cost: '--', status: 'Sent',
      pickupDateTime: '08/01/2026 09:00 CST', deliveryDateTime: '08/03/2026 09:00 CST',
    }
    const data = { options: [option] }
    render(<RoutingGuideTab data={data} shipment={shipment} />)

    expect(document.querySelectorAll('[data-right-table] tbody tr')).toHaveLength(1)

    const menuCell = document.querySelector('[data-right-table] tbody tr td:last-child')
    fireEvent.click(menuCell)
    fireEvent.click(screen.getByRole('button', { name: 'Add Quote' }))
    fillBaseRateAndSave(screen.getByRole('dialog', { name: 'Add Quote' }), 900)

    // Still exactly one row — no new option got appended alongside it.
    expect(document.querySelectorAll('[data-right-table] tbody tr')).toHaveLength(1)
    expect(saveTenderOption).toHaveBeenCalledTimes(1)
    const [, sentOption] = saveTenderOption.mock.calls[0]
    expect(sentOption.rank).toBe(7) // the SAME option, not a new maxRank+1 row
  })

  it('a successful save persists quoteFlag Y and carrierQuoted Yes', () => {
    const option = {
      rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'Old Dominion Freight Line',
      equipment: 'Van', cost: '--', status: 'Sent',
      pickupDateTime: '08/01/2026 09:00 CST', deliveryDateTime: '08/03/2026 09:00 CST',
    }
    const data = { options: [option] }
    render(<RoutingGuideTab data={data} shipment={shipment} />)

    const menuCell = document.querySelector('[data-right-table] tbody tr td:last-child')
    fireEvent.click(menuCell)
    fireEvent.click(screen.getByRole('button', { name: 'Add Quote' }))
    fillBaseRateAndSave(screen.getByRole('dialog', { name: 'Add Quote' }), 900)

    expect(saveTenderOption).toHaveBeenCalledTimes(1)
    const [, sentOption] = saveTenderOption.mock.calls[0]
    expect(sentOption.quoteFlag).toBe('Y')
    expect(sentOption.carrierQuoted).toBe('Yes')
  })

  it('editing an existing quote preserves quoteAudit.createdBy/createdDate and moves updatedBy/updatedDate', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 16, 10, 0))

    const option = {
      rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'Old Dominion Freight Line',
      equipment: 'Van', cost: '$1,000.00 USD', status: 'Sent', quoteFlag: 'Y',
      rateDetails: { baseRate: 1000, currency: 'USD', markup: 0, additionalCharges: [], apTotal: 1000, arTotal: 1000 },
      quoteAudit: {
        createdBy: 'Jamie Fox', createdDate: '08/01/2026 09:00',
        updatedBy: 'Jamie Fox', updatedDate: '08/01/2026 09:00',
        initialApAmount: null, finalApAmount: 1000,
      },
    }
    const data = { options: [option] }
    render(<RoutingGuideTab data={data} shipment={shipment} />)

    const menuCell = document.querySelector('[data-right-table] tbody tr td:last-child')
    fireEvent.click(menuCell)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Quote' }))
    fillBaseRateAndSave(screen.getByRole('dialog', { name: 'Edit Quote' }), 1200)

    expect(saveTenderOption).toHaveBeenCalledTimes(1)
    const [, sentOption] = saveTenderOption.mock.calls[0]
    // Created* survives the edit untouched...
    expect(sentOption.quoteAudit.createdBy).toBe('Jamie Fox')
    expect(sentOption.quoteAudit.createdDate).toBe('08/01/2026 09:00')
    // ...only Updated* moves, to the acting user and now.
    expect(sentOption.quoteAudit.updatedBy).toBe('Amy Cook')
    expect(sentOption.quoteAudit.updatedDate).toBe('08/16/2026 10:00')

    vi.useRealTimers()
  })

  // LINX-3966 General Rule 5 — this is the end-to-end counterpart to
  // QuoteModal.test.jsx's "currency starts unselected" coverage (which pins
  // the message and the disabled Save button in isolation). That file can't
  // see saveTenderOption at all; this proves the persistence path is really
  // unreachable, not just that the button LOOKS disabled.
  it('Add Quote with a Base Rate but no currency never reaches saveTenderOption', () => {
    const option = {
      rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'Old Dominion Freight Line',
      equipment: 'Van', cost: '--', status: 'Sent',
      pickupDateTime: '08/01/2026 09:00 CST', deliveryDateTime: '08/03/2026 09:00 CST',
    }
    const data = { options: [option] }
    render(<RoutingGuideTab data={data} shipment={shipment} />)

    const menuCell = document.querySelector('[data-right-table] tbody tr td:last-child')
    fireEvent.click(menuCell)
    fireEvent.click(screen.getByRole('button', { name: 'Add Quote' }))

    const dialog = screen.getByRole('dialog', { name: 'Add Quote' })
    const baseRateField = within(dialog).getAllByText('Base Rate')[0].closest('.form-field')
    fireEvent.change(within(baseRateField).getByRole('textbox'), { target: { value: '900' } })
    fireEvent.blur(within(baseRateField).getByRole('textbox')) // touched idiom — reveals the error same as QuoteModal.test.jsx

    expect(screen.getByText('Please select a currency.')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save Quote' }))

    expect(saveTenderOption).not.toHaveBeenCalled()
    // Still exactly one row — no phantom save-and-append either.
    expect(document.querySelectorAll('[data-right-table] tbody tr')).toHaveLength(1)
  })
})

// Delete Quote (LINX-13897). `quoteFlag === 'Y'` is what tells a user-entered
// quote apart from a contracted/system-sourced rate (generate.mjs seeds every
// option with a rateSource of 'Contract' | 'Spot' | 'Benchmark' | 'Historical'
// and a positive apTotal regardless) — quoteFlag is written ONLY by this
// component's own Add/Edit Quote save (LINX-13896) and cleared by its own
// Delete (below). Delete Quote is offered exclusively for a quoted option.
describe('RoutingGuideTab — Delete Quote (LINX-13897)', () => {
  const openRowMenu = () => {
    const menuCell = document.querySelector('[data-right-table] tbody tr td:last-child')
    fireEvent.click(menuCell)
  }

  const manualQuote = {
    rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'Old Dominion Freight Line',
    equipment: 'Van', cost: '$2,790.00 USD', status: null, rateSource: 'Manual', quoteFlag: 'Y',
    rateDetails: { baseRate: 2500, currency: 'USD', markup: 300, additionalCharges: [], apTotal: 2790, arTotal: 3090 },
  }

  it("offers Delete Quote alongside Edit Quote for a quoted option (quoteFlag 'Y')", () => {
    const data = { options: [manualQuote] }
    render(<RoutingGuideTab data={data} />)
    openRowMenu()
    expect(screen.getByRole('button', { name: 'Edit Quote' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Delete Quote' })).toBeTruthy()
  })

  // Renamed from "...even though it has a quote" — under the old
  // apTotal-based discriminator a contracted rate DID read as "has a quote"
  // (the exact bug this contract change fixes), so the old assertion that
  // Edit Quote still showed was itself testing the bug. Now a contracted
  // rate has no quoteFlag at all, so it offers Add Quote and neither
  // Edit nor Delete — see the LINX-13894 describe block above for the
  // add-side assertion of this same case.
  it('never offers Edit/Delete Quote for a contracted rate, even with a positive apTotal (Add Quote instead)', () => {
    const data = { options: [{ ...manualQuote, quoteFlag: undefined, rateSource: 'Contract' }] }
    render(<RoutingGuideTab data={data} />)
    openRowMenu()
    expect(screen.getByRole('button', { name: 'Add Quote' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Edit Quote' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete Quote' })).toBeNull()
  })

  it('does not offer Delete Quote when there is no quote yet (Add Quote shown instead)', () => {
    const data = { options: [{ ...manualQuote, quoteFlag: undefined, cost: '--', rateDetails: undefined }] }
    render(<RoutingGuideTab data={data} />)
    openRowMenu()
    expect(screen.getByRole('button', { name: 'Add Quote' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Delete Quote' })).toBeNull()
  })

  // LINX-13897 (hide when Sent/Accepted) contradicts LINX-13894's table (no
  // status condition) — 13897 wins per user ruling (deleting on an
  // already-sent tender is the riskier operation).
  it.each(['Sent', 'Accepted'])('hides Delete Quote when tender status is %s', (status) => {
    const data = { options: [{ ...manualQuote, status }] }
    render(<RoutingGuideTab data={data} />)
    openRowMenu()
    expect(screen.queryByRole('button', { name: 'Delete Quote' })).toBeNull()
  })

  it('shows Delete Quote when tender status is Declined or Cancelled', () => {
    const data = { options: [{ ...manualQuote, status: 'Declined' }] }
    render(<RoutingGuideTab data={data} />)
    openRowMenu()
    expect(screen.getByRole('button', { name: 'Delete Quote' })).toBeTruthy()
  })

  it('Delete Quote shows a Yes/No confirm with the exact removal copy', () => {
    const data = { options: [manualQuote] }
    render(<RoutingGuideTab data={data} />)
    openRowMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Delete Quote' }))

    expect(screen.getByText('This quote will be permanently removed from this routing option. This action cannot be undone. Do you want to continue?')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'No' })).toBeTruthy()
  })

  it('No backs out: the quote and its menu entry are untouched', () => {
    const data = { options: [manualQuote] }
    render(<RoutingGuideTab data={data} />)
    openRowMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Delete Quote' }))
    fireEvent.click(screen.getByRole('button', { name: 'No' }))

    expect(screen.queryByText(/permanently removed/i)).toBeNull()
    expect(saveTenderOption).not.toHaveBeenCalled()
    openRowMenu()
    expect(screen.getByRole('button', { name: 'Edit Quote' })).toBeTruthy()
  })

  it('Yes clears the quote, persists the cleared option, and the menu reverts to Add Quote', () => {
    const shipment = { sellShipment: 'SHIP-1' }
    const data = { options: [manualQuote] }
    render(<RoutingGuideTab data={data} shipment={shipment} />)
    openRowMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Delete Quote' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))

    expect(screen.queryByText(/permanently removed/i)).toBeNull()

    expect(saveTenderOption).toHaveBeenCalledTimes(1)
    const [id, sentOption] = saveTenderOption.mock.calls[0]
    expect(id).toBe('SHIP-1')
    // AP/AR totals the quote generated are cleared, not just hidden.
    expect(sentOption.totalCostAmount).toBeUndefined()
    expect(sentOption.rateDetails.apTotal).toBe(0)
    expect(sentOption.rateDetails.arTotal).toBe(0)
    expect(sentOption.quoteFlag).toBe('N')
    // LINX-13897's counterpart to save's "Carrier Quoted = Yes".
    expect(sentOption.carrierQuoted).toBe('No')

    openRowMenu()
    expect(screen.getByRole('button', { name: 'Add Quote' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Edit Quote' })).toBeNull()
  })
})

// Dates-unavailable guard (LINX-13895). "Quote Entry shall not be allowed
// when: Pickup Date is unavailable. / Delivery Date is unavailable." Checked
// on Add Quote only — Edit Quote isn't gated, since an existing quote already
// implies both dates were present when it was entered (see the comment in
// handleAction's AddQuote branch).
describe('RoutingGuideTab — Add Quote blocked when dates are unavailable (LINX-13895)', () => {
  const openRowMenu = () => {
    const menuCell = document.querySelector('[data-right-table] tbody tr td:last-child')
    fireEvent.click(menuCell)
  }

  const NOTICE = 'Quote cannot be entered because Pickup and Delivery information is not available for the selected routing option.'

  it('blocks Add Quote and shows the notice when a date is unavailable; the quote modal never opens', () => {
    const option = {
      rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'Old Dominion Freight Line',
      equipment: 'Van', cost: '--', status: 'Sent',
      pickupDateTime: '08/01/2026 09:00 CST', deliveryDateTime: '--', // delivery unavailable
    }
    const data = { options: [option] }
    render(<RoutingGuideTab data={data} />)
    openRowMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Add Quote' }))

    expect(screen.getByText(NOTICE)).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Add Quote' })).toBeNull()
    // Single button.
    expect(screen.getByRole('button', { name: 'OK' })).toBeTruthy()
  })

  it('OK dismisses the notice and leaves state untouched — no save, stays on Routing Options', () => {
    const option = {
      rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'Old Dominion Freight Line',
      equipment: 'Van', cost: '--', status: 'Sent',
      pickupDateTime: null, deliveryDateTime: null, // both unavailable
    }
    const data = { options: [option] }
    render(<RoutingGuideTab data={data} />)
    openRowMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Add Quote' }))
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))

    expect(screen.queryByText(NOTICE)).toBeNull()
    expect(screen.queryByRole('dialog', { name: 'Add Quote' })).toBeNull()
    expect(saveTenderOption).not.toHaveBeenCalled()
    // Still on Tender → Routing Options with the row menu reachable again —
    // i.e. nothing about the option itself changed.
    openRowMenu()
    expect(screen.getByRole('button', { name: 'Add Quote' })).toBeTruthy()
  })

  it('does not gate an option that has both dates', () => {
    const option = {
      rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'Old Dominion Freight Line',
      equipment: 'Van', cost: '--', status: 'Sent',
      pickupDateTime: '08/01/2026 09:00 CST', deliveryDateTime: '08/03/2026 09:00 CST',
    }
    const data = { options: [option] }
    render(<RoutingGuideTab data={data} />)
    openRowMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Add Quote' }))

    expect(screen.queryByText(NOTICE)).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Add Quote' })).toBeTruthy()
  })
})

// Dropped Carrier mount (LINX-13953) — droppedCarriers arrives via the
// `shipmentDetails` prop (ShipmentDetailVM), a sibling of `routingData`/`data`,
// NOT nested inside `data`. See BottomBar.jsx: `data={shownDetails.routingData}
// shipmentDetails={shownDetails}`.
describe('RoutingGuideTab — Dropped Carrier section (LINX-13953)', () => {
  it('renders the Dropped Carrier section below the tender table', () => {
    // The real shape: routing returns five fields, everything else is '--'.
    const dropped = [{
      scac: 'JBHT', carrierName: 'J.B. HUNT', equipment: 'LTL',
      dropCode: '23', reason: 'Missing Transit Time',
      reasonDescription: 'Transit time could not be calculated.',
      routeRank: '--', pickup: '--', delivery: '--', startDate: '--', stopDate: '--',
      transitTime: '--', transitSource: '--', routeGroup: '--', rpcId: '--', ttId: '--',
      commitment: '--', uom: '--', accepted: '--', open: '--', comment: '--', cvcId: '--',
      orderEquipment: false, indirectPoint: false,
    }]
    const data = { options: [baseOption] }
    render(<RoutingGuideTab data={data} shipmentDetails={{ droppedCarriers: dropped }} />)
    expect(screen.getByText('Dropped Carrier (1)')).toBeTruthy()
  })

  it("the dropped table does not answer to the tender table's collapse selector", () => {
    // handleCollapse queries [data-routing-container] GLOBALLY. If the dropped
    // table ever carried that attribute the tender collapse maths would grab the
    // wrong table — this pins the attribute names apart.
    const data = { options: [baseOption] }
    const { container } = render(<RoutingGuideTab data={data} shipmentDetails={{ droppedCarriers: [] }} />)
    expect(container.querySelectorAll('[data-routing-container]').length).toBeLessThanOrEqual(1)
  })
})
