import { render, screen, fireEvent } from '@testing-library/react'
import { vi, it, expect } from 'vitest'
import { StopDateField } from './EditStopsView'

// D4 (S163) — a time picked before any date is held, then lands in the stamp.
it('StopDateField: a time picked before the date is kept when the date arrives', () => {
  const onChange = vi.fn()
  const { container } = render(<StopDateField id="t" label="Pickup Date" value="" onChange={onChange} />)
  const time = container.querySelector('#t-time')
  fireEvent.change(time, { target: { value: '14:30' } })
  expect(onChange).not.toHaveBeenCalled()
  const date = container.querySelector('#t-date')
  fireEvent.change(date, { target: { value: '06/04/2026' } })
  fireEvent.blur(date)
  expect(onChange).toHaveBeenCalled()
  expect(onChange.mock.calls.at(-1)[0]).toMatch(/June 4, 2026 14:30/)
})
