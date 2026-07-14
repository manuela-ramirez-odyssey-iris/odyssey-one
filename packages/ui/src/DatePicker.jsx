import { useState, useEffect } from 'react'
import { CalendarDays } from 'lucide-react'
import CalendarPicker from './CalendarPicker.jsx'
import FormField from './FormField.jsx'
import { useFieldPopover } from './useFieldPopover.js'

/**
 * DatePicker — composite molecule. FormField shell + CalendarPicker popover,
 * with a typeable dd/mm/yyyy mask for both single and range modes.
 *
 * Code-only composite (no Figma master). Extracted from CalendarPicker.demo.jsx.
 * The mask logic is debugged — do not rewrite.
 *
 * Props:
 *   mode        — 'single' (default) | 'range'
 *   value       — controlled Date|null (single) or { start, end } (range)
 *   onChange    — called with Date (single) or { start, end } (range)
 *   label       — FormField label
 *   placeholder — defaults 'Select Date' (single) / 'Select Range' (range)
 *   minDate     — lower bound (default 01/01/1900)
 *   maxDate     — upper bound (default 01/01/2120)
 *   disabled    — passed through to FormField
 *   error       — passed through to FormField
 *   id          — passed through to FormField
 */

// ── Mask helpers (debugged — port verbatim) ──────────────────────────────────

export function fmtDDMMYYYY(d) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// Progressive dd/mm/yyyy mask: digits only, slashes auto-inserted. When the
// string already carries slashes (an EDIT, not initial typing), segments are
// preserved positionally — emptying the day or month pair with content after
// it auto-resolves to "01" in place.
export function maskDDMMYYYY(raw) {
  if (raw.includes('/')) {
    const segs = raw.split('/').slice(0, 3)
    const lens = [2, 2, 4]
    const out = ['', '', '']
    let carry = ''
    for (let i = 0; i < 3; i++) {
      const d = carry + (segs[i] || '').replace(/\D/g, '')
      out[i] = d.slice(0, lens[i])
      carry = d.slice(lens[i])
    }
    if (out[0] === '' && (out[1] || out[2])) out[0] = '01'
    if (out[1] === '' && out[2]) out[1] = '01'
    while (out.length && out[out.length - 1] === '') out.pop()
    return out.join('/')
  }
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean)
  return parts.join('/')
}

// Range mask: two dates joined with " - ".
export function maskRange(raw) {
  if (raw.includes(' - ')) {
    const [a, b = ''] = raw.split(' - ')
    return b ? `${maskDDMMYYYY(a)} - ${maskDDMMYYYY(b)}` : maskDDMMYYYY(a)
  }
  const digits = raw.replace(/\D/g, '').slice(0, 16)
  const first = maskDDMMYYYY(digits.slice(0, 8))
  const rest = digits.slice(8)
  return rest ? `${first} - ${maskDDMMYYYY(rest)}` : first
}

const MIN_DATE = new Date(1900, 0, 1)
const MAX_DATE = new Date(2120, 0, 1)

// Full masked string → Date, or null if incomplete/invalid or out of bounds.
export function parseDDMMYYYY(text, minDate = MIN_DATE, maxDate = MAX_DATE) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)
  if (!m) return null
  const [, dd, mm, yyyy] = m.map(Number)
  const d = new Date(yyyy, mm - 1, dd)
  if (d.getDate() !== dd || d.getMonth() !== mm - 1) return null
  return d >= minDate && d <= maxDate ? d : null
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DatePicker({
  mode = 'single',
  value,
  onChange,
  label,
  placeholder,
  minDate = MIN_DATE,
  maxDate = MAX_DATE,
  disabled = false,
  error,
  id,
}) {
  const [text, setText] = useState('')
  const { open, setOpen, wrapperRef, wrapperProps, fieldProps, popoverProps, closeAndBlur } =
    useFieldPopover()

  // Sync text when controlled value changes externally (e.g. reset)
  useEffect(() => {
    if (mode === 'single') {
      setText(value ? fmtDDMMYYYY(value) : '')
    } else {
      const parts = [value?.start, value?.end].filter(Boolean).map(fmtDDMMYYYY)
      setText(parts.join(' - '))
    }
  }, [value, mode])

  const defaultPlaceholder = placeholder ?? (mode === 'single' ? 'Select Date' : 'Select Range')

  const handleText = (e) => {
    const input = e.target
    const digitsBeforeCaret = input.value.slice(0, input.selectionStart).replace(/\D/g, '').length
    const masked = mode === 'single' ? maskDDMMYYYY(input.value) : maskRange(input.value)
    setText(masked)

    // Caret restore after masking
    requestAnimationFrame(() => {
      let pos = 0, seen = 0
      while (pos < masked.length && seen < digitsBeforeCaret) {
        if (/\d/.test(masked[pos])) seen++
        pos++
      }
      input.setSelectionRange(pos, pos)
    })

    if (mode === 'single') {
      const parsed = parseDDMMYYYY(masked, minDate, maxDate)
      if (parsed) onChange?.(parsed)
    } else {
      const [a, b] = masked.split(' - ')
      const start = parseDDMMYYYY(a || '', minDate, maxDate)
      const end = parseDDMMYYYY(b || '', minDate, maxDate)
      onChange?.(start && end && end < start ? { start: end, end: start } : { start: start ?? null, end: end ?? null })
    }
  }

  const handleClear = () => {
    setText('')
    if (mode === 'single') onChange?.(null)
    else onChange?.({ start: null, end: null })
  }

  const single = mode === 'single' ? (value instanceof Date ? value : null) : null
  const range = mode === 'range' ? (value && typeof value === 'object' ? value : { start: null, end: null }) : null

  return (
    <div
      {...wrapperProps}
      style={{ position: 'relative', width: 240 }}
    >
      <FormField
        id={id}
        label={label}
        placeholder={defaultPlaceholder}
        value={text}
        onChange={handleText}
        onClear={text ? handleClear : undefined}
        trailingIcon={<CalendarDays size={20} />}
        disabled={disabled}
        error={error}
        {...fieldProps}
      />
      {open && (
        <div
          {...popoverProps}
          style={{ position: 'absolute', top: '100%', left: 0, marginTop: 'var(--spacing-2)', zIndex: 10 }}
        >
          {mode === 'single' ? (
            <CalendarPicker
              key={single ? fmtDDMMYYYY(single) : 'unset'}
              mode="single"
              value={single}
              onChange={(d) => { onChange?.(d); setText(fmtDDMMYYYY(d)); closeAndBlur() }}
              defaultMonth={single ?? new Date()}
              minDate={minDate}
              maxDate={maxDate}
            />
          ) : (
            <CalendarPicker
              mode="range"
              value={range}
              onChange={(next) => {
                onChange?.(next)
                setText([next.start, next.end].filter(Boolean).map(fmtDDMMYYYY).join(' - '))
                if (next.start && next.end) closeAndBlur()
              }}
              defaultMonth={range?.start ?? new Date()}
              minDate={minDate}
              maxDate={maxDate}
            />
          )}
        </div>
      )}
    </div>
  )
}
