import { useState } from 'react'
import { ModalMedium, Button } from '@odyssey/ui'

export const meta = {
  name: 'ModalMedium',
  tier: 'organism',
  version: '0.10.0',
  createdVersion: '0.2.0',
  figmaNode: '2032:915',
  codeConnect: 'packages/ui/src/ModalMedium.figma.tsx',
  normalizing: true,
}

export const props = [
  { name: 'title', type: 'string', desc: 'Header title text.' },
  { name: 'children', type: 'ReactNode', desc: 'Content slot — body area.' },
  { name: 'footer', type: 'ReactNode', desc: 'Footer slot — typically Cancel / Save action buttons.' },
  { name: 'onClose', type: '() => void', desc: 'Dismiss handler — wired to ESC key, overlay click, and the header X button.' },
  { name: 'onBack', type: '() => void', desc: 'Optional leading back chevron, rendered before the title when present. Mirrors ModalHeader’s onBack API.' },
  { name: 'scrollableContent', type: 'boolean', desc: 'Implementation-only: removes bottom padding so a scrolling content region runs flush to the footer divider. Default false.' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the dialog element.' },
  { name: 'ariaLabel', type: 'string', desc: 'Accessible label override. Defaults to title.' },
]

export const tokens = [
  { token: '--bg-primary', resolves: 'Background/primary', usage: 'dialog surface' },
  { token: '--bg-secondary', resolves: 'Background/secondary', usage: 'header background' },
  { token: '--border-subtle', resolves: 'Border/subtle', usage: 'header / footer divider lines' },
  { token: '--text-primary', resolves: 'Text/primary', usage: 'title text' },
  { token: '--radius-lg', resolves: 'Radius/lg', usage: 'dialog corner radius' },
  { token: '--shadow-lg', resolves: 'Shadow/lg', usage: 'dialog elevation' },
  { token: '--spacing-5', resolves: '20px', usage: 'header / footer / content padding' },
  { token: '--font-size-lg', resolves: '18px', usage: 'title font size (heading-lg)' },
]

export default function ModalMediumDemo() {
  const [open, setOpen] = useState(false)
  const [scrollable, setScrollable] = useState(false)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Content-sized confirmation and short-workflow dialog (width auto, min 350px / max 780px;
        height auto capped at 90vh — past the cap the content slot scrolls). Shares the same overlay + ESC / backdrop-dismiss
        pattern as ModalLarge but has no subtitle and uses a larger heading style. The
        <code>scrollableContent</code> flag removes body padding so a scrolling region seats flush
        against the footer divider.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive — open / close</h4>
        <div className="ds-demo-row">
          <div className="ds-demo-col">
            <button
              type="button"
              onClick={() => { setScrollable(false); setOpen(true) }}
              style={{
                padding: 'var(--spacing-2) var(--spacing-4)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-primary)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
              }}
            >
              Open ModalMedium
            </button>
            <span className="ds-demo-label">scrollableContent = false</span>
          </div>
          <div className="ds-demo-col">
            <button
              type="button"
              onClick={() => { setScrollable(true); setOpen(true) }}
              style={{
                padding: 'var(--spacing-2) var(--spacing-4)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-primary)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
              }}
            >
              Open ModalMedium (scrollable)
            </button>
            <span className="ds-demo-label">scrollableContent = true</span>
          </div>
        </div>
      </div>

      {open && (
        <ModalMedium
          title="Confirm Action"
          scrollableContent={scrollable}
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setOpen(false)}>Save</Button>
            </>
          }
        >
          <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-md)' }}>
            {scrollable ? (
              <div style={{ maxHeight: 180, overflowY: 'auto', paddingRight: 'var(--spacing-2)' }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <p key={i} style={{ margin: '0 0 var(--spacing-3)' }}>
                    Scrollable content row {i + 1} — this region scrolls independently while the header
                    and footer stay anchored.
                  </p>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0 }}>
                Are you sure you want to proceed? This action cannot be undone. Close via the X button,
                clicking outside the dialog, or pressing{' '}
                <kbd style={{ fontFamily: 'monospace', background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 'var(--radius-sm)' }}>Esc</kbd>.
              </p>
            )}
          </div>
        </ModalMedium>
      )}
    </div>
  )
}
