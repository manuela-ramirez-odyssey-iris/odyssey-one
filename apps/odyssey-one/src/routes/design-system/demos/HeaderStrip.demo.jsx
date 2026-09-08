import { useState } from 'react'
import { ArrowDown, ArrowUp, TruckElectric } from 'lucide-react'
import { Badge, Button, HeaderStrip } from '@odyssey/ui'
import { ICON_MD } from '@odyssey/tokens'

// Extracted 2026-08-30 from GroupTable's `header` prop (Figma 4183:773); the
// standalone master 5530:1140 was created the same day on Components-Molecules.
export const meta = {
  name: 'HeaderStrip',
  tier: 'molecule',
  version: '1.6.0',
  createdVersion: '0.1.0',
  normalizing: true,
  figmaNode: '5530:1140',
  codeConnect: 'packages/ui/src/HeaderStrip.figma.tsx',
}

export const props = [
  { name: 'title', type: 'node | string', desc: 'The strip\'s text. Truncates with an ellipsis rather than wrapping or growing the band.' },
  { name: 'icon', type: 'node', desc: 'Optional leading icon — caller-supplied (e.g. a lucide element); never hardcoded here.' },
  { name: 'badge', type: 'node', desc: 'Optional Badge (or any node) rendered immediately AFTER the title, inside the same group — so it stays glued to the text it qualifies rather than drifting toward the trail. Figma pairs `Show badge` with a `Badge` instance-swap whose preferred values are the whole Badge set, so any variant is selectable there; in code the variant is simply a property of the Badge you pass, never a prop here.' },
  { name: 'trail', type: 'node', desc: 'Optional trailing slot, right-aligned. Omitted entirely (not just empty) when not passed.' },
  { name: 'titleId', type: 'string', desc: 'Id placed on the TITLE element (not the root) — for consumers that need `aria-labelledby` to point at the text itself, e.g. GroupTable labelling its <table>.' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the root. Layout concerns specific to a host (e.g. GroupTable\'s sticky-left pin, or a right border) are expected to arrive this way rather than as component props.' },
  { name: '...rest', type: 'any', desc: 'Spread onto the root element.' },
]

export const tokens = [
  { token: '--bg-secondary', resolves: 'band tint', usage: 'root background' },
  { token: '--border-subtle', resolves: '1px hairline', usage: 'root bottom border' },
  { token: '--spacing-1 / --spacing-4', resolves: '4 / 16', usage: 'root padding (block / inline). The block value is only what a 32px icon-button trail needs to clear inside the 48px band.' },
  { token: '--spacing-2 / --spacing-1', resolves: '8 / 4', usage: 'title-group block padding — carries the asymmetric 12 top / 8 bottom optical offset both Figma sources read, without constraining the trail.' },
  { token: '--spacing-2', resolves: '8px', usage: 'gap between icon / title / trail' },
  { token: 'label/base semibold', resolves: '16 / 24 / 600', usage: 'title typography (text-label-base-semibold utility)' },
]

export default function HeaderStripDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        A 48px band: leading icon + bold title, optional trailing slot. Extracted from{' '}
        <code>GroupTable</code>'s <code>header</code> prop so other surfaces can compose it
        directly.
      </p>
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        <code>GroupTable</code>'s <code>header</code> strip is an instance of this component
        (master 5530:1140) — its <code>Title</code> / <code>Show icon</code> / <code>Icon</code> /{' '}
        <code>Show badge</code> / <code>Show trail</code> Figma properties are exposed straight
        through on GroupTable instances that carry the strip.
      </p>

      {/* ── Schematic ─────────────────────────────────────────────────── */}
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — icon, title, badge, trail</h4>
        <div className="ds-demo-cell" style={{ justifyContent: 'flex-start' }}>
          <HeaderStrip
            style={{ width: '100%' }}
            icon={<TruckElectric {...ICON_MD} aria-hidden="true" />}
            title="Stop 3"
            badge={<Badge variant="green">Pickup</Badge>}
            trail={
              <span style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                <Button variant="icon" size="sm" aria-label="Move up"><ArrowUp {...ICON_MD} aria-hidden="true" /></Button>
                <Button variant="icon" size="sm" aria-label="Move down"><ArrowDown {...ICON_MD} aria-hidden="true" /></Button>
              </span>
            }
          />
        </div>
      </div>

      {/* ── Playground ────────────────────────────────────────────────── */}
      <Playground />
    </div>
  )
}

// The Figma master's Badge swap offers the whole Badge set, so the demo has
// to let you see more than the green one the source mock happened to draw.
const BADGE_VARIANTS = ['amber', 'blue', 'green', 'red', 'purple', 'gray']

// Badge and trail are independently optional, and the title has to keep
// ellipsizing whatever else is switched on — that is the thing worth driving
// by hand rather than enumerating as fixed cases.
function Playground() {
  const [badgeVariant, setBadgeVariant] = useState('green')
  const [showTrail, setShowTrail] = useState(true)
  const [longTitle, setLongTitle] = useState(false)

  const trail = (
    <span style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
      <Button variant="icon" size="sm" aria-label="Move up"><ArrowUp {...ICON_MD} aria-hidden="true" /></Button>
      <Button variant="icon" size="sm" aria-label="Move down"><ArrowDown {...ICON_MD} aria-hidden="true" /></Button>
    </span>
  )

  return (
    <div className="ds-demo-section">
      <h4 className="ds-demo-section__title">Playground — toggle badge, trail, long title</h4>
      <div style={{ display: 'flex', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', fontSize: 'var(--font-size-sm)' }}>
        <label>
          Badge{' '}
          <select value={badgeVariant} onChange={(e) => setBadgeVariant(e.target.value)}>
            <option value="">none</option>
            {BADGE_VARIANTS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label><input type="checkbox" checked={showTrail} onChange={(e) => setShowTrail(e.target.checked)} /> Trail</label>
        <label><input type="checkbox" checked={longTitle} onChange={(e) => setLongTitle(e.target.checked)} /> Long title</label>
      </div>
      <div className="ds-demo-cell" style={{ justifyContent: 'flex-start' }}>
        <HeaderStrip
          style={{ width: 420 }}
          title={longTitle ? 'A very long title that will not fit and must ellipsize instead of wrapping' : 'Stop 3'}
          badge={badgeVariant ? <Badge variant={badgeVariant}>Pickup</Badge> : undefined}
          trail={showTrail ? trail : undefined}
        />
      </div>
    </div>
  )
}
