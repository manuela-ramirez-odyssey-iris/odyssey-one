import { AuthModal, AuthContent } from '@odyssey/ui'
import './Login.css'

/**
 * Login route. App.jsx drives a phase machine:
 *   'login'   → modal visible
 *   'intro'   → modal fades out, MessageIntro image (160h) fades in at the
 *               same center spot. bg + overlay stay visible. Home is mounted
 *               behind (visibility:hidden) to preload its widgets.
 *   'exiting' → image stays visible; the whole .login-page fades out while
 *               Home becomes visible behind it. App.jsx unmounts at end.
 */
export default function Login({ onLogin, phase = 'login' }) {
  return (
    <div className={`login-page login-page--${phase}`}>
      <div className="login-page__bg" aria-hidden="true" />
      <AuthModal>
        <AuthContent variant="login" onLogin={onLogin} />
      </AuthModal>
      <img
        src="/MessageIntro.png"
        alt=""
        className="login-page__intro-image"
        aria-hidden="true"
      />
    </div>
  )
}
