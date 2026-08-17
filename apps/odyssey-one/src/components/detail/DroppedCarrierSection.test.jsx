// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DroppedCarrierSection from './DroppedCarrierSection'

afterEach(cleanup)

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
    // User ruling 2026-08-17. The SECTION is open; the per-carrier detail
    // disclosure below is a separate control and still starts closed.
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

  it('keeps the detail fields behind the per-carrier row disclosure', () => {
    render(<DroppedCarrierSection carriers={[rich]} />)
    // key field visible, detail field not
    expect(screen.getByText('RLCA')).toBeTruthy()
    expect(screen.queryByText('CVC12345')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /RLCA/ }))
    expect(screen.getByText('CVC12345')).toBeTruthy()
    expect(screen.getByText('Contract renewal pending.')).toBeTruthy()
  })

  it('renders the two checkbox fields as checked/unchecked, never as a dash', () => {
    render(<DroppedCarrierSection carriers={[rich]} />)
    fireEvent.click(screen.getByRole('button', { name: /RLCA/ }))
    expect(screen.getByLabelText('Order equipment: yes')).toBeTruthy()
    expect(screen.getByLabelText('Indirect point: yes')).toBeTruthy()
  })

  it('shows the reason description, which is the whole point of the section', () => {
    render(<DroppedCarrierSection carriers={[carrier]} />)
    fireEvent.click(screen.getByRole('button', { name: /JBHT/ }))
    expect(screen.getByText(/Transit time could not be calculated/)).toBeTruthy()
  })

  it('puts the reason description BELOW the detail values, not in a column', () => {
    // The whole point of the 2026-08-17 change: the long field stops eating
    // horizontal room. It must be a full-width row spanning every detail
    // column, and there must be no Reason Description column header left.
    const { container } = render(<DroppedCarrierSection carriers={[rich]} />)
    fireEvent.click(screen.getByRole('button', { name: /RLCA/ }))
    const detail = container.querySelector('.odyssey-group-table__detail')
    const headers = [...detail.querySelectorAll('th')].map((th) => th.textContent)
    expect(headers).not.toContain('Reason Description')
    const noteCell = detail.querySelector('.odyssey-group-table__detail-note > td')
    expect(noteCell.getAttribute('colspan')).toBe(String(headers.length))
    expect(noteCell.textContent).toContain('prohibited for this customer')
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
