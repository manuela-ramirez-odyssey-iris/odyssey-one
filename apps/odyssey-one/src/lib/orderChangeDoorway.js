// C20 (LINX-15435 BR1) — the review doorways agree: the Stops-tab review, the
// Tender tab's Review button and the bar's tab badge all ask this one rule.
// A consolidated change is up for review until save-stops writes
// `consolidation.stopsSaved` (API) or a resolution lands; after a Scenario A
// save the remaining decision is the Direct one (LINX-15671), on the Direct route.
export const consolidatedReviewPending = (orderChange) =>
  !!orderChange?.consolidation && !orderChange.consolidation.stopsSaved && !orderChange.resolution

// D2 (LINX-14509) — "shall not be allowed to perform tender-related actions
// until the Order Change review process has been completed": the one reason
// every disabled tender control on the Tender tab gives while a review is
// pending (row menus, Add Carrier, Reinstate).
export const OC_REVIEW_LOCK_TOOLTIP = 'Complete the order change review first.'
