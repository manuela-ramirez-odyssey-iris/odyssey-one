import { useState } from 'react'
import { Button, ButtonToggle, PageHeader } from '@odyssey/ui'
import { Plus, ArrowRight, SlidersHorizontal, Route } from 'lucide-react'

export const meta = {
  name: 'PageHeader',
  tier: 'molecule',
  normalizing: true,
  approved: true,
  ported: true,
  figmaNode: '3965:5034',
  codeConnect: 'packages/ui/src/PageHeader.figma.tsx',
}

export const props = [
  { name: 'title', type: 'string', desc: 'Route/page title. Rendered as an H1 with display-3xl-semibold typography.' },
  { name: 'supportingText', type: 'string', desc: 'Type=Last update mode. When set, renders a trailing "Last update: …" label (label/sm regular, tertiary, right-aligned — SectionHeader style) and the actions never render. Mutually exclusive with children. (Figma: Type variant + Last update TEXT.)' },
  { name: 'children', type: 'ReactNode', desc: 'Type=Default mode. Actions for the trailing cluster (flex, 16px gap). Presence/absence of each child maps to the Figma Show toggle / Show link / Show button BOOLEANs. Ignored when supportingText is set.' },
  { name: 'className', type: 'string', desc: 'Additional class names for the <header> element.' },
  { name: 'style', type: 'CSSProperties', desc: 'Inline styles merged onto the <header> element.' },
]

export const tokens = [
  { token: '--font-size-3xl', resolves: '30px', usage: 'title font-size (via text-display-3xl-semibold utility)' },
  { token: '--font-weight-semibold', resolves: '600', usage: 'title weight' },
  { token: '--line-height-3xl', resolves: '38px', usage: 'title line-height' },
  { token: '--text-primary', resolves: 'DSN/900', usage: 'title text color (inherited from page)' },
  { token: '--spacing-4', resolves: '16px', usage: 'actions cluster gap (page-header__actions)' },
  { token: '--text-tertiary', resolves: 'DSN/500', usage: 'supportingText (Last update) color' },
  { token: '--font-size-sm', resolves: '14px', usage: 'supportingText (label/sm regular)' },
]

// ── Schematic ───────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  return (
    <span style={{ display: 'inline-block', padding: '0 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: '11px', fontWeight: 'var(--font-weight-medium)', whiteSpace: 'nowrap' }}>{tier}</span>
  )
}
function ChildLink({ to, children }) {
  return <a href={`#comp-${to}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-link)', textDecoration: 'underline', fontWeight: 'var(--font-weight-semibold)', whiteSpace: 'nowrap' }}>{children}</a>
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
      <div style={{ flex: '1 1 480px', minWidth: 360, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-4)' }}>
        <PageHeader title="Home" style={{ width: '100%' }}>
          <ButtonToggle firstIcon={<SlidersHorizontal size={20} />} secondIcon={<Route size={20} />} selected="first" firstAriaLabel="Filters view" secondAriaLabel="Route view" />
          <Button variant="link" iconRight={<ArrowRight size={16} />}>Go to Tracking</Button>
          <Button icon={<Plus size={20} />}>Button</Button>
        </PageHeader>
      </div>
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="root" tier="molecule">Full-width flex, <code>space-between</code>: H1 title left, trailing region right.</LegendRow>
        <LegendRow part="title" nested>H1, <code>display-3xl-semibold</code>, <code>--text-primary</code>.</LegendRow>
        <LegendRow part={<ChildLink to="ButtonToggle">ButtonToggle</ChildLink>} tier="atom" nested>Default only — the first action (segmented toggle).</LegendRow>
        <LegendRow part={<ChildLink to="Button">Button (link)</ChildLink>} tier="atom" nested>Default only — the "Go to Tracking" link action (<code>variant="link"</code>).</LegendRow>
        <LegendRow part={<ChildLink to="Button">Button</ChildLink>} tier="atom" nested>Default only — the primary action.</LegendRow>
        <LegendRow part="supporting text" nested>Type=Last update — <code>label/sm regular</code>, <code>--text-tertiary</code>, replaces the actions.</LegendRow>
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
  const [title, setTitle] = useState('Home')
  const [mode, setMode] = useState('default') // 'default' | 'lastUpdate'
  const [showToggle, setShowToggle] = useState(true)
  const [showLink, setShowLink] = useState(true)
  const [showButton, setShowButton] = useState(true)
  const [supportingText, setSupportingText] = useState('Last update: 04/24/2026 03:51 PM')
  const [view, setView] = useState('first')

  const lastUpdate = mode === 'lastUpdate'

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Field label="title" value={title} set={setTitle} />
        <label style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)' }}>
          Type
          <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ padding: '4px 8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }}>
            <option value="default">Default (actions)</option>
            <option value="lastUpdate">Last update</option>
          </select>
        </label>
        {lastUpdate ? (
          <Field label="supporting text" value={supportingText} set={setSupportingText} />
        ) : (
          <>
            <Toggle label="toggle" value={showToggle} set={setShowToggle} />
            <Toggle label="link" value={showLink} set={setShowLink} />
            <Toggle label="button" value={showButton} set={setShowButton} />
          </>
        )}
      </div>
      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-4)' }}>
        {lastUpdate ? (
          <PageHeader title={title} supportingText={supportingText} style={{ width: '100%' }} />
        ) : (
          <PageHeader title={title} style={{ width: '100%' }}>
            {showToggle && (
              <ButtonToggle firstIcon={<SlidersHorizontal size={20} />} secondIcon={<Route size={20} />} selected={view} onChange={setView} firstAriaLabel="Filters view" secondAriaLabel="Route view" />
            )}
            {showLink && <Button variant="link" iconRight={<ArrowRight size={16} />}>Go to Tracking</Button>}
            {showButton && <Button icon={<Plus size={20} />}>Button</Button>}
          </PageHeader>
        )}
      </div>
    </div>
  )
}

export default function PageHeaderDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Top-of-route H1 in a full-width flex shell. Two mutually-exclusive trailing modes
        (Figma <code>Type</code> variant): <strong>Default</strong> — an actions cluster (16px gap)
        fed by <code>children</code>; or <strong>Last update</strong> — a <code>supportingText</code>{' '}
        label (label/sm regular, tertiary, right-aligned — same style as{' '}
        <a href="#comp-SectionHeader" style={{ color: 'var(--text-link)', textDecoration: 'underline' }}>SectionHeader</a>).
        Setting <code>supportingText</code> renders the label and the actions never render.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — switch Type, toggle actions, edit text</h4>
        <Playground />
      </div>
    </div>
  )
}
