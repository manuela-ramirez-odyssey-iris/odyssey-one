// DEC-204 (provisional: Rovo's summary of Confluence "Shipment Status
// Transition-WIP" + LINX-5923, user 2026-09-25). A shipment's status is
// DERIVED from where the lifecycle filed it (panel + category), never stored
// independently, so the seed (tools/generate.mjs) and every API write that
// re-files a shipment share this one rule and can't disagree.
// Note the vocabulary clash: category 'approved' = tender Accepted → status
// Done; category 'sent' → status Approved (the word LINX-15872 uses).
export const SHIPMENT_STATUSES = ['Hold', 'Consolidation', 'Review', 'Approved', 'Done']

const BY_MONITORING_CATEGORY = {
  hold: 'Hold',
  consolidation: 'Consolidation',
  sent: 'Approved',
  approved: 'Done',
  spotbid: 'Review',
}

// Every exception (Bid Review and Order Change included) is Review.
export function shipmentStatusFor({ panel, category }) {
  if (panel === 'exceptions') return 'Review'
  return BY_MONITORING_CATEGORY[category] ?? ''
}

// Badge variant per status (our call, not in the WIP spec): Review keeps the
// grid's existing red, Done its green; Approved blue like a Sent tender;
// Consolidation purple; Hold gray (parked, nothing to do yet).
export const SHIPMENT_STATUS_VARIANT = {
  Hold: 'gray', Consolidation: 'purple', Review: 'red', Approved: 'blue', Done: 'green',
}
