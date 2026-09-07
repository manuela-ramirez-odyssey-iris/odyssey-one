// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import CalendarPicker from './CalendarPicker.jsx'

afterEach(cleanup)

// The component composes Button which uses no DOM APIs beyond what jsdom covers.

describe('CalendarPicker', () => {
  test('renders a 5-or-6-row grid with 35 or 42 day buttons for the month', () => {
    // November 2024: starts Saturday (6), so 5 rows + 1 leading adj day
    render(<CalendarPicker defaultMonth={new Date(2024, 10, 1)} />)
    const buttons = screen.getAllByRole('button').filter(b =>
      !b.getAttribute('aria-label')?.includes('month') // exclude prev/next
    )
    // 30 days in Nov + 1 leading (Oct 31) + 7 trailing = 35 grid cells + header arrows (excluded)
    expect([35, 42]).toContain(buttons.length)
  })

  test('single mode — click selects the day (aria-pressed)', () => {
    const onChange = vi.fn()
    render(
      <CalendarPicker
        mode="single"
        defaultMonth={new Date(2024, 10, 1)}
        onChange={onChange}
      />,
    )
    // Find November 15 by its full aria-label
    const nov15 = screen.getByLabelText('Friday, November 15, 2024')
    fireEvent.click(nov15)
    expect(onChange).toHaveBeenCalledOnce()
    const called = onChange.mock.calls[0][0]
    expect(called.getFullYear()).toBe(2024)
    expect(called.getMonth()).toBe(10)
    expect(called.getDate()).toBe(15)
  })

  test('range mode — two clicks build start then end', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <CalendarPicker
        mode="range"
        value={{ start: null, end: null }}
        defaultMonth={new Date(2024, 10, 1)}
        onChange={onChange}
      />,
    )

    // First click → start
    fireEvent.click(screen.getByLabelText('Friday, November 15, 2024'))
    expect(onChange).toHaveBeenCalledWith({ start: expect.any(Date), end: null })
    const start = onChange.mock.calls[0][0].start

    // Simulate controlled update and second click → end
    rerender(
      <CalendarPicker
        mode="range"
        value={{ start, end: null }}
        defaultMonth={new Date(2024, 10, 1)}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByLabelText('Wednesday, November 20, 2024'))
    expect(onChange).toHaveBeenLastCalledWith({ start, end: expect.any(Date) })
    const end = onChange.mock.calls[1][0].end
    expect(end.getDate()).toBe(20)
  })

  test('range mode — clicking before start restarts with that day as new start', () => {
    const onChange = vi.fn()
    render(
      <CalendarPicker
        mode="range"
        value={{ start: new Date(2024, 10, 15), end: null }}
        defaultMonth={new Date(2024, 10, 1)}
        onChange={onChange}
      />,
    )
    // Click Nov 10 — before the Nov 15 start
    fireEvent.click(screen.getByLabelText('Sunday, November 10, 2024'))
    expect(onChange).toHaveBeenCalledWith({ start: expect.any(Date), end: null })
    const newStart = onChange.mock.calls[0][0].start
    expect(newStart.getDate()).toBe(10)
  })

  test('enabledDates — only listed days are selectable, the rest grey out (SPB-69)', () => {
    const onChange = vi.fn()
    render(
      <CalendarPicker
        defaultMonth={new Date(2024, 10, 1)}
        enabledDates={['2024-11-15', new Date(2024, 10, 20)]}
        onChange={onChange}
      />,
    )
    expect(screen.getByLabelText('Friday, November 15, 2024').disabled).toBe(false)
    expect(screen.getByLabelText('Wednesday, November 20, 2024').disabled).toBe(false)
    expect(screen.getByLabelText('Thursday, November 21, 2024').disabled).toBe(true)
    fireEvent.click(screen.getByLabelText('Thursday, November 21, 2024'))
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('Friday, November 15, 2024'))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  test('enabledDates — range mode does not paint disallowed in-between days', () => {
    render(
      <CalendarPicker
        mode="range"
        value={{ start: new Date(2024, 10, 15), end: new Date(2024, 10, 20) }}
        defaultMonth={new Date(2024, 10, 1)}
        enabledDates={['2024-11-15', '2024-11-18', '2024-11-20']}
      />,
    )
    expect(screen.getByLabelText('Monday, November 18, 2024').className).toContain('--in-range')
    expect(screen.getByLabelText('Sunday, November 17, 2024').className).not.toContain('--in-range')
  })

  test('isDateEnabled — predicate greys out days it rejects, composed with enabledDates', () => {
    const onChange = vi.fn()
    render(
      <CalendarPicker
        defaultMonth={new Date(2024, 10, 1)}
        enabledDates={['2024-11-15', '2024-11-16']}      // Fri, Sat
        isDateEnabled={d => d.getDay() !== 6}             // no Saturdays
        onChange={onChange}
      />,
    )
    expect(screen.getByLabelText('Friday, November 15, 2024').disabled).toBe(false)
    expect(screen.getByLabelText('Saturday, November 16, 2024').disabled).toBe(true)
    fireEvent.click(screen.getByLabelText('Saturday, November 16, 2024'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
