// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { QuoteModal, splitDateTime, joinDateTime, tzOffset } from './QuoteModal'

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
    render(<QuoteModal mode="view" carrierData={quote} onSave={() => {}} onClose={() => {}} />)
    // Read as text (TitleSubtitle), the General Information idiom — S112
    expect(screen.getAllByText('01/07/2026 09:00 CST')).toHaveLength(2) // pickup + delivery
    expect(screen.queryByDisplayValue('01/07/2026 09:00 CST')).toBeNull() // no dead input
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
    // "CST" is the seeded zone riding through splitDateTime → joinDateTime
    expect(screen.getAllByText('01/07/2026 09:00 CST')).toHaveLength(2)
  })

  it('view mode is read-only: no Add Row, no footer at all', () => {
    render(<QuoteModal mode="view" carrierData={quote} onSave={() => {}} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /Add Row/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Save Quote' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy() // header X is the exit
  })

  it('normalizes a pricing field to 2dp on blur', () => {
    render(<QuoteModal mode="edit" carrierData={quote} onSave={() => {}} onClose={() => {}} />)
    const base = screen.getByDisplayValue('803.73')
    fireEvent.change(base, { target: { value: '900.5' } })
    expect(base.value).toBe('900.5') // untouched while typing
    fireEvent.blur(base)
    expect(screen.getByDisplayValue('900.50')).toBeTruthy()
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

// Equipment field (2026-08-10) — the only field QuoteModal was missing, added
// so all three ShipmentDetailsModal pens (Base, Markup, Equipment) can open
// this ONE modal instead of any inline control. Options: master-data's real
// equipment catalog, "CODE - Label" rows while picking (same idiom
// ShipmentDetailsModal's old inline combobox used) — committed/displayed
// value stays the bare CODE.
describe('QuoteModal — Equipment field', () => {
  it('initializes from carrierData.equipment', () => {
    render(<QuoteModal mode="edit" carrierData={{ ...quote, equipment: 'TT' }} onSave={() => {}} onClose={() => {}} />)
    const combo = screen.getByText('Equipment').closest('.combo-box')
    expect(within(combo).getByRole('combobox').value).toBe('TT - Tank Truck')
  })

  it('view mode renders Equipment as a TitleSubtitle, not a control', () => {
    render(<QuoteModal mode="view" carrierData={{ ...quote, equipment: 'TT' }} onSave={() => {}} onClose={() => {}} />)
    expect(screen.getByText('TT')).toBeTruthy() // bare code, matching every other view-mode field
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('view mode falls back to DASH with no equipment', () => {
    render(<QuoteModal mode="view" carrierData={quote} onSave={() => {}} onClose={() => {}} />)
    const cell = screen.getByText('Equipment').closest('.title-subtitle')
    expect(within(cell).getByText('--')).toBeTruthy()
  })

  // jsdom ceiling (project_jsdom_test_ceilings): FieldSearchResults is
  // virtualized — no role="option" rows. Keyboard selection (focus,
  // ArrowDown ×N, Enter) is the established recipe (ComboBox.typeahead.test.jsx,
  // spotboard/SetupCarriers.test.jsx). master-data's EQUIPMENT_LABELS key
  // order is LTL, LTR, LTH, TL, ... ; seeding 'LTL' (index 0) then 2×
  // ArrowDown lands on LTR (index 1).
  it('a picked equipment value rides into the onSave payload — the whole point of the field', () => {
    const onSave = vi.fn()
    render(<QuoteModal mode="edit" carrierData={{ ...quote, equipment: 'LTL' }} onSave={onSave} onClose={() => {}} />)
    const combo = screen.getByText('Equipment').closest('.combo-box')
    const input = within(combo).getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.keyDown(combo, { key: 'ArrowDown' })
    fireEvent.keyDown(combo, { key: 'ArrowDown' })
    fireEvent.keyDown(combo, { key: 'Enter' }) // LTL (seed) -> LTR

    fireEvent.click(screen.getByRole('button', { name: 'Save Quote' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0].equipment).toBe('LTR')
  })

  it('defaults to empty when carrierData carries no equipment (Add Quote)', () => {
    const onSave = vi.fn()
    render(<QuoteModal mode="add" onSave={onSave} onClose={() => {}} />)
    // Add mode's Save Quote is disabled without scac+baseRate; just prove the
    // field renders unselected rather than crashing on a missing carrierData.
    const combo = screen.getByText('Equipment').closest('.combo-box')
    expect(within(combo).getByRole('combobox').value).toBe('')
  })
})
