// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import DurationPicker, {
  UNIT_CONFIG, durationOptions, formatDuration, formatRemaining, countdownVariant, parseDuration,
} from './DurationPicker.jsx'

// NOTE: @testing-library/user-event is not installed in this repo (see
// DroppedCarrierSection.test.jsx) — fireEvent.change/blur stand in for
// userEvent.type/tab, same intent, this file's existing idiom.

afterEach(cleanup)

describe('durationOptions — the per-unit increments/ceilings (user spec 2026-08-19)', () => {
  it('hours: step 1, ceiling 24', () => {
    const o = durationOptions('hours')
    expect(o[0]).toBe(1)
    expect(o.at(-1)).toBe(24)
    expect(o).toHaveLength(24)
  })

  it('minutes: step 10, ceiling 120', () => {
    const o = durationOptions('minutes')
    expect(o.slice(0, 3)).toEqual([10, 20, 30])
    expect(o.at(-1)).toBe(120)
    expect(o).toHaveLength(12)
  })

  it('seconds: step 30, ceiling 240', () => {
    const o = durationOptions('seconds')
    expect(o.slice(0, 3)).toEqual([30, 60, 90])
    expect(o.at(-1)).toBe(240)
    expect(o).toHaveLength(8)
  })

  it('never offers a zero-length window, and never exceeds its own ceiling', () => {
    for (const unit of Object.keys(UNIT_CONFIG)) {
      const o = durationOptions(unit)
      expect(Math.min(...o)).toBeGreaterThan(0)
      expect(Math.max(...o)).toBeLessThanOrEqual(UNIT_CONFIG[unit].max)
    }
  })

  it('falls back to minutes for an unknown unit rather than returning nothing', () => {
    expect(durationOptions('fortnights')).toEqual(durationOptions('minutes'))
  })
})

describe('formatRemaining', () => {
  it('drops the hour segment below an hour', () => {
    expect(formatRemaining(90_000)).toBe('01:30')
  })

  it('shows hours once there are any — a 24h window must not read 1440:00', () => {
    expect(formatRemaining(24 * 3600_000)).toBe('24:00:00')
  })

  it('clamps at zero — an expired countdown stays visible and never goes negative', () => {
    expect(formatRemaining(0)).toBe('00:00')
    expect(formatRemaining(-5_000)).toBe('00:00')
  })
})

describe('countdownVariant — green → amber at 30% → red at 0', () => {
  const total = 30 * 60_000 // 30 min

  it('is green while healthy', () => {
    expect(countdownVariant(total, total)).toBe('green')
    expect(countdownVariant(total * 0.5, total)).toBe('green')
  })

  it('turns amber at the 30% boundary and below', () => {
    expect(countdownVariant(total * 0.3, total)).toBe('amber')
    expect(countdownVariant(total * 0.1, total)).toBe('amber')
  })

  it('is red at zero and past it', () => {
    expect(countdownVariant(0, total)).toBe('red')
    expect(countdownVariant(-1000, total)).toBe('red')
  })

  it('scales by ratio, so a 4-minute and a 24-hour window warn at the same point', () => {
    const short = 4 * 60_000
    const long = 24 * 3600_000
    expect(countdownVariant(short * 0.29, short)).toBe('amber')
    expect(countdownVariant(long * 0.29, long)).toBe('amber')
    expect(countdownVariant(short * 0.31, short)).toBe('green')
    expect(countdownVariant(long * 0.31, long)).toBe('green')
  })
})

describe('DurationPicker component', () => {
  it('renders the picked value with its unit abbreviation', () => {
    render(<DurationPicker unit="minutes" value={30} label="Quote Duration" />)
    expect(screen.getByRole('combobox').value).toBe('30 min')
  })

  it('opens the list and reports the picked option in the unit, not in ms', () => {
    const onChange = vi.fn()
    render(<DurationPicker unit="minutes" value="" label="Quote Duration" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /open duration options/i }))
    const listbox = screen.getByRole('listbox')
    fireEvent.click(within(listbox).getByText('40 min'))
    expect(onChange).toHaveBeenCalledWith(40)
  })

  it('RUNNING: locks the control and shows a countdown instead of the input', () => {
    render(
      <DurationPicker unit="minutes" value={30} label="Quote Duration"
        running endsAt={Date.now() + 30 * 60_000} />,
    )
    // the input is gone — there is nothing left to select
    expect(screen.queryByRole('combobox')).toBeFalsy()
    expect(screen.queryByRole('button', { name: /open duration options/i })).toBeFalsy()
    expect(screen.getByRole('timer')).toBeTruthy()
  })

  it('RUNNING: does not self-reset once expired — the countdown stays up, at zero', () => {
    render(
      <DurationPicker unit="minutes" value={30} label="Quote Duration"
        running endsAt={Date.now() - 60_000} />,
    )
    const timer = screen.getByRole('timer')
    expect(timer.textContent).toContain('00:00')
    // still locked: an expired window must not become editable on its own
    expect(screen.queryByRole('combobox')).toBeFalsy()
  })

  it('keeps its label across the idle → running flip', () => {
    const { rerender } = render(<DurationPicker unit="minutes" value={30} label="Quote Duration" />)
    expect(screen.getByText('Quote Duration')).toBeTruthy()
    rerender(
      <DurationPicker unit="minutes" value={30} label="Quote Duration"
        running endsAt={Date.now() + 60_000} />,
    )
    expect(screen.getByText('Quote Duration')).toBeTruthy()
  })
})

describe('parseDuration', () => {
  it('parses a bare integer', () => {
    expect(parseDuration('45', 'minutes')).toBe(45)
  })

  it('strips non-digit characters (unit suffix, spaces)', () => {
    expect(parseDuration('45 min', 'minutes')).toBe(45)
  })

  it('clamps to the unit ceiling', () => {
    expect(parseDuration('999', 'minutes')).toBe(UNIT_CONFIG.minutes.max)
  })

  it('rejects unparseable / zero / negative text', () => {
    expect(parseDuration('abc', 'minutes')).toBeNull()
    expect(parseDuration('0', 'minutes')).toBeNull()
    expect(parseDuration('', 'minutes')).toBeNull()
  })
})

describe('typable input (TimePicker parity)', () => {
  it('opens the listbox on field click', () => {
    render(<DurationPicker id="d" label="Quote Duration" unit="minutes" value={30} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('combobox'))
    expect(screen.getByRole('listbox')).toBeTruthy()
  })

  it('commits a typed integer on blur', () => {
    const onChange = vi.fn()
    render(<DurationPicker id="d" label="Quote Duration" unit="minutes" value={30} onChange={onChange} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: '45' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(45)
  })

  it('accepts "45 min" text and strips the unit suffix', () => {
    const onChange = vi.fn()
    render(<DurationPicker id="d" label="Quote Duration" unit="minutes" value={30} onChange={onChange} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: '45 min' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(45)
  })

  it('shows an error and does not commit on unparseable text', () => {
    const onChange = vi.fn()
    render(<DurationPicker id="d" label="Quote Duration" unit="minutes" value={30} onChange={onChange} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.blur(input)
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText(/invalid/i)).toBeTruthy()
  })

  it('clamps typed values above the ceiling to max', () => {
    const onChange = vi.fn()
    render(<DurationPicker id="d" label="Quote Duration" unit="minutes" value={30} onChange={onChange} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: '999' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(UNIT_CONFIG.minutes.max)
  })

  it('clears the value when the field is emptied and blurred', () => {
    const onChange = vi.fn()
    render(<DurationPicker id="d" label="Quote Duration" unit="minutes" value={30} onChange={onChange} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('picking a row still commits and closes, clearing any prior error', () => {
    const onChange = vi.fn()
    render(<DurationPicker id="d" label="Quote Duration" unit="minutes" value="" onChange={onChange} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.blur(input)
    expect(screen.getByText(/invalid/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('combobox'))
    const listbox = screen.getByRole('listbox')
    fireEvent.click(within(listbox).getByText('40 min'))
    expect(onChange).toHaveBeenCalledWith(40)
    expect(screen.queryByText(/invalid/i)).toBeFalsy()
    expect(screen.queryByRole('listbox')).toBeFalsy()
  })

  it('commits a typed integer on Enter', () => {
    const onChange = vi.fn()
    render(<DurationPicker id="d" label="Quote Duration" unit="minutes" value={30} onChange={onChange} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: '50' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith(50)
  })
})
