/**
 * StopBadge — stop-marker pill with a status circle overlay (STAGING, S80).
 * Figma "NewBadge" (Timeline staging frames 4274:15599/4273:15227; plain
 * frames, componentization pending) — renamed StopBadge for the library.
 *
 * Pill: 32×20 min, radius-full, 12/16 medium label (P1/D2…).
 * Status drives pill + circle-badge colors and the circle's glyph:
 *   completed → Caribbean Green/600 pill, circle = green disc + white check
 *   issue     → Bittersweet/600 pill,     circle = red disc + white "!"
 *   pending   → white pill, 1.5px DSN/400 border + DSN/400 label; NO circle
 *               (not reached yet — matches the Figma Pending variant)
 * `showStatusBadge={false}` force-hides the circle on completed/issue.
 *
 * The circle glyphs are bespoke 10px micro-SVGs traced from the Figma
 * vectors (check 4.4×3 / "!", both 1.25 stroke) — lucide masters are 24-grid
 * and degrade at this size. Status is also exposed to AT via aria-label.
 */
const STATUS_LABEL = {
  completed: 'completed',
  issue: 'issue reported',
  pending: 'pending',
}

function MiniCheck() {
  return (
    <svg width="5" height="4" viewBox="0 0 5 4" fill="none" aria-hidden="true">
      <path d="M0.7 2.1L1.8 3.2L4.3 0.8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MiniExclamation() {
  return (
    <svg width="6" height="6" viewBox="0 0 6 6" fill="none" aria-hidden="true">
      <path d="M3 0.75V3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M3 5.1V5.15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export default function StopBadge({ label, status = 'completed', showStatusBadge, className = '', ...rest }) {
  const showCircle = status !== 'pending' && (showStatusBadge ?? true)
  return (
    <span
      className={`stop-badge stop-badge--${status}${className ? ` ${className}` : ''}`}
      aria-label={`${label} — ${STATUS_LABEL[status] || status}`}
      {...rest}
    >
      <span className="stop-badge__label" aria-hidden="true">{label}</span>
      {showCircle && (
        <span className="stop-badge__status" aria-hidden="true">
          {status === 'issue' ? <MiniExclamation /> : <MiniCheck />}
        </span>
      )}
    </span>
  )
}
