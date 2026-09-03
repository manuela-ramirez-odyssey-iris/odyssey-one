// apps/odyssey-one/src/spotboard/email/templates.js
// The eight overflow emails, plain-text first (verbatim skeletons from
// Doug's 2023 sends — vault quote-model.md §7.1), with the HTML layer
// mirroring the text line for line. CE-* go to carriers, IE-* to the
// planning group. Sender is the planning group's FROMEMAIL (SPB-77).
import { renderText, renderHtml, blocks } from './emailLayout.js'

const addr = (a) => [a?.name, ...(a?.lines ?? [])].filter(Boolean)
const addrText = (label, a) => [`${label}:`, ...addr(a).map((l) => `\t${l}`)]

// Shared tail of every message: shipper + from/to. Planner alerts prepend
// Reference#/Order#; carrier emails never carry them (SPB-05).
function partyText(ctx, { withReference }) {
  return [
    withReference ? `Reference#: ${ctx.reference}` : null,
    withReference && ctx.orderNumber ? `Order#: ${ctx.orderNumber}` : null,
    withReference ? '' : null,
    `Shipper: ${ctx.shipper}`,
    '',
    ...addrText('Ship From', ctx.from),
    '',
    ...addrText('Ship To', ctx.to),
  ]
}
// extra: leading key/value pairs (e.g. Quote#) folded into the same fields
// group as Reference#/Order#/Shipper, so their value columns share one
// nested table instead of each landing in its own misaligned one.
// route: whether to show the origin→destination band above the addresses
// (CE-1/CE-2 — a single lane is worth reading at a glance; the six planner
// alerts skip it, they're an exception report, not a lane summary).
// foot: optional [fromLabel, fromValue, toLabel, toValue] pair placed under
// the two address columns (e.g. Ship Date under Ship From).
function partyBlocks(ctx, { withReference, extra = [], route = false, foot = null }) {
  return [
    route ? blocks.route(ctx.from, ctx.to) : null,
    blocks.addressPair('Ship From', addr(ctx.from), 'Ship To', addr(ctx.to), foot),
    blocks.factGrid([
      ...extra,
      ...(withReference ? [['Reference#', ctx.reference], ['Order#', ctx.orderNumber]] : []),
      ['Shipper', ctx.shipper],
    ], { columns: 3, align: 'left' }),
  ].filter(Boolean)
}

// ---------- CE-1 Request for Quote ----------
export function rfqEmail(ctx, carrier) {
  const link = `${ctx.appOrigin}/spot-bid/${carrier.token}`
  const subject = `Request for Quote to ${carrier.scac} for Quote No: ${ctx.quoteId}, for ${ctx.shipper.toUpperCase()}`
  const stopsText = ctx.stops?.length
    ? ['Stop Offs:', ...ctx.stops.map((s) => `\t${s.label}\t${s.date}`)]
    : []
  const text = renderText([
    'Request For Quote',
    `Offer Expires: ${ctx.offerExpires}`,
    '',
    `Shipper: ${ctx.shipper}`,
    `Carrier: ${carrier.scac} - ${carrier.name}`,
    `Quote#: ${ctx.quoteId}`,
    `Equipment: ${ctx.equipment}`,
    `Weight: ${ctx.weight}`,
    `Hazmat: ${ctx.hazmat}`,
    ctx.distance ? `Distance: ${ctx.distance}` : null,
    '',
    ...addrText('Ship From', ctx.from),
    '',
    ...addrText('Ship To', ctx.to),
    '',
    `Pickup: ${ctx.pickup}`,
    `Deliver: ${ctx.deliver}`,
    ...(stopsText.length ? ['', ...stopsText] : []),
    '',
    'Submit your quote here (this link is for your company only):',
    link,
  ])
  const html = renderHtml({
    title: subject,
    preheader: `Quote ${ctx.quoteId} · ${ctx.equipment} · offer expires ${ctx.offerExpires}`,
    blocks: [
      blocks.eyebrow('Request for Quote'),
      blocks.headline(`${carrier.scac} — Quote ${ctx.quoteId}`),
      blocks.notice(`Offer expires ${ctx.offerExpires}`, 'warning'),
      blocks.route(ctx.from, ctx.to),
      blocks.addressPair('Ship From', addr(ctx.from), 'Ship To', addr(ctx.to),
        ['Pickup', ctx.pickup, 'Deliver', ctx.deliver]),
      ctx.distance ? blocks.factGrid([['Distance', ctx.distance]], { columns: 1 }) : null,
      blocks.factGrid([
        ['Shipper', ctx.shipper], ['Carrier', `${carrier.scac} - ${carrier.name}`],
        ['Quote#', ctx.quoteId], ['Equipment', ctx.equipment],
        ['Weight', ctx.weight], ['Hazmat', ctx.hazmat],
      ], { columns: 3, align: 'left' }),
      ctx.stops?.length ? blocks.factGrid(ctx.stops.map((s) => [s.label, s.date])) : null,
      blocks.button('Submit your quote', link),
      blocks.paragraph('This link is for your company only. Bidding closes at the offer expiry above.'),
    ].filter(Boolean),
  })
  return { id: 'CE-1', kind: 'CE-1', subject, from: ctx.sender, to: carrier.email, text, html }
}

// ---------- CE-2 Quote Awarded ----------
export function awardEmail(ctx, carrier, allInRate) {
  const subject = `Quote Request ${ctx.quoteId} Awarded`
  const lead = `Great news! Your all in rate of ${allInRate} has been approved. Please accept the EDI or email tender at your earliest convenience.`
  const text = renderText([
    lead, '',
    `Quote#: ${ctx.quoteId}`,
    ...partyText(ctx, { withReference: false }),
  ])
  const html = renderHtml({
    title: subject,
    preheader: `Your rate of ${allInRate} for quote ${ctx.quoteId} was approved`,
    blocks: [
      blocks.eyebrow('Quote Awarded'),
      blocks.headline('Great news!'),
      blocks.paragraph(lead.replace(/^Great news!\s*/, '')),
      ...partyBlocks(ctx, { withReference: false, extra: [['Quote#', ctx.quoteId]], route: true }),
      blocks.notice('The tender is a separate step. You are assigned to the load only once you accept it.', 'info'),
    ],
  })
  return { id: 'CE-2', kind: 'CE-2', subject, from: ctx.sender, to: carrier.email, text, html }
}

// ---------- IE-1…IE-6 planner alerts ----------
// headline: the human sentence shown in the HTML layer — never used in
// m.text, which stays the verbatim legacy skeleton (subject carries `cond`).
const ALERTS = {
  'IE-1': { cond: 'closed with no carrier bids submitted.', tone: 'error', headline: 'No carrier bids were submitted', action: 'No bids received — planner review required' },
  'IE-2': { cond: 'closed and the lowest cost carrier is out of tolerance.', tone: 'warning', headline: 'The lowest cost carrier is out of tolerance', action: 'Lowest bid out of tolerance — planner review required' },
  'IE-3': { cond: 'closed and Manual Review = Yes.  Please review quote responses immediately.', tone: 'warning', headline: 'Manual review is required', action: 'Manual review flagged — planner review required' },
  'IE-4': { cond: 'Cancelled, Consolidation Impacted by Order Change', tone: 'error', cancelled: true, headline: 'Your consolidation has changed' },
  'IE-5': { cond: 'closed and no costed LCE option exists to determine quote tolerance.', tone: 'warning', headline: 'No costed option exists to determine tolerance', action: 'No costed option available — planner review required' },
  'IE-6': { cond: 'closed and no distance was found to calculate an estimated costed LCE option.', tone: 'warning', headline: 'No distance was found to estimate cost', action: 'No distance found — planner review required' },
}
export const ALERT_KINDS = Object.keys(ALERTS)

export function alertEmail(kind, ctx) {
  const def = ALERTS[kind]
  if (!def) throw new Error(`Unknown alert kind ${kind}`)
  const subject = `Attention - Quote Request ${ctx.quoteId} ${def.cond}`
  const cancelledLead = def.cancelled
    ? ['Your consolidation has changed.', '', 'Your quote has been cancelled and is now invalid.  Do not process any bids associated with this consolidation.  Review shipment details to determine next steps.']
    : [subject]
  const bid = ctx.lowest && !def.cancelled
    ? ['', `Lowest Cost Carrier: ${ctx.lowest.carrier}`, `Quoted Amount: ${ctx.lowest.amount}`, `Ship Date: ${ctx.lowest.shipDate}`, `Delivery Date: ${ctx.lowest.deliveryDate}`]
    : []
  const text = renderText([
    ...cancelledLead, '',
    ...partyText(ctx, { withReference: true }),
    ...bid,
  ])
  const html = renderHtml({
    title: subject,
    preheader: subject,
    blocks: [
      blocks.eyebrow('Action Required'),
      blocks.headline(def.headline),
      blocks.notice(def.cancelled ? 'Your quote has been cancelled and is now invalid.' : `Quote ${ctx.quoteId} · ${def.action}`, def.tone),
      def.cancelled ? blocks.paragraph('Do not process any bids associated with this consolidation. Review shipment details to determine next steps.') : null,
      ...partyBlocks(ctx, {
        withReference: true,
        extra: bid.length ? [['Lowest Cost Carrier', ctx.lowest.carrier], ['Quoted Amount', ctx.lowest.amount]] : [],
        foot: bid.length ? ['Ship Date', ctx.lowest.shipDate, 'Delivery Date', ctx.lowest.deliveryDate] : null,
      }),
    ].filter(Boolean),
  })
  return { id: kind, kind, subject, from: ctx.sender, to: ctx.plannerGroup, text, html }
}
