/**
 * SectionHeader — molecule. Two-row section header.
 *
 * Row 1: H2 title (24/32 semibold) on the left, optional supporting text (sm regular tertiary)
 * on the right — typically a "Last update" timestamp.
 *
 * Row 2: optional actions row, distributed via `justify-between`. `leadingActions` sits left,
 * `trailingActions` sits right. Both default to nothing — when both are undefined, the row is
 * not rendered at all.
 */
export default function SectionHeader({
  title,
  supportingText,
  leadingActions,
  trailingActions,
  className = '',
  style,
  ...rest
}) {
  const showActions = leadingActions != null || trailingActions != null

  return (
    <header
      className={`section-header ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-8)',
        width: '100%',
        ...style,
      }}
      {...rest}
    >
      <div className="section-header__row" style={rowStyle}>
        <h2
          className="section-header__title text-heading-2xl-semibold"
          style={{ margin: 0 }}
        >
          {title}
        </h2>
        {supportingText && (
          <span
            className="section-header__supporting text-label-sm-regular"
            style={{ whiteSpace: 'nowrap' }}
          >
            {supportingText}
          </span>
        )}
      </div>
      {showActions && (
        <div className="section-header__actions" style={rowStyle}>
          <div>{leadingActions}</div>
          <div>{trailingActions}</div>
        </div>
      )}
    </header>
  )
}

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
}
