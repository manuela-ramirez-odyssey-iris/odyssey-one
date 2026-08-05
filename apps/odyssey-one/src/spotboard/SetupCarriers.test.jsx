// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import SetupCarriers from './SetupCarriers'
import { NAMED_LISTS, buildCarrierRows } from './carrierList'

const carrierOptions = [
  { value: 'ODFL', label: 'ODFL - Old Dominion Freight Line' },
  { value: 'FXFE', label: 'FXFE - FedEx Freight' },
  { value: 'SAIA', label: 'SAIA - Saia Inc' },
  { value: 'UPGF', label: 'UPGF - UPS Freight' },
]

const list = NAMED_LISTS[0]

// ComboBox's typeahead popover is virtualized (@tanstack/react-virtual), which
// renders zero rows in jsdom — so picking drives the keyboard path instead of
// clicking a rendered row (the `matches` array driving Enter-select is real
// regardless of what the virtualizer paints). NAMED_LISTS[0] is first in
// LIST_OPTIONS, so one ArrowDown lands on it.
function pickList(container) {
  const input = within(container.querySelector('.setup-carriers__controls')).getByRole('combobox')
  fireEvent.focus(input)
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  fireEvent.keyDown(input, { key: 'Enter' })
}

function fillDate(scac, field, value) {
  const wrap = screen.getByTestId(`${field}-${scac}`)
  const input = within(wrap).getByRole('textbox')
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
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

  it('Send RFQ becomes enabled after choosing a list and filling dates for included rows', () => {
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    pickList(container)

    const rows = buildCarrierRows(list, carrierOptions)
    const included = rows.filter((r) => r.incl)
    for (const r of included) {
      fillDate(r.scac, 'pickup', '08/10/2026')
      fillDate(r.scac, 'delivery', '08/11/2026')
    }

    expect(screen.getByText('Send RFQ').closest('button').disabled).toBe(false)
  })

  it('onSendRFQ is called with the assembled payload', () => {
    const onSendRFQ = vi.fn()
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={onSendRFQ}
        onCancel={() => {}}
      />
    )
    pickList(container)

    const rows = buildCarrierRows(list, carrierOptions)
    const included = rows.filter((r) => r.incl)
    for (const r of included) {
      fillDate(r.scac, 'pickup', '08/10/2026')
      fillDate(r.scac, 'delivery', '08/11/2026')
    }

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
    const { container } = render(
      <SetupCarriers
        carrierOptions={carrierOptions}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={onSendRFQ}
        onCancel={() => {}}
      />
    )
    pickList(container)

    const rows = buildCarrierRows(list, carrierOptions)
    const included = rows.filter((r) => r.incl)
    for (const r of included) {
      fillDate(r.scac, 'pickup', '08/10/2026')
      fillDate(r.scac, 'delivery', '08/11/2026')
    }

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
