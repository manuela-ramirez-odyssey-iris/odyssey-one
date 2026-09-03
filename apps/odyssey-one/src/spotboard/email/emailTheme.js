// apps/odyssey-one/src/spotboard/email/emailTheme.js
// Email-safe theme. Outlook (Word engine) cannot resolve CSS variables, so
// the token VALUES are baked here. Each line names the token it mirrors —
// when tokens.css changes, update the hex and keep the comment.
// ponytail: hand-copied; generate from tokens.css if this grows past a dozen.

// Real emails need an absolute URL; a local preview should show the local
// asset instead of a not-yet-deployed stage path. Single home for this
// ternary — emailContext.js re-exports it for its existing consumers.
export const APP_ORIGIN = typeof window !== 'undefined' && window.location?.origin
  ? window.location.origin
  : 'https://odyssey-one-stage.vercel.app'

export const THEME = {
  font: 'Arial, Helvetica, sans-serif',
  width: 600,
  logoUrl: `${APP_ORIGIN}/email/odyssey-one-logo.png`,
  logoAlt: 'Odyssey One',
  color: {
    headerBg: '#1B2537',   // --bg-inverse (deep-sea-neutral-900)
    text: '#1B2537',       // --text-primary
    textSecondary: '#384253', // --text-secondary
    textTertiary: '#6B7280',  // --text-tertiary
    pageBg: '#F7F8FA',     // --bg-secondary
    cardBg: '#FFFFFF',     // --bg-primary
    border: '#E4E6EB',     // --border-subtle
    link: '#276DA2',       // --text-link (carolina-blue-600)
    accent: '#5BA4D4',     // carolina-blue-400 (logo "ONE")
    ctaBg: '#1B2537',      // --btn-primary-bg (--bg-inverse) — primary button dark fill
    ctaText: '#FFFFFF',    // --btn-primary-text (--text-inverse)
    warningBg: '#FFFBEB',  // --bg-warning
    warningText: '#B46E05', // --text-warning
    errorBg: '#FDE5E3',    // --bg-error
    errorText: '#D23930',  // --text-error
    successBg: '#D4F3EB',  // --bg-success
    successText: '#237E70', // --text-success
  },
}
