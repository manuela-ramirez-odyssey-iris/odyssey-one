// Shared per-option Tender-tab action transform (S161). Pulled out of
// RoutingGuideTab.jsx's handleAction so Consolidation Review's "Cancel
// tendered shipment(s)" (B3) fires the EXACT SAME Cancel path a Tender-tab
// Cancel does — including the auto-tender cascade — instead of a hand-rolled
// cascade-free variant (user ruling, 2026-09-25). Pure: options in, options
// out, no React state, no I/O — callers own persisting the touched ranks
// (RoutingGuideTab via persistTender, Consolidation Review via saveTenderOption
// directly, since it has no per-shipment `options` state to keep in sync).
import { isEmailNotify } from '../tender/email/tenderEmail.js'
import { mintToken } from '../spotboard/token.js'

const DASH = '--' // LINX-13590 — empty optional values read '--'

const STATUS_AFTER_ACTION = {
  Tender: 'Sent',
  Accept: 'Accepted',
  Decline: 'Declined',
  Cancel: 'Cancelled',
  'Re-Tender': 'Sent',
}

/**
 * Apply ONE tender action (Tender/Re-Tender/Accept/Decline/Cancel) to the
 * option at `rank`, plus the Decline/Cancel cascade (auto-tender the next
 * null-status carrier by rank ascending). See RoutingGuideTab.jsx's original
 * inline version (pre-S161) for the fix history (Fix 4/6/7, 2026-08-10) this
 * mirrors verbatim.
 * @param {object[]} options   current routing options (RoutingOptionVM[])
 * @param {number} rank        the option being acted on
 * @param {string} action      'Tender'|'Re-Tender'|'Accept'|'Decline'|'Cancel'
 * @param {{ now: string, currentUserName: string, sellShipment: string|undefined }} ctx
 * @returns {{ updated: object[], touched: number[] }}
 */
export function applyTenderAction(options, rank, action, { now, currentUserName, sellShipment }) {
  const isResponseAction = action === 'Accept' || action === 'Decline' || action === 'Cancel'
  const isNotifyAction = action === 'Tender' || action === 'Re-Tender'

  let updated = options.map((opt) => {
    if (opt.rank !== rank) return opt
    // modifyUser/modifyDate are the audit trail — every action sets them, not
    // just the response ones, so no action is invisible to it.
    const next = { ...opt, status: STATUS_AFTER_ACTION[action] || opt.status, modifyUser: currentUserName, modifyDate: now }
    if (isResponseAction) {
      next.responseDateTime = now
      next.responseUser = currentUserName
      next.responseMethod = 'Manual Update' // RESPONSE_METHODS literal (generate.mjs) — a UI click genuinely is one, not fabricated.
    }
    if (isNotifyAction) {
      next.notifyDateTime = now
      // S157 — mint the carrier-review token whenever this row's method is
      // Email/Email & EDI. Re-Tender re-mints UNCONDITIONALLY, which is what
      // expires the previous link.
      if (isEmailNotify(opt.api)) next.tenderToken = mintToken(sellShipment, opt.scac)
    }
    if (action === 'Re-Tender') {
      // Fix 7 (2026-08-10): clear the PREVIOUS cycle's response so the row
      // doesn't read "Declined by X" while status says Sent again.
      next.responseDateTime = DASH
      next.responseMethod = DASH
      next.responseUser = null
    }
    return next
  })
  const touched = [rank]

  /* CASCADE: on Decline or Cancel, auto-tender next null-status carrier by rank ascending */
  if (action === 'Decline' || action === 'Cancel') {
    const sortedByRank = [...updated].sort((a, b) => a.rank - b.rank)
    const nextNull = sortedByRank.find((opt) => opt.status === null || opt.status === undefined)
    if (nextNull) {
      updated = updated.map((opt) =>
        opt.rank === nextNull.rank
          // Being auto-tendered is a NOTIFY, not a RESPONSE — only
          // notifyDateTime moves here (Fix 4's distinction).
          ? {
              ...opt,
              status: 'Sent',
              notifyDateTime: now,
              modifyUser: currentUserName,
              modifyDate: now,
              ...(isEmailNotify(opt.api) ? { tenderToken: mintToken(sellShipment, opt.scac) } : {}),
            }
          : opt,
      )
      touched.push(nextNull.rank)
    }
  }

  return { updated, touched }
}
