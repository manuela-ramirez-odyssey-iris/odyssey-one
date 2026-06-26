import { useState } from 'react'
import { FilterButton } from '@odyssey/ui'

export const meta = {
  name: 'FilterButton',
  tier: 'atom',
  version: '0.2.0',
  figmaNode: '2347:325',
  codeConnect: 'packages/ui/src/FilterButton.figma.tsx',
}

export const props = [
  { name: 'active', type: 'boolean', desc: 'Persistent active state (drawer open / filters applied). Renders in Carolina Blue. Default false.' },
  { name: 'label', type: 'string', desc: 'Button label. Default "Filter".' },
  { name: 'onClick', type: '() => void', desc: 'Click handler.' },
]

export const tokens = [
  { token: '--filter-button-bg', resolves: 'DSN/700 (dark surface)', usage: 'idle background (on dark navbar)' },
  { token: '--filter-button-hover-bg', resolves: 'DSN/600', usage: 'hover surface lift' },
  { token: '--filter-button-active-bg', resolves: 'Carolina Blue/500', usage: 'active (drawer open) background' },
  { token: '--filter-button-text', resolves: 'white', usage: 'label + icon color' },
  { token: '--radius-md', resolves: '6px', usage: 'button corner radius' },
]

export default function FilterButtonDemo() {
  const [active, setActive] = useState(false)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Dark-surface filter trigger — lives in the GlobalSearch bar on the dark
        navbar. Hover and pressed states are CSS-only; the persistent{' '}
        <code>active</code> prop signals the filters drawer is open.
        The applied-filter count badge is owned by GlobalSearch (rendered as a
        sibling overlay), not by this atom.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive — click to toggle active</h4>
        <div className="ds-demo-cell ds-demo-cell--dark" style={{ gap: 'var(--spacing-4)', justifyContent: 'flex-start' }}>
          <FilterButton active={active} onClick={() => setActive((a) => !a)} />
          <span style={{ color: 'var(--text-inverse)', fontSize: 'var(--font-size-xs)', opacity: 0.6 }}>
            active = {String(active)}
          </span>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">State matrix (hover + press are CSS — interact above)</h4>
        <div className="ds-demo-cell ds-demo-cell--dark" style={{ gap: 'var(--spacing-6)' }}>
          <div className="ds-demo-col" style={{ alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <FilterButton active={false} onClick={() => {}} />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>default</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <FilterButton active={true} onClick={() => {}} />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>active</span>
          </div>
        </div>
      </div>
    </div>
  )
}
