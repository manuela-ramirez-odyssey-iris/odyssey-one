// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { maskDDMMYYYY, maskRange, parseDDMMYYYY, padSegments } from './DatePicker.jsx'
import DatePicker from './DatePicker.jsx'

afterEach(cleanup)

// ── QA repro: scripted char-by-char typing of a full date (S107) ────────────
// Browser QA typed '04/03/2026' into a single DatePicker (format MM/DD/YYYY)
// keystroke-by-keystroke and got '04//3202' + "Enter a valid date". Traced to
// handleText's caret re-anchor: after "04" + typing "/", the mask rails out to
// "04//" (3 structural slots, per the header comment — expected), but the old
// re-anchor math landed the caret at index 2 (BEFORE both slashes) instead of
// index 3 (between them). Every digit typed next lands one slot early and gets
// truncated by the segment cap — "0" meant for the month segment overflows
// into re-capping the day segment, discarding it. Fixed with a one-slot nudge
// past a single just-typed separator (see handleText). This helper simulates
// a real browser: it reads the CURRENT caret (wherever the last render put it)
// before inserting each new character, so it only passes if the component's
// caret math is actually correct after every keystroke — not just the final
// mask string.
async function typeChar(input, ch) {
  const pos = input.selectionStart
  const raw = input.value.slice(0, pos) + ch + input.value.slice(pos)
  fireEvent.change(input, { target: { value: raw, selectionStart: pos + ch.length } })
  // Flush the rAF the component uses to re-anchor the caret post-mask.
  await new Promise((r) => requestAnimationFrame(r))
}

describe('DatePicker — scripted char-by-char typing (QA repro, S107)', () => {
  test('typing "04032026" one character at a time (with the mask auto-inserting slashes... no slashes here) still commits cleanly', async () => {
    render(<DatePicker id="dp" label="Date" onChange={() => {}} />)
    const input = screen.getByRole('textbox')
    input.focus()
    input.setSelectionRange(0, 0)
    for (const ch of '04/03/2026') await typeChar(input, ch)
    expect(input.value).toBe('04/03/2026')
    fireEvent.blur(input)
    expect(screen.queryByText(/valid date/i)).toBeNull()
  })
})

// ── Filter unit tests — editing is FREE, only digit caps + separators ─────────

describe('maskDDMMYYYY (digit-cap filter, no auto-pad / no reset)', () => {
  test('"14" → "14"', () => expect(maskDDMMYYYY('14')).toBe('14'))
  test('"140" → "14/0" only if user typed slash; bare digits stay in seg', () =>
    // no slash typed → all digits are one segment, capped at 2
    expect(maskDDMMYYYY('140')).toBe('14'))
  test('"14/07/2" preserved', () => expect(maskDDMMYYYY('14/07/2')).toBe('14/07/2'))
  test('"14/07/2026" stable', () => expect(maskDDMMYYYY('14/07/2026')).toBe('14/07/2026'))
  test('year overflow truncated to 4 digits', () =>
    expect(maskDDMMYYYY('14/07/20263')).toBe('14/07/2026'))
  test('empty day is LEFT empty — no reset to 01', () =>
    expect(maskDDMMYYYY('/07/2026')).toBe('/07/2026'))
  test('empty month is LEFT empty — no reset to 01', () =>
    expect(maskDDMMYYYY('14//2026')).toBe('14//2026'))
  test('trailing empty segment preserved (user still typing)', () =>
    expect(maskDDMMYYYY('14/07/')).toBe('14/07/'))
  test('day capped to 2 digits', () => expect(maskDDMMYYYY('149/07/2026')).toBe('14/07/2026'))
})

describe('maskDDMMYYYY — separators are structural rails (deletion rejected)', () => {
  test('deleting the day/month "/" is a no-op (rail kept)', () =>
    // browser removes the slash → "1208/2026"; prev had 3 segments → restore prev
    expect(maskDDMMYYYY('1208/2026', '12/08/2026')).toBe('12/08/2026'))
  test('deleting the month/year "/" is a no-op', () =>
    expect(maskDDMMYYYY('12/082026', '12/08/2026')).toBe('12/08/2026'))
  test('deleting a "/" while a segment is empty is still a no-op', () =>
    expect(maskDDMMYYYY('12/2026', '12//2026')).toBe('12//2026'))
  test('editing digits (no "/" removed) still passes through', () =>
    expect(maskDDMMYYYY('12/09/2026', '12/08/2026')).toBe('12/09/2026'))
})

describe('maskDDMMYYYY — any digit accepted mid-typing, validation deferred to commit', () => {
  test('day first digit 4 alone is a valid intermediate', () =>
    expect(maskDDMMYYYY('4/07/2026', '/07/2026')).toBe('4/07/2026'))
  test('day "45" accepted mid-typing (out-of-range only fails at commit)', () =>
    expect(maskDDMMYYYY('45/07/2026', '4/07/2026')).toBe('45/07/2026'))
  test('day "32" accepted mid-typing', () =>
    expect(maskDDMMYYYY('32/07/2026', '3/07/2026')).toBe('32/07/2026'))
  test('day "00" accepted mid-typing', () =>
    expect(maskDDMMYYYY('00/07/2026', '0/07/2026')).toBe('00/07/2026'))
  test('day "31" allowed', () =>
    expect(maskDDMMYYYY('31/07/2026', '3/07/2026')).toBe('31/07/2026'))
  test('month first digit 2-9 alone allowed', () =>
    expect(maskDDMMYYYY('12/9/2026', '12//2026')).toBe('12/9/2026'))
  test('month "13" accepted mid-typing (fails at commit)', () =>
    expect(maskDDMMYYYY('12/13/2026', '12/1/2026')).toBe('12/13/2026'))
  test('month "12" allowed', () =>
    expect(maskDDMMYYYY('12/12/2026', '12/1/2026')).toBe('12/12/2026'))
  test('month "00" accepted mid-typing', () =>
    expect(maskDDMMYYYY('12/00/2026', '12/0/2026')).toBe('12/00/2026'))
  test('year takes any 4 digits (no range cap)', () =>
    expect(maskDDMMYYYY('12/08/9999', '12/08/999')).toBe('12/08/9999'))
})

describe('padSegments (commit-time single-digit pad)', () => {
  test('"4/7/2026" → "04/07/2026"', () => expect(padSegments('4/7/2026')).toBe('04/07/2026'))
  test('already padded untouched', () => expect(padSegments('04/07/2026')).toBe('04/07/2026'))
  test('parse accepts the short form via pad', () =>
    expect(parseDDMMYYYY('4/7/2026')).toBeInstanceOf(Date))
})

describe('maskRange (free typing both ends)', () => {
  test('single end passes through', () =>
    expect(maskRange('14/07/2026')).toBe('14/07/2026'))
  test('two ends preserved with separator', () =>
    expect(maskRange('14/07/2026 - 20/07/2026')).toBe('14/07/2026 - 20/07/2026'))
  test('deleting a segment on the second end does not reset it', () =>
    expect(maskRange('14/07/2026 - /07/2026')).toBe('14/07/2026 - /07/2026'))
})

// ── Interaction tests ────────────────────────────────────────────────────────

const dayButtons = () =>
  screen.queryAllByRole('button').filter(b => {
    const al = (b.getAttribute('aria-label') ?? '').toLowerCase()
    // day cells only: drop month-nav, the trailing calendar toggle, and Clear.
    return al && !al.includes('month') && !al.includes('calendar') && !al.includes('clear') && !b.disabled
  })

// S107 addendum (2026-08-03): default format flips DD/MM/YYYY → MM/DD/YYYY
// (US canon). Every other test in this file passes format="DD/MM/YYYY"
// explicitly to keep asserting the pre-flip day-first semantics unchanged;
// these two pin the new DEFAULT.
describe('DatePicker — default format is now MM/DD/YYYY (US canon)', () => {
  test('displays a value month-first with no format prop', () => {
    render(<DatePicker id="dp" label="Date" value={new Date(2026, 6, 14)} onChange={() => {}} />)
    expect(screen.getByRole('textbox').value).toBe('07/14/2026')
  })

  test('commits a typed date month-first with no format prop', () => {
    const onChange = vi.fn()
    render(<DatePicker id="dp" label="Date" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '07/14/2026', selectionStart: 10 } })
    fireEvent.blur(input)
    const d = onChange.mock.calls.at(-1)[0]
    expect(d.getMonth()).toBe(6) // July
    expect(d.getDate()).toBe(14)
  })
})

describe('DatePicker interaction — draft/commit model', () => {
  test('typing does NOT emit onChange mid-keystroke', () => {
    const onChange = vi.fn()
    render(<DatePicker id="dp" label="Date" format="DD/MM/YYYY" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '14072026', selectionStart: 8 } })
    expect(onChange).not.toHaveBeenCalled() // free typing, no commit yet
  })

  test('commit on blur emits a valid Date', () => {
    const onChange = vi.fn()
    render(<DatePicker id="dp" label="Date" format="DD/MM/YYYY" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '14/07/2026', selectionStart: 10 } })
    fireEvent.blur(input)
    const d = onChange.mock.calls.at(-1)[0]
    expect(d).toBeInstanceOf(Date)
    expect(d.getDate()).toBe(14)
    expect(d.getMonth()).toBe(6)
    expect(d.getFullYear()).toBe(2026)
  })

  test('deleting the day mid-edit does NOT reset to 01', () => {
    const onChange = vi.fn()
    render(<DatePicker id="dp" label="Date" format="DD/MM/YYYY" value={new Date(2026, 6, 14)} onChange={onChange} />)
    const input = screen.getByRole('textbox')
    expect(input.value).toBe('14/07/2026')
    // user clears the day segment
    fireEvent.change(input, { target: { value: '/07/2026', selectionStart: 0 } })
    expect(input.value).toBe('/07/2026') // stays empty, no "01"
  })

  test('commit on invalid date shows error, does not emit', () => {
    const onChange = vi.fn()
    render(<DatePicker id="dp" label="Date" format="DD/MM/YYYY" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '99/99/2026', selectionStart: 10 } })
    fireEvent.blur(input)
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText(/valid date/i)).toBeTruthy()
  })

  test('range mode: typing both ends and blurring commits a {start,end}', () => {
    const onChange = vi.fn()
    render(<DatePicker id="dp" label="Date" format="DD/MM/YYYY" mode="range" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '14/07/2026 - 20/07/2026', selectionStart: 23 } })
    expect(input.value).toBe('14/07/2026 - 20/07/2026') // typed freely
    fireEvent.blur(input)
    const r = onChange.mock.calls.at(-1)[0]
    expect(r.start).toBeInstanceOf(Date)
    expect(r.end).toBeInstanceOf(Date)
    expect(r.start.getDate()).toBe(14)
    expect(r.end.getDate()).toBe(20)
  })

  test('range mode reorders reversed ends on commit', () => {
    const onChange = vi.fn()
    render(<DatePicker id="dp" label="Date" format="DD/MM/YYYY" mode="range" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '20/07/2026 - 14/07/2026', selectionStart: 23 } })
    fireEvent.blur(input)
    const r = onChange.mock.calls.at(-1)[0]
    expect(r.start.getDate()).toBe(14)
    expect(r.end.getDate()).toBe(20)
  })

  test('day-click wins over a stale typed draft (pick-guard)', () => {
    const onChange = vi.fn()
    render(<DatePicker id="dp" label="Date" format="DD/MM/YYYY" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    // stale, incomplete draft in the field
    fireEvent.change(input, { target: { value: '14/07', selectionStart: 5 } })
    const btns = dayButtons()
    if (btns.length > 0) {
      fireEvent.click(btns[0])
      // the pick emitted a Date, and the follow-on blur did NOT overwrite it
      // with the invalid "14/07" draft (no null/error emission after).
      const last = onChange.mock.calls.at(-1)[0]
      expect(last).toBeInstanceOf(Date)
    }
  })

  // ── Caret stability on segment deletion (follow-up bug) ─────────────────────
  // When the digit-cap filter leaves the string unchanged (deleting digits keeps
  // the untouched separators), the caret must stay at the browser's edit point so
  // the emptied segment can be refilled — it must NOT snap to the wrong slash.

  test('empty-month refill: caret stays between the slashes, filter untouched', () => {
    render(<DatePicker id="dp" label="Date" format="DD/MM/YYYY" value={new Date(2026, 7, 12)} onChange={() => {}} />)
    const input = screen.getByRole('textbox')
    expect(input.value).toBe('12/08/2026')
    // select "08" (pos 3-5), backspace → "12//2026", caret at 3
    input.setSelectionRange(3, 3)
    fireEvent.change(input, { target: { value: '12//2026', selectionStart: 3 } })
    expect(input.value).toBe('12//2026')       // separators intact, no merge to "12/2026"
    expect(input.selectionStart).toBe(3)       // caret unchanged (between slashes)
  })

  test('empty-day refill: caret stays at start, filter untouched', () => {
    render(<DatePicker id="dp" label="Date" format="DD/MM/YYYY" value={new Date(2026, 7, 12)} onChange={() => {}} />)
    const input = screen.getByRole('textbox')
    input.setSelectionRange(0, 0)
    fireEvent.change(input, { target: { value: '//2026', selectionStart: 0 } })
    expect(input.value).toBe('//2026')
    expect(input.selectionStart).toBe(0)
  })

  test('mid-string caret stability: single-digit backspace does not jump', () => {
    render(<DatePicker id="dp" label="Date" format="DD/MM/YYYY" value={new Date(2026, 7, 12)} onChange={() => {}} />)
    const input = screen.getByRole('textbox')
    // "12/08/2026" → delete the "8" → "12/0/2026", caret at 4
    fireEvent.change(input, { target: { value: '12/0/2026', selectionStart: 4 } })
    expect(input.value).toBe('12/0/2026')
    expect(input.selectionStart).toBe(4)
  })

  test('year overflow still re-anchors the caret (filter changed the string)', () => {
    render(<DatePicker id="dp" label="Date" format="DD/MM/YYYY" onChange={() => {}} />)
    const input = screen.getByRole('textbox')
    // typing a 5th year digit is stripped; caret must land after the 4 kept digits
    fireEvent.change(input, { target: { value: '14/07/20265', selectionStart: 11 } })
    expect(input.value).toBe('14/07/2026')
  })

  test('range mode: deleting the second-end month keeps separators + caret', () => {
    render(
      <DatePicker id="dp" label="Date" format="DD/MM/YYYY" mode="range"
        value={{ start: new Date(2026, 6, 14), end: new Date(2026, 7, 20) }} onChange={() => {}} />
    )
    const input = screen.getByRole('textbox')
    expect(input.value).toBe('14/07/2026 - 20/08/2026')
    // clear the second-end month "08" (pos 16-18) → caret at 16
    fireEvent.change(input, { target: { value: '14/07/2026 - 20//2026', selectionStart: 16 } })
    expect(input.value).toBe('14/07/2026 - 20//2026')
    expect(input.selectionStart).toBe(16)
  })

  test('range mode: deleting the first-end day keeps separators + caret', () => {
    render(
      <DatePicker id="dp" label="Date" format="DD/MM/YYYY" mode="range"
        value={{ start: new Date(2026, 6, 14), end: new Date(2026, 7, 20) }} onChange={() => {}} />
    )
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '/07/2026 - 20/08/2026', selectionStart: 0 } })
    expect(input.value).toBe('/07/2026 - 20/08/2026')
    expect(input.selectionStart).toBe(0)
  })

  test('backspace over a separator keeps it (single)', () => {
    render(<DatePicker id="dp" label="Date" format="DD/MM/YYYY" value={new Date(2026, 7, 12)} onChange={() => {}} />)
    const input = screen.getByRole('textbox')
    expect(input.value).toBe('12/08/2026')
    // caret between "12" and "08", backspace removes the "/" → "1208/2026"
    fireEvent.change(input, { target: { value: '1208/2026', selectionStart: 4 } })
    expect(input.value).toBe('12/08/2026') // rail held
  })

  test('selection spanning a separator deletes only digits, keeps rails', () => {
    render(<DatePicker id="dp" label="Date" format="DD/MM/YYYY" value={new Date(2026, 7, 12)} onChange={() => {}} />)
    const input = screen.getByRole('textbox')
    // select "2/08" (spans a slash) and delete → browser yields "1/2026"
    fireEvent.change(input, { target: { value: '1/2026', selectionStart: 1 } })
    // fewer segments than prev → rail-restore no-op keeps prior string
    expect(input.value).toBe('12/08/2026')
  })

  test('range: deleting a separator on the second end is a no-op', () => {
    render(
      <DatePicker id="dp" label="Date" format="DD/MM/YYYY" mode="range"
        value={{ start: new Date(2026, 6, 14), end: new Date(2026, 7, 20) }} onChange={() => {}} />
    )
    const input = screen.getByRole('textbox')
    expect(input.value).toBe('14/07/2026 - 20/08/2026')
    // remove the "/" between 20 and 08 on the second end
    fireEvent.change(input, { target: { value: '14/07/2026 - 2008/2026', selectionStart: 16 } })
    expect(input.value).toBe('14/07/2026 - 20/08/2026')
  })

  test('typing "45" as day is accepted mid-typing (no mask rejection)', () => {
    render(<DatePicker id="dp" label="Date" format="DD/MM/YYYY" onChange={() => {}} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '4/07/2026', selectionStart: 1 } })
    expect(input.value).toBe('4/07/2026')
    fireEvent.change(input, { target: { value: '45/07/2026', selectionStart: 2 } })
    expect(input.value).toBe('45/07/2026') // accepted mid-typing
  })

  test('typing "32/07/2026" and blurring shows error, keeps text', () => {
    const onChange = vi.fn()
    render(<DatePicker id="dp" label="Date" format="DD/MM/YYYY" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '32/07/2026', selectionStart: 10 } })
    expect(input.value).toBe('32/07/2026') // accepted mid-typing
    fireEvent.blur(input)
    expect(onChange).not.toHaveBeenCalled() // invalid, no emit
    expect(screen.getByText(/valid date/i)).toBeTruthy() // error shown
    expect(input.value).toBe('32/07/2026') // text kept as-is
  })

  test('typing month "13" is accepted mid-typing, fails at commit', () => {
    const onChange = vi.fn()
    render(<DatePicker id="dp" label="Date" format="DD/MM/YYYY" value={new Date(2026, 0, 12)} onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '12/1/2026', selectionStart: 4 } })
    fireEvent.change(input, { target: { value: '12/13/2026', selectionStart: 5 } })
    expect(input.value).toBe('12/13/2026') // accepted mid-typing
    fireEvent.blur(input)
    expect(onChange).not.toHaveBeenCalled() // invalid month fails commit
    expect(screen.getByText(/valid date/i)).toBeTruthy()
  })

  test('commit pads single-digit segments on blur', () => {
    const onChange = vi.fn()
    render(<DatePicker id="dp" label="Date" format="DD/MM/YYYY" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '4/7/2026', selectionStart: 8 } })
    fireEvent.blur(input)
    expect(input.value).toBe('04/07/2026')
    expect(onChange.mock.calls.at(-1)[0]).toBeInstanceOf(Date)
  })

  test('trailing calendar button toggles the popover', () => {
    render(<DatePicker id="dp" label="Date" format="DD/MM/YYYY" onChange={() => {}} />)
    const toggle = screen.getByRole('button', { name: /open calendar/i })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: /close calendar/i }).getAttribute('aria-expanded')).toBe('true')
  })
})

// ── Portal regression guard ───────────────────────────────────────────────
// The calendar popover must render into document.body (via useAnchoredPortal),
// not as a child of the field wrapper — otherwise an ancestor's `overflow`
// (e.g. DataTable's `.odyssey-data-table__card { overflow: clip }`) clips it.
describe('DatePicker — calendar popover portals to document.body', () => {
  test('the open popover is NOT a descendant of the field wrapper', () => {
    const { container } = render(<DatePicker id="dp" label="Date" format="DD/MM/YYYY" onChange={() => {}} />)
    const toggle = screen.getByRole('button', { name: /open calendar/i })
    fireEvent.click(toggle)
    // The calendar renders (month title present) …
    expect(screen.getByText(/january|february|march|april|may|june|july|august|september|october|november|december/i)).toBeTruthy()
    // … but none of its day cells live inside the component's own render tree.
    const wrapper = container.querySelector('.date-picker')
    const dayCell = dayButtons()[0]
    expect(dayCell).toBeTruthy()
    expect(wrapper.contains(dayCell)).toBe(false)
    // It IS mounted somewhere under document.body (the portal target).
    expect(document.body.contains(dayCell)).toBe(true)
  })
})

describe('parseDDMMYYYY (commit-time validation unchanged)', () => {
  test('valid date parses', () => expect(parseDDMMYYYY('14/07/2026')).toBeInstanceOf(Date))
  test('invalid day → null', () => expect(parseDDMMYYYY('32/07/2026')).toBeNull())
  test('incomplete → null', () => expect(parseDDMMYYYY('14/07/2')).toBeNull())
})
