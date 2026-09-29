// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import AddOrdersModal from './AddOrdersModal'
import { useCandidateOrders } from '../../../api/queries/useCandidateOrders'

// OC-open-11's 2026-09-09 grey-at-add ruling was REVERSED 2026-09-25 per
// LINX-15870/15872 + Jana — rows carry no blocked/blockReason and are all
// normal, selectable candidates; the block happens only at Save.
const rows = ['100', '200', '300', '400', '500', '600', '700'].map((b, i) => ({
  orderNumber: `O${i + 1}`, sourceSellShipment: `S${i + 1}`, customer: 'Erco', origin: i === 2 ? 'Boston, MA US' : 'Atlanta, GA US',
  destination: 'Minneapolis, MN US', weight: '500 lbs', volume: '40 cbf', buyShipment: b, shipmentStatus: 'Review',
  tenderStatus: i === 6 ? 'Accepted' : 'Cancelled', shipmentType: 'Direct', ordersInShipment: [`O${i + 1}`], shipDate: '2026-06-04', deliveryDate: '2026-06-06',
}))
vi.mock('../../../api/queries/useCandidateOrders', () => ({ useCandidateOrders: vi.fn() }))

afterEach(cleanup)
beforeEach(() => useCandidateOrders.mockImplementation(() => ({ data: rows, isPending: false, isError: false })))
const setup = () => {
  const onAdd = vi.fn(); const onClose = vi.fn()
  render(<AddOrdersModal sellShipment="9" customerId="ERCO" customerName="Erco" excludeOrderIds={[]} onAdd={onAdd} onClose={onClose} />)
  return { onAdd, onClose }
}

it('renders the title, the 11 columns and Results (n); Add Order(s) disabled until a pick', () => {
  setup()
  expect(screen.getByText('Add New Order(s)')).toBeTruthy()
  expect(screen.getByText('Results (7)')).toBeTruthy()
  for (const h of ['Customer', 'Origin', 'Destination', 'Order #', 'Order Weight', 'Order Volume', 'Buy Shipment', 'Shipment Status', 'Tender Status', 'Shipment Type', 'Orders in the Shipment']) expect(screen.getByText(h)).toBeTruthy()
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

// LINX-15870/15872 (reverses OC-open-11 2026-09-09): a row whose source
// shipment would fail the Save check (status/tender-blocked) is still a
// normal, selectable row here — no grey, no disabled checkbox, no tooltip.
it('a row whose source would be refused at Save is still a normal, selectable row', () => {
  setup()
  const boxes = screen.getAllByRole('checkbox').slice(1)
  expect(boxes[6].disabled).toBe(false)   // O7 — tenderStatus 'Accepted'
  fireEvent.click(boxes[6])
  expect(boxes[6].checked).toBe(true)
  expect(screen.queryByRole('tooltip')).toBeNull()
})

it('Filter opens the inner Filters modal (back arrow); Apply filters the grid; Clear resets', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: 'Filter' }))
  expect(screen.getByText('Filters')).toBeTruthy()
  expect(screen.getByDisplayValue('Erco (ERCO)').disabled).toBe(true)               // Customer locked, "Name (ID)" (C15)
  fireEvent.change(screen.getByLabelText('Origin'), { target: { value: 'MA' } })
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
  expect(screen.queryByText('Filters')).toBeNull()
  expect(screen.getByText('Results (1)')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Filter' }))
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
  expect(screen.getByText('Results (7)')).toBeTruthy()
})

// OC-open-23 (reversed 2026-09-25): a row that's its shipment's only order
// is also a normal, selectable row now — moving it only fails at Save if
// the client picks it there.
it('a row that is its shipment\'s only order is a normal, selectable row', () => {
  const lastOrderRow = {
    orderNumber: 'O8', sourceSellShipment: 'S8', customer: 'Erco', origin: 'Atlanta, GA US', destination: 'Minneapolis, MN US',
    weight: '500 lbs', volume: '40 cbf', buyShipment: '800', shipmentStatus: 'Review', tenderStatus: 'Cancelled',
    shipmentType: 'Direct', ordersInShipment: ['O8'], shipDate: '2026-06-04', deliveryDate: '2026-06-06',
  }
  useCandidateOrders.mockImplementation(() => ({ data: [...rows, lastOrderRow], isPending: false, isError: false }))
  setup()
  const boxes = screen.getAllByRole('checkbox').slice(1)
  expect(boxes[7].disabled).toBe(false)   // O8, appended after the 7 base rows
})
