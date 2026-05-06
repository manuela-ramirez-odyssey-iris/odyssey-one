/**
 * Navbar — organism. Layout shell for the top navigation bar.
 *
 * Composes three slots: `lead` (LeadNav), `search` (GlobalSearch), `trail` (TrailNav).
 * Mirrors Figma exactly — `justify-between` distributes the three sections; each slot
 * sits at its natural width.
 *
 * `searchRef` and `trailRef` attach to the wrapper divs around their slots — useful for
 * click-outside detection on dropdowns the consumer renders as siblings of GlobalSearch / TrailNav.
 */
export default function Navbar({ lead, search, searchRef, trail, trailRef }) {
  return (
    <header
      className="flex items-center justify-between shrink-0 relative z-50"
      style={{
        background: 'var(--navbar-bg)',
        padding: '14px var(--spacing-6) 14px var(--spacing-4)',
      }}
    >
      <div className="shrink-0">{lead}</div>
      <div ref={searchRef} className="relative shrink-0">
        {search}
      </div>
      <div ref={trailRef} className="relative shrink-0">
        {trail}
      </div>
    </header>
  )
}
