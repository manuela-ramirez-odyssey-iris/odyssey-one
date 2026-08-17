import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, FormField, ModalMedium } from '@odyssey/ui'

/**
 * LINX-13954 — Manual Pickup and Delivery Entry.
 *
 * Opens on the routing-failure branch, when routing came back without dates.
 * That is the single most common case in the seeded data (Missing Transit Time
 * is 6 of every 11 dropped carriers), so this dialog is on the main path, not
 * an edge case.
 *
 * BOTH validations are hard blocks — OK stays disabled until each passes.
 * "Pickup cannot be in the past" is the one we questioned (a late load is
 * plausible, not impossible); it was ruled "per the story", so it blocks.
 *
 * `now` is a prop, not `new Date()` read inline, so the past-check is testable
 * without the wall clock deciding whether the suite passes.
 *
 * Composition copies RoutingGuideTab's `ConfirmDialog` shell (ModalMedium +
 * createPortal + a Cancel/OK footer) — same known-working pattern, not the
 * narrowed `confirm-dialog` className, since this dialog carries two real
 * input fields rather than one line of message text.
 */

export const PICKUP_PAST_ERROR = 'Pickup Date/Time cannot be in the past.'
export const DELIVERY_ORDER_ERROR = 'Delivery Date/Time must be later than Pickup Date/Time.'

// "MM/DD/YYYY HH:MM" -> Date, or null for anything that isn't a real
// calendar date/time. Parsed part-wise rather than through `new Date(string)`,
// whose MM/DD/YYYY handling is implementation-defined — same reasoning as
// lib/dates.js `dayOfWeek`. Rejects a rolled-over value (02/31, 25:99) rather
// than silently accepting the date JS Date would roll it into.
function parse(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{1,2}):(\d{2})$/.exec(String(s ?? '').trim())
  if (!m) return null
  const [month, day, year, hour, minute] = m.slice(1).map(Number)
  const d = new Date(year, month - 1, day, hour, minute)
  if (
    d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day ||
    d.getHours() !== hour || d.getMinutes() !== minute
  ) return null
  return d
}

export default function ManualDatesModal({ now = new Date(), onConfirm, onCancel }) {
  const [pickupDateTime, setPickupDateTime] = useState('')
  const [deliveryDateTime, setDeliveryDateTime] = useState('')

  const pickup = parse(pickupDateTime)
  const delivery = parse(deliveryDateTime)

  // Only shown once there's a parseable value to judge — an error ahead of
  // any input reads as the form being broken, not as guidance.
  const pastError = pickup && pickup < now ? PICKUP_PAST_ERROR : null
  const orderError = pickup && delivery && delivery <= pickup ? DELIVERY_ORDER_ERROR : null
  const valid = !!pickup && !!delivery && !pastError && !orderError

  const handleConfirm = () => {
    if (!valid) return
    onConfirm({ pickupDateTime, deliveryDateTime })
  }

  return createPortal(
    <ModalMedium
      title="Manual Pickup and Delivery Entry"
      onClose={onCancel}
      ariaLabel="Manual Pickup and Delivery Entry"
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="lg" onClick={handleConfirm} disabled={!valid}>OK</Button>
        </>
      }
    >
      <FormField
        id="manual-dates-pickup"
        label="Pickup Date/Time"
        placeholder="MM/DD/YYYY HH:MM"
        value={pickupDateTime}
        onChange={(e) => setPickupDateTime(e.target.value)}
        error={pastError}
      />
      <FormField
        id="manual-dates-delivery"
        label="Delivery Date/Time"
        placeholder="MM/DD/YYYY HH:MM"
        value={deliveryDateTime}
        onChange={(e) => setDeliveryDateTime(e.target.value)}
        error={orderError}
      />
    </ModalMedium>,
    document.body,
  )
}
