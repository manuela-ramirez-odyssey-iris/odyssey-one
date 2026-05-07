/**
 * IconButton — atom. 24×24 circular surface with shadow-base, holds a single icon.
 *
 * The icon is passed via the `icon` prop and inherits the button's text color via
 * `currentColor` (Lucide React icons default to `stroke="currentColor"`). To override
 * the color, set `color` on the button or wrap the icon with explicit color.
 */
export default function IconButton({ icon, onClick, ariaLabel, className = '', ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`icon-button ${className}`.trim()}
      style={{
        width: 24,
        height: 24,
        padding: 'var(--spacing-1)',
        borderRadius: 'var(--radius-full)',
        background: 'var(--white)',
        border: 'none',
        boxShadow: 'var(--shadow-base)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
      }}
      {...props}
    >
      {icon}
    </button>
  )
}
