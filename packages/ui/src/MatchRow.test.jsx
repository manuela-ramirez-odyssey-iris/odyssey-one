// @vitest-environment jsdom
// S131 — the meta line's LABELS became data. The row is the shared search
// result for every domain, and the labels aren't shared: Orders has no carrier
// and no BOL, so the baked Shipments labels printed two empty cells there.
import { describe, expect, it, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import MatchRow from './MatchRow.jsx'

afterEach(cleanup)

const dividers = () => document.querySelectorAll('.match-row__meta-cell--divider').length
const cells = () => document.querySelectorAll('.match-row__meta-cell').length

describe('MatchRow meta line', () => {
  it('builds the Shipments set from the individual props (unchanged default)', () => {
    render(<MatchRow matchId="M-1" customer="Delaware Inc." carrier="XPO" bol="BOL-1" />)
    expect(screen.getByText('Customer:')).toBeTruthy()
    expect(screen.getByText('Carrier:')).toBeTruthy()
    expect(screen.getByText('BOL:')).toBeTruthy()
    // Dividers on all but the last cell — the rule the hardcoded classes spelled out.
    expect(cells()).toBe(3)
    expect(dividers()).toBe(2)
  })

  it('adds the Shipment # cell and moves the trailing divider', () => {
    render(<MatchRow matchId="M-1" customer="Delaware Inc." carrier="XPO" bol="BOL-1" shipmentId="SHP-1" />)
    expect(screen.getByText('Shipment #:')).toBeTruthy()
    expect(cells()).toBe(4)
    expect(dividers()).toBe(3)
  })

  it('renders a domain\'s own cells when `meta` is passed', () => {
    render(<MatchRow matchId="Order Number 091000" meta={[
      { label: 'Customer', value: 'WEYERH_01' },
      { label: 'PO #', value: '1BD9TCAJ5' },
      { label: 'Equipment', value: 'LTR' },
    ]} />)
    expect(screen.getByText('PO #:')).toBeTruthy()
    expect(screen.getByText('1BD9TCAJ5')).toBeTruthy()
    // The Shipments labels are gone — that is the whole point.
    expect(screen.queryByText('Carrier:')).toBeNull()
    expect(screen.queryByText('BOL:')).toBeNull()
  })
})
