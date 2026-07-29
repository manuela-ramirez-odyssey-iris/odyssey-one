import { useState } from 'react'
import { TimePicker } from '@odyssey/ui'

export const meta = {
  name: 'TimePicker',
  tier: 'molecule',
  version: '0.8.0',
  createdVersion: '0.8.0',
  normalizing: true,
  figmaNode: '4534:5204',
  codeConnect: 'packages/ui/src/TimePicker.figma.tsx',
  approved: true,
  ported: true,
}

export const props = [
  { name: 'value',       type: 'string',                                desc: 'Controlled canonical "HH:MM" 24h string ("14:30"), or "" for unset.' },
  { name: 'onChange',    type: '(hhmm: string) => void',                desc: 'Fired with the canonical "HH:MM" 24h string on a valid parse or row pick; "" on clear.' },
  { name: 'format',      type: "'standard' | 'international'",          desc: "Display format. `standard` (default) = 12h AM/PM; `international` = 24h. Canonical value is always 24h." },
  { name: 'step',        type: 'number',                                desc: 'Minutes between generated options (default 30 → 00:00…23:30).' },
  { name: 'min / max',   type: 'string',                                desc: 'Optional "HH:MM" 24h bounds; options outside are excluded from the dropdown.' },
  { name: 'placeholder', type: 'string',                                desc: "FormField placeholder (default 'Select time')." },
  { name: 'label',       type: 'string',                                desc: 'FormField label above the input.' },
  { name: 'disabled',    type: 'boolean',                               desc: 'Passed through to FormField; suppresses the dropdown.' },
  { name: 'id',          type: 'string',                                desc: 'Passed through to FormField (label association).' },
]

export const tokens = [
  { token: '--white',                resolves: '#FFFFFF', usage: 'field + dropdown surface (via FormField / DropdownMenu)' },
  { token: '--deep-sea-neutral-300', resolves: '#C5CAD4', usage: 'field border, default state (FormField)' },
  { token: '--deep-sea-neutral-500', resolves: '#6B7280', usage: 'trailing chevron-down stroke' },
  { token: '--radius-md',            resolves: '6px',      usage: 'field corner radius (FormField)' },
  { token: '--radius-lg',            resolves: '8px',      usage: 'dropdown panel corner radius (DropdownMenu)' },
  { token: '--spacing-2',            resolves: '8px',      usage: 'gap between field and dropdown' },
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)', background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)', alignItems: 'flex-start', minHeight: 260 }}>
      <TimePicker label="Time" value="08:30" />
      <ul style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0, width: '100%' }}>
        <LegendRow part="container" tier="molecule">320px composite — a <code>FormField</code> shell + a <code>DropdownMenu</code> popover, wired with <code>useFieldPopover</code> (opens on focus; outside-mousedown / Tab / Esc close).</LegendRow>
        <LegendRow part="FormField" tier="molecule" nested><code>label</code> / <code>placeholder</code> / <code>disabled</code> / <code>id</code> pass through; trailing lucide <code>ChevronDown</code> (16px, <code>--deep-sea-neutral-500</code>). Invalid text on blur flips it to the error state.</LegendRow>
        <LegendRow part="dropdown" nested><code>DropdownMenu</code> + <code>MenuRow</code> rows generated from <code>step</code> (00:00…23:30 for step=30). <strong>5-row viewport</strong> (maxHeight 180px), scrollable beyond; the row matching <code>value</code> is <code>selected</code>.</LegendRow>
        <LegendRow part="typed input" nested>Liberal parse against <code>format</code>: <code>"8:30 am"</code>, <code>"0830"</code>, <code>"14:30"</code>, <code>"8 pm"</code> all resolve. Valid → normalize + onChange; invalid on blur → error.</LegendRow>
        <LegendRow part="keyboard" nested><strong>ArrowDown/Up</strong> opens + moves the active row (wraps, scrolls into view); <strong>Enter</strong> selects it + closes; <strong>Esc</strong> closes. Trailing chevron is a real <code>button</code> (flips <code>ChevronDown</code>↔<code>ChevronUp</code>) that toggles the list. <code>combobox</code>/<code>listbox</code>/<code>option</code> roles + <code>aria-activedescendant</code>.</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────
const inputStyle = { padding: '4px 8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }
const labelStyle = { display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-primary)', color: 'var(--text-primary)' }

function Playground() {
  const [format, setFormat] = useState('standard')
  const [step, setStep] = useState(30)
  const [value, setValue] = useState('')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={labelStyle}>
          format
          <select value={format} onChange={(e) => setFormat(e.target.value)} style={inputStyle}>
            <option value="standard">standard (12h)</option>
            <option value="international">international (24h)</option>
          </select>
        </label>
        <label style={labelStyle}>
          step
          <select value={step} onChange={(e) => setStep(Number(e.target.value))} style={inputStyle}>
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-primary)', color: 'var(--text-secondary)' }}>
          <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-primary)' }}>value (canonical 24h)</span>
          <code style={{ background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', whiteSpace: 'nowrap' }}>{value || '—'}</code>
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-6)', minHeight: 300 }}>
        <TimePicker
          id="ds-timepicker-preview"
          label="Time"
          format={format}
          step={step}
          value={value}
          onChange={setValue}
        />
      </div>
    </div>
  )
}

export default function TimePickerDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        <strong>TimePicker</strong> is a code-only field composite (Figma master 4534:5204):
        a <code>FormField</code> shell with a chevron-down trigger over a <code>DropdownMenu</code> of
        time options generated from <code>step</code> (5-row viewport, scroll beyond). The input is
        typeable and parses liberally against the active <code>format</code> — canonical value is
        always a 24h <code>"HH:MM"</code> string, regardless of display format. Invalid text on blur
        flips the field to its error state. Reach for it via
        <code>{"import { TimePicker } from '@odyssey/ui'"}</code>.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy (master sample data)</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground</h4>
        <Playground />
      </div>
    </div>
  )
}
