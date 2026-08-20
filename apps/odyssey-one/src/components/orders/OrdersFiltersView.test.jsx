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

describe('per-tab field sets', () => {
  it('All renders the LINX-10285 set, both date ranges included', () => {
    setup('all')
    expect(labels()).toEqual([
      'Order Number', 'Order Status', 'Customer',
      'Origin City, State, Country', 'Destination City, State, Country',
      'Latest Pickup Date', 'Latest Delivery Date',
    ])
  })

  it('Draft renders the LINX-11663 set and no Order Status', () => {
    setup('draft')
    expect(labels()).toEqual([
      'Order Number', 'Customer', 'Created Date', 'Last Edit Date', 'Created By', 'Last Edit By',
    ])
    expect(labels()).not.toContain('Order Status')
  })

  it('Validation Errors renders the LINX-11659 set', () => {
    setup('validation-errors')
    expect(labels()).toEqual(['Order Number', 'Customer', 'Order Status', 'Error Count'])
    // The three OIF statuses, not the 7 lifecycle ones.
    for (const v of ['Ready', 'Complete', 'Purge']) {
      expect(screen.getByRole('button', { name: v })).toBeTruthy()
    }
    expect(screen.queryByRole('button', { name: 'Shipment Planned' })).toBeNull()
  })
})

describe('footer actions (LINX-10285)', () => {
  it('applies the edited draft, not the live filters', () => {
    const onApply = vi.fn()
    setup('all', { onApply })
    fireEvent.click(screen.getByRole('button', { name: 'Draft' }))
    // Editing alone must not call onApply — the grid refetches on Apply only.
    expect(onApply).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Apply All Filters' }))
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply.mock.calls[0][0].orderStatus).toEqual(['Draft'])
  })

  it('Clear All Filters empties the draft without applying', () => {
    const onApply = vi.fn()
    setup('all', { filters: { orderStatus: ['Draft'] }, onApply })
    expect(screen.getByRole('button', { name: 'Draft' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Clear All Filters' }))
    expect(screen.getByRole('button', { name: 'Draft' }).getAttribute('aria-pressed')).toBe('false')
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
    setup('all')
    const input = screen.getByPlaceholderText('Enter Order Number')
    expect(input.tagName).toBe('INPUT')
    expect(input.readOnly).toBe(false)
    // No combobox affordance on this field.
    expect(input.getAttribute('role')).toBeNull()
  })

  it('typing an Order Number lands in the applied draft as a string', () => {
    const onApply = vi.fn()
    setup('all', { onApply })
    fireEvent.change(screen.getByPlaceholderText('Enter Order Number'), { target: { value: 'AAA1, BBB2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply All Filters' }))
    expect(onApply.mock.calls[0][0].orderNumber).toBe('AAA1, BBB2')
  })

  it('Customer is a lazy picker fed by the paged loader', () => {
    setup('all')
    // The select face renders; options arrive asynchronously via loadOptions,
    // which jsdom cannot scroll — the loader itself is covered in registry.test.js.
    expect(screen.getByPlaceholderText('Select Customer')).toBeTruthy()
  })
})

describe('error count comparator (LINX-11659)', () => {
  it('rejects decimals and zero inline', () => {
    setup('validation-errors')
    const input = screen.getByPlaceholderText('Enter Error Count')
    // FormField format="integer" strips the dot at the source, so "1.5" can
    // only ever land as "15" — the remaining invalid case is 0.
    fireEvent.change(input, { target: { value: '1.5' } })
    expect(input.value).toBe('15')
    fireEvent.change(input, { target: { value: '0' } })
    expect(screen.getByText('Whole number, 1 or greater')).toBeTruthy()
  })

  it('accepts a valid count', () => {
    setup('validation-errors')
    fireEvent.change(screen.getByPlaceholderText('Enter Error Count'), { target: { value: '10' } })
    expect(screen.queryByText('Whole number, 1 or greater')).toBeNull()
  })
})
