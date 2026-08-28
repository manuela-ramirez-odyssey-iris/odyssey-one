import { useState } from 'react'
import { DurationPicker } from '@odyssey/ui'

export const meta = {
  name: 'DurationPicker',
  tier: 'molecule',
  version: '1.5.0',
  createdVersion: '0.1.0',
  normalizing: false,
  figmaNode: '5303:14',
  codeConnect: null,
}

export const props = [
  { name: 'unit',        type: "'hours' | 'minutes' | 'seconds'",  desc: "Drives the dropdown increments AND the ceiling (hours 1..24 step 1, minutes 10..120 step 10, seconds 30..240 step 30)." },
  { name: 'value',       type: 'number | \'\'',                    desc: "Controlled count of `unit`s, or '' for unset." },
  { name: 'onChange',    type: '(n: number | \'\') => void',       desc: "Fired with a number on pick or valid parse on blur/Enter; fired with '' when the field is blanked on blur." },
  { name: 'running',     type: 'boolean',                          desc: 'External lock — true hides the input/dropdown and shows a live countdown Badge instead. Parent-driven; the component never starts/stops itself.' },
  { name: 'endsAt',      type: 'number (epoch ms)',                desc: 'Countdown target. Required when `running`.' },
  { name: 'totalMs',     type: 'number',                           desc: 'Full window length, for the green→amber→red thresholds (amber at ≤30% remaining). Defaults to `value` converted to ms.' },
  { name: 'label',       type: 'string',                           desc: 'FormField label above the input (also shown above the running Badge).' },
  { name: 'placeholder', type: 'string',                           desc: "FormField placeholder (default 'Select {unit}')." },
  { name: 'disabled',    type: 'boolean',                          desc: 'Passed through to FormField; suppresses the dropdown same as `running`.' },
  { name: 'id',          type: 'string',                           desc: 'Passed through to FormField (label association).' },
  { name: 'error',       type: 'string',                           desc: 'External (form-level) error message; shown when there is no internal parse error.' },
]

export const tokens = [
  { token: '--time-picker-min',      resolves: '124px',   usage: "the field's width floor — REUSED from TimePicker rather than minting a new one: same class of control, and the widest values ('120 min' idle, '23:59:59' running) both fit" },
  { token: '--field-height',         resolves: '36px',    usage: 'min-height of the running badge shell, so the field does not jump when it locks' },
  { token: '--spacing-1',            resolves: '4px',     usage: "running state's label→badge gap (FormField's own label gap)" },
  { token: '--white',                resolves: '#FFFFFF', usage: 'field + dropdown surface (via FormField / DropdownMenu)' },
  { token: '--deep-sea-neutral-300', resolves: '#C5CAD4', usage: 'field border, default state (FormField)' },
  { token: '--deep-sea-neutral-500', resolves: '#6B7280', usage: 'trailing chevron stroke' },
  { token: '--radius-md',            resolves: '6px',      usage: 'field corner radius (FormField)' },
  { token: '--radius-lg',            resolves: '8px',      usage: 'dropdown panel corner radius (DropdownMenu)' },
  { token: '--bittersweet-600',      resolves: '#D64545', usage: 'error border + message on invalid blur (FormField)' },
]

// ── Schematic ───────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  return (
    <span style={{ display: 'inline-block', padding: '0 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: '11px', fontWeight: 'var(--font-weight-medium)', whiteSpace: 'nowrap' }}>{tier}</span>
  )
}
function LegendRow({ part, tier, nested = false, children }) {
  const cell = { padding: 'var(--spacing-2) 0', borderBottom: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }
  return (
    <li style={{ display: 'contents' }}>
      <span style={{ ...cell, display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', whiteSpace: 'nowrap', paddingLeft: nested ? 'var(--spacing-6)' : 0, color: 'var(--text-primary)', fontWeight: nested ? 'var(--font-weight-medium)' : 'var(--font-weight-semibold)' }}>
        {nested && <span style={{ color: 'var(--text-tertiary)' }} aria-hidden="true">└</span>}
        {part}{tier && <TierBadge tier={tier} />}
      </span>
      <span style={{ ...cell, color: 'var(--text-secondary)' }}>{children}</span>
    </li>
  )
}

function Schematic() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)', background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)', alignItems: 'flex-start', minHeight: 220 }}>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-6)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <DurationPicker id="ds-durationpicker-idle" label="Bid window" unit="minutes" value={30} onChange={() => {}} />
        <DurationPicker id="ds-durationpicker-running" label="Bid window" unit="seconds" running endsAt={Date.now() + 90_000} totalMs={300_000} />
      </div>
      <ul style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0, width: '100%' }}>
        <LegendRow part="container" tier="molecule">Same composite shape as TimePicker — a <code>FormField</code> shell + a <code>DropdownMenu</code> popover, wired with <code>useFieldPopover</code> / <code>useAnchoredPortal</code> (opens on focus; outside-mousedown / Tab / Esc close).</LegendRow>
        <LegendRow part="IDLE state" nested>Typable draft text, committed on blur/Enter via a liberal parse (digits only, clamped to the unit's ceiling), or picked off the unit-appropriate increment dropdown. Trailing lucide <code>ChevronDown</code>/<code>ChevronUp</code>.</LegendRow>
        <LegendRow part="RUNNING state" nested>Locked — input/dropdown swap for a live countdown <code>Badge</code> (<code>role="timer"</code>). Parent-driven via <code>running</code> + <code>endsAt</code>; never self-resets at zero. Colour: green → amber (≤30% remaining) → red (0).</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────
const inputStyle = { padding: '4px 8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }
const labelStyle = { display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-primary)', color: 'var(--text-primary)' }

function Playground() {
  const [unit, setUnit] = useState('minutes')
  const [value, setValue] = useState('')
  const [running, setRunning] = useState(false)
  const [endsAt, setEndsAt] = useState(null)

  const toggleRunning = () => {
    if (running) {
      setRunning(false)
      setEndsAt(null)
      return
    }
    const cfg = { hours: 3_600_000, minutes: 60_000, seconds: 1_000 }[unit]
    setRunning(true)
    setEndsAt(Date.now() + (Number(value) || 1) * cfg)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={labelStyle}>
          unit
          <select value={unit} onChange={(e) => { setUnit(e.target.value); setValue('') }} disabled={running} style={inputStyle}>
            <option value="hours">hours</option>
            <option value="minutes">minutes</option>
            <option value="seconds">seconds</option>
          </select>
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-primary)', color: 'var(--text-secondary)' }}>
          <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-primary)' }}>value</span>
          <code style={{ background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', whiteSpace: 'nowrap' }}>{value === '' ? '—' : value}</code>
        </div>
        <button type="button" onClick={toggleRunning} style={inputStyle}>{running ? 'Stop' : 'Start countdown'}</button>
      </div>

      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-6)', minHeight: 200 }}>
        <DurationPicker
          id="ds-durationpicker-preview"
          label="Bid window"
          unit={unit}
          value={value}
          onChange={setValue}
          running={running}
          endsAt={endsAt}
        />
      </div>
    </div>
  )
}

export default function DurationPickerDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        <strong>DurationPicker</strong> picks an AMOUNT of time rather than a time-of-day — deliberately not a
        mode on TimePicker (shared structure, not shared intent). IDLE is a typable field + increment dropdown,
        identical contract shape to TimePicker (liberal parse on blur/Enter, clamp to the unit's ceiling).
        RUNNING is parent-driven: pass <code>running</code> + <code>endsAt</code> and it swaps to a live
        countdown Badge that never resets itself at zero. Promoted out of the app into{' '}
        <code>@odyssey/ui</code> on 2026-08-27 together with the <code>useCountdown</code> timing primitives it
        depends on — that app-local dependency was what had blocked the Angular port, which landed the same day.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy (idle + running)</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground</h4>
        <Playground />
      </div>
    </div>
  )
}
