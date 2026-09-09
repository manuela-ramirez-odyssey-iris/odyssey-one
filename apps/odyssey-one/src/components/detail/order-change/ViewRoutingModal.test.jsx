// @vitest-environment jsdom
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
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
const tableFor = (title) => screen.getByText(title).closest('.odyssey-group-table')

it('renders New above Prior above Dropped Carriers with the 8 tender columns (LINX-15438)', () => {
  render(<ViewRoutingModal orderChange={oc} onClose={() => {}} />)
  expect(screen.getByRole('dialog', { name: 'View Routing' })).toBeTruthy()
  const [n, p, d] = ['New', 'Prior', 'Dropped Carriers'].map((t) => screen.getByText(t))
  expect(orderOf(n, p) && orderOf(p, d)).toBe(true)
  for (const table of [tableFor('New'), tableFor('Prior')]) {
    for (const h of ['Route Rank', 'Rank', 'SCAC', 'Equipment', 'AP Cost', 'Tender Status', 'Pickup Date/Time', 'Delivery Date/Time']) {
      expect(within(table).getAllByText(h).length).toBe(1)
    }
  }
  // SCAC is a column on all three tables (two tender + Dropped Carriers).
  expect(screen.getAllByText('SCAC').length).toBe(3)
  expect(screen.getByText('JBHT')).toBeTruthy()
  expect(screen.getByText('Missing Transit Time')).toBeTruthy()
})

it('badges an AP cost that differs between New and Prior on BOTH sides; unchanged stays plain; statuses badge', () => {
  render(<ViewRoutingModal orderChange={oc} onClose={() => {}} />)
  // New DDFL: $1,500.00 vs Prior DDFL: $1,445,543.00 — differ, both badge.
  expect(screen.getByText('$1,500.00').closest('.text-badge')).toBeTruthy()
  expect(screen.getByText('$1,445,543.00').closest('.text-badge')).toBeTruthy()
  // ODFL: $900.00 on both sides — unchanged, plain on both.
  const nines = screen.getAllByText('$900.00')
  expect(nines).toHaveLength(2)
  for (const el of nines) expect(el.closest('.text-badge')).toBeNull()
  expect(screen.getByText('Sent').closest('.text-badge')).toBeTruthy()
})

it('renders a SCAC present in New but absent from Prior as plain (no match to diff against)', () => {
  const solo = {
    ...oc,
    newTenderList: [...oc.newTenderList, opt({ scac: 'XPOL', cost: '$2,000.00' })],
  }
  render(<ViewRoutingModal orderChange={solo} onClose={() => {}} />)
  expect(screen.getByText('$2,000.00').closest('.text-badge')).toBeNull()
})

it('shows an empty Dropped Carriers table when nothing was dropped', () => {
  render(<ViewRoutingModal orderChange={{ ...oc, droppedCarriers: { prior: [], new: [] } }} onClose={() => {}} />)
  expect(screen.getByText('Dropped Carriers')).toBeTruthy()
})

it('Go Back calls onClose', () => {
  const onClose = vi.fn()
  render(<ViewRoutingModal orderChange={oc} onClose={onClose} />)
  fireEvent.click(screen.getByText('Go Back'))
  expect(onClose).toHaveBeenCalled()
})
