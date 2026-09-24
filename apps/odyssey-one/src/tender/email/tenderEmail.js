// apps/odyssey-one/src/tender/email/tenderEmail.js
// TE-1 (Email) / TE-2 (Email & EDI) tender notification, CE-1's shape line
// for line (see spotboard/email/templates.js's rfqEmail — THE model).
import { renderText, renderHtml, blocks } from '../../spotboard/email/emailLayout.js'

const addr = (a) => [a?.name, ...(a?.lines ?? [])].filter(Boolean)
const addrText = (label, a) => [`${label}:`, ...addr(a).map((l) => `\t${l}`)]

const RESPONSE_NOTE = 'This link is for your company only. Opening it does not accept or decline the tender — you confirm your response on the review page.'

// Other slices (the Tender tab hook) import this to decide whether a row
// gets a tenderToken minted at all — 'Email' or 'Email & EDI', case-insensitive.
export function isEmailNotify(api) {
  const a = String(api ?? '').trim().toLowerCase()
  return a === 'email' || a === 'email & edi'
}

function subjectFor(ctx) {
  return ctx.consolidation
    ? `Tender Notification to ${ctx.scac} of Shipment ID:${ctx.odysseyShipmentIdentifier}, for ${ctx.customerForSubject}, multiple deliveries`
    : `Tender Notification to ${ctx.scac} of Shipment ID:${ctx.odysseyShipmentIdentifier}, for ${ctx.customerForSubject} delivery:${ctx.orderNumber}`
}

// TE-3 subject — user ruling 2026-09-24 (Adam's ask), NOT in 15795/15796/15800.
// Wording mirrors Dave's TE-1 subject rule 1:1 (same customer/consolidation
// logic) but is otherwise a placeholder pending Adam/Dave sign-off.
function acceptanceSubjectFor(ctx) {
  return ctx.consolidation
    ? `Tender Acceptance Confirmation to ${ctx.scac} of Shipment ID:${ctx.odysseyShipmentIdentifier}, for ${ctx.customerForSubject}, multiple deliveries`
    : `Tender Acceptance Confirmation to ${ctx.scac} of Shipment ID:${ctx.odysseyShipmentIdentifier}, for ${ctx.customerForSubject} delivery:${ctx.orderNumber}`
}

export function tenderEmail(ctx) {
  const kind = ctx.api === 'Email & EDI' ? 'TE-2' : 'TE-1'
  const link = `${ctx.appOrigin}/tender-review/${ctx.token}`
  const subject = subjectFor(ctx)
  const ctaLabel = kind === 'TE-2' ? 'Review Tender' : 'Review & Respond'
  const noticeLine = kind === 'TE-2'
    ? 'Informational copy — this tender was also sent to you by EDI. Please respond through your EDI connection.'
    : `Tendered ${ctx.notifyDateTime}`
  // BR-01/BR-08 (15796) — the finality note names accept/decline, which
  // TE-2's informational copy must not mention anywhere in the message.
  const responseNote = kind === 'TE-2' ? null : RESPONSE_NOTE
  const stopsText = ctx.stops?.length ? ['Stop Offs:', ...ctx.stops.map((s) => `\t${s.label}\t${s.date}`)] : []

  const text = renderText([
    'Tender Notification',
    noticeLine,
    '',
    `Shipper: ${ctx.customerName}`,
    `Carrier: ${ctx.scac} - ${ctx.carrierName}`,
    `Shipment ID: ${ctx.odysseyShipmentIdentifier}`,
    `Equipment: ${ctx.equipment}`,
    `Weight: ${ctx.weight}`,
    `Hazmat: ${ctx.hazmat}`,
    ctx.distance ? `Distance: ${ctx.distance}` : null,
    '',
    ...addrText('Ship From', ctx.from),
    '',
    ...addrText('Ship To', ctx.to),
    '',
    ctx.pickupLine ? `Pickup: ${ctx.pickupLine}` : null,
    ctx.deliverLine ? `Deliver: ${ctx.deliverLine}` : null,
    ...(stopsText.length ? ['', ...stopsText] : []),
    '',
    `${ctaLabel} (this link is for your company only):`,
    link,
    responseNote ? '' : null,
    responseNote,
  ].filter((l) => l !== null))

  const html = renderHtml({
    title: subject,
    preheader: `${ctx.odysseyShipmentIdentifier} · ${ctx.equipment} · ${noticeLine}`,
    blocks: [
      blocks.eyebrow('Tender Notification'),
      blocks.headline(`${ctx.scac} — Shipment ${ctx.odysseyShipmentIdentifier}`),
      blocks.notice(noticeLine, 'info'),
      blocks.columnStack([
        [['Shipper', ctx.customerName], ['Carrier', `${ctx.scac} - ${ctx.carrierName}`]],
        [['Shipment ID', ctx.odysseyShipmentIdentifier], ['Equipment', ctx.equipment], ['Weight', ctx.weight], ['Hazmat', ctx.hazmat]],
      ]),
      blocks.route(ctx.from, ctx.to),
      blocks.addressPair('Ship From', addr(ctx.from), 'Ship To', addr(ctx.to),
        (ctx.pickupLine || ctx.deliverLine) ? ['Pickup', ctx.pickupLine, 'Deliver', ctx.deliverLine] : null,
        { gapBottom: ctx.stops?.length ? 4 : 16 }),
      ctx.stops?.length
        ? blocks.factGrid(ctx.stops.map((s) => [s.label, s.date]), { columns: 1, topRule: true, bottomRule: true })
        : null,
      // No rate in tender emails (user, 2026-09-24, from Adam/Dave).
      blocks.factGrid([['Distance', ctx.distance]]),
      blocks.button(ctaLabel, link),
      responseNote ? blocks.paragraph(responseNote) : null,
    ].filter(Boolean),
  })

  return { id: kind, kind, subject, from: ctx.sender, to: ctx.toEmail, text, html }
}

// TE-3 — Tender acceptance confirmation, sent to the carrier the moment the
// carrier's Accept is recorded on the review page. User ruling 2026-09-24
// (Adam Shingle's ask), NOT in LINX-15795/15796/15800 — no story AC covers
// this email, so subject/body wording below is a placeholder pending
// Adam/Dave. Reuses TE-1's summary block; hero = a big check (user, 2026-09-24),
// no rate and no link — a receipt with nothing left to act on.
export function tenderAcceptedEmail(ctx) {
  const kind = 'TE-3'
  const subject = acceptanceSubjectFor(ctx)
  const noticeLine = `Accepted ${ctx.acceptedAt}`

  const text = renderText([
    'Tender Accepted',
    noticeLine,
    '',
    `Shipper: ${ctx.customerName}`,
    `Carrier: ${ctx.scac} - ${ctx.carrierName}`,
    `Shipment ID: ${ctx.odysseyShipmentIdentifier}`,
    `Equipment: ${ctx.equipment}`,
    `Weight: ${ctx.weight}`,
    `Hazmat: ${ctx.hazmat}`,
    ctx.distance ? `Distance: ${ctx.distance}` : null,
  ].filter((l) => l !== null))

  const html = renderHtml({
    title: subject,
    preheader: `${ctx.odysseyShipmentIdentifier} · ${ctx.equipment} · ${noticeLine}`,
    blocks: [
      blocks.check('Tender Accepted'),
      blocks.headline(`${ctx.scac} — Shipment ${ctx.odysseyShipmentIdentifier}`),
      blocks.paragraph(noticeLine),
      blocks.columnStack([
        [['Shipper', ctx.customerName], ['Carrier', `${ctx.scac} - ${ctx.carrierName}`]],
        [['Shipment ID', ctx.odysseyShipmentIdentifier], ['Equipment', ctx.equipment], ['Weight', ctx.weight], ['Hazmat', ctx.hazmat]],
      ]),
      // No rate, no CTA (user, 2026-09-24): a receipt, nothing left to do.
      blocks.factGrid([['Distance', ctx.distance]]),
    ],
  })

  return { id: kind, kind, subject, from: ctx.sender, to: ctx.toEmail, text, html }
}
