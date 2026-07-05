import { useState } from 'react'
import { StepperButtonsFooter } from '@odyssey/ui'

export const meta = {
  name: 'StepperButtonsFooter',
  tier: 'molecule',
  version: '0.5.0',
  createdVersion: '0.5.0',
  normalizing: false,
  figmaNode: '3164:2169',
  codeConnect: 'packages/ui/src/StepperButtonsFooter.figma.tsx',
}

export const props = [
  { name: 'cancelLabel', type: 'string', desc: "Left secondary button label. Default 'Cancel'." },
  { name: 'primaryLabel', type: 'string', desc: "Right primary button label. Default 'Continue' (Figma default; override per flow — e.g. 'Create Order')." },
  { name: 'saveLabel', type: 'string', desc: "Optional Save (secondary) label. Default 'Save'." },
  { name: 'showSave', type: 'boolean', desc: 'Renders the Save (secondary) button before the primary. Default false. (Figma: Tertiary Button BOOLEAN.)' },
  { name: 'onCancel', type: '() => void', desc: 'Cancel pressed.' },
  { name: 'onSave', type: '() => void', desc: 'Save pressed.' },
  { name: 'onPrimary', type: '() => void', desc: 'Primary button pressed.' },
  { name: 'primaryDisabled', type: 'boolean', desc: 'Disables the primary button (e.g. until a form validates). Default false.' },
  { name: 'saving', type: 'boolean', desc: 'Disables Save while a save is in flight. Default false.' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the footer bar.' },
]

export const tokens = [
  { token: '--border-subtle', resolves: 'Border/subtle', usage: 'top divider' },
  { token: '--bg-primary', resolves: 'Background/primary', usage: 'bar surface' },
  { token: '--spacing-3', resolves: '12px', usage: 'padding top + right-group gap' },
  { token: '--spacing-6', resolves: '24px', usage: 'padding horizontal' },
  { token: '--spacing-5', resolves: '20px', usage: 'padding bottom' },
  { token: '--spacing-4', resolves: '16px', usage: 'min gap between Cancel and the action group' },
]

// Slot-marker pink — DSM annotation device (not a product token).
const SLOT_TEXT = '#b03b81'

function TierBadge({ tier }) {
  return (
    <span style={{ display: 'inline-block', padding: '0 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: '11px', fontWeight: 'var(--font-weight-medium)', whiteSpace: 'nowrap' }}>
      {tier}
    </span>
  )
}

function ChildLink({ to, children }) {
  return (
    <a href={`#comp-${to}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-link)', textDecoration: 'underline', fontWeight: 'var(--font-weight-semibold)', whiteSpace: 'nowrap' }}>
      {children}
    </a>
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
      <div style={{ flex: '1 1 480px', minWidth: 360, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <StepperButtonsFooter showSave onCancel={() => {}} onSave={() => {}} onPrimary={() => {}} />
      </div>
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="bar" tier="molecule">
          Full-width, <code>border-top</code>, page padding (12/24/20), <code>space-between</code>.
        </LegendRow>
        <LegendRow part={<ChildLink to="Button">Cancel</ChildLink>} tier="atom" nested>Secondary Button (lg), left edge.</LegendRow>
        <LegendRow part={<ChildLink to="Button">Save</ChildLink>} tier="atom" nested>Secondary Button (lg), optional — <code>showSave</code>.</LegendRow>
        <LegendRow part={<ChildLink to="Button">Primary</ChildLink>} tier="atom" nested>Primary Button (lg), right edge; <code>primaryDisabled</code>.</LegendRow>
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
  const [showSave, setShowSave] = useState(true)
  const [primaryDisabled, setPrimaryDisabled] = useState(false)

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap' }}>
        <Toggle label="show Save" value={showSave} set={setShowSave} />
        <Toggle label="primary disabled" value={primaryDisabled} set={setPrimaryDisabled} />
      </div>
      <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <StepperButtonsFooter
          showSave={showSave}
          primaryDisabled={primaryDisabled}
          onCancel={() => {}}
          onSave={() => {}}
          onPrimary={() => {}}
        />
      </div>
    </div>
  )
}

export default function StepperButtonsFooterDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        The full-width action bar at the foot of a stepper / page flow — <code>Cancel</code> pushed
        left, the primary action group (<code>Save?</code> + primary) pushed right, over a top
        divider. Composes the <strong>Button</strong> atom. Distinct from{' '}
        <a href="#comp-ModalFooter" style={{ color: 'var(--text-link)', textDecoration: 'underline' }}>ModalFooter</a>{' '}
        (right-aligned modal actions). Consumer: the order-create <code>StickyFooter</code>.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — toggle Save + primary disabled</h4>
        <Playground />
      </div>
    </div>
  )
}
