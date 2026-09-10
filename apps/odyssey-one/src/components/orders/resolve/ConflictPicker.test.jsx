// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import ConflictPicker from './ConflictPicker.jsx'

afterEach(cleanup)
const options = [{ value: 'P', label: 'Pre-Paid', lines: [1, 2] }, { value: 'C', label: 'Collect', lines: [3] }]

describe('ConflictPicker', () => {
  test('one chip per distinct value, labelled with its lines, plus Enter another value', () => {
    render(<ConflictPicker label="Freight Term" message="Freight Term Codes must be the same across all order lines." options={options} value={null} onPick={() => {}} />)
    expect(screen.getByRole('button', { name: 'Pre-Paid · lines 1, 2' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Collect · line 3' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Enter another value' })).toBeTruthy()
    expect(screen.getByText('Freight Term Codes must be the same across all order lines.')).toBeTruthy()
  })

  test('clicking a chip fires onPick with its value and marks it pressed', () => {
    const onPick = vi.fn()
    const { rerender } = render(<ConflictPicker label="Freight Term" options={options} value={null} onPick={onPick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Collect · line 3' }))
    expect(onPick).toHaveBeenCalledWith('C')
    rerender(<ConflictPicker label="Freight Term" options={options} value="C" onPick={onPick} />)
    expect(screen.getByRole('button', { name: 'Collect · line 3' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Validated')).toBeTruthy()
  })

  test('Enter another value reveals an input; committing it picks the typed value', () => {
    const onPick = vi.fn()
    render(<ConflictPicker label="Freight Term" options={options} value={null} onPick={onPick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enter another value' }))
    const input = screen.getByLabelText('Freight Term')
    fireEvent.change(input, { target: { value: 'T' } })
    fireEvent.blur(input)
    expect(onPick).toHaveBeenCalledWith('T')
  })

  test('disabled renders inert chips', () => {
    render(<ConflictPicker label="Freight Term" options={options} value="P" onPick={() => {}} disabled />)
    expect(screen.getByRole('button', { name: 'Pre-Paid · lines 1, 2' }).hasAttribute('disabled')).toBe(true)
    expect(screen.queryByRole('button', { name: 'Enter another value' })).toBeNull()
  })
})
