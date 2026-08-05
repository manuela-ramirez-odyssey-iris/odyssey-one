// @vitest-environment jsdom
// S108 1b — the save modal, isolated from the host. `chips` here stands in
// for the host's `barChips` (committed chips + the free-text/set query badge
// already folded in, label already computed) so these tests don't need the
// full ShipmentsGlobalSearch tree.
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import SaveFilterModal from './SaveFilterModal.jsx'

afterEach(cleanup)

const attrChip = {
  key: 'customer-id', kind: 'attribute', label: 'Customer ID: G2O',
  attrLabel: 'Customer ID', queryValue: 'G2O',
}
// Stands in for the free-text/set query badge `barChips` folds into the
// array (ShipmentsGlobalSearch.jsx `barChips`) — a pasted multi-code search
// with no attribute of its own. Must survive into the modal (spec "Behaviour"
// 1: excluding it silently saves nothing for a pasted 40-order-number search).
const textChip = { key: '__free-text__', kind: 'set', label: '"ORD1, ORD2"', value: 'ORD1, ORD2' }

describe('SaveFilterModal', () => {
  test('prefills the title from the first chip and renders every chip, including the free-text one', () => {
    render(<SaveFilterModal chips={[attrChip, textChip]} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByLabelText('Filter Title').value).toBe('Customer ID: G2O')
    expect(screen.getByText('Customer ID: G2O')).toBeTruthy()
    expect(screen.getByText('"ORD1, ORD2"')).toBeTruthy()
  })

  test('every chip renders via SearchChip\'s plain-label branch — no set/date panel, no codes/date fields passed', () => {
    const { container } = render(<SaveFilterModal chips={[attrChip, textChip]} onSave={vi.fn()} onClose={vi.fn()} />)
    // The set-chip toggle button + its codes/calendar panel only render when
    // SearchChip gets `codes`/`dateLabel` instead of a plain `label` string.
    expect(container.querySelector('.search-chip__toggle')).toBeNull()
    expect(container.querySelector('.search-chip__panel')).toBeNull()
    expect(container.querySelector('.search-chip__calendar')).toBeNull()
  })

  test('removing a chip in the modal changes what gets saved and leaves the source chips array untouched', () => {
    const onSave = vi.fn()
    const chips = [attrChip, textChip]
    render(<SaveFilterModal chips={chips} onSave={onSave} onClose={vi.fn()} />)

    fireEvent.click(screen.getAllByLabelText('Remove')[1]) // drop the free-text chip
    fireEvent.click(screen.getByText('Save'))

    expect(onSave).toHaveBeenCalledWith('Customer ID: G2O', [attrChip])
    // The array the host passed in (its barChips / the live bar) is untouched.
    expect(chips).toEqual([attrChip, textChip])
  })

  test('Save is disabled on a blank title and when every chip has been removed', () => {
    render(<SaveFilterModal chips={[attrChip]} onSave={vi.fn()} onClose={vi.fn()} />)
    const saveBtn = screen.getByText('Save').closest('button')
    expect(saveBtn.disabled).toBe(false)

    fireEvent.change(screen.getByLabelText('Filter Title'), { target: { value: '' } })
    expect(saveBtn.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Filter Title'), { target: { value: 'My Filter' } })
    expect(saveBtn.disabled).toBe(false)

    fireEvent.click(screen.getAllByLabelText('Remove')[0])
    expect(saveBtn.disabled).toBe(true)
  })

  test('Cancel calls onClose with no save', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<SaveFilterModal chips={[attrChip]} onSave={onSave} onClose={onClose} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })
})
