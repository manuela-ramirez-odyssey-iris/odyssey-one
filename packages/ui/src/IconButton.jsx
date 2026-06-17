/**
 * IconButton — atom. 24×24 circular surface with shadow-base, holds a single icon.
 *
 * @deprecated Slated for removal — sole consumer is EntityChip (also deprecating).
 *
 * Polymorphic: renders as `<button>` when an `onClick` handler is provided,
 * otherwise as `<span>` (purely decorative). Avoids invalid nested-button
 * markup when used inside another interactive component (e.g. EntityChip).
 *
 * The icon inherits the surface's text color via `currentColor` (Lucide React
 * icons default to `stroke="currentColor"`). Override by setting `color` on
 * the IconButton or wrapping the icon with explicit color.
 */
export default function IconButton({ icon, onClick, ariaLabel, className = '', ...props }) {
  const isInteractive = typeof onClick === 'function'
  const Tag = isInteractive ? 'button' : 'span'
  const classes = [
    'icon-button',
    isInteractive && 'icon-button--interactive',
    className,
  ].filter(Boolean).join(' ')

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
