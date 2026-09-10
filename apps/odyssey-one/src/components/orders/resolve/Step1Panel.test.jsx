// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeAll, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import Step1Panel from './Step1Panel.jsx'
import { deriveInterfaceErrors } from './interfaceErrors'
import { freightTermLabel } from '../../../data/master-data'

// jsdom has no layout, so Element.prototype.scrollIntoView is undefined.
// Step1Panel guards the call, but stubbing it here lets the nav test assert
// that the panel really tried to scroll to the right anchor.
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn() })
afterEach(cleanup)

const base = () => ({
  general: { freightTerm: 'P', equipment: 'RR' },
  pickupDelivery: {
    planningDateType: 'SHIP',
    consignor: { address1: '9507 Lynch Junction', city: 'Odessa', state: 'TX', postal: '79761' },
    consignee: { address1: '4304 Predovic Ramp', city: 'Lake Charles', state: 'LA', postal: '70601' },
    earlyPickup: { date: '2026-05-17', time: '09:00', timezone: 'CDT' }, latePickup: { date: '2026-05-17', time: '11:00', timezone: 'CDT' },
    earlyDelivery: { date: '2026-05-24', time: '08:30', timezone: 'CDT' }, lateDelivery: { date: '2026-05-24', time: '11:00', timezone: 'CDT' },
  },
  products: [
    { id: 'prod-1', productId: 'A', grossWeight: { value: '100', uom: 'lbs' }, volume: { value: '10', uom: 'cbf' } },
    { id: 'prod-2', productId: 'B', grossWeight: { value: '200', uom: 'lbs' }, volume: { value: '20', uom: 'cbf' } },
  ],
})

function setup(klass, count, extra = {}) {
  const derived = deriveInterfaceErrors('ORDER-1', count, klass, base())
  const draft = derived.applyErrors(base())
  const onValidate = vi.fn()
  const onCancel = vi.fn()
  const utils = render(<Step1Panel orderNumber="ORDER-1" contextText="ORDER-1 · Integrated from ACME" derived={derived} draft={draft} onValidate={onValidate} onCancel={onCancel} {...extra} />)
  return { ...utils, derived, draft, onValidate, onCancel }
}

// The chip label the panel renders for one conflict option. Wire codes are
// prettified for the paths that have a master-data label table (freight term);
// everything else shows the raw received value. Built from master-data here,
// NOT copied from the component, so a label-table change breaks both together.
const chipLabel = (path, o) =>
  `${path === 'general.freightTerm' ? freightTermLabel(o.value) : o.value} · ${o.lines.length === 1 ? `line ${o.lines[0]}` : `lines ${o.lines.join(', ')}`}`

describe('Step1Panel', () => {
  test('conflicts: alert counts them, picking every field enables Validate and continue', () => {
    const { container, derived, onValidate } = setup('conflict', 2)
    const n = derived.errors.length
    // The Alert splits its header across two elements, so getByText (which only
    // reads an element's DIRECT text nodes) can't see the whole string —
    // assert on the header's textContent instead. The plan's test used
    // getByText and could never have passed.
    expect(container.querySelector('.alert__message').textContent)
      .toBe(`${n} Errors: Validation Required - ORDER-1 · Integrated from ACME`)
    const validate = screen.getByRole('button', { name: 'Validate and continue' })
    expect(validate.hasAttribute('disabled')).toBe(true)
    for (const [path, options] of derived.conflicts) {
      const o = options.find((x) => x.lines.length > 0)
      fireEvent.click(screen.getByRole('button', { name: chipLabel(path, o) }))
    }
    expect(screen.getByRole('button', { name: 'Validate and continue' }).hasAttribute('disabled')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Validate and continue' }))
    expect(onValidate).toHaveBeenCalledTimes(1)
    const [{ picks, structuralFixes }] = onValidate.mock.calls[0]
    expect(Object.keys(picks).length).toBe(derived.conflicts.size)
    expect(structuralFixes).toEqual({})
  })

  test('resolving a conflict drops it from the alert and flips the accordion badge to Completed', () => {
    const { container, derived } = setup('conflict', 2)
    const badge = () => container.querySelector('.accordion__title-row .text-badge').textContent
    expect(badge()).toBe('2 Errors')
    for (const [path, options] of derived.conflicts) {
      fireEvent.click(screen.getByRole('button', { name: chipLabel(path, options[0]) }))
    }
    // Badge flips to the green "all validated" one; the Alert count drops to 0.
    expect(badge()).toBe('Completed · 2 Errors validated')
    expect(container.querySelector('.alert__message').textContent).toMatch(/^0 Errors/)
  })

  test('clicking an alert row scrolls to that error control', async () => {
    const { container, derived } = setup('conflict', 2)
    const first = derived.errors[0]
    // The reason button inside the Alert — the message text also appears on the
    // ConflictPicker itself, so query inside the alert, not globally.
    fireEvent.click(within(container.querySelector('.alert')).getByRole('button', { name: first.message }))
    // The panel scrolls on the next frame (after the accordion expands).
    await new Promise((r) => requestAnimationFrame(r))
    expect(document.getElementById(`l1-${first.id}`)).toBeTruthy()
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })

  test('structural: a typed-but-WRONG gross weight does not resolve the error', () => {
    const { derived, draft } = setup('structural', 2)
    const qty = derived.structural.find((s) => s.kind === 'quantity-mismatch')
    const line = qty.line
    const input = screen.getByLabelText(`Gross weight, line ${line}`)
    fireEvent.change(input, { target: { value: '1' } })
    expect(screen.getByRole('button', { name: 'Validate and continue' }).hasAttribute('disabled')).toBe(true)
    // The value the schedule actually carries — the ONE definition of "fixed".
    const right = draft.products[line - 1].scheduleQuantity.grossWeight
    fireEvent.change(input, { target: { value: right } })
    // The other structural error (extra schedule) is still open, so the footer
    // stays disabled — but this row's own badge count must have dropped.
    expect(screen.getByText('1 Error')).toBeTruthy()
  })

  test('unresolvable message-control error keeps Validate disabled and shows the support line', () => {
    setup('unresolvable', 1)
    expect(screen.getByText('Message rejected by the integration — contact support.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Validate and continue' }).hasAttribute('disabled')).toBe(true)
  })

  test('delete-flag: choosing No resolves it', () => {
    const { onValidate } = setup('delete-flag', 1)
    fireEvent.click(screen.getByLabelText('No — this message creates an order'))
    expect(screen.getByRole('button', { name: 'Validate and continue' }).hasAttribute('disabled')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Validate and continue' }))
    expect(onValidate.mock.calls[0][0].deleteFlag).toBe('N')
  })

  test('Received order data accordion lists the header fields read-only', () => {
    setup('conflict', 1)
    const acc = screen.getByText('Received order data').closest('.accordion')
    fireEvent.click(within(acc).getByRole('button', { name: /Received order data/ }))
    expect(within(acc).getByText('Equipment')).toBeTruthy()
    expect(within(acc).getByText('RR')).toBeTruthy()
    // A conflicting field shows the per-line values, not a blank header value.
    expect(within(acc).getByText(/line 1: /)).toBeTruthy()
  })

  test('no Purge button on Step 1; Cancel fires onCancel', () => {
    const { onCancel } = setup('conflict', 1)
    expect(screen.queryByRole('button', { name: 'Purge' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })

  test('readOnly: pickers inert, no footer, picks shown', () => {
    const derived = deriveInterfaceErrors('ORDER-1', 1, 'conflict', base())
    const [path] = [...derived.conflicts.keys()]
    render(<Step1Panel orderNumber="ORDER-1" derived={derived} draft={derived.applyErrors(base())} readOnly picks={{ [path]: derived.conflicts.get(path)[0].value }} />)
    expect(screen.queryByRole('button', { name: 'Validate and continue' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Enter another value' })).toBeNull()
    expect(screen.getByText('Validated')).toBeTruthy()
  })

  test('empty: no errors → empty state, no footer', () => {
    const derived = deriveInterfaceErrors('ORDER-1', 0, null, base())
    render(<Step1Panel orderNumber="ORDER-1" derived={derived} draft={base()} readOnly />)
    expect(screen.getByText('No message errors were found for this order.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Validate and continue' })).toBeNull()
    // The received-data accordion still renders — a clean message is still a
    // message the planner may want to read.
    expect(screen.getByText('Received order data')).toBeTruthy()
  })
})
