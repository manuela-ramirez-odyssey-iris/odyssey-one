import { useState } from 'react'
import { Info, CircleCheck, TriangleAlert, OctagonX, X, ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react'
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
 *
 * Error-validation anatomy (Figma State=Error Validation, Layout Default/
 * Expanded/Sticky — 4603:795 / 4601:744 / 4604:5427). Activated by a non-empty
 * `errors` array ([{ field, reason, resolved? }]); replaces message/link/close.
 * Resolution lives on the errors: a `resolved: true` entry drops out of the
 * header count and the expanded rows; docked mode shows
 * "resolved out of total errors resolved". `onErrorNav` indices always refer
 * to the ORIGINAL `errors` array.
 * - Header: "N Errors: Validation Required" (+ ` - contextText`, e.g.
 *   "ORD-D78120458 · Integrated from ACME"), "Validate Errors →" ButtonLink
 *   (fires `onErrorNav(errorIndex)`), chevron collapses/expands the list.
 * - Expanded list: one row per error — field (left) + underlined reason
 *   (right), both Text/error; row click → `onErrorNav(i)` (consumer scrolls
 *   to the field).
 * - `docked` (the sticky morph — consumer toggles it on scroll and owns the
 *   position:sticky placement): full-width squared bar, header becomes
 *   "resolvedCount out of N errors resolved", link becomes "← Error i/N →" —
 *   arrows fire `onErrorNav(errorIndex ± 1)`. No expand while docked.
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
  errors = [],
  contextText,
  expanded,
  defaultExpanded = false,
  onToggle,
  docked = false,
  errorIndex = 0,
  onErrorNav,
  className = '',
  ...rest
}) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  const isExpanded = expanded !== undefined ? expanded : internalExpanded
  const validation = errors.length > 0

  const handleToggle = () => {
    const next = !isExpanded
    if (expanded === undefined) setInternalExpanded(next)
    if (onToggle) onToggle(next)
  }

  if (validation) {
    // Resolution is per-error: resolved entries leave the count + the list.
    const open = errors
      .map((e, i) => ({ ...e, index: i }))
      .filter((e) => !e.resolved)
    const n = open.length
    const total = errors.length
    const resolved = total - n
    // All resolved → the banner flips to the success surface + check icon
    // (mock 6146:22632) — component-owned, consumers don't override.
    const allResolved = n === 0 && total > 0
    const classes = ['alert', 'alert--error', 'alert--validation', allResolved ? 'alert--resolved' : '', docked ? 'alert--docked' : '', className]
      .filter(Boolean).join(' ')
    return (
      // role=status: this banner is long-lived and its text updates on every
      // resolution — assertive role=alert would re-announce constantly.
      <div className={classes} role="status" {...rest}>
        <div className="alert__body alert__body--validation">
          <span className="alert__icon">
            {allResolved ? <CircleCheck {...ICON_LG} /> : <OctagonX {...ICON_LG} />}
          </span>
          <div className="alert__validation-main">
            {/* Whole header toggles the list (not just the chevron); inner
                actions stopPropagation. Docked has no list to toggle. */}
            <div
              className="alert__validation-header"
              onClick={docked ? undefined : handleToggle}
            >
              {docked ? (
                <span className="alert__message text-label-sm-medium">
                  {resolved} out of {total} errors resolved
                </span>
              ) : (
                <span className="alert__message text-label-sm-regular">
                  <span className="text-label-sm-medium">{n} {n === 1 ? 'Error' : 'Errors'}: Validation Required</span>
                  {contextText && <> - {contextText}</>}
                </span>
              )}
              <span className="alert__validation-actions">
                {docked ? (() => {
                  // Step over OPEN errors only; errorIndex + emitted indices
                  // stay in original-array terms. No open error at or after
                  // errorIndex (the current one just got resolved) = we're at
                  // the end, not the start — clamp there so Next greys out, not
                  // Prev. n === 0 renders the disabled 0/0 bar.
                  const found = open.findIndex((e) => e.index >= errorIndex)
                  const pos = found === -1 ? n - 1 : found
                  return (
                    <span className="alert__error-nav">
                      <button
                        type="button"
                        className="alert__nav-arrow"
                        aria-label="Previous error"
                        disabled={pos <= 0}
                        onClick={() => onErrorNav?.(open[pos - 1].index)}
                      >
                        <ArrowLeft {...ICON_MD} />
                      </button>
                      <span className="text-label-sm-medium alert__nav-label">Error {Math.min(pos + 1, n)}/{n}</span>
                      <button
                        type="button"
                        className="alert__nav-arrow"
                        aria-label="Next error"
                        disabled={pos >= n - 1}
                        onClick={() => onErrorNav?.(open[pos + 1].index)}
                      >
                        <ArrowRight {...ICON_MD} />
                      </button>
                    </span>
                  )
                })() : (
                  <>
                    <Button
                      variant="link"
                      className="alert__link btn--link-black"
                      iconRight={<ArrowRight {...ICON_MD} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        // jump to the FIRST open error — the consumer scrolls
                        // there and typically flips to docked at the same time
                        onErrorNav?.(open[0]?.index ?? 0)
                      }}
                    >
                      Validate Errors
                    </Button>
                    <button
                      type="button"
                      className="alert__chevron"
                      aria-label={isExpanded ? 'Collapse error list' : 'Expand error list'}
                      aria-expanded={isExpanded}
                      onClick={(e) => { e.stopPropagation(); handleToggle() }}
                    >
                      <ChevronDown {...ICON_MD} className="alert__chevron-icon" />
                    </button>
                  </>
                )}
              </span>
            </div>
            {!docked && n > 0 && (
              <div
                className={`alert__reveal${isExpanded ? ' alert__reveal--open' : ''}`}
                aria-hidden={!isExpanded}
                inert={!isExpanded}
              >
                <div className="alert__reveal-inner">
                  <ul className="alert__error-list">
                    {open.map((e) => (
                      <li key={e.index} className="alert__error-row">
                        <span className="text-label-sm-medium">{e.field}</span>
                        <button type="button" className="alert__error-reason text-label-sm-medium" onClick={() => onErrorNav?.(e.index)}>
                          {e.reason}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

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
