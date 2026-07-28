import { useState, useEffect, useRef } from 'react'
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

// Format-aware display/parse (the segment mask itself is order-agnostic).
// `format` — 'DD/MM/YYYY' (default) | 'MM/DD/YYYY' (US, Jira LINX-8120 dates).
export function fmtDate(d, format = 'DD/MM/YYYY') {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return format === 'MM/DD/YYYY' ? `${mm}/${dd}/${d.getFullYear()}` : `${dd}/${mm}/${d.getFullYear()}`
}

// While-typing filter for a single dd/mm/yyyy field. Editing is FREE except:
// digit caps per segment (2/2/4); separators are structural rails (always emit
// exactly 3 "/"-joined slots, empty segments kept — no reset-to-01). Any digit
// value is accepted while typing; parseDDMMYYYY validates at commit (blur/Enter).
//
// Historic name `maskDDMMYYYY` kept for the Angular twin + call sites.
export function maskDDMMYYYY(raw, prev = '') {
  const lens = [2, 2, 4]
  const cap = (s, i) => (s ?? '').replace(/\D/g, '').slice(0, lens[i])
  const prevSegs = prev.split('/')
  // No separators yet (fresh field being typed) → single free segment, capped.
  // Once separators exist they are structural rails: always emit exactly 3
  // "/"-joined slots (empty kept), and a deleted "/" (fewer than 3 segments)
  // is restored from the prior split so rails never merge.
  if (!raw.includes('/')) return cap(raw, 0)
  const segs = raw.split('/')
  // A "/" was deleted (rail removed) → no-op: keep the prior string. Separators
  // are fixed; the caret skips across them instead of erasing them.
  if (prevSegs.length >= 3 && segs.length < prevSegs.length) return prev
  const out = []
  for (let i = 0; i < 3; i++) {
    out.push(cap(segs[i], i))
  }
  return out.join('/')
}

// Range filter: two single fields joined with " - ". Free editing, digit caps
// per segment on each side, same separator the display uses.
export function maskRange(raw, prev = '') {
  const [a, b] = raw.split(' - ')
  const [pa = '', pb = ''] = prev.split(' - ')
  if (b === undefined) return maskDDMMYYYY(a, pa)
  return `${maskDDMMYYYY(a, pa)} - ${maskDDMMYYYY(b, pb)}`
}

const MIN_DATE = new Date(1900, 0, 1)
const MAX_DATE = new Date(2120, 0, 1)

// Commit-time normalization: zero-pad single-digit day/month ("4/7/2026" →
// "04/07/2026") so a valid short draft parses. Year is left as typed.
export function padSegments(text) {
  const segs = text.split('/')
  if (segs.length !== 3) return text
  const [d, mo, y] = segs
  const pad = (s) => (/^\d$/.test(s) ? '0' + s : s)
  return `${pad(d)}/${pad(mo)}/${y}`
}

export function parseDate(text, format = 'DD/MM/YYYY', minDate = MIN_DATE, maxDate = MAX_DATE) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(padSegments(text))
  if (!m) return null
  const [, a, b, yyyy] = m.map(Number)
  const [dd, mm] = format === 'MM/DD/YYYY' ? [b, a] : [a, b]
  const d = new Date(yyyy, mm - 1, dd)
  if (d.getDate() !== dd || d.getMonth() !== mm - 1) return null
  return d >= minDate && d <= maxDate ? d : null
}

// Full masked string → Date, or null if incomplete/invalid or out of bounds.
export function parseDDMMYYYY(text, minDate = MIN_DATE, maxDate = MAX_DATE) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(padSegments(text))
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
  format = 'DD/MM/YYYY',
  minDate = MIN_DATE,
  maxDate = MAX_DATE,
  disabled = false,
  error,
  id,
}) {
  // Format-bound aliases — every display/parse in the component routes through these
  const fmt = (d) => fmtDate(d, format)
  const parse = (t) => parseDate(t, format, minDate, maxDate)
  const [text, setText] = useState('')
  const [invalid, setInvalid] = useState(false)
  const editingRef = useRef(false)
  const { open, setOpen, wrapperRef, wrapperProps, fieldProps, popoverProps, closeAndBlur } =
    useFieldPopover({ onCommit: () => commit() })

  // Trailing calendar icon toggles the popover (mirrors TimePicker's chevron button):
  // a real button with aria-label + mousedown preventDefault so the field keeps focus.
  const toggleOpen = () => {
    setOpen(!open)
    wrapperRef.current?.querySelector('input')?.focus()
  }

  // Sync text from the controlled value ONLY when not actively editing — an
  // external change (reset, calendar pick) refreshes the display, but a mid-edit
  // draft is never clobbered. (The TimePicker fix: value→text echo mid-keystroke
  // was what snapped the field and blocked editing.)
  const displayValue = () => {
    if (mode === 'single') return value instanceof Date ? fmt(value) : ''
    const parts = [value?.start, value?.end].filter(Boolean).map(fmt)
    return parts.join(' - ')
  }
  useEffect(() => {
    if (editingRef.current) return
    setText(displayValue())
    setInvalid(false)
  }, [value, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const defaultPlaceholder = placeholder ?? (mode === 'single' ? 'Select Date' : 'Select Range')

  // Typing is free-form: only cap segment digits + keep separators, never parse
  // or emit mid-keystroke. Caret is preserved because the filter only strips
  // illegal chars / overflow, so digits-before-caret map 1:1 back.
  const handleText = (e) => {
    editingRef.current = true
    setInvalid(false)
    const input = e.target
    const raw = input.value
    const caret = input.selectionStart
    const filtered = mode === 'single' ? maskDDMMYYYY(raw, text) : maskRange(raw, text)
    setText(filtered)

    // If the filter kept the string as-is (e.g. deleting digits leaves the
    // separators the user didn't touch), the browser's caret is already correct —
    // don't move it, or an emptied segment ("12/|/2026") snaps to the wrong side.
    // Only re-anchor when the filter actually stripped chars: land after the Nth
    // kept digit, where N = digits before the original caret.
    if (filtered === raw) return
    const digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, '').length
    requestAnimationFrame(() => {
      let pos = 0, seen = 0
      while (pos < filtered.length && seen < digitsBeforeCaret) {
        if (/\d/.test(filtered[pos])) seen++
        pos++
      }
      input.setSelectionRange(pos, pos)
    })
  }

  // Commit on blur/Enter: parse the draft, emit onChange + normalized display on
  // valid, flag error on invalid. Empty clears. Guarded against the calendar
  // pick's programmatic blur (pickedRef), which already committed the picked date.
  const pickedRef = useRef(false)
  const commit = () => {
    editingRef.current = false
    if (pickedRef.current) { pickedRef.current = false; return }
    const raw = text.trim()
    if (!raw) {
      setInvalid(false)
      if (mode === 'single') onChange?.(null)
      else onChange?.({ start: null, end: null })
      return
    }
    if (mode === 'single') {
      const parsed = parse(raw)
      if (parsed) { setInvalid(false); setText(fmt(parsed)); onChange?.(parsed) }
      else setInvalid(true)
    } else {
      const [a = '', b = ''] = raw.split(' - ')
      const start = parse(a.trim())
      const end = parse(b.trim())
      if (!start || !end) { setInvalid(true); return }
      const next = end < start ? { start: end, end: start } : { start, end }
      setInvalid(false)
      setText([next.start, next.end].map(fmt).join(' - '))
      onChange?.(next)
    }
  }

  const handleClear = () => {
    editingRef.current = false
    setText('')
    setInvalid(false)
    if (mode === 'single') onChange?.(null)
    else onChange?.({ start: null, end: null })
  }

  const single = mode === 'single' ? (value instanceof Date ? value : null) : null
  const range = mode === 'range' ? (value && typeof value === 'object' ? value : { start: null, end: null }) : null

  return (
    <div
      {...wrapperProps}
      className={mode === 'single' ? 'date-picker date-picker--single' : 'date-picker date-picker--range'}
      style={
        mode === 'single'
          ? { position: 'relative', maxWidth: 284 } // min-width via .date-picker--single (250px, 150px ≥1024px)
          : { position: 'relative', minWidth: 250, maxWidth: 284 }
      }
    >
      <FormField
        id={id}
        label={label}
        placeholder={defaultPlaceholder}
        value={text}
        onChange={handleText}
        onBlur={commit}
        onClear={text ? handleClear : undefined}
        trailingIcon={
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleOpen}
            disabled={disabled}
            aria-label={open ? 'Close calendar' : 'Open calendar'}
            aria-expanded={open}
            className="flex items-center justify-center border-none bg-transparent p-0"
            style={{ color: 'inherit', cursor: disabled ? 'default' : 'pointer' }}
          >
            <CalendarDays size={20} aria-hidden="true" />
          </button>
        }
        disabled={disabled}
        error={error ?? (invalid ? 'Enter a valid date' : undefined)}
        {...fieldProps}
      />
      {open && (
        <div
          {...popoverProps}
          style={{ position: 'absolute', top: '100%', left: 0, marginTop: 'var(--spacing-2)', zIndex: 10 }}
        >
          {mode === 'single' ? (
            <CalendarPicker
              key={single ? fmt(single) : 'unset'}
              mode="single"
              value={single}
              onChange={(d) => { pickedRef.current = true; editingRef.current = false; setInvalid(false); onChange?.(d); setText(fmt(d)); closeAndBlur() }}
              defaultMonth={single ?? new Date()}
              minDate={minDate}
              maxDate={maxDate}
            />
          ) : (
            <CalendarPicker
              mode="range"
              value={range}
              onChange={(next) => {
                setInvalid(false)
                onChange?.(next)
                setText([next.start, next.end].filter(Boolean).map(fmt).join(' - '))
                if (next.start && next.end) { pickedRef.current = true; editingRef.current = false; closeAndBlur() }
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
