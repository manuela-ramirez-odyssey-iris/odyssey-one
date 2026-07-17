// @vitest-environment jsdom
import { useState } from 'react'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import TimePicker, {
  parseCanonical,
  toCanonical,
  formatTime,
  parseTime,
  stepOptions,
} from './TimePicker.jsx'

afterEach(cleanup)

// ── Canonical round-trip ─────────────────────────────────────────────────────

describe('parseCanonical / toCanonical', () => {
  test('valid "14:30" → 870 mins', () => expect(parseCanonical('14:30')).toBe(870))
  test('"00:00" → 0', () => expect(parseCanonical('00:00')).toBe(0))
  test('"" → null', () => expect(parseCanonical('')).toBeNull())
  test('out-of-range "24:00" → null', () => expect(parseCanonical('24:00')).toBeNull())
  test('bad minutes "10:70" → null', () => expect(parseCanonical('10:70')).toBeNull())
  test('toCanonical pads: 5 mins → "00:05"', () => expect(toCanonical(5)).toBe('00:05'))
  test('round-trip 870 ⇄ "14:30"', () => expect(toCanonical(parseCanonical('14:30'))).toBe('14:30'))
})

// ── Formatting per format ────────────────────────────────────────────────────

describe('formatTime', () => {
  test('standard midnight → "12:00 AM"', () => expect(formatTime(0, 'standard')).toBe('12:00 AM'))
  test('standard noon → "12:00 PM"', () => expect(formatTime(720, 'standard')).toBe('12:00 PM'))
  test('standard 14:30 → "2:30 PM"', () => expect(formatTime(870, 'standard')).toBe('2:30 PM'))
  test('standard 08:05 → "8:05 AM"', () => expect(formatTime(485, 'standard')).toBe('8:05 AM'))
  test('international 14:30 → "14:30"', () => expect(formatTime(870, 'international')).toBe('14:30'))
  test('international 08:05 → "08:05"', () => expect(formatTime(485, 'international')).toBe('08:05'))
})

// ── Liberal parse ────────────────────────────────────────────────────────────

describe('parseTime (standard 12h)', () => {
  test('"8:30 am" → 510', () => expect(parseTime('8:30 am', 'standard')).toBe(510))
  test('"8:30 pm" → 1230', () => expect(parseTime('8:30 pm', 'standard')).toBe(1230))
  test('"12 am" → 0 (midnight)', () => expect(parseTime('12 am', 'standard')).toBe(0))
  test('"12 pm" → 720 (noon)', () => expect(parseTime('12 pm', 'standard')).toBe(720))
  test('"0830" → 510', () => expect(parseTime('0830', 'standard')).toBe(510))
  test('"830" → 510', () => expect(parseTime('830', 'standard')).toBe(510))
  test('"8" → 480 (bare hour, literal)', () => expect(parseTime('8', 'standard')).toBe(480))
  test('"8 pm" → 1200', () => expect(parseTime('8 pm', 'standard')).toBe(1200))
  test('garbage "abc" → null', () => expect(parseTime('abc', 'standard')).toBeNull())
  test('"" → null', () => expect(parseTime('', 'standard')).toBeNull())
  test('bad minutes "8:70" → null', () => expect(parseTime('8:70', 'standard')).toBeNull())
  test('hour overflow "25:00" → null', () => expect(parseTime('25:00', 'standard')).toBeNull())
})

describe('parseTime (international 24h)', () => {
  test('"14:30" → 870', () => expect(parseTime('14:30', 'international')).toBe(870))
  test('"1430" → 870', () => expect(parseTime('1430', 'international')).toBe(870))
  test('"23:59" → 1439', () => expect(parseTime('23:59', 'international')).toBe(1439))
})

// ── Step generation ──────────────────────────────────────────────────────────

describe('stepOptions', () => {
  test('step=30 → 48 options, first 0, last 23:30', () => {
    const opts = stepOptions(30)
    expect(opts.length).toBe(48)
    expect(opts[0]).toBe(0)
    expect(opts[opts.length - 1]).toBe(23 * 60 + 30)
  })
  test('step=60 → 24 options', () => expect(stepOptions(60).length).toBe(24))
  test('step=15 → 96 options', () => expect(stepOptions(15).length).toBe(96))
  test('min/max clamp: 09:00–17:00 step 60 → 9 options', () => {
    const opts = stepOptions(60, '09:00', '17:00')
    expect(opts[0]).toBe(9 * 60)
    expect(opts[opts.length - 1]).toBe(17 * 60)
    expect(opts.length).toBe(9)
  })
  test('invalid step falls back to 30', () => expect(stepOptions(0).length).toBe(48))
})

// ── Interaction ──────────────────────────────────────────────────────────────

describe('TimePicker interaction', () => {
  test('typing a valid time commits canonical 24h on blur (not per keystroke)', () => {
    const onChange = vi.fn()
    render(<TimePicker id="tp" label="Time" onChange={onChange} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: '8:30 pm' } })
    expect(onChange).not.toHaveBeenCalled() // free-form while typing
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith('20:30')
  })

  // Regression (root cause): typing must not snap/reformat mid-edit. Emitting
  // onChange per keystroke echoed value→text through the sync effect and rewrote
  // the field to the formatted parse — the "won't let me edit at will" bug.
  test('typing a free-form time is not reformatted/snapped mid-edit', () => {
    const onChange = vi.fn()
    render(<TimePicker id="tp" label="Time" onChange={onChange} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: '8' } })
    expect(input.value).toBe('8') // NOT snapped to "8:00 AM"
    fireEvent.change(input, { target: { value: '8:4' } })
    expect(input.value).toBe('8:4') // partial edit preserved
    fireEvent.change(input, { target: { value: '8:47' } })
    expect(input.value).toBe('8:47')
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.blur(input)
    expect(input.value).toBe('8:47 AM') // normalized on commit
    expect(onChange).toHaveBeenCalledWith('08:47') // exact typed time, not step-snapped
  })

  test('a controlled parent echoing value back does not clobber the draft', () => {
    // Simulate the real loop: parent stores onChange's value and feeds it back.
    function Harness() {
      const [v, setV] = useState('')
      return <TimePicker id="tp" label="Time" value={v} onChange={setV} />
    }
    render(<Harness />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: '8:47' } })
    expect(input.value).toBe('8:47')
    fireEvent.blur(input)
    expect(input.value).toBe('8:47 AM')
  })

  test('Enter commits the typed draft (no arrowed row) — draft wins', () => {
    const onChange = vi.fn()
    render(<TimePicker id="tp" label="Time" onChange={onChange} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: '9:15' } }) // opens dropdown, no arrow
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('09:15') // typed 9:15, not a highlighted step row
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  // Regression (blur-commit race): clicking a row triggers closeAndBlur() →
  // programmatic input.blur() → the blur handler holds the PRE-pick text
  // closure and used to re-commit the stale draft (or '' → clear), overwriting
  // the row pick. The input MUST be really focused here so blur() fires —
  // that's the exact ordering a browser produces.
  test('clicking a row after typing commits the ROW value, not the stale draft', () => {
    const onChange = vi.fn()
    render(<TimePicker id="tp" label="Time" step={60} onChange={onChange} />)
    const input = screen.getByRole('combobox')
    input.focus()
    fireEvent.change(input, { target: { value: '9:15' } }) // draft, opens dropdown
    const row = screen.getAllByRole('option')[1] // 01:00
    fireEvent.mouseDown(row) // popover preventDefaults → input keeps focus
    fireEvent.click(row) // pick → closeAndBlur() → real blur fires
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('01:00') // row wins over the 9:15 draft
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(input.value).toBe('1:00 AM')
  })

  test('clicking a row with an empty field commits (not cleared by blur)', () => {
    const onChange = vi.fn()
    render(<TimePicker id="tp" label="Time" step={60} onChange={onChange} />)
    const input = screen.getByRole('combobox')
    input.focus()
    fireEvent.focus(input) // opens dropdown
    const row = screen.getAllByRole('option')[2] // 02:00
    fireEvent.mouseDown(row)
    fireEvent.click(row)
    expect(onChange).toHaveBeenCalledTimes(1) // no trailing onChange('')
    expect(onChange).toHaveBeenCalledWith('02:00')
  })

  test('invalid text on blur sets the error state (no commit)', () => {
    const onChange = vi.fn()
    render(<TimePicker id="tp" label="Time" onChange={onChange} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'nope' } })
    fireEvent.blur(input)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(onChange).not.toHaveBeenCalled()
  })

  test('controlled value renders formatted per format', () => {
    render(<TimePicker id="tp" label="Time" value="14:30" format="international" />)
    expect(screen.getByRole('combobox').value).toBe('14:30')
  })
})

// ── Chevron control + keyboard (accessibility) ────────────────────────────────

describe('TimePicker chevron control', () => {
  test('chevron is a real button that toggles the listbox open/closed', () => {
    render(<TimePicker id="tp" label="Time" />)
    const btn = screen.getByRole('button', { name: /open time options/i })
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.click(btn)
    expect(screen.getByRole('listbox')).toBeTruthy()
    // Label + icon flip to the "close" affordance once open.
    fireEvent.click(screen.getByRole('button', { name: /close time options/i }))
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  test('combobox exposes aria-expanded reflecting open state', () => {
    render(<TimePicker id="tp" label="Time" />)
    const input = screen.getByRole('combobox')
    expect(input.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: /open time options/i }))
    expect(screen.getByRole('combobox').getAttribute('aria-expanded')).toBe('true')
  })
})

describe('TimePicker keyboard navigation', () => {
  test('ArrowDown opens the listbox when closed', () => {
    render(<TimePicker id="tp" label="Time" />)
    const input = screen.getByRole('combobox')
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.getByRole('listbox')).toBeTruthy()
  })

  test('ArrowDown moves the active row + sets aria-activedescendant', () => {
    render(<TimePicker id="tp" label="Time" step={60} />)
    const input = screen.getByRole('combobox')
    fireEvent.keyDown(input, { key: 'ArrowDown' }) // opens
    fireEvent.keyDown(input, { key: 'ArrowDown' }) // → index 0
    const active = screen.getByRole('combobox').getAttribute('aria-activedescendant')
    expect(active).toMatch(/-option-0$/)
    // The option carries .is-active
    expect(document.querySelector('.menu-row.is-active')).toBeTruthy()
  })

  // Regression (S89 root cause): the component emitted .menu-row.is-active but the
  // app stylesheet only styled .match-simple-row.is-active — the keyboard highlight
  // was invisible in a real browser while every jsdom assertion still passed.
  // Guard: the app CSS must actually style the class the component emits.
  test('app stylesheet styles the .menu-row.is-active keyboard highlight', () => {
    // Walk up from cwd to the repo root (works from root or packages/ui).
    let root = process.cwd()
    while (!existsSync(resolve(root, 'apps/odyssey-one/src/styles/components.css'))) {
      const up = dirname(root)
      if (up === root) throw new Error('components.css not found above ' + process.cwd())
      root = up
    }
    const css = readFileSync(resolve(root, 'apps/odyssey-one/src/styles/components.css'), 'utf8')
    expect(css).toMatch(/\.menu-row\.is-active\s*\{[^}]*background:\s*var\(--[a-z0-9-]+\)/)
  })

  test('Enter on the active row commits the value + closes', () => {
    const onChange = vi.fn()
    render(<TimePicker id="tp" label="Time" step={60} onChange={onChange} />)
    const input = screen.getByRole('combobox')
    fireEvent.keyDown(input, { key: 'ArrowDown' }) // opens
    fireEvent.keyDown(input, { key: 'ArrowDown' }) // active index 0 = 00:00
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('00:00')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  test('Escape closes the listbox', () => {
    render(<TimePicker id="tp" label="Time" />)
    const input = screen.getByRole('combobox')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.getByRole('listbox')).toBeTruthy()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})
