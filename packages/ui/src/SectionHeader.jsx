/**
 * SectionHeader — molecule. Single-row section header.
 *
 * H2 title (24/32 semibold) on the left, optional supporting text (sm regular tertiary)
 * on the right — typically a "Last update" timestamp.
 *
 * The optional actions row (SectionAction) was removed 2026-06-17 — the frame was dropped
 * from the Figma master; SectionHeader is now title + supporting text only.
 */
export default function SectionHeader({
  title,
  supportingText,
  className = '',
  style,
  ...rest
}) {
  return (
    <header
      className={`section-header ${className}`.trim()}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        ...style,
      }}
      {...rest}
    >
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
    </header>
  )
}
