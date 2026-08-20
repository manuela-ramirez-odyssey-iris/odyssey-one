// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within, act } from '@testing-library/react'
import { QuoteModal, splitDateTime, joinDateTime, tzOffset, dayOfWeek, composeCarrierDateTime } from './QuoteModal'

afterEach(cleanup)

const quote = {
  scac: 'ABFS',
  carrierName: 'ABF FREIGHT SYSTEM',
  pickupDateTime: '01/07/2026 09:00 CST',
  deliveryDateTime: '01/07/2026 09:00 CST',
  rateDetails: {
    baseRate: 803.73, currency: 'USD', markup: 354.42,
    additionalCharges: [{ code: 'SOC', description: 'Stop-Off Charge', amount: 100, currency: 'USD' }],
  },
}

describe('quote date/time string', () => {
  it('round-trips the display format', () => {
    expect(splitDateTime('01/07/2026 09:00 CST')).toEqual({ date: '01/07/2026', time: '09:00', tz: 'CST' })
    expect(joinDateTime(splitDateTime('01/07/2026 09:00 CST'))).toBe('01/07/2026 09:00 CST')
  })

  it('tolerates partial and junk values without throwing', () => {
    expect(splitDateTime('')).toEqual({ date: '', time: '', tz: 'CST' })
    expect(splitDateTime('--')).toEqual({ date: '', time: '', tz: 'CST' })
    expect(splitDateTime(null)).toEqual({ date: '', time: '', tz: 'CST' })
    expect(splitDateTime('01/07/2026')).toEqual({ date: '01/07/2026', time: '', tz: 'CST' })
    // no date = no timestamp at all; a bare time would be meaningless
    expect(joinDateTime({ date: '', time: '09:00', tz: 'CST' })).toBe('')
    expect(joinDateTime({ date: '01/07/2026', time: '', tz: 'CST' })).toBe('01/07/2026')
  })

  // Times are 24h end to end — display AND wire (LINX-8120 / LINX-7629 data
  // format). Guards against a 12h face being reintroduced from a mock.
  it('keeps time 24h in the composed value', () => {
    expect(joinDateTime({ date: '01/07/2026', time: '14:30', tz: 'CST' })).toBe('01/07/2026 14:30 CST')
  })
})

// LINX-13895 — Carrier Option's Pickup/Delivery compose date, time, tz,
// derived day-of-week, and org hours into one read-only string:
// "01/07/2026 09:00 CST, Tue, (07:00-15:30)" per the ticket's own row.
describe('composeCarrierDateTime / dayOfWeek (LINX-13895)', () => {
  // The ticket's example row labels 01/07/2026 "Tue". Verified below (and via
  // `node -e` against the exact Date(y, m-1, d) construction dayOfWeek uses)
  // that 01/07/2026 is actually a WEDNESDAY — the ticket's own example is
  // internally inconsistent. Asserting the derived (correct) day rather than
  // encoding the ticket's wrong one; flagged in the session report.
  it('produces the ticket-shaped format from its own example row', () => {
    expect(dayOfWeek('01/07/2026')).toBe('Wed') // not 'Tue' — see note above
    expect(
      composeCarrierDateTime({ date: '01/07/2026', time: '09:00', tz: 'CST', orgHours: '07:00-15:30' }),
    ).toBe('01/07/2026 09:00 CST, Wed, (07:00-15:30)')
  })

  it('omits missing org hours with no stray trailing comma or empty parens', () => {
    const composed = composeCarrierDateTime({ date: '01/07/2026', time: '09:00', tz: 'CST', orgHours: undefined })
    expect(composed).toBe('01/07/2026 09:00 CST, Wed')
    expect(composed).not.toMatch(/,\s*,/)
    expect(composed).not.toMatch(/\(\)/)
  })

  it('omits a missing time (and its tz) while still deriving the day', () => {
    const composed = composeCarrierDateTime({ date: '01/07/2026', time: '', tz: 'CST', orgHours: '07:00-15:30' })
    expect(composed).toBe('01/07/2026, Wed, (07:00-15:30)')
    expect(composed).not.toMatch(/,\s*,/)
  })

  it('renders the DASH for a completely empty value', () => {
    expect(composeCarrierDateTime(null)).toBe('--')
    expect(composeCarrierDateTime({ date: '', time: '', tz: 'CST', orgHours: '' })).toBe('--')
  })

  it('dayOfWeek rejects a malformed or impossible date rather than naming a rolled-over day', () => {
    expect(dayOfWeek('02/31/2026')).toBe('') // Feb never has 31 days — no silent March rollover
    expect(dayOfWeek('13/01/2026')).toBe('') // month 13 doesn't exist
    expect(dayOfWeek('not-a-date')).toBe('')
    expect(dayOfWeek('')).toBe('')
    expect(dayOfWeek(null)).toBe('')
  })
})

describe('QuoteModal', () => {
  it('titles itself per mode', () => {
    render(<QuoteModal mode="add" onSave={() => {}} onClose={() => {}} />)
    expect(screen.getByText('Add Quote')).toBeTruthy()
    cleanup()
    render(<QuoteModal mode="edit" carrierData={quote} onSave={() => {}} onClose={() => {}} />)
    expect(screen.getByText('Edit Quote')).toBeTruthy()
    cleanup()
    render(<QuoteModal mode="view" carrierData={quote} onSave={() => {}} onClose={() => {}} />)
    expect(screen.getByText('Rate Details')).toBeTruthy()
  })

  it('AP excludes markup, AR includes it, both carry the charges', () => {
    render(<QuoteModal mode="edit" carrierData={quote} onSave={() => {}} onClose={() => {}} />)
    // AP = 803.73 + 100 · AR = 803.73 + 354.42 + 100
    expect(screen.getByText('$903.73')).toBeTruthy()
    expect(screen.getByText('$1,258.15')).toBeTruthy()
  })

  it('empty state, then Add Row opens an editable charge line', () => {
    render(<QuoteModal mode="add" onSave={() => {}} onClose={() => {}} />)
    expect(screen.getByText('No additional charges.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Add Row/ }))
    expect(screen.queryByText('No additional charges.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Remove charge 1' })).toBeTruthy()
  })

  it('view mode renders pickup/delivery as VALUES, not blocked fields', () => {
    // Org hours added on top of the base fixture so the composed value
    // exercises every part LINX-13895 requires: date, time, tz, derived day,
    // AND org hours. 01/07/2026 is a Wednesday (see composeCarrierDateTime
    // describe block above) — the ticket's own example mislabels this date
    // "Tue"; asserting the correct derived day instead.
    const withHours = { ...quote, pickupOrgHours: '07:00-15:30', deliveryOrgHours: '07:00-15:30' }
    render(<QuoteModal mode="view" carrierData={withHours} onSave={() => {}} onClose={() => {}} />)
    const composed = '01/07/2026 09:00 CST, Wed, (07:00-15:30)'
    // Read as text (TitleSubtitle), the General Information idiom — S112
    expect(screen.getAllByText(composed)).toHaveLength(2) // pickup + delivery
    expect(screen.queryByDisplayValue(composed)).toBeNull() // no dead input
    // no split controls in read-only mode
    expect(screen.queryByLabelText(/Select time/i)).toBeNull()
  })

  it('view mode has no form controls left in Carrier / Rate / Charges', () => {
    render(<QuoteModal mode="view" carrierData={quote} onSave={() => {}} onClose={() => {}} />)
    expect(screen.getByText('ABFS')).toBeTruthy()                 // SCAC as text
    expect(screen.getByText('ABF FREIGHT SYSTEM')).toBeTruthy()   // carrier name as text
    expect(screen.getByText('$803.73 USD')).toBeTruthy()          // base rate as text
    expect(screen.getByText('Stop-Off Charge')).toBeTruthy()      // charge row as text
    expect(screen.queryByRole('combobox')).toBeNull()             // nothing typeable anywhere
  })

  it('seeds the timezone from the shipment when the quote carries none', () => {
    render(
      <QuoteModal
        mode="add"
        shipmentTz={{ pickup: 'MST', delivery: 'MST' }}
        onSave={() => {}}
        onClose={() => {}}
      />,
    )
    // Still no timezone CONTROL — it stays system-determined. As of S112 the
    // offset is not SURFACED in add/edit either: it rides silently in state and
    // only becomes visible in the composed read-only value (asserted below).
    expect(screen.queryByRole('combobox', { name: /time zone/i })).toBeNull()
    expect(screen.queryByText(/UTC-/)).toBeNull()
  })

  it('the timezone survives into the composed read-only value', () => {
    render(<QuoteModal mode="view" carrierData={quote} onSave={() => {}} onClose={() => {}} />)
    // "CST" is the seeded zone riding through splitDateTime → joinDateTime.
    // `quote` carries no org hours, so the composed value stops after the
    // derived day rather than trailing an empty ", ()" — degradation is
    // covered on its own in composeCarrierDateTime's describe block above.
    expect(screen.getAllByText('01/07/2026 09:00 CST, Wed')).toHaveLength(2)
  })

  it('view mode is read-only: no Add Row, no footer at all', () => {
    render(<QuoteModal mode="view" carrierData={quote} onSave={() => {}} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /Add Row/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Save Quote' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy() // header X is the exit
  })

  // LINX-13895 — Base Rate/Markup/Charge Amount are "Numeric, up to 6 decimal
  // places" (was 2dp pre-ticket). "UP TO" is a CEILING, not a pad: this used
  // to assert "900.500000" because the field passed `decimals={6}` (fixed
  // precision), which turned every entry into a wall of zeros. Now
  // `maxDecimals={6}` — round to at most 6, keep what the user typed.
  it('caps a pricing field at 6dp on blur without padding it', () => {
    render(<QuoteModal mode="edit" carrierData={quote} onSave={() => {}} onClose={() => {}} />)
    const base = screen.getByDisplayValue('803.73')
    fireEvent.change(base, { target: { value: '900.5' } })
    expect(base.value).toBe('900.5') // untouched while typing
    fireEvent.blur(base)
    expect(base.value).toBe('900.5') // and untouched after — no trailing zeros
    // past the ceiling, it rounds
    fireEvent.change(base, { target: { value: '1.23456789' } })
    fireEvent.blur(base)
    expect(base.value).toBe('1.234568')
  })

  it('blur leaves an empty pricing field empty (no 0.00)', () => {
    render(<QuoteModal mode="add" onSave={() => {}} onClose={() => {}} />)
    const base = screen.getAllByPlaceholderText('0.00')[0]
    fireEvent.blur(base)
    expect(base.value).toBe('')
  })

  it('saves the quote with derived totals', () => {
    const onSave = vi.fn()
    render(<QuoteModal mode="edit" carrierData={quote} onSave={onSave} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save Quote' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    const saved = onSave.mock.calls[0][0]
    expect(saved.scac).toBe('ABFS')
    expect(saved.rateDetails.apTotal).toBe(903.73)
    expect(saved.rateDetails.arTotal).toBe(1258.15)
  })
})

// Equipment field — LINX-13895 makes the whole Carrier Option section
// read-only in every mode (add/edit/view alike), sourced from the selected
// routing option. The 2026-08-10 ComboBox + EQUIPMENT_OPTIONS catalog this
// block used to drive were deleted as dead code; equipment is still edited,
// just elsewhere (ShipmentDetailsModal's General Information section owns
// that control). Read-only doesn't mean dropped from the save though —
// handleSave still emits `equipment` in its onSave payload, straight off
// carrierData.
describe('QuoteModal — Equipment field (read-only, LINX-13895)', () => {
  it('renders carrierData.equipment as a read-only value in add, edit AND view mode, never a combobox', () => {
    for (const mode of ['add', 'edit', 'view']) {
      render(<QuoteModal mode={mode} carrierData={{ ...quote, equipment: 'TT' }} onSave={() => {}} onClose={() => {}} />)
      const cell = screen.getByText('Equipment').closest('.title-subtitle')
      expect(within(cell).getByText('TT')).toBeTruthy() // bare code, matching every other read-only field
      expect(within(cell).queryByRole('combobox')).toBeNull() // no combobox in the Equipment cell itself
      cleanup()
    }
  })

  it('degrades to the DASH in every mode when carrierData carries no equipment', () => {
    for (const [mode, carrierData] of [['add', undefined], ['edit', quote], ['view', quote]]) {
      render(<QuoteModal mode={mode} carrierData={carrierData} onSave={() => {}} onClose={() => {}} />)
      const cell = screen.getByText('Equipment').closest('.title-subtitle')
      expect(within(cell).getByText('--')).toBeTruthy()
      cleanup()
    }
  })

  it('carrierData.equipment rides into the onSave payload untouched — the whole point of the field', () => {
    const onSave = vi.fn()
    render(<QuoteModal mode="edit" carrierData={{ ...quote, equipment: 'TT' }} onSave={onSave} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save Quote' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0].equipment).toBe('TT')
  })
})

// Markup currency (2026-08-10) — markupCurrency was a dead, hardcoded 'USD'
// state never seeded from carrierData, so a CAD quote's Markup silently
// rendered/reset to USD. Ruling: markup shares the quote's ONE currency
// (arTotal sums base + markup as a single currency), so this is a collapse,
// not a persistence fix.
describe('QuoteModal — Markup currency', () => {
  it('view mode renders Markup in the quote\'s shared currency, not a hardcoded USD', () => {
    const cadQuote = { ...quote, rateDetails: { ...quote.rateDetails, currency: 'CAD' } }
    render(<QuoteModal mode="view" carrierData={cadQuote} onSave={() => {}} onClose={() => {}} />)
    expect(screen.getByText('$803.73 CAD')).toBeTruthy() // Base Rate
    expect(screen.getByText('$354.42 CAD')).toBeTruthy() // Markup — was '$354.42 USD'
  })

  it('changing currency via either rate field survives a save round-trip', () => {
    const onSave = vi.fn()
    render(<QuoteModal mode="edit" carrierData={quote} onSave={onSave} onClose={() => {}} />)
    // FieldSelect's UoM trigger opens a portal dropdown (useAnchoredPortal →
    // document.body) — same recipe CarrierBid.test.jsx uses for MeasureField.
    // "Base Rate" also labels an AP/AR summary row, so pick the field's label.
    const baseField = screen.getByText('Base Rate', { selector: 'label' }).closest('.form-field')
    fireEvent.click(within(baseField).getByRole('button'))
    fireEvent.click(screen.getByRole('option', { name: 'CAD' }))

    fireEvent.click(screen.getByRole('button', { name: 'Save Quote' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0].rateDetails.currency).toBe('CAD')
  })
})

// LINX-13895 — "Currency shall only be selected on Base Rate" / "Users shall
// not modify currency on: Markup Amount / Additional Charges." MeasureField
// has no "trailing select disabled, input still editable" affordance, so
// Markup and each charge row get a single-entry `options` array (the same
// idiom CarrierBid.jsx already uses to lock Linehaul/Base to USD) — the
// trailing trigger still renders, but its menu holds only the one value
// already in force, so there is never an alternate to pick.
describe('QuoteModal — currency lock (LINX-13895)', () => {
  it('Markup offers only the current currency, never an alternate', () => {
    render(<QuoteModal mode="edit" carrierData={quote} onSave={() => {}} onClose={() => {}} />)
    const markupField = screen.getByText('Markup', { selector: 'label' }).closest('.form-field')
    fireEvent.click(within(markupField).getByRole('button'))
    expect(screen.getByRole('option', { name: 'USD' })).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'CAD' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'EUR' })).toBeNull()
  })

  it('an Additional Charge row offers only the current currency, never an alternate', () => {
    // The modal portals into document.body (not RTL's `container`), same as
    // every other test here that reaches into the DOM via `screen`/`document`.
    render(<QuoteModal mode="edit" carrierData={quote} onSave={() => {}} onClose={() => {}} />)
    const chargeSelects = document.querySelectorAll('.quote-charges__row--editable .field-select--trailing')
    expect(chargeSelects).toHaveLength(1)
    fireEvent.click(chargeSelects[0])
    expect(screen.getByRole('option', { name: 'USD' })).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'CAD' })).toBeNull()
  })

  it('changing Base Rate currency auto-populates Markup and every Charge row on save', () => {
    const onSave = vi.fn()
    render(<QuoteModal mode="edit" carrierData={quote} onSave={onSave} onClose={() => {}} />)
    const baseField = screen.getByText('Base Rate', { selector: 'label' }).closest('.form-field')
    fireEvent.click(within(baseField).getByRole('button'))
    fireEvent.click(screen.getByRole('option', { name: 'CAD' }))

    fireEvent.click(screen.getByRole('button', { name: 'Save Quote' }))
    const saved = onSave.mock.calls[0][0]
    expect(saved.rateDetails.currency).toBe('CAD')
    // The seeded charge carried its own stale 'USD' — save forces it to the
    // one shared currency rather than persisting the mismatch.
    expect(saved.rateDetails.additionalCharges[0].currency).toBe('CAD')
  })
})

// LINX-13895 / LINX-3966 — Currency and Charge Code both moved off local
// hardcoded arrays onto the shared lookupService registry (see
// lookupService.test.ts for the registry-level coverage: pool shape,
// description matching, frequency sort).
describe('QuoteModal — Currency + Charge Code from the shared lookup (LINX-13895/3966)', () => {
  it('Base Rate offers the full CURRENCIES pool, including MXN — the old hardcoded list only had USD/CAD/EUR', () => {
    render(<QuoteModal mode="edit" carrierData={quote} onSave={() => {}} onClose={() => {}} />)
    const baseField = screen.getByText('Base Rate', { selector: 'label' }).closest('.form-field')
    fireEvent.click(within(baseField).getByRole('button'))
    expect(screen.getByRole('option', { name: 'USD' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'CAD' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'EUR' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'MXN' })).toBeTruthy()
  })

  // Charge Code's dropdown renders through ComboBox → FieldSearchResults,
  // which virtualizes its row list (@tanstack/react-virtual) — jsdom can't
  // size a scroll container, so it renders zero rows regardless of how many
  // matches exist (see FieldSearchResults.jsx's own doc comment). Clicking a
  // rendered option row is therefore NOT assertable here.
  //
  // What IS assertable without touching the DOM rows: the `matches` array
  // (and so keyboard selection off it) is populated from component STATE,
  // independent of virtualization. Focusing the field triggers a 0-debounce
  // "browse" load (empty query — the whole point of a chevron/focus browse,
  // same idiom GeneralInformationSection's paged lookups use), so ArrowDown
  // + Enter exercises the exact same onSelect → setChargeCode path a mouse
  // click on a real row would, without depending on what jsdom can render.
  it('selecting a charge code (via keyboard, bypassing the unassertable virtualized rows) auto-populates Charge Description', async () => {
    render(<QuoteModal mode="add" onSave={() => {}} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Add Row/ }))
    const codeInput = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.focus(codeInput)
      await new Promise((resolve) => setTimeout(resolve, 10)) // flush the 0-debounce load + its promise
    })

    fireEvent.keyDown(codeInput, { key: 'ArrowDown' }) // highlights HZC — highest frequency (50)
    fireEvent.keyDown(codeInput, { key: 'Enter' })

    expect(screen.getByDisplayValue('HZC')).toBeTruthy()
    // Charge Description: "Auto-populated / Derived from Charge Code"
    // (LINX-13895) — read off the lookup option, not re-derived locally.
    // Real legacy catalog now (quote-model.md §5.6), not the invented THC
    // mnemonic this replaced.
    expect(screen.getByDisplayValue('Hazardous Materials')).toBeTruthy()
  })
  // "Search by Code or Description" itself (typing "fuel" resolving FSC) is
  // covered at the registry in lookupService.test.ts, where it's actually
  // assertable — the ComboBox's popover here can't render its matched rows
  // in jsdom (see the note above), so there's nothing more this file could
  // check without duplicating that coverage vacuously.
})

// LINX-13895 — Base Rate/Markup/Charge Amount are "Numeric, up to 6 decimal
// places" (was 2dp pre-ticket). Totals must not clip that precision either.
describe('QuoteModal — 6-decimal precision (LINX-13895)', () => {
  it('a 6-decimal Base Rate survives save with full precision, not rounded to cents', () => {
    const onSave = vi.fn()
    render(<QuoteModal mode="edit" carrierData={quote} onSave={onSave} onClose={() => {}} />)
    const base = screen.getByDisplayValue('803.73')
    fireEvent.change(base, { target: { value: '100.123456' } })
    fireEvent.blur(base)

    fireEvent.click(screen.getByRole('button', { name: 'Save Quote' }))
    const saved = onSave.mock.calls[0][0]
    expect(saved.rateDetails.baseRate).toBe(100.123456)
    // apTotal = 100.123456 base + 100 charge — the old Math.round(x*100)/100
    // would have clipped this to 200.12.
    expect(saved.rateDetails.apTotal).toBe(200.123456)
  })

  it('the AP/AR summary cards still read 2dp — a 6-decimal input is not what a summary should show', () => {
    render(<QuoteModal mode="edit" carrierData={quote} onSave={() => {}} onClose={() => {}} />)
    const base = screen.getByDisplayValue('803.73')
    fireEvent.change(base, { target: { value: '100.123456' } })
    fireEvent.blur(base)
    // fmtDollar formats at render time regardless of the stored total's
    // precision, so the summary card is unaffected by the 6dp change.
    expect(screen.getByText('$200.12')).toBeTruthy()
  })
})

// LINX-13895 field-validation table.
describe('QuoteModal — validation messages (LINX-13895)', () => {
  // The Save button is disabled while any of these errors stand — a native
  // disabled button never fires its click handler even via fireEvent.click,
  // so these go through the same imperative `ref.save()` the embedded host
  // (ShipmentDetailsModal) already drives its OWN Save button through, to
  // reveal the messages without depending on the DOM disabled attribute.
  it('Base Rate is required', () => {
    const ref = createRef()
    render(<QuoteModal ref={ref} mode="add" onSave={() => {}} onClose={() => {}} />)
    act(() => { ref.current.save() })
    expect(screen.getByText('Base Rate is required.')).toBeTruthy()
  })

  it('Charge Code is required once a row is added', () => {
    const ref = createRef()
    render(<QuoteModal ref={ref} mode="add" onSave={() => {}} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Add Row/ }))
    act(() => { ref.current.save() })
    expect(screen.getByText('Charge Code is required.')).toBeTruthy()
  })

  it('Additional Charge Amount is required once a row is added', () => {
    const ref = createRef()
    render(<QuoteModal ref={ref} mode="add" onSave={() => {}} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Add Row/ }))
    act(() => { ref.current.save() })
    expect(screen.getByText('Amount is required.')).toBeTruthy()
  })

  it('an invalid numeric amount is rejected', () => {
    render(<QuoteModal mode="edit" carrierData={quote} onSave={() => {}} onClose={() => {}} />)
    const base = screen.getByDisplayValue('803.73')
    // "." clears the mask (format="decimal" allows a lone dot through) but
    // is not itself a number — Number('.') is NaN.
    fireEvent.change(base, { target: { value: '.' } })
    fireEvent.blur(base)
    expect(screen.getByText('Please enter a valid numeric amount.')).toBeTruthy()
  })

  // jsdom/wiring note: MeasureField's own onBlur normalizes to exactly
  // `decimals` places (toFixed) in the SAME blur event that reveals our
  // error (both fire from one handler, batched into one render) — so typing
  // 7+ decimals and blurring never leaves the over-precision value in state
  // long enough for THIS rule to see it; MeasureField's rounding wins first.
  // The rule still matters for a value that arrives already over-precision
  // (e.g. seed/API data) — it disables Save, but nothing reveals the message
  // until something touches that field or the host force-reveals it via the
  // imperative `save()` ref (exactly how ShipmentDetailsModal's own Save
  // button drives the embedded instance). Exercised that way here.
  it('an already over-precision amount disables Save and surfaces its message via ref.save()', () => {
    const overPrecise = { ...quote, rateDetails: { ...quote.rateDetails, baseRate: 1.1234567 } }
    const ref = createRef()
    render(<QuoteModal ref={ref} mode="edit" carrierData={overPrecise} onSave={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: 'Save Quote' }).disabled).toBe(true)
    act(() => { ref.current.save() })
    expect(screen.getByText('Amount supports up to 6 decimal places.')).toBeTruthy()
  })

  // "Base Rate Currency not selected" → "Please select a currency." (LINX-3966
  // Rule 5 / LINX-13895) — fires once an amount is entered but no currency is
  // chosen, not on an untouched empty form (LINX-3966: "for the fields for
  // which data added"). Currency used to default to 'USD' at init, which made
  // this branch of baseRateError permanently unreachable; covered for real
  // below now that Add Quote starts with no currency selected.
  it('does not show "Please select a currency." on an untouched, entirely empty Add Quote form', () => {
    render(<QuoteModal mode="add" onSave={() => {}} onClose={() => {}} />)
    expect(screen.queryByText('Please select a currency.')).toBeNull()
  })

  it('shows "Please select a currency." once a Base Rate amount is entered with no currency chosen, and blocks Save', () => {
    // scac supplied (Save's OTHER gate, `!scac`) so the disabled assertions
    // below isolate the currency rule rather than the missing-carrier one.
    render(<QuoteModal mode="add" carrierData={{ scac: 'ABFS' }} onSave={() => {}} onClose={() => {}} />)
    const baseField = screen.getByText('Base Rate', { selector: 'label' }).closest('.form-field')
    const baseInput = within(baseField).getByPlaceholderText('0.00')
    fireEvent.change(baseInput, { target: { value: '500' } })
    fireEvent.blur(baseInput) // touched idiom — same reveal path every other field here uses
    expect(screen.getByText('Please select a currency.')).toBeTruthy()
    expect(screen.queryByText('Base Rate is required.')).toBeNull() // wrong message would mean the amount-present branch isn't reached
    expect(screen.getByRole('button', { name: 'Save Quote' }).disabled).toBe(true)

    // Choosing a currency clears the error and unblocks Save.
    fireEvent.click(within(baseField).getByRole('button'))
    fireEvent.click(screen.getByRole('option', { name: 'USD' }))
    expect(screen.queryByText('Please select a currency.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Save Quote' }).disabled).toBe(false)
  })

  it('handleSave never writes an empty currency — Save stays disabled the whole time currency is unselected', () => {
    const onSave = vi.fn()
    const ref = createRef()
    render(<QuoteModal ref={ref} mode="add" carrierData={{ scac: 'ABFS' }} onSave={onSave} onClose={() => {}} />)
    const baseField = screen.getByText('Base Rate', { selector: 'label' }).closest('.form-field')
    fireEvent.change(within(baseField).getByPlaceholderText('0.00'), { target: { value: '500' } })
    act(() => { ref.current.save() }) // imperative path, same one ShipmentDetailsModal's embedded host drives
    expect(onSave).not.toHaveBeenCalled()
  })
})

// LINX-3966 (General Rule 5) / LINX-13895 ("Currency Selection is mandatory")
// — a NEW quote must start with no currency chosen, forcing a deliberate
// pick, while an existing quote's currency is restored unchanged. Verified
// against tools/generate.mjs and mapSellShipmentOutToDetail.ts (see
// QuoteModal.jsx's own comment) that `carrierData.rateDetails.currency` reads
// 'USD' even for an option that was never quoted — so the fixture below
// (mode="add" with carrierData already carrying a seeded 'USD') is the actual
// shape the bug hid behind, not a hypothetical.
describe('QuoteModal — currency starts unselected on Add, restored on Edit (LINX-3966 / LINX-13895)', () => {
  it('Add Quote starts with no currency selected, even when carrierData already carries a seeded USD', () => {
    render(<QuoteModal mode="add" carrierData={quote} onSave={() => {}} onClose={() => {}} />)
    const baseField = screen.getByText('Base Rate', { selector: 'label' }).closest('.form-field')
    expect(within(baseField).getByRole('button').textContent).toContain('UOM') // fallback, not a blank/broken pill
  })

  it('Edit Quote restores the existing quote\'s currency unchanged', () => {
    render(<QuoteModal mode="edit" carrierData={quote} onSave={() => {}} onClose={() => {}} />)
    const baseField = screen.getByText('Base Rate', { selector: 'label' }).closest('.form-field')
    expect(within(baseField).getByRole('button').textContent).toContain('USD')
  })

  it('Markup and an Additional Charge row follow the shared currency once it is chosen on Add Quote, without crashing while it is still empty', () => {
    render(<QuoteModal mode="add" onSave={() => {}} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Add Row/ }))
    const markupField = screen.getByText('Markup', { selector: 'label' }).closest('.form-field')
    const chargeSelect = () => document.querySelectorAll('.quote-charges__row--editable .field-select--trailing')[0]

    // Currency still unselected — locked fields fall back to the 'UOM'
    // placeholder (same as an unselected Base Rate), not a blank pill.
    expect(within(markupField).getByRole('button').textContent).toContain('UOM')
    expect(chargeSelect().textContent).toContain('UOM')

    const baseField = screen.getByText('Base Rate', { selector: 'label' }).closest('.form-field')
    fireEvent.click(within(baseField).getByRole('button'))
    fireEvent.click(screen.getByRole('option', { name: 'CAD' }))

    expect(within(markupField).getByRole('button').textContent).toContain('CAD')
    expect(chargeSelect().textContent).toContain('CAD')
  })
})

// LINX-13895 — read-only Audit Information: Created By, Created Date/Time,
// Updated By, Updated Date/Time, Initial AP Amount, Final AP Amount.
describe('QuoteModal — Audit Information (LINX-13895)', () => {
  const audited = {
    ...quote,
    quoteAudit: {
      createdBy: 'jdoe',
      createdDate: '01/05/2026 10:00 CST',
      updatedBy: 'asmith',
      updatedDate: '01/06/2026 11:00 CST',
      initialApAmount: 850,
      finalApAmount: 875.5,
    },
  }

  it('renders supplied audit values read-only, even while the rest of the form is editable', () => {
    render(<QuoteModal mode="edit" carrierData={audited} onSave={() => {}} onClose={() => {}} />)
    expect(screen.getByText('jdoe')).toBeTruthy()
    expect(screen.getByText('01/05/2026 10:00 CST')).toBeTruthy()
    expect(screen.getByText('asmith')).toBeTruthy()
    expect(screen.getByText('01/06/2026 11:00 CST')).toBeTruthy()
    expect(screen.getByText('$850.00')).toBeTruthy()
    expect(screen.getByText('$875.50')).toBeTruthy()
  })

  it('DASHes every field on an option that has never been quoted', () => {
    render(<QuoteModal mode="add" onSave={() => {}} onClose={() => {}} />)
    const section = screen.getByText('Audit Information').closest('section')
    expect(within(section).getAllByText('--')).toHaveLength(6)
  })
})
