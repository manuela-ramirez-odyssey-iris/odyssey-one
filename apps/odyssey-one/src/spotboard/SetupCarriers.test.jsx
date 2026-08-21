// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import SetupCarriers from './SetupCarriers'
import { buildOverflowRows } from './carrierList'

// Mirrors the real getLookupOptions('carrier') pool shape ({value, label,
// meta: {mode}}) — a mix of TL/LTL carriers.
const carrierOptions = [
  { value: 'KNGT', label: 'KNGT - Knight-Swift Transportation', meta: { mode: 'TL' } },
  { value: 'SCNN', label: 'SCNN - Schneider National', meta: { mode: 'TL' } },
  { value: 'JBHT', label: 'JBHT - J.B. Hunt Transport', meta: { mode: 'TL' } },
  { value: 'WERN', label: 'WERN - Werner Enterprises', meta: { mode: 'TL' } },
  { value: 'CRST', label: 'CRST - CRST International', meta: { mode: 'TL' } },
  { value: 'SWFT', label: 'SWFT - Swift Transportation', meta: { mode: 'TL' } },
  { value: 'PRIJ', label: 'PRIJ - Prime Inc', meta: { mode: 'TL' } },
  { value: 'ODFL', label: 'ODFL - Old Dominion Freight Line', meta: { mode: 'LTL' } },
  { value: 'SAIA', label: 'SAIA - Saia LTL Freight', meta: { mode: 'LTL' } },
  { value: 'ABFS', label: 'ABFS - ABF Freight System', meta: { mode: 'LTL' } },
  { value: 'AACT', label: 'AACT - AAA Cooper Transportation', meta: { mode: 'LTL' } },
  { value: 'EXLA', label: 'EXLA - Estes Express Lines', meta: { mode: 'LTL' } },
  { value: 'FXFE', label: 'FXFE - FedEx Freight', meta: { mode: 'LTL' } },
  { value: 'SEFL', label: 'SEFL - Southeastern Freight Lines', meta: { mode: 'LTL' } },
]

// The pane seeds planned dates from the order (SpotBoardTab passes these) —
// rows arrive preselected AND dated, which is the state Send RFQ needs. Tests
// that deliberately exercise the undated case simply omit them.
const DEF_PICKUP = '08/01/2026'
const DEF_DELIVERY = '08/02/2026'

// Rows are now derived PER SHIPMENT (S128) off the route guide + dropped
// carriers, not a static NAMED_LISTS fixture — this shipment's route guide
// declined one TL carrier (PRIJ), giving every test that needs "a Routed
// row" something real to find. `buildOverflowRows` is pure, so the module-
// level `tlRows`/`ltlRows`/`allRows` below are byte-identical to whatever
// SetupCarriers builds internally off the same two arguments.
const shipmentDetailsFixture = {
  orderDetails: [{ orderNumber: 'TEST-001' }],
  routingData: {
    options: [{ scac: 'PRIJ', carrierName: 'Prime Inc', equipment: 'Van', status: 'Declined' }],
  },
  // LTL gets its OWN route-guide exception (a dropped carrier) — mirrors the
  // real-world shape (a route guide only ever considers one equipment mode,
  // so TL's Declined option and LTL's dropped carrier stand in for two
  // different shipments' route guides layered onto one fixture) and keeps
  // every mode-scoped test below from accidentally observing the OTHER
  // mode's fully-preselected list.
  droppedCarriers: [{ scac: 'SAIA', carrierName: 'Saia', equipment: 'LTL', reason: 'No Rates' }],
}

const allRows = buildOverflowRows(shipmentDetailsFixture, carrierOptions)
const tlRows = allRows.filter((r) => r.listId === 'TL')
const ltlRows = allRows.filter((r) => r.listId === 'LTL')

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

// Quote Setup modal (Task 5) — Duration / Planned Pickup / Planned Delivery /
// Flexible, behind the "Quote Setup" trigger (round 2: renamed from "Setup
// Quote", primary variant) trailing the carrier-count row. The date labels
// dropped their "General" prefix (user, 2026-08-21) to match the table's own
// column headers.
function setupQuoteButton() {
  return screen.getByRole('button', { name: 'Quote Setup' })
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
    const rows = tlRows
    const quote = { listId: 'TL', listName: 'TL', durationMin: 120, carriers: rows }
    render(
      <SetupCarriers
        quote={quote}
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
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
        shipmentDetails={shipmentDetailsFixture}
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
        shipmentDetails={shipmentDetailsFixture}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    const rows = tlRows
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
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    const rows = tlRows
    for (const r of rows) {
      expect(within(screen.getByTestId(`pickup-${r.scac}`)).getByRole('textbox').value).toBe(DEF_PICKUP)
      expect(within(screen.getByTestId(`delivery-${r.scac}`)).getByRole('textbox').value).toBe(DEF_DELIVERY)
    }
  })

  it('a row date stays editable', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    const rows = tlRows
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
        shipmentDetails={shipmentDetailsFixture}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    expect(sendRFQButton().disabled).toBe(true)
  })

  it('onSendRFQ is called with the assembled payload once a row is date-complete and checked', () => {
    const onSendRFQ = vi.fn()
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={onSendRFQ}
      />
    )

    const rows = tlRows
    fillDate(rows[0].scac, 'pickup', '08/10/2026')
    fillDate(rows[0].scac, 'delivery', '08/11/2026')
    sendRFQ()

    expect(onSendRFQ).toHaveBeenCalledTimes(1)
    const payload = onSendRFQ.mock.calls[0][0]
    // listId/listName describe the lists actually BEING SENT. Under
    // preselection BOTH lists contribute by default, so the composite is the
    // correct answer — it is no longer possible to send only one list without
    // deliberately excluding the other.
    expect(payload.listId).toBe('TL+LTL')
    expect(payload.listName).toBe('TL + LTL')
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
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={onSendRFQ}
      />
    )

    const rows = tlRows
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
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
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
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
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
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
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
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
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

  // Restructured round 2 (2026-08-21, user): the SubAccordion owns the
  // "Setup & Carriers" title again, and the pill band moved INSIDE it,
  // between the header and the count+button toolbar row. Quote
  // Duration/Flexible still don't live in this component's card at all — a
  // committed quote's countdown now shows in the sticky strip (SpotBoardTab),
  // not here.
  it('the accordion carries the "Setup & Carriers" title, with the pill band inside it, before the toolbar', () => {
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    const title = container.querySelector('.sub-accordion__title')
    const content = container.querySelector('.sub-accordion__content')
    const band = screen.getByRole('group', { name: 'Carrier list mode' })
    const toolbar = container.querySelector('.setup-carriers__toolbar-top')

    expect(title.textContent.trim()).toBe('Setup & Carriers')
    // No double heading — the old lifted-out `<h3>` is gone.
    expect(container.querySelector('.setup-carriers__heading')).toBeFalsy()
    expect(content.contains(band)).toBe(true)
    expect(container.querySelector('.setup-carriers__controls')).toBeFalsy()
    // Nothing renders the RFQ terms outside the modal while no quote is open.
    expect(screen.queryByLabelText('Quote Duration')).toBeFalsy()
    expect(screen.queryByLabelText('Flexible')).toBeFalsy()

    const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING
    expect(title.compareDocumentPosition(band) & FOLLOWING).toBeTruthy()
    expect(band.compareDocumentPosition(toolbar) & FOLLOWING).toBeTruthy()
  })

  // Task 5, step 1(a)/(b): the trigger and the modal it opens. Round 2:
  // renamed "Setup Quote" → "Quote Setup", secondary → primary.
  it('a "Quote Setup" primary button renders trailing the carrier-count row', () => {
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    const toolbar = container.querySelector('.setup-carriers__toolbar-top')
    const button = within(toolbar).getByRole('button', { name: 'Quote Setup' })
    expect(button.className).toContain('btn--primary')
    // All is the default mode — the toolbar count spans every built row.
    const count = within(toolbar).getByText(`${allRows.length} carriers`)
    expect(count.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('clicking Quote Setup opens a dialog containing the four fields', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    expect(screen.queryByRole('dialog', { name: 'Quote Setup' })).toBeFalsy()
    const dialog = within(openSetupModal())
    expect(dialog.getByLabelText('Quote Duration')).toBeTruthy()
    expect(dialog.getByLabelText('Planned Pickup')).toBeTruthy()
    expect(dialog.getByLabelText('Planned Delivery')).toBeTruthy()
    expect(dialog.getByLabelText('Flexible')).toBeTruthy()
  })

  it('the Setup Quote trigger is disabled when the pane is readOnly', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
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
        shipmentDetails={shipmentDetailsFixture}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    openSetupModal()
    fillModalDate('Planned Pickup', '09/01/2026')
    fillModalDate('Planned Delivery', '09/02/2026')
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

  // 2026-08-21 (user): the general fields are the single source that sets
  // every row's dates AT ONCE — so on a fresh mount they open PRE-FILLED with
  // the order defaults, matching what the rows already show.
  it('opens pre-filled with the order defaults on a fresh (no-quote) mount, matching the rows', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    const dialog = within(openSetupModal())
    expect(dialog.getByLabelText('Planned Pickup').value).toBe(DEF_PICKUP)
    expect(dialog.getByLabelText('Planned Delivery').value).toBe(DEF_DELIVERY)
  })

  // Mounting from an existing quote is the other case: the quote's own rows
  // carry per-row dates that may already diverge from each other, so there is
  // no single stored "general" value to show — it starts blank rather than
  // guessing at one row's date.
  it('opens with BLANK general dates when mounting from an existing quote', () => {
    const rows = tlRows.map((r, i) => ({
      ...r, plannedPickup: DEF_PICKUP, plannedDelivery: i === 0 ? DEF_DELIVERY : '09/09/2026',
    }))
    const quote = { listId: 'TL', listName: 'TL', durationMin: 120, carriers: rows }
    render(
      <SetupCarriers
        quote={quote}
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    const dialog = within(openSetupModal())
    expect(dialog.getByLabelText('Planned Pickup').value).toBe('')
    expect(dialog.getByLabelText('Planned Delivery').value).toBe('')
  })

  // The core of the fix (user, 2026-08-21): "if quote setup modal dates are
  // empty i expect the individual carrier dates are also empty" — clearing
  // both general fields and applying must clear EVERY row, not leave the
  // order defaults standing. The old "only overwrite what's supplied" rule
  // (leave the other field alone when one was left blank) is gone — the
  // general fields are now assigned unconditionally, clears included.
  it('clearing both general dates and applying blanks every row and unchecks it', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    openSetupModal()
    fillModalDate('Planned Pickup', '')
    fillModalDate('Planned Delivery', '')
    applySetupModal()

    for (const r of allRows) {
      expect(within(screen.getByTestId(`pickup-${r.scac}`)).getByRole('textbox').value).toBe('')
      expect(within(screen.getByTestId(`delivery-${r.scac}`)).getByRole('textbox').value).toBe('')
      expect(inclCheckbox(r.scac).checked).toBe(false)
    }
  })

  // "when i open the modal again im expecting those to be preserved unless
  // page is reloaded" (user, 2026-08-21) — an applied general date survives a
  // close + reopen of the SAME modal instance (no remount), because it reads
  // from committed state, not a blank reseed.
  it('preserves the applied general dates across a modal close and reopen', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    openSetupModal()
    fillModalDate('Planned Pickup', '09/01/2026')
    fillModalDate('Planned Delivery', '09/02/2026')
    applySetupModal()

    const dialog = within(openSetupModal())
    expect(dialog.getByLabelText('Planned Pickup').value).toBe('09/01/2026')
    expect(dialog.getByLabelText('Planned Delivery').value).toBe('09/02/2026')
  })

  // A per-row edit made directly in the table (never through the modal) must
  // not leak into the committed general state — the general fields only ever
  // change via Apply.
  it('a per-row date edit does not change what the general fields show on the next open', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    fillDate(tlRows[0].scac, 'pickup', '07/04/2026')

    const dialog = within(openSetupModal())
    expect(dialog.getByLabelText('Planned Pickup').value).toBe(DEF_PICKUP)
  })

  // Coordinator follow-up (2026-08-21): a planner who deliberately unchecked
  // a dated carrier, then reopens the modal only to tweak Duration/Flexible
  // (never touching the date fields), must not get that carrier silently
  // re-included by Apply — the draft dates equal the row's own dates, so the
  // row (dates AND incl) is left completely untouched.
  it('Apply leaves a deliberately-unchecked, still-dated row untouched when only Duration changes', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    // Preselected + dated by default — uncheck it deliberately.
    fireEvent.click(inclCheckbox(tlRows[0].scac))
    expect(inclCheckbox(tlRows[0].scac).checked).toBe(false)

    openSetupModal()
    pickModalDuration('40 min') // only Duration touched, dates left at their pre-filled default
    applySetupModal()

    expect(inclCheckbox(tlRows[0].scac).checked).toBe(false)
    expect(within(screen.getByTestId(`pickup-${tlRows[0].scac}`)).getByRole('textbox').value).toBe(DEF_PICKUP)
    expect(within(screen.getByTestId(`delivery-${tlRows[0].scac}`)).getByRole('textbox').value).toBe(DEF_DELIVERY)
  })

  it('Cancel discards the draft without touching any row', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    openSetupModal()
    fillModalDate('Planned Pickup', '09/01/2026')
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
        shipmentDetails={shipmentDetailsFixture}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
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

  it('the LTL mode payload carries the "LTL" list — TL carries "TL"', () => {
    const onSendRFQ = vi.fn()
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={onSendRFQ}
      />
    )
    showMode('LTL')
    fillDate(ltlRows[0].scac, 'pickup', '08/10/2026')
    fillDate(ltlRows[0].scac, 'delivery', '08/11/2026')
    sendRFQ()

    const payload = onSendRFQ.mock.calls[0][0]
    // Both lists ride along by default now (preselection), so the composite is
    // expected — the LTL list is present, which is what this pins.
    expect(payload.listId).toContain('LTL')
    expect(payload.listName).toContain('LTL')
  })

  it('keeps inclusions and dates when toggling between modes', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
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
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
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
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    openSetupModal()
    expect(screen.getByText('Quote Duration')).toBeTruthy()
  })

  it('builds EVERY named list on mount, even though only one shows', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
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
    const rows = ltlRows
    const quote = { listId: 'LTL', listName: 'LTL', durationMin: 45, carriers: rows }
    render(
      <SetupCarriers
        quote={quote}
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    // Only the quote's own carriers render — not both lists rebuilt.
    expect(screen.getByText(`${rows.length} carriers`)).toBeTruthy()
    // An existing quote's own duration still wins over the 30-min default,
    // seeded into the modal's draft.
    openSetupModal()
    expect(screen.getByLabelText('Quote Duration').value).toBe('45 min')
  })

  it('shows a carrier count in the toolbar', () => {
    const rows = tlRows
    const quote = { listId: 'TL', listName: 'TL', durationMin: 120, carriers: rows }
    render(
      <SetupCarriers
        quote={quote}
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    expect(screen.getByText(`${rows.length} carriers`)).toBeTruthy()
  })

  // 2026-08-20 (Task 7): Cancel is gone — only Save Draft + Send x/y RFQ.
  it('spreads the two actions as separate buttons, trailing, below the table', () => {
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
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
        shipmentDetails={shipmentDetailsFixture}
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

  // RFQ terms moved into the Quote Setup modal (Task 5). Round 2: the mode
  // pills moved inside the accordion too, so document order inside it is
  // pills → count toolbar → table.
  it('stacks the pill band, then the count toolbar, then the table', () => {
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    const band = screen.getByRole('group', { name: 'Carrier list mode' })
    const toolbar = container.querySelector('.setup-carriers__toolbar-top')
    const table = container.querySelector('.setup-carriers__table-wrap')

    // All is the default mode — the count spans every built row.
    expect(within(toolbar).getByText(`${allRows.length} carriers`)).toBeTruthy()
    expect(within(toolbar).getByRole('button', { name: 'Quote Setup' })).toBeTruthy()

    // document order: pill band → toolbar → table
    const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING
    expect(band.compareDocumentPosition(toolbar) & FOLLOWING).toBeTruthy()
    expect(toolbar.compareDocumentPosition(table) & FOLLOWING).toBeTruthy()
  })

  // 2026-08-20 (Task 7): with Cancel gone, Save Draft + Send RFQ are the only
  // two actions — both trail right, no lead-left affordance anymore.
  it('Save Draft and Send RFQ both trail right in the actions row', () => {
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
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
        shipmentDetails={shipmentDetailsFixture}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    // First render: carrierOptions is still empty (async pool not resolved yet).
    expect(screen.getByText('0 carriers')).toBeTruthy()

    rerender(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )

    const rows = tlRows
    // All is the default mode — the count spans every built row.
    expect(screen.getByText(`${allRows.length} carriers`)).toBeTruthy()
    expect(screen.getByTestId(`pickup-${rows[0].scac}`)).toBeTruthy()
  })

  it('does not clobber user edits when carrierOptions changes again after rows are already populated', () => {
    const { rerender } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
      />
    )
    const rows = tlRows
    fillDate(rows[0].scac, 'pickup', '08/10/2026')

    // A new carrierOptions array (same content, new reference) arrives, as
    // would happen on a parent re-render — must not wipe the date just typed.
    rerender(
      <SetupCarriers
        carrierOptions={[...carrierOptions]}
        shipmentDetails={shipmentDetailsFixture}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
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
          shipmentDetails={shipmentDetailsFixture}
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
        />
      )
      const rows = tlRows
      for (const r of rows) {
        expect(inclCheckbox(r.scac).checked).toBe(!r.flags.includes('Routed'))
      }
    })

    it('the checkbox is disabled while a date is missing, enabled once both dates are present', () => {
      render(
        <SetupCarriers
          carrierOptions={carrierOptions}
          shipmentDetails={shipmentDetailsFixture}
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
        />
      )
      // The gate is ASYMMETRIC now: it blocks turning a carrier ON without
      // dates, never turning one OFF. So it is observable on a routed row
      // (starts excluded) with its dates cleared — a preselected row is always
      // enabled, precisely so it can be opted out of.
      const rows = tlRows
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
          shipmentDetails={shipmentDetailsFixture}
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
        />
      )
      // Exercised on a ROUTED row, the only kind that starts unchecked now —
      // and the only kind whose dates start empty when defaults are supplied…
      // except they don't, so clear them first to reach the undated state.
      const rows = tlRows
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
          shipmentDetails={shipmentDetailsFixture}
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
        />
      )
      const rows = tlRows
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
          shipmentDetails={shipmentDetailsFixture}
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
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
          shipmentDetails={shipmentDetailsFixture}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
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
          shipmentDetails={shipmentDetailsFixture}
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
        />
      )
      // Scoped to TL (2026-08-20: All is now the default mode, and select-all
      // must stay scoped to what's ON SCREEN — pin it to TL explicitly so this
      // test isolates one list's rows the way it always intended to).
      showMode('TL')
      const rows = tlRows
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
          shipmentDetails={shipmentDetailsFixture}
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
        />
      )
      // Scoped to TL (2026-08-20: All is now the default mode).
      showMode('TL')
      const rows = tlRows
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
          shipmentDetails={shipmentDetailsFixture}
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
        />
      )
      // Scoped to TL (2026-08-20: All is now the default mode, and LTL has its
      // own preselected-off Routed carrier that would otherwise stop the
      // "every selectable row included" state this test pins).
      showMode('TL')
      const rows = tlRows
      const routed = rows.find((r) => r.flags.includes('Routed'))
      const other = rows.find((r) => !r.flags.includes('Routed'))
      // `other` is already dated + preselected. `routed` already has its
      // default dates too (SetupCarriers seeds every row) but starts
      // unchecked — re-editing its dates fires the same auto-check-on-edit
      // rule any row gets, which is what carries the WHOLE list to "every
      // selectable row included" despite its Routed default.
      fillDate(routed.scac, 'pickup', '08/10/2026')
      fillDate(routed.scac, 'delivery', '08/11/2026')

      // Every row date-complete → select-all reads checked.
      expect(selectAllCheckbox().checked).toBe(true)
      expect(selectAllCheckbox().indeterminate).toBe(false)

      fireEvent.click(selectAllCheckbox())
      expect(inclCheckbox(routed.scac).checked).toBe(false)
      expect(inclCheckbox(other.scac).checked).toBe(false)
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
        shipmentDetails={shipmentDetailsFixture}
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
          shipmentDetails={shipmentDetailsFixture}
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={onSendRFQ}
        />
      )
      const rows = tlRows
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

      // Apply here only changes Flexible — the general dates are unchanged
      // (already the order defaults), so per the change-detection guard
      // (2026-08-21) every row is left untouched, Routed carriers included:
      // Apply must not silently re-include a carrier the user never dated
      // itself into inclusion.
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
      expect(dialogText).toContain('TL')
      expect(dialogText).toContain('LTL')
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
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
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
        shipmentDetails={shipmentDetailsFixture}
        defaultPickup={DEF_PICKUP}
        defaultDelivery={DEF_DELIVERY}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={onSendRFQ}
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

  // Regression (2026-08-21) — SpotBid pane froze on the PREVIOUS shipment's
  // carrier data after clicking a different table row. Root cause: on a
  // shipment switch, BottomBar's `key={selectedShipmentId}` remounts this
  // component before the new shipment's detail query resolves, so the first
  // render still carries the OLD shipment's `shipmentDetails` (react-query
  // `placeholderData: keepPreviousData`). `carrierOptions` (a local pool with
  // no real I/O — lookupService.ts's `getLookupOptions`) always resolves
  // first, so the build effect used to fire off that stale placeholder — and
  // once `rows.length > 0`, its own re-run guard permanently blocked
  // rebuilding once the real per-shipment data landed. `detailsStale` (wired
  // from react-query's `isPlaceholderData`) closes the race: the effect now
  // waits for real data before building even once.
  describe('detailsStale (placeholder-data race)', () => {
    // A second fixture whose route guide declines a DIFFERENT carrier (WERN,
    // not PRIJ) — stands in for "the previous shipment's held-over data".
    const staleFixture = {
      ...shipmentDetailsFixture,
      routingData: {
        options: [{ scac: 'WERN', carrierName: 'Werner Enterprises', equipment: 'Van', status: 'Declined' }],
      },
    }

    it('does not build rows from placeholder shipmentDetails while detailsStale is true', () => {
      render(
        <SetupCarriers
          carrierOptions={carrierOptions}
          shipmentDetails={staleFixture}
          detailsStale
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
        />
      )
      expect(screen.getByText('No carriers in this list.')).toBeTruthy()
      expect(screen.queryByTestId(`pickup-${tlRows[0].scac}`)).toBeNull()
    })

    it('builds rows off the FRESH shipmentDetails once detailsStale flips to false, never off the earlier stale render', () => {
      const { rerender } = render(
        <SetupCarriers
          carrierOptions={carrierOptions}
          shipmentDetails={staleFixture}
          detailsStale
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
        />
      )
      expect(screen.getByText('No carriers in this list.')).toBeTruthy()

      rerender(
        <SetupCarriers
          carrierOptions={carrierOptions}
          shipmentDetails={shipmentDetailsFixture}
          detailsStale={false}
          defaultPickup={DEF_PICKUP}
          defaultDelivery={DEF_DELIVERY}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
        />
      )
      // Rows now exist and reflect shipmentDetailsFixture (PRIJ declined —
      // 'Routed', unselected), NOT staleFixture (which declined WERN instead).
      expect(within(screen.getByTestId(`pickup-PRIJ`).closest('tr')).getByText('Declined')).toBeTruthy()
      expect(inclCheckbox('PRIJ').checked).toBe(false)
    })
  })
})
