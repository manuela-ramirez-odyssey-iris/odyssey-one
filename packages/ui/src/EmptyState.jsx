/**
 * EmptyState — atom. Centered icon over a help message on a DSN/100 surface.
 * Use when a list, search result, or data view has no content yet.
 *
 * The icon is fully consumer-provided (defaults to nothing) — pass any Lucide
 * icon at any size; the surface is just the rounded gray container with text
 * below.
 *
 * Figma master: `EmptyState` 2159:295 on Components-Atoms (Panels artboard).
 * Icon swappable via INSTANCE_SWAP, message editable via TEXT property.
 */
export default function EmptyState({
  icon,
  message,
  className = '',
  ...rest
}) {
  return (
    <div className={`empty-state ${className}`.trim()} {...rest}>
      {icon && <span className="empty-state__icon" aria-hidden="true">{icon}</span>}
      {message && (
        <span className="text-label-xs-regular empty-state__message">{message}</span>
      )}
    </div>
  )
}
