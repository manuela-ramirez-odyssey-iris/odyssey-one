// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

vi.mock('../../api/config', () => ({ getApiMode: () => 'mock' }))
vi.mock('../../data/orders', () => ({
  getAllOrders: () => [
    { orderNumber: 'AAA1', customer: 'BASF_CHM_01', createdBy: 'amy.cook' },
    { orderNumber: 'AAA2', customer: 'ERCO_SYS_01', createdBy: 'zoe.admin' },
  ],
}))

import OrdersFiltersView from './OrdersFiltersView'

afterEach(cleanup)

const setup = (tab, props = {}) =>
  render(<OrdersFiltersView tab={tab} filters={undefined} onApply={vi.fn()} onClose={vi.fn()} {...props} />)

// Field labels are rendered by FieldLabel; ask for them as text so this doesn't
// depend on how each control wires its own label/aria.
const labels = () =>
  [...document.querySelectorAll('.orders-filters__label')].map(el => el.textContent)

// ORD-23 — one field set on every tab (user ruling, 2026-09-04: "merge
// all filters into one so results are then applied to tabs").
describe('one field set on every tab', () => {
  const FULL_SET = [
    'Order Number', 'Order Status', 'Customer',
    'Origin City, State, Country', 'Destination City, State, Country',
    'Latest Pickup Date', 'Latest Delivery Date', 'Created Date', 'Last Edit Date',
    'Created By', 'Last Edited By', 'Draft Order Status', 'Errors Count',
  ]

  it('All, Draft and Validation Errors all render the SAME full set', () => {
    setup('created')
    expect(labels()).toEqual(FULL_SET)
    cleanup()
    setup('draft')
    expect(labels()).toEqual(FULL_SET)
    cleanup()
    setup('validation-errors')
    expect(labels()).toEqual(FULL_SET)
  })

  it('renders both status enums, distinctly labelled and each with its own vocabulary', () => {
    setup('created')
    // Order Status: the 7 lifecycle values.
    expect(screen.getByRole('button', { name: 'Planned Shipment' })).toBeTruthy()
    // Draft Order Status: the 3 OIF values, not the lifecycle ones.
    for (const v of ['Ready', 'Complete', 'Purge']) {
      expect(screen.getByRole('button', { name: v })).toBeTruthy()
    }
  })
})

describe('footer actions (LINX-10285)', () => {
  it('applies the edited draft, not the live filters', () => {
    const onApply = vi.fn()
    setup('created', { onApply })
    // Draft is not a Created-tab Order Status option (D3 — it has its own
    // tab); 'Cancelled' is one of the seven non-Draft labels.
    fireEvent.click(screen.getByRole('button', { name: 'Cancelled' }))
    // Editing alone must not call onApply — the grid refetches on Apply only.
    expect(onApply).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Show all results' }))
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply.mock.calls[0][0].orderStatus).toEqual(['Cancelled'])
  })

  it('Clear all empties the draft without applying', () => {
    const onApply = vi.fn()
    setup('created', { filters: { orderStatus: ['Cancelled'] }, onApply })
    expect(screen.getByRole('button', { name: 'Cancelled' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(screen.getByRole('button', { name: 'Cancelled' }).getAttribute('aria-pressed')).toBe('false')
    expect(onApply).not.toHaveBeenCalled()
  })

  it('seeds the draft from the applied filters on open', () => {
    setup('validation-errors', { filters: { draftOrderStatus: ['Purge'] } })
    expect(screen.getByRole('button', { name: 'Purge' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Ready' }).getAttribute('aria-pressed')).toBe('false')
  })
})

describe('control types (user ruling, 2026-08-20)', () => {
  it('Order Number is a plain text input, not a picker', () => {
    setup('created')
    const input = screen.getByPlaceholderText('Enter Order Number')
    expect(input.tagName).toBe('INPUT')
    expect(input.readOnly).toBe(false)
    // No combobox affordance on this field.
    expect(input.getAttribute('role')).toBeNull()
  })

  it('typing an Order Number lands in the applied draft as a string', () => {
    const onApply = vi.fn()
    setup('created', { onApply })
    fireEvent.change(screen.getByPlaceholderText('Enter Order Number'), { target: { value: 'AAA1, BBB2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Show all results' }))
    expect(onApply.mock.calls[0][0].orderNumber).toBe('AAA1, BBB2')
  })

  it('Customer is a lazy picker fed by the paged loader', () => {
    setup('created')
    // The select face renders; options arrive asynchronously via loadOptions,
    // which jsdom cannot scroll — the loader itself is covered in registry.test.js.
    expect(screen.getByPlaceholderText('Select Customer')).toBeTruthy()
  })
})

describe('error count comparator (LINX-11659)', () => {
  it('rejects decimals and zero inline', () => {
    setup('validation-errors')
    const input = screen.getByPlaceholderText('Enter Errors Count')
    // FormField format="integer" strips the dot at the source, so "1.5" can
    // only ever land as "15" — the remaining invalid case is 0.
    fireEvent.change(input, { target: { value: '1.5' } })
    expect(input.value).toBe('15')
    fireEvent.change(input, { target: { value: '0' } })
    expect(screen.getByText('Whole number, 1 or greater')).toBeTruthy()
  })

  it('accepts a valid count', () => {
    setup('validation-errors')
    fireEvent.change(screen.getByPlaceholderText('Enter Errors Count'), { target: { value: '10' } })
    expect(screen.queryByText('Whole number, 1 or greater')).toBeNull()
  })
})

// S130 alignment ruling — Orders' picker fields hold ONE value and show it in
// the field, exactly like Shipments'. They used to append every pick as a chip
// rendered UNDER the input ("why are we showing below fields when a value is
// selected"), which nothing in Shipments does.
describe('single-value pickers (S130 — aligned with Shipments)', () => {
  it('a committed value renders IN the field, with nothing below it', () => {
    setup('created', { filters: { customer: ['BASF_CHM_01'] } })
    expect(screen.getByPlaceholderText('Select Customer').value).toBe('BASF_CHM_01')
    // The removable value-chips are gone; the only chips left are the Order
    // Status enum toggles, which have no remove button.
    expect(document.querySelector('.orders-filters__chip-x')).toBeNull()
    expect(screen.queryByRole('listitem')).toBeNull()
  })

  it('a location shows its display label, not the stored pipe-joined value', () => {
    setup('created', { filters: { origin: ['Chicago|IL|US'] } })
    expect(screen.getByPlaceholderText('Select Origin City, State, Country').value)
      .toBe('Chicago, IL, US')
  })

  it('Clear all empties a committed picker', () => {
    setup('created', { filters: { customer: ['BASF_CHM_01'] } })
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(screen.getByPlaceholderText('Select Customer').value).toBe('')
  })

  it('applies the value as a one-entry array — the wire format is unchanged', () => {
    const onApply = vi.fn()
    setup('created', { filters: { customer: ['BASF_CHM_01'] }, onApply })
    fireEvent.click(screen.getByRole('button', { name: 'Show all results' }))
    expect(onApply.mock.calls[0][0].customer).toEqual(['BASF_CHM_01'])
  })
})
