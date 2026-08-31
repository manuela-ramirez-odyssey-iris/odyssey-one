import { TruckElectric } from 'lucide-react'
import { HeaderStrip } from '@odyssey/ui'
import { ICON_MD } from '@odyssey/tokens'

// Extracted 2026-08-30 from GroupTable's `header` prop (Figma 4183:773); the
// standalone master 5530:1140 was created the same day on Components-Molecules.
export const meta = {
  name: 'HeaderStrip',
  tier: 'molecule',
  version: '0.1.0',
  createdVersion: '0.1.0',
  normalizing: true,
  figmaNode: '5530:1140',
  codeConnect: null,
  approved: true,
  ported: true,
}

export const props = [
  { name: 'title', type: 'node | string', desc: 'The strip\'s text. Truncates with an ellipsis rather than wrapping or growing the band.' },
  { name: 'icon', type: 'node', desc: 'Optional leading icon — caller-supplied (e.g. a lucide element); never hardcoded here.' },
  { name: 'trail', type: 'node', desc: 'Optional trailing slot, right-aligned. Omitted entirely (not just empty) when not passed.' },
  { name: 'titleId', type: 'string', desc: 'Id placed on the TITLE element (not the root) — for consumers that need `aria-labelledby` to point at the text itself, e.g. GroupTable labelling its <table>.' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the root. Layout concerns specific to a host (e.g. GroupTable\'s sticky-left pin, or a right border) are expected to arrive this way rather than as component props.' },
  { name: '...rest', type: 'any', desc: 'Spread onto the root element.' },
]

export const tokens = [
  { token: '--bg-secondary', resolves: 'band tint', usage: 'root background' },
  { token: '--border-subtle', resolves: '1px hairline', usage: 'root bottom border' },
  { token: '--spacing-3 / --spacing-4', resolves: '12 / 16', usage: 'root padding (block / inline) — Figma 4183:773. The standalone TableSubheader mock (node 1943:11132) uses an asymmetric 12px top / 8px bottom instead; that deviation is flagged in the component docblock, not applied here.' },
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
        <code>Show trail</code> Figma properties are exposed straight through on GroupTable
        instances that carry the strip.
      </p>

      {/* ── Schematic ─────────────────────────────────────────────────── */}
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — title, icon, trail</h4>
        <div className="ds-demo-cell" style={{ justifyContent: 'flex-start' }}>
          <HeaderStrip
            style={{ width: '100%' }}
            icon={<TruckElectric {...ICON_MD} aria-hidden="true" />}
            title="Prior Tender List"
            trail={<span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>3 carriers</span>}
          />
        </div>
      </div>

      {/* ── Playground ────────────────────────────────────────────────── */}
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — title only, long text truncates</h4>
        <div className="ds-demo-cell" style={{ justifyContent: 'flex-start' }}>
          <HeaderStrip
            style={{ width: 260 }}
            title="A very long title that will not fit and must ellipsize instead of wrapping"
          />
        </div>
      </div>
    </div>
  )
}
