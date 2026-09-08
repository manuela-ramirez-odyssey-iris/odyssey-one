import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'

const CHEVRONS = { up: ChevronUp, down: ChevronDown, right: ChevronRight }

/**
 * SidebarButton — atom. The row for every level of the left rail.
 *
 * `type` carries the geometry, because that is what Figma cannot express as a
 * boolean (height, radius and padding are not bindable properties):
 *   collapsed — 40×40, radius lg, icon only. The 64px rail.
 *   domain    — 40h, radius lg, icon + label + optional count + optional chevron.
 *   submenu   — 36h, radius md, regular-weight label + optional chevron. No icon.
 *
 * `state='selected'` fills the row DSN/300 at every type. A selected domain row
 * flips its count badge DSN/300 → DSN/200 so the count stays readable against
 * the fill (user ruling, S142) — which is why the count is rendered here rather
 * than composed from `Badge`: `Badge` cannot know its row's selection state.
 *
 * `state='hover'` exists for the DSM's static state grid only; the real hover is
 * a CSS `:hover` and code never passes it.
 *
 * Figma master: `SidebarButton` set `514:2479` (Components-Atoms), Type × State.
 */
export default function SidebarButton({
  icon,
  label,
  count,
  chevron = null,
  type = 'collapsed',
  state = 'default',
  className = '',
  ...rest
}) {
  const Chevron = chevron ? CHEVRONS[chevron] : null
  const cls = ['sidebar-button', `sidebar-button--${type}`, className]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={cls}
      data-state={state === 'default' ? undefined : state}
      {...rest}
    >
      {type !== 'submenu' && icon && (
        <span className="sidebar-button__icon" aria-hidden="true">{icon}</span>
      )}
      {type !== 'collapsed' && (
        <span className="sidebar-button__label">{label}</span>
      )}
      {type === 'domain' && count != null && (
        <span className="sidebar-button__count">{count}</span>
      )}
      {Chevron && (
        <span className="sidebar-button__chevron" aria-hidden="true">
          <Chevron {...ICON_MD} />
        </span>
      )}
    </div>
  )
}
