import { useState } from 'react'
import { ResolveTimeline } from '@odyssey/ui'

export const meta = {
  name: 'ResolveTimeline',
  tier: 'molecule',
  normalizing: true,
  figmaNode: null,
  codeConnect: null,
}

export const props = [
  { name: 'steps', type: '[{ key, label, detail, status, onClick? }]', desc: 'One entry per dot. status off|on|error maps onto StepIndicator. A step is clickable only when onClick is set.' },
  { name: 'current', type: 'string', desc: 'Key of the step whose body is shown — its label renders in text-primary.' },
]

export const tokens = [
  { token: '--deep-sea-neutral-200', resolves: 'Deep Sea Neutral/200', usage: 'pending track segment' },
  { token: '--caribbean-green-600', resolves: 'Caribbean Green/600', usage: 'passed segment' },
  { token: '--bittersweet-600', resolves: 'Bittersweet/600', usage: 'erroring segment' },
  { token: '--text-primary / --text-secondary / --text-tertiary', resolves: 'DSN/900 / 700 / 500', usage: 'current / other / locked labels' },
]

const PRESETS = {
  'Step 1 open': { s1: ['error', '3 errors · in progress'], s2: ['off', 'locked'], s3: ['off', '—'], current: 's1' },
  'Step 2 open': { s1: ['on', 'passed · 3 fixed'], s2: ['error', '4 errors · in progress'], s3: ['off', '—'], current: 's2' },
  'No message errors': { s1: ['on', 'no errors'], s2: ['error', '2 errors · in progress'], s3: ['off', '—'], current: 's2' },
  'Complete': { s1: ['on', 'passed · 3 fixed'], s2: ['on', 'passed'], s3: ['on', 'ready for planning'], current: 's3' },
}

export default function ResolveTimelineDemo() {
  const [preset, setPreset] = useState('Step 1 open')
  const p = PRESETS[preset]
  // In the real page a passed dot re-opens that step read-only; here it only
  // needs to *render* as a button, so the handler is a no-op.
  const clickable = (key) => (p[key][0] === 'on' && p.current !== key ? () => {} : undefined)
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Steps, not tabs: the OIF resolution progression. Passed dots are clickable (read-only look-back); locked ones are inert.
      </p>
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground</h4>
        <select value={preset} onChange={(e) => setPreset(e.target.value)} style={{ marginBottom: 'var(--spacing-4)' }}>
          {Object.keys(PRESETS).map((k) => <option key={k}>{k}</option>)}
        </select>
        <div style={{ maxWidth: 720 }}>
          <ResolveTimeline
            current={p.current}
            steps={[
              { key: 's1', label: 'Message errors', detail: p.s1[1], status: p.s1[0], onClick: clickable('s1') },
              { key: 's2', label: 'Data errors', detail: p.s2[1], status: p.s2[0], onClick: clickable('s2') },
              { key: 's3', label: 'Order ready', detail: p.s3[1], status: p.s3[0] },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
