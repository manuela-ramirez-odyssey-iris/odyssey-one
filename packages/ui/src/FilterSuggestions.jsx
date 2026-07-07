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
 *
 * Combobox wiring (S80, optional): when the parent (GlobalSearch) drives
 * keyboard navigation via aria-activedescendant, it passes `optionId(i)` and
 * `activeIndex`. The panel then renders as a listbox `group` — chips become
 * `role="option"` with ids, `aria-selected`, and an `.is-active` highlight that
 * mirrors the hover styling. Omit both props for the standalone behavior.
 */
const MAX_VISIBLE_CHIPS = 9

export default function FilterSuggestions({
  title = 'Suggested Filters',
  items = [],
  onSelect,
  optionId,
  activeIndex = -1,
  className = '',
  style,
  ...rest
}) {
  const combobox = typeof optionId === 'function'
  return (
    <div
      className={`filter-suggestions ${className}`.trim()}
      {...(combobox && { role: 'group', 'aria-label': title || undefined })}
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
          {...(combobox && { 'aria-hidden': true })}
        >
          {title}
        </span>
      )}
      <div
        className="filter-suggestions__list"
        {...(combobox && { role: 'presentation' })}
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
          const isActive = combobox && i === activeIndex
          if (onSelect) {
            return (
              <button
                key={i}
                type="button"
                className={`filter-suggestions__chip badge-interactive${isActive ? ' is-active' : ''}`}
                onClick={() => onSelect(raw)}
                // Keyboard highlight (aria-activedescendant target) — the chip
                // never takes DOM focus; the input keeps it.
                {...(combobox && {
                  id: optionId(i),
                  role: 'option',
                  'aria-selected': i === activeIndex,
                  tabIndex: -1,
                })}
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
