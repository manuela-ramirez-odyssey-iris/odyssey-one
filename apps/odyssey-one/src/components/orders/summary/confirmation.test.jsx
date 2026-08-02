// @vitest-environment jsdom
// S98 confirmation-page conformance (Figma 4139:11389 / 4465:12225 /
// 4758:6943 / 4758:8241 + LINX-9002): data-driven quick/long hiding, the new
// product rollups, and the Scenario-2 async flip (number populates, alert
// flips to success, navbar bell notified).
import { describe, test, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
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
