/**
 * What a carrier (or our own planner) said when the tender outcome was recorded.
 *
 * Keyed by tender status, because the text has to follow the outcome — a
 * Declined row must never read like a cancellation, and vice versa. Indexed by
 * an already-drawn value at both call sites, never by a fresh random draw:
 *
 *   • tools/generate.mjs seeds `responseComments` from these pools (indexed by
 *     the option's own `lcePkId`), adding zero faker calls so the stream — and
 *     therefore every seeded id — stays exactly where it was.
 *   • src/data/routingHistory.js re-picks from them for a HISTORICAL routing
 *     version, whose status it rewrites (an accepted tender ends the routing
 *     story, so a past version never holds one) and whose comment therefore
 *     cannot simply be copied off the seeded row.
 *
 * Lives app-side and is imported BY the generator (the generate.mjs →
 * ../src/components/orders/resolve/interfaceErrors.js precedent); the reverse
 * direction would pull generator code into the app bundle.
 *
 * PROVENANCE — the text is OURS. The real `ShippingOption` carries both
 * `responseReason` (a code) and `responseComments` (free text); Saikat's code
 * read, LINX-15895 comment 2026-09-15. We seed only the text, and inventing a
 * reason-code vocabulary is a question for Jana rather than a gap to fill
 * silently.
 */

/** The carrier said no, and why. */
const DECLINED = [
  'No capacity available for the requested pickup date.',
  'Lane not served with this equipment type.',
  'Rate below contracted minimum for this lane.',
  'Driver hours will not cover the delivery window.',
  'Equipment unavailable at origin on the requested date.',
  'Origin appointment window cannot be met.',
  'Backhaul coverage only — no outbound capacity this week.',
]

/**
 * WE pulled the tender, so the reason is ours rather than the carrier's —
 * LINX-5921 lists Cancel among the actions "the user should be able to perform".
 */
const CANCELLED = [
  'Tender withdrawn by the planner before a response.',
  'Cancelled — routing re-run after an order change.',
  'Cancelled — shipment re-planned onto a different route group.',
  'Cancelled — order removed from the shipment.',
  'Cancelled — tender expired before the carrier responded.',
]

/** Acceptances are usually silent; the ones that talk are confirming a detail. */
const ACCEPTED = [
  'Accepted — driver assigned, will confirm equipment at dispatch.',
  'Accepted at the quoted rate.',
  'Accepted — pickup confirmed for the scheduled window.',
]

export const RESPONSE_COMMENTS = {
  Accepted: ACCEPTED,
  Declined: DECLINED,
  Cancelled: CANCELLED,
  // A tender that is still out has no response, so it has nothing to say. Kept
  // explicit so a caller reading the table sees the rule rather than an absence.
  Sent: [],
}

/**
 * The comment for one row, or null when the outcome has nothing to say.
 *
 * @param {string|null} status  the tender outcome the comment must agree with.
 * @param {number} seed         an ALREADY-DRAWN integer off the same row
 *                              (`lcePkId` in the seed) — indexing with it keeps
 *                              both call sites free of new random draws.
 * @returns {string|null}
 */
export function responseCommentFor(status, seed) {
  const pool = RESPONSE_COMMENTS[status]
  if (!pool || pool.length === 0) return null
  // An accepted tender is normally recorded without a note — about a third carry
  // one, so the column reads as "sometimes there is more to say" rather than as
  // a field someone forgot to fill in.
  if (status === 'Accepted' && seed % 3 !== 0) return null
  return pool[seed % pool.length]
}
