import Badge from './Badge.jsx'

/**
 * PillTab — atom. A pill-shaped tab button: a label + an optional neutral count
 * Badge (`variant="metric"`), with a selected / unselected state. Used for the
 * All / Saved tabs in the GlobalSearchPanel filters body. Hover is CSS-driven; only the
 * selected state is a prop.
 *
 * Figma master: `PillTab` set 2787:330 (Components-Atoms), `Selected=True|False`.
 * Built from our primitives — Inter `label/sm medium`, our Badge `metric`, and the
 * existing `--tab-active-bg` / `--tab-active-text` / `--tab-inactive-text` tokens.
 */
export default function PillTab({
  label,
  count,
  selected = false,
  showCount = true,
  onClick,
  className = '',
  ...rest
}) {
  const classes = [
    'pill-tab',
    'text-label-sm-medium',
    selected && 'pill-tab--selected',
    className,
  ].filter(Boolean).join(' ')
  return (
    <button
      type="button"
      className={classes}
      aria-pressed={selected}
      onClick={onClick}
      {...rest}
    >
      {label}
      {showCount && count != null && <Badge variant="metric">{count}</Badge>}
    </button>
  )
}
