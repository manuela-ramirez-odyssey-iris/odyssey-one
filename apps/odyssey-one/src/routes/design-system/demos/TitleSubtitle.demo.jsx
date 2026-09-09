import { useState } from 'react'
import { Badge, TitleSubtitle } from '@odyssey/ui'
import { DemoControls, DemoToggle, DemoSelect, DemoField } from '../demoControls.jsx'

export const meta = {
  name: 'TitleSubtitle',
  tier: 'molecule',
  version: '0.5.0',
  createdVersion: '0.5.0',
  normalizing: true,
  figmaNode: '3016:2056',
  codeConnect: 'packages/ui/src/TitleSubtitle.figma.tsx',
  approved: true,
}

export const props = [
  { name: 'title', type: 'string', desc: 'Primary line (label/sm medium, text/primary). Wraps. Optional — omit it to leave a subtitle over a badge alone, which is what Figma\'s `Show Text` BOOLEAN switches off. (Figma: Title TEXT prop.)' },
  { name: 'subtitle', type: 'string', desc: 'Eyebrow line above the title (label/xs medium, text/tertiary). Wraps. Omit to hide. (Figma: Subtitle TEXT prop.)' },
  { name: 'badge', type: 'node', desc: 'Optional Badge (or any node) on the TITLE row, after the title and before the trailing icon — it qualifies the title, so it shares the title\'s row rather than the eyebrow\'s. Figma gates it with `Show Badge` and EXPOSES the nested Badge, so its Variant dropdown appears on every instance (an instance-swap cannot do that — its picker lists components, not variants). In code the variant is a property of the Badge you pass.' },
  { name: 'showIcon', type: 'boolean', desc: 'Renders the trailing icon (md, 16px, tertiary, non-interactive). Default false. (Figma: Show Icon BOOLEAN.)' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the root element.' },
]

export const tokens = [
  { token: '--text-primary', resolves: 'Text/primary', usage: 'title' },
  { token: '--text-tertiary', resolves: 'Text/tertiary', usage: 'subtitle + icon' },
  { token: '--font-size-sm', resolves: '14px', usage: 'title (label-sm-medium)' },
  { token: '--font-size-xs', resolves: '12px', usage: 'subtitle (label-xs-medium)' },
  { token: '--line-height-sm', resolves: '20px', usage: 'title line-height' },
  { token: '--line-height-xs', resolves: '16px', usage: 'subtitle line-height' },
  { token: '--font-weight-medium', resolves: '500', usage: 'both lines' },
]

// ── Schematic ─────────────────────────────────────────────────────────────────────
// A static, annotated TitleSubtitle with the icon on, plus a legend naming each part.
// This is a leaf molecule — it composes no other @odyssey/ui components (only a Lucide
// glyph), so the legend carries no child links.

function TierBadge({ tier }) {
  return (
    <span style={{ display: 'inline-block', padding: '0 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: '11px', fontWeight: 'var(--font-weight-medium)', whiteSpace: 'nowrap' }}>
      {tier}
    </span>
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
      {/* Static annotated instance in a fixed-width holder so wrapping reads correctly. */}
      <div style={{ flex: '0 0 auto', width: 220, background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-4)' }}>
        <TitleSubtitle title="Title" subtitle="Subtitle" badge={<Badge variant="purple">Text</Badge>} showIcon />
      </div>

      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="root" tier="molecule">
          Fills its parent width; a 4px vertical stack, both lines wrap (no truncation).
        </LegendRow>
        <LegendRow part="subtitle" nested>Eyebrow — <code>label/xs medium</code>, <code>--text-tertiary</code>. Omit <code>subtitle</code> to hide.</LegendRow>
        <LegendRow part="title" nested>Primary line — <code>label/sm medium</code>, <code>--text-primary</code>.</LegendRow>
        <LegendRow part="badge" nested>Optional Badge after the title, before the icon. Shown when <code>badge</code> is passed; its variant is the Badge's own.</LegendRow>
        <LegendRow part="icon" nested>Trailing <code>info</code> glyph (md, 16px), <code>--text-tertiary</code>, non-interactive. Shown when <code>showIcon</code>.</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ────────────────────────────────────────────────────────────────────

function Playground() {
  const [title, setTitle] = useState('Shipment #SHP-40021')
  const [subtitle, setSubtitle] = useState('Reference')
  const [showIcon, setShowIcon] = useState(true)
  const [badgeVariant, setBadgeVariant] = useState('purple')

  return (
    <div>
      <DemoControls>
        <DemoField label="title" value={title} onChange={setTitle} />
        <DemoField label="subtitle" value={subtitle} onChange={setSubtitle} />
        <DemoToggle label="show icon" value={showIcon} onChange={setShowIcon} />
        <DemoSelect
          label="badge"
          value={badgeVariant}
          onChange={setBadgeVariant}
          options={['amber', 'blue', 'green', 'red', 'purple', 'gray']}
          allowNone
          noneLabel="none"
        />
      </DemoControls>
      {/* Fixed-width holder to show wrapping; the component itself fills it. */}
      <div style={{ width: 240, background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-4)' }}>
        <TitleSubtitle
          title={title}
          subtitle={subtitle || undefined}
          badge={badgeVariant ? <Badge variant={badgeVariant}>Text</Badge> : undefined}
          showIcon={showIcon}
        />
      </div>
    </div>
  )
}

export default function TitleSubtitleDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        A compact stacked section header — a <code>subtitle</code> eyebrow (label/xs, tertiary)
        over a <code>title</code> (label/sm, primary), with an optional trailing icon. Fills
        its parent width; both lines wrap. Distinct from{' '}
        <a href="#comp-SectionHeader" style={{ color: 'var(--text-link)', textDecoration: 'underline' }}>SectionHeader</a>{' '}
        (the single-row big-H2 + timestamp bar).
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — edit the text, toggle the icon</h4>
        <Playground />
      </div>
    </div>
  )
}
