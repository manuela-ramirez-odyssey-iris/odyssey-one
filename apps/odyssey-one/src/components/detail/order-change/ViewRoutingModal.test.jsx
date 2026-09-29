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

it('has no footer; the header close calls onClose (user 2026-09-24)', () => {
  const onClose = vi.fn()
  render(<ViewRoutingModal orderChange={oc} onClose={onClose} />)
  expect(screen.queryByText('Go Back')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Keep Editing' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /close/i }))
  expect(onClose).toHaveBeenCalled()
})

// DEC-207 (T2) — EditStopsView's Keep Editing / Approve Changes footer.
it('renders a footer when secondaryLabel/primaryLabel are passed; secondary and primary fire their handlers', () => {
  const onSecondary = vi.fn()
  const onPrimary = vi.fn()
  render(
    <ViewRoutingModal
      orderChange={oc}
      onClose={() => {}}
      secondaryLabel="Keep Editing"
      onSecondary={onSecondary}
      primaryLabel="Approve Changes"
      onPrimary={onPrimary}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Keep Editing' }))
  expect(onSecondary).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Approve Changes' }))
  expect(onPrimary).toHaveBeenCalledTimes(1)
})

it('primaryLoading swaps the label to Approving… and disables both buttons (real disabled, not an onClick no-op)', () => {
  const onSecondary = vi.fn()
  const onPrimary = vi.fn()
  render(
    <ViewRoutingModal
      orderChange={oc}
      onClose={() => {}}
      secondaryLabel="Keep Editing"
      onSecondary={onSecondary}
      primaryLabel="Approve Changes"
      onPrimary={onPrimary}
      primaryLoading
    />,
  )
  expect(screen.queryByRole('button', { name: 'Approve Changes' })).toBeNull()
  const primary = screen.getByRole('button', { name: 'Approving…' })
  expect(primary.disabled).toBe(true)
  expect(screen.getByRole('button', { name: 'Keep Editing' }).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Keep Editing' }))
  expect(onSecondary).not.toHaveBeenCalled()
})

it('primaryDisabled disables the primary button without changing its label', () => {
  render(
    <ViewRoutingModal
      orderChange={oc}
      onClose={() => {}}
      secondaryLabel="Keep Editing"
      primaryLabel="Approve Changes"
      primaryDisabled
    />,
  )
  expect(screen.getByRole('button', { name: 'Approve Changes' }).disabled).toBe(true)
})

it('renders an error Alert above the tables when `error` is set; nothing when not', () => {
  const { rerender } = render(<ViewRoutingModal orderChange={oc} onClose={() => {}} error="Could not save. Try again." />)
  expect(screen.getByText('Could not save. Try again.')).toBeTruthy()
  rerender(<ViewRoutingModal orderChange={oc} onClose={() => {}} />)
  expect(screen.queryByText('Could not save. Try again.')).toBeNull()
})

// C4 (DEC-206) — the New list is re-routed over the stops the caller passes
// (Edit Stops' sandbox stops here: a created stop carries its zone on `site`);
// the Prior list is history and keeps its own dates.
it('dates the New list from the first pickup / last delivery stop; Prior keeps its own', () => {
  const sandboxStops = [
    { type: 'pickup', date: 'March 4, 2026 10:00 PST', site: { timeZone: 'America/Los_Angeles' } },
    { type: 'delivery', date: 'March 5, 2026 11:00 MST' },
    { type: 'delivery', date: 'March 7, 2026 12:00 EST' },
  ]
  render(<ViewRoutingModal orderChange={oc} stops={sandboxStops} onClose={() => {}} />)
  const n = tableFor('New')
  expect(within(n).getAllByText('03/04/2026 10:00 PST')).toHaveLength(2)
  expect(within(n).getAllByText('03/07/2026 12:00 EST')).toHaveLength(2)
  expect(within(tableFor('Prior')).getAllByText('05/23/2026 14:30 CDT')).toHaveLength(4)
})

it('an empty New list renders an empty New table (dropped carriers still listed)', () => {
  render(<ViewRoutingModal orderChange={{ ...oc, newTenderList: [] }} stops={[]} onClose={() => {}} />)
  expect(within(tableFor('New')).queryByText('DDFL')).toBeNull()
  expect(screen.getByText('JBHT')).toBeTruthy()
})
