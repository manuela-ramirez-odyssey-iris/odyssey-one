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
    expect(screen.getByText('Send RFQ').closest('button').disabled).toBe(true)
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
    expect(screen.getByText('Send RFQ').closest('button').disabled).toBe(true)
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
    fireEvent.click(screen.getByText('Send RFQ'))

    expect(onSendRFQ).toHaveBeenCalledTimes(1)
    const payload = onSendRFQ.mock.calls[0][0]
    expect(payload.listId).toBe(list.id)
    expect(payload.listName).toBe(list.name)
    expect(payload.durationMin).toBe(list.defaultDurationMin)
    expect(payload.carriers).toHaveLength(rows.length)
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
    fireEvent.click(screen.getByText('Send RFQ'))

    expect(onSendRFQ).toHaveBeenCalledTimes(1)
    expect(onSendRFQ.mock.calls[0][0].flexiblePickup).toBe(true)
  })

  it('gives the Carrier List picker a visible label and an accessible name', () => {
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    const controls = container.querySelector('.setup-carriers__controls')
    expect(within(controls).getByText('Carrier List (select exactly one)')).toBeTruthy()
    expect(within(controls).getByRole('combobox')).toBeTruthy()
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
    expect(screen.getByText('Quote Duration (open window, min)')).toBeTruthy()
  })

  it('defaults to the first named list on mount when there is no existing quote', () => {
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    const rows = buildCarrierRows(list, carrierOptions)
    expect(screen.getByText(`${rows.length} carriers`)).toBeTruthy()
    expect(screen.getByTestId(`pickup-${rows[0].scac}`)).toBeTruthy()
    const combobox = within(container.querySelector('.setup-carriers__controls')).getByRole('combobox')
    expect(combobox.value).toBe(list.name)
    expect(screen.getByLabelText('Quote Duration (open window, min)').value).toBe(String(list.defaultDurationMin))
  })

  it('an existing quote wins over the default list', () => {
    const otherList = NAMED_LISTS[1]
    const rows = buildCarrierRows(otherList, carrierOptions)
    const quote = { listId: otherList.id, listName: otherList.name, durationMin: otherList.defaultDurationMin, carriers: rows }
    const { container } = render(
      <SetupCarriers
        quote={quote}
        carrierOptions={carrierOptions}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    const combobox = within(container.querySelector('.setup-carriers__controls')).getByRole('combobox')
    expect(combobox.value).toBe(otherList.name)
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

  it('moves Send RFQ/Save Draft/Cancel into the toolbar top row', () => {
    const rows = buildCarrierRows(list, carrierOptions)
    const quote = { listId: list.id, listName: list.name, durationMin: list.defaultDurationMin, carriers: rows }
    const { container } = render(
      <SetupCarriers
        quote={quote}
        carrierOptions={carrierOptions}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    const toolbarTop = container.querySelector('.setup-carriers__toolbar-top')
    expect(within(toolbarTop).getByText('Send RFQ')).toBeTruthy()
    expect(within(toolbarTop).getByText('Save Draft')).toBeTruthy()
    expect(within(toolbarTop).getByText('Cancel')).toBeTruthy()
    expect(container.querySelector('.setup-carriers__actions')).toBeFalsy()
  })

  it('keeps the controls row (Carrier List/Quote Duration/Flexible Pickup) out of the sticky toolbar', () => {
    const rows = buildCarrierRows(list, carrierOptions)
    const quote = { listId: list.id, listName: list.name, durationMin: list.defaultDurationMin, carriers: rows }
    const { container } = render(
      <SetupCarriers
        quote={quote}
        carrierOptions={carrierOptions}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    const toolbar = container.querySelector('.setup-carriers__toolbar')
    expect(toolbar.querySelector('.setup-carriers__controls')).toBeFalsy()
    expect(within(toolbar).queryByRole('combobox')).toBeFalsy()
    const controls = container.querySelector('.setup-carriers__controls')
    expect(controls).toBeTruthy()
    expect(toolbar.contains(controls)).toBe(false)
  })

  it('populates the default list once carrierOptions actually resolves, not only on the first (empty) render', () => {
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
    expect(screen.getByText(`${rows.length} carriers`)).toBeTruthy()
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
      const button = screen.getByText('Send RFQ').closest('button')
      expect(button.disabled).toBe(true)

      fillDate(scac, 'pickup', '08/10/2026')
      fillDate(scac, 'delivery', '08/11/2026')
      expect(button.disabled).toBe(false)
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

  it('readOnly hides the action buttons', () => {
    render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        readOnly
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.queryByText('Send RFQ')).toBeFalsy()
    expect(screen.queryByText('Save Draft')).toBeFalsy()
    expect(screen.queryByText('Cancel')).toBeFalsy()
  })
})
