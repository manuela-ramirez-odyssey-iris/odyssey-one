import { useState, useCallback } from 'react'
import { FormField, Badge, useAnchoredPortal } from '@odyssey/ui'
import { Search, Calendar } from 'lucide-react'

export const meta = {
  name: 'FormField',
  tier: 'molecule',
  version: '1.5.0',
  createdVersion: '0.2.0',
  figmaNode: '2602:1424',
  codeConnect: 'packages/ui/src/FormField.figma.tsx',
  normalizing: true,
  approved: true,
  ported: true,
}

export const props = [
  { name: 'label', type: 'string', desc: 'Field title.' },
  { name: 'showLabel', type: 'boolean', desc: 'Show the label row. Default true.' },
  { name: 'showInfo', type: 'boolean', desc: 'Show the info icon beside the label. Default false.' },
  { name: 'placeholder', type: 'string', desc: 'Input placeholder.' },
  { name: 'value', type: 'string|number', desc: 'Controlled value; drives the derived filled state.' },
  { name: 'onChange', type: '(e) => void', desc: 'Input change handler.' },
  { name: 'type', type: 'text|email|password|number|tel|search|url', desc: 'Native input type. Default text.' },
  { name: 'format', type: 'text|integer|decimal|phone', desc: 'Input CONTENT policy: sets the mobile inputMode AND strips characters that do not belong, before onChange fires — so a typo can never land in the value. decimal keeps only the first dot ("1.2.3" → "1.23"). Deliberately a small closed set, not a mask DSL. Default text.' },
  { name: 'error', type: 'string|false', desc: 'Error message; truthy reddens border + shows the message.' },
  { name: 'validated', type: 'boolean', desc: 'Success state (Figma State=Validated): success border + trailing check + green "Validated" line. `error` wins when both are set.' },
  { name: 'disabled', type: 'boolean', desc: 'Disables the input and all buttons.' },
  { name: 'leadingIcon', type: 'ReactNode', desc: 'Icon left of the input.' },
  { name: 'trailingIcon', type: 'ReactNode', desc: 'Icon right of the input.' },
  { name: 'leadingSelect', type: '{ label, onClick, locked }', desc: 'Renders a leading FieldSelect. locked: true = the value is decided by another field — static label, no chevron, not clickable (the input stays usable). Figma: the nested FieldSelect is exposed, so its `Show chevron` boolean is reachable from a FormField instance.' },
  { name: 'trailingSelect', type: '{ label, onClick, locked }', desc: 'Renders a trailing FieldSelect. locked: true = the value is decided by another field — static label, no chevron, not clickable (the input stays usable). Figma: the nested FieldSelect is exposed, so its `Show chevron` boolean is reachable from a FormField instance.' },
  { name: 'onClear', type: '() => void', desc: 'Clear-X handler; the button shows only when set, enabled, and value non-empty.' },
  { name: 'radio', type: '{ checked, onChange, name, value }', desc: 'radio-label mode — renders a Radio as the label; unchecked disables the whole field, including edge selects' },
  { name: 'labelBadge', type: 'ReactNode', desc: 'optional Badge (or any node) next to the label (or Radio in radio mode); omit to hide' },
  { name: 'required', type: 'boolean', desc: 'Marks the field required — renders a ` *` after the label and sets native required + aria-required.' },
  { name: 'maxLength', type: 'number', desc: 'Native input maxLength; also the counter denominator.' },
  { name: 'showCounter', type: 'boolean', desc: 'Show the in-box char counter (basic variants only — suppressed when a leading/trailing select is present). Default false.' },
]

export const tokens = [
  { token: '--bittersweet-200', resolves: 'Bittersweet/200', usage: 'error border — idle' },
  { token: '--bittersweet-600', resolves: 'Bittersweet/600', usage: 'error border — focused' },
  { token: '--border-strong', resolves: 'Border/strong', usage: 'focus border' },
  { token: '--border-success', resolves: 'Border/success', usage: 'validated border — idle' },
  { token: '--caribbean-green-600', resolves: 'Caribbean Green/600', usage: 'validated border — focused' },
  { token: '--text-success', resolves: 'Text/success', usage: 'validated message' },
]

/* ── shared bits ────────────────────────────────────────────────────────── */

// Each showcase field owns its value so it is actually typeable — the explorer's
// whole point is live components, not frozen controlled inputs. Disabled stays
// non-typeable by design; `error` keeps showing its state as you type.
function LiveField({ initial = '', clearable = true, ...props }) {
  const [v, setV] = useState(initial)
  return (
    <FormField
      {...props}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onClear={clearable && !props.disabled ? () => setV('') : undefined}
    />
  )
}

function Toggle({ label, value, set, disabled = false }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <input type="checkbox" checked={value} disabled={disabled} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  )
}

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

/* ── 1. Schematic ───────────────────────────────────────────────────────── */

function Schematic() {
  // The anatomy field is a real one — cycle the unit rather than leaving a dead
  // chevron sitting there.
  const UNITS = ['kg', 'lb', 'ton']
  const [unit, setUnit] = useState(UNITS[0])
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-8)', alignItems: 'flex-start', background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ flex: '1 1 380px', minWidth: 320 }}>
        <LiveField
          label="Weight"
          showInfo
          required
          initial="1,250"
          placeholder="0"
          trailingSelect={{ label: unit, onClick: () => setUnit((u) => UNITS[(UNITS.indexOf(u) + 1) % UNITS.length]) }}
        />
      </div>
      <ul style={{ flex: '1 1 340px', minWidth: 300, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="label row" tier="molecule">
          <code>label</code> (<code>label/sm medium</code>) + <code>required</code> asterisk + optional <code>lucide/info</code> via <code>showInfo</code>. Hidden entirely with <code>showLabel=false</code>.
        </LegendRow>
        <LegendRow part="input row" nested>
          The bordered shell. Border is the state ladder: idle <code>--input-border</code> → <code>:focus-within</code> <code>--border-strong</code> → error <code>--bittersweet-200</code>/<code>-600</code> → validated <code>--border-success</code>.
        </LegendRow>
        <LegendRow part="leadingSelect" nested>
          A <code>FieldSelect</code> atom flush at the lead edge, one-sided divider. Its divider tracks the FIELD's state — the parent overrides <code>--field-select-divider</code>, no state prop threaded.
        </LegendRow>
        <LegendRow part="leadingIcon" nested>16px slot inside the border, left of the text — off in this example; toggle it in the Playground.</LegendRow>
        <LegendRow part="input" nested><code>label/sm regular</code>. <code>format</code> gates which characters may reach the value.</LegendRow>
        <LegendRow part="counter" nested><code>showCounter</code> + <code>maxLength</code> → in-box "N/max". Basic variants only — suppressed when either edge select is present.</LegendRow>
        <LegendRow part="clear X" nested><code>onClear</code>, shown only when enabled and the value is non-empty.</LegendRow>
        <LegendRow part="validated check" nested>Trailing <code>lucide/check</code> when <code>validated</code> and no <code>error</code>.</LegendRow>
        <LegendRow part="trailingIcon" nested>16px slot; may hold an interactive control (TimePicker/MultiSelect chevron), so it is not <code>aria-hidden</code>.</LegendRow>
        <LegendRow part="trailingSelect" nested>Same atom on the trail edge. <code>locked: true</code> drops the chevron and the button semantics — see the section below.</LegendRow>
        <LegendRow part="message line" nested><code>error</code> (red, <code>role=alert</code>) or the green "Validated" line. <code>error</code> wins when both are set.</LegendRow>
      </ul>
    </div>
  )
}

/* ── 2. Playground ──────────────────────────────────────────────────────── */

// One anchored options menu per edge. The anchor is the FieldSelect BUTTON, not
// the field — the portal takes its minWidth from the trigger's rect, so anchoring
// to the 360px field would stretch a "kg / lb / ton" menu across the whole field.
// Taken from the click event rather than a ref callback on a wrapper: the edge
// select mounts and unmounts as the `edge` control changes, and a stable ref
// callback never re-runs to pick it up.
function usePicker(initial) {
  const [value, setValue] = useState(initial)
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const { triggerRef, dropdownRef, AnchoredPortal } = useAnchoredPortal({ open, onClose: close })
  const toggle = useCallback(
    (e) => {
      triggerRef.current = e.currentTarget
      setOpen((o) => !o)
    },
    [triggerRef],
  )
  return { value, setValue, open, setOpen, toggle, dropdownRef, AnchoredPortal }
}

function Menu({ picker, options }) {
  if (!picker.open) return null
  const { AnchoredPortal, dropdownRef } = picker
  return (
    <AnchoredPortal>
      <ul ref={dropdownRef} className="ds-menu" role="listbox">
        {options.map((opt) => (
          <li key={opt} role="option" aria-selected={opt === picker.value}>
            <button
              type="button"
              className="ds-menu__item"
              aria-selected={opt === picker.value}
              onClick={() => { picker.setValue(opt); picker.setOpen(false) }}
            >
              {opt}
            </button>
          </li>
        ))}
      </ul>
    </AnchoredPortal>
  )
}

function Playground() {
  const [value, setValue] = useState('Acme Logistics')
  const [showLabel, setShowLabel] = useState(true)
  const [showInfo, setShowInfo] = useState(true)
  const [required, setRequired] = useState(false)
  const [error, setError] = useState(false)
  const [validated, setValidated] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [clearable, setClearable] = useState(true)
  const [showCounter, setShowCounter] = useState(false)
  const [leadingIcon, setLeadingIcon] = useState(false)
  const [trailingIcon, setTrailingIcon] = useState(false)
  const [format, setFormat] = useState('text')
  const [edge, setEdge] = useState('none')
  const [locked, setLocked] = useState(false)
  const [labelBadge, setLabelBadge] = useState(false)

  const lead = usePicker('+1')
  const trail = usePicker('kg')

  const hasLead = edge === 'leading' || edge === 'both'
  const hasTrail = edge === 'trailing' || edge === 'both'

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        <Toggle label="showLabel" value={showLabel} set={setShowLabel} />
        <Toggle label="showInfo" value={showInfo} set={setShowInfo} />
        <Toggle label="required" value={required} set={setRequired} />
        <Toggle label="error" value={error} set={setError} />
        <Toggle label="validated" value={validated} set={setValidated} />
        <Toggle label="disabled" value={disabled} set={setDisabled} />
        <Toggle label="onClear" value={clearable} set={setClearable} />
        <Toggle label="showCounter (30)" value={showCounter} set={setShowCounter} />
        <Toggle label="leadingIcon" value={leadingIcon} set={setLeadingIcon} />
        <Toggle label="trailingIcon" value={trailingIcon} set={setTrailingIcon} />
        <Toggle label="labelBadge" value={labelBadge} set={setLabelBadge} />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)' }}>
          format
          <select value={format} onChange={(e) => { setFormat(e.target.value); setValue('') }}>
            <option value="text">text</option>
            <option value="integer">integer</option>
            <option value="decimal">decimal</option>
            <option value="phone">phone</option>
          </select>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)' }}>
          edge select
          <select value={edge} onChange={(e) => setEdge(e.target.value)}>
            <option value="none">none</option>
            <option value="leading">leading</option>
            <option value="trailing">trailing</option>
            <option value="both">both</option>
          </select>
        </label>
        <Toggle label="locked" value={locked} set={setLocked} disabled={edge === 'none'} />
      </div>

      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-6)' }}>
        <div style={{ maxWidth: 360 }}>
          <FormField
            label="Customer"
            showLabel={showLabel}
            showInfo={showInfo}
            labelBadge={labelBadge ? <Badge>New</Badge> : undefined}
            placeholder="Search Customers"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onClear={clearable && !disabled ? () => setValue('') : undefined}
            format={format}
            leadingIcon={leadingIcon ? <Search size={16} /> : undefined}
            trailingIcon={trailingIcon ? <Calendar size={16} /> : undefined}
            leadingSelect={hasLead ? { label: lead.value, locked, onClick: lead.toggle } : undefined}
            trailingSelect={hasTrail ? { label: trail.value, locked, onClick: trail.toggle } : undefined}
            error={error ? 'This customer is not recognized.' : false}
            validated={validated}
            disabled={disabled}
            required={required}
            showCounter={showCounter}
            maxLength={showCounter ? 30 : undefined}
            id="ds-formfield-playground"
          />
        </div>
      </div>
      <Menu picker={lead} options={['+1', '+44', '+52', '+212', '+1671']} />
      <Menu picker={trail} options={['kg', 'lb', 'ton', 'oz']} />

      <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
        Type to fill · focus to see the border react · the edge selects open real menus.
        {format !== 'text' && ` · format="${format}" is on — try typing letters, they never reach the value.`}
        {locked && edge !== 'none' && ' · locked: the chevron is gone and the trigger no longer responds — the value would be owned by another field.'}
      </p>
    </div>
  )
}

/* ── 3. locked ──────────────────────────────────────────────────────────── */

function LockedPair() {
  const [unit, setUnit] = useState('kg')
  const picker = usePicker(unit)
  const { open, dropdownRef, AnchoredPortal } = picker

  return (
    <div>
      <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
        <div style={{ width: 280 }}>
          <LiveField
            label="Weight"
            placeholder="0"
            format="decimal"
            clearable={false}
            trailingSelect={{ label: unit, onClick: picker.toggle }}
          />
          <span className="ds-demo-label">owns the unit — click <code>{unit} ▾</code></span>
        </div>
        <div style={{ width: 280 }}>
          <LiveField
            label="Tare weight"
            placeholder="0"
            format="decimal"
            clearable={false}
            trailingSelect={{ label: unit, locked: true }}
          />
          <span className="ds-demo-label">locked — follows Weight, no chevron, not clickable</span>
        </div>
      </div>
      {open && (
        <AnchoredPortal>
          <ul ref={dropdownRef} className="ds-menu" role="listbox">
            {['kg', 'lb', 'ton', 'oz'].map((opt) => (
              <li key={opt} role="option" aria-selected={opt === unit}>
                <button type="button" className="ds-menu__item" aria-selected={opt === unit} onClick={() => { setUnit(opt); picker.setOpen(false) }}>{opt}</button>
              </li>
            ))}
          </ul>
        </AnchoredPortal>
      )}
    </div>
  )
}

/* ── 3b. radio-label mode ───────────────────────────────────────────────── */

function RadioPair() {
  const [selected, setSelected] = useState('new')
  const [newCost, setNewCost] = useState('1,250')
  const [existingCost, setExistingCost] = useState('980')

  return (
    <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
      <div style={{ width: 280 }}>
        <FormField
          label="New Cost"
          radio={{ checked: selected === 'new', onChange: () => setSelected('new'), name: 'cost-mode', value: 'new' }}
          value={newCost}
          onChange={(e) => setNewCost(e.target.value)}
          format="decimal"
          trailingSelect={{ label: 'USD' }}
        />
      </div>
      <div style={{ width: 280 }}>
        <FormField
          label="Existing Cost"
          radio={{ checked: selected === 'existing', onChange: () => setSelected('existing'), name: 'cost-mode', value: 'existing' }}
          value={existingCost}
          onChange={(e) => setExistingCost(e.target.value)}
          format="decimal"
          trailingSelect={{ label: 'USD' }}
        />
      </div>
    </div>
  )
}

/* ── 4. Variants ────────────────────────────────────────────────────────── */

// The master's `State` axis, verbatim — 20 variants in three families. `Focused`
// is NOT paintable from props: it derives from :focus-within, so those cells are
// live (click in) rather than faked with a demo-only class.
const LEAD = { label: '+1', onClick: () => {} }
const TRAIL = { label: 'kg', onClick: () => {} }

const VARIANT_FAMILIES = [
  {
    family: 'No edge select',
    note: '8 variants',
    fieldLabel: 'Customer',
    items: [
      { name: 'Default', props: { placeholder: 'Placeholder' } },
      { name: 'Filled', props: { initial: 'Acme Logistics' } },
      { name: 'Focused', focus: true, props: { initial: 'Acme Logistics' } },
      { name: 'Error', props: { initial: 'bad@', error: 'Invalid email.' } },
      { name: 'Focused Error', focus: true, props: { initial: 'bad@', error: 'Invalid email.' } },
      { name: 'Disabled', props: { initial: 'Read only', disabled: true } },
      { name: 'Validated', props: { initial: 'Outbound', validated: true } },
      { name: 'Focused Validated', focus: true, props: { initial: 'Outbound', validated: true } },
    ],
  },
  {
    family: 'Leading Button',
    note: '6 variants — leadingSelect',
    fieldLabel: 'Phone',
    items: [
      { name: 'Default Leading Button', props: { placeholder: '555 0100', leadingSelect: LEAD } },
      { name: 'Filled Leading Button', props: { initial: '555 0100', leadingSelect: LEAD } },
      { name: 'Focused Leading Button', focus: true, props: { initial: '555 0100', leadingSelect: LEAD } },
      { name: 'Error Leading Button', props: { initial: '555', error: 'Number is incomplete.', leadingSelect: LEAD } },
      { name: 'Focused Error Leading Button', focus: true, props: { initial: '555', error: 'Number is incomplete.', leadingSelect: LEAD } },
      { name: 'Disabled Leading Button', props: { initial: '555 0100', disabled: true, leadingSelect: LEAD } },
    ],
  },
  {
    family: 'Trailing Button',
    note: '6 variants — trailingSelect',
    fieldLabel: 'Weight',
    items: [
      { name: 'Trailing Button', props: { placeholder: '0', trailingSelect: TRAIL } },
      { name: 'Filled Trailing Button', props: { initial: '1,250', trailingSelect: TRAIL } },
      { name: 'Focused Trailing Button', focus: true, props: { initial: '1,250', trailingSelect: TRAIL } },
      { name: 'Error Trailing Button', props: { initial: '-4', error: 'Weight must be positive.', trailingSelect: TRAIL } },
      { name: 'Focused Error Trailing Button', focus: true, props: { initial: '-4', error: 'Weight must be positive.', trailingSelect: TRAIL } },
      { name: 'Disabled Trailing Button', props: { initial: '1,250', disabled: true, trailingSelect: TRAIL } },
    ],
  },
]

function VariantGrid() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
      {VARIANT_FAMILIES.map(({ family, note, fieldLabel, items }) => (
        <div key={family}>
          <p style={{ margin: '0 0 var(--spacing-3)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{family}</strong> — {note}
          </p>
          <div className="ds-demo-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {items.map(({ name, props: p, focus }) => (
              <div key={name} style={{ width: 240 }}>
                <LiveField label={fieldLabel} clearable={false} {...p} />
                <span className="ds-demo-label">
                  State={name}{focus && ' · click in — focus is live'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── page ───────────────────────────────────────────────────────────────── */

export default function FormFieldDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        The platform's single-line text field: label row + bordered input row + message line,
        with slots on both edges. <code>filled</code> and <code>focused</code> are DERIVED (value
        present / <code>:focus-within</code>); <code>error</code>, <code>validated</code> and{' '}
        <code>disabled</code> are explicit props. The edge slots compose the{' '}
        <code>FieldSelect</code> atom, which is what makes this a molecule rather than an input.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — every prop, live</h4>
        <Playground />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">locked — an edge value owned by another field</h4>
        <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Two fields, one unit. The second field's select has nothing to open, so it renders as
          static text with no chevron and no button semantics — while its input stays fully
          usable. This is <em>not</em> <code>disabled</code>, which would grey the whole field.
          Figma: the <code>FieldSelect</code> master's <code>Show chevron</code> boolean, exposed
          on the FormField instance.
        </p>
        <LockedPair />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">radio-label mode — label doubles as a Radio</h4>
        <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Pass <code>radio</code> and the label row renders a <code>Radio</code> instead of plain
          text. Whichever field's radio is unchecked behaves exactly like <code>disabled</code> —
          input and trailing USD select included. Figma: 5426:1366 (unchecked) / 5426:1381 (checked).
        </p>
        <RadioPair />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Variants (20)</h4>
        <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Every variant of <code>2602:1424</code>, named as Figma names it. The six{' '}
          <code>Focused</code> cells are real focus, not a painted class — click into them.
        </p>
        <VariantGrid />
      </div>
    </div>
  )
}
