import OdysseyLogo from './OdysseyLogo.jsx'

/**
 * AuthModal — organism. Pre-auth screen card. Shell for Login, MFA setup,
 * password setup, and any other unauthenticated view. White card with the
 * OdysseyLogo (dark variant) baked into the header so every auth view
 * inherits the brand mark.
 *
 * The consumer is responsible for the surrounding layout (positioning,
 * backdrop, etc.) — typically wraps in AppShell + a page-level container
 * with the bg.webp asset behind it so the visual continues into Home.
 *
 * Figma master: `AuthModal` component (2244:1373) on Components-Organisms.
 *
 * Props:
 *   children — content composed below the logo header
 *   className — extra classes on the .auth-modal element
 */
export default function AuthModal({ children, className = '' }) {
  const cls = ['auth-modal', className].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      <header className="auth-modal__header">
        <OdysseyLogo variant="dark" width={229} height={32} />
      </header>
      {children}
    </div>
  )
}
