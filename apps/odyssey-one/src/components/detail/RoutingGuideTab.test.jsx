// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import RoutingGuideTab from './RoutingGuideTab'

afterEach(cleanup)

const baseOption = {
  rank: 1,
  routeRank: 1,
  scac: 'ODFL',
  carrierName: 'Old Dominion Freight Line',
  equipment: 'Van',
  cost: '$2,790.00 USD',
  status: 'Sent',
}

describe('RoutingGuideTab — SPOT RATE badge', () => {
  it('renders a SPOT RATE badge beside the carrier when spotRate is true', () => {
    const data = { options: [{ ...baseOption, routeGroup: 'Spot', spotRate: true }] }
    render(<RoutingGuideTab data={data} />)
    expect(screen.getByText('Old Dominion Freight Line')).toBeTruthy()
    expect(screen.getByText('SPOT RATE')).toBeTruthy()
  })

  it('does not render the badge for a non-Spot route group', () => {
    const data = { options: [{ ...baseOption, routeGroup: 'Network' }] }
    render(<RoutingGuideTab data={data} />)
    expect(screen.getByText('Old Dominion Freight Line')).toBeTruthy()
    expect(screen.queryByText('SPOT RATE')).toBeNull()
  })

  it('does not render the badge for a manually-keyed quote (routeGroup Spot, no spotRate marker)', () => {
    const data = { options: [{ ...baseOption, routeGroup: 'Spot', rateSource: 'Manual' }] }
    render(<RoutingGuideTab data={data} />)
    expect(screen.getByText('Old Dominion Freight Line')).toBeTruthy()
    expect(screen.queryByText('SPOT RATE')).toBeNull()
  })
})
