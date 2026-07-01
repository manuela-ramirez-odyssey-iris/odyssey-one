/**
 * PageHeader — molecule. Top-of-route H1 with a flex shell that fills the container.
 *
 * Two trailing modes (Figma `Type` variant, mutually exclusive):
 *  - **Default** — an actions cluster (flex, 16px gap): pass actions as `children`
 *    (ButtonToggle, Button variant="link", Button, …). The Show toggle / Show link /
 *    Show button BOOLEANs map to children presence: passing or omitting an action IS the toggle.
 *  - **Last update** — a supporting-text label (`supportingText`, e.g. "Last update: …"),
 *    label/sm regular · text-tertiary · right-aligned — same style as SectionHeader.
 *
 * The modes are exclusive: when `supportingText` is set it renders and the actions never
 * render (mirrors the Figma variant — you can't get both).
 */
export default function PageHeader({ title, supportingText, children, className = '', style, ...rest }) {
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
      {supportingText != null ? (
        <span className="page-header__supporting text-label-sm-regular">{supportingText}</span>
      ) : (
        children != null && (
          <div
            className="page-header__actions"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}
          >
            {children}
          </div>
        )
      )}
    </header>
  )
}
