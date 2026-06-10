import { useState } from 'react'
import { AddSectionButton, AddSectionDivider } from '@odyssey/ui'

export const meta = {
  name: 'AddSectionButton',
  tier: 'atom',
  figmaNode: '2210:302',
  codeConnect: 'packages/ui/src/AddSectionButton.figma.tsx',
}

export const props = [
  { name: 'onClick', type: '() => void', desc: 'Click handler. When provided the pill renders as a <button>; omit to render as a decorative <span>.' },
  { name: 'ariaLabel', type: 'string', desc: 'Accessible label for the pill button. Default "Add section".' },
  { name: 'className', type: 'string', desc: 'Additional CSS classes for the root element.' },
]

export const tokens = [
  { token: '--carolina-blue-600', resolves: 'CB/600', usage: 'top-border line and pill background (rest)' },
  { token: '--carolina-blue-400', resolves: 'CB/400', usage: 'pill background — hover' },
  { token: '--deep-sea-neutral-900', resolves: 'DSN/900', usage: 'pill background — active/pressed' },
  { token: '--white', resolves: 'white', usage: 'plus icon color inside the pill' },
  { token: '--radius-full', resolves: 'Radius/full', usage: 'pill shape (circle)' },
  { token: '--transition-fast', resolves: 'transition/fast', usage: 'pill background transition' },
]

export default function AddSectionButtonDemo() {
  const [clickCount, setClickCount] = useState(0)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Full-width affordance shown at the bottom of all sections in Home edit mode.
        A CB/600 horizontal rule with a 36×36 circular pill straddling it. Polymorphic pill:
        renders as <code>&lt;button&gt;</code> when <code>onClick</code> is provided,{' '}
        <code>&lt;span&gt;</code> (decorative) otherwise.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive — click to add a section</h4>
        <div style={{ width: 360 }}>
          <AddSectionButton
            onClick={() => setClickCount((n) => n + 1)}
            ariaLabel="Add section"
          />
        </div>
        {clickCount > 0 && (
          <p style={{ marginTop: 'var(--spacing-3)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            Clicked <strong>{clickCount}</strong> time{clickCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Decorative (no onClick) — pill is a span</h4>
        <div style={{ width: 360 }}>
          <AddSectionButton />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Paired with AddSectionDivider (typical usage)</h4>
        <div style={{ width: 360 }}>
          <AddSectionDivider />
          <AddSectionButton onClick={() => {}} ariaLabel="Add section" />
        </div>
      </div>
    </div>
  )
}
