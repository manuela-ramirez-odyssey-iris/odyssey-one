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
    `Offered Rate: ${ctx.offeredRate}`,
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
      blocks.factGrid([['Distance', ctx.distance], ['Offered Rate', ctx.offeredRate]]),
      blocks.button(ctaLabel, link),
      responseNote ? blocks.paragraph(responseNote) : null,
    ].filter(Boolean),
  })

  return { id: kind, kind, subject, from: ctx.sender, to: ctx.toEmail, text, html }
}
