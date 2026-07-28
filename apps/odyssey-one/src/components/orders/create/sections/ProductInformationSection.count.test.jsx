// @vitest-environment jsdom
// Regression guard for the "N products added" counter (bug 2026-07-28:
// stuck at 0). User ruling: the counter tracks ROWS — it bumps the moment
// Add Product creates a line, before any cell is filled or committed.
import { describe, test, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { FormProvider, useForm } from 'react-hook-form'
import { makeDefaultOrderFormValues } from '../../../../api/types/orderFormVm'
import ProductInformationSection from './ProductInformationSection.jsx'

function Harness() {
  const methods = useForm({ mode: 'onTouched', defaultValues: makeDefaultOrderFormValues() })
  return (
    <FormProvider {...methods}>
      <ProductInformationSection />
    </FormProvider>
  )
}

afterEach(cleanup)

const counter = () => screen.getByText(/products added/).textContent

describe('product count', () => {
  test('Add Product bumps the counter immediately, per row', () => {
    render(<Harness />)
    expect(counter()).toBe('0 products added')
    fireEvent.click(screen.getByText('Add Product'))
    expect(counter()).toBe('1 products added')
    fireEvent.click(screen.getByText('Add Product'))
    expect(counter()).toBe('2 products added')
  })

  test('deleting a row decrements the counter', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('Add Product'))
    fireEvent.click(screen.getByText('Add Product'))
    expect(counter()).toBe('2 products added')
    // Plain trash icon on the first row (inbox mock 2026-07-28)
    fireEvent.click(screen.getAllByLabelText('Delete row')[0])
    expect(counter()).toBe('1 products added')
  })
})
