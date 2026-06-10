import React from 'react'

/**
 * Button — atom (6 variants × 3 sizes, plus disabled).
 *
 * Variants and where to use them:
 * - `primary`   — main CTA. Dark fill, works on light surfaces.
 * - `secondary` — neutral action. **Best on light surfaces.** For dark surfaces, prefer `outline`.
 * - `outline`   — designed for dark surfaces. White text + transparent fill at idle, white@10/20%
 *                tint overlays on hover/pressed. Pair with DSN/700+ surfaces.
 * - `ghost`     — like outline but no border at idle. Quiet action on dark surfaces.
 * - `error`     — soft destructive action on light surfaces. Light-red fill (Bittersweet/100) + red
 *                text (Bittersweet/600); hover/pressed deepen via the Bittersweet ladder.
 * - `link`      — text-only affordance (no bg, no border, no shadow). Carolina-blue text. Used for
 *                "Go to X" jump links and similar tertiary actions on light surfaces.
 * - `icon`      — icon-only button (sm), Secondary visual treatment. Pass `icon` and no children;
 *                the icon adopts Secondary's text color per state via currentColor. Requires `aria-label`.
 *
 * Hover/active are CSS-driven via `:hover` / `:active`. Only `disabled` is exposed as a prop.
 *
 * Slots:
 * - `icon`      — leading-side icon (most common position).
 * - `iconRight` — trailing-side icon. Common with `variant="link"` (e.g. "Go to Tracking →").
 * Both can be set simultaneously if needed.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
  iconRight,
  className = '',
  type = 'button',
  ...props
}) {
  // The `link` variant is always label/sm medium (14/20) — Figma's ButtonLink set
  // (1895:7) has no size axis. So link ignores `size` for typography; other variants
  // map sm → 14/20, md+lg → 16/24.
  const textClass =
    variant === 'link' || size === 'sm'
      ? 'text-label-sm-medium'
      : 'text-label-base-medium'

  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    icon && 'btn--has-icon',
    iconRight && 'btn--has-icon-right',
    textClass,
    className,
  ].filter(Boolean).join(' ')

  return (
    <button type={type} className={classes} disabled={disabled} {...props}>
      {icon && <span className="btn__icon">{icon}</span>}
      {children}
      {iconRight && <span className="btn__icon btn__icon--right">{iconRight}</span>}
    </button>
  )
}
