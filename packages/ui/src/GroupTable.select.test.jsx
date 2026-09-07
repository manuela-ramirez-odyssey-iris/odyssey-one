// @vitest-environment jsdom
// `selectable` — GroupTable's flat-mode checkbox lane. The component renders the
// controls and derives the header's state; it never holds selection. These tests
// pin that boundary, and the two flags that split "can this row be selected?"
// from "is select-all meaningful?" (selectDisabled vs selectAllExempt).
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, test, expect, vi, afterEach } from 'vitest'
import GroupTable from './GroupTable.jsx'

const columns = [
  { key: 'carrier', label: 'Carrier' },
  { key: 'equip', label: 'Equip' },
]

const groups = [
  { id: 'a', label: 'AAAA', values: { carrier: 'AAAA', equip: 'Van' } },
  { id: 'b', label: 'BBBB', values: { carrier: 'BBBB', equip: 'LTL' } },
]

const boxes = (container) => [...container.querySelectorAll('input[type="checkbox"]')]
const selectAll = () => screen.getByLabelText('Select all')

const setup = (props = {}) =>
  render(<GroupTable flat selectable columns={columns} groups={groups} selectedIds={[]} {...props} />)

afterEach(cleanup)

describe('GroupTable — selectable (flat mode)', () => {
  test('renders a select-all header checkbox plus one per row', () => {
    const { container } = setup()
    expect(boxes(container)).toHaveLength(3)
    expect(selectAll()).toBeTruthy()
    expect(screen.getByLabelText('Select AAAA')).toBeTruthy()
  })

  // The lane is INJECTED, not declared — a consumer that also lists a checkbox
  // column would render two.
  test('the lane is extra: the declared columns are untouched', () => {
    const { container } = setup()
    const ths = [...container.querySelectorAll('thead th')]
    expect(ths).toHaveLength(columns.length + 1)
    expect(ths[0].className).toContain('__select-cell')
    expect(ths[1].textContent).toBe('Carrier')
  })

  test('ignored outside flat mode — a merged group-label cell has nowhere to put it', () => {
    const { container } = render(
      <GroupTable selectable columns={columns} groups={[{ ...groups[0], rows: [] }]} selectedIds={[]} />
    )
    expect(boxes(container)).toHaveLength(0)
  })

  test('selectedIds drives the row boxes; onSelect reports the id and the next state', () => {
    const onSelect = vi.fn()
    setup({ selectedIds: ['a'], onSelect })
    expect(screen.getByLabelText('Select AAAA').checked).toBe(true)
    expect(screen.getByLabelText('Select BBBB').checked).toBe(false)
    fireEvent.click(screen.getByLabelText('Select BBBB'))
    expect(onSelect).toHaveBeenCalledWith('b', true)
    fireEvent.click(screen.getByLabelText('Select AAAA'))
    expect(onSelect).toHaveBeenCalledWith('a', false)
  })

  test('a Set is accepted as well as an array', () => {
    setup({ selectedIds: new Set(['b']) })
    expect(screen.getByLabelText('Select BBBB').checked).toBe(true)
  })

  test('header is checked when every candidate is, indeterminate when only some are', () => {
    const { rerender } = setup({ selectedIds: ['a', 'b'] })
    expect(selectAll().checked).toBe(true)
    expect(selectAll().indeterminate).toBe(false)
    rerender(
      <GroupTable flat selectable columns={columns} groups={groups} selectedIds={['a']} />
    )
    expect(selectAll().checked).toBe(false)
    expect(selectAll().indeterminate).toBe(true)
  })

  // onSelectAll hands over a DIRECTION, never a list of ids — what "all" covers
  // is the consumer's rule (a filtered view, a date gate, …).
  test('onSelectAll reports the state the header is moving to', () => {
    const onSelectAll = vi.fn()
    const { rerender } = setup({ selectedIds: [], onSelectAll })
    fireEvent.click(selectAll())
    expect(onSelectAll).toHaveBeenCalledWith(true)
    rerender(
      <GroupTable flat selectable columns={columns} groups={groups} selectedIds={['a', 'b']} onSelectAll={onSelectAll} />
    )
    fireEvent.click(selectAll())
    expect(onSelectAll).toHaveBeenCalledWith(false)
  })

  test('selectDisabled disables that row and drops it from the header maths', () => {
    setup({ groups: [groups[0], { ...groups[1], selectDisabled: true }], selectedIds: ['a'] })
    expect(screen.getByLabelText('Select BBBB').disabled).toBe(true)
    // 'a' is the only candidate and it is selected → all, not indeterminate.
    expect(selectAll().checked).toBe(true)
    expect(selectAll().indeterminate).toBe(false)
  })

  test('header disables itself when no group is selectable', () => {
    setup({ groups: groups.map((g) => ({ ...g, selectDisabled: true })) })
    expect(selectAll().disabled).toBe(true)
    expect(selectAll().checked).toBe(false)
  })

  // The SpotBid case the prop exists for: an already-included row that may be
  // un-included, but that select-all may not legally turn ON.
  test('selectAllExempt leaves the row enabled but out of the header maths', () => {
    setup({
      groups: groups.map((g) => ({ ...g, selectAllExempt: true })),
      selectedIds: ['a', 'b'],
    })
    expect(screen.getByLabelText('Select AAAA').disabled).toBe(false)
    expect(selectAll().disabled).toBe(true)
    expect(selectAll().checked).toBe(false)
  })

  test('labels are overridable', () => {
    setup({ selectAllLabel: 'Select all carriers', selectLabel: (g) => `Include ${g.id}` })
    expect(screen.getByLabelText('Select all carriers')).toBeTruthy()
    expect(screen.getByLabelText('Include a')).toBeTruthy()
  })

  test('the footer row keeps its columns aligned under the lane', () => {
    const { container } = setup({ footerRow: { carrier: 'TOTAL', equip: '2' } })
    const cells = [...container.querySelectorAll('tfoot td')]
    expect(cells).toHaveLength(columns.length + 1)
    expect(cells[0].textContent).toBe('')
    expect(cells[1].textContent).toBe('TOTAL')
  })

  test('no lane at all when selectable is off', () => {
    const { container } = render(
      <GroupTable flat columns={columns} groups={groups} />
    )
    expect(container.querySelectorAll('thead th')).toHaveLength(columns.length)
    expect(boxes(container)).toHaveLength(0)
  })
})
