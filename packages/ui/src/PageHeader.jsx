/**
 * PageHeader — molecule. Top-of-route H1 with a flex shell that fills the container.
 *
 * Used as the page identifier (e.g. "Shipments", "Orders"). The right side is an
 * actions cluster (flex, 16px gap) — pass actions as children (ButtonToggle,
 * Button variant="link", Button, …). The Figma master's Show toggle / Show link /
 * Show button BOOLEANs map to children presence in code: passing or omitting an
 * action IS the toggle.
 */
export default function PageHeader({ title, children, className = '', style, ...rest }) {
  return (
    <header
      className={`page-header ${className}`.trim()}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        ...style,
      }}
      {...rest}
    >
      <h1
        className="page-header__title text-display-3xl-semibold"
        style={{ margin: 0 }}
      >
        {title}
      </h1>
      {children != null && (
        <div
          className="page-header__actions"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}
        >
          {children}
        </div>
      )}
    </header>
  )
}
