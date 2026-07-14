import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Button from './Button.jsx'

/**
 * CalendarPicker — molecule. Single-month calendar for date or date-range
 * selection. Figma master: `CalendarPicker` set 4422:711 (Components-Molecules).
 *
 * Modes:
 *   `single` (default) — `value: Date|null`, `onChange(date: Date)`.
 *   `range`            — `value: { start: Date|null, end: Date|null }`,
 *                        `onChange({ start, end })`.
 *
 * Range interaction: first click sets start (clears end); second click sets
 * end (if before start, restarts with that day as the new start).
 *
 * `minDate` / `maxDate` (defaults 01/01/1900 – 01/01/2120) disable
 * out-of-range days and stop month navigation past either bound.
 *
 * Month navigation is internal — no `onMonthChange` prop (YAGNI).
 * Adjacent-month days (padding the grid) are rendered, clickable, and
 * navigate the displayed month when clicked.
 *
 * Figma master: `CalendarPicker` set 4422:711.
 */
export default function CalendarPicker({
  mode = 'single',
  value = null,
  onChange,
  defaultMonth,
  minDate = new Date(1900, 0, 1),
  maxDate = new Date(2120, 0, 1),
  className = '',
}) {
  // Derive the initial month from value/start/today.
  function initialMonth() {
    if (defaultMonth instanceof Date) return new Date(defaultMonth.getFullYear(), defaultMonth.getMonth(), 1)
    const seed = mode === 'range' ? value?.start : value
    if (seed instanceof Date) return new Date(seed.getFullYear(), seed.getMonth(), 1)
    const t = new Date()
    return new Date(t.getFullYear(), t.getMonth(), 1)
  }

  const [monthStart, setMonthStart] = useState(initialMonth)

  // ── helpers ────────────────────────────────────────────────────────────────

  /** ISO date string (YYYY-MM-DD) used as a stable key / comparison value. */
  function iso(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function isoValue(d) { return d instanceof Date ? iso(d) : null }

  /** Days in `month` (a date whose day is 1). */
  function daysInMonth(month) {
    return new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  }

  /**
   * Build the 6-row × 7-col grid. Each cell: { date, adjacent }.
   * Weeks start Sunday.
   */
  function buildGrid(month) {
    const year = month.getFullYear()
    const m    = month.getMonth()
    const first = new Date(year, m, 1).getDay() // 0=Sun
    const total = daysInMonth(month)

    const cells = []
    // Leading adjacent days from previous month
    const prevTotal = daysInMonth(new Date(year, m - 1, 1))
    for (let i = first - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, m - 1, prevTotal - i), adjacent: true })
    }
    // Current month
    for (let d = 1; d <= total; d++) {
      cells.push({ date: new Date(year, m, d), adjacent: false })
    }
    // Trailing adjacent days from next month
    let nextDay = 1
    while (cells.length % 7 !== 0) {
      cells.push({ date: new Date(year, m + 1, nextDay++), adjacent: true })
    }
    // Always render at least 5 rows (35 cells); most months need 5 or 6 rows.
    return cells
  }

  // ── month navigation ───────────────────────────────────────────────────────

  function prevMonth() {
    setMonthStart(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }
  function nextMonth() {
    setMonthStart(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }

  // ── min/max bounds ─────────────────────────────────────────────────────────

  function inBounds(d) {
    return iso(d) >= iso(minDate) && iso(d) <= iso(maxDate)
  }
  // Nav is allowed while the target month overlaps the bounds at all.
  const canPrev = new Date(monthStart.getFullYear(), monthStart.getMonth(), 0) >= minDate
  const canNext = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1) <= maxDate

  // ── click handling ─────────────────────────────────────────────────────────

  function handleDayClick(cell) {
    const { date, adjacent } = cell
    // Adjacent-month click navigates the calendar.
    if (adjacent) {
      setMonthStart(new Date(date.getFullYear(), date.getMonth(), 1))
    }
    if (!onChange) return

    if (mode === 'single') {
      onChange(date)
      return
    }

    // Range mode
    const start = value?.start
    const end   = value?.end

    if (!start || end) {
      // No start yet, or range already complete → restart
      onChange({ start: date, end: null })
    } else {
      // Have start, no end
      if (iso(date) < iso(start)) {
        // Clicked before start → restart with this as new start
        onChange({ start: date, end: null })
      } else {
        onChange({ start, end: date })
      }
    }
  }

  // ── day-cell state helpers ─────────────────────────────────────────────────

  function dayClasses(cell) {
    const d   = cell.date
    const key = iso(d)
    const cls = ['calendar-picker__day']

    if (cell.adjacent) cls.push('calendar-picker__day--adjacent')

    if (mode === 'single') {
      if (isoValue(value) === key) cls.push('calendar-picker__day--selected')
      return cls.join(' ')
    }

    // Range mode
    const startKey = isoValue(value?.start)
    const endKey   = isoValue(value?.end)

    if (startKey && key === startKey) {
      cls.push(endKey ? 'calendar-picker__day--range-start' : 'calendar-picker__day--pending-start')
    } else if (endKey && key === endKey) {
      cls.push('calendar-picker__day--range-end')
    } else if (startKey && endKey && key > startKey && key < endKey) {
      cls.push('calendar-picker__day--in-range')
    }

    return cls.join(' ')
  }

  function isSelected(cell) {
    if (mode === 'single') return isoValue(value) === iso(cell.date)
    const key = iso(cell.date)
    return key === isoValue(value?.start) || key === isoValue(value?.end)
  }

  // ── render ─────────────────────────────────────────────────────────────────

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const WEEKDAYS    = ['Su','Mo','Tu','We','Th','Fr','Sa']
  const title       = `${MONTH_NAMES[monthStart.getMonth()]} ${monthStart.getFullYear()}`

  const grid  = buildGrid(monthStart)
  const weeks = []
  for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7))

  const rootCls = ['calendar-picker', className].filter(Boolean).join(' ')

  return (
    <div className={rootCls}>
      {/* Header */}
      <div className="calendar-picker__header">
        <Button
          variant="icon"
          size="sm"
          icon={<ArrowLeft size={20} />}
          aria-label="Previous month"
          onClick={prevMonth}
          disabled={!canPrev}
        />
        <span className="calendar-picker__month-title text-label-sm-medium">{title}</span>
        <Button
          variant="icon"
          size="sm"
          icon={<ArrowRight size={20} />}
          aria-label="Next month"
          onClick={nextMonth}
          disabled={!canNext}
        />
      </div>

      {/* Weekday labels */}
      <div className="calendar-picker__weekdays" aria-hidden="true">
        {WEEKDAYS.map(d => (
          <span key={d} className="calendar-picker__weekday text-label-sm-regular">{d}</span>
        ))}
      </div>

      {/* Day grid */}
      <div className="calendar-picker__grid">
        {weeks.map((week, wi) => (
          <div key={wi} className="calendar-picker__week">
            {week.map((cell) => {
              const key = iso(cell.date)
              const label = cell.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
              return (
                <button
                  key={key}
                  type="button"
                  className={`${dayClasses(cell)} text-label-sm-medium`}
                  aria-label={label}
                  aria-pressed={isSelected(cell)}
                  disabled={!inBounds(cell.date)}
                  onClick={() => handleDayClick(cell)}
                >
                  {cell.date.getDate()}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
