/**
 * Routing History derive (LINX-15895). Pure: a ShipmentDetailVM → the shipment's
 * PRIOR routing versions, NEWEST FIRST.
 *
 * Derived at read time, not seeded in tools/generate.mjs (plan D1, the
 * src/data/auditTrail.js precedent from S147): a new faker draw there re-numbers
 * every seeded id, and everything a routing version needs is already on the
 * detail — the carriers routing returned, their tender outcomes, the dropped
 * carriers and the orders on the shipment. Deriving also means the tab behaves
 * identically in mock and live with no API work at all: the input is the VM both
 * runtimes already return.
 *
 * The real system would SNAPSHOT this (the backend today destroys the previous
 * run — `replaceShippingOptions` clears the rows before writing the new ones, so
 * there is no write path for a version yet; Saikat's code read, LINX-15895
 * comment 2026-09-15). What we render is therefore a plausible reconstruction
 * for review, not a read of stored history. Every rule below is ours and
 * provisional — see the decision log.
 *
 * Coherence rules (plan D6–D8), so a reviewer never sees a version that routing
 * could not have produced:
 *   • A shipment that has never been tendered (no option carries a status) has
 *     NO history: one routing execution, and it is the current one.
 *   • A historical version never holds an Accepted tender — an accepted tender
 *     ends the routing story, so that shipment would not have been re-routed.
 *   • Orders accumulate with the version number (the AC's own example: V1 has
 *     O1+O2, V2 has O1+O2+O3), so an older version carries a prefix of today's.
 *   • Older versions are older in time, strictly: each step back subtracts at
 *     least an hour from the run before it.
 *
 * PRNG is the same mulberry32-over-FNV-1a recipe auditTrail.js uses (kept local
 * there on purpose; kept local here for the same reason).
 */

import { formatDateTimeMDYHM } from '../lib/dates.js'
// The SAME table the generator seeds `responseComments` from, so the text a
// derived historical version shows and the text on a current row cannot drift.
import { responseCommentFor } from './responseComments.js'

// ── PRNG (mulberry32 over an FNV-1a hash of the key) ─────────────────────────
function hash(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return h >>> 0
}
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)]
const intIn = (r, min, max) => min + Math.floor(r() * (max - min + 1))

/** A historical version's tender outcomes. Accepted is absent on purpose (D7);
 *  `null` is "tendered nothing / no response recorded", which the Tender screen
 *  already renders as '--'. */
const HISTORICAL_STATUSES = ['Declined', 'Cancelled', 'Sent', null]

/**
 * How the answer was RECORDED in Odyssey — not the carrier's channel. Same four
 * values the generator draws from (`generate.mjs` RESPONSE_METHODS), because a
 * historical version has to read like the Tender screen it is a snapshot of.
 * 'API Update'/'EDI Update' are the carrier's system writing back, 'Automatic
 * Update' is Odyssey itself (expiry/timeout), and only 'Manual Update' has a
 * person behind it — which is what makes `responseUser` ours and optional.
 */
const RESPONSE_METHODS = ['API Update', 'EDI Update', 'Manual Update', 'Automatic Update']

/** Cancel is OUR action (LINX-5921 lists it among the user's tender actions), so
 *  a cancelled row was recorded by hand or by the expiry job — never by the
 *  carrier's feed. */
const CANCEL_METHODS = ['Manual Update', 'Automatic Update']

/** An ISO instant `hours` before `base`. This module stays pure data — the pane
 *  formats it for display (MM/DD/YYYY HH:MM UTC, the HistoryTab format, D4). */
function isoMinus(base, hours) {
  return new Date(base.getTime() - hours * 3600 * 1000).toISOString()
}

/**
 * When the CURRENT routing execution happened — the instant every historical run
 * is measured back from.
 *
 * Anchored to the shipment's own tender/pickup clock rather than to `Date.now()`,
 * because a wall-clock anchor moves on every refetch: the same version would show
 * a different timestamp each time the pane remounted, which is exactly what a
 * reviewer comparing two versions must be able to trust. Carrier date strings are
 * `MM/DD/YYYY HH:MM TZ` (see lib/dates.js); the zone abbreviation is dropped —
 * these are relative markers on a derived timeline, not instants we can honour to
 * the minute, and the display labels them UTC.
 */
function anchorInstant(options, fallback) {
  for (const o of options) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/.exec(
      o.notifyDateTime || o.pickupDateTime || '',
    )
    if (m) {
      const [, mm, dd, yyyy, hh, mi] = m
      return new Date(Date.UTC(+yyyy, +mm - 1, +dd, +hh, +mi))
    }
  }
  return fallback
}

/**
 * Was this shipment ever tendered? Reads the CURRENT routing options: a status
 * anywhere means a tender went out at least once, which is what makes a prior
 * routing execution possible at all. S151 made this reachable — before it, a
 * dead `: 'Sent'` fallback made every shipment look tendered.
 */
function everTendered(options) {
  return options.some((o) => o.status != null && o.status !== '')
}

/**
 * Perturb one current option into what it plausibly looked like N versions ago.
 * Cost drifts (a re-route re-rates), the tender outcome becomes a historical
 * one, and the response fields follow from that outcome rather than being drawn
 * independently — an unanswered tender has no response method, user, date or
 * comment, and only a Manual Update has a person behind it.
 *
 * The seeded `responseComments` cannot simply be carried over: this function
 * REWRITES the status (a historical version never holds an Accepted tender), and
 * a comment that disagrees with its outcome is exactly the incoherence the seed
 * fix removed. It re-picks from the same shared table instead.
 *
 * @param {string} routedAt  the version's own ISO instant — the response belongs
 *                           to THIS run, not to the current one the option was
 *                           read from.
 */
function historicalOption(r, option, step, routedAt) {
  const status = pick(r, HISTORICAL_STATUSES)
  // 'Sent' is a tender still out at the time of this run: notified, unanswered.
  const answered = status === 'Declined' || status === 'Cancelled'
  const method = !answered ? null
    : pick(r, status === 'Cancelled' ? CANCEL_METHODS : RESPONSE_METHODS)
  // Older runs were rated earlier; ±12% around the current cost, biased low so a
  // re-route usually reads as "the price moved up on us", which is why a planner
  // is looking at this tab.
  const currentCost = Number(String(option.cost ?? '').replace(/[^0-9.]/g, '')) || 0
  const drift = 1 - (0.12 * r()) - 0.01 * step
  const cost = currentCost ? `$${(currentCost * drift).toFixed(2)}` : option.cost

  return {
    ...option,
    cost,
    rate: cost,
    status,
    responseMethod: method,
    // Ours, and only when a person keyed it in.
    responseUser: method === 'Manual Update' ? (option.modifyUser || option.responseUser) : null,
    responseDateTime: answered ? formatDateTimeMDYHM(new Date(routedAt), { utc: true }) : null,
    responseComments: responseCommentFor(status, hash(`${option.scac}:${step}`)),
    // A quote is a live-screen affordance, never a historical fact to re-offer.
    quoteFlag: undefined,
    quoteAudit: undefined,
  }
}

/**
 * @param {object} details  ShipmentDetailVM (routingData.options, droppedCarriers,
 *                          orderDetails) — read, never mutated.
 * @param {string} key      stable per-shipment PRNG key (the shipment identifier).
 * @param {Date}   [now]    fallback anchor, used only when no option carries a
 *                          parseable notify/pickup stamp (see `anchorInstant`).
 *                          Injectable so a test is never wall-clock dependent.
 * @returns {Array<{version:number, routedAt:string, orders:string[],
 *                  options:object[], droppedCarriers:object[]}>} newest first.
 */
export function deriveRoutingHistory(details, key, now = new Date()) {
  const options = details?.routingData?.options ?? []
  const dropped = details?.droppedCarriers ?? []
  const orders = (details?.orderDetails ?? [])
    .map((o) => o.orderNumber || o.orderId)
    .filter(Boolean)

  if (options.length === 0 || !everTendered(options)) return []

  const r = rng(hash(`routing-history:${key}`))
  const anchor = anchorInstant(options, now)

  // 1–4 executions before the current one, +1 when a tender died — a Declined or
  // Cancelled carrier is what sends a planner back through routing (D6).
  const died = options.some((o) => o.status === 'Declined' || o.status === 'Cancelled')
  const count = intIn(r, 1, 4) + (died ? 1 : 0)

  const versions = []
  let hoursBack = intIn(r, 2, 20)
  for (let step = 0; step < count; step++) {
    // Version numbers count UP from the oldest: the newest historical version is
    // `count`, and the current one the Tender tab shows is `count + 1`.
    const version = count - step
    // The orders on the shipment at the time: a prefix of today's list, growing
    // with the version (D8). Never empty — a routing execution needs freight.
    const orderCount = Math.max(1, Math.ceil((version / (count + 1)) * orders.length))
    // Hoisted: every carrier response in this version is timestamped to the run
    // it belongs to, not to the current one the options were read from.
    const routedAt = isoMinus(anchor, hoursBack)

    versions.push({
      version,
      routedAt,
      orders: orders.slice(0, orderCount),
      options: options.map((o) => historicalOption(r, o, step, routedAt)),
      // Routing legitimately drops different carriers on different runs; an older
      // run's list is a subset of today's, at least one row whenever there are any.
      droppedCarriers: dropped.length
        ? dropped.slice(0, Math.max(1, Math.ceil(r() * dropped.length)))
        : [],
    })
    hoursBack += intIn(r, 1, 36)
  }

  return versions
}
