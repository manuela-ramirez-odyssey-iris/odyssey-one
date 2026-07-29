import { useState } from 'react'
import { MultiSelect } from '@odyssey/ui'

export const meta = {
  name: 'MultiSelect',
  tier: 'organism',
  version: '0.9.0',
  createdVersion: '0.8.0',
  normalizing: false,
  figmaNode: '4536:5333',
  codeConnect: 'packages/ui/src/MultiSelect.figma.tsx',
}

export const props = [
  { name: 'options',       type: '{ value, label, description }[]',   desc: 'Full option set. `label` fills the first badge column, `description` the second.' },
  { name: 'selected',      type: 'string[]',                          desc: 'Controlled array of selected option `value`s.' },
  { name: 'onChange',      type: '(values: string[]) => void',        desc: 'Fired with the next selected-values array on a pick or a trash.' },
  { name: 'columnHeaders', type: '[string, string]',                  desc: "Column headers — used for BOTH the selected-items table and the in-panel dropdown headers; default ['Service Category', 'Description']." },
  { name: 'emptyTableMessage', type: 'string',                        desc: 'When set, the selected-items table renders even with no selection — headers + a single muted placeholder row with this text. Omit to hide the table entirely when empty.' },
  { name: 'label',         type: 'string',                            desc: 'FormField label above the search input.' },
  { name: 'placeholder',   type: 'string',                            desc: 'FormField placeholder.' },
  { name: 'disabled',      type: 'boolean',                           desc: 'Passed through to FormField; suppresses the dropdown.' },
  { name: 'id',            type: 'string',                            desc: 'Passed through to FormField (label association).' },
]

export const tokens = [
  { token: '--white',           resolves: '#FFFFFF', usage: 'field + dropdown + table cell surface' },
  { token: '--border-subtle',   resolves: '#E4E6EB', usage: 'table header + row bottom borders' },
  { token: '--badge-gray-bg',   resolves: '#F2F3F5', usage: 'label + description badge fill' },
  { token: '--badge-gray-text', resolves: '#384253', usage: 'label + description badge text' },
  { token: '--text-primary',    resolves: '#1B2537', usage: 'table header text' },
  { token: '--spacing-2',       resolves: '8px',      usage: 'field/dropdown/table gap + actions cell v-pad' },
  { token: '--spacing-4',       resolves: '16px',     usage: 'table cell horizontal padding' },
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

const OPTIONS = [
  { value: 'palexg',  label: 'PALEXG',  description: 'Pallet Jack' },
  { value: 'lftg',    label: 'LFTG',    description: 'Liftgate Service' },
  { value: 'insdel',  label: 'INSDEL',  description: 'Inside Delivery' },
  { value: 'resdel',  label: 'RESDEL',  description: 'Residential Delivery' },
  { value: 'apptreq', label: 'APPTREQ', description: 'Appointment Required' },
  { value: 'hazmat',  label: 'HAZMAT',  description: 'Hazardous Materials' },
  { value: 'notify',  label: 'NOTIFY',  description: 'Delivery Notification' },
]

function Schematic() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)', background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)', alignItems: 'flex-start' }}>
      <MultiSelect
        label="Special Services"
        placeholder="Search a special service"
        options={OPTIONS}
        selected={['palexg', 'lftg']}
        onChange={() => {}}
      />
      <ul style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0, width: '100%' }}>
        <LegendRow part="container" tier="molecule">Full-width composite (width 100%, sized by its parent) — a <code>FormField</code> search field, an in-flow dropdown, and a selected-items table, stacked with <code>gap --spacing-2</code>.</LegendRow>
        <LegendRow part="FormField" tier="molecule" nested>Typing filters the option list live (matches label OR description); trailing lucide <code>ChevronDown</code> (16px). Opens on focus via <code>useFieldPopover</code>.</LegendRow>
        <LegendRow part="dropdown" tier="organism" nested><code>FieldSearchResults</code> of the NOT-yet-selected options as <strong>two-column</strong> <code>MatchSimpleRow</code>s (40px rows) beneath in-panel small-caps <code>columnHeaders</code>. <strong>In-flow</strong> (pushes the table down, not an overlay), <strong>4-item viewport</strong>, scroll beyond. Picking a row removes it here + appends a table row.</LegendRow>
        <LegendRow part="keyboard" nested><strong>ArrowDown/Up</strong> opens + moves the active row (wraps, scrolls into view); <strong>Enter</strong> picks it into the table (dropdown stays open for further picks — its multi-select model); <strong>Esc</strong> closes. Trailing chevron is a real <code>button</code> (flips <code>ChevronDown</code>↔<code>ChevronUp</code>) that toggles the list. <code>combobox</code>/<code>listbox</code>/<code>option</code> roles + <code>aria-activedescendant</code>.</LegendRow>
        <LegendRow part="table" nested>Two label columns — gray <code>Badge</code> for label + description — plus a trailing trash action (<code>IconButtonGhost</code> + lucide <code>Trash2</code> 20px) per row. Hidden when nothing is selected — unless <code>emptyTableMessage</code> is set, which keeps the headers visible above a single muted placeholder row. Cells: <code>--white</code> bg, <code>--border-subtle</code> bottom border, 14px v-pad.</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────
function Playground() {
  const [selected, setSelected] = useState(['palexg'])
  const [showEmptyTable, setShowEmptyTable] = useState(true)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-primary)', color: 'var(--text-secondary)' }}>
          <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-primary)' }}>selected</span>
          <code style={{ background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>{selected.length ? selected.join(', ') : '—'}</code>
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', cursor: 'pointer', fontFamily: 'var(--font-primary)' }}>
          <input type="checkbox" checked={showEmptyTable} onChange={(e) => setShowEmptyTable(e.target.checked)} />
          emptyTableMessage (trash all rows to see the empty table)
        </label>
      </div>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-6)', minHeight: 320 }}>
        <MultiSelect
          id="ds-multiselect-preview"
          label="Special Services"
          placeholder="Search a special service"
          options={OPTIONS}
          selected={selected}
          onChange={setSelected}
          emptyTableMessage={showEmptyTable ? 'No special services selected yet' : undefined}
        />
      </div>
    </div>
  )
}

export default function MultiSelectDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        <strong>MultiSelect</strong> (Figma master 4536:5333) is a search-to-pick, table-of-chosen
        control: a <code>FormField</code> that filters <code>options</code> into an in-flow
        <strong>two-column</strong> <code>FieldSearchResults</code> dropdown — 40px rows beneath
        in-panel small-caps <code>columnHeaders</code>; it pushes the table down rather than
        overlaying — plus a table of the selected options: two gray <code>Badge</code> columns and
        a per-row trash action. The control is <strong>width 100%</strong>, sized by its parent.
        Picking an option moves it out of the dropdown and into the table; trashing a row returns
        it to the dropdown. With no selection the table hides — unless{' '}
        <code>emptyTableMessage</code> is set, which renders the headers above a single muted
        placeholder row. Controlled via <code>selected</code> / <code>onChange</code>. Reach for it via
        <code>{"import { MultiSelect } from '@odyssey/ui'"}</code>.
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
