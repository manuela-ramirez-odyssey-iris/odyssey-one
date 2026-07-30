import { useState, useEffect, useId, useRef } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import FormField from './FormField.jsx'
import DropdownMenu from './DropdownMenu.jsx'
import MenuRow from './MenuRow.jsx'
import { useFieldPopover } from './useFieldPopover.js'
import { moveHighlight } from './GlobalSearch.jsx'

/**
 * TimePicker — molecule. FormField shell + chevron trigger + a DropdownMenu
 * of time options generated from `step`, with a typeable, liberally-parsed input.
 *
 * Code-only composite over Figma masters `TimePicker` 4534:5204 (field + open
 * dropdown). Mirrors DatePicker's FormField + useFieldPopover recipe.
 *
 * Keyboard (mirrors ComboBox's combobox typeahead): ArrowDown/Up opens +
 * moves the active-row highlight (wraps, scrolls into view); Enter selects the
 * active row (sets value + closes); Escape closes. The trailing chevron is a
 * real button (aria-label, flips Down↔Up with open state) that toggles the
 * dropdown and focuses the input.
 *
 * Props:
 *   value       — controlled "HH:MM" 24h string (canonical), or '' for unset.
 *   onChange    — (canonical "HH:MM" 24h string) on a valid parse / row pick; '' on clear.
 *   format      — 'standard' (12h AM/PM, default) | 'international' (24h) — display only.
 *   step        — minutes between generated options (default 30).
 *   min / max   — optional "HH:MM" 24h bounds; options outside are excluded.
 *   placeholder — FormField placeholder (default 'Select Time').
 *   label       — FormField label.
 *   disabled    — passed through to FormField.
 *   id          — passed through to FormField.
 */

// ── Time helpers (canonical = minutes-since-midnight / "HH:MM" 24h) ───────────

// "HH:MM" 24h → minutes-since-midnight, or null if malformed / out of day range.
export function parseCanonical(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

// minutes → canonical "HH:MM" 24h.
export function toCanonical(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// minutes → display string per format.
export function formatTime(mins, format = 'standard') {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const mm = String(m).padStart(2, '0')
  if (format === 'international') return `${String(h).padStart(2, '0')}:${mm}`
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${mm} ${period}`
}

// Liberal parse of user text against the active format → minutes-since-midnight,
// or null. Accepts "8:30 am", "0830", "14:30", "8", "8 pm", "830".
// In 'standard' a bare hour with no meridiem is taken literally (8 → 08:00);
// a meridiem overrides (8 pm → 20:00). In 'international' everything is 24h.
export function parseTime(raw, format = 'standard') {
  const text = (raw || '').trim().toLowerCase()
  if (!text) return null

  const meridiem = /\b([ap])\.?m?\.?\b/.exec(text)?.[1] // 'a' | 'p' | undefined
  const colon = text.includes(':')

  let h
  let m
  if (colon) {
    const parts = text.split(':')
    h = parseInt(parts[0].replace(/[^\d]/g, ''), 10)
    m = parseInt((parts[1] || '0').replace(/[^\d]/g, '').slice(0, 2) || '0', 10)
  } else {
    const digits = text.replace(/[^\d]/g, '')
    if (digits.length === 0) return null
    if (digits.length <= 2) {
      h = parseInt(digits, 10)
      m = 0
    } else {
      // 3–4 digits: last two are minutes.
      m = parseInt(digits.slice(-2), 10)
      h = parseInt(digits.slice(0, -2), 10)
    }
  }

  if (Number.isNaN(h) || Number.isNaN(m)) return null
  if (m > 59) return null

  if (format === 'standard' && meridiem) {
    if (h < 1 || h > 12) return null
    if (meridiem === 'p' && h !== 12) h += 12
    if (meridiem === 'a' && h === 12) h = 0
  }
  if (h > 23) return null
  return h * 60 + m
}

// Generate option minutes 00:00 → last step before 24:00, honoring min/max.
export function stepOptions(step, min, max) {
  const s = step > 0 ? step : 30
  const lo = min != null ? parseCanonical(min) ?? 0 : 0
  const hi = max != null ? parseCanonical(max) ?? 24 * 60 - 1 : 24 * 60 - 1
  const out = []
  for (let t = 0; t < 24 * 60; t += s) {
    if (t >= lo && t <= hi) out.push(t)
  }
  return out
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TimePicker({
  value = '',
  onChange,
  format = 'standard',
  error: externalError,
  step = 30,
  min,
  max,
  placeholder = 'Select Time',
  label,
  disabled = false,
  id,
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')  // internal parse error; externalError (form validation) shows when this is clear
  const [activeIdx, setActiveIdx] = useState(-1)
  const listboxId = useId()
  const { open, setOpen, wrapperRef, wrapperProps, fieldProps, popoverProps, closeAndBlur } =
    useFieldPopover()

  // Sync display text when the controlled value changes externally.
  useEffect(() => {
    const mins = parseCanonical(value)
    setText(mins != null ? formatTime(mins, format) : '')
    if (mins != null) setError('')
  }, [value, format])

  const options = stepOptions(step, min, max)

  // Keep the active row inside the scroll window as arrows move it.
  useEffect(() => {
    if (activeIdx < 0) return
    const row = wrapperRef.current?.querySelector(`[data-index="${activeIdx}"]`)
    row?.scrollIntoView?.({ block: 'nearest' }) // jsdom has no scrollIntoView
  }, [activeIdx, wrapperRef])

  const commit = (mins) => {
    setError('')
    setText(formatTime(mins, format))
    onChange?.(toCanonical(mins))
  }

  // Guards the blur-commit against the programmatic input.blur() inside
  // closeAndBlur() after a row pick: that blur still sees the PRE-pick `text`
  // closure and would re-commit the stale draft, overwriting the pick.
  const pickedRef = useRef(false)
  const pick = (mins) => {
    pickedRef.current = true
    commit(mins)
    setActiveIdx(-1)
    closeAndBlur()
  }

  // Typing is free-form: only track the draft, never parse/emit mid-keystroke.
  // Emitting onChange here echoed value→text through the sync effect and snapped
  // the field to the formatted parse on every keystroke (the "won't let me edit"
  // bug). Commit happens on blur/Enter only.
  const handleText = (e) => {
    setText(e.target.value)
    setError('')
    setActiveIdx(-1)
    if (!open) setOpen(true)
  }

  // On blur, validate + commit: unparseable → error; parseable → normalize + emit
  // the exact typed time (never step-snapped). Empty → clear.
  const handleBlur = () => {
    if (pickedRef.current) { pickedRef.current = false; return } // pick already committed
    if (!text.trim()) { setError(''); onChange?.(''); return }
    const mins = parseTime(text, format)
    if (mins == null) setError('Enter a valid time')
    else commit(mins)
  }

  const handleClear = () => {
    setText('')
    setError('')
    setActiveIdx(-1)
    onChange?.('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      setActiveIdx((cur) => moveHighlight(options.length, cur, e.key === 'ArrowDown' ? 1 : -1))
      return
    }
    if (e.key === 'Enter') {
      // Explicitly-arrowed row wins; otherwise the typed draft commits (typing
      // resets activeIdx to -1, so a typed-then-Enter lands here).
      if (open && activeIdx >= 0) {
        e.preventDefault()
        pick(options[activeIdx])
        return
      }
      const mins = parseTime(text, format)
      if (text.trim() && mins == null) { e.preventDefault(); setError('Enter a valid time'); return }
      if (mins != null) { pickedRef.current = true; commit(mins) } // blur re-commit would be redundant
      // fall through to wrapper handler to close/blur
    }
    // Tab / Escape / plain Enter → useFieldPopover's wrapper handler.
    wrapperProps.onKeyDown(e)
  }

  const toggleOpen = () => {
    setOpen(!open)
    if (open) setActiveIdx(-1)
    wrapperRef.current?.querySelector('input')?.focus()
  }

  const selectedMins = parseCanonical(value)

  return (
    <div
      ref={wrapperProps.ref}
      onBlur={wrapperProps.onBlur}
      onKeyDown={handleKeyDown}
      className="time-picker"
      style={{ position: 'relative' }} /* width via .time-picker CSS (320px, auto ≥1024px) */
    >
      <FormField
        id={id}
        label={label}
        placeholder={placeholder}
        value={text}
        onChange={handleText}
        onBlur={handleBlur}
        onClear={text ? handleClear : undefined}
        trailingIcon={
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleOpen}
            disabled={disabled}
            aria-label={open ? 'Close time options' : 'Open time options'}
            aria-expanded={open}
            aria-controls={listboxId}
            className="flex items-center justify-center border-none bg-transparent p-0"
            style={{ color: 'inherit', cursor: disabled ? 'default' : 'pointer' }}
          >
            {open
              ? <ChevronUp {...ICON_MD} aria-hidden="true" />
              : <ChevronDown {...ICON_MD} aria-hidden="true" />}
          </button>
        }
        disabled={disabled}
        error={error || externalError || undefined}
        onFocus={fieldProps.onFocus}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeIdx >= 0 ? `${listboxId}-option-${activeIdx}` : undefined}
        aria-autocomplete="list"
      />
      {open && !disabled && (
        <div
          {...popoverProps}
          style={{ position: 'absolute', top: '100%', left: 0, width: '100%', marginTop: 'var(--spacing-2)', zIndex: 10 }}
        >
          {/* 5-row viewport (~36px rows), scrollable beyond. */}
          <DropdownMenu
            id={listboxId}
            role="listbox"
            emptyMessage="No times available"
            style={{ maxHeight: 180, overflowY: 'auto', width: '100%', boxSizing: 'border-box' }}
          >
            {options.map((mins, i) => (
              <MenuRow
                key={mins}
                id={`${listboxId}-option-${i}`}
                data-index={i}
                role="option"
                aria-selected={mins === selectedMins}
                className={i === activeIdx ? 'is-active' : ''}
                label={formatTime(mins, format)}
                selected={mins === selectedMins}
                onClick={() => pick(mins)}
              />
            ))}
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}
