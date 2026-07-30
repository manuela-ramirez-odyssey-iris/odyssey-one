// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { QuoteModal, splitDateTime, joinDateTime } from './RoutingGuideTab'

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

  it('view mode composes pickup/delivery into ONE blocked field', () => {
    render(<QuoteModal mode="view" carrierData={quote} onSave={() => {}} onClose={() => {}} />)
    const composed = screen.getAllByDisplayValue('01/07/2026 09:00 CST')
    expect(composed).toHaveLength(2) // pickup + delivery
    composed.forEach((el) => expect(el.disabled).toBe(true))
    // no split controls in read-only mode
    expect(screen.queryByLabelText(/Select time/i)).toBeNull()
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
    // static text (the UTC offset only), not a control
    expect(screen.getAllByText('(UTC-07:00)')).toHaveLength(2)
    expect(screen.queryByRole('combobox', { name: /time zone/i })).toBeNull()
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
