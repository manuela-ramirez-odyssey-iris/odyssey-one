import Badge from './Badge.jsx'

/**
 * Tab — atom. Underline filter tab: label + optional count Badge (metric)
 * over a 2px underline that fills DSN/500 when current. Used as filter rows
 * across Odyssey-One (e.g. All / Saved / Canceled / Interface Failures);
 * group tabs in a `.tab-group` row (24px gap). Hover is CSS-driven; only
 * `current` is a prop, per the control state model.
 *
 * Figma master: `Tab` set 3057:362 on Components-Atoms — OUR master:
 * `Current` VARIANT + `Label` TEXT + `Show count` BOOLEAN, nested exposed
 * Badge (metric) for the count value, everything variable-bound. Built to
 * replace the foreign Tailwind-kit Tab (remote set 2671:1212) the screens
 * referenced; selected text = DSN/900 per the canon Tabs frame (user call
 * 2026-06-11). Only the Underline style exists — Pill is our PillTab.
 */
export default function Tab({
  label,
  count,
  current = false,
  onClick,
  className = '',
  ...rest
}) {
  const classes = [
    'tab',
    'text-label-sm-medium',
    current && 'tab--current',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      className={classes}
      aria-pressed={current}
      onClick={onClick}
      {...rest}
    >
      <span className="tab__content">
        {label}
        {count != null && <Badge variant="metric">{count}</Badge>}
      </span>
      <span className="tab__underline" aria-hidden="true" />
    </button>
  )
}
