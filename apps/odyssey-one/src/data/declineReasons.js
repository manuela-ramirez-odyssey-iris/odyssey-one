// LINX-15897 — Carrier Decline Reason codes, in the story's order. Shared by
// the planner's Decline dialog (RoutingGuideTab) and the carrier email page
// (TenderReview, A3) — replaces DEC-182's 5 placeholders on both sides.
// The option stores `declineReasonCode` = code and `declineReason` = description.
export const DECLINE_REASONS = [
  { code: 'CAD', description: 'Carrier Accepted after Initial Decline' },
  { code: 'CBH', description: "Carrier Can't Get a Backhaul" },
  { code: 'CDI', description: 'Customer Data Issues' },
  { code: 'CEC', description: 'Customer Orders Surpass Allowed Capacities' },
  { code: 'DNS', description: 'Destination Not Served' },
  { code: 'DOT', description: 'DOT Regulations (Hours Of Service)' },
  { code: 'ESC', description: 'Team Secured Coverage' },
  { code: 'HAZ', description: 'Hazardous Material' },
  { code: 'HOP', description: 'Hours Of Operation - Unable to Load or Deliver Based on Consignee Hours' },
  { code: 'NAV', description: 'No Availability' },
  { code: 'NRE', description: 'Non-response to Tender' },
  { code: 'OCE', description: 'Carrier Capacity Exceeded' },
  { code: 'OIT', description: 'IT System Issues' },
  { code: 'OMD', description: 'Incorrect Master Data Allocation' },
  { code: 'OPL', description: 'Operations Team Incorrect Planning' },
  { code: 'OSC', description: 'Operations Team Secured Coverage' },
  { code: 'OTL', description: 'Odyssey Booked Order after Cut Off' },
  { code: 'SLT', description: 'Short Lead Time' },
  { code: 'TTM', description: 'Transit Time / Mileage' },
  { code: 'WRP', description: 'Wrong Price' },
]
