import React from 'react'
import CenteredMessage from './CenteredMessage.jsx'

/**
 * ErrorState — app-local, sibling to @odyssey/ui's EmptyState (not a variant
 * of it — see CenteredMessage's header comment for the merge-vs-share
 * reasoning). Props-driven only: no hardcoded copy in here, callers own the
 * message.
 *
 * Used today at both BottomBar.jsx's per-tab detail error and
 * ShipmentTable.jsx's grid-fetch error, so the two "something broke"
 * surfaces on the Shipments page finally render the same way.
 *
 * INTERIM (2026-08-10, user ruling): this is a stopgap, not the finished
 * design. Intended destination is @odyssey/ui (Cognizant inherits it via the
 * published @oneodyssey/ui, with an Angular twin) once it goes through
 * /normalize — pending Efrain + a Figma error state. At that point
 * @odyssey/ui's DataTable should also grow an `error` prop so the grid case
 * is owned by the library instead of being wired up app-side (ShipmentTable
 * reaching around DataTable the way it does today).
 */
export default function ErrorState({ icon, message, detail, action, className = '', ...rest }) {
  return (
    <CenteredMessage
      icon={icon}
      message={message}
      detail={detail}
      action={action}
      className={`error-state ${className}`.trim()}
      role="alert"
      {...rest}
    />
  )
}
