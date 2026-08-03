import { Spinner } from '@odyssey/ui'

export const meta = {
  name: 'Spinner',
  tier: 'atom',
  version: '0.12.0',
  createdVersion: '0.1.0',
  normalizing: false,
  // Design System - MCP → Components-Atoms → Spinner (4876:7331) — recolored
  // from raw grays to DSN shades at intake and componentized (was the loose
  // "Spinner-Gradient-1" frame 4710-6673).
}

export const props = [
  { name: 'size', type: 'number', desc: 'Outer diameter in px (default 48, the Figma master). Ring stroke scales with it (Figma ratio 8/48).' },
  { name: 'className', type: 'string', desc: 'Merged onto the root.' },
]

export const tokens = [
  { token: '--deep-sea-neutral-50 → -700', resolves: 'conic gradient sweep', usage: 'the arc — Figma angular gradient DSN/50 → DSN/700 (was raw white → #2D2D2D)' },
  { token: '--radius-full', resolves: '9999px', usage: 'ring shape' },
]

export default function SpinnerDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Loading ring for any async wait — built for GlobalSearch quick-results loading, reusable
        everywhere. Pure CSS: a conic-gradient ring masked to the stroke, rotating 900ms{' '}
        <strong>linear</strong> (continuous rotation must not pulse — easing would make the sweep
        stutter). <code>role="status"</code> + <code>aria-label="Loading"</code> built in;
        reduced-motion slows it rather than freezing it (a frozen spinner reads as a hang).
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-6)' }}>
          <Spinner />
          <Spinner size={24} />
          <Spinner size={16} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-2)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            <Spinner size={16} /> Loading quick results…
          </span>
        </div>
      </div>
    </div>
  )
}
