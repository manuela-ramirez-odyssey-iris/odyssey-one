/**
 * Navbar — organism. Layout shell for the top navigation bar.
 *
 * `compact` shaves 2px off each vertical padding (14 → 12) so the navbar stays
 * the same total height when the trail slot grows (e.g. editor-mode buttons at
 * size lg are 40h vs profile mode's 32h).
 */
export default function Navbar({ lead, search, trail, trailRef, compact = false }) {
  const vPad = compact ? '12px' : '14px'
  return (
    <header
      className="flex items-center justify-between shrink-0 relative z-50"
      style={{
        background: 'var(--navbar-bg)',
        padding: `${vPad} var(--spacing-6) ${vPad} var(--spacing-4)`,
      }}
    >
      <div className="shrink-0">{lead}</div>
      <div className="shrink-0">{search}</div>
      <div ref={trailRef} className="relative shrink-0">
        {trail}
      </div>
    </header>
  )
}
