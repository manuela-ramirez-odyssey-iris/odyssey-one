import { ChevronRight } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'

/**
 * WidgetCtaRow — molecule. Single call-to-action link row used inside Widget 3xCta.
 *
 * Anatomy: [Icon container 40×40 (CB/50 bg) + 20px icon] + label + trailing chevron.
 * Layout is HORIZONTAL with `justify-content: space-between` so the chevron sits at
 * the trail edge regardless of label length.
 *
 * Polymorphic — renders as `<button>` when `onClick` is provided, `<div>` otherwise.
 * State ladder (interactive only):
 *   row bg              white         → DSN/50    → DSN/100
 *   icon container bg   CB/50         → CB/100    → CB/100
 *   chevron color       text-soft     → primary   → placeholder (lift)
 *
 * Figma master: `WidgetCtaRow` at `1927:84` on Components-Molecules.
 */
export default function WidgetCtaRow({ icon, label, onClick, className = '', ...rest }) {
  const interactive = !!onClick
  const Comp = interactive ? 'button' : 'div'
  const cls = [
    'widget-cta-row',
    interactive && 'widget-cta-row--interactive',
    className,
  ].filter(Boolean).join(' ')
  return (
    <Comp
      {...(interactive ? { type: 'button' } : {})}
      className={cls}
      onClick={onClick}
      {...rest}
    >
      <span className="widget-cta-row__label-group">
        <span className="widget-cta-row__icon-bg">
          <span className="widget-cta-row__icon" aria-hidden="true">{icon}</span>
        </span>
        <span className="widget-cta-row__label text-label-sm-medium">{label}</span>
      </span>
      <ChevronRight {...ICON_MD} className="widget-cta-row__chevron" aria-hidden="true" />
    </Comp>
  )
}
