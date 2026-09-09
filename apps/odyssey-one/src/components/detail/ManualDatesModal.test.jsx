// @vitest-environment jsdom
// NOTE: @testing-library/user-event and @testing-library/jest-dom are not
// installed in this repo (only @testing-library/react + dom) — using
// fireEvent (this repo's existing pattern, see DroppedCarrierSection.test.jsx)
// and plain assertions (toBeTruthy/toBeNull/.disabled) instead.
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ManualDatesModal from './ManualDatesModal'

afterEach(cleanup)

// Fixed "now" so "in the past" is deterministic — the past-check must not
// depend on the wall clock deciding whether the suite passes.
const NOW = new Date(2026, 8, 1, 12, 0, 0) // 09/01/2026 12:00

function setup() {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(<ManualDatesModal now={NOW} onConfirm={onConfirm} onCancel={onCancel} />)
  return { onConfirm, onCancel }
}

// Each field is a DatePicker + TimePicker pair (2026-08-18), so a value takes
// two commits. Both pickers accept typed text and commit it on blur — that is
// the path jsdom can drive; the popover calendar and the time listbox are
// browser-only surfaces this environment cannot see (see project memory on
// jsdom ceilings), so they are verified by the components' own suites in
// packages/ui, not re-tested here.
function fill(label, value) {
  const input = screen.getByLabelText(label)
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

function fillPickup(dateTime) {
  const [date, time] = dateTime.split(' ')
  fill('Pickup Date', date)
  fill('Pickup Time', time)
}

function fillDelivery(dateTime) {
  const [date, time] = dateTime.split(' ')
  fill('Delivery Date', date)
  fill('Delivery Time', time)
}

function okButton() {
  return screen.getByRole('button', { name: 'OK' })
}

describe('ManualDatesModal (LINX-13954)', () => {
  it('starts with OK disabled — nothing has been entered yet', () => {
    setup()
    expect(okButton().disabled).toBe(true)
    // No message before there's a parseable value to judge.
    expect(screen.queryByText('Pickup Date/Time cannot be in the past.')).toBeNull()
    expect(screen.queryByText('Delivery Date/Time must be later than Pickup Date/Time.')).toBeNull()
  })

  it('blocks and explains a delivery at or before pickup', () => {
    const { onConfirm } = setup()
    // pickup 09/02/2026 10:00, delivery 09/02/2026 10:00 (equal — AC says <= blocks)
    fillPickup('09/02/2026 10:00')
    fillDelivery('09/02/2026 10:00')
    expect(screen.getByText('Delivery Date/Time must be later than Pickup Date/Time.')).toBeTruthy()
    expect(okButton().disabled).toBe(true)
    fireEvent.click(okButton())
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('blocks and explains a pickup in the past', () => {
    setup()
    // pickup 08/01/2026 10:00 (before NOW), delivery 09/05/2026 10:00
    fillPickup('08/01/2026 10:00')
    fillDelivery('09/05/2026 10:00')
    expect(screen.getByText('Pickup Date/Time cannot be in the past.')).toBeTruthy()
    expect(okButton().disabled).toBe(true)
  })

  it('enables OK and returns both values once each rule passes', () => {
    const { onConfirm } = setup()
    fillPickup('09/02/2026 08:00')
    fillDelivery('09/04/2026 16:00')
    expect(screen.queryByText('Pickup Date/Time cannot be in the past.')).toBeNull()
    expect(screen.queryByText('Delivery Date/Time must be later than Pickup Date/Time.')).toBeNull()
    expect(okButton().disabled).toBe(false)
    fireEvent.click(okButton())
    expect(onConfirm).toHaveBeenCalledWith({
      pickupDateTime: '09/02/2026 08:00 CST',
      deliveryDateTime: '09/04/2026 16:00 CST',
    })
  })

  // TimezoneSelect's options render through FieldSearchResults' virtualized
  // list, which lays out against real element height — 0 under jsdom, so the
  // opened listbox renders zero rows (confirmed by manual probe: `role=
  // "listbox"` appears with an empty `field-search-results__list`). Same
  // ceiling as the popover calendar/time-listbox above and the project's
  // documented jsdom limits (virtualized options). So this only asserts the
  // default suffix and that both labelled Time Zone controls are present —
  // picking a different zone is covered by TimezoneSelect's own consumers'
  // browser-driven verification, not re-provable here.
  it('defaults both zones to CST and exposes a labelled Time Zone control per row', () => {
    const { onConfirm } = setup()
    expect(screen.getByText('Pickup Time Zone')).toBeTruthy()
    expect(screen.getByText('Delivery Time Zone')).toBeTruthy()

    // `short` (S144, user ruling) — the modal's zone selects show the
    // abbreviation, not the long "(UTC-06:00) Central Time (US & Canada)"
    // label Orders uses, since a third-width field would ellipsize it.
    expect(document.getElementById('manual-dates-pickup-tz').value).toBe('CST')
    expect(document.getElementById('manual-dates-delivery-tz').value).toBe('CST')

    fillPickup('09/02/2026 08:00')
    fillDelivery('09/04/2026 16:00')
    fireEvent.click(okButton())
    expect(onConfirm).toHaveBeenCalledWith({
      pickupDateTime: '09/02/2026 08:00 CST',
      deliveryDateTime: '09/04/2026 16:00 CST',
    })
  })

  it('cancels without returning anything', () => {
    const { onConfirm, onCancel } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
