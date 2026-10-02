import { useState } from 'react'
import { TimelineDot } from '@odyssey/ui'
import { DemoControls, DemoSelect } from '../demoControls.jsx'

export const meta = {
  name: 'TimelineDot',
  tier: 'atom',
  version: '1.0.0',
  createdVersion: '1.0.0',
  normalizing: true,
  figmaNode: '6945:301',
  codeConnect: 'packages/ui/src/TimelineDot.figma.tsx',
}

export const props = [
  { name: 'color', type: "'amber' | 'blue' | 'green' | 'red' | 'purple' | 'gray' | 'info'", default: "'gray'", desc: "Figma `Color` axis (6945:301). Names mirror Badge variants so a History row's dot matches its Badge. Unknown/missing → gray (Figma's own default is amber; code defaults neutral on purpose)." },
  { name: 'className', type: 'string', desc: 'Extra class(es) — consumers add positioning (e.g. `.history-dot`); the dot itself never positions.' },
  { name: '...rest', type: 'html attrs', desc: 'Forwarded to the root <span>. The dot is decorative (`aria-hidden`).' },
]

const FILLS = [
  { color: 'amber', token: '--sunrise-yellow-300', resolves: 'sunrise yellow 300' },
  { color: 'blue', token: '--ice-blue-600', resolves: 'ice blue 600' },
  { color: 'green', token: '--caribbean-green-600', resolves: 'caribbean green 600' },
  { color: 'red', token: '--bittersweet-600', resolves: 'bittersweet 600' },
  { color: 'purple', token: '--purple-800', resolves: 'purple 800' },
  { color: 'gray', token: '--deep-sea-neutral-400', resolves: 'DSN 400' },
  { color: 'info', token: '--carolina-blue-400', resolves: 'carolina blue 400' },
]

export const tokens = [
  ...FILLS.map((f) => ({ token: f.token, resolves: f.resolves, usage: `color="${f.color}" fill` })),
  { token: '--white', resolves: 'white', usage: '2px inside ring (border-box — 6px of color shows)' },
  { token: '--shadow-base', resolves: 'shadow/base', usage: 'drop shadow (Figma effect style)' },
  { token: '--radius-full', resolves: '9999px', usage: '10×10 circle' },
]

const label = { fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }

function Schematic() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)', background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-6)' }}>
        {FILLS.map((f) => (
          <div key={f.color} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', ...label }}>
            <TimelineDot color={f.color} />
            <span><strong>{f.color}</strong> <code>{f.token}</code></span>
          </div>
        ))}
      </div>
      {/* dot-over-line usage: the rail line runs behind, the white ring separates the dot from it */}
      <div style={{ position: 'relative', height: 72, marginLeft: 'var(--spacing-4)', ...label }}>
        <div style={{ position: 'absolute', left: 4, top: 0, bottom: 0, width: 1, background: 'var(--border-subtle)' }} />
        {['green', 'red'].map((c, i) => (
          <div key={c} style={{ position: 'absolute', left: 0, top: 8 + i * 36, paddingLeft: 'var(--spacing-6)' }}>
            <TimelineDot color={c} style={{ position: 'absolute', left: 0, top: 2 }} />
            History row {i + 1}
          </div>
        ))}
      </div>
    </div>
  )
}

function Playground() {
  const [color, setColor] = useState('green')
  return (
    <div>
      <DemoControls>
        <DemoSelect label="color" value={color} onChange={setColor} options={FILLS.map((f) => f.color)} />
      </DemoControls>
      <div style={{ background: 'var(--bg-primary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)' }}>
        <TimelineDot color={color} />
      </div>
    </div>
  )
}

export default function TimelineDotDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        The marker dot on a vertical activity rail (History tab). A 10px disc
        with a 2px inside white ring and base shadow; color names mirror Badge
        variants so a row's dot matches its Badge.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — the 7 colors + dot over a rail line</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — color</h4>
        <Playground />
      </div>
    </div>
  )
}
