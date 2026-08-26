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

  it('locks identity + reason onto the row for every sub-tab', () => {
    // These seven never rotate away — the reason in particular IS the section.
    for (const tab of SUB_TABS) {
      cleanup()
      render(<DroppedCarrierSection carriers={[rich]} subTab={tab} />)
      expect(screen.getByText('RLCA')).toBeTruthy()
      expect(screen.getByText('Prohibited Carrier')).toBeTruthy()
      expect(screen.getByText('08/20/2025 14:00 CST, Wed')).toBeTruthy()
    }
  })

  it('shows the Volume Commitment fields on the View Volume Commitment sub-tab', () => {
    // Jana, 2026-08-25: "volume commitment fields are missing". All six now land
    // on the same sub-tab the tender list above already puts them on — and
    // Commitment travels WITH its UoM rather than sitting nine columns away.
    render(<DroppedCarrierSection carriers={[rich]} subTab="volume-commitment" />)
    for (const header of ['Commitment', 'UoM', 'Accepted', 'Open', 'CVC ID', 'Comment']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeTruthy()
    }
    expect(screen.getByText('CVC12345')).toBeTruthy()
    expect(screen.getByText('Loads/Week')).toBeTruthy()
    expect(screen.getByText('Contract renewal pending.')).toBeTruthy()
  })

  it('rotates the non-locked columns per sub-tab, and covers all 23 AC fields across the five', () => {
    // The guard against re-orphaning a field: every 13953 field must be reachable
    // from SOME sub-tab. A field dropped from TAB_COLUMNS by accident fails here.
    const seen = new Set(['SCAC', 'Carrier Name', 'Equipment', 'Reason', 'Route Rank',
      'Pickup Date/Time', 'Delivery Date/Time', 'Reason Description'])
    for (const tab of SUB_TABS) {
      cleanup()
      const { container } = render(<DroppedCarrierSection carriers={[rich]} subTab={tab} />)
      for (const th of container.querySelectorAll('th')) seen.add(th.textContent)
    }
    for (const field of ['Transit Time', 'Transit Source', 'Route Group', 'Commitment',
      'UoM', 'Accepted', 'Open', 'CVC ID', 'Comment', 'Start Date', 'Stop Date',
      'RPC-ID', 'TT ID', 'Order Equipment', 'Indirect Point', 'Reason Description']) {
      expect(seen.has(field)).toBe(true)
    }
    expect(seen.size).toBe(23)
  })

  it('falls back to the default sub-tab rather than rendering a bare row', () => {
    render(<DroppedCarrierSection carriers={[rich]} subTab="not-a-tab" />)
    expect(screen.getByRole('columnheader', { name: 'Transit Time' })).toBeTruthy()
  })

  it('renders the two flag fields as checked/unchecked on the ROW, never as a dash', () => {
    // They live on the group row now, which has no renderCell hook — the icons
    // are pre-rendered into `values`. Left as raw booleans the cell draws NOTHING.
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

  it('keeps the reason description in its own band, below the row and off the sub-tabs', () => {
    // It is the one long free-text field: as a row column it cost 360px and
    // pushed the rest off the scroll extent. It owns the detail band alone, so
    // it survives every sub-tab switch and never competes for row width.
    for (const tab of SUB_TABS) {
      cleanup()
      const { container } = render(<DroppedCarrierSection carriers={[rich]} subTab={tab} />)
      const detail = container.querySelector('.odyssey-group-table__detail')
      const headers = [...detail.querySelectorAll('th')].map((th) => th.textContent)
      expect(headers).toEqual(['Reason Description'])
      expect(detail.textContent).toContain('prohibited for this customer')
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
