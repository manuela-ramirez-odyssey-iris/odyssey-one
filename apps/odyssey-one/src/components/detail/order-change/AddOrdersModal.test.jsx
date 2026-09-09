// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import AddOrdersModal from './AddOrdersModal'

const rows = ['100', '200', '300', '400', '500', '600', '700'].map((b, i) => ({
  orderNumber: `O${i + 1}`, sourceSellShipment: `S${i + 1}`, customer: 'Erco', origin: i === 2 ? 'Boston, MA US' : 'Atlanta, GA US',
  destination: 'Minneapolis, MN US', weight: '500 lbs', volume: '40 cbf', buyShipment: b, shipmentStatus: 'Review',
  tenderStatus: i === 6 ? 'Accepted' : 'Cancelled', shipmentType: 'Direct', ordersInShipment: [`O${i + 1}`], shipDate: '2026-06-04', deliveryDate: '2026-06-06',
  blocked: i === 6,
}))
vi.mock('../../../api/queries/useCandidateOrders', () => ({ useCandidateOrders: () => ({ data: rows, isPending: false, isError: false }) }))

afterEach(cleanup)
const setup = () => {
  const onAdd = vi.fn(); const onClose = vi.fn()
  render(<AddOrdersModal sellShipment="9" customerId="ERCO" customerName="Erco" excludeOrderIds={[]} onAdd={onAdd} onClose={onClose} />)
  return { onAdd, onClose }
}

it('renders the title, the 11 columns and Results (n); Add Order(s) disabled until a pick', () => {
  setup()
  expect(screen.getByText('Add New Order(s)')).toBeTruthy()
  expect(screen.getByText('Results (7)')).toBeTruthy()
  for (const h of ['Customer', 'Origin', 'Destination', 'Order Number', 'Order Weight', 'Order Volume', 'Buy Shipment', 'Shipment Status', 'Tender Status', 'Shipment Type', 'Orders in the Shipment']) expect(screen.getByText(h)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Add Order(s)' }).disabled).toBe(true)
})

it('search narrows the grid; Clear All restores it', () => {
  setup()
  fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'bost' } })
  expect(screen.getByText('Results (1)')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Clear All' }))
  expect(screen.getByText('Results (7)')).toBeTruthy()
})

it('selection survives a later search that hides the picked row', () => {
  const { onAdd } = setup()
  fireEvent.click(screen.getAllByRole('checkbox')[1])   // pick O1
  fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'bost' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add Order(s)' }))
  expect(onAdd.mock.calls[0][0].map((r) => r.orderNumber)).toEqual(['O1'])
})

it('caps selection at five with an inline message; Add Order(s) returns the picked rows', () => {
  const { onAdd } = setup()
  const boxes = screen.getAllByRole('checkbox').slice(1)   // [0] = header select-all
  boxes.slice(0, 6).forEach((b) => fireEvent.click(b))
  expect(screen.getAllByRole('checkbox').slice(1).filter((b) => b.checked).length).toBe(5)
  expect(screen.getByText('You can select up to five orders at a time.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Add Order(s)' }))
  expect(onAdd.mock.calls[0][0].map((r) => r.orderNumber)).toEqual(['O1', 'O2', 'O3', 'O4', 'O5'])
})

it('a blocked row is not selectable and explains why on hover', () => {
  setup()
  const boxes = screen.getAllByRole('checkbox').slice(1)
  expect(boxes[6].disabled).toBe(true)
  const o7 = screen.getAllByText('O7').find((el) => el.closest('[data-tooltip-trigger]'))
  fireEvent.mouseEnter(o7.closest('[data-tooltip-trigger]'))
  expect(screen.getByRole('tooltip').textContent).toContain('cannot be moved')
  // jsdom ceiling: opacity is a computed-style effect jsdom won't assert on —
  // this checks the class that carries it lands on the blocked row's cells
  // (buyShipment '700', unique to the blocked row) and not on a sibling row's.
  expect(screen.getByText('700').classList.contains('add-orders__blocked')).toBe(true)
  expect(screen.getByText('600').classList.contains('add-orders__blocked')).toBe(false)
})

it('Filter opens the inner Filters modal (back arrow); Apply filters the grid; Clear resets', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: 'Filter' }))
  expect(screen.getByText('Filters')).toBeTruthy()
  expect(screen.getByDisplayValue('Erco').disabled).toBe(true)                      // Customer locked
  fireEvent.change(screen.getByLabelText('Origin'), { target: { value: 'MA' } })
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
  expect(screen.queryByText('Filters')).toBeNull()
  expect(screen.getByText('Results (1)')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Filter' }))
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
  expect(screen.getByText('Results (7)')).toBeTruthy()
})
