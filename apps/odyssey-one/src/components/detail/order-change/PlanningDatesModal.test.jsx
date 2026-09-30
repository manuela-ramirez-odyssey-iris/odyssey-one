// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import PlanningDatesModal from './PlanningDatesModal'

afterEach(cleanup)

const orders = [
  { orderNumber: '000000004850', planningType: 'SSD', earliestPickup: '05/23/2026', latestPickup: '05/24/2026', earliestDelivery: '05/25/2026', latestDelivery: '05/26/2026' },
  { orderNumber: '000000004852', planningType: 'RDD', earliestPickup: '06/01/2026', latestPickup: '06/02/2026', earliestDelivery: '06/03/2026', latestDelivery: '06/04/2026' },
]

it('lists one row per order with the AC columns and closes from the header (LINX-15435)', () => {
  const onClose = vi.fn()
  render(<PlanningDatesModal orders={orders} onClose={onClose} />)
  expect(screen.getByRole('dialog', { name: 'Planning Dates' })).toBeTruthy()
  for (const h of ['Order', 'Planning Type', 'Earliest Ship', 'Latest Ship', 'Earliest Delivery', 'Latest Delivery']) expect(screen.getByText(h)).toBeTruthy()

  // Second order's row: four DISTINCT date values so a swapped earliest/latest
  // or pickup/delivery mapping fails instead of passing on a coincidence.
  const row = screen.getByText('000000004852').closest('tr') || screen.getByText('000000004852').closest('[role="row"]')
  const cells = within(row)
  expect(cells.getByText('RDD')).toBeTruthy()
  expect(cells.getByText('06/01/2026')).toBeTruthy()
  expect(cells.getByText('06/02/2026')).toBeTruthy()
  expect(cells.getByText('06/03/2026')).toBeTruthy()
  expect(cells.getByText('06/04/2026')).toBeTruthy()

  expect(screen.queryByText('Go Back')).toBeNull()                    // no footer (user 2026-09-24)
  fireEvent.click(screen.getByRole('button', { name: /close/i }))
  expect(onClose).toHaveBeenCalled()
})

it('renders an empty table without crashing when there are no orders', () => {
  render(<PlanningDatesModal orders={[]} onClose={() => {}} />)
  expect(screen.getByText('Planning Type')).toBeTruthy()
})

it('badges only the bound a stop date missed (DEC-199)', () => {
  render(<PlanningDatesModal orders={orders} violations={[{ orderId: '000000004852', type: 'pickup', side: 'late' }]} onClose={() => {}} />)
  expect(screen.getByText('06/02/2026').closest('.text-badge, [class*="badge"]')).toBeTruthy()
  expect(screen.getByText('06/01/2026').closest('.text-badge, [class*="badge"]')).toBeNull()
})

// S164 F5: a pending order sits on no stop, so plannedDates has no entry for
// it — both planned columns read `--`, not blank.
it('shows -- in Planned Pickup / Planned Delivery for a pending order with no planned dates', () => {
  const planned = { '000000004850': { pickup: 'June 4, 2026 08:00 CDT', delivery: 'June 6, 2026 08:00 CDT' } }
  render(<PlanningDatesModal orders={orders} planned={planned} onClose={() => {}} />)
  const placed = within(screen.getByText('000000004850').closest('tr') || screen.getByText('000000004850').closest('[role="row"]'))
  expect(placed.getByText('June 4, 2026 08:00 CDT')).toBeTruthy()
  const pending = within(screen.getByText('000000004852').closest('tr') || screen.getByText('000000004852').closest('[role="row"]'))
  expect(pending.getAllByText('--')).toHaveLength(2)
})
