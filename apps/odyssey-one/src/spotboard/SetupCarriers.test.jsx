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

// The mode control is a PillTab band (TL · LTL · All) as of 2026-08-19,
// replacing the pick-only ComboBox and its keyboard-only jsdom workaround —
// a pill is a plain button, so this is now a click.
function showMode(label) {
  const band = screen.getByRole('group', { name: 'Carrier list mode' })
  fireEvent.click(within(band).getByText(label))
}

// Send RFQ / Save Draft are separate buttons below the table (S112; Cancel
// removed Task 7 — 2026-08-20).
function actionButton(label) {
  return screen.getByRole('button', { name: label })
}
// The primary button's label is now `Send x/y RFQ` (Task 7) — x = included
// rows, y = total rows — so it's matched by pattern, not exact text.
function sendRFQButton() {
  return screen.getByRole('button', { name: /^Send \d+\/\d+ RFQ$/ })
}
// Send RFQ routes through a confirmation modal (whose own title stays the
// static "Send RFQ" — only the trigger button's label became dynamic).
function sendRFQ() {
  fireEvent.click(sendRFQButton())
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

// Quote Setup modal (Task 5) — Duration / Planned Pickup for All / Planned
// Delivery for All / Flexible, behind the "Setup Quote" trigger trailing the
// carrier-count row.
function setupQuoteButton() {
  return screen.getByRole('button', { name: 'Setup Quote' })
}

function openSetupModal() {
  fireEvent.click(setupQuoteButton())
  return screen.getByRole('dialog', { name: 'Quote Setup' })
}

function applySetupModal() {
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
}

function cancelSetupModal() {
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Quote Setup' })).getByRole('button', { name: 'Cancel' }))
}

// The modal's date fields carry real FormField labels (unlike the per-row
// table cells, which are unlabeled and located by data-testid instead).
function fillModalDate(label, value) {
  const input = screen.getByLabelText(label)
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

function pickModalDuration(optionLabel) {
  fireEvent.click(screen.getByRole('button', { name: /open duration options/i }))
  fireEvent.click(within(screen.getByRole('listbox')).getByText(optionLabel))
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
    expect(sendRFQButton().disabled).toBe(true)
  })

  // Task 7 (2026-08-20, user): the primary button's label counts included vs
  // total rows — "Send x/y RFQ" — instead of a flat "Send RFQ".
  it('the primary button reads "Send x/y RFQ", counting included vs total rows', () => {
    const carriers = [
      { scac: 'A1', name: 'Carrier 1', email: 'a1@example.com', equipment: 'Van', incl: true, plannedPickup: DEF_PICKUP, plannedDelivery: DEF_DELIVERY, flags: [] },
      { scac: 'A2', name: 'Carrier 2', email: 'a2@example.com', equipment: 'Van', incl: true, plannedPickup: DEF_PICKUP, plannedDelivery: DEF_DELIVERY, flags: [] },
      { scac: 'A3', name: 'Carrier 3', email: 'a3@example.com', equipment: 'Van', incl: false, plannedPickup: '', plannedDelivery: '', flags: [] },
      { scac: 'A4', name: 'Carrier 4', email: 'a4@example.com', equipment: 'Van', incl: false, plannedPickup: '', plannedDelivery: '', flags: [] },
      { scac: 'A5', name: 'Carrier 5', email: 'a5@example.com', equipment: 'Van', incl: false, plannedPickup: '', plannedDelivery: '', flags: [] },
    ]
    const quote = { listId: 'x-list', listName: 'X List', durationMin: 30, carriers }
    render(
      <SetupCarriers
        quote={quote}
        carrierOptions={carrierOptions}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: 'Send 2/5 RFQ' })).toBeTruthy()
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
    expect(sendRFQButton().disabled).toBe(true)
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
    expect(payload.durationMin).toBe(30) // flat default (2026-08-19), not the list's
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

    openSetupModal()
    fireEvent.click(screen.getByLabelText('Flexible'))
    applySetupModal()

    sendRFQ()

    expect(onSendRFQ).toHaveBeenCalledTimes(1)
    expect(onSendRFQ.mock.calls[0][0].flexiblePickup).toBe(true)
  })

  it('shows ONE list at a time behind the TL/LTL mode control; All shows both', () => {
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
    // All is the default mode (2026-08-20): both lists' carriers are on screen.
    expect(screen.getByTestId(`pickup-${tlRows[0].scac}`)).toBeTruthy()
    expect(screen.getByTestId(`pickup-${ltlRows[0].scac}`)).toBeTruthy()

    showMode('LTL')
    expect(screen.getByTestId(`pickup-${ltlRows[0].scac}`)).toBeTruthy()
    expect(screen.queryByTestId(`pickup-${tlRows[0].scac}`)).toBeFalsy()

    showMode('TL')
    expect(screen.getByTestId(`pickup-${tlRows[0].scac}`)).toBeTruthy()
    expect(screen.queryByTestId(`pickup-${ltlRows[0].scac}`)).toBeFalsy()
  })

  // 2026-08-19 (user): the mode control is a PillTab band of THREE — TL, LTL
  // and the new All — replacing the pick-only ComboBox. 'All' is the reason the
  // ComboBox had to go: it could not express "show both lists at once".
  // 2026-08-20 (user): reordered All-first, since it's now the default.
  it('the mode control is a PillTab band of All, TL and LTL — not a ComboBox', () => {
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
    // Neither of the two superseded affordances survives.
    expect(screen.queryByRole('button', { name: /Show (TL|LTL) carriers/ })).toBeFalsy()

    const band = screen.getByRole('group', { name: 'Carrier list mode' })
    // The band itself holds no combobox — the only one left on the card is
    // DurationPicker's own field, which is a different control entirely.
    expect(within(band).queryByRole('combobox')).toBeFalsy()
    const pills = within(band).getAllByRole('button')
    // The pill's label is its own direct text-node child — the count Badge is
    // a nested element, so `firstChild` isolates the label from the count.
    expect(pills.map((p) => p.firstChild.textContent.trim())).toEqual(['All', 'TL', 'LTL'])
  })

  // Task 6 (2026-08-20, user): All leads, and each pill carries a metric-badge
  // count of its own rows — All = every built row, TL/LTL = that list's rows.
  it('All is selected by default and each pill shows its own row count', () => {
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
    const band = screen.getByRole('group', { name: 'Carrier list mode' })
    const [allPill, tlPill, ltlPill] = within(band).getAllByRole('button')

    expect(allPill.getAttribute('aria-pressed')).toBe('true')
    expect(tlPill.getAttribute('aria-pressed')).toBe('false')
    expect(ltlPill.getAttribute('aria-pressed')).toBe('false')

    expect(within(allPill).getByText(String(allRows.length))).toBeTruthy()
    expect(within(tlPill).getByText(String(tlRows.length))).toBeTruthy()
    expect(within(ltlPill).getByText(String(ltlRows.length))).toBeTruthy()
  })

  it('All shows BOTH lists at once; TL and LTL each show only their own', () => {
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
    showMode('TL')
    expect(screen.getByTestId(`pickup-${tlRows[0].scac}`)).toBeTruthy()
    expect(screen.queryByTestId(`pickup-${ltlRows[0].scac}`)).toBeFalsy()

    showMode('LTL')
    expect(screen.queryByTestId(`pickup-${tlRows[0].scac}`)).toBeFalsy()
    expect(screen.getByTestId(`pickup-${ltlRows[0].scac}`)).toBeTruthy()

    showMode('All')
    expect(screen.getByTestId(`pickup-${tlRows[0].scac}`)).toBeTruthy()
    expect(screen.getByTestId(`pickup-${ltlRows[0].scac}`)).toBeTruthy()
  })

  // Restructured 2026-08-19, RFQ terms moved into the Quote Setup modal
  // 2026-08-20 (Task 5): heading → pill band, ABOVE the table accordion, with
  // the actions BELOW it. Quote Duration/Flexible no longer live in the head
  // at all while there is no open quote to show a countdown for.
  it('head block order is heading, then the mode pills — no RFQ terms live there anymore', () => {
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
    const head = container.querySelector('.setup-carriers__head')
    const heading = container.querySelector('.setup-carriers__heading')
    const band = screen.getByRole('group', { name: 'Carrier list mode' })

    expect(heading.textContent.trim()).toBe('Setup & Carriers')
    expect(head.contains(band)).toBe(true)
    expect(container.querySelector('.setup-carriers__controls')).toBeFalsy()
    // Nothing renders the RFQ terms outside the modal while no quote is open.
    expect(screen.queryByLabelText('Quote Duration')).toBeFalsy()
    expect(screen.queryByLabelText('Flexible')).toBeFalsy()

    const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING
    expect(heading.compareDocumentPosition(band) & FOLLOWING).toBeTruthy()
  })

  // Task 5, step 1(a)/(b): the trigger and the modal it opens.
  it('a "Setup Quote" secondary button renders trailing the carrier-count row', () => {
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
    const button = within(toolbar).getByRole('button', { name: 'Setup Quote' })
    expect(button.className).toContain('btn--secondary')
    // All is the default mode — the toolbar count spans every built row.
    const count = within(toolbar).getByText(`${allRows.length} carriers`)
    expect(count.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('clicking Setup Quote opens a dialog containing the four fields', () => {
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
    expect(screen.queryByRole('dialog', { name: 'Quote Setup' })).toBeFalsy()
    const dialog = within(openSetupModal())
    expect(dialog.getByLabelText('Quote Duration')).toBeTruthy()
    expect(dialog.getByLabelText('Planned Pickup for All')).toBeTruthy()
    expect(dialog.getByLabelText('Planned Delivery for All')).toBeTruthy()
    expect(dialog.getByLabelText('Flexible')).toBeTruthy()
  })

  it('the Setup Quote trigger is disabled when the pane is readOnly', () => {
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
    expect(setupQuoteButton().disabled).toBe(true)
  })

  // Task 5, step 1(c): Apply mass-applies the planned dates to EVERY row and
  // closes the dialog.
  it('Apply sets every row\'s Planned Pickup/Delivery and closes the dialog', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    openSetupModal()
    fillModalDate('Planned Pickup for All', '09/01/2026')
    fillModalDate('Planned Delivery for All', '09/02/2026')
    applySetupModal()

    expect(screen.queryByRole('dialog', { name: 'Quote Setup' })).toBeFalsy()
    for (const r of tlRows) {
      expect(within(screen.getByTestId(`pickup-${r.scac}`)).getByRole('textbox').value).toBe('09/01/2026')
      expect(within(screen.getByTestId(`delivery-${r.scac}`)).getByRole('textbox').value).toBe('09/02/2026')
    }
    // Every row is now date-complete, so the auto-check rule (same as a
    // per-row edit) includes them all.
    for (const r of tlRows) {
      expect(inclCheckbox(r.scac).checked).toBe(true)
    }
  })

  it('Apply only overwrites the date field that was actually supplied', () => {
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
    openSetupModal()
    fillModalDate('Planned Pickup for All', '09/01/2026')
    // Planned Delivery for All left blank.
    applySetupModal()

    for (const r of tlRows) {
      expect(within(screen.getByTestId(`pickup-${r.scac}`)).getByRole('textbox').value).toBe('09/01/2026')
      // Existing (order-seeded) delivery date survives untouched.
      expect(within(screen.getByTestId(`delivery-${r.scac}`)).getByRole('textbox').value).toBe(DEF_DELIVERY)
    }
  })

  it('Cancel discards the draft without touching any row', () => {
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
    openSetupModal()
    fillModalDate('Planned Pickup for All', '09/01/2026')
    cancelSetupModal()

    expect(screen.queryByRole('dialog', { name: 'Quote Setup' })).toBeFalsy()
    expect(within(screen.getByTestId(`pickup-${tlRows[0].scac}`)).getByRole('textbox').value).toBe(DEF_PICKUP)
  })

  // Task 5, step 1(d): the duration picked in the modal reaches
  // `onTermsChange` as `{ durationMin, flexiblePickup }`.
  it('Apply reports the picked duration and flexible flag via onTermsChange', () => {
    const onTermsChange = vi.fn()
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
        onTermsChange={onTermsChange}
      />
    )
    openSetupModal()
    pickModalDuration('40 min')
    fireEvent.click(screen.getByLabelText('Flexible'))
    applySetupModal()

    expect(onTermsChange).toHaveBeenCalledTimes(1)
    expect(onTermsChange).toHaveBeenCalledWith({ durationMin: 40, flexiblePickup: true })
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
    // All is the default mode — the count spans every built row.
    expect(screen.getByText(`${allRows.length} carriers`)).toBeTruthy()
    showMode('TL')
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
    openSetupModal()
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
    // The default is a real seeded value now (30 min), not a placeholder —
    // seeded into the modal's draft.
    openSetupModal()
    expect(screen.getByLabelText('Quote Duration').value).toBe('30 min')
    cancelSetupModal()

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
    // An existing quote's own duration still wins over the 30-min default,
    // seeded into the modal's draft.
    openSetupModal()
    expect(screen.getByLabelText('Quote Duration').value)
      .toBe(`${otherList.defaultDurationMin} min`)
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

  // 2026-08-20 (Task 7): Cancel is gone — only Save Draft + Send x/y RFQ.
  it('spreads the two actions as separate buttons, trailing, below the table', () => {
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    const actions = container.querySelector('.setup-carriers__actions')
    expect(within(actions).getByRole('button', { name: 'Save Draft' })).toBeTruthy()
    expect(within(actions).getByRole('button', { name: /^Send \d+\/\d+ RFQ$/ })).toBeTruthy()
    // Below the table, NOT in the card header and NOT in the top toolbar row.
    expect(actions.closest('.sub-accordion__header-row')).toBeFalsy()
    expect(container.querySelector('.setup-carriers__toolbar-top').contains(actions)).toBe(false)
    const table = container.querySelector('.setup-carriers__table-wrap')
    expect(table.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  // Task 7 (2026-08-20, user): Cancel is DROPPED from the actions row — Save
  // Draft and Send RFQ trail right on their own, nothing leads on the left.
  it('renders no Cancel button in the actions row', () => {
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    const actions = container.querySelector('.setup-carriers__actions')
    expect(within(actions).queryByRole('button', { name: 'Cancel' })).toBeFalsy()
  })

  // RFQ terms moved into the Quote Setup modal (Task 5) — the head no longer
  // carries a `controls` block, so what remains to pin down is just the
  // toolbar (count + Setup Quote trigger) sitting above the table.
  it('stacks the head, then the count toolbar, then the table', () => {
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
    const head = container.querySelector('.setup-carriers__head')
    const toolbar = container.querySelector('.setup-carriers__toolbar-top')
    const table = container.querySelector('.setup-carriers__table-wrap')

    // All is the default mode — the count spans every built row.
    expect(within(toolbar).getByText(`${allRows.length} carriers`)).toBeTruthy()
    expect(within(toolbar).getByRole('button', { name: 'Setup Quote' })).toBeTruthy()

    // document order: head → toolbar → table
    const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING
    expect(head.compareDocumentPosition(toolbar) & FOLLOWING).toBeTruthy()
    expect(toolbar.compareDocumentPosition(table) & FOLLOWING).toBeTruthy()
  })

  // 2026-08-20 (Task 7): with Cancel gone, Save Draft + Send RFQ are the only
  // two actions — both trail right, no lead-left affordance anymore.
  it('Save Draft and Send RFQ both trail right in the actions row', () => {
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    const actions = container.querySelector('.setup-carriers__actions')
    const save = within(actions).getByRole('button', { name: 'Save Draft' })
    const send = sendRFQButton()

    expect(save.closest('.setup-carriers__actions-trail')).toBeTruthy()
    expect(send.closest('.setup-carriers__actions-trail')).toBeTruthy()
    expect(save.compareDocumentPosition(send) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    // md sizing; Send RFQ stays the primary
    for (const b of [save, send]) {
      expect(b.className).toContain('btn--md')
    }
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
    // All is the default mode — the count spans every built row.
    expect(screen.getByText(`${allRows.length} carriers`)).toBeTruthy()
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
      expect(sendRFQButton().disabled).toBe(false)

      for (const mode of ['TL', 'LTL']) {
        showMode(mode)
        fireEvent.click(selectAllCheckbox()) // check-all → …
        fireEvent.click(selectAllCheckbox()) // … → clear-all for this mode
      }
      expect(sendRFQButton().disabled).toBe(true)
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
      // Scoped to TL (2026-08-20: All is now the default mode, and select-all
      // must stay scoped to what's ON SCREEN — pin it to TL explicitly so this
      // test isolates one list's rows the way it always intended to).
      showMode('TL')
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
      // Scoped to TL (2026-08-20: All is now the default mode).
      showMode('TL')
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
      // Scoped to TL (2026-08-20: All is now the default mode, and LTL has its
      // own preselected-off Routed carrier that would otherwise stop the
      // "every selectable row included" state this test pins).
      showMode('TL')
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

  // 2026-08-19 (user): "buttons should not disappear, they can get disabled
  // when bid is sent". A control that vanishes reads as a rendering bug and
  // moves everything below it; a disabled one keeps its place and says why.
  it('readOnly DISABLES the actions rather than removing them', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    expect(sendRFQButton().disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Save Draft' }).disabled).toBe(true)
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
      fireEvent.click(sendRFQButton())
      // Modal is up, nothing sent yet.
      expect(screen.getByRole('dialog', { name: 'Send RFQ' })).toBeTruthy()
      expect(onSendRFQ).not.toHaveBeenCalled()

      fireEvent.click(screen.getByRole('button', { name: /Confirm & Send/ }))
      expect(onSendRFQ).toHaveBeenCalledTimes(1)
    })

    it('cancelling the modal closes it and sends nothing', () => {
      const onSendRFQ = vi.fn()
      renderAndComplete(onSendRFQ)
      fireEvent.click(sendRFQButton())
      const dialog = screen.getByRole('dialog', { name: 'Send RFQ' })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByRole('dialog', { name: 'Send RFQ' })).toBeFalsy()
      expect(onSendRFQ).not.toHaveBeenCalled()
    })

    it('summarises the carriers, the duration and the flexible-pickup flag', () => {
      const rows = renderAndComplete()
      openSetupModal()
      fireEvent.click(screen.getByLabelText('Flexible'))
      applySetupModal()
      fireEvent.click(sendRFQButton())
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

      expect(dialog.getByText('30 min')).toBeTruthy() // flat default (2026-08-19)
      expect(dialog.getByText('Yes')).toBeTruthy() // Flexible Pickup
      // Both lists contribute now, so the summary names the composite.
      expect(dialogText).toContain(NAMED_LISTS[0].name)
      expect(dialogText).toContain(NAMED_LISTS[1].name)
    })
  })

  // 2026-08-20 (user): the Shipment Summary field grid moved out of this
  // component entirely — the shipment context is now a sticky
  // SpotSummaryStrip the PARENT (SpotBoardTab) renders. SetupCarriers no
  // longer takes a `summaryFields` prop or renders either grid/strip markup.
  it('no longer renders a shipment-context field grid or strip of its own', () => {
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
    expect(container.querySelector('.order-pane__fields-grid')).toBeFalsy()
    expect(container.querySelector('.summary-strip')).toBeFalsy()
    expect(screen.queryByText('Shipment Summary')).toBeFalsy()
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

    // 2026-08-19 (user): a DurationPicker seeded at a flat 30 min, replacing
    // the free-text field whose placeholder advertised a per-list default. The
    // list defaults (120 TL / 240 LTL) no longer seed it — and 240 could not be
    // picked anyway in a minutes picker capped at 120. 2026-08-20 (Task 5):
    // the field itself moved into the Quote Setup modal — its draft reseeds
    // from the committed value every time the modal opens, mode included.
    it('seeds at 30 min regardless of mode, with no per-list placeholder', () => {
      renderIt()
      openSetupModal()
      expect(screen.getByLabelText('Quote Duration').value).toBe('30 min')
      expect(screen.queryByText(/open window/i)).toBeFalsy()
      cancelSetupModal()

      showMode('LTL')
      openSetupModal()
      expect(screen.getByLabelText('Quote Duration').value).toBe('30 min')
    })

    it('the label carries no unit suffix', () => {
      renderIt()
      openSetupModal()
      expect(screen.queryByText(/open window, min/i)).toBeFalsy()
    })

    it('an untouched picker sends the 30-minute default', () => {
      const onSendRFQ = vi.fn()
      renderIt(onSendRFQ)
      fillDate(tlRows[0].scac, 'pickup', '08/10/2026')
      fillDate(tlRows[0].scac, 'delivery', '08/11/2026')
      sendRFQ()
      expect(onSendRFQ.mock.calls[0][0].durationMin).toBe(30)
    })

    it('a picked value wins over the default, and switching mode does not clobber it', () => {
      const onSendRFQ = vi.fn()
      renderIt(onSendRFQ)
      openSetupModal()
      pickModalDuration('40 min')
      applySetupModal()

      showMode('LTL')
      showMode('TL')
      openSetupModal()
      expect(screen.getByLabelText('Quote Duration').value).toBe('40 min')
      cancelSetupModal()

      fillDate(tlRows[0].scac, 'pickup', '08/10/2026')
      fillDate(tlRows[0].scac, 'delivery', '08/11/2026')
      sendRFQ()
      expect(onSendRFQ.mock.calls[0][0].durationMin).toBe(40)
    })
  })
})
