// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import PlanningDatesModal from './PlanningDatesModal'

afterEach(cleanup)

const orders = [
  { orderNumber: '000000004850', planningType: 'SSD', earliestPickup: '05/23/2026', latestPickup: '05/24/2026', earliestDelivery: '05/25/2026', latestDelivery: '05/26/2026' },
  { orderNumber: '000000004852', planningType: 'RDD', earliestPickup: '05/23/2026', latestPickup: '05/24/2026', earliestDelivery: '05/25/2026', latestDelivery: '05/26/2026' },
]

it('lists one row per order with the AC columns and closes on Go Back (LINX-15435)', () => {
  const onClose = vi.fn()
  render(<PlanningDatesModal orders={orders} onClose={onClose} />)
  expect(screen.getByRole('dialog', { name: 'Planning Dates' })).toBeTruthy()
  for (const h of ['Order', 'Planning Type', 'Earliest Ship', 'Latest Ship', 'Earliest Delivery', 'Latest Delivery']) expect(screen.getByText(h)).toBeTruthy()
  expect(screen.getAllByText('000000004852')).toHaveLength(1)
  expect(screen.getByText('RDD')).toBeTruthy()
  fireEvent.click(screen.getByText('Go Back'))
  expect(onClose).toHaveBeenCalled()
})

it('renders an empty table without crashing when there are no orders', () => {
  render(<PlanningDatesModal orders={[]} onClose={() => {}} />)
  expect(screen.getByText('Planning Type')).toBeTruthy()
})
