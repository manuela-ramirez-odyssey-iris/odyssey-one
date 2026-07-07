// PaneEmpty — shared empty state for the ShipmentsBar detail panes (S80 QA M2).
// Renders the standard pane chrome (.pane-canvas + centered .pane-col tier)
// with placeholder-styled copy — the pattern the Cost/Instructions panes
// established. App-local on purpose: promoting it to @odyssey/ui requires the
// /normalize cycle.
export default function PaneEmpty({ message, hint, col = 'narrow' }) {
  return (
    <div className="pane-canvas">
      <div className={`pane-col pane-col--${col}`}>
        <p style={{ margin: 0, color: 'var(--text-placeholder)', fontSize: 'var(--font-size-sm)' }}>
          {message}
        </p>
        {hint && (
          <p style={{ margin: 'var(--spacing-1, 4px) 0 0', color: 'var(--text-placeholder)', fontSize: 'var(--font-size-xs)' }}>
            {hint}
          </p>
        )}
      </div>
    </div>
  )
}
