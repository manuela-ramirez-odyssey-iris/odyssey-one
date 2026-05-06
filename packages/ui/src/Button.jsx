import React from 'react'

/**
 * Button — atom (3 variants × 3 sizes, plus disabled).
 *
 * Variants and where to use them:
 * - `primary`   — main CTA. Dark fill, works on light surfaces.
 * - `secondary` — neutral action. **Best on light surfaces.** For dark surfaces, prefer `outline`.
 *                Secondary's hover/pressed states (DSN/50 / DSN/100 fills) lose contrast on dark
 *                backdrops — that's why the Outline variant exists.
 * - `outline`   — designed for dark surfaces. White text + transparent fill at idle, white@10/20%
 *                tint overlays on hover/pressed. Pair with DSN/700+ surfaces.
 *
 * Hover/active are CSS-driven via `:hover` / `:active`. Only `disabled` is exposed as a prop.
 * The optional `icon` is a left-side slot; color inherits the button text via `currentColor`.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
  className = '',
  type = 'button',
  ...props
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    icon && 'btn--has-icon',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button type={type} className={classes} disabled={disabled} {...props}>
      {icon && <span className="btn__icon">{icon}</span>}
      {children}
    </button>
  )
}
