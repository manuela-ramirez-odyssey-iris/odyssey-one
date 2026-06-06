import type {
  SellShipmentOut,
  SellShipmentOrder,
  SellShipmentAddress,
  SellShipmentStop,
  SellShipmentOrderLine,
  SellShipmentRoutingOption,
} from '../types/sellShipmentOut'
import type {
  OrderDetailVM,
  ProductLineVM,
  ProductOrderVM,
  RoutingOptionVM,
  ShipmentDetailVM,
  StopVM,
  StopsSummaryVM,
} from '../types/shipmentDetail'

const DASH = '--'

function fmtMeasure(value: number | undefined, uom: string | undefined, fallbackUom: string): string {
  if (value == null) return DASH
  return `${value.toLocaleString('en-US')} ${uom ?? fallbackUom}`
}

function fmtLocation(a?: SellShipmentAddress): string {
  if (!a) return DASH
  const parts = [a.postal, a.city, a.region, a.country].filter(Boolean)
  return parts.length ? parts.join(', ') : DASH
}

function fmtAddress(a?: SellShipmentAddress): string {
  if (!a) return DASH
  const parts = [a.address1, a.address2, a.address3].filter(Boolean)
  return parts.length ? parts.join(', ') : DASH
}

function mapShipDirection(code?: string): string {
  if (code === 'O') return 'Outbound'
  if (code === 'I') return 'Inbound'
  return code ?? DASH
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

function mapOrder(order: SellShipmentOrder, header: SellShipmentOut): OrderDetailVM {
  const uom = order.grossWeightUomCode
  return {
    orderNumber: order.orderNumber ?? order.orderId,
    shipDirection: mapShipDirection(order.shipDirectionCode),
    orderDate: DASH,
    paymentTerms: header.freightTerms || DASH,
    shipmentMode: DASH,
    expedited: DASH,
    consolidatable: DASH,
    equipment: DASH,
    specialServices: DASH,
    lsp: DASH,
    carrier: DASH,
    serviceLevel: DASH,
    transportPriority: DASH,
    shipFrom: {
      siteId: order.origin?.externalIdentifier || order.origin?.partnerId || DASH,
      company: order.origin?.fullName || DASH,
      location: fmtLocation(order.origin),
      address: fmtAddress(order.origin),
    },
    shipTo: {
      siteId: order.destination?.externalIdentifier || order.destination?.partnerId || DASH,
      company: order.destination?.fullName || DASH,
      location: fmtLocation(order.destination),
      address: fmtAddress(order.destination),
    },
    earliestPickup: order.scheduledShipDate ?? order.requestedShipDate ?? DASH,
    latestPickup: order.requestedShipDate ?? order.scheduledShipDate ?? DASH,
    pickupAppointment: order.pickupAppointment != null,
    earliestDelivery: order.scheduledDeliveryDate ?? order.requestedDeliveryDate ?? DASH,
    latestDelivery: order.requestedDeliveryDate ?? order.scheduledDeliveryDate ?? DASH,
    deliveryAppointment: order.deliveryAppointment != null,
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
    pickupNumber: DASH,
    confirmationNumber: DASH,
    contactName: order.origin?.contactName || DASH,
    contactEmail: order.origin?.email || DASH,
    contactPhone: order.origin?.phone || DASH,
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

function mapStops(dto: SellShipmentOut): ShipmentDetailVM['stopsData'] {
  const totalWeight = sumOrderWeights(dto)
  const summary: StopsSummaryVM = {
    distance: dto.distanceMiles != null ? `${dto.distanceMiles} mi` : DASH,
    grossWeight: totalWeight != null ? `${fmtInt(totalWeight)} LB` : DASH,
    volume: dto.totalVolumeValue != null
      ? `${dto.totalVolumeValue} ${dto.totalVolumeUomCode ?? 'cuft'}`
      : DASH,
    acceptedCarrier: orDash(dto.acceptedCarrierLabel),
    seedEquipment: orDash(dto.seedEquipment),
    utilization: dto.utilizationPercent != null ? `${dto.utilizationPercent}%` : DASH,
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

function fmtDollarMin2(v: number): string {
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

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
    rate: o.rateAmount != null ? fmtDollarMin2(o.rateAmount) : DASH,
    cost: o.totalCostAmount != null ? `${fmtDollarMin2(o.totalCostAmount)} USD` : DASH,
    rateDetails: o.rateDetails ?? { baseRate: 0, currency: 'USD', markup: 0, additionalCharges: [], apTotal: 0, arTotal: 0 },
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

function mapRouting(dto: SellShipmentOut): ShipmentDetailVM['routingData'] {
  return { options: (dto.shippingOptionList ?? []).map(mapRoutingOption) }
}

// ── Main export ───────────────────────────────────────────────────────────────

export function mapSellShipmentOutToDetail(dto: SellShipmentOut): ShipmentDetailVM {
  return {
    orderDetails: (dto.orderList ?? []).map((o) => mapOrder(o, dto)),
    stopsData: mapStops(dto),
    productData: mapProducts(dto),
    routingData: mapRouting(dto),
    costData: {
      planned: {
        summary: {
          base: DASH, discount: DASH, fuel: DASH, accessorials: DASH,
          apTotal: DASH, arTotal: DASH, margin: DASH,
        },
        orders: [],
      },
    },
    instructionsData: { orders: [] },
    documentsData: { documents: [] },
    notesData: { notes: [] },
    historyData: { entries: [] },
  }
}
