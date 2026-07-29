import { useState } from 'react'
import { StepIndicator } from '@odyssey/ui'

export const meta = {
  name: 'StepIndicator',
  tier: 'atom',
  version: '0.9.0',
  createdVersion: '0.2.0',
  figmaNode: '2909:13',
  codeConnect: 'packages/ui/src/StepIndicator.figma.tsx',
  normalizing: false,
}

export const props = [
  { name: 'position', type: 'start|mid|end', desc: 'Which connector lines render: start = below only, mid = both, end = above only. Hidden lines keep their 16px slot (uniform 40×72). Default start.' },
  { name: 'status', type: 'off|on|error', desc: 'off = pending (gray circle), on = validated (green circle + ring), error = validation failed (Bittersweet circle + octagon-x, no ring). Default off.' },
]

export const tokens = [
  { token: '--deep-sea-neutral-300', resolves: 'Deep Sea Neutral/300', usage: 'connector lines + off circle' },
  { token: '--caribbean-green-600', resolves: 'Caribbean Green/600', usage: 'on circle fill' },
  { token: '--caribbean-green-100', resolves: 'Caribbean Green/100', usage: 'on circle ring (1px)' },
  { token: '--bittersweet-600', resolves: 'Bittersweet/600', usage: 'error circle fill' },
  { token: '--white', resolves: 'White', usage: 'check / octagon-x icon (currentColor)' },
  { token: '--radius-full', resolves: 'Radius/full', usage: 'circle' },
  { token: '--transition-base', resolves: '200ms ease', usage: 'off↔on tint' },
]

const POSITIONS = ['start', 'mid', 'end']

export default function StepIndicatorDemo() {
  const [steps, setSteps] = useState(['off', 'off', 'off'])
  const NEXT = { off: 'on', on: 'error', error: 'off' }

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Vertical stepper node — position picks the connector lines, status flips
        pending ↔ validated. Composed by <code>Accordion</code>; usable standalone
        in any stepper context.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Position × Status</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start', gap: 'var(--spacing-8)' }}>
          {POSITIONS.map((pos) => (
            <div key={pos} style={{ display: 'flex', gap: 'var(--spacing-6)' }}>
              {['off', 'on', 'error'].map((st) => (
                <div key={st} style={{ textAlign: 'center' }}>
                  <StepIndicator position={pos} status={st} />
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--spacing-1)' }}>
                    {pos} / {st}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Stacked stepper — click a circle to cycle off → on → error</h4>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          {steps.map((st, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSteps((d) => d.map((v, j) => (j === i ? NEXT[v] : v)))}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'block' }}
              aria-label={`Cycle step ${i + 1} (currently ${st})`}
            >
              <StepIndicator
                position={i === 0 ? 'start' : i === steps.length - 1 ? 'end' : 'mid'}
                status={st}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
