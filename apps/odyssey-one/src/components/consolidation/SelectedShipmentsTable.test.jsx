// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import SelectedShipmentsTable from './SelectedShipmentsTable.jsx'
import ConsolidationSummary from './ConsolidationSummary.jsx'

afterEach(cleanup)

const row = { id: '1', sellShipment: '1', odysseyShipmentIdentifier: 'O1', customerId: 'V', shipmentStatus: '', orderCount: '5', orders: ['A', 'B', 'C', 'D', 'E'], pickupDate: '06/04/2026' }

it('a 5-order row paints gray order chips only - no purple (the list renderer cycles purple)', () => {
  render(<SelectedShipmentsTable rows={[row]} />)
  for (const o of row.orders) expect(screen.getByText(o).style.background).toContain('badge-gray')
  expect(document.body.innerHTML).not.toMatch(/purple/)
})

it('the summary falls back to the customer id when there is no name', () => {
  render(<ConsolidationSummary customerName="" customerId="VALTRIS_01" rows={[row]} />)
  expect(screen.getByText('VALTRIS_01')).toBeTruthy()
})

it('is collapsible and open by default', async () => {
  const { fireEvent } = await import('@testing-library/react')
  render(<SelectedShipmentsTable rows={[row]} />)
  const header = screen.getByRole('button', { name: /Selected shipments to consolidate/ })
  expect(header.getAttribute('aria-expanded')).toBe('true')
  expect(screen.getByText('1 items')).toBeTruthy()
  fireEvent.click(header)
  expect(header.getAttribute('aria-expanded')).toBe('false')
})
