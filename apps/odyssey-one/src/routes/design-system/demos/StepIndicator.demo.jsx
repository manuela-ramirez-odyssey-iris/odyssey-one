import { useState } from 'react'
import { StepIndicator } from '@odyssey/ui'

export const meta = {
  name: 'StepIndicator',
  tier: 'atom',
  figmaNode: '2909:13',
  codeConnect: 'packages/ui/src/StepIndicator.figma.tsx',
}

export const props = [
  { name: 'position', type: 'start|mid|end', desc: 'Which connector lines render: start = below only, mid = both, end = above only. Hidden lines keep their 16px slot (uniform 40×72). Default start.' },
  { name: 'status', type: 'off|on', desc: 'off = pending (gray circle), on = validated (green circle + ring). The check shows in both. Default off.' },
]

export const tokens = [
  { token: '--deep-sea-neutral-300', resolves: 'Deep Sea Neutral/300', usage: 'connector lines + off circle' },
  { token: '--caribbean-green-600', resolves: 'Caribbean Green/600', usage: 'on circle fill' },
  { token: '--caribbean-green-100', resolves: 'Caribbean Green/100', usage: 'on circle ring (1px)' },
  { token: '--white', resolves: 'White', usage: 'check icon (currentColor)' },
  { token: '--radius-full', resolves: 'Radius/full', usage: 'circle' },
  { token: '--transition-base', resolves: '200ms ease', usage: 'off↔on tint' },
]

const POSITIONS = ['start', 'mid', 'end']

export default function StepIndicatorDemo() {
  const [done, setDone] = useState([false, false, false])

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
              {['off', 'on'].map((st) => (
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
        <h4 className="ds-demo-section__title">Stacked stepper — click a circle to toggle validation</h4>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          {done.map((isDone, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'block' }}
              aria-pressed={isDone}
              aria-label={`Toggle step ${i + 1}`}
            >
              <StepIndicator
                position={i === 0 ? 'start' : i === done.length - 1 ? 'end' : 'mid'}
                status={isDone ? 'on' : 'off'}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
