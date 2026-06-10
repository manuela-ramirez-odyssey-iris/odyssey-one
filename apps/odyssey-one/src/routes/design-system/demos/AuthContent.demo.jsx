import { useState } from 'react'
import { AuthContent } from '@odyssey/ui'

export const meta = {
  name: 'AuthContent',
  tier: 'organism',
  figmaNode: '2264:712',
  codeConnect: 'packages/ui/src/AuthContent.figma.tsx',
}

export const props = [
  { name: 'variant', type: 'login', desc: 'Content variant. Only "login" exists today; future variants include mfa-setup, password-setup, etc.' },
  { name: 'onLogin', type: '({ email, password }) => void', desc: 'Submit handler for the login form. Receives current email + password values.' },
  { name: 'onForgotPassword', type: '() => void', desc: 'Click handler for "Forgot password?" link.' },
  { name: 'onCreateAccount', type: '() => void', desc: 'Click handler for "Create an account." link.' },
]

export const tokens = [
  { token: '--text-primary', resolves: 'Text/primary', usage: 'form field labels' },
  { token: '--text-secondary', resolves: 'Text/secondary', usage: 'account prompt text' },
  { token: '--text-link', resolves: 'Carolina Blue/500', usage: '"Create an account." link color' },
  { token: '--text-success', resolves: 'Success/600', usage: 'valid-state check icon color on prefilled fields' },
  { token: '--spacing-4', resolves: '16px', usage: 'gap between form fields' },
  { token: '--spacing-5', resolves: '20px', usage: 'form / content area padding' },
  { token: '--font-size-sm', resolves: '14px', usage: 'forgot-password + account link text' },
]

export default function AuthContentDemo() {
  const [lastAction, setLastAction] = useState(null)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Login form body for the <code>AuthModal</code> shell. Owns email + password state internally.
        Prototype fields are prefilled and disabled so reviewers can click "Log In" without real auth
        wiring. Consumer receives submit/link events via callbacks. Future variants (MFA setup,
        password setup) extend the same <code>variant</code> axis.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">variant = login — inline (constrained container)</h4>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: 400,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}
          >
            <AuthContent
              variant="login"
              onLogin={({ email }) => setLastAction(`onLogin — ${email}`)}
              onForgotPassword={() => setLastAction('onForgotPassword')}
              onCreateAccount={() => setLastAction('onCreateAccount')}
            />
          </div>
        </div>
        {lastAction && (
          <div
            style={{
              marginTop: 'var(--spacing-3)',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <span
              className="ds-demo-label"
              style={{ color: 'var(--text-secondary)', textTransform: 'none', letterSpacing: 'normal', fontWeight: 'var(--font-weight-regular)' }}
            >
              Last callback: <code style={{ fontFamily: 'monospace', fontSize: '0.9em', background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 'var(--radius-sm)' }}>{lastAction}</code>
            </span>
          </div>
        )}
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">As composed inside AuthModal shell</h4>
        <p style={{ margin: '0 0 var(--spacing-3)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          See the <strong>AuthModal</strong> demo above for the full shell + backdrop composition.
          AuthContent is always used as a child of AuthModal in production.
        </p>
      </div>
    </div>
  )
}
