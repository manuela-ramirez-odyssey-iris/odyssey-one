// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import MessageControlBlock from './MessageControlBlock.jsx'

afterEach(cleanup)

// Shape mirrors `derived.messageControl` from interfaceErrors.js.
const rows = [
  { id: 'm1', rule: 10, editable: true, fieldTree: 'orderInterface.deleteFlag', field: 'deleteFlag', message: 'Incorrect Delete Flag Value.' },
  { id: 'm2', rule: 9, editable: false, fieldTree: 'orderInterface.sourceSystem', field: 'sourceSystem', message: 'Incorrect Source System.' },
]

// Copy is safety-critical (a wrong delete flag turns a cancellation into a new
// order), so the labels are asserted verbatim — a silent reword must fail here.
const NO_LABEL = 'No — this message creates an order'
const YES_LABEL = 'Yes — this message cancels the order'

describe('MessageControlBlock', () => {
  test('deleteFlag renders a Yes/No radio pair; picking fires onDeleteFlag', () => {
    const onDeleteFlag = vi.fn()
    render(<MessageControlBlock rows={[rows[0]]} deleteFlag={null} onDeleteFlag={onDeleteFlag} />)
    fireEvent.click(screen.getByLabelText(NO_LABEL))
    expect(onDeleteFlag).toHaveBeenCalledWith('N')
    // The contact-support line belongs to the UNFIXABLE rows only — an editable
    // row must never tell the planner there is nothing they can do.
    expect(screen.queryByText('Message rejected by the integration — contact support.')).toBeNull()
  })

  test('nothing is preselected — the system must not guess the flag', () => {
    render(<MessageControlBlock rows={[rows[0]]} deleteFlag={null} onDeleteFlag={() => {}} />)
    expect(screen.getAllByRole('radio').every((r) => !r.checked)).toBe(true)
    expect(screen.getByText('Not answered yet')).toBeTruthy()
  })

  test('non-editable rows show fieldTree, message and the support line; no controls', () => {
    render(<MessageControlBlock rows={[rows[1]]} deleteFlag={null} onDeleteFlag={() => {}} />)
    expect(screen.getByText('orderInterface.sourceSystem')).toBeTruthy()
    expect(screen.getByText('Incorrect Source System.')).toBeTruthy()
    expect(screen.getByText('Message rejected by the integration — contact support.')).toBeTruthy()
    expect(screen.queryByRole('radio')).toBeNull()
  })

  test('disabled renders the picked flag read-only', () => {
    render(<MessageControlBlock rows={[rows[0]]} deleteFlag="Y" onDeleteFlag={() => {}} disabled />)
    const yes = screen.getByLabelText(YES_LABEL)
    expect(yes.checked).toBe(true)
    expect(yes.hasAttribute('disabled')).toBe(true)
  })

  test('the radio group is named by its visible prompt', () => {
    render(<MessageControlBlock rows={[rows[0]]} deleteFlag={null} onDeleteFlag={() => {}} />)
    expect(screen.getByRole('radiogroup', { name: /does this message cancel/i })).toBeTruthy()
  })
})
