import { useState } from 'react'
import { Package, ArrowRight } from 'lucide-react'
import { Badge } from '@odyssey/ui'

/* Live toggle chip — gray Badge wrapped in an aria-pressed toggle button. */
function SelectableChip({ label }) {
  const [on, setOn] = useState(false)
  return (
    <div className="ds-demo-col" style={{ alignItems: 'center' }}>
      <button
        type="button"
        aria-pressed={on}
        className="badge-interactive"
        onClick={() => setOn((v) => !v)}
        style={{ display: 'inline-flex', padding: 0, border: 'none', background: 'transparent' }}
      >
        <Badge variant="gray">{label}</Badge>
      </button>
      <span className="ds-demo-label">live — click to toggle</span>
    </div>
  )
}

export const meta = {
  name: 'Badge',
  tier: 'atom',
  version: '0.4.0',
  createdVersion: '0.2.0',
  figmaNode: '213:27',
  codeConnect: 'packages/ui/src/Badge.figma.tsx',
}

export const props = [
  { name: 'variant', type: 'amber|blue|green|red|purple|gray|notification|metric|count|favorite|time|info', desc: 'Color + shape preset. Default blue. time/info are icon-only (Shape=Icon) semantic badges.' },
  { name: 'iconOnly', type: 'boolean', desc: 'Shape=Icon — square (--radius-sm) soft-tint tile, icon-only. time→Clock, info→Info baked by default; leftIcon overrides. Default false.' },
  { name: 'children', type: 'ReactNode', desc: 'Label text (not used by notification/favorite/iconOnly).' },
  { name: 'leftIcon', type: 'ReactNode', desc: 'Leading icon slot (ignored by metric; for iconOnly it overrides the baked default — pass a 16px icon).' },
  { name: 'rightIcon', type: 'ReactNode', desc: 'Trailing icon slot (ignored by metric variants).' },
  { name: 'statusDot', type: 'boolean', desc: 'Renders an animated 6px pulse dot before the label (ignored by metric).' },
]

export const tokens = [
  { token: '--badge-blue-bg', resolves: 'Carolina Blue/100', usage: 'blue variant background' },
  { token: '--badge-blue-text', resolves: 'Carolina Blue/700', usage: 'blue variant text/icon' },
  { token: '--badge-green-bg', resolves: 'Caribbean Green/100', usage: 'green variant background' },
  { token: '--badge-red-bg', resolves: 'Bittersweet/100', usage: 'red variant background' },
  { token: '--badge-gray-bg', resolves: 'DSN/100', usage: 'gray + metric background' },
  { token: '--bittersweet-600', resolves: 'Bittersweet/600', usage: 'notification bg' },
  { token: '--carolina-blue-400', resolves: 'Carolina Blue/400', usage: 'count bg' },
  { token: '--badge-info-bg', resolves: 'Carolina Blue/200', usage: 'info icon-badge bg' },
  { token: '--badge-info-text', resolves: 'Carolina Blue/600', usage: 'info icon-badge icon' },
  { token: '--badge-green-text', resolves: 'Caribbean Green/800', usage: 'time icon-badge icon' },
  { token: '--radius-sm', resolves: '4px', usage: 'standard badge radius' },
  { token: '--deep-sea-neutral-200', resolves: 'DSN/200', usage: 'toggle gray badge — hover + selected bg' },
  { token: '--deep-sea-neutral-900', resolves: 'DSN/900', usage: 'toggle gray badge — selected ring' },
  { token: '--border-focus', resolves: 'Carolina Blue/400', usage: 'toggle gray badge — keyboard focus ring' },
]

const TEXT_VARIANTS = ['amber', 'blue', 'green', 'red', 'purple', 'gray']

export default function BadgeDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Status labels, counters, and indicators. Text variants share a pill shape;{' '}
        <code>notification</code> and <code>count</code> are fixed 20×20 circles;{' '}
        <code>metric</code> uses <code>--radius-lg</code> for a softer pill.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Text variants</h4>
        <div className="ds-demo-row">
          {TEXT_VARIANTS.map((v) => (
            <div className="ds-demo-col" key={v} style={{ alignItems: 'center' }}>
              <Badge variant={v}>Label</Badge>
              <span className="ds-demo-label">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Circular / numeric presets</h4>
        <div className="ds-demo-row">
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="notification">3</Badge>
            <span className="ds-demo-label">notification</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="count">12</Badge>
            <span className="ds-demo-label">count</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="metric">142</Badge>
            <span className="ds-demo-label">metric</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="favorite" />
            <span className="ds-demo-label">favorite</span>
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Icon slots</h4>
        <div className="ds-demo-row">
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="blue" leftIcon={<Package size={12} />}>Shipment</Badge>
            <span className="ds-demo-label">leftIcon</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="green" rightIcon={<ArrowRight size={12} />}>Continue</Badge>
            <span className="ds-demo-label">rightIcon</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="purple" leftIcon={<Package size={12} />} rightIcon={<ArrowRight size={12} />}>Both</Badge>
            <span className="ds-demo-label">both slots</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="gray" leftIcon={<Package size={12} />}>Gray icon</Badge>
            <span className="ds-demo-label">gray (icon tertiary)</span>
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Icon-only (Shape=Icon) — semantic badges</h4>
        <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Square (<code>--radius-sm</code>) soft-tint tiles, 20×20, icon-only. The
          icon is the variant's identity — <code>time</code> bakes a Clock, <code>info</code>{' '}
          bakes Info — so <code>&lt;Badge variant="time" iconOnly /&gt;</code> needs no icon
          passed. <code>leftIcon</code> still overrides for one-offs.
        </p>
        <div className="ds-demo-row">
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="time" iconOnly />
            <span className="ds-demo-label">time (baked Clock)</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="info" iconOnly />
            <span className="ds-demo-label">info (baked Info)</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="info" iconOnly leftIcon={<Package size={16} />} />
            <span className="ds-demo-label">leftIcon override</span>
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Status dot (animated pulse)</h4>
        <div className="ds-demo-row">
          {TEXT_VARIANTS.map((v) => (
            <div className="ds-demo-col" key={`dot-${v}`} style={{ alignItems: 'center' }}>
              <Badge variant={v} statusDot>Live</Badge>
              <span className="ds-demo-label">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Toggle (used as a selectable filter chip)</h4>
        <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          The gray Badge is decorative by default. When it's used as a toggle
          button (e.g. a filter chip in a panel that turns a search filter on/off),
          wrap it in a <code>&lt;button aria-pressed&gt;</code> with{' '}
          <code>.badge-interactive</code> — opt-in, so non-clickable gray badges
          stay plain. Hover darkens the bg, press mutes the text, and the{' '}
          <strong>selected</strong> state (<code>aria-pressed="true"</code>) shows
          the DSN/200 bg + 1px DSN/900 ring — Efrain's Figma <code>gray selected</code>{' '}
          variant. Keyboard focus adds a separate <code>--border-focus</code> ring.
          The first chip below is a live toggle — click it.
        </p>
        <div className="ds-demo-row">
          <SelectableChip label="Live toggle" />
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <button
              type="button"
              aria-pressed="false"
              className="badge-interactive"
              style={{ display: 'inline-flex', padding: 0, border: 'none', background: 'transparent' }}
            >
              <Badge variant="gray">Filter chip</Badge>
            </button>
            <span className="ds-demo-label">unselected</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <button
              type="button"
              aria-pressed="true"
              className="badge-interactive"
              style={{ display: 'inline-flex', padding: 0, border: 'none', background: 'transparent' }}
            >
              <Badge variant="gray">Filter chip</Badge>
            </button>
            <span className="ds-demo-label">selected (gray selected)</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <Badge variant="gray">Filter chip</Badge>
            <span className="ds-demo-label">decorative (no states)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
