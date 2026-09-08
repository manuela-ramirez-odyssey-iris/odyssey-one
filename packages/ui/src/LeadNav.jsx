import { Menu } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import OdysseyLogo from './OdysseyLogo.jsx'

/**
 * LeadNav — molecule. The navbar's lead edge: a hamburger toggle plus the
 * product logo.
 *
 * `active` is the toggle's ON state — the Sidebar rail is expanded. It is a
 * persistent state, not a press, so it lives in Figma as `Menu state=Off|On`
 * (icon DSN/500 → Carolina Blue/400). Hover is code-only and lightens the OFF
 * icon to DSN/300; while ON the icon keeps Carolina Blue/400, since there is no
 * Carolina Blue/300 primitive and dimming the only active signal on hover would
 * read as switching it off.
 *
 * `showMenu={false}` drops the button entirely, for chrome with no rail to
 * toggle (the focused full-page flows).
 *
 * Figma master: `LeadNav` set `5902:1145` (Components-Molecules).
 */
export default function LeadNav({
  logo = <OdysseyLogo />,
  onMenuClick,
  showMenu = true,
  active = false,
}) {
  return (
    <div
      className="flex items-center shrink-0"
      style={{ gap: 'var(--spacing-4)' }}
    >
      {showMenu && (
        <button
          type="button"
          onClick={onMenuClick}
          className="lead-nav__menu"
          data-active={active || undefined}
          aria-label="Open menu"
          aria-pressed={active}
        >
          <Menu {...ICON_LG} />
        </button>
      )}
      {logo}
    </div>
  )
}
