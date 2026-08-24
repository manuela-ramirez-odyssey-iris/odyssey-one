import { useState } from 'react'
import { ModalLarge, Button } from '@odyssey/ui'

export const meta = {
  name: 'ModalLarge',
  tier: 'organism',
  version: '0.2.0',
  createdVersion: '0.2.0',
  figmaNode: '2006:663',
  codeConnect: 'packages/ui/src/ModalLarge.figma.tsx',
  normalizing: true,
  approved: true,
}

export const props = [
  { name: 'title', type: 'string', desc: 'Header title text.' },
  { name: 'subtitle', type: 'string', desc: 'Header subtitle text. Rendered only when showSubtitle is true.' },
  { name: 'showSubtitle', type: 'boolean', desc: 'Toggle subtitle visibility. Default true.' },
  { name: 'children', type: 'ReactNode', desc: 'Content slot — scrollable body area.' },
  { name: 'footer', type: 'ReactNode', desc: 'Footer slot — typically action buttons.' },
  { name: 'onClose', type: '() => void', desc: 'Dismiss handler — wired to ESC key, overlay click, and the header X button.' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the dialog element.' },
  { name: 'ariaLabel', type: 'string', desc: 'Accessible label override. Defaults to title.' },
]

export const tokens = [
  { token: '--bg-primary', resolves: 'Background/primary', usage: 'dialog surface' },
  { token: '--bg-secondary', resolves: 'Background/secondary', usage: 'header background' },
  { token: '--border-subtle', resolves: 'Border/subtle', usage: 'header / footer divider lines' },
  { token: '--text-primary', resolves: 'Text/primary', usage: 'title text' },
  { token: '--text-secondary', resolves: 'Text/secondary', usage: 'subtitle text' },
  { token: '--radius-lg', resolves: 'Radius/lg', usage: 'dialog corner radius' },
  { token: '--shadow-lg', resolves: 'Shadow/lg', usage: 'dialog elevation' },
  { token: '--spacing-5', resolves: '20px', usage: 'header / footer padding' },
]

export default function ModalLargeDemo() {
  const [open, setOpen] = useState(false)
  const [withSubtitle, setWithSubtitle] = useState(true)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Full-screen overlay shell for large workflow dialogs. Provides a branded header (title + optional
        subtitle + close X), a scrollable content slot, and a footer action row. ESC and overlay-click
        both dismiss. Content and footer are consumer-supplied via props.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive — open / close</h4>
        <div className="ds-demo-row">
          <div className="ds-demo-col">
            <button
              type="button"
              onClick={() => { setWithSubtitle(true); setOpen(true) }}
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
              Open ModalLarge (with subtitle)
            </button>
            <span className="ds-demo-label">showSubtitle = true</span>
          </div>
          <div className="ds-demo-col">
            <button
              type="button"
              onClick={() => { setWithSubtitle(false); setOpen(true) }}
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
              Open ModalLarge (title only)
            </button>
            <span className="ds-demo-label">showSubtitle = false</span>
          </div>
        </div>
      </div>

      {open && (
        <ModalLarge
          title="Shipment Details"
          subtitle="PRO #1234567890 · Created Jun 9 2026"
          showSubtitle={withSubtitle}
          onClose={() => setOpen(false)}
          footer={
            <div style={{ display: 'flex', gap: 'var(--spacing-3)', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setOpen(false)}>Confirm</Button>
            </div>
          }
        >
          <div style={{ padding: 'var(--spacing-4)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-md)' }}>
            <p style={{ margin: '0 0 var(--spacing-3)' }}>
              This is the content slot. In production, it holds the real form, table, or detail view
              for the workflow the modal represents. It scrolls independently so the header and footer
              remain anchored while the user reviews long content.
            </p>
            <p style={{ margin: 0 }}>
              Close this modal by clicking the X button, clicking outside the dialog,
              or pressing <kbd style={{ fontFamily: 'monospace', background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 'var(--radius-sm)' }}>Esc</kbd>.
            </p>
          </div>
        </ModalLarge>
      )}
    </div>
  )
}
