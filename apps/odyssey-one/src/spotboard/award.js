// Award → Tender handoff. Turns the winning SpotBoard carrier into a routing
// option shaped like QuoteModal's mode==='add' path (RoutingGuideTab.jsx
// ~1163-1226) so it drops straight into the existing Tender guide via the
// existing saveTenderOption save path — no new persistence.
import { applyMarkup } from './tolerance.js'
import { fmtDollar } from '../utils/money.js'

// winningCarrier: CarrierRow (carrierList.js) + bid — see spotStore.lowestBid
// quote: Quote (spotStore.js) — only quoteId is used here, for traceability
// existingOptions: the shipment's current RoutingOptionVM[]
// markup: { type:'pct'|'flat', value } — same shape tolerance.applyMarkup takes
export function buildSpotRateOption(winningCarrier, quote, existingOptions, markup) {
  const bid = winningCarrier.bid || {}
  const { charges, total } = applyMarkup(
    { linehaul: bid.linehaul || 0, fuel: bid.fuel || 0, accessorials: bid.accessorials || [] },
    markup,
  )
  // Everything but the base linehaul line becomes an "additional charge" —
  // fuel, accessorials, and the QMU markup line — so baseRate + sum(these)
  // reconstructs `total` exactly (mirrors QuoteModal's apTotal invariant).
  const additionalCharges = charges
    .filter((c) => c.code !== 'LH')
    .map((c) => ({ code: c.code, description: c.description, amount: c.amount, currency: 'USD' }))
  const qmu = charges.find((c) => c.code === 'QMU')

  const maxRank = existingOptions.reduce((m, o) => Math.max(m, o.rank), 0)

  return {
    rank: maxRank + 1,
    routeRank: maxRank + 1,
    scac: winningCarrier.scac,
    carrierName: winningCarrier.name,
    equipment: winningCarrier.equipment || '--',
    rate: fmtDollar(bid.linehaul || 0),
    cost: `${fmtDollar(total)} USD`,
    rateDetails: {
      baseRate: bid.linehaul || 0,
      currency: 'USD',
      markup: qmu?.amount ?? 0,
      additionalCharges,
      apTotal: total,
      arTotal: total,
    },
    status: 'Sent',
    pickupDateTime: winningCarrier.plannedPickup || '--',
    deliveryDateTime: winningCarrier.plannedDelivery || '--',
    transit: '--',
    distance: '--',
    api: '--',
    notifyDateTime: '--',
    responseMethod: '--',
    responseDateTime: '--',
    responseUser: null,
    carrierQuoted: 'Yes',
    networkLeverage: '0%',
    proNumber: null,
    transportingCarrier: winningCarrier.name,
    equipNumber: '--',
    routeGroup: 'Spot',
    commitment: 0,
    uom: '--',
    vcEquipNumber: '--',
    vcOpen: 0,
    vcAccept: 0,
    vcDecline: 0,
    carrierApiTenderId: '--',
    breakPoint: 'Direct',
    rateSource: 'Spot',
    distanceSource: '--',
    description: 'Spot award',
    transitTimeSource: '--',
    transitTimeId: '--',
    loadboardExpiry: '--',
    rcpId: '--',
    lcePkId: '--',
    modifyUser: 'Current User',
    modifyDate: new Date().toLocaleString(),
    indirectPoint: 'N/A',
    roundTrip: 'No',
    customerPreferred: 'No',
    orderEquip: '--',
    contactExped: '--',
    note: '--',
    sl: '--',
    linehaul: 'Pending',
    carrierPickup: '--',
    deliveryNum: '--',
    pickupTZ: 'CST',
    deliveryTZ: 'CST',
    pickupOrgHours: '--',
    pickupOrgDay: '--',
    deliveryOrgHours: '--',
    // Explicit marker for RoutingGuideTab's SPOT RATE badge — routeGroup
    // alone can't gate it, manual "Add Quote" also sets routeGroup: 'Spot'.
    spotRate: true,
  }
}
