// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import OrderCompareModal from './OrderCompareModal'
afterEach(cleanup)
const rows = [
  { field: 'Incoterm', source: 'Order', prior: 'FOB', new: 'FOB', changed: false },
  { field: 'Gross Weight', source: 'Order', prior: '100 LB', new: '120 LB', changed: true },
]
it('titles the dialog, names the order, and lists changed rows before unchanged (LINX-15437 → 14512)', () => {
  render(<OrderCompareModal orderId="000000004852" rows={rows} onClose={() => {}} />)
  expect(screen.getByRole('dialog', { name: 'Order Changes' })).toBeTruthy()
  expect(screen.getByText('Order Number: 000000004852')).toBeTruthy()
  const gw = screen.getByText('Gross Weight'), inc = screen.getByText('Incoterm')
  expect(!!(gw.compareDocumentPosition(inc) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  expect(screen.getByText('120 LB').closest('.text-badge')).toBeTruthy()
  expect(screen.getAllByText('FOB')[0].closest('.text-badge')).toBeNull()
  expect(screen.queryByText('Preview Tender Details')).toBeNull()
})
it('Go Back closes; empty rows render both bands without crashing', () => {
  const onClose = vi.fn()
  render(<OrderCompareModal orderId="1" rows={[]} onClose={onClose} />)
  expect(screen.getAllByText('(No Differences)')).toHaveLength(2)
  fireEvent.click(screen.getByText('Go Back'))
  expect(onClose).toHaveBeenCalled()
})
