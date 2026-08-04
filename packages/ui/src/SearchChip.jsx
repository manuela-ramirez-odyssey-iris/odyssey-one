import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import CalendarPicker from './CalendarPicker.jsx'

// Padded MM/DD/YYYY string ↔ Date, for the date mode's CalendarPicker
// round-trip (platform date-format canon, S107 addendum — @odyssey/ui can't
// import the app's shared lib/dates.js, so the pad is inlined here).
const parseMDY = (s) => {
  const m = String(s ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  return m ? new Date(+m[3], +m[1] - 1, +m[2]) : null
}
const fmtMDY = (d) =>
  d instanceof Date
    ? `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`
    : null

/**
 * Splits a pasted multi-code string into codes — commas, whitespace and
 * newlines all separate (same rule as the search engine's tokenizeText;
 * duplicated here because @odyssey/ui cannot import app code).
 */
export function splitCodes(text) {
  return (text || '').split(/[\s,]+/).filter(Boolean)
}

/**
 * SearchChip — a committed search criterion as a chip (GS-21, Case 11).
 * Figma: Design System - MCP → Components-Molecules → GlobalSearch → SearchChip.
 *
 * Two types, matching the Figma `Type` axis:
 * - **Single** (`label` given): one attribute:value chip — label + remove.
 * - **Set** (`codes` given): a multi-code list as ONE expandable chip.
 *   Collapsed: `<typeLabel> Set • N IDs` (named-set rule) or `Multiple Set •
 *   N IDs` (mixed). N counts VALID codes only. Expanded: an EditableMiniPanel
 *   anchored 4px below the badge (always follows the badge position). Invalid
 *   codes paint red and are decounted. Click the code list to edit as free
 *   text; edits reach `onCommit` only on Enter or collapse — never per
 *   keystroke (results must not update while typing).
 *
 * `onRemove` renders the X — a Set chip is a criterion like any other, so
 * removing (or keeping) it never blocks chaining more chips after it.
 *
 * Validity is the PARENT's job: `codes` come in as `{ value, valid }` — the
 * component only renders the flags; recomputing them after a commit is the
 * search engine's per-code validation.
 */
export default function SearchChip({
  label = null,
  typeLabel = null,
  codes = [],
  onCommit,
  onRemove,
  // Date mode (Case 12 / GS-22): `dateLabel` switches the chip to a date
  // criterion — collapsed reads "<dateLabel>[ Range]: from[-to]"; expanded
  // shows a CalendarPicker in the mini panel. `from`/`to` are M/D/YYYY
  // strings; picks emit onDateChange({ from, to }).
  dateLabel = null,
  range = false,
  from = null,
  to = null,
  defaultMonth,
  // Invalid typed date ("40/"): the chip reads "<dateLabel>: Invalid Date" in
  // red and the calendar never shows (consumers keep `open` false).
  invalid = false,
  onDateChange,
  defaultOpen = false,
  // Optional CONTROLLED open state: pass `open` (+ react to onOpenChange) when
  // the consumer needs to close the chip from outside (e.g. the search bar's
  // Enter closes an open date chip and that close triggers the results).
  open: openProp = null,
  onOpenChange,
  className = '',
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = openProp != null ? openProp : internalOpen
  const setOpen = (next) => {
    if (openProp == null) setInternalOpen(next)
    onOpenChange?.(next)
  }
  // null = read view; a string = the textarea draft being edited.
  const [draft, setDraft] = useState(null)
  const rootRef = useRef(null)
  // Caret position to restore when the textarea mounts (click-to-edit lands
  // the cursor where the user clicked, not at the start).
  const caretRef = useRef(null)

  const isDate = dateLabel != null
  const isSet = !isDate && label == null
  const validCount = codes.filter((c) => c.valid !== false).length
  const summary = isDate
    ? (invalid ? `${dateLabel}: Invalid Date` : `${dateLabel}: ${from || ''}${range ? `-${to || ''}` : ''}`)
    : `${typeLabel || 'Multiple'} Set • ${validCount} ID${validCount === 1 ? '' : 's'}`
  const Chevron = open ? ChevronUp : ChevronDown

  const commitDraft = () => {
    if (draft != null) onCommit?.(splitCodes(draft))
    setDraft(null)
  }
  const toggle = () => {
    if (open) commitDraft()
    setOpen(!open)
  }

  // Clicking outside the open chip collapses it — committing any pending
  // edit, which is what triggers the panel search (commit points are
  // Enter / collapse / outside click, never keystrokes).
  useEffect(() => {
    if (!open) return
    const onOutsideDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        commitDraft()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutsideDown)
    return () => document.removeEventListener('mousedown', onOutsideDown)
  })

  // Click-to-edit: derive the caret offset in the joined draft string from
  // the clicked point, so editing starts where the user aimed. Falls back to
  // the end of the text when the browser can't resolve the point (or the
  // click landed on panel padding).
  const startEdit = (e) => {
    const text = codes.map((c) => c.value).join(',\n')
    let caret = text.length
    const point = document.caretRangeFromPoint
      ? (() => { const r = document.caretRangeFromPoint(e.clientX, e.clientY); return r && { node: r.startContainer, offset: r.startOffset } })()
      : document.caretPositionFromPoint
        ? (() => { const p = document.caretPositionFromPoint(e.clientX, e.clientY); return p && { node: p.offsetNode, offset: p.offset } })()
        : null
    const span = point?.node?.parentElement?.closest?.('.search-chip__code')
    if (span) {
      const spans = Array.from(span.parentElement.querySelectorAll('.search-chip__code'))
      const line = spans.indexOf(span)
      let lineStart = 0
      for (let i = 0; i < line; i++) lineStart += codes[i].value.length + 2 // ",\n"
      caret = lineStart + Math.min(point.offset, codes[line].value.length + 1)
    }
    caretRef.current = caret
    setDraft(text)
  }

  return (
    <span ref={rootRef} className={`search-chip ${className}`.trim()}>
      <span className="search-chip__badge text-label-xs-medium">
        {isSet || isDate ? (
          <button
            type="button"
            className={`search-chip__toggle${invalid ? ' search-chip__toggle--invalid' : ''}`}
            aria-expanded={open}
            onClick={toggle}
          >
            {summary}
            <Chevron {...ICON_MD} aria-hidden="true" />
          </button>
        ) : (
          <span className="search-chip__label">{label}</span>
        )}
        {onRemove && (
          <button type="button" className="search-chip__remove" aria-label="Remove" onClick={onRemove}>
            <X size={12} strokeWidth={2.25} />
          </button>
        )}
      </span>

      {isDate && open && (
        // No panel chrome — the CalendarPicker is its own card (white surface,
        // border, radius); this wrapper only anchors it 4px below the badge.
        <div className="search-chip__calendar" role="group" aria-label="Pick date">
          <CalendarPicker
            mode={range ? 'range' : 'single'}
            defaultMonth={defaultMonth}
            value={range ? { start: parseMDY(from), end: parseMDY(to) } : parseMDY(from)}
            onChange={(v) => {
              if (range) {
                onDateChange?.({ from: fmtMDY(v.start), to: fmtMDY(v.end) })
              } else {
                // Single date = a one-day range; picking it completes the chip.
                onDateChange?.({ from: fmtMDY(v), to: fmtMDY(v) })
                setOpen(false)
              }
            }}
          />
        </div>
      )}

      {isSet && open && (
        <div className="search-chip__panel" role="group" aria-label="Codes">
          {draft == null ? (
            <button
              type="button"
              className="search-chip__codes text-label-sm-regular"
              aria-label="Edit codes"
              onClick={startEdit}
            >
              {codes.map((c, i) => (
                <span
                  key={`${c.value}-${i}`}
                  className={`search-chip__code${c.valid === false ? ' search-chip__code--invalid' : ''}`}
                >
                  {c.value}
                  {i < codes.length - 1 ? ',' : ''}
                </span>
              ))}
            </button>
          ) : (
            <textarea
              className="search-chip__editor text-label-sm-regular"
              aria-label="Codes"
              autoFocus
              ref={(node) => {
                if (node && caretRef.current != null) {
                  node.setSelectionRange(caretRef.current, caretRef.current)
                  caretRef.current = null
                }
              }}
              value={draft}
              rows={Math.max(3, splitCodes(draft).length)}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  commitDraft()
                } else if (e.key === 'Escape') {
                  setDraft(null)
                }
              }}
            />
          )}
        </div>
      )}
    </span>
  )
}
