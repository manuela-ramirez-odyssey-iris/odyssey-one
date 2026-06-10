import { Info, CircleCheck, TriangleAlert, OctagonX, X, ArrowRight } from 'lucide-react'
import { ICON_LG, ICON_MD } from '@odyssey/tokens'
import Button from './Button.jsx'

/**
 * Alert — molecule. Inline status/message banner with 4 variants.
 *
 * Variants (drive the tinted /200 background; text + icon are uniformly DSN/900):
 * - `info`    — Carolina Blue/200, lucide/info
 * - `success` — Caribbean Green/200, lucide/circle-check
 * - `warning` — Sunrise Yellow/200, lucide/triangle-alert
 * - `error`   — Bittersweet/200, lucide/octagon-x
 *
 * Optional slots:
 * - `showLink` (+ `linkLabel`/`onLinkClick`) — a trailing ButtonLink ("Click here →").
 *   Rendered with the Black ButtonLink tone (`.btn--link-black`): underlined, neutral
 *   ladder DSN/900 → DSN/500 (hover) → DSN/950 (press), not the default carolina-blue link.
 * - `showClose` (default true, + `onClose`) — trailing X dismiss button.
 */
const ICONS = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: OctagonX,
}

export default function Alert({
  variant = 'info',
  children,
  showLink = false,
  linkLabel = 'Click here',
  onLinkClick,
  showClose = true,
  onClose,
  className = '',
  ...rest
}) {
  const Icon = ICONS[variant] || Info
  const classes = ['alert', `alert--${variant}`, className].filter(Boolean).join(' ')
  // error/warning are higher-urgency → assertive; info/success are polite.
  const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status'

  return (
    <div className={classes} role={role} {...rest}>
      <div className="alert__body">
        <span className="alert__icon">
          <Icon {...ICON_LG} />
        </span>
        <div className="alert__text">
          <span className="alert__message text-label-sm-regular">{children}</span>
          {showLink && (
            <Button
              variant="link"
              className="alert__link btn--link-black"
              iconRight={<ArrowRight {...ICON_MD} />}
              onClick={onLinkClick}
            >
              {linkLabel}
            </Button>
          )}
        </div>
      </div>
      {showClose && (
        <button type="button" className="alert__close" onClick={onClose} aria-label="Dismiss">
          <X {...ICON_LG} />
        </button>
      )}
    </div>
  )
}
