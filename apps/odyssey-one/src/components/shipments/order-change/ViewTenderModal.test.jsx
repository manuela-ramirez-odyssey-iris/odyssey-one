// @vitest-environment jsdom
// S135 — "View Tender" (deck p3 button, behaviour from LINX-14509: the
// planner may VIEW tender information during the review but perform no
// tender ACTIONS). These pin the read-only half specifically, since the
// tempting implementation — reusing RoutingGuideTab — would ship exactly the
// actions the AC forbids.
import { afterEach, describe, expect, test, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import ViewTenderModal from './ViewTenderModal.jsx'

afterEach(cleanup)

const options = [
  {
    rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'Old Dominion', equipment: 'LTL',
    cost: '$1,901.56', status: 'Sent',
    pickupDateTime: '06/03/2026 16:30 CDT', deliveryDateTime: '06/04/2026 16:30 CDT',
  },
  {
    rank: 2, routeRank: '--', scac: 'SEFL', carrierName: 'Southeastern Freight', equipment: 'TL',
    cost: '$1,367.97', status: null,
    pickupDateTime: '06/05/2026 16:30 CDT', deliveryDateTime: '06/06/2026 16:30 CDT',
  },
]

describe('ViewTenderModal', () => {
  test('lists the live tender options as a read-only table', () => {
    render(<ViewTenderModal options={options} onClose={() => {}} />)
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('cell', { name: 'Old Dominion' })).toBeTruthy()
    expect(dialog.getByRole('cell', { name: 'Southeastern Freight' })).toBeTruthy()
    expect(dialog.getByRole('cell', { name: '$1,901.56' })).toBeTruthy()
    expect(dialog.getByRole('columnheader', { name: 'Tender Status' })).toBeTruthy()
  })

  test('offers NO tender actions — view only, per LINX-14509', () => {
    render(<ViewTenderModal options={options} onClose={() => {}} />)
    const dialog = within(screen.getByRole('dialog'))
    // The header X is the only button; nothing that acts on a tender. No
    // footer — it's a viewer, not a confirmation (designer, S135).
    const labels = dialog.getAllByRole('button').map((b) => b.textContent || b.getAttribute('aria-label'))
    expect(labels).toEqual(['Close'])
    // And no row is itself a toggle/expander.
    expect(dialog.queryAllByRole('button', { name: /ODFL|Old Dominion/ })).toHaveLength(0)
  })

  test('a null tender status renders as -- rather than an empty cell', () => {
    render(<ViewTenderModal options={[options[1]]} onClose={() => {}} />)
    expect(within(screen.getByRole('dialog')).getAllByRole('cell', { name: '--' }).length).toBeGreaterThan(0)
  })

  test('a shipment with no options says so instead of rendering an empty table', () => {
    const { container } = render(<ViewTenderModal options={[]} onClose={() => {}} />)
    expect(screen.getByText('This shipment has no tender options yet.')).toBeTruthy()
    expect(container.querySelectorAll('.odyssey-group-table')).toHaveLength(0)
  })

  test('the header X dismisses', () => {
    const onClose = vi.fn()
    render(<ViewTenderModal options={options} onClose={onClose} />)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
