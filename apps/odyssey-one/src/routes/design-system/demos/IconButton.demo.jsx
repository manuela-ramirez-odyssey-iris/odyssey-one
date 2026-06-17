import { useState } from 'react'
import { X, Bell, Settings, Search, Trash2 } from 'lucide-react'
import { IconButton } from '@odyssey/ui'

export const meta = {
  name: 'IconButton',
  tier: 'atom',
  figmaNode: '1754:295',
  codeConnect: 'packages/ui/src/IconButton.figma.tsx',
  deprecated: true,
}

export const props = [
  { name: 'icon', type: 'ReactNode', desc: 'The icon to render (inherits currentColor via Lucide).' },
  { name: 'onClick', type: '() => void', desc: 'When provided the element renders as <button> (interactive); omitted renders as <span> (decorative).' },
  { name: 'ariaLabel', type: 'string', desc: 'Accessible label for the button.' },
  { name: 'className', type: 'string', desc: 'Extra class names appended to the root element.' },
]

export const tokens = [
  { token: '--icon-button-bg', resolves: 'DSN/0 (white)', usage: 'idle surface' },
  { token: '--icon-button-hover-bg', resolves: 'DSN/50', usage: 'hover surface' },
  { token: '--icon-button-active-bg', resolves: 'DSN/100', usage: 'pressed surface' },
  { token: '--shadow-base', resolves: 'shadow/base', usage: 'resting elevation' },
  { token: '--radius-full', resolves: '9999px', usage: 'circular shape' },
  { token: '--text-secondary', resolves: 'DSN/600', usage: 'icon color at rest' },
]

export default function IconButtonDemo() {
  const [clickCount, setClickCount] = useState(0)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        24×24 circular surface with shadow. Polymorphic: renders as{' '}
        <code>&lt;button&gt;</code> when <code>onClick</code> is provided,{' '}
        <code>&lt;span&gt;</code> (decorative) otherwise. Hover and pressed states
        are CSS-only — no React prop needed.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive (click counts)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'center' }}>
          <IconButton
            icon={<Bell size={14} />}
            onClick={() => setClickCount((n) => n + 1)}
            ariaLabel="Notifications"
          />
          <IconButton
            icon={<Settings size={14} />}
            onClick={() => setClickCount((n) => n + 1)}
            ariaLabel="Settings"
          />
          <IconButton
            icon={<Search size={14} />}
            onClick={() => setClickCount((n) => n + 1)}
            ariaLabel="Search"
          />
          <IconButton
            icon={<Trash2 size={14} />}
            onClick={() => setClickCount((n) => n + 1)}
            ariaLabel="Delete"
          />
          {clickCount > 0 && (
            <span className="ds-demo-label">clicked {clickCount}×</span>
          )}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Decorative (no onClick → renders as span)</h4>
        <div className="ds-demo-row">
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <IconButton icon={<X size={14} />} ariaLabel="Close" />
            <span className="ds-demo-label">X / close</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <IconButton icon={<Bell size={14} />} />
            <span className="ds-demo-label">bell</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <IconButton icon={<Settings size={14} />} />
            <span className="ds-demo-label">settings</span>
          </div>
        </div>
      </div>
    </div>
  )
}
