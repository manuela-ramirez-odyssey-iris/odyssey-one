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

function fillPickup(value) {
  fireEvent.change(screen.getByLabelText('Pickup Date/Time'), { target: { value } })
}

function fillDelivery(value) {
  fireEvent.change(screen.getByLabelText('Delivery Date/Time'), { target: { value } })
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
      pickupDateTime: '09/02/2026 08:00',
      deliveryDateTime: '09/04/2026 16:00',
    })
  })

  it('cancels without returning anything', () => {
    const { onConfirm, onCancel } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
