import { useState } from 'react'
import { CalendarPicker, DatePicker } from '@odyssey/ui'

export const meta = {
  // One demo, two exports: CalendarPicker (the Figma-mastered calendar card) +
  // DatePicker (the code-only field composite devs actually reach for).
  name: 'CalendarPicker + DatePicker',
  tier: 'molecule',
  version: '0.9.0',
  createdVersion: '0.8.0',
  normalizing: true,
  figmaNode: '4422:711',
  codeConnect: null,
}

export const props = [
  { name: 'mode',         type: "'single' | 'range'",                        desc: "Selection mode. `single` (default) selects one date; `range` builds a start→end span." },
  { name: 'value',        type: 'Date|null  (single) | { start, end }  (range)', desc: 'Controlled value. Pass `null` / `{ start: null, end: null }` for unset.' },
  { name: 'onChange',     type: '(next) => void',                             desc: 'Single → receives a `Date`. Range → receives `{ start: Date, end: Date|null }`. First range click sets start; second sets end (if before start, restarts).' },
  { name: 'defaultMonth', type: 'Date',                                       desc: 'Initial month to display. Defaults to the selected value (or today) when omitted.' },
  { name: 'minDate',      type: 'Date',                                       desc: 'Lower bound — earlier days are disabled and month nav stops. Default 01/01/1900.' },
  { name: 'maxDate',      type: 'Date',                                       desc: 'Upper bound — later days are disabled and month nav stops. Default 01/01/2120.' },
  { name: 'className',    type: 'string',                                     desc: 'Extra class(es) on the root element.' },
  // ── DatePicker (composite) — own props; mode/value/onChange/minDate/maxDate mirror CalendarPicker ──
  { name: 'DatePicker: label',       type: 'string',  desc: 'FormField label above the input.' },
  { name: 'DatePicker: placeholder', type: 'string',  desc: "Defaults 'Select Date' (single) / 'Select Range' (range)." },
  { name: 'DatePicker: disabled / error / id', type: '…', desc: 'Passed through to the FormField shell.' },
]

export const tokens = [
  { token: '--white',                   resolves: '#FFFFFF',   usage: 'card background' },
  { token: '--deep-sea-neutral-300',    resolves: '#C5CAD4',   usage: 'card border' },
  { token: '--radius-lg',              resolves: '8px',        usage: 'card + day-cell corner radius' },
  { token: '--shadow-panel',          resolves: '0 0 0 1px … + 0 10px 15px …', usage: 'card shadow (popover altitude)' },
  { token: '--deep-sea-neutral-500',  resolves: '#5F697A',    usage: 'weekday labels + adjacent-month day text' },
  { token: '--text-primary',          resolves: '#1B2537',    usage: 'current-month day text, month title' },
  { token: '--deep-sea-neutral-100',  resolves: '#F2F3F5',    usage: 'day hover background (code-only)' },
  { token: '--deep-sea-neutral-200',  resolves: '#E4E6EB',    usage: 'in-range day background' },
  { token: '--deep-sea-neutral-400',  resolves: '#939DAB',    usage: 'pending-start ring color' },
  { token: '--deep-sea-neutral-700',  resolves: '#313D51',    usage: 'selected / range-start / range-end background' },
  { token: '--spacing-2',             resolves: '8px',         usage: 'header gap' },
  { token: '--transition-fast',       resolves: '100ms ease',  usage: 'day background transition' },
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
  // Figma master sample: November 2024, no selection
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)', background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)', alignItems: 'flex-start' }}>
      <CalendarPicker defaultMonth={new Date(2024, 10, 1)} />
      <ul style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0, width: '100%' }}>
        <LegendRow part="container" tier="molecule">284px fixed-width card — <code>--white</code> bg, 1px <code>--deep-sea-neutral-300</code> border, <code>--radius-lg</code>, <code>--shadow-panel</code>; 16px internal padding, vertical <code>gap --spacing-2</code>.</LegendRow>
        <LegendRow part="header" nested>32px row: prev/next <code>Button variant="icon" size="sm"</code> with lucide <code>ArrowLeft</code>/<code>ArrowRight</code> 20px; centered month title <code>text-label-sm-medium</code>, <code>--text-primary</code>.</LegendRow>
        <LegendRow part="weekday row" nested>7 equal columns, each 36px tall; <code>text-label-sm-regular</code>, <code>--deep-sea-neutral-500</code>.</LegendRow>
        <LegendRow part="day cell" nested>36px <code>&lt;button&gt;</code>, <code>--radius-lg</code>, <code>text-label-sm-medium</code>. States: default (<code>--text-primary</code>, transparent) · adjacent-month (<code>--deep-sea-neutral-500</code>) · hover (<code>--deep-sea-neutral-100</code>, code-only) · selected (<code>--deep-sea-neutral-700</code> bg, white text) · range variants (see Playground).</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────
const inputStyle = { padding: '4px 8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }
const labelStyle = { display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-primary)', color: 'var(--text-primary)' }

function fmt(d) {
  if (!d) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Playground — demos the DatePicker composite extracted from this file into
// packages/ui/src/DatePicker.jsx (S83). Controls: mode toggle + live value readout.
function Playground() {
  const [mode, setMode] = useState('single')
  const [value, setValue] = useState(null)

  const reset = (nextMode) => {
    setMode(nextMode)
    setValue(null)
  }

  const valueReadout = mode === 'single'
    ? fmt(value)
    : `${fmt(value?.start)} → ${fmt(value?.end)}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      {/* Controls */}
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={labelStyle}>
          mode
          <select value={mode} onChange={e => reset(e.target.value)} style={inputStyle}>
            <option value="single">single</option>
            <option value="range">range</option>
          </select>
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-primary)', color: 'var(--text-secondary)' }}>
          <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-primary)' }}>value</span>
          <code style={{ background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', whiteSpace: 'nowrap' }}>{valueReadout}</code>
        </div>
      </div>

      {/* DatePicker composite */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-6)', minHeight: 440 }}>
        <DatePicker
          id="ds-datepicker-preview"
          label="Date"
          mode={mode}
          value={value}
          onChange={setValue}
        />
      </div>

      {/* DatePicker anatomy + usage */}
      <ul style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0, width: '100%' }}>
        <LegendRow part="DatePicker" tier="molecule (composite)">The component devs reach for — <code>import {'{ DatePicker }'} from '@odyssey/ui'</code>. Code-only (no Figma master); controlled <code>value</code>/<code>onChange</code> in the same single/range shapes as CalendarPicker. Never assemble FormField + CalendarPicker by hand.</LegendRow>
        <LegendRow part="FormField" tier="molecule" nested>The input shell — <code>label</code>, <code>placeholder</code>, <code>disabled</code>, <code>error</code>, <code>id</code> pass straight through; trailing lucide <code>CalendarDays</code> icon.</LegendRow>
        <LegendRow part="masked input" nested>Typeable <code>dd/mm/yyyy</code> (range: <code>dd/mm/yyyy - dd/mm/yyyy</code>) — auto-slashes, segment-carry on edit, emptied day/month pairs auto-resolve to "01", caret restore, min/max bounds clamp. Enter commits + defocuses.</LegendRow>
        <LegendRow part="CalendarPicker" tier="molecule" nested>The popover panel (documented above) — opens on focus via <code>useFieldPopover</code> (outside-mousedown / Tab / Esc close); clicking a day syncs the input, typing a valid date syncs the calendar.</LegendRow>
      </ul>
    </div>
  )
}

export default function CalendarPickerDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Two components, one demo. <strong>CalendarPicker</strong> (Figma master 4422:711) is the
        single-month date / date-range panel: 284px fixed-width card with a prev/next month header,
        Su–Sa weekday labels, and a 5-or-6-row day grid. Range mode: first click sets start, second
        click sets end; clicking before start restarts. Adjacent-month padding cells are always
        shown and navigate on click. <strong>DatePicker</strong> is the code-only <em>field composite</em>
        built on it — FormField shell + typeable dd/mm/yyyy mask + CalendarPicker popover
        (<code>useFieldPopover</code>) — and is what product code should use for date fields
        (<code>{"import { DatePicker } from '@odyssey/ui'"}</code>). Use raw CalendarPicker only to
        embed a calendar outside a field (e.g. inline in a panel). Contrast with ComboBox
        typeahead: that folded into an existing field component; dates had no field to fold into,
        so the composite wraps FormField instead.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy (master sample data)</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — DatePicker composite (extracted to packages/ui, S83)</h4>
        <Playground />
      </div>
    </div>
  )
}
