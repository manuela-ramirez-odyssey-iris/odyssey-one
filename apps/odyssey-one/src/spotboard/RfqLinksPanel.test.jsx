// @vitest-environment jsdom
import { afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import RfqLinksPanel from './RfqLinksPanel.jsx'

afterEach(cleanup)

const carriers = [
  { scac: 'ABCD', name: 'Acme Freight', token: 'tok-abcd', incl: true },
  { scac: 'WXYZ', name: 'Zenith Lines', token: 'tok-wxyz', incl: true },
  { scac: 'NOPE', name: 'Excluded Co', token: 'tok-nope', incl: false },
]

describe('RfqLinksPanel', () => {
  it('renders nothing when no carriers are included', () => {
    const { container } = render(<RfqLinksPanel carriers={[{ scac: 'X', incl: false }]} />)
    expect(container.firstChild).toBeNull()
  })

  // Plain alert now (user, 2026-08-24) — the per-carrier links moved onto the
  // Live Bids rows, so there is no list and no expand affordance left here.
  it('is a plain alert: counts the INCLUDED carriers, with no expandable list', () => {
    render(<RfqLinksPanel carriers={carriers} />)
    expect(screen.getByText(/RFQ sent to 2 carriers/)).toBeTruthy()
    expect(screen.queryByLabelText('Expand list')).toBeNull()
    expect(screen.queryByText('/spot-bid/tok-abcd')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('singularises the count for one included carrier', () => {
    render(<RfqLinksPanel carriers={[carriers[0], carriers[2]]} />)
    expect(screen.getByText(/RFQ sent to 1 carrier —/)).toBeTruthy()
  })

  // Stock Alert anatomy now (user, 2026-08-24) — including its default X.
  it('carries the Alert default dismiss X, and dismissing removes the banner', () => {
    const { container } = render(<RfqLinksPanel carriers={carriers} />)
    const close = screen.getByLabelText('Dismiss')
    expect(close).toBeTruthy()
    fireEvent.click(close)
    expect(container.firstChild).toBeNull()
  })

  it('applies no class of its own — it is an unmodified Alert', () => {
    const { container } = render(<RfqLinksPanel carriers={carriers} />)
    expect(container.firstChild.className).not.toContain('rfq-links')
  })

  // Colour rides the SAME countdownTone ramp as the countdown badges
  // (user, 2026-08-24): blue → orange → red as the window runs out.
  describe('tone tracks the bidding window', () => {
    const NOW = Date.now()
    const quoteWith = (minsLeft, windowMins = 60, status = 'open') => ({
      quoteId: 'Q-1', status, carriers,
      openAt: NOW - (windowMins - minsLeft) * 60000,
      closeAt: NOW + minsLeft * 60000,
    })

    it('is blue (info) on a fresh window', () => {
      const { container } = render(<RfqLinksPanel quote={quoteWith(60)} carriers={carriers} />)
      expect(container.querySelector('.alert--info')).toBeTruthy()
    })

    it('is orange (warning) between 30% and 10% left', () => {
      const { container } = render(<RfqLinksPanel quote={quoteWith(12)} carriers={carriers} />)
      expect(container.querySelector('.alert--warning')).toBeTruthy()
    })

    it('is red (error) under 10% left', () => {
      const { container } = render(<RfqLinksPanel quote={quoteWith(3)} carriers={carriers} />)
      expect(container.querySelector('.alert--error')).toBeTruthy()
    })
  })

  describe('closed message', () => {
    const NOW = Date.now()
    const bid = (total) => ({ linehaul: total, fuel: 0, accessorials: [], total, status: 'bid', respondedAt: NOW })
    const closedQuote = (withBids) => ({
      quoteId: 'Q-1',
      status: 'closed',
      openAt: NOW - 60 * 60000,
      closeAt: NOW - 60000,
      carriers: withBids
        ? [{ ...carriers[0], bid: bid(2000) }, { ...carriers[1], bid: bid(2500) }, carriers[2]]
        : carriers,
    })

    it('names the carrier in line to be awarded and points at Stage', () => {
      const q = closedQuote(true)
      render(<RfqLinksPanel quote={q} carriers={q.carriers} />)
      expect(
        screen.getByText(/RFQ sent to 2 carriers — bid is closed, ABCD · Acme Freight to be awarded — press Stage to confirm award and tender\./)
      ).toBeTruthy()
    })

    it('says so plainly when nobody bid', () => {
      const q = closedQuote(false)
      render(<RfqLinksPanel quote={q} carriers={q.carriers} />)
      expect(screen.getByText(/bid is closed, no bids were received\./)).toBeTruthy()
    })
  })
})
