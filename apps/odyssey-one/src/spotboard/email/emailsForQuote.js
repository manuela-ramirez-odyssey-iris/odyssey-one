// Every email one quote produces, in send order: CE-1 per included carrier
// at send, then either the IE-* alert at close or CE-2 to the winner.
import { rfqEmail, awardEmail, alertEmail } from './templates.js'

export function emailsForQuote(ctx, quote, { alertKind, awardedScac }) {
  const carriers = (quote?.carriers ?? []).filter((c) => c.incl)
  const list = carriers.map((c) => ({
    ...rfqEmail(ctx, c), id: `CE-1:${c.scac}`, when: 'On Send RFQ', recipientLabel: `${c.scac} · ${c.name}`,
  }))
  if (alertKind) {
    list.push({ ...alertEmail(alertKind, ctx), when: 'On close', recipientLabel: 'Planning group' })
  }
  if (awardedScac) {
    const w = carriers.find((c) => c.scac === awardedScac)
    if (w?.bid) {
      const rate = `${Number(w.bid.total).toFixed(2)} ${w.bid.currency ?? 'USD'}`
      list.push({ ...awardEmail(ctx, w, rate), id: `CE-2:${w.scac}`, when: 'On award', recipientLabel: `${w.scac} · ${w.name}` })
    }
  }
  return list
}
