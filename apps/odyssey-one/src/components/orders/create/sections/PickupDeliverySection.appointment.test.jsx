// @vitest-environment jsdom
// R2-6 regression guard (db-update-ledger.md): the Appointment auto-clear
// effect used to be guarded by a ref consumed at MOUNT — before the async
// hydration reset() (CreateOrderForm.jsx's draft/resolve reopen effects)
// arrives. Once the real order data landed, the guard was already spent, the
// effect re-fired on the hydration-caused date/time change, and silently
// unchecked a loaded `true` Appointment flag (data loss on next Save). This
// mounts with EMPTY defaultValues (exactly like CreateOrderForm) and then
// reset()s asynchronously — the exact sequence that used to trip the bug.
import { useEffect } from 'react'
import { describe, test, expect, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { FormProvider, useForm } from 'react-hook-form'
import { makeDefaultOrderFormValues } from '../../../../api/types/orderFormVm'
import PickupDeliverySection from './PickupDeliverySection.jsx'

afterEach(cleanup)

function Harness({ hydrateWith }) {
  const methods = useForm({ mode: 'onTouched', defaultValues: makeDefaultOrderFormValues() })
  useEffect(() => {
    // Mirrors CreateOrderForm.jsx's draft/resolve reopen effects: reset()
    // fires from an async callback well AFTER mount, never synchronously
    // during it.
    Promise.resolve().then(() => methods.reset(hydrateWith))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <FormProvider {...methods}>
      <PickupDeliverySection />
    </FormProvider>
  )
}

const hydratedOrder = () => {
  const v = makeDefaultOrderFormValues()
  v.pickupDelivery.pickupAppointment = true
  v.pickupDelivery.latePickup = { date: '08/10/2026', time: '14:00', timezone: 'CDT' }
  v.pickupDelivery.deliveryAppointment = true
  v.pickupDelivery.lateDelivery = { date: '08/12/2026', time: '09:00', timezone: 'CDT' }
  return v
}

const appointmentBoxes = () => screen.getAllByRole('checkbox', { name: 'Appointment' })

describe('R2-6: appointment checkbox survives async hydration', () => {
  test('pickup appointment stays checked after reset() lands post-mount', async () => {
    render(<Harness hydrateWith={hydratedOrder()} />)
    await waitFor(() => {
      // Latest Pickup date renders once hydrated — proof reset() has landed.
      expect(screen.getByDisplayValue('08/10/2026')).toBeTruthy()
    })
    expect(appointmentBoxes()[0].checked).toBe(true)
  })

  test('delivery appointment stays checked after reset() lands post-mount', async () => {
    render(<Harness hydrateWith={hydratedOrder()} />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('08/12/2026')).toBeTruthy()
    })
    expect(appointmentBoxes()[1].checked).toBe(true)
  })
})
