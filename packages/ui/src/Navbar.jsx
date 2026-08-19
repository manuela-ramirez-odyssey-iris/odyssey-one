/**
 * Navbar — organism. Layout shell for the top navigation bar.
 *
 * `compact` shaves 2px off each vertical padding (14 → 12) so the navbar stays
 * the same total height when the trail slot grows (e.g. editor-mode buttons at
 * size lg are 40h vs profile mode's 32h).
 *
 * `context="external"` is Figma's `Context=External` variant (5152:3904) — a white
 * chrome purpose-built for external Odyssey landing pages, NOT a light theme twin
 * of `internal`. Left padding matches the trailing edge (both --spacing-6) instead
 * of internal's asymmetric --spacing-4.
 */
export default function Navbar({ lead, search, trail, trailRef, compact = false, context = 'internal' }) {
  const vPad = compact ? '12px' : '14px'
  const isExternal = context === 'external'
  return (
    <header
      className={`navbar flex items-center justify-between shrink-0 relative z-50${isExternal ? ' navbar--external' : ''}`}
      style={{
        background: isExternal ? 'var(--bg-primary)' : 'var(--navbar-bg)',
        padding: `${vPad} var(--spacing-6) ${vPad} ${isExternal ? 'var(--spacing-6)' : 'var(--spacing-4)'}`,
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
