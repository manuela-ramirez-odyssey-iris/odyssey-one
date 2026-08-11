import React from 'react'

/**
 * CenteredMessage — app-local primitive. Centered icon + message + optional
 * subordinate detail + optional action, in a column.
 *
 * Shared STRUCTURE for EmptyState ("nothing here yet") and ErrorState
 * ("something broke") — those two differ in INTENT, not shape, so per this
 * project's rule (merge on shared intent, share a primitive on shared
 * structure) they stay separate consumer-facing components sitting on one
 * primitive rather than becoming variants of each other.
 *
 * INTERIM (2026-08-10, user ruling): app-local under src/components/common/,
 * not @odyssey/ui. @odyssey/ui is reserved for components that have been
 * through /normalize (Figma-first). EmptyState (packages/ui/src/EmptyState.jsx)
 * is already normalized and is deliberately NOT refactored onto this
 * primitive now — that would demote it to NORMALIZING in both DSMs and force
 * a version bump + Angular port for zero visual change. EmptyState moves onto
 * this shape later, during its own /normalize pass, alongside ErrorState —
 * one demotion, one port, together.
 */
export default function CenteredMessage({
  icon,
  message,
  detail,
  action,
  className = '',
  ...rest
}) {
  return (
    <div className={`centered-message ${className}`.trim()} {...rest}>
      {icon && <span className="centered-message__icon" aria-hidden="true">{icon}</span>}
      {message && <span className="centered-message__message">{message}</span>}
      {detail && <span className="centered-message__detail">{detail}</span>}
      {action && <span className="centered-message__action">{action}</span>}
    </div>
  )
}
