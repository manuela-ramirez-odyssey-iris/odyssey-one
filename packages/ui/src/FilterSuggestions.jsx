import Badge from './Badge'

/**
 * FilterSuggestions — dropdown panel that surfaces selectable filter chips for
 * the GlobalSearch bar as the user types. White panel (shadow/2xl) holding a
 * fixed title + a vertical column of gray Badge chips. Each chip is selectable.
 *
 * Figma: `FilterSuggestions` (node 2400:2). Chips are real `Badge variant="gray"`
 * instances. Title uses the `label/sm medium` style at `--text-tertiary`.
 *
 * `items` accepts strings or `{ label, value }` objects. `onSelect` receives the
 * original item. When `onSelect` is omitted the chips render decoratively (no
 * pointer / hover affordance).
 *
 * Width-agnostic: the panel hugs its content (Figma width-hug). The chip list is
 * capped at MAX_VISIBLE_CHIPS rows — beyond that it scrolls vertically instead
 * of overflowing the viewport; the title stays pinned above the scroll area.
 */
const MAX_VISIBLE_CHIPS = 9

export default function FilterSuggestions({
  title = 'Suggested Filters',
  items = [],
  onSelect,
  className = '',
  style,
  ...rest
}) {
  return (
    <div
      className={`filter-suggestions ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 'var(--spacing-4)',
        padding: 'var(--spacing-4)',
        background: 'var(--bg-primary)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-2xl)',
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      {title && (
        <span
          className="text-label-sm-medium"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {title}
        </span>
      )}
      <div
        className="filter-suggestions__list"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 'var(--spacing-4)',
          // Cap at MAX_VISIBLE_CHIPS rows (chip = 20px tall, gap = --spacing-4);
          // beyond that the list scrolls instead of overflowing the window.
          maxHeight: `calc(20px * ${MAX_VISIBLE_CHIPS} + var(--spacing-4) * ${MAX_VISIBLE_CHIPS - 1})`,
          overflowY: 'auto',
        }}
      >
        {items.map((raw, i) => {
          const label = typeof raw === 'string' ? raw : raw.label
          if (onSelect) {
            return (
              <button
                key={i}
                type="button"
                className="filter-suggestions__chip"
                onClick={() => onSelect(raw)}
              >
                <Badge variant="gray">{label}</Badge>
              </button>
            )
          }
          return (
            <span key={i} className="filter-suggestions__chip">
              <Badge variant="gray">{label}</Badge>
            </span>
          )
        })}
      </div>
    </div>
  )
}
