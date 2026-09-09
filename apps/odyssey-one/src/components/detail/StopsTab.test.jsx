// @vitest-environment jsdom
// jest-dom is not installed in this repo (only @testing-library/react + dom)
// — plain assertions (.disabled) instead of toBeDisabled(), matching
// ManualDatesModal.test.jsx / DroppedCarrierSection.test.jsx.
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StopsTab from './StopsTab'
afterEach(cleanup)

const summary = { distance: '364.14 mi', grossWeight: '54,907 LB', volume: '226 cuft', acceptedCarrier: 'SEFL - LTL', seedEquipment: 'LTH', utilization: '--' }
const stops = [
  { type: 'pickup', stopNumber: 1, order: 'A, B', orderIds: ['A', 'B'], location: 'COLUMBUS PL, Kansas City', address: '831 8th Street', date: 'June 4, 2026 03:00 PDT', appointment: '3:00 PDT', weight: '32,333 LB', volume: '300 cuft', packageCount: '180', pickupNo: 'PU-1' },
  { type: 'delivery', stopNumber: 2, order: 'A, B', orderIds: ['A', 'B'], location: 'X', address: 'Y', date: 'June 6, 2026 03:00 PDT', appointment: '3:00 PDT', weight: '32,333 LB', volume: '300 cuft', packageCount: '180', pickupNo: '' },
]
const consolidation = {
  locationChange: false, changedOrderIds: ['B'],
  stopChanges: { '1': { changedOrderIds: ['B'], fields: { date: { prior: 'June 4, 2026 03:00 PDT', new: 'June 5, 2026 03:00 PDT' }, weight: { prior: '32,333 LB', new: '34,000 LB' } } } },
  orderComparisons: { B: [{ field: 'Gross Weight', source: 'Order', prior: '1 LB', new: '2 LB', changed: true }] },
  summaryChanges: { grossWeight: { prior: '54,907 LB', new: '70,907 LB' } },
  costs: { prior: '1,500.00 USD', newDirect: '2,000.00 USD', newConsolidated: '3,000.00 USD' },
}
const oc = { scenario: 'returned', prior: {}, newOption: {}, priorTenderList: [], newTenderList: [], comparison: [], hazmat: [], droppedCarriers: { prior: [], new: [] }, resolution: null, consolidation }
const renderReview = (extra = {}) => render(<StopsTab data={{ summary, stops }} orderChange={oc} orderDetails={[]} shipment={{ sellShipment: '1', buyShipment: 'B1', tenderStatus: 'Sent' }} {...extra} />)

describe('StopsTab — plain mode', () => {
  it('renders as before without a consolidation payload', () => {
    render(<StopsTab data={{ summary, stops }} orderChange={null} />)
    expect(screen.queryByText('Approve Plan')).toBeNull()
    expect(screen.queryByText('Affected Orders')).toBeNull()
    expect(screen.getByText('COLUMBUS PL, Kansas City')).toBeTruthy()
  })
  it('stays plain once the review is resolved', () => {
    renderReview({ orderChange: { ...oc, resolution: { action: 'approve-plan' } } })
    expect(screen.queryByText('Approve Plan')).toBeNull()
  })
})

describe('StopsTab — consolidated order-change review (LINX-15435/15436)', () => {
  it('shows Prior/New pairs only for changed summary cells and no Margin', () => {
    renderReview()
    const strip = screen.getByLabelText('Shipment KPIs')
    expect(within(strip).getByText('70,907 LB')).toBeTruthy()
    expect(within(strip).getAllByText('Prior')).toHaveLength(1)
    expect(within(strip).getAllByText('New')).toHaveLength(1)
    expect(within(strip).getByText('364.14 mi')).toBeTruthy()
    expect(within(strip).queryByText('Margin')).toBeNull()
  })
  it('renders the four actions and three costs with AC wording', () => {
    renderReview()
    expect(screen.getByRole('button', { name: 'Edit Shipment Stops' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Approve Plan' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'View Planning Dates' }).disabled).toBe(false)
    expect(screen.getByRole('button', { name: 'View Routing' }).disabled).toBe(false)
    expect(screen.getByText('New Consolidated Cost')).toBeTruthy()
    expect(screen.getByText('3,000.00 USD')).toBeTruthy()
  })
  it('badges changed stop fields and changed orders; unchanged stay plain', () => {
    renderReview()
    const newDate = screen.getByText('June 5, 2026 03:00 PDT')
    expect(newDate.closest('.text-badge')).toBeTruthy()
    expect(screen.getByText('34,000 LB').closest('.text-badge')).toBeTruthy()
    expect(screen.getByText('June 6, 2026 03:00 PDT').closest('.text-badge')).toBeNull()
    const stop1 = screen.getByText('Stop 1').closest('.odyssey-timeline__row')
    const orderCell = within(stop1).getByText('Order').parentElement
    expect(within(orderCell).getByText('B').closest('.text-badge')).toBeTruthy()
    expect(within(orderCell).getByText('A').closest('.text-badge')).toBeNull()
  })
  it('lists affected orders per stop and opens the compare modal', () => {
    renderReview()
    const stop1 = screen.getByText('Stop 1').closest('.odyssey-timeline__row')
    expect(within(stop1).getByText('Affected Orders')).toBeTruthy()
    const link = within(stop1).getByRole('button', { name: /B/ })
    fireEvent.click(link)
    // OrderCompareModal is a stub in this task; assert the click reached state via a data-attr the tab sets
    expect(document.querySelector('[data-open-modal="order:B"]')).toBeTruthy()
  })
  it('disables View Routing while a location change is unfinalized (LINX-15438)', () => {
    renderReview({ orderChange: { ...oc, consolidation: { ...consolidation, locationChange: true } } })
    expect(screen.getByRole('button', { name: 'View Routing' }).disabled).toBe(true)
  })
})
