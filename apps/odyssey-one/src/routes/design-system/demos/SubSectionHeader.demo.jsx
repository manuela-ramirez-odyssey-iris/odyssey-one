import { useState } from 'react'
import { SubSectionHeader } from '@odyssey/ui'

export const meta = {
  name: 'SubSectionHeader',
  tier: 'molecule',
  normalizing: true,
  figmaNode: '3303:3665',
  codeConnect: 'packages/ui/src/SubSectionHeader.figma.tsx',
}

export const props = [
  { name: 'title', type: 'string', desc: 'The subsection label, shown in label/base semibold. (Figma: Title TEXT prop.)' },
  { name: 'showInfo', type: 'boolean', desc: 'Renders the trailing info glyph (16px, DSN/400, non-interactive) beside the title. Default true. (Figma: Info Icon BOOLEAN.)' },
  { name: 'showDropdown', type: 'boolean', desc: 'Renders the right-aligned dropdown chevron-down (16px, DSN/500). Default true. (Figma: Dropdown BOOLEAN.)' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the root element.' },
]

export const tokens = [
  { token: '--text-primary', resolves: 'DSN/900', usage: 'title text' },
  { token: '--text-placeholder', resolves: 'DSN/400', usage: 'info glyph' },
  { token: '--text-tertiary', resolves: 'DSN/500', usage: 'dropdown chevron' },
  { token: 'text-label-base-semibold', resolves: '16 / 24 / 600', usage: 'title typography' },
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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-8)', alignItems: 'flex-start', background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ flex: '1 1 360px', minWidth: 300, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-4)' }}>
        <SubSectionHeader title="Client" showInfo showDropdown />
      </div>
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="root" tier="molecule">Single-row flex, <code>space-between</code>: lead cluster (title + info) left, dropdown chevron right.</LegendRow>
        <LegendRow part="title" nested>Label, <code>label/base semibold</code>, <code>--text-primary</code>.</LegendRow>
        <LegendRow part="info glyph" nested>Static <code>lucide/info</code>, 16px, <code>--text-placeholder</code> (DSN/400) — optional (<code>showInfo</code>).</LegendRow>
        <LegendRow part="dropdown chevron" nested>Static <code>lucide/chevron-down</code>, 16px, <code>--text-tertiary</code> (DSN/500) — optional (<code>showDropdown</code>).</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────
function Toggle({ label, value, set, disabled }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} disabled={disabled} />
      {label}
    </label>
  )
}
function Field({ label, value, set }) {
  return (
    <label style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)' }}>
      {label}
      <input value={value} onChange={(e) => set(e.target.value)} style={{ padding: '4px 8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }} />
    </label>
  )
}

function Playground() {
  const [title, setTitle] = useState('Client')
  const [showInfo, setShowInfo] = useState(true)
  const [showDropdown, setShowDropdown] = useState(true)

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Field label="title" value={title} set={setTitle} />
        <Toggle label="showInfo" value={showInfo} set={setShowInfo} />
        <Toggle label="showDropdown" value={showDropdown} set={setShowDropdown} />
      </div>
      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-4)', maxWidth: 400 }}>
        <SubSectionHeader title={title} showInfo={showInfo} showDropdown={showDropdown} />
      </div>
    </div>
  )
}

export default function SubSectionHeaderDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Single-row subsection header — a title (label/base semibold) with an optional
        info glyph on the left and an optional dropdown chevron on the right. Used to
        head a filter subsection (e.g. "Client", "Location"). Distinct from{' '}
        <code>SectionHeader</code> (big H2 + timestamp) and <code>TitleSubtitle</code>{' '}
        (stacked eyebrow + title).
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — edit title, toggle info + dropdown</h4>
        <Playground />
      </div>
    </div>
  )
}
