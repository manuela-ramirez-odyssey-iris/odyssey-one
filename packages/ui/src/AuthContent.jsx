import { useState } from 'react'
import { Check } from 'lucide-react'
import FormField from './FormField.jsx'
import Button from './Button.jsx'

// Trailing icon for the prefilled Login fields — green check signals
// "valid/saved". Stays small (16px) per the FormField icon-slot convention.
const validCheckIcon = (
  <Check size={16} style={{ color: 'var(--text-success)' }} aria-hidden="true" />
)

/**
 * AuthContent — organism. Inner body of the AuthModal shell.
 *
 * Variant axis (matches Figma master 2264:712):
 *   login         — email + password fields, Log In, Forgot password, account link
 *   (future)      — mfa-setup, password-setup, etc.
 *
 * State (email + password) is owned internally. Consumer passes callbacks:
 *   onLogin({ email, password })  — submit handler for the Login form
 *   onForgotPassword              — "Forgot password?" link click
 *   onCreateAccount               — "Create an account." link click
 */
export default function AuthContent({
  variant = 'login',
  onLogin,
  onForgotPassword,
  onCreateAccount,
}) {
  // Prototype: prefilled + disabled credentials so reviewers can click "Log In"
  // without real auth wiring. State is still kept locally so the flow mirrors
  // how a real implementation would work once the backend is in place.
  const [email, setEmail] = useState('test@odyssey.com')
  const [password, setPassword] = useState('OdysseyTest!2026')

  if (variant === 'login') {
    const handleSubmit = (e) => {
      e.preventDefault()
      onLogin?.({ email, password })
    }
    return (
      <>
        <form className="auth-content__form" onSubmit={handleSubmit}>
          <FormField
            id="auth-email"
            name="email"
            label="Email Address"
            placeholder="Enter Email ID"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled
            trailingIcon={validCheckIcon}
          />
          <FormField
            id="auth-password"
            name="password"
            label="Password"
            placeholder="Enter Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled
            trailingIcon={validCheckIcon}
          />
          <Button type="submit" variant="primary" size="lg">Log In</Button>
        </form>
        <Button
          variant="link"
          size="sm"
          type="button"
          className="auth-content__forgot"
          onClick={onForgotPassword}
        >
          Forgot password?
        </Button>
        <p className="auth-content__account">
          Don&apos;t have an account yet?{' '}
          <a
            href="#"
            className="auth-content__account-link"
            onClick={(e) => { e.preventDefault(); onCreateAccount?.() }}
          >
            Create an account.
          </a>
        </p>
      </>
    )
  }

  return null
}
