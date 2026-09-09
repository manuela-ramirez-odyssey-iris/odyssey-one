// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import ViewRoutingModal from './ViewRoutingModal'

afterEach(cleanup)

const opt = (over) => ({
  routeRank: '3',
  rank: '1',
  scac: 'DDFL',
  carrierName: 'DDFL INC',
  equipment: 'LTH',
  cost: '$1,445,543.00',
  status: '',
  pickupDateTime: '05/23/2026 14:30 CDT',
  deliveryDateTime: '05/23/2026 14:30 CDT',
  ...over,
})

const oc = {
  newTenderList: [opt({ cost: '$1,500.00' }), opt({ scac: 'ODFL', cost: '$900.00' })],
  priorTenderList: [opt({ status: 'Sent' }), opt({ scac: 'ODFL', cost: '$900.00', status: 'Cancelled' })],
  droppedCarriers: { prior: [], new: [{ scac: 'JBHT', carrierName: 'J.B. HUNT', reason: 'Missing Transit Time' }] },
}

const orderOf = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

it('renders New above Prior above Dropped Carriers with the 8 tender columns (LINX-15438)', () => {
  render(<ViewRoutingModal orderChange={oc} onClose={() => {}} />)
  expect(screen.getByRole('dialog', { name: 'View Routing' })).toBeTruthy()
  const [n, p, d] = ['New', 'Prior', 'Dropped Carriers'].map((t) => screen.getByText(t))
  expect(orderOf(n, p) && orderOf(p, d)).toBe(true)
  for (const h of ['Route Rank', 'Rank', 'SCAC', 'Equipment', 'AP Cost', 'Tender Status', 'Pickup Date/Time', 'Delivery Date/Time']) {
    expect(screen.getAllByText(h).length).toBe(2)
  }
  expect(screen.getByText('JBHT')).toBeTruthy()
  expect(screen.getByText('Missing Transit Time')).toBeTruthy()
})

it('badges an AP cost that changed for the same carrier; unchanged stays plain; statuses badge', () => {
  render(<ViewRoutingModal orderChange={oc} onClose={() => {}} />)
  expect(screen.getByText('$1,500.00').closest('.text-badge')).toBeTruthy()
  expect(screen.getAllByText('$900.00')[0].closest('.text-badge')).toBeNull()
  expect(screen.getByText('Sent').closest('.text-badge')).toBeTruthy()
})

it('shows an empty Dropped Carriers table when nothing was dropped', () => {
  render(<ViewRoutingModal orderChange={{ ...oc, droppedCarriers: { prior: [], new: [] } }} onClose={() => {}} />)
  expect(screen.getByText('Dropped Carriers')).toBeTruthy()
})
