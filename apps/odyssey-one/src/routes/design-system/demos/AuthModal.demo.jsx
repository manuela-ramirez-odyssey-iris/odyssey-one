import { useState } from 'react'
import { AuthModal, AuthContent } from '@odyssey/ui'

export const meta = {
  name: 'AuthModal',
  tier: 'organism',
  figmaNode: '2244:1373',
  codeConnect: 'packages/ui/src/AuthModal.figma.tsx',
}

export const props = [
  { name: 'children', type: 'ReactNode', desc: 'Content composed below the OdysseyLogo header — typically an AuthContent instance.' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the .auth-modal element.' },
]

export const tokens = [
  { token: '--bg-primary', resolves: 'Background/primary', usage: 'card surface' },
  { token: '--border-subtle', resolves: 'Border/subtle', usage: 'card border / header divider' },
  { token: '--radius-lg', resolves: 'Radius/lg', usage: 'card corner radius' },
  { token: '--shadow-lg', resolves: 'Shadow/lg', usage: 'card elevation (sits over a bg.webp backdrop)' },
  { token: '--spacing-6', resolves: '24px', usage: 'header padding' },
  { token: '--spacing-5', resolves: '20px', usage: 'content area padding' },
]

export default function AuthModalDemo() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Pre-auth screen card shell. The <code>OdysseyLogo</code> (dark variant) is baked into the header
        so every auth view inherits the brand mark without re-declaring it. The consumer is responsible
        for positioning and the <code>bg.webp</code> backdrop — this component renders only the white card.
        Content (login form, MFA, etc.) is supplied via <code>children</code>, typically an{' '}
        <code>AuthContent</code> instance.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive — open / close</h4>
        <div className="ds-demo-row">
          <button
            type="button"
            onClick={() => setOpen(true)}
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
            Open AuthModal
          </button>
        </div>
      </div>

      {open && (
        // Full-page backdrop to mimic the real auth page context
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'var(--bg-inverse)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setOpen(false)}
        >
          {/* stopPropagation so clicking inside the card doesn't close */}
          <div onClick={(e) => e.stopPropagation()}>
            <AuthModal>
              <AuthContent
                variant="login"
                onLogin={() => setOpen(false)}
                onForgotPassword={() => {}}
                onCreateAccount={() => {}}
              />
            </AuthModal>
          </div>
        </div>
      )}

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Card anatomy (inline, no backdrop)</h4>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <AuthModal>
            <div
              style={{
                padding: 'var(--spacing-5)',
                color: 'var(--text-secondary)',
                fontSize: 'var(--font-size-sm)',
                width: 340,
              }}
            >
              Consumer-supplied children slot. In production this renders{' '}
              <code>AuthContent variant="login"</code> (or a future MFA / password-setup variant).
            </div>
          </AuthModal>
        </div>
      </div>
    </div>
  )
}
