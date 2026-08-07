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

const list = NAMED_LISTS[0]
// Both lists are BUILT, but the TL/LTL toggle shows one at a time (S112).
const allRows = NAMED_LISTS.flatMap((l) => buildCarrierRows(l, carrierOptions))
const tlRows = buildCarrierRows(NAMED_LISTS[0], carrierOptions)
const ltlRows = buildCarrierRows(NAMED_LISTS[1], carrierOptions)

function showMode(label) {
  fireEvent.click(screen.getByRole('button', { name: `Show ${label} carriers` }))
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

  it('rows build with empty dates and start unchecked — no prefill', () => {
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
    const wrap = screen.getByTestId(`pickup-${rows[0].scac}`)
    expect(within(wrap).getByRole('textbox').value).toBe('')
    const deliveryWrap = screen.getByTestId(`delivery-${rows[0].scac}`)
    expect(within(deliveryWrap).getByRole('textbox').value).toBe('')
    expect(inclCheckbox(rows[0].scac).checked).toBe(false)
  })

  it('a row date stays editable', () => {
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
    fillDate(rows[0].scac, 'pickup', '09/01/2026')
    const wrap = screen.getByTestId(`pickup-${rows[0].scac}`)
    expect(within(wrap).getByRole('textbox').value).toBe('09/01/2026')
  })

  it('no dates typed leaves Send RFQ disabled', () => {
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
    // listId/listName now describe the lists actually BEING SENT, not a
    // single up-front pick — only the TL row was included here.
    expect(payload.listId).toBe(list.id)
    expect(payload.listName).toBe(list.name)
    expect(payload.durationMin).toBe(list.defaultDurationMin)
    expect(payload.carriers).toHaveLength(allRows.length) // both modes ride along
    for (const r of payload.carriers.filter((c) => c.incl)) {
      expect(r.plannedPickup).toBe('08/10/2026')
      expect(r.plannedDelivery).toBe('08/11/2026')
    }
  })

  it('onSendRFQ payload reflects the Flexible Pickup checkbox', () => {
    const onSendRFQ = vi.fn()
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
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

  it('shows ONE list at a time behind the TL/LTL toggle — there is no picker', () => {
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
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

    // no list ComboBox anywhere
    expect(within(container.querySelector('.setup-carriers__controls')).queryByRole('combobox')).toBeFalsy()
    expect(screen.queryByText('Carrier List (select exactly one)')).toBeFalsy()
  })

  it('keeps inclusions and dates when toggling between modes', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
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

  it('stacks the RFQ terms, then count+toggle, then the table', () => {
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    const toolbar = container.querySelector('.setup-carriers__toolbar-top')
    const controls = container.querySelector('.setup-carriers__controls')
    const table = container.querySelector('.setup-carriers__table-wrap')

    // The terms lead the card (below the accordion header) as a SIBLING of the
    // table; count and toggle sit between them and the table.
    expect(within(toolbar).getByRole('button', { name: 'Show LTL carriers' })).toBeTruthy()
    expect(toolbar.contains(controls)).toBe(false)
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
    it('rows start unchecked', () => {
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
      for (const r of rows) expect(inclCheckbox(r.scac).checked).toBe(false)
    })

    it('the checkbox is disabled while a date is missing, enabled once both dates are present', () => {
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
      const scac = rows[0].scac
      expect(inclCheckbox(scac).disabled).toBe(true)

      fillDate(scac, 'pickup', '08/10/2026')
      expect(inclCheckbox(scac).disabled).toBe(true)

      fillDate(scac, 'delivery', '08/11/2026')
      expect(inclCheckbox(scac).disabled).toBe(false)
    })

    it('completing a row by editing its second date auto-checks it', () => {
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
      const scac = rows[0].scac
      fillDate(scac, 'pickup', '08/10/2026')
      expect(inclCheckbox(scac).checked).toBe(false)

      fillDate(scac, 'delivery', '08/11/2026')
      expect(inclCheckbox(scac).checked).toBe(true)
    })

    it('clearing a date unchecks the row and disables the checkbox again', () => {
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
          readOnly={false}
          onSaveDraft={() => {}}
          onSendRFQ={() => {}}
          onCancel={() => {}}
        />
      )
      const rows = buildCarrierRows(list, carrierOptions)
      const scac = rows[0].scac
      expect(actionButton('Send RFQ').disabled).toBe(true)
      fillDate(scac, 'pickup', '08/10/2026')
      fillDate(scac, 'delivery', '08/11/2026')
      expect(actionButton('Send RFQ').disabled).toBe(false)
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
      expect(selectAllCheckbox().disabled).toBe(true)
      expect(selectAllCheckbox().checked).toBe(false)
    })

    it('toggling it on includes exactly the date-complete rows, leaving date-less rows excluded', () => {
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
      const complete = rows[0].scac
      const incomplete = rows[1].scac
      fillDate(complete, 'pickup', '08/10/2026')
      fillDate(complete, 'delivery', '08/11/2026')

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

      // exactly the INCLUDED carrier, named
      expect(dialog.getByText(`${rows[0].scac} · ${rows[0].name}`)).toBeTruthy()
      expect(dialog.getByText(/will be sent to 1 carrier/)).toBeTruthy()
      // a carrier that was never date-completed must not be listed
      expect(dialog.queryByText(new RegExp(rows[1].scac))).toBeFalsy()

      expect(dialog.getByText(`${NAMED_LISTS[0].defaultDurationMin} min`)).toBeTruthy()
      expect(dialog.getByText('Yes')).toBeTruthy() // Flexible Pickup
      expect(dialog.getByText(NAMED_LISTS[0].name)).toBeTruthy()
    })
  })

  it('renders the shipment context as an order-view field grid, not a stat strip', () => {
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
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
