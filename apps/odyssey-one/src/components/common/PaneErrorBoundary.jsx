import { Component } from 'react'

/**
 * PaneErrorBoundary — Fix C (2026-08-10). There was no error boundary
 * anywhere in the app (`grep -rl "ErrorBoundary\|componentDidCatch" src/`
 * returned nothing) — a malformed payload or a render throw inside any
 * BottomBar tab pane took down the WHOLE React tree (bar, tab strip, grid,
 * shipment selection — everything) instead of degrading just that one pane.
 *
 * A class component with `getDerivedStateFromError` + `componentDidCatch` is
 * the correct and only way to implement this in React — there is no hooks
 * equivalent.
 *
 * RESET CONTRACT: this boundary never clears its own error state — it only
 * remounts when React sees a new `key`. The consumer (BottomBar) is
 * responsible for keying it on `${selectedShipmentId}-${activeTab}` so a pane
 * crash doesn't survive a tab switch or a shipment switch — a STICKY error
 * outliving navigation would be worse than the crash it replaces.
 *
 * Un-normalized — stays app-local per the repo's normalization policy
 * (CLAUDE.md: only `/normalize`-approved components belong in `@odyssey/ui`).
 * Fallback markup intentionally mirrors BottomBar's existing detailsError
 * branch (plain centered text) rather than inventing a new error visual — a
 * shared error visual for tabs + DataTable is separate, design-gated work.
 */
export default class PaneErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('PaneErrorBoundary caught a pane render error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 'var(--spacing-3)',
            padding: 'var(--spacing-6)', color: 'var(--text-secondary)',
          }}
        >
          <span>Something went wrong showing this tab.</span>
        </div>
      )
    }
    return this.props.children
  }
}
