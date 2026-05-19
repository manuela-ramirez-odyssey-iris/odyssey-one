/**
 * IconButtonGhost — atom. Transparent-at-rest icon-only button with hover + pressed
 * surface fills. Used for modal close, widget close, and similar small "close-or-clear"
 * actions where the button shouldn't draw attention until interacted with.
 *
 * 28×28 surface, Radius/lg, INSTANCE_SWAP icon slot (default placeholder-20 in Figma —
 * consumers always pass a real Lucide icon). State ladder mirrors the surface IconButton
 * but inverted: idle is transparent; hover fills with DSN/100; pressed fills with DSN/200.
 *
 * Polymorphic like IconButton: renders as `<button>` when `onClick` is provided,
 * `<span>` otherwise (purely decorative — keeps markup valid when nested in another
 * interactive component).
 *
 * Figma master: `IconButtonGhost` set 2138:304 on Components-Atoms.
 * State variants live in CSS (`:hover` / `:active`), not as React props.
 */
export default function IconButtonGhost({
  icon,
  onClick,
  ariaLabel,
  className = '',
  ...props
}) {
  const isInteractive = typeof onClick === 'function'
  const classes = `icon-button-ghost ${className}`.trim()

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={classes}
        {...props}
      >
        {icon}
      </button>
    )
  }

  return (
    <span className={classes} aria-hidden={ariaLabel ? undefined : true} {...props}>
      {icon}
    </span>
  )
}
