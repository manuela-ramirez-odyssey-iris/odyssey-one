// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DroppedCarrierSection from './DroppedCarrierSection'
import { tenderKey, PROCESSED_HIGHLIGHT_BG } from '../../lib/processScac'

afterEach(cleanup)

// The AC's two tables, as rendered: sibling nested tables under the carrier row.
const ROUTING = ['Start Date', 'Stop Date', 'Transit Time', 'Transit Source',
  'Route Group', 'RPC-ID', 'TT ID', 'Order Equipment', 'Indirect Point']
const COMMITMENT = ['Commitment', 'UoM', 'Accepted', 'Open', 'Comment', 'CVC ID']
const ROW = ['SCAC', 'Carrier Name', 'Equipment', 'Reason', 'Route Rank',
  'Pickup Date/Time', 'Delivery Date/Time']

const sectionsOf = (c) => [...c.querySelectorAll('.odyssey-group-table__detail-section')]
const headersOf = (el) => [...el.querySelectorAll('th:not(.odyssey-group-table__detail-filler)')]
  .map((th) => th.textContent).filter(Boolean)

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

  it('renders the AC\'s TWO tables as siblings, each with its own columns', () => {
    // 13953 lists the fields as two named tables — "Dropped Carrier Fields" and
    // "Volume Commitment Information". The screen mirrors that shape.
    const { container } = render(<DroppedCarrierSection carriers={[rich]} />)
    const sections = sectionsOf(container)
    expect(sections).toHaveLength(2)
    expect(headersOf(sections[0])).toEqual(ROUTING)
    expect(headersOf(sections[1])).toEqual(COMMITMENT)
  })

  it('keeps the carrier row to identity + why it was dropped', () => {
    const { container } = render(<DroppedCarrierSection carriers={[rich]} />)
    const rowHeaders = [...container.querySelectorAll('.odyssey-group-table__table > thead th')]
      .map((th) => th.textContent).filter(Boolean)
    expect(rowHeaders).toEqual(ROW)
    // Commitment moved OFF the row and into its own table, next to the UoM that
    // gives it meaning — "19" alone was the ambiguity the AC's gate exists for.
    expect(rowHeaders).not.toContain('Commitment')
  })

  it('shows every Volume Commitment field WITHOUT a click', () => {
    // Jana, 2026-08-25: "volume commitment fields are missing". All six, on
    // screen, in one table, the moment the section opens.
    const { container } = render(<DroppedCarrierSection carriers={[rich]} />)
    expect(headersOf(sectionsOf(container)[1])).toEqual(COMMITMENT)
    for (const v of ['10', 'Loads/Week', '6', '4', 'CVC12345', 'Contract renewal pending.']) {
      expect(screen.getAllByText(v).length).toBeGreaterThan(0)
    }
  })

  it('covers all 23 AC fields at once — no tab, no chevron, no subset', () => {
    // The guard against re-orphaning a field. Every 13953 field must be on screen
    // in ONE render; a field dropped from either section fails here.
    const { container } = render(<DroppedCarrierSection carriers={[rich]} />)
    const seen = new Set([
      ...headersOf(container),
      container.querySelector('.odyssey-group-table__detail-note-label')
        .textContent.replace(/:$/, ''),   // GroupTable owns the ': ' separator
    ])
    for (const field of [...ROW, ...ROUTING, ...COMMITMENT, 'Reason Description']) {
      expect(seen.has(field)).toBe(true)
    }
    expect(seen.size).toBe(23)
  })

  it('puts Reason Description under the ROUTING table, once', () => {
    // The long free-text field belongs with the routing facts that explain the
    // drop, not under the commitment numbers.
    const { container } = render(<DroppedCarrierSection carriers={[rich]} />)
    const notes = container.querySelectorAll('.odyssey-group-table__detail-note')
    expect(notes).toHaveLength(1)
    expect(sectionsOf(container)[0].contains(notes[0])).toBe(true)
    expect(notes[0].textContent).toContain('prohibited for this customer')
  })

  it('renders the two flag fields as gray badges, glyph AND word', () => {
    // A lone 16px glyph in a wide cell had too little presence to read as a value
    // (user, 2026-08-26). GRAY for both states: neither is good or bad news, so
    // green/red would rank one outcome above the other.
    const { container } = render(<DroppedCarrierSection carriers={[rich]} />)
    const badges = [...container.querySelectorAll('.text-badge')]
      .filter((b) => /^(Yes|No)$/.test(b.textContent.trim()))
    expect(badges).toHaveLength(2)
    for (const badge of badges) {
      expect(badge.style.background).toContain('badge-gray-bg')
      expect(badge.querySelector('svg')).toBeTruthy()   // the glyph survives
    }
  })

  it('renders the two flag fields as checked/unchecked, never as a dash', () => {
    render(<DroppedCarrierSection carriers={[rich]} />)
    expect(screen.getByLabelText('Order equipment: yes')).toBeTruthy()
    expect(screen.getByLabelText('Indirect point: yes')).toBeTruthy()
  })

  it('renders the unchecked flag state too, rather than an empty cell', () => {
    render(<DroppedCarrierSection carriers={[carrier]} />)
    expect(screen.getByLabelText('Order equipment: no')).toBeTruthy()
    expect(screen.getByLabelText('Indirect point: no')).toBeTruthy()
  })

  it('shows the reason description, which is the whole point of the section', () => {
    render(<DroppedCarrierSection carriers={[carrier]} />)
    expect(screen.getByText(/Transit time could not be calculated/)).toBeTruthy()
  })

  it('keeps the reason description a full-width note, not a column', () => {
    // It is the one long free-text field: as a column it cost 360px and pushed
    // the rest off the scroll extent. It spans its own section's columns instead
    // (+1 for GroupTable's trailing filler).
    const { container } = render(<DroppedCarrierSection carriers={[rich]} />)
    const section = sectionsOf(container)[0]
    expect(headersOf(section)).not.toContain('Reason Description')
    const noteCell = section.querySelector('.odyssey-group-table__detail-note > td')
    expect(Number(noteCell.getAttribute('colspan'))).toBe(ROUTING.length + 1)
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

  // S136 — a carrier already copied into the tender list gets the same
  // highlight tint the newly-inserted Routing Options row shows. Visual only:
  // the button stays enabled so a re-press still reaches the duplicate dialog.
  it('tints a processed carrier\'s button with the tender highlight color; leaves an unprocessed one alone', () => {
    render(
      <DroppedCarrierSection
        carriers={[carrier, { ...carrier, scac: 'RLCA' }]}
        onProcess={() => {}}
        processedKeys={new Set([tenderKey('JBHT', carrier.equipment)])}
      />,
    )
    const buttons = screen.getAllByRole('button', { name: /Process SCAC/ })
    expect(buttons).toHaveLength(2)
    expect(buttons[0].style.background).toBe(PROCESSED_HIGHLIGHT_BG)
    expect(buttons[0].disabled).toBe(false)
    expect(buttons[1].style.background).toBe('')
  })
})
