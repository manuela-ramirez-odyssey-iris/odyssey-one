import { useState } from 'react'
import { X, ChevronDown, MoreHorizontal, Minus } from 'lucide-react'
import { IconButtonGhost } from '@odyssey/ui'

export const meta = {
  name: 'IconButtonGhost',
  tier: 'atom',
  version: '0.2.0',
  createdVersion: '0.2.0',
  figmaNode: '2138:304',
  codeConnect: 'packages/ui/src/IconButtonGhost.figma.tsx',
}

export const props = [
  { name: 'icon', type: 'ReactNode', desc: 'Icon to render (always a real Lucide icon in code; placeholder-20 in Figma INSTANCE_SWAP slot).' },
  { name: 'onClick', type: '() => void', desc: 'When provided renders as <button>; omitted renders as <span> (decorative).' },
  { name: 'ariaLabel', type: 'string', desc: 'Accessible label for the button.' },
  { name: 'className', type: 'string', desc: 'Extra class names appended to the root element.' },
]

export const tokens = [
  { token: '--icon-button-ghost-idle-bg', resolves: 'transparent', usage: 'idle — invisible at rest' },
  { token: '--icon-button-ghost-hover-bg', resolves: 'DSN/100', usage: 'hover surface fill' },
  { token: '--icon-button-ghost-active-bg', resolves: 'DSN/200', usage: 'pressed surface fill' },
  { token: '--radius-lg', resolves: '8px', usage: '28×28 corner radius' },
  { token: '--text-secondary', resolves: 'DSN/600', usage: 'icon color' },
]

export default function IconButtonGhostDemo() {
  const [dismissed, setDismissed] = useState(false)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        28×28 transparent-at-rest button. Surface only appears on hover (DSN/100)
        and press (DSN/200) — ideal for modal close, widget close, and inline
        "clear" actions that should not compete for attention at rest.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive (hover to reveal surface)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'center' }}>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <IconButtonGhost
              icon={<X size={16} />}
              onClick={() => setDismissed((d) => !d)}
              ariaLabel="Dismiss"
            />
            <span className="ds-demo-label">dismiss {dismissed ? '(dismissed)' : ''}</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <IconButtonGhost
              icon={<ChevronDown size={16} />}
              onClick={() => {}}
              ariaLabel="Expand"
            />
            <span className="ds-demo-label">expand</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <IconButtonGhost
              icon={<MoreHorizontal size={16} />}
              onClick={() => {}}
              ariaLabel="More options"
            />
            <span className="ds-demo-label">more</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <IconButtonGhost
              icon={<Minus size={16} />}
              onClick={() => {}}
              ariaLabel="Collapse"
            />
            <span className="ds-demo-label">collapse</span>
          </div>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Decorative (no onClick → span)</h4>
        <div className="ds-demo-row">
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <IconButtonGhost icon={<X size={16} />} ariaLabel="Close" />
            <span className="ds-demo-label">X / close</span>
          </div>
          <div className="ds-demo-col" style={{ alignItems: 'center' }}>
            <IconButtonGhost icon={<MoreHorizontal size={16} />} />
            <span className="ds-demo-label">more</span>
          </div>
        </div>
      </div>
    </div>
  )
}
