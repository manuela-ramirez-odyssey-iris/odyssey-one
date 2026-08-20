import { useCallback, useId, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import {
  Badge, DropdownMenu, FormField, MenuRow, useAnchoredPortal, useFieldPopover,
} from '@odyssey/ui'
import { useCountdown, formatHMS, formatMMSS } from '../../spotboard/Countdown.jsx'
import './durationPicker.css'

/**
 * DurationPicker — pick an AMOUNT of time, then watch it burn down.
 *
 * Deliberately NOT a mode on TimePicker (user ruling, 2026-08-19). The two
 * share structure (FormField shell + anchored listbox) but not intent:
 * TimePicker picks a time-of-day and its whole contract is built on that —
 * a canonical 24h "HH:MM" value, 12h/24h display formats, liberal parsing of
 * "8:30 pm". None of that means anything for "how long is this bid open".
 * Per the merge-vs-primitive rule, shared STRUCTURE gets a shared primitive
 * (which is what the @odyssey/ui imports above are), shared INTENT gets a
 * merge — this is the former.
 *
 * App-local on purpose: un-normalized components stay in the app until they
 * have been through Figma + /normalize (CLAUDE.md, Normalization policy).
 *
 * Two states:
 *   IDLE     — a pick-only dropdown of unit-appropriate increments.
 *   RUNNING  — locked, with a live countdown Badge inside the field. The
 *              parent drives this via `running` + `endsAt`; the component
 *              never starts or stops itself. It does NOT self-reset at zero
 *              (user: "field gets reset only with an external event even if it
 *              hits 0") — a finished countdown stays on screen, red, until the
 *              parent takes it down. That is the point: the planner has to see
 *              that the window closed.
 *
 * Props:
 *   unit      — 'hours' | 'minutes' | 'seconds'. Drives increments AND ceiling.
 *   value     — number of `unit`s, or '' for unset (controlled).
 *   onChange  — (number) on pick.
 *   running   — external lock. True → no selection, countdown Badge shown.
 *   endsAt    — epoch ms the countdown targets. Required when `running`.
 *   totalMs   — optional: the full window length, for the colour thresholds.
 *               Defaults to `value` in ms, which is right whenever the running
 *               window is the one that was picked here.
 */

// Per-unit increment + ceiling (user spec, 2026-08-19). `step` is also the
// smallest selectable value — there is no zero-length window.
export const UNIT_CONFIG = {
  hours:   { step: 1,  max: 24,  ms: 3_600_000, abbr: 'hr'  },
  minutes: { step: 10, max: 120, ms: 60_000,    abbr: 'min' },
  seconds: { step: 30, max: 240, ms: 1_000,     abbr: 'sec' },
}

// step → ceiling inclusive: hours 1..24, minutes 10..120, seconds 30..240.
export function durationOptions(unit) {
  const cfg = UNIT_CONFIG[unit] ?? UNIT_CONFIG.minutes
  const out = []
  for (let v = cfg.step; v <= cfg.max; v += cfg.step) out.push(v)
  return out
}

export function formatDuration(value, unit) {
  const cfg = UNIT_CONFIG[unit] ?? UNIT_CONFIG.minutes
  return `${value} ${cfg.abbr}`
}

// Remaining ms → clock, built on the EXISTING spotboard formatters rather than
// a third implementation: formatMMSS below an hour (what Countdown itself
// shows), formatHMS above it so a 24-hour window doesn't read "1440:00".
// Both already clamp at zero, which is what keeps an expired countdown from
// rendering negative time while it waits for the parent to reset it.
export function formatRemaining(ms) {
  const { hh, mm, ss } = formatHMS(ms)
  return Number(hh) > 0 ? `${hh}:${mm}:${ss}` : formatMMSS(ms)
}

// green while healthy → amber inside the last 30% → red at zero (user spec).
// Ratio, not an absolute cut, so a 4-minute window and a 24-hour window both
// warn at the same point in their own life.
export function countdownVariant(remainingMs, totalMs) {
  if (remainingMs <= 0) return 'red'
  if (totalMs > 0 && remainingMs / totalMs <= 0.3) return 'amber'
  return 'green'
}

export default function DurationPicker({
  unit = 'minutes',
  value = '',
  onChange,
  running = false,
  endsAt = null,
  totalMs,
  label,
  placeholder,
  disabled = false,
  id,
  error,
}) {
  const [activeIdx, setActiveIdx] = useState(-1)
  const listboxId = useId()
  const { open, setOpen, wrapperRef, wrapperProps, fieldProps, popoverProps } = useFieldPopover()
  const closePopover = useCallback(() => setOpen(false), [setOpen])
  const { triggerRef, dropdownRef, AnchoredPortal } = useAnchoredPortal({ open, onClose: closePopover })
  const setWrapperNode = useCallback((node) => {
    wrapperRef.current = node
    triggerRef.current = node
  }, [wrapperRef, triggerRef])

  const cfg = UNIT_CONFIG[unit] ?? UNIT_CONFIG.minutes
  const options = durationOptions(unit)
  const locked = running || disabled

  return (
    <div
      ref={setWrapperNode}
      onBlur={wrapperProps.onBlur}
      onKeyDown={locked ? undefined : wrapperProps.onKeyDown}
      className="duration-picker"
      style={{ position: 'relative' }}
    >
      {running && endsAt
        ? <RunningField id={id} label={label} endsAt={endsAt}
            totalMs={totalMs ?? (Number(value) || 0) * cfg.ms} />
        : (
          <FormField
            id={id}
            label={label}
            showLabel={!!label}
            placeholder={placeholder ?? `Select ${unit}`}
            value={value === '' || value == null ? '' : formatDuration(value, unit)}
            readOnly
            onFocus={fieldProps.onFocus}
            disabled={disabled}
            error={error}
            trailingIcon={
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setOpen(!open)
                  if (open) setActiveIdx(-1)
                }}
                disabled={locked}
                aria-label={open ? 'Close duration options' : 'Open duration options'}
                aria-expanded={open}
                aria-controls={listboxId}
                className="flex items-center justify-center border-none bg-transparent p-0"
                style={{ color: 'inherit', cursor: locked ? 'default' : 'pointer' }}
              >
                {open
                  ? <ChevronUp {...ICON_MD} aria-hidden="true" />
                  : <ChevronDown {...ICON_MD} aria-hidden="true" />}
              </button>
            }
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listboxId}
          />
        )}

      {open && !locked && (
        <AnchoredPortal>
          <div {...popoverProps} ref={dropdownRef}>
            {/* Same 5-row viewport TimePicker uses — these lists run to 24 rows. */}
            <DropdownMenu
              id={listboxId}
              role="listbox"
              emptyMessage="No durations available"
              style={{ maxHeight: 180, overflowY: 'auto', width: '100%', boxSizing: 'border-box' }}
            >
              {options.map((opt, i) => (
                <MenuRow
                  key={opt}
                  id={`${listboxId}-option-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={opt === Number(value)}
                  className={i === activeIdx ? 'is-active' : ''}
                  label={formatDuration(opt, unit)}
                  selected={opt === Number(value)}
                  onClick={() => {
                    onChange?.(opt)
                    setOpen(false)
                    setActiveIdx(-1)
                  }}
                />
              ))}
            </DropdownMenu>
          </div>
        </AnchoredPortal>
      )}
    </div>
  )
}

// Split out so the 1s tick lives in a component that only mounts while the
// countdown is running — an interval behind a `running &&` branch in the parent
// would re-render the whole picker (and its listbox) every second.
function RunningField({ id, label, endsAt, totalMs }) {
  const remaining = useCountdown(endsAt)
  const variant = countdownVariant(remaining, totalMs)
  return (
    <div className="duration-picker__running">
      {/* Same label markup FormField emits (form-field__label-row / __label,
          text-label-sm-medium), so the field's label doesn't visibly shift
          typography or spacing when the picker flips into its running state. */}
      {label && (
        <div className="form-field__label-row">
          <label htmlFor={id} className="form-field__label text-label-sm-medium">{label}</label>
        </div>
      )}
      <div
        id={id}
        className="duration-picker__badge-shell"
        role="timer"
        aria-live="off"
        aria-label={`${label ? label + ': ' : ''}${formatRemaining(remaining)} remaining`}
      >
        <Badge variant={variant} statusDot>{formatRemaining(remaining)}</Badge>
      </div>
    </div>
  )
}
