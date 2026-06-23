import { PaginationButton } from '@odyssey/ui'

export const meta = {
  name: 'PaginationButton',
  tier: 'atom',
  figmaNode: '3234:3857',
  codeConnect: 'packages/ui/src/PaginationButton.figma.tsx',
}

export const props = [
  { name: 'variant', type: 'page|prev|next', desc: 'Segment kind. page = numbered button; prev/next = arrow end-caps.' },
  { name: 'current', type: 'boolean', desc: 'page only — active/current page (Primary look + aria-current="page"). Default false.' },
  { name: 'children', type: 'ReactNode', desc: 'Page number (page variant).' },
  { name: 'disabled', type: 'boolean', desc: 'Native disabled (Paginator disables prev/next at bounds). Muted DSN/300 — matches Figma Icon Left/Right State=Disabled.' },
  { name: 'onClick', type: 'function', desc: 'Click handler.' },
]

export const tokens = [
  { token: '--deep-sea-neutral-900', resolves: 'DSN/900', usage: 'current page bg (idle/pressed)' },
  { token: '--deep-sea-neutral-600', resolves: 'DSN/600', usage: 'current page hover bg' },
  { token: '--deep-sea-neutral-700', resolves: 'DSN/700', usage: 'inactive page + arrow fg' },
  { token: '--deep-sea-neutral-400', resolves: 'DSN/400', usage: 'pressed fg + hover divider' },
  { token: '--deep-sea-neutral-300', resolves: 'DSN/300', usage: 'idle right divider + disabled fg' },
  { token: '--deep-sea-neutral-100', resolves: 'DSN/100', usage: 'secondary pressed bg' },
  { token: '--deep-sea-neutral-50', resolves: 'DSN/50', usage: 'secondary hover bg' },
  { token: '--radius-lg', resolves: '8px', usage: 'end-cap rounding (prev left / next right)' },
  { token: '--icon-size-lg', resolves: '20px', usage: 'chevron size' },
  { token: '--border-focus', resolves: 'Carolina Blue/400', usage: 'keyboard focus ring' },
  { token: '--shadow-sm', resolves: 'shadow/sm', usage: 'per-segment shadow' },
]

export default function PaginationButtonDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        A single segment of the <strong>Paginator</strong> molecule's joined bar. Segments share a
        right divider; <code>prev</code>/<code>next</code> arrows cap the ends with rounded outer
        corners. Color ladders mirror <code>Button</code> (primary = current page, secondary =
        inactive page + arrows). Hover/press here are real; <code>current</code> + <code>disabled</code>
        are prop-driven.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Joined bar (as used in the Paginator)</h4>
        <div className="ds-demo-row">
          <div style={{ display: 'inline-flex' }}>
            <PaginationButton variant="prev" />
            <PaginationButton variant="page">1</PaginationButton>
            <PaginationButton variant="page" current>2</PaginationButton>
            <PaginationButton variant="page">3</PaginationButton>
            <PaginationButton variant="next" />
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Variants (hover · press them)</h4>
        <div className="ds-demo-row" style={{ gap: 'var(--spacing-6)' }}>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <PaginationButton variant="page" current>1</PaginationButton>
            <span className="ds-demo-label">page · current (Primary)</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <PaginationButton variant="page">1</PaginationButton>
            <span className="ds-demo-label">page (Secondary)</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <PaginationButton variant="prev" />
            <span className="ds-demo-label">prev (Icon Left)</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <PaginationButton variant="next" />
            <span className="ds-demo-label">next (Icon Right)</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <PaginationButton variant="next" disabled />
            <span className="ds-demo-label">disabled</span>
          </div>
        </div>
      </div>
    </div>
  )
}
