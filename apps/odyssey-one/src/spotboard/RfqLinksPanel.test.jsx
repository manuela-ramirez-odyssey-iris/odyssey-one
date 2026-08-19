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

  it('collapsed by default: shows the count summary, list marked aria-hidden', () => {
    render(<RfqLinksPanel carriers={carriers} />)
    expect(screen.getByText('RFQ sent — 2 bid links')).toBeTruthy()
    expect(screen.getByLabelText('Expand list').getAttribute('aria-expanded')).toBe('false')
  })

  it('chevron expands to reveal a bid link per included carrier (excluded carrier omitted)', () => {
    render(<RfqLinksPanel carriers={carriers} />)
    fireEvent.click(screen.getByLabelText('Expand list'))
    expect(screen.getByText('/spot-bid/tok-abcd')).toBeTruthy()
    expect(screen.getByText('/spot-bid/tok-wxyz')).toBeTruthy()
    expect(screen.queryByText('/spot-bid/tok-nope')).toBeNull()
  })

  it('has no dismiss button — it only disappears via lifecycle (SpotBoardTab)', () => {
    render(<RfqLinksPanel carriers={carriers} />)
    expect(screen.queryByLabelText('Dismiss')).toBeNull()
  })
})
