import React from 'react'

/**
 * Spinner — loading indicator for any async wait (e.g. GlobalSearch
 * quick-results loading). Figma: Design System - MCP → Components-Atoms →
 * Spinner (48px master; DSN/50 → DSN/700 angular-gradient sweep on a ring).
 *
 * Pure CSS: a conic-gradient ring masked to the stroke, rotating 900ms
 * linear infinite (linear is correct for continuous rotation — easing would
 * make the sweep pulse). Ring thickness scales with size (Figma ratio 8/48).
 */
export default function Spinner({ size = 48, className = '', ...rest }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`spinner ${className}`.trim()}
      style={{ width: size, height: size, '--spinner-stroke': `${Math.max(2, Math.round(size / 6))}px` }}
      {...rest}
    />
  )
}
