/**
 * PageHeader — molecule. Top-of-route H1 with a flex shell that fills the container.
 *
 * Used as the page identifier (e.g. "Shipments", "Orders"). The right side of the flex
 * shell is reserved space — actions can be added later by passing children.
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
      {children}
    </header>
  )
}
