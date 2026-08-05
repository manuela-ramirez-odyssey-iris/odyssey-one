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

const header = {
  origin: 'Atlanta, GA',
  destination: 'Charlotte, NC',
  equipment: 'Van',
  distance: '245 mi',
  hazmat: 'No',
  pickupWindow: '08/10/2026 08:00 - 12:00',
}

const list = NAMED_LISTS[0]

function openListDropdown(container) {
  const trigger = container.querySelector('.dropdown-button')
  fireEvent.click(trigger)
}

function pickList(container) {
  openListDropdown(container)
  fireEvent.click(screen.getByText(list.name))
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
        header={header}
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
        header={header}
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
        header={header}
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
        header={header}
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

  it('gives the Carrier List dropdown a visible label and an accessible name', () => {
    const { container } = render(
      <SetupCarriers
        header={header}
        carrierOptions={carrierOptions}
        readOnly={false}
        onSaveDraft={() => {}}
        onSendRFQ={() => {}}
        onCancel={() => {}}
      />
    )
    const toolbar = container.querySelector('.setup-carriers__toolbar')
    expect(within(toolbar).getByText('Carrier List')).toBeTruthy()
    expect(within(toolbar).getByLabelText('Carrier List')).toBeTruthy()
  })

  it('readOnly hides the action buttons', () => {
    render(
      <SetupCarriers
        header={header}
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
