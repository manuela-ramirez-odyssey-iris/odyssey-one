import type {
  SellShipmentOut,
  SellShipmentOrder,
  SellShipmentAddress,
  SellShipmentStop,
  SellShipmentOrderLine,
  SellShipmentRoutingOption,
  SellShipmentSpecialService,
  SellShipmentDroppedCarrier,
} from '../types/sellShipmentOut'
import type {
  CostOrderVM,
  CostSummaryVM,
  DroppedCarrierVM,
  InstructionOrderVM,
  OrderDetailVM,
  ProductLineVM,
  ProductOrderVM,
  RoutingOptionVM,
  ShipmentDetailVM,
  SpecialServiceVM,
  StopVM,
  StopsSummaryVM,
} from '../types/shipmentDetail'
import { freightTermLabel, shipDirectionLabel } from '../../data/master-data'
import { parseDollar } from '../../utils/money'
import { composeCarrierDateTime, splitDateTime } from '../../lib/dates'

const DASH = '--'

function fmtMeasure(value: number | undefined, uom: string | undefined, fallbackUom: string): string {
  if (value == null) return DASH
  return `${value.toLocaleString('en-US')} ${uom ?? fallbackUom}`
}

// Order-tab location format: "postal, city, region, country" (comma-separated).
// Deliberately different from the Stops-tab format in mapStop ("city, region postal country") —
// the two tabs display location differently; don't unify them.
function fmtLocation(a?: SellShipmentAddress): string {
  if (!a) return DASH
  const parts = [a.postal, a.city, a.region, a.country].filter(Boolean)
  return parts.length ? parts.join(', ') : DASH
}

function fmtAddress(a?: SellShipmentAddress): string {
  if (!a) return DASH
  // address2 now populated by generator (~30%); join with address1 when present
  const parts = [a.address1, a.address2, a.address3].filter(Boolean)
  return parts.length ? parts.join(', ') : DASH
}

function hasHazmat(order: SellShipmentOrder): string {
  return (order.orderLines ?? []).some((l) => l.hazmatCode) ? 'Yes' : 'No'
}

function fmtInt(v: number | undefined): string {
  if (v == null) return DASH
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function orDash(v: string | null | undefined): string {
  return v != null && v !== '' ? v : DASH
}

function mapSpecialServices(services?: SellShipmentSpecialService[]): SpecialServiceVM[] {
  if (!services || services.length === 0) return []
  return services.map((s) => ({ code: s.code, desc: s.desc }))
}

function mapOrder(order: SellShipmentOrder, header: SellShipmentOut): OrderDetailVM {
  const uom = order.grossWeightUomCode
  return {
    orderNumber: order.orderNumber ?? order.orderId,
    shipDirection: order.shipDirectionCode ? shipDirectionLabel(order.shipDirectionCode) : DASH,
    orderDate: DASH,
    paymentTerms: header.freightTerms ? freightTermLabel(header.freightTerms) : DASH,
    shipmentMode: DASH,
    expedited: DASH,
    owningOrganization: order.owningOrganization || DASH,
    consolidatable: order.consolidatable != null ? (order.consolidatable ? 'Yes' : 'No') : DASH,
    equipment: order.equipmentCode || DASH,
    equipmentReferenceNumber: order.equipmentReferenceNumber || DASH,
    specialServices: mapSpecialServices(order.specialServices),
    lsp: DASH,
    carrier: order.customerRequiredCarrier || DASH,
    serviceLevel: DASH,
    transportPriority: DASH,
    shipFrom: {
      siteId: order.origin?.externalIdentifier || order.origin?.partnerId || DASH,
      company: order.origin?.fullName || DASH,
      location: fmtLocation(order.origin),
      address: fmtAddress(order.origin),
      address1: order.origin?.address1 || DASH,
      address2: order.origin?.address2 || DASH,
    },
    shipTo: {
      siteId: order.destination?.externalIdentifier || order.destination?.partnerId || DASH,
      company: order.destination?.fullName || DASH,
      location: fmtLocation(order.destination),
      address: fmtAddress(order.destination),
      address1: order.destination?.address1 || DASH,
      address2: order.destination?.address2 || DASH,
    },
    earliestPickup: order.scheduledShipDate ?? order.requestedShipDate ?? DASH,
    latestPickup: order.requestedShipDate ?? order.scheduledShipDate ?? DASH,
    // 'Yes'/'No' strings, not raw booleans — matches mapFormVmToOrderPane.js:90-91.
    // The consumer renders `{d.pickupAppointment || DASH}`; JSX drops boolean
    // `true` silently, so a checked appointment used to render blank.
    pickupAppointment: order.pickupAppointment != null ? 'Yes' : 'No',
    earliestDelivery: order.scheduledDeliveryDate ?? order.requestedDeliveryDate ?? DASH,
    latestDelivery: order.requestedDeliveryDate ?? order.scheduledDeliveryDate ?? DASH,
    deliveryAppointment: order.deliveryAppointment != null ? 'Yes' : 'No',
    numProducts: order.orderLines?.length ? String(order.orderLines.length) : DASH,
    totalWeight: fmtMeasure(order.netWeightValue ?? order.grossWeightValue, uom, 'LB'),
    totalVolume: fmtMeasure(order.volumeValue, order.volumeUomCode, 'cuft'),
    grossWeight: fmtMeasure(order.grossWeightValue, uom, 'LB'),
    tareWeight: fmtMeasure(order.tareWeightValue, uom, 'LB'),
    hazmat: hasHazmat(order),
    incoterm: header.incotermInfo || DASH,
    incotermLocation: DASH,
    portOfLoading: DASH,
    portOfDischarge: DASH,
    salesOrder: DASH,
    deliveryNumber: DASH,
    poNumber: order.poNumber || DASH,
    proBooking: DASH,
    pickupNumber: order.pickupNumber || DASH,
    confirmationNumber: DASH,
    contactName: order.origin?.contactName || DASH,
    contactEmail: order.origin?.email || DASH,
    contactPhone: order.origin?.phone || DASH,
    destContactName: order.destination?.contactName || DASH,
    destContactPhone: order.destination?.phone || DASH,
    destContactEmail: order.destination?.email || DASH,
    customField1: DASH,
    customField2: DASH,
  }
}

// ── Stops tab ─────────────────────────────────────────────────────────────────

function mapStop(s: SellShipmentStop): StopVM {
  // Build "region postal country" as a single space-joined token, then prefix
  // with "facilityName, city" — matches expected format: "Name, City, TX 77001 US"
  const regionPostalCountry = [s.region, s.postal, s.country].filter(Boolean).join(' ')
  const locParts = [s.facilityName, s.city, regionPostalCountry || undefined].filter(Boolean)
  const loc = locParts.length ? locParts.join(', ') : DASH
  return {
    type: s.stopType,
    stopNumber: s.stopSequence,
    order: (s.orderIds ?? []).join(', ') || DASH,
    orderIds: s.orderIds ?? [],
    location: loc,
    address: orDash(s.address1),
    date: orDash(s.scheduledDateTime),
    appointment: orDash(s.appointmentTime),
    weight: s.grossWeightValue != null
      ? `${fmtInt(s.grossWeightValue)} ${s.grossWeightUomCode ?? 'LB'}`
      : DASH,
    volume: s.volumeValue != null
      ? `${s.volumeValue} ${s.volumeUomCode ?? 'cuft'}`
      : DASH,
    packageCount: s.packageCount != null ? String(s.packageCount) : DASH,
    pickupNo: orDash(s.pickupNumber),
  }
}

function sumOrderWeights(dto: SellShipmentOut): number | undefined {
  const vals = (dto.orderList ?? [])
    .map(o => o.grossWeightValue)
    .filter((v): v is number => v != null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) : undefined
}

// LINX-14541 — Package Count for General Information. No single field for
// this exists anywhere on the wire, only per-order-LINE packageCount. Summed
// across every order the same way sumOrderWeights above already sums
// grossWeightValue — same derivation convention, not a new one.
function sumOrderPackages(dto: SellShipmentOut): number | undefined {
  const vals = (dto.orderList ?? [])
    .flatMap((o) => o.orderLines ?? [])
    .map((l) => l.packageCount)
    .filter((v): v is number => v != null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) : undefined
}

// LINX-14541 — Planning Type for General Information. Not on the wire at the
// shipment level at all: generate.mjs derives mainRow.planningType with this
// exact rule ("RDD if ANY mapped order is RDD, else SSD" — LINX-12902
// verbatim) but never copies it onto the `detail` object this mapper
// receives (public/details/<id>.json has no `planningType` key, confirmed
// against a live generated file). The per-order INGREDIENT
// (planningDateType) IS on the wire — SellShipmentOrder.planningDateType,
// present in every generated JSON — so the shipment-level value is
// recomputed here from real data using the generator's own rule, rather than
// left unrendered or invented outright.
function planningTypeFor(dto: SellShipmentOut): string {
  const orders = dto.orderList ?? []
  if (!orders.length) return DASH
  return orders.some((o) => o.planningDateType === 'RDD') ? 'RDD' : 'SSD'
}

// LINX-12067 (AC audit, 2026-08-10): AC says Distance must "Display distance
// from routing corresponding to current tender option" — the shipment
// header's own distanceMiles (dto.distanceMiles) is a DIFFERENT field, seeded
// independently from the routing option's distanceMiles (generate.mjs:1352
// vs :767), so the two provably disagree for every seeded shipment. "Current
// tender option" isn't defined by the AC; there's an open question to Ramesh
// on whether a pre-acceptance option should count. Until answered: prefer
// Accepted (tender confirmed) > Sent (tendering in progress) > none.
function currentTenderOption(list?: SellShipmentRoutingOption[]): SellShipmentRoutingOption | undefined {
  if (!list || list.length === 0) return undefined
  return list.find((o) => o.status === 'Accepted') ?? list.find((o) => o.status === 'Sent')
}

function mapStops(dto: SellShipmentOut): ShipmentDetailVM['stopsData'] {
  const totalWeight = sumOrderWeights(dto)
  // Shipment-stage overrides win over the derived value (2026-08-11). Both are
  // already display strings, so there is nothing to re-format — the modal
  // stores exactly what it rendered.
  const ov = dto.overrides
  const summary: StopsSummaryVM = {
    // dto.distanceMiles (header) deliberately NOT read here — see
    // currentTenderOption's comment. fmtDistance is shared with
    // mapRoutingOption's own `distance` field so the two tables format
    // identically.
    distance: fmtDistance(currentTenderOption(dto.shippingOptionList)?.distanceMiles),
    // S128 — additive, read by the SpotBoard strip's distance fallback chain
    // ONLY (SpotBoardTab.jsx stripDistance). See StopsSummaryVM for why this
    // is deliberately separate from `distance` above.
    headerDistance: fmtDistance(dto.distanceMiles),
    grossWeight: ov?.grossWeight ?? (totalWeight != null ? `${fmtInt(totalWeight)} LB` : DASH),
    volume: ov?.volume ?? (dto.totalVolumeValue != null
      ? `${dto.totalVolumeValue} ${dto.totalVolumeUomCode ?? 'cuft'}`
      : DASH),
    acceptedCarrier: orDash(dto.acceptedCarrierLabel),
    seedEquipment: orDash(dto.seedEquipment),
    // LINX-12067 (AC audit, 2026-08-10): AC text is "Refer Story for
    // Utilization (Story TBD)", with a bolded note: "In case Utilization
    // story is not ready, please display field as '--'." That story doesn't
    // exist, so dto.utilizationPercent (a real-looking random value from
    // tools/generate.mjs:1357) was rendering as an invented metric. Forced to
    // DASH on purpose at the display layer — generator is left alone (owned
    // elsewhere) and the DTO read below is commented, not deleted, so
    // restoring is a one-line change once the Utilization story ships:
    // dto.utilizationPercent != null ? `${dto.utilizationPercent}%` : DASH
    utilization: DASH,
    packageCount: fmtInt(sumOrderPackages(dto)),
    planningType: planningTypeFor(dto),
  }
  return {
    summary,
    stops: (dto.shipmentStopList ?? []).map(mapStop),
  }
}

// ── Product tab ───────────────────────────────────────────────────────────────

function fmtDollar(v: number | undefined): string {
  if (v == null) return DASH
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function mapLine(l: SellShipmentOrderLine): ProductLineVM {
  return {
    lineNumber: orDash(l.lineNumber),
    shipItem: orDash(l.itemCode),
    description: orDash(l.itemDescription),
    packageCount: l.packageCount != null && l.packageType
      ? `${l.packageCount} ${l.packageType}`
      : l.packageCount != null ? String(l.packageCount) : DASH,
    grossWeight: l.grossWeightValue != null
      ? `${fmtInt(l.grossWeightValue)} ${l.grossWeightUomCode ?? 'LB'}`
      : DASH,
    volume: l.volumeValue != null
      ? `${l.volumeValue} ${l.volumeUomCode ?? 'cuft'}`
      : DASH,
    hazmat: l.hazmatCode != null,
    tareWeight: l.tareWeightValue != null
      ? `${fmtInt(l.tareWeightValue)} ${l.grossWeightUomCode ?? 'LB'}`
      : DASH,
    netWeight: l.netWeightValue != null
      ? `${fmtInt(l.netWeightValue)} ${l.grossWeightUomCode ?? 'LB'}`
      : DASH,
    hazmatClass: orDash(l.hazmatClass),
    hazmatGroup: orDash(l.hazmatGroup),
    hazmatDescription: orDash(l.hazmatDescription),
    hazmatUnNumber: orDash(l.hazmatUnNumber),
    boilingPoint: orDash(l.boilingPoint),
    marinePollutant: orDash(l.marinePollutant),
    wgkClass: orDash(l.wgkClass),
    tunnelCode: orDash(l.tunnelCode),
    productClass: orDash(l.productClass),
    shippingClass: orDash(l.shippingClass),
    flashPoint: orDash(l.flashPoint),
    countryOfOrigin: orDash(l.countryOfOrigin),
    declaredValue: l.declaredValue != null
      ? `${fmtDollar(l.declaredValue)} ${l.declaredValueCurrency ?? 'USD'}`
      : DASH,
    thirdPartRef: orDash(l.thirdPartRef),
    batchLot: orDash(l.batchLot),
    length: l.lengthValue != null ? `${l.lengthValue} FT` : DASH,
    width: l.widthValue != null ? `${l.widthValue} FT` : DASH,
    height: l.heightValue != null ? `${l.heightValue} FT` : DASH,
    dimensions: orDash(l.dimensionsText),
    loadConstraints: orDash(l.loadConstraints),
    toPartnerRef: orDash(l.toPartnerRef),
    thirdPartRefDate: orDash(l.thirdPartRefDate),
  }
}

function mapProducts(dto: SellShipmentOut): ShipmentDetailVM['productData'] {
  return {
    orders: (dto.orderList ?? []).map((o): ProductOrderVM => ({
      orderId: o.orderId,
      lineCount: o.orderLines?.length ?? 0,
      lines: (o.orderLines ?? []).map(mapLine),
    })),
  }
}

// ── Routing guide tab ─────────────────────────────────────────────────────────

function fmtDistance(v: number | undefined): string {
  if (v == null) return DASH
  return `${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`
}

function mapRoutingOption(o: SellShipmentRoutingOption): RoutingOptionVM {
  return {
    rank: o.rank,
    routeRank: o.routeRank ?? o.rank,
    scac: orDash(o.scac),
    carrierName: orDash(o.carrierName),
    equipment: orDash(o.equipmentCode),
    rate: o.rateAmount != null ? fmtDollar(o.rateAmount) : DASH,
    cost: o.totalCostAmount != null ? `${fmtDollar(o.totalCostAmount)} USD` : DASH,
    rateDetails: o.rateDetails ?? { baseRate: 0, currency: 'USD', markup: 0, additionalCharges: [], apTotal: 0, arTotal: 0 },
    // Passed through, NOT defaulted: absent means "contracted rate, no user
    // quote", which is a different state from an explicit 'N' (quote deleted).
    // S120 wrote this field on delete but nothing read it back — the whitelist
    // above silently dropped it on the next load. It is load-bearing now.
    quoteFlag: o.quoteFlag,
    quoteAudit: o.quoteAudit,
    status: o.status ?? null,
    pickupDateTime: o.pickupDateTime ?? null,
    pickupTZ: orDash(o.pickupTZ),
    pickupOrgHours: orDash(o.pickupOrgHours),
    pickupOrgDay: orDash(o.pickupOrgDay),
    deliveryDateTime: o.deliveryDateTime ?? null,
    deliveryTZ: orDash(o.deliveryTZ),
    deliveryOrgHours: orDash(o.deliveryOrgHours),
    transit: o.transitDays != null ? `${o.transitDays} Days` : DASH,
    distance: fmtDistance(o.distanceMiles),
    sl: orDash(o.sl ?? o.serviceLevel),
    linehaul: orDash(o.linehaul),
    routeGroup: orDash(o.routeGroup),
    api: orDash(o.apiSource),
    notifyDateTime: orDash(o.notifyDateTime),
    responseMethod: orDash(o.responseMethod),
    responseDateTime: orDash(o.responseDateTime),
    carrierPickup: orDash(o.carrierPickup),
    deliveryNum: orDash(o.deliveryNum),
    transitTimeSource: orDash(o.transitTimeSource),
    description: orDash(o.description),
    responseUser: o.responseUser ?? null,
    carrierQuoted: orDash(o.carrierQuoted),
    networkLeverage: orDash(o.networkLeverage),
    proNumber: o.proNumber ?? null,
    transportingCarrier: orDash(o.transportingCarrier),
    equipNumber: orDash(o.equipNumber),
    commitment: o.commitment ?? null,
    uom: o.uom ?? null,
    vcEquipNumber: o.vcEquipNumber ?? null,
    vcOpen: o.vcOpen ?? null,
    vcAccept: o.vcAccept ?? null,
    vcDecline: o.vcDecline ?? null,
    carrierApiTenderId: o.carrierApiTenderId ?? null,
    breakPoint: orDash(o.breakPoint),
    rateSource: orDash(o.rateSource),
    distanceSource: orDash(o.distanceSource),
    transitTimeId: orDash(o.transitTimeId),
    loadboardExpiry: orDash(o.loadboardExpiry),
    rcpId: orDash(o.rcpId),
    lcePkId: o.lcePkId ?? null,
    modifyUser: orDash(o.modifyUser),
    modifyDate: orDash(o.modifyDate),
    indirectPoint: orDash(o.indirectPoint),
    roundTrip: orDash(o.roundTrip),
    customerPreferred: orDash(o.customerPreferred),
    orderEquip: orDash(o.orderEquip),
    contactExped: orDash(o.contactExped),
    note: orDash(o.note),
  }
}

/**
 * LINX-13953. A whitelist, like mapRoutingOption — a DTO field not named here
 * is silently dropped. See the GUARD test in this file's spec.
 *
 * Pickup and Delivery are composed to the ticket's own example format,
 * "08/20/2025 14:00 CST, Wed" — date, time, zone, day-of-week. Org hours are
 * deliberately NOT passed: 13953 says twice that "org hrs are not required",
 * the explicit exception that confirms they ARE required on the Quote flow's
 * equivalent field (DEC-98).
 *
 * In practice almost every field below arrives null, because routing returns
 * only five attributes for a dropped carrier. That is expected, not a bug.
 */
function mapDroppedCarrier(d: SellShipmentDroppedCarrier): DroppedCarrierVM {
  // Accepted and Open are meaningless without BOTH the total and its unit —
  // "6" alone reads as six of what, out of what. 13953's Commitment Rules say
  // so three times over ("If Commitment is missing… If UoM is missing… If both
  // are missing, Accepted and Open shall display '--'"). Matches orDash's own
  // notion of missing for uom, so '' gates exactly the way it renders.
  const hasCommitment = d.commitment != null && d.uom != null && d.uom !== ''
  return {
    scac: orDash(d.scac),
    carrierName: orDash(d.carrierName),
    equipment: orDash(d.equipmentCode),
    dropCode: d.dropCode != null ? String(d.dropCode) : DASH,
    reason: orDash(d.reason),
    reasonDescription: orDash(d.reasonDescription),
    routeRank: d.routeRank != null ? String(d.routeRank) : DASH,
    pickup: composeCarrierDateTime(splitDateTime(d.pickupDateTime)),
    delivery: composeCarrierDateTime(splitDateTime(d.deliveryDateTime)),
    startDate: orDash(d.startDate),
    stopDate: orDash(d.stopDate),
    transitTime: orDash(d.transitTime),
    transitSource: orDash(d.transitSource),
    routeGroup: orDash(d.routeGroup),
    rpcId: orDash(d.rpcId),
    ttId: orDash(d.ttId),
    commitment: d.commitment != null ? String(d.commitment) : DASH,
    uom: orDash(d.uom),
    // Never COMPUTED here — the Accepted/Open arithmetic is deferred pending
    // Dave's rules, so the AC's "a CVC ID alone shall not trigger the
    // calculation" is satisfied by construction: there is no calculation to
    // trigger. What IS enforced is the display gate above: a value that arrives
    // without its commitment context is suppressed, not shown orphaned.
    accepted: hasCommitment && d.accepted != null ? String(d.accepted) : DASH,
    open: hasCommitment && d.open != null ? String(d.open) : DASH,
    comment: orDash(d.comment),
    cvcId: orDash(d.cvcId),
    // Booleans, not values: the AC's fallback for these is "unchecked", not '--'.
    orderEquipment: d.orderEquipment === true,
    indirectPoint: d.indirectPoint === true,
  }
}

// Strips $, commas, and trailing units ("Days", "mi", "USD") down to a plain
// number — parseDollar's regex just removes everything but digits/./-, so it
// generically undoes fmtDollar/fmtDistance/the "N Days" format alike despite
// the money-specific name (reused per money.js's own helpers rather than
// hand-rolling a second parser).
function numFrom(formatted: string | undefined): number | undefined {
  return parseDollar(formatted) ?? undefined
}

// The inverse of mapRoutingOption — VM → DTO, used at the ONE choke point
// before a tender write (RoutingGuideTab.jsx's persistTender). Without this,
// `saveTenderOption` serialized the VM's own key names verbatim, and the next
// load's mapRoutingOption reads DTO names it doesn't recognize
// (equipmentCode, rateAmount, totalCostAmount, transitDays, distanceMiles,
// apiSource) — the FIRST tender write on any shipment silently degraded
// equipment/rate/cost/transit/distance/api to '--' on reload (found + fixed
// 2026-08-10, alongside adding Equipment to QuoteModal, which would otherwise
// have shipped visibly broken by this same bug).
//
// Every OTHER key is identical on both sides (verified by diffing
// RoutingOptionVM against SellShipmentRoutingOption field-for-field) and
// round-trips through the dash: orDash('--') is idempotent, so passthrough
// fields need no special-casing even when they're the '--' placeholder.
//
// `rateCurrency`/`totalCostCurrency` exist on the DTO type but mapRoutingOption
// never actually reads them (the read path hardcodes "USD" on `cost` and
// doesn't consult a currency field for `rate` at all) — filled in here from
// rateDetails.currency for schema completeness, not because today's read path
// depends on it. `serviceLevel` (the OTHER unread-on-write DTO field) isn't
// set here: the VM only ever surfaces its value through `sl` (the mapper
// prefers `o.sl ?? o.serviceLevel`), so writing `sl` alone round-trips fine.
export function routingOptionVmToDto(vm: RoutingOptionVM): SellShipmentRoutingOption {
  const { equipment, rate, cost, transit, distance, api, routeRank, ...rest } = vm
  return {
    ...rest,
    equipmentCode: equipment,
    // Pulled out of the spread deliberately. The VM's routeRank is a DISPLAY
    // value and carries '--' for a carrier processed in from the Dropped
    // Carrier list (LINX-13954) — routing returns no route rank for a dropped
    // carrier. The wire field is numeric, so the dash must not survive the
    // write: a non-numeric rank becomes ABSENT, never 0, which would read as
    // a real first-place rank on the next load.
    routeRank:
      routeRank !== '' && routeRank != null && Number.isFinite(Number(routeRank))
        ? Number(routeRank)
        : undefined,
    rateAmount: numFrom(rate),
    rateCurrency: vm.rateDetails?.currency,
    totalCostAmount: numFrom(cost),
    totalCostCurrency: vm.rateDetails?.currency,
    transitDays: numFrom(transit),
    distanceMiles: numFrom(distance),
    apiSource: api,
  }
}

function mapRouting(dto: SellShipmentOut): ShipmentDetailVM['routingData'] {
  return { options: (dto.shippingOptionList ?? []).map(mapRoutingOption) }
}

// ── Cost allocation tab ───────────────────────────────────────────────────────

function fmtCostAmt(v: number | undefined): string {
  // Zero is a valid cost; show "$0.00" not "--"
  if (v == null) return DASH
  return fmtDollar(v)
}

function mapCostOrder(o: SellShipmentOrder): CostOrderVM {
  const c = o.cost
  return {
    orderId: o.orderId,
    directCost: c?.directCostAmount != null ? `${fmtDollar(c.directCostAmount)} USD` : DASH,
    apCost: c?.apTotalAmount != null ? `${fmtDollar(c.apTotalAmount)} USD` : DASH,
    arCost: c?.arTotalAmount != null ? `${fmtDollar(c.arTotalAmount)} USD` : DASH,
    margin: (c?.arTotalAmount != null && c?.apTotalAmount != null)
      ? fmtDollar(c.arTotalAmount - c.apTotalAmount)
      : DASH,
    // LINX-12110 (AC audit, 2026-08-10): all six of these used to be truthy
    // ternaries (`c?.apDiscountAmount ? fmtCostAmt(...) : DASH`), rationalized
    // as "conditional accessorials — a zero/absent charge degrades to '--'".
    // That's wrong: `0` is falsy in JS, so a genuine $0.00 charge was
    // indistinguishable from an absent one and rendered '--', contradicting
    // fmtCostAmt's own documented rule two lines up ("Zero is a valid cost;
    // show $0.00 not --") and inconsistent with apBase/apFuel below, which
    // already null-check correctly. fmtCostAmt already does the `!= null`
    // check internally, so passing the raw (possibly-undefined) amount
    // straight through — same as apBase/apFuel — is sufficient.
    apBase: fmtCostAmt(c?.apBaseAmount),
    apFuel: fmtCostAmt(c?.apFuelAmount),
    apDiscount: fmtCostAmt(c?.apDiscountAmount),
    apHzc: fmtCostAmt(c?.apHzcAmount),
    apSoc: fmtCostAmt(c?.apSocAmount),
    arBase: fmtCostAmt(c?.arBaseAmount),
    arFuel: fmtCostAmt(c?.arFuelAmount),
    arDiscount: fmtCostAmt(c?.arDiscountAmount),
    arHzc: fmtCostAmt(c?.arHzcAmount),
    arSoc: fmtCostAmt(c?.arSocAmount),
  }
}

function mapCost(dto: SellShipmentOut): ShipmentDetailVM['costData'] {
  const cs = dto.costSummary
  // Direct cost is seeded per order; the shipment-level figure the details
  // modal shows is their sum. All-absent stays '--' (not $0.00).
  const directAmounts = (dto.orderList ?? [])
    .map(o => o.cost?.directCostAmount)
    .filter((v): v is number => v != null)
  const summary: CostSummaryVM = {
    directCost: directAmounts.length
      ? fmtDollar(directAmounts.reduce((a, b) => a + b, 0))
      : DASH,
    base: fmtCostAmt(cs?.apBaseAmount),
    discount: fmtCostAmt(cs?.apDiscountAmount),
    fuel: fmtCostAmt(cs?.apFuelAmount),
    accessorials: fmtCostAmt(cs?.apAccessorialsAmount),
    apTotal: fmtCostAmt(cs?.apTotalAmount),
    arTotal: fmtCostAmt(cs?.arTotalAmount),
    margin: (cs?.marginAmount != null && cs?.marginPercent != null)
      ? `${fmtDollar(cs.marginAmount)} (${cs.marginPercent.toFixed(1)}%)`
      : DASH,
  }
  return {
    planned: {
      summary,
      orders: (dto.orderList ?? []).map(mapCostOrder),
    },
  }
}

// ── Instructions tab ──────────────────────────────────────────────────────────

function mapInstructions(dto: SellShipmentOut): ShipmentDetailVM['instructionsData'] {
  return {
    orders: (dto.orderList ?? []).map(o => ({
      // LINX-12070 (AC audit, 2026-08-10): Order Header must show the Client
      // Transportation Order Number, which mapOrder (~:70) already sources as
      // `orderNumber ?? orderId`; this mapper read `orderId` alone. Dormant
      // only because the generator seeds the two equal (generate.mjs:1216-17)
      // — same wrong-field bug class the whitelist-mapper issue shipped
      // twice under.
      orderId: o.orderNumber ?? o.orderId,
      instructions: (o.instructionList ?? []).map(i => ({
        // seq is intentionally NOT routed through orDash: InstructionVM.seq
        // is typed `number` (non-nullable) and orDash is typed for strings
        // only, so this wouldn't type-check — and if it somehow did, it would
        // silently turn seq into a string, breaking the numeric contract for
        // any future consumer (sort/key/math) even though today's renderers
        // (InstructionsTab.jsx, OrderPaneSections.jsx) only display it as
        // text. sequenceNumber is also typed non-nullable on the DTO, so
        // there's no real null case to guard here. Only `text` gets
        // LINX-12070's null-handling treatment, same as every sibling mapper.
        seq: i.sequenceNumber,
        text: orDash(i.text),
      })),
    })),
  }
}

// ── User Defined Fields ───────────────────────────────────────────────────────

// Sparse and customer-supplied: orders with no UDFs keep an empty list rather
// than gaining placeholder keys — absence is meaningful here, not a gap.
function mapUserDefined(dto: SellShipmentOut): ShipmentDetailVM['userDefinedData'] {
  return {
    orders: (dto.orderList ?? []).map(o => ({
      orderId: o.orderId,
      fields: (o.userDefinedFieldList ?? [])
        .filter(f => f?.name && f.value != null && f.value !== '')
        .map(f => ({ name: f.name, value: String(f.value) })),
    })),
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export function mapSellShipmentOutToDetail(dto: SellShipmentOut): ShipmentDetailVM {
  return {
    ratingStatus: orDash(dto.ratingStatus),
    trackingUrl: dto.trackingUrl ?? '',
    orderDetails: (dto.orderList ?? []).map((o) => mapOrder(o, dto)),
    stopsData: mapStops(dto),
    productData: mapProducts(dto),
    routingData: mapRouting(dto),
    droppedCarriers: (dto.droppedCarrierList ?? []).map(mapDroppedCarrier),
    costData: mapCost(dto),
    instructionsData: mapInstructions(dto),
    userDefinedData: mapUserDefined(dto),
    documentsData: { documents: dto.documentList ?? [] },
    notesData: { notes: dto.noteList ?? [] },
    historyData: { entries: dto.historyList ?? [] },
    overrides: dto.overrides,
  }
}
