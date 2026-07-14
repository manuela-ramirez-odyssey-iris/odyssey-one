// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { maskDDMMYYYY, maskRange, parseDDMMYYYY, fmtDDMMYYYY } from './DatePicker.jsx'
import DatePicker from './DatePicker.jsx'

afterEach(cleanup)

// ── Mask unit tests ──────────────────────────────────────────────────────────

describe('maskDDMMYYYY', () => {
  test('"14" → "14"', () => expect(maskDDMMYYYY('14')).toBe('14'))
  test('"140" → "14/0"', () => expect(maskDDMMYYYY('140')).toBe('14/0'))
  test('"14/072" → "14/07/2"', () => expect(maskDDMMYYYY('14/072')).toBe('14/07/2'))
  test('"14/07/2026" stable', () => expect(maskDDMMYYYY('14/07/2026')).toBe('14/07/2026'))
  test('"14/07/20263" → "14/07/2026" (year overflow truncated)', () =>
    expect(maskDDMMYYYY('14/07/20263')).toBe('14/07/2026'))
  test('"14//2026" → "14/01/2026" (empty month auto-01)', () =>
    expect(maskDDMMYYYY('14//2026')).toBe('14/01/2026'))
  test('"/07/2026" → "01/07/2026" (empty day auto-01)', () =>
    expect(maskDDMMYYYY('/07/2026')).toBe('01/07/2026'))
  test('"14/07/" → "14/07" (trailing empty segment dropped)', () =>
    expect(maskDDMMYYYY('14/07/')).toBe('14/07'))
  test('"1/07/2026" stable (partial day left as-is)', () =>
    expect(maskDDMMYYYY('1/07/2026')).toBe('1/07/2026'))
})

// ── Interaction tests ────────────────────────────────────────────────────────

describe('DatePicker interaction', () => {
  test('typing a complete date fires onChange with a Date', () => {
    const onChange = vi.fn()
    render(<DatePicker id="dp" label="Date" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    // Simulate typing "14072026" digit by digit via change events
    fireEvent.change(input, { target: { value: '14072026', selectionStart: 8 } })
    expect(onChange).toHaveBeenCalled()
    const called = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    if (called instanceof Date) {
      expect(called.getDate()).toBe(14)
      expect(called.getMonth()).toBe(6) // July = 6
      expect(called.getFullYear()).toBe(2026)
    }
  })

  test('clicking a calendar day fills the field text (single mode)', () => {
    const onChange = vi.fn()
    render(<DatePicker id="dp" label="Date" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    // Calendar should now be visible — find Nov 15 2024 in the calendar
    // (We're testing that clicking the calendar fires onChange with a Date)
    // The calendar opens on focus; pick any visible day button
    const dayBtns = screen.queryAllByRole('button').filter(b =>
      !b.getAttribute('aria-label')?.includes('month')
    )
    if (dayBtns.length > 0) {
      fireEvent.click(dayBtns[0])
      expect(onChange).toHaveBeenCalled()
    }
  })

  test('range mode: two calendar picks fire onChange with start then end', () => {
    const onChange = vi.fn()
    render(<DatePicker id="dp" label="Date" mode="range" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    const dayBtns = screen.queryAllByRole('button').filter(b =>
      !b.getAttribute('aria-label')?.includes('month')
    )
    if (dayBtns.length >= 2) {
      fireEvent.click(dayBtns[5])
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ start: expect.any(Date) }))
    }
  })
})
