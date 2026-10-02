// Shared per-option Tender-tab action transform (S161). Pulled out of
// RoutingGuideTab.jsx's handleAction; its other caller is the consolidation
// editor's tender check (components/consolidation/useTenderedCheck.js — its
// simulated Accept and its "Cancel tendered shipment(s)"), NOT a Consolidation
// Review screen. Pure: options in, options out, no React state, no I/O —
// callers own persisting the touched ranks, with `tenderWriteExtras` riding
// the write payload (LINX-15899, spec 2026-10-01 §6).
import { isEmailNotify } from '../tender/email/tenderEmail.js'
import { mintToken } from '../spotboard/token.js'

const DASH = '--' // LINX-13590 — empty optional values read '--'

// LINX-15899 result table. Tender/Re-Tender on a Manual comm method land on
// 'To Be Tendered' instead (see isManualNotify) — there is no message to send.
const STATUS_AFTER_ACTION = {
  Tender: 'Sent',
  Accept: 'Accepted',
  Decline: 'Declined',
  Cancel: 'Cancelled',
  'Re-Tender': 'Sent',
}

export const isManualNotify = (api) => String(api ?? '').trim().toLowerCase() === 'manual'

/**
 * Apply ONE tender action (Tender/Re-Tender/Accept/Decline/Cancel) to the
 * option at `rank`. LINX-15899 (spec §4, A1): no auto-tender cascade any more
 * — Decline/Cancel used to tender the next null-status carrier, which made a
 * second option active and skipped the manual-comm confirm; the planner
 * tenders the next option by hand. Fix 4/6/7 (2026-08-10) history: see the
 * pre-S161 inline version in RoutingGuideTab.jsx.
 * @param {object[]} options   current routing options (RoutingOptionVM[])
 * @param {number} rank        the option being acted on
 * @param {string} action      'Tender'|'Re-Tender'|'Accept'|'Decline'|'Cancel'
 * @param {{ now: string, currentUserName: string, sellShipment: string|undefined,
 *   decline?: { code: string, description: string, comments: string|null, carrierGaveBack?: boolean } }} ctx
 *   `decline` = the §5 dialog's answer (LINX-15897); required for Decline.
 * @returns {{ updated: object[], touched: number[] }}  touched is always [rank]
 *   now; kept as a list so callers' persist loops don't change shape.
 */
export function applyTenderAction(options, rank, action, { now, currentUserName, sellShipment, decline }) {
  const isResponseAction = action === 'Accept' || action === 'Decline' || action === 'Cancel'
  const isNotifyAction = action === 'Tender' || action === 'Re-Tender'

  const updated = options.map((opt) => {
    if (opt.rank !== rank) return opt
    // modifyUser/modifyDate are the audit trail — every action sets them, not
    // just the response ones, so no action is invisible to it.
    const status = isNotifyAction && isManualNotify(opt.api) ? 'To Be Tendered' : STATUS_AFTER_ACTION[action] || opt.status
    const next = { ...opt, status, modifyUser: currentUserName, modifyDate: now }
    if (isResponseAction) {
      next.responseDateTime = now
      next.responseUser = currentUserName
      next.responseMethod = 'Manual Update' // RESPONSE_METHODS literal (generate.mjs) — a UI click genuinely is one, not fabricated.
    }
    if (isNotifyAction) {
      next.notifyDateTime = now
      // S157 — mint the carrier-review token whenever this row's method is
      // Email/Email & EDI. Re-Tender re-mints UNCONDITIONALLY, which is what
      // expires the previous link. Manual is never email → no token.
      if (isEmailNotify(opt.api)) next.tenderToken = mintToken(sellShipment, opt.scac)
      // Fix 7 (2026-08-10), widened to Tender: per LINX-15899 a Declined/
      // Cancelled option is re-offered via Tender, so both start a new cycle
      // and clear the PREVIOUS one's response — else the row reads
      // "Declined by X" while status says Sent again. LINX-15897 bug 13: the
      // decline reason/code/comments go with it; carrierGaveBack is KEPT (it
      // is a record of the carrier, not of this cycle — spec §5).
      next.responseDateTime = DASH
      next.responseMethod = DASH
      next.responseUser = null
      next.declineReason = null
      next.declineReasonCode = null
      next.responseComments = null
    }
    if (action === 'Decline' && decline) {
      next.declineReasonCode = decline.code
      next.declineReason = decline.description
      next.responseComments = decline.comments || null
      // A5 — giveback only exists when declining an ACCEPTED option; a Sent
      // decline leaves any earlier flag alone.
      if (opt.status === 'Accepted') next.carrierGaveBack = !!decline.carrierGaveBack
    }
    return next
  })

  return { updated, touched: [rank] }
}

/**
 * Fields that ride the tender WRITE payload but never live on the option VM
 * (spec contract with saveTender): the server reads `tenderAction` to guard
 * the §3 matrix / §4 single-active rule and to write the §6 history entry,
 * then strips it. A Decline on an Email / Email & EDI option records the TE-4
 * cancellation message (spec §5 "Cancel message on Decline") — recorded, not
 * sent (prototype).
 */
export function tenderWriteExtras(option, action) {
  return {
    tenderAction: action,
    ...(action === 'Decline' && isEmailNotify(option?.api) ? { tenderCommMessage: 'TE-4' } : {}),
  }
}
