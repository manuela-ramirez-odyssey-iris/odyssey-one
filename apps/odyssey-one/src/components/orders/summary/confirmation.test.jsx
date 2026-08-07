// @vitest-environment jsdom
// S98 confirmation-page conformance (Figma 4139:11389 / 4465:12225 /
// 4758:6943 / 4758:8241 + LINX-9002): data-driven quick/long hiding, the new
// product rollups, and the Scenario-2 async flip (number populates, alert
// flips to success, navbar bell notified).
import { describe, test, expect, afterEach, vi } from 'vitest'
import { render, screen, within, cleanup, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { makeDefaultOrderFormValues } from '../../../api/types/orderFormVm'
import mapFormVmToOrderPane from './mapFormVmToOrderPane'
import ConfirmationView from '../create/ConfirmationView'

afterEach(cleanup)

const product = (over = {}) => ({
  id: 'r1',
  hazardous: false,
  productId: '000000000003001767',
  description: 'Soap',
  grossWeight: { value: '100', uom: 'lb' },
  volume: { value: '79', uom: 'cuft' },
  shipClass: 'C',
  handlingUnit: '',
  handlingCount: '',
  harmonizedCode: '',
  declaredValue: '',
  declaredValueCurrency: '',
  manufacturingCountry: '',
  stccCode: '',
  ...over,
})

const valuesWith = (over = {}) => {
  const v = makeDefaultOrderFormValues()
  return { ...v, ...over }
}

describe('mapFormVmToOrderPane rollups (confirmation mock strip)', () => {
  test('package count sums handlingCount with uniform unit label', () => {
    const vm = mapFormVmToOrderPane(valuesWith({
      products: [
        product({ handlingUnit: 'BOX', handlingCount: '10' }),
        product({ id: 'r2', handlingUnit: 'BOX', handlingCount: '5' }),
      ],
    }))
    expect(vm.d.packageCount).toBe('15 Boxes')
  })

  test('mixed handling units fall back to the bare count', () => {
    const vm = mapFormVmToOrderPane(valuesWith({
      products: [
        product({ handlingUnit: 'BOX', handlingCount: '10' }),
        product({ id: 'r2', handlingUnit: 'PLT', handlingCount: '5' }),
      ],
    }))
    expect(vm.d.packageCount).toBe('15')
  })

  test('declared value sums one currency, dashes on mixed', () => {
    const one = mapFormVmToOrderPane(valuesWith({
      products: [
        product({ declaredValue: '48000', declaredValueCurrency: 'USD' }),
        product({ id: 'r2', declaredValue: '944', declaredValueCurrency: 'USD' }),
      ],
    }))
    expect(one.d.declaredValue).toBe('$48,944.00 USD')
    const mixed = mapFormVmToOrderPane(valuesWith({
      products: [
        product({ declaredValue: '48000', declaredValueCurrency: 'USD' }),
        product({ id: 'r2', declaredValue: '944', declaredValueCurrency: 'EUR' }),
      ],
    }))
    expect(mixed.d.declaredValue).toBe('')
  })

  // R2-7 (db-update-ledger.md): the Appointment flags were captured by the
  // create form (LINX-12095/13845) but never carried into the read-only
  // View Order / confirmation pane — mapper gap fixed alongside the render.
  test('appointment flags map through as Yes/No, same convention as consolidatable', () => {
    const on = mapFormVmToOrderPane(valuesWith({
      pickupDelivery: {
        ...makeDefaultOrderFormValues().pickupDelivery,
        pickupAppointment: true,
        deliveryAppointment: false,
      },
    }))
    expect(on.d.pickupAppointment).toBe('Yes')
    expect(on.d.deliveryAppointment).toBe('No')
  })

  test('country of origin only when uniform; hazmat from the row checkboxes', () => {
    const vm = mapFormVmToOrderPane(valuesWith({
      products: [
        product({ manufacturingCountry: 'USA' }),
        product({ id: 'r2', manufacturingCountry: 'USA', hazardous: true }),
      ],
    }))
    expect(vm.d.countryOfOrigin).toBe('USA')
    expect(vm.d.hazmat).toBe('Yes')
    expect(vm.d.totalProductWeight).toBe('') // not captured — '--' gap
    expect(vm.d.totalTareWeight).toBe('')
  })

  // R2-7 / LINX-8121: order-level hazmat is DERIVED from lines — a mixed order
  // (one hazardous line, one not) must show order-level Yes while each
  // productLines row keeps its own value (no all-or-nothing collapse).
  test('mixed order: order-level Yes + per-line hazardous values render individually', () => {
    const vm = mapFormVmToOrderPane(valuesWith({
      products: [
        product({ id: 'r1', hazardous: true }),
        product({ id: 'r2', hazardous: false }),
      ],
    }))
    expect(vm.d.hazmat).toBe('Yes')
    expect(vm.productLines.map((l) => l.hazmat)).toEqual([true, false])
  })
})

const renderConfirmation = ({ data, values, variant }) =>
  render(
    <MemoryRouter>
      <ConfirmationView data={data} values={values} variant={variant} />
    </MemoryRouter>,
  )

describe('ConfirmationView quick/long + async flip', () => {
  test('quick order: empty long-only blocks are hidden', () => {
    const values = valuesWith({ products: [product()] })
    values.general.orderNumber = 'S26TEST'
    renderConfirmation({ data: { orderNumber: 'S26TEST' }, values })
    expect(screen.queryByText('References')).toBeNull()
    expect(screen.queryByText('Instructions')).toBeNull()
    expect(screen.queryByText('Customer Required Carrier')).toBeNull()
    expect(screen.queryByText('Contact Name')).toBeNull()
    expect(screen.getByText('Shipper details')).toBeTruthy()
    expect(screen.getByText('Destination details')).toBeTruthy()
    expect(screen.getByText(/created successfully/)).toBeTruthy()
  })

  // Review minor: the mapper-level mixed-order test above can't catch a JSX
  // cell that reads d.hazmat (order-level) instead of line.hazmat — both
  // would be 'Yes'/true for a mixed order. Assert the actual rendered row:
  // only the hazardous line's cell shows the Hazmat badge, the other shows '--'.
  test('mixed order: per-line hazmat badge renders row-by-row, not the order-level flag', () => {
    const values = valuesWith({
      products: [product({ id: 'r1', hazardous: true }), product({ id: 'r2', hazardous: false })],
    })
    values.general.orderNumber = 'S26TEST'
    renderConfirmation({ data: { orderNumber: 'S26TEST' }, values })
    // Case 1 (default '' equipment) column set — see productColumns.js.
    const table = screen.getByText('Hazardous?').closest('table')
    const rows = table.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Hazmat')).toBeTruthy()
    expect(within(rows[1]).queryByText('Hazmat')).toBeNull()
    // row 1's Hazardous cell (and every other blank Case-1 cell) renders DASH
    expect(within(rows[1]).getAllByText('--').length).toBeGreaterThan(0)
  })

  // R2-7: the Planning Date/Time block must show BOTH appointment flags, not
  // just the Late Pickup date/time it already had.
  test('planning block renders Pickup and Delivery Appointment flags', () => {
    const values = valuesWith({ products: [product()] })
    values.general.orderNumber = 'S26TEST'
    values.pickupDelivery.pickupAppointment = true
    values.pickupDelivery.deliveryAppointment = false
    renderConfirmation({ data: { orderNumber: 'S26TEST' }, values })
    expect(screen.getByText('Pickup Appointment')).toBeTruthy()
    expect(screen.getByText('Delivery Appointment')).toBeTruthy()
    // TitleSubtitle renders subtitle THEN the title row — walk forward to it.
    const pickupAppt = screen.getByText('Pickup Appointment').nextElementSibling
    const deliveryAppt = screen.getByText('Delivery Appointment').nextElementSibling
    expect(pickupAppt.textContent).toBe('Yes')
    expect(deliveryAppt.textContent).toBe('No')
  })

  test('long order: populated blocks render', () => {
    const values = valuesWith({ products: [product()] })
    values.general.orderNumber = 'S26TEST'
    values.general.carrierScac = 'ABC 123'
    values.general.references = [{ type: 'PO Number', value: '41197', guided: true }]
    values.general.instructions = [{ description: 'Deliver to dock 12B only.' }]
    values.pickupDelivery.consignor.contactName = 'Nick Strauss'
    renderConfirmation({ data: { orderNumber: 'S26TEST' }, values })
    expect(screen.getByText('References')).toBeTruthy()
    expect(screen.getByText('Instructions')).toBeTruthy()
    expect(screen.getByText('Customer Required Carrier')).toBeTruthy()
    expect(screen.getAllByText('Contact Name').length).toBe(1)
  })

  test('async: blank user order number → pending alert, then flips to success', () => {
    vi.useFakeTimers()
    try {
      const values = valuesWith({ products: [product()] }) // orderNumber stays ''
      renderConfirmation({ data: { orderNumber: 'S260004NGW' }, values })
      expect(screen.getByText(/being processed/)).toBeTruthy()
      expect(screen.queryByText('S260004NGW')).toBeNull()
      act(() => vi.advanceTimersByTime(8000))
      expect(screen.getByText(/created successfully/)).toBeTruthy()
      expect(screen.getByText('S260004NGW')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })
})
