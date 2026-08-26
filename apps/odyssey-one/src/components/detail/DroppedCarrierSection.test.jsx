// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DroppedCarrierSection from './DroppedCarrierSection'

afterEach(cleanup)

// The five tender sub-tabs the section now follows (RoutingGuideTab's SUB_TABS).
const SUB_TABS = ['routing-options', 'notify-response', 'volume-commitment',
  'additional-info', 'others']

// The REAL shape: routing returns five fields, everything else is '--'.
const carrier = {
  scac: 'JBHT', carrierName: 'J.B. HUNT', equipment: 'LTL',
  dropCode: '23', reason: 'Missing Transit Time',
  reasonDescription: 'Transit time could not be calculated due to missing transit or distance data.',
  routeRank: '--', pickup: '--', delivery: '--', startDate: '--', stopDate: '--',
  transitTime: '--', transitSource: '--', routeGroup: '--', rpcId: '--', ttId: '--',
  commitment: '--', uom: '--', accepted: '--', open: '--', comment: '--', cvcId: '--',
  orderEquipment: false, indirectPoint: false,
}

// A richer one, for the day routing returns more.
const rich = {
  ...carrier, scac: 'RLCA', carrierName: 'R+L CARRIERS',
  dropCode: '2', reason: 'Prohibited Carrier',
  reasonDescription: 'This carrier is prohibited for this customer, lane or commodity.',
  routeRank: '3', pickup: '08/20/2025 14:00 CST, Wed', delivery: '08/22/2025 09:00 PST, Fri',
  commitment: '10', uom: 'Loads/Week', accepted: '6', open: '4', cvcId: 'CVC12345',
  comment: 'Contract renewal pending.', orderEquipment: true, indirectPoint: true,
}

describe('DroppedCarrierSection (LINX-13953)', () => {
  it('names the section and counts the carriers', () => {
    render(<DroppedCarrierSection carriers={[carrier, rich]} />)
    expect(screen.getByText('Dropped Carrier (2)')).toBeTruthy()
  })

  it('renders an empty state rather than disappearing when routing dropped nobody', () => {
    // Absence of the section is ambiguous — the user cannot tell "none" from
    // "broken". The count is itself information.
    render(<DroppedCarrierSection carriers={[]} />)
    expect(screen.getByText('Dropped Carrier (0)')).toBeTruthy()
  })

  it('opens by default, showing the key fields without a click', () => {
    // User ruling 2026-08-17. The SECTION is open; since 2026-08-25 the
    // per-carrier detail disclosure below opens with it (see next test).
    render(<DroppedCarrierSection carriers={[carrier]} />)
    expect(screen.getByText('JBHT')).toBeTruthy()
    expect(screen.getByText('J.B. HUNT')).toBeTruthy()
    expect(screen.getByText('Missing Transit Time')).toBeTruthy()
  })

  it('still collapses when the user asks it to', () => {
    render(<DroppedCarrierSection carriers={[carrier]} />)
    fireEvent.click(screen.getByRole('button', { name: /Dropped Carrier/ }))
    // SubAccordion animates via grid-template-rows (0fr collapsed) and marks
    // the content `inert` + aria-hidden rather than unmounting it — the text
    // node is still IN the DOM (queryByText would still find it), so the
    // real signal is accessibility-tree absence, which queryByRole respects.
    expect(screen.queryByRole('button', { name: /JBHT/ })).toBeNull()
  })

  it('keeps the carrier row identical on every sub-tab', () => {
    // Only the INNER table rotates. The row was never the problem, so nothing on
    // it moves — including Commitment, the one commitment field always visible.
    for (const tab of SUB_TABS) {
      cleanup()
      const { container } = render(<DroppedCarrierSection carriers={[rich]} subTab={tab} />)
      const rowHeaders = [...container.querySelectorAll('.odyssey-group-table__table > thead th')]
        .map((th) => th.textContent)
      expect(rowHeaders).toEqual(['SCAC', 'Carrier Name', 'Equipment', 'Reason',
        'Route Rank', 'Pickup Date/Time', 'Delivery Date/Time', 'Commitment'])
      expect(screen.getByText('Prohibited Carrier')).toBeTruthy()
    }
  })

  it('shows the Volume Commitment fields on the View Volume Commitment sub-tab', () => {
    // Jana, 2026-08-25: "volume commitment fields are missing". The five that
    // qualify Commitment now land on the same sub-tab the tender list above
    // already puts them on, with no click needed to reach them.
    render(<DroppedCarrierSection carriers={[rich]} subTab="volume-commitment" />)
    for (const header of ['UoM', 'Accepted', 'Open', 'CVC ID', 'Comment']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeTruthy()
    }
    expect(screen.getByText('CVC12345')).toBeTruthy()
    expect(screen.getByText('Loads/Week')).toBeTruthy()
    expect(screen.getByText('Contract renewal pending.')).toBeTruthy()
  })

  it('shows only that tab\'s fields in the inner table, not all fourteen', () => {
    // The old fixed run of 14 is what made the section unreadable. Routing
    // Options carries two; a commitment field must NOT leak onto it.
    render(<DroppedCarrierSection carriers={[rich]} subTab="routing-options" />)
    expect(screen.getByRole('columnheader', { name: 'Transit Time' })).toBeTruthy()
    expect(screen.queryByRole('columnheader', { name: 'CVC ID' })).toBeNull()
    expect(screen.queryByText('CVC12345')).toBeNull()
  })

  it('covers all 23 AC fields across the five sub-tabs', () => {
    // The guard against re-orphaning a field: every 13953 field must be reachable
    // from SOME sub-tab. A field dropped from TAB_COLUMNS by accident fails here.
    const seen = new Set()
    for (const tab of SUB_TABS) {
      cleanup()
      const { container } = render(<DroppedCarrierSection carriers={[rich]} subTab={tab} />)
      for (const th of container.querySelectorAll('th')) seen.add(th.textContent)
      // The note is a label + value row, not a column header.
      const note = container.querySelector('.odyssey-group-table__detail-note')
      // GroupTable owns the trailing ': ' separator — strip it back to the field name.
      seen.add(note.querySelector('.odyssey-group-table__detail-note-label').textContent.replace(/:$/, ''))
    }
    seen.delete('') // the pinned action column's empty header
    for (const field of ['SCAC', 'Carrier Name', 'Equipment', 'Reason', 'Route Rank',
      'Pickup Date/Time', 'Delivery Date/Time', 'Commitment', 'Transit Time',
      'Transit Source', 'Route Group', 'UoM', 'Accepted', 'Open', 'CVC ID', 'Comment',
      'Start Date', 'Stop Date', 'RPC-ID', 'TT ID', 'Order Equipment',
      'Indirect Point', 'Reason Description']) {
      expect(seen.has(field)).toBe(true)
    }
    expect(seen.size).toBe(23)
  })

  it('falls back to the default sub-tab rather than an empty inner table', () => {
    render(<DroppedCarrierSection carriers={[rich]} subTab="not-a-tab" />)
    expect(screen.getByRole('columnheader', { name: 'Transit Time' })).toBeTruthy()
  })

  it('renders the two flag fields as checked/unchecked, never as a dash', () => {
    render(<DroppedCarrierSection carriers={[rich]} subTab="others" />)
    expect(screen.getByLabelText('Order equipment: yes')).toBeTruthy()
    expect(screen.getByLabelText('Indirect point: yes')).toBeTruthy()
  })

  it('renders the unchecked flag state too, rather than an empty cell', () => {
    render(<DroppedCarrierSection carriers={[carrier]} subTab="others" />)
    expect(screen.getByLabelText('Order equipment: no')).toBeTruthy()
    expect(screen.getByLabelText('Indirect point: no')).toBeTruthy()
  })

  it('shows the reason description, which is the whole point of the section', () => {
    render(<DroppedCarrierSection carriers={[carrier]} />)
    expect(screen.getByText(/Transit time could not be calculated/)).toBeTruthy()
  })

  it('keeps the reason description a full-width note under every sub-tab', () => {
    // It is the one long free-text field: as a column it cost 360px and pushed
    // the rest off the scroll extent, so it stays the note row spanning whatever
    // columns the active tab happens to have — and survives every tab switch.
    for (const tab of SUB_TABS) {
      cleanup()
      const { container } = render(<DroppedCarrierSection carriers={[rich]} subTab={tab} />)
      const detail = container.querySelector('.odyssey-group-table__detail')
      const headers = [...detail.querySelectorAll('th')].map((th) => th.textContent)
      expect(headers).not.toContain('Reason Description')
      const noteCell = detail.querySelector('.odyssey-group-table__detail-note > td')
      expect(noteCell.getAttribute('colspan')).toBe(String(headers.length))
      expect(noteCell.textContent).toContain('prohibited for this customer')
    }
  })

  // NOTE: @testing-library/user-event and @testing-library/jest-dom are not
  // installed in this repo (only @testing-library/react + dom) — using
  // fireEvent.click (this file's existing pattern) and plain assertions
  // (toBeTruthy/toBeNull/.disabled) instead.
  it('renders a Process SCAC button per carrier and reports which one was pressed', () => {
    const onProcess = vi.fn()
    render(
      <DroppedCarrierSection
        carriers={[carrier, { ...carrier, scac: 'RLCA' }]}
        onProcess={onProcess}
      />,
    )
    const buttons = screen.getAllByRole('button', { name: /Process SCAC/ })
    expect(buttons).toHaveLength(2)
    fireEvent.click(buttons[1])
    expect(onProcess).toHaveBeenCalledTimes(1)
    expect(onProcess.mock.calls[0][0].scac).toBe('RLCA')
  })

  it('disables EVERY Process SCAC while one is in flight, not just the pressed one', () => {
    // AC: "Process SCAC shall be disabled (for the current SCAC and other
    // dropped carrier SCACs)" — only one may be processed at a time.
    render(
      <DroppedCarrierSection
        carriers={[carrier, { ...carrier, scac: 'RLCA' }]}
        onProcess={() => {}}
        processingScac="JBHT"
      />,
    )
    for (const b of screen.getAllByRole('button', { name: /Process SCAC/ })) {
      expect(b.disabled).toBe(true)
    }
  })

  it('renders no action column at all when no handler is supplied', () => {
    // 13953 shipped read-only and must stay renderable that way.
    render(<DroppedCarrierSection carriers={[carrier]} />)
    expect(screen.queryByRole('button', { name: /Process SCAC/ })).toBeNull()
  })
})
