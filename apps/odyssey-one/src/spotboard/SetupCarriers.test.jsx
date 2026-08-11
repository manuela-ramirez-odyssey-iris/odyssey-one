// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import SetupCarriers from './SetupCarriers'
import { NAMED_LISTS, buildCarrierRows } from './carrierList'

// Mirrors the real getLookupOptions('carrier') pool shape — covers every
// SCAC referenced by NAMED_LISTS.
const carrierOptions = [
  { value: 'KNGT', label: 'KNGT - Knight-Swift Transportation' },
  { value: 'SCNN', label: 'SCNN - Schneider National' },
  { value: 'JBHT', label: 'JBHT - J.B. Hunt Transport' },
  { value: 'WERN', label: 'WERN - Werner Enterprises' },
  { value: 'CRST', label: 'CRST - CRST International' },
  { value: 'SWFT', label: 'SWFT - Swift Transportation' },
  { value: 'PRIJ', label: 'PRIJ - Prime Inc' },
  { value: 'ODFL', label: 'ODFL - Old Dominion Freight Line' },
  { value: 'SAIA', label: 'SAIA - Saia LTL Freight' },
  { value: 'ABFS', label: 'ABFS - ABF Freight System' },
  { value: 'AACT', label: 'AACT - AAA Cooper Transportation' },
  { value: 'EXLA', label: 'EXLA - Estes Express Lines' },
  { value: 'FXFE', label: 'FXFE - FedEx Freight' },
  { value: 'SEFL', label: 'SEFL - Southeastern Freight Lines' },
]

// The pane seeds planned dates from the order (SpotBoardTab passes these) —
// rows arrive preselected AND dated, which is the state Send RFQ needs. Tests
// that deliberately exercise the undated case simply omit them.
const DEF_PICKUP = '08/01/2026'
const DEF_DELIVERY = '08/02/2026'

const list = NAMED_LISTS[0]
// Both lists are BUILT, but the TL/LTL toggle shows one at a time (S112).
const allRows = NAMED_LISTS.flatMap((l) => buildCarrierRows(l, carrierOptions))
const tlRows = buildCarrierRows(NAMED_LISTS[0], carrierOptions)
const ltlRows = buildCarrierRows(NAMED_LISTS[1], carrierOptions)

// The mode control is a pick-only (typable={false}) select-style ComboBox —
// jsdom never renders virtualized role="option" rows (FieldSearchResults is
// always virtualized; see FieldSearchResults.jsx), so selection goes through
// the same keyboard path ComboBox.typeahead.test.jsx uses for pick-only mode:
// focus opens the full unfiltered list, ArrowDown walks it from -1, Enter commits.
// MODES order (TL, LTL) is the contract — TL is 1 ArrowDown, LTL is 2.
function showMode(label) {
  const input = screen.getByRole('combobox')
  const el = input.closest('.combo-box')
  fireEvent.focus(input)
  const steps = label === 'TL' ? 1 : 2
  for (let i = 0; i < steps; i++) fireEvent.keyDown(el, { key: 'ArrowDown' })
  fireEvent.keyDown(el, { key: 'Enter' })
}

// Send RFQ / Save Draft / Cancel are separate buttons in the SubAccordion
// header's trailing slot (S112).
function actionButton(label) {
  return screen.getByRole('button', { name: label })
}
// Send RFQ routes through a confirmation modal.
function sendRFQ() {
  fireEvent.click(actionButton('Send RFQ'))
  fireEvent.click(screen.getByRole('button', { name: /Confirm & Send/ }))
}

function fillDate(scac, field, value) {
  const wrap = screen.getByTestId(`${field}-${scac}`)
  const input = within(wrap).getByRole('textbox')
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

function inclCheckbox(scac) {
  return screen.getByLabelText(`Include ${scac}`)
}

function selectAllCheckbox() {
  return screen.getByLabelText('Select all carriers')
}

describe('SetupCarriers', () => {
  it('Send RFQ is disabled when a list is chosen but dates are missing', () => {
    const rows = buildCarrierRows(list, carrierOptions)
    const quote = { listId: list.id, listName: list.name, durationMin: list.defaultDurationMin, carriers: rows }
    render(
      <SetupCarriers
        quote={quote}
        carrierOptions={carrierOptions}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    expect(actionButton('Send RFQ').disabled).toBe(true)
  })

  // REVERSAL (2026-08-11): this asserted "empty dates + unchecked — no
  // prefill". Rows now arrive PRESELECTED (Kathleen 2026-08-07 [27:52]) and
  // DATED from the order. With no defaults supplied the dates stay empty —
  // nothing is fabricated — but the preselection is unconditional.
  it('with no order dates supplied, dates stay empty — but rows are still preselected', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    const rows = buildCarrierRows(list, carrierOptions)
    const unrouted = rows.find((r) => !r.flags.includes('Routed'))
    const wrap = screen.getByTestId(`pickup-${unrouted.scac}`)
    expect(within(wrap).getByRole('textbox').value).toBe('')
    const deliveryWrap = screen.getByTestId(`delivery-${unrouted.scac}`)
    expect(within(deliveryWrap).getByRole('textbox').value).toBe('')
    expect(inclCheckbox(unrouted.scac).checked).toBe(true)
  })

  it('seeds every row with the order dates when they are supplied', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    const rows = buildCarrierRows(list, carrierOptions)
    for (const r of rows) {
      expect(within(screen.getByTestId(`pickup-${r.scac}`)).getByRole('textbox').value).toBe(DEF_PICKUP)
      expect(within(screen.getByTestId(`delivery-${r.scac}`)).getByRole('textbox').value).toBe(DEF_DELIVERY)
    }
  })

  it('a row date stays editable', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    const rows = buildCarrierRows(list, carrierOptions)
    fillDate(rows[0].scac, 'pickup', '09/01/2026')
    const wrap = screen.getByTestId(`pickup-${rows[0].scac}`)
    expect(within(wrap).getByRole('textbox').value).toBe('09/01/2026')
  })

  // Still true, and now the reason matters more: rows are preselected, so if
  // the order carries no dates every included row is undated and Send is
  // blocked until the planner supplies them.
  it('no dates anywhere leaves Send RFQ disabled', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    expect(actionButton('Send RFQ').disabled).toBe(true)
  })

  it('onSendRFQ is called with the assembled payload once a row is date-complete and checked', () => {
    const onSendRFQ = vi.fn()
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={onSendRFQ}
        onCancel={() => {}}
      />
    )

    const rows = buildCarrierRows(list, carrierOptions)
    fillDate(rows[0].scac, 'pickup', '08/10/2026')
    fillDate(rows[0].scac, 'delivery', '08/11/2026')
    sendRFQ()

    expect(onSendRFQ).toHaveBeenCalledTimes(1)
    const payload = onSendRFQ.mock.calls[0][0]
    // listId/listName describe the lists actually BEING SENT. Under
    // preselection BOTH lists contribute by default, so the composite is the
    // correct answer — it is no longer possible to send only one list without
    // deliberately excluding the other.
    expect(payload.listId).toBe('tl-se+ltl-comp')
    expect(payload.listName).toBe('TL Southeast Overflow + LTL Comparable Set')
    expect(payload.durationMin).toBe(list.defaultDurationMin)
    expect(payload.carriers).toHaveLength(allRows.length) // both modes ride along
    // The row the planner edited carries the typed dates; everything else
    // rides on the order's dates. Every included row must be dated — that is
    // what Send RFQ gates on.
    const edited = payload.carriers.find((c) => c.scac === rows[0].scac)
    expect(edited.plannedPickup).toBe('08/10/2026')
    expect(edited.plannedDelivery).toBe('08/11/2026')
    for (const r of payload.carriers.filter((c) => c.incl)) {
      expect(r.plannedPickup).toBeTruthy()
      expect(r.plannedDelivery).toBeTruthy()
    }
  })

  it('onSendRFQ payload reflects the Flexible Pickup checkbox', () => {
    const onSendRFQ = vi.fn()
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={onSendRFQ}
        onCancel={() => {}}
      />
    )

    const rows = buildCarrierRows(list, carrierOptions)
    fillDate(rows[0].scac, 'pickup', '08/10/2026')
    fillDate(rows[0].scac, 'delivery', '08/11/2026')
    fireEvent.click(screen.getByLabelText('Flexible Pickup'))
    sendRFQ()

    expect(onSendRFQ).toHaveBeenCalledTimes(1)
    expect(onSendRFQ.mock.calls[0][0].flexiblePickup).toBe(true)
  })

  it('shows ONE list at a time behind the TL/LTL mode control', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    // TL is the default mode: its carriers are on screen, LTL's are not.
    expect(screen.getByTestId(`pickup-${tlRows[0].scac}`)).toBeTruthy()
    expect(screen.queryByTestId(`pickup-${ltlRows[0].scac}`)).toBeFalsy()

    showMode('LTL')
    expect(screen.getByTestId(`pickup-${ltlRows[0].scac}`)).toBeTruthy()
    expect(screen.queryByTestId(`pickup-${tlRows[0].scac}`)).toBeFalsy()

    showMode('TL')
    expect(screen.getByTestId(`pickup-${tlRows[0].scac}`)).toBeTruthy()
    expect(screen.queryByTestId(`pickup-${ltlRows[0].scac}`)).toBeFalsy()
  })

  it('the mode control is a select-style ComboBox with exactly TL and LTL options, not a ButtonToggle', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    // Not a ButtonToggle: the old segmented-button affordance is gone.
    expect(screen.queryByRole('button', { name: /Show (TL|LTL) carriers/ })).toBeFalsy()

    const input = screen.getByRole('combobox')
    expect(input.readOnly).toBe(true) // pick-only (typable={false}) select mode

    const el = input.closest('.combo-box')
    fireEvent.focus(input)
    expect(input.getAttribute('aria-expanded')).toBe('true')

    // Exactly two options: a THIRD ArrowDown wraps cyclically back to the
    // FIRST (TL) rather than advancing to a nonexistent third entry —
    // jsdom never renders virtualized role="option" rows, so counting
    // options directly isn't possible; the wrap proves the count is 2.
    fireEvent.keyDown(el, { key: 'ArrowDown' }) // -> TL (index 0)
    fireEvent.keyDown(el, { key: 'ArrowDown' }) // -> LTL (index 1)
    fireEvent.keyDown(el, { key: 'ArrowDown' }) // -> wraps back to TL
    fireEvent.keyDown(el, { key: 'Enter' })
    expect(screen.getByTestId(`pickup-${tlRows[0].scac}`)).toBeTruthy()
    expect(screen.queryByTestId(`pickup-${ltlRows[0].scac}`)).toBeFalsy()
  })

  it('controls row order is mode ComboBox, then Quote Duration, then Flexible Pickup — DOCUMENT ORDER', () => {
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    const controls = container.querySelector('.setup-carriers__controls')
    const modeControl = screen.getByRole('combobox')
    const duration = screen.getByLabelText('Quote Duration')
    const flexible = screen.getByLabelText('Flexible Pickup')

    expect(controls.contains(modeControl)).toBe(true)
    expect(controls.contains(duration)).toBe(true)
    expect(controls.contains(flexible)).toBe(true)

    const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING
    expect(modeControl.compareDocumentPosition(duration) & FOLLOWING).toBeTruthy()
    expect(duration.compareDocumentPosition(flexible) & FOLLOWING).toBeTruthy()
  })

  it('the LTL mode payload carries the "LTL Comparable Set" list — TL carries "TL Southeast Overflow"', () => {
    expect(NAMED_LISTS[0].name).toBe('TL Southeast Overflow')
    expect(NAMED_LISTS[1].name).toBe('LTL Comparable Set')

    const onSendRFQ = vi.fn()
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={onSendRFQ}
        onCancel={() => {}}
      />
    )
    showMode('LTL')
    fillDate(ltlRows[0].scac, 'pickup', '08/10/2026')
    fillDate(ltlRows[0].scac, 'delivery', '08/11/2026')
    sendRFQ()

    const payload = onSendRFQ.mock.calls[0][0]
    // Both lists ride along by default now (preselection), so the composite is
    // expected — the LTL list is present, which is what this pins.
    expect(payload.listId).toContain(NAMED_LISTS[1].id)
    expect(payload.listName).toContain('LTL Comparable Set')
  })

  it('keeps inclusions and dates when toggling between modes', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    fillDate(tlRows[0].scac, 'pickup', '08/10/2026')
    fillDate(tlRows[0].scac, 'delivery', '08/11/2026')
    expect(inclCheckbox(tlRows[0].scac).checked).toBe(true)

    showMode('LTL')
    showMode('TL')
    // the edit survived the round trip
    const wrap = screen.getByTestId(`pickup-${tlRows[0].scac}`)
    expect(within(wrap).getByRole('textbox').value).toBe('08/10/2026')
    expect(inclCheckbox(tlRows[0].scac).checked).toBe(true)
  })

  it('the carrier count reflects the VISIBLE mode, not every built row', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByText(`${tlRows.length} carriers`)).toBeTruthy()
    expect(screen.queryByText(`${allRows.length} carriers`)).toBeFalsy()
    showMode('LTL')
    expect(screen.getByText(`${ltlRows.length} carriers`)).toBeTruthy()
  })

  it('shows the Quote Duration unit so the value is unambiguous', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByText('Quote Duration')).toBeTruthy()
  })

  it('builds EVERY named list on mount, even though only one shows', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByTestId(`pickup-${tlRows[0].scac}`)).toBeTruthy()
    // The default rides in the PLACEHOLDER (per-mode); the field starts empty.
    expect(screen.getByLabelText('Quote Duration').value).toBe('')
    expect(screen.getByLabelText('Quote Duration').placeholder)
      .toBe(`Open Window ${NAMED_LISTS[0].defaultDurationMin}min`)

    showMode('LTL')
    expect(screen.getByTestId(`pickup-${ltlRows[0].scac}`)).toBeTruthy()
  })

  it('an existing quote wins over the default build', () => {
    const otherList = NAMED_LISTS[1]
    const rows = buildCarrierRows(otherList, carrierOptions)
    const quote = { listId: otherList.id, listName: otherList.name, durationMin: otherList.defaultDurationMin, carriers: rows }
    render(
      <SetupCarriers
        quote={quote}
        carrierOptions={carrierOptions}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    // Only the quote's own carriers render — not both lists rebuilt.
    expect(screen.getByText(`${rows.length} carriers`)).toBeTruthy()
    // An existing quote's duration IS a real value, not a placeholder default.
    expect(screen.getByLabelText('Quote Duration').value)
      .toBe(String(otherList.defaultDurationMin))
  })

  it('shows a carrier count in the toolbar', () => {
    const rows = buildCarrierRows(list, carrierOptions)
    const quote = { listId: list.id, listName: list.name, durationMin: list.defaultDurationMin, carriers: rows }
    render(
      <SetupCarriers
        quote={quote}
        carrierOptions={carrierOptions}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByText(`${rows.length} carriers`)).toBeTruthy()
  })

  it('spreads the three actions as separate buttons, trailing, below the table', () => {
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    const actions = container.querySelector('.setup-carriers__actions')
    for (const label of ['Send RFQ', 'Save Draft', 'Cancel']) {
      expect(within(actions).getByRole('button', { name: label })).toBeTruthy()
    }
    // Below the table, NOT in the card header and NOT in the top toolbar row.
    expect(actions.closest('.sub-accordion__header-row')).toBeFalsy()
    expect(container.querySelector('.setup-carriers__toolbar-top').contains(actions)).toBe(false)
    const table = container.querySelector('.setup-carriers__table-wrap')
    expect(table.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('stacks the RFQ controls, then the count toolbar, then the table', () => {
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    const toolbar = container.querySelector('.setup-carriers__toolbar-top')
    const controls = container.querySelector('.setup-carriers__controls')
    const table = container.querySelector('.setup-carriers__table-wrap')

    // The mode ComboBox now lives in `controls` (S112 follow-up), not the
    // toolbar — the toolbar carries only the visible-count text.
    expect(within(toolbar).getByText(`${tlRows.length} carriers`)).toBeTruthy()
    expect(toolbar.contains(controls)).toBe(false)
    expect(within(controls).getByRole('combobox')).toBeTruthy()
    expect(within(controls).getByLabelText('Quote Duration')).toBeTruthy()
    expect(within(controls).getByLabelText('Flexible Pickup')).toBeTruthy()

    // document order: controls → toolbar → table
    const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING
    expect(controls.compareDocumentPosition(toolbar) & FOLLOWING).toBeTruthy()
    expect(toolbar.compareDocumentPosition(table) & FOLLOWING).toBeTruthy()
  })

  it('Cancel leads the action row; Send RFQ is the trailing primary', () => {
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    const actions = container.querySelector('.setup-carriers__actions')
    const cancel = within(actions).getByRole('button', { name: 'Cancel' })
    const send = within(actions).getByRole('button', { name: 'Send RFQ' })

    // Cancel is a direct child (lead); Save Draft + Send RFQ sit in the trail.
    expect(cancel.parentElement).toBe(actions)
    expect(send.closest('.setup-carriers__actions-trail')).toBeTruthy()
    expect(cancel.compareDocumentPosition(send) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    // md sizing + Cancel is secondary, no longer a link
    for (const b of [cancel, send, within(actions).getByRole('button', { name: 'Save Draft' })]) {
      expect(b.className).toContain('btn--md')
    }
    expect(cancel.className).toContain('btn--secondary')
    expect(cancel.className).not.toContain('btn--link')
    expect(send.className).toContain('btn--primary')
  })

  it('populates the lists once carrierOptions actually resolves, not only on the first (empty) render', () => {
    const { rerender } = render(
      <SetupCarriers
        carrierOptions={[]}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    // First render: carrierOptions is still empty (async pool not resolved yet).
    expect(screen.getByText('0 carriers')).toBeTruthy()

    rerender(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )

    const rows = buildCarrierRows(list, carrierOptions)
    expect(screen.getByText(`${tlRows.length} carriers`)).toBeTruthy()
    expect(screen.getByTestId(`pickup-${rows[0].scac}`)).toBeTruthy()
  })

  it('does not clobber user edits when carrierOptions changes again after rows are already populated', () => {
    const { rerender } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    const rows = buildCarrierRows(list, carrierOptions)
    fillDate(rows[0].scac, 'pickup', '08/10/2026')

    // A new carrierOptions array (same content, new reference) arrives, as
    // would happen on a parent re-render — must not wipe the date just typed.
    rerender(
      <SetupCarriers
        carrierOptions={[...carrierOptions]}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )

    const wrap = screen.getByTestId(`pickup-${rows[0].scac}`)
    expect(within(wrap).getByRole('textbox').value).toBe('08/10/2026')
  })

  describe('Incl. checkbox driven by dates', () => {
    // REVERSAL (2026-08-11): was "rows start unchecked".
    it('rows start CHECKED, except route-guide carriers', () => {
      render(
        <SetupCarriers
          carrierOptions={carrierOptions}
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
          onCancel={() => {}}
        />
      )
      const rows = buildCarrierRows(list, carrierOptions)
      for (const r of rows) {
        expect(inclCheckbox(r.scac).checked).toBe(!r.flags.includes('Routed'))
      }
    })

    it('the checkbox is disabled while a date is missing, enabled once both dates are present', () => {
      render(
        <SetupCarriers
          carrierOptions={carrierOptions}
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
          onCancel={() => {}}
        />
      )
      // The gate is ASYMMETRIC now: it blocks turning a carrier ON without
      // dates, never turning one OFF. So it is observable on a routed row
      // (starts excluded) with its dates cleared — a preselected row is always
      // enabled, precisely so it can be opted out of.
      const rows = buildCarrierRows(list, carrierOptions)
      const scac = rows.find((r) => r.flags.includes('Routed')).scac
      fillDate(scac, 'pickup', '')
      fillDate(scac, 'delivery', '')
      expect(inclCheckbox(scac).disabled).toBe(true)

      fillDate(scac, 'pickup', '08/10/2026')
      expect(inclCheckbox(scac).disabled).toBe(true)

      fillDate(scac, 'delivery', '08/11/2026')
      expect(inclCheckbox(scac).disabled).toBe(false)

      // A preselected row is never disabled — opting out must always work.
      const preselected = rows.find((r) => !r.flags.includes('Routed')).scac
      expect(inclCheckbox(preselected).disabled).toBe(false)
    })

    it('completing a row by editing its second date auto-checks it', () => {
      render(
        <SetupCarriers
          carrierOptions={carrierOptions}
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
          onCancel={() => {}}
        />
      )
      // Exercised on a ROUTED row, the only kind that starts unchecked now —
      // and the only kind whose dates start empty when defaults are supplied…
      // except they don't, so clear them first to reach the undated state.
      const rows = buildCarrierRows(list, carrierOptions)
      const scac = rows.find((r) => r.flags.includes('Routed')).scac
      fillDate(scac, 'pickup', '')
      fillDate(scac, 'delivery', '')
      expect(inclCheckbox(scac).checked).toBe(false)

      fillDate(scac, 'pickup', '08/10/2026')
      expect(inclCheckbox(scac).checked).toBe(false)

      fillDate(scac, 'delivery', '08/11/2026')
      expect(inclCheckbox(scac).checked).toBe(true)
    })

    it('clearing a date unchecks the row and disables the checkbox again', () => {
      render(
        <SetupCarriers
          carrierOptions={carrierOptions}
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
          onCancel={() => {}}
        />
      )
      const rows = buildCarrierRows(list, carrierOptions)
      const scac = rows[0].scac
      fillDate(scac, 'pickup', '08/10/2026')
      fillDate(scac, 'delivery', '08/11/2026') // completes the row → auto-checks
      expect(inclCheckbox(scac).checked).toBe(true)

      fillDate(scac, 'pickup', '')
      expect(inclCheckbox(scac).checked).toBe(false)
      expect(inclCheckbox(scac).disabled).toBe(true)
    })

    it('Send RFQ stays disabled until at least one row is checked', () => {
      render(
        <SetupCarriers
          carrierOptions={carrierOptions}
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
          onCancel={() => {}}
        />
      )
      // REVERSAL (2026-08-11): rows arrive preselected AND dated, so Send is
      // live immediately — that is the point of the change. What still gates
      // it is having at least one included row: deselect everything and it
      // goes back to disabled.
      expect(actionButton('Send RFQ').disabled).toBe(false)

      for (const mode of ['TL', 'LTL']) {
        showMode(mode)
        fireEvent.click(selectAllCheckbox()) // check-all → …
        fireEvent.click(selectAllCheckbox()) // … → clear-all for this mode
      }
      expect(actionButton('Send RFQ').disabled).toBe(true)
    })
  })

  describe('select-all header checkbox', () => {
    it('is disabled when no row has dates', () => {
      render(
        <SetupCarriers
          carrierOptions={carrierOptions}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
          onCancel={() => {}}
        />
      )
      // No order dates supplied → nothing is date-complete → select-all has
      // nothing it is allowed to include.
      expect(selectAllCheckbox().disabled).toBe(true)
      expect(selectAllCheckbox().checked).toBe(false)
    })

    it('toggling it on includes exactly the date-complete rows, leaving date-less rows excluded', () => {
      render(
        <SetupCarriers
          carrierOptions={carrierOptions}
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
          onCancel={() => {}}
        />
      )
      const rows = buildCarrierRows(list, carrierOptions)
      const complete = rows[0].scac
      const incomplete = rows[1].scac
      fillDate(complete, 'pickup', '08/10/2026')
      fillDate(complete, 'delivery', '08/11/2026')
      // Every row is now seeded with the order's dates, so the "incomplete"
      // row has to be made incomplete deliberately.
      fillDate(incomplete, 'pickup', '')
      fillDate(incomplete, 'delivery', '')

      // Row 0 auto-checked itself already; uncheck it so the select-all click
      // is what re-includes it, isolating the behavior under test.
      fireEvent.click(inclCheckbox(complete))
      expect(inclCheckbox(complete).checked).toBe(false)

      expect(selectAllCheckbox().disabled).toBe(false)
      fireEvent.click(selectAllCheckbox())

      expect(inclCheckbox(complete).checked).toBe(true)
      expect(inclCheckbox(incomplete).disabled).toBe(true)
      expect(inclCheckbox(incomplete).checked).toBe(false)
    })

    it('shows indeterminate when only some selectable rows are included', () => {
      render(
        <SetupCarriers
          carrierOptions={carrierOptions}
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
          onCancel={() => {}}
        />
      )
      const rows = buildCarrierRows(list, carrierOptions)
      fillDate(rows[0].scac, 'pickup', '08/10/2026')
      fillDate(rows[0].scac, 'delivery', '08/11/2026')
      fillDate(rows[1].scac, 'pickup', '08/12/2026')
      fillDate(rows[1].scac, 'delivery', '08/13/2026')

      // Both auto-checked on completion; uncheck one so only one of the two
      // selectable rows is included.
      fireEvent.click(inclCheckbox(rows[1].scac))

      expect(selectAllCheckbox().checked).toBe(false)
      expect(selectAllCheckbox().indeterminate).toBe(true)
    })

    it('checked once every selectable row is included, and toggling off clears them', () => {
      render(
        <SetupCarriers
          carrierOptions={carrierOptions}
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
          onCancel={() => {}}
        />
      )
      const rows = buildCarrierRows(list, carrierOptions)
      fillDate(rows[0].scac, 'pickup', '08/10/2026')
      fillDate(rows[0].scac, 'delivery', '08/11/2026')
      fillDate(rows[1].scac, 'pickup', '08/12/2026')
      fillDate(rows[1].scac, 'delivery', '08/13/2026')

      // Both rows date-complete → both auto-checked → select-all reads checked.
      expect(selectAllCheckbox().checked).toBe(true)
      expect(selectAllCheckbox().indeterminate).toBe(false)

      fireEvent.click(selectAllCheckbox())
      expect(inclCheckbox(rows[0].scac).checked).toBe(false)
      expect(inclCheckbox(rows[1].scac).checked).toBe(false)
      expect(selectAllCheckbox().checked).toBe(false)
    })
  })

  it('readOnly hides the header actions entirely', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.queryByRole('button', { name: 'Send RFQ' })).toBeFalsy()
    expect(screen.queryByRole('button', { name: 'Save Draft' })).toBeFalsy()
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeFalsy()
  })

  // ── Send RFQ confirmation modal (S112) ────────────────────────────────────
  describe('Send RFQ confirmation', () => {
    const renderAndComplete = (onSendRFQ = () => {}) => {
      render(
        <SetupCarriers
          carrierOptions={carrierOptions}
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={onSendRFQ}
          onCancel={() => {}}
        />
      )
      const rows = buildCarrierRows(list, carrierOptions)
      fillDate(rows[0].scac, 'pickup', '08/10/2026')
      fillDate(rows[0].scac, 'delivery', '08/11/2026')
      return rows
    }

    it('does NOT send until the modal is confirmed', () => {
      const onSendRFQ = vi.fn()
      renderAndComplete(onSendRFQ)
      fireEvent.click(actionButton('Send RFQ'))
      // Modal is up, nothing sent yet.
      expect(screen.getByRole('dialog', { name: 'Send RFQ' })).toBeTruthy()
      expect(onSendRFQ).not.toHaveBeenCalled()

      fireEvent.click(screen.getByRole('button', { name: /Confirm & Send/ }))
      expect(onSendRFQ).toHaveBeenCalledTimes(1)
    })

    it('cancelling the modal closes it and sends nothing', () => {
      const onSendRFQ = vi.fn()
      renderAndComplete(onSendRFQ)
      fireEvent.click(actionButton('Send RFQ'))
      const dialog = screen.getByRole('dialog', { name: 'Send RFQ' })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByRole('dialog', { name: 'Send RFQ' })).toBeFalsy()
      expect(onSendRFQ).not.toHaveBeenCalled()
    })

    it('summarises the carriers, the duration and the flexible-pickup flag', () => {
      const rows = renderAndComplete()
      fireEvent.click(screen.getByLabelText('Flexible Pickup'))
      fireEvent.click(actionButton('Send RFQ'))
      const dialog = within(screen.getByRole('dialog', { name: 'Send RFQ' }))

      // The included carriers, named. Under preselection that is every
      // carrier across BOTH lists except the route-guide ones — which is
      // exactly what the confirmation exists to show before sending.
      expect(dialog.getByText(`${rows[0].scac} · ${rows[0].name}`)).toBeTruthy()

      // The count is split across elements, so match on the dialog's own text.
      const includedCount = allRows.filter((r) => !r.flags.includes('Routed')).length
      expect(includedCount).toBeGreaterThan(1) // guards against a silent revert
      const dialogText = screen.getByRole('dialog', { name: 'Send RFQ' }).textContent
      expect(dialogText).toMatch(new RegExp(`will be sent to\\s*${includedCount}\\s*carrier`))

      // The ROUTED carrier is excluded by default and must not be listed.
      const routed = allRows.find((r) => r.flags.includes('Routed'))
      expect(dialog.queryByText(new RegExp(routed.scac))).toBeFalsy()

      expect(dialog.getByText(`${NAMED_LISTS[0].defaultDurationMin} min`)).toBeTruthy()
      expect(dialog.getByText('Yes')).toBeTruthy() // Flexible Pickup
      // Both lists contribute now, so the summary names the composite.
      expect(dialogText).toContain(NAMED_LISTS[0].name)
      expect(dialogText).toContain(NAMED_LISTS[1].name)
    })
  })

  it('renders the shipment context as an order-view field grid, not a stat strip', () => {
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        summaryFields={[
          { label: 'Origin', value: 'Atlanta, GA' },
          { label: 'Destination', value: 'Charlotte, NC' },
        ]}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    expect(container.querySelector('.order-pane__fields-grid')).toBeTruthy()
    expect(container.querySelector('.summary-strip')).toBeFalsy()
    expect(screen.getByText('Origin')).toBeTruthy()
    expect(screen.getByText('Atlanta, GA')).toBeTruthy()
  })

  // ── Quote duration default (S112) ─────────────────────────────────────────
  describe('quote duration', () => {
    const renderIt = (onSendRFQ = () => {}) => render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={onSendRFQ}
        onCancel={() => {}}
      />
    )

    it('advertises the ACTIVE mode default in the placeholder, and follows the toggle', () => {
      renderIt()
      const duration = screen.getByLabelText('Quote Duration')
      expect(duration.placeholder).toBe(`Open Window ${NAMED_LISTS[0].defaultDurationMin}min`)
      showMode('LTL')
      expect(screen.getByLabelText('Quote Duration').placeholder)
        .toBe(`Open Window ${NAMED_LISTS[1].defaultDurationMin}min`)
    })

    it('the label carries no unit suffix', () => {
      renderIt()
      expect(screen.queryByText(/open window, min/i)).toBeFalsy()
    })

    it('an untouched field sends the active mode default', () => {
      const onSendRFQ = vi.fn()
      renderIt(onSendRFQ)
      fillDate(tlRows[0].scac, 'pickup', '08/10/2026')
      fillDate(tlRows[0].scac, 'delivery', '08/11/2026')
      sendRFQ()
      expect(onSendRFQ.mock.calls[0][0].durationMin).toBe(NAMED_LISTS[0].defaultDurationMin)
    })

    it('a typed value wins over the default, and toggling does not clobber it', () => {
      const onSendRFQ = vi.fn()
      renderIt(onSendRFQ)
      fireEvent.change(screen.getByLabelText('Quote Duration'), { target: { value: '45' } })
      showMode('LTL')
      showMode('TL')
      expect(screen.getByLabelText('Quote Duration').value).toBe('45')

      fillDate(tlRows[0].scac, 'pickup', '08/10/2026')
      fillDate(tlRows[0].scac, 'delivery', '08/11/2026')
      sendRFQ()
      expect(onSendRFQ.mock.calls[0][0].durationMin).toBe(45)
    })
  })
})
