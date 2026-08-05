// Spot-eligibility: a shipment can go to SpotBoard only if it has no active
// or accepted tender. routingData is { options: RoutingOptionVM[] } — see
// RoutingGuideTab.jsx for the status vocabulary (null | Sent | Accepted |
// Declined | Cancelled).
const BLOCKING_STATUSES = ['Accepted', 'Sent']

const findBlocker = (routingData) =>
  (routingData?.options ?? []).find((o) => BLOCKING_STATUSES.includes(o.status))

export function isSpotEligible(routingData) {
  return !findBlocker(routingData)
}

export function eligibilityReason(routingData) {
  const blocker = findBlocker(routingData)
  if (!blocker) return ''
  const carrier = blocker.carrierName || blocker.scac
  return carrier
    ? `This shipment already has a ${blocker.status} tender with ${carrier} — spot bidding is unavailable.`
    : `This shipment already has a ${blocker.status} tender — spot bidding is unavailable.`
}
