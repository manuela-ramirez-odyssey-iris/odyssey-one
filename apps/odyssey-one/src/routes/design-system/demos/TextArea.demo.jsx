import { useState } from 'react'
import { TextArea } from '@odyssey/ui'

export const meta = {
  name: 'TextArea',
  tier: 'molecule',
  version: '0.6.0',
  createdVersion: '0.6.0',
  figmaNode: '4138:577',
  codeConnect: 'packages/ui/src/TextArea.figma.tsx',
}

export const props = [
  { name: 'label / showLabel / showInfo', type: 'string / boolean / boolean', desc: "Label row — identical contract to FormField (label text-label-sm-medium + optional lucide/info)." },
  { name: 'placeholder / value / onChange', type: 'string / string / (e) => void', desc: 'Controlled textarea. Placeholder label/sm regular, --text-placeholder.' },
  { name: 'maxLength', type: 'number', desc: 'Native maxLength; also enables the in-box "N/max" footer count. (Figma: Count TEXT prop.)' },
  { name: 'showCount', type: 'boolean', desc: 'Override the count footer visibility. Default: true when maxLength is set. (Figma: Show Count BOOLEAN.)' },
  { name: 'rows', type: 'number', desc: 'Initial visible lines. Default 2 (≈ the Figma 64px input area).' },
  { name: 'resize', type: "'vertical' | 'none'", desc: "Resizing sits on the BOX, not the field — the native grip renders at the box corner below the footer (matching the mock's drawn indicator). Default 'vertical'." },
  { name: 'error', type: 'string', desc: 'Error message; red border/text + role="alert" line below — FormField state model (the Figma master has one Default state; variants = Efrain ask).' },
  { name: 'disabled', type: 'boolean', desc: 'Gray surface, not-allowed cursor — FormField state model.' },
  { name: 'id / name / required / describedBy / className', type: '…', desc: 'Standard field plumbing; rest props spread onto the <textarea>.' },
]

export const tokens = [
  { token: '--white / --input-border', resolves: 'white / DSN-300', usage: 'box surface + border (→ --input-border-focus on focus-within)' },
  { token: '--radius-md', resolves: '6px', usage: 'box corner radius' },
  { token: '--shadow-sm', resolves: '0 1 2 / 5%', usage: 'box elevation' },
  { token: '--spacing-3', resolves: '12', usage: 'field padding' },
  { token: '--spacing-8 / --spacing-4', resolves: '32 / 16', usage: 'count footer right/bottom padding (32 clears the resize grip — flagged to Efrain)' },
  { token: 'text-label-sm-regular', resolves: '14 / 20 / 400', usage: 'field + placeholder typography' },
  { token: 'text-label-xs-regular + --text-tertiary', resolves: '12 / 16 / 400, DSN/500', usage: 'character count' },
  { token: '--bittersweet-200 / --bittersweet-600 / --text-error', resolves: 'error ramp', usage: 'error border (idle/focus) + message — inherited from FormField' },
]

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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-8)', alignItems: 'flex-start', background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ flex: '1 1 420px', minWidth: 340 }}>
        <TextArea
          label="Description"
          placeholder="Enter a description…"
          value=""
          onChange={() => {}}
          maxLength={200}
        />
      </div>
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="box" tier="molecule">FormField's multiline sibling: <code>--white</code> surface, <code>--input-border</code> 1px, <code>--radius-md</code>, <code>--shadow-sm</code>; <code>:focus-within</code> → <code>--input-border-focus</code>. <code>resize</code> lives on the box.</LegendRow>
        <LegendRow part="label row" nested>Same contract as FormField — <code>label/sm medium</code> + optional info glyph.</LegendRow>
        <LegendRow part="field" nested>Borderless <code>&lt;textarea&gt;</code>, padding <code>--spacing-3</code>, <code>label/sm regular</code>, placeholder <code>--text-placeholder</code>.</LegendRow>
        <LegendRow part="count footer" nested>Inside the bordered box — "N/max", <code>label/xs regular</code> <code>--text-tertiary</code>, padding 32 right (clears the grip) / 16 bottom. Shown when <code>maxLength</code> set.</LegendRow>
        <LegendRow part="resize grip" nested>The native browser grip at the box corner — the mock's drawn vector isn't replicated. <code>resize='none'</code> disables.</LegendRow>
        <LegendRow part="deferred" nested>The mock's hidden AI-assist affordances (<code>wand-sparkles</code> / "generate text" buttons, off-system Tailwind styling) are NOT modeled — Efrain ask.</LegendRow>
      </ul>
    </div>
  )
}

function Toggle({ label, value, set }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  )
}

function Playground() {
  const [value, setValue] = useState('Deliver to the rear dock; call the site contact 30 minutes ahead.')
  const [showLabel, setShowLabel] = useState(true)
  const [withMax, setWithMax] = useState(true)
  const [disabled, setDisabled] = useState(false)
  const [withError, setWithError] = useState(false)
  const [fixed, setFixed] = useState(false)

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        <Toggle label="showLabel" value={showLabel} set={setShowLabel} />
        <Toggle label="maxLength (200)" value={withMax} set={setWithMax} />
        <Toggle label="error" value={withError} set={setWithError} />
        <Toggle label="disabled" value={disabled} set={setDisabled} />
        <Toggle label="resize: none" value={fixed} set={setFixed} />
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>type to watch the count · drag the corner grip</span>
      </div>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-6)' }}>
        <TextArea
          label="Special instructions"
          showLabel={showLabel}
          showInfo
          placeholder="Enter special instructions…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={withMax ? 200 : undefined}
          rows={2}
          resize={fixed ? 'none' : 'vertical'}
          error={withError ? 'Instructions are required for hazmat shipments.' : undefined}
          disabled={disabled}
          id="ds-textarea-demo"
        />
      </div>
    </div>
  )
}

export default function TextAreaDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Multiline sibling of <code>FormField</code> — a bordered box holding a borderless{' '}
        <code>&lt;textarea&gt;</code> and an in-box character-count footer, with the native
        resize grip at the box corner. States (focus/error/disabled) inherit FormField's
        model — the Figma master ships a single Default state (variants pending Efrain).
        First consumers: the NotesTab edit + add-note fields (migrated off raw textareas).
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — type, toggle states, drag the grip</h4>
        <Playground />
      </div>
    </div>
  )
}
