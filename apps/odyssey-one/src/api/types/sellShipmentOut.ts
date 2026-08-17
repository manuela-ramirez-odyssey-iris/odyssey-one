// The real shipment-service read contract (GET /sell-shipment-out/{id}).
// Numeric + nested (vs the prototype's pre-formatted view-model).

export interface SellShipmentAddress {
  externalIdentifier?: string
  partnerId?: string
  fullName?: string
  address1?: string
  address2?: string
  address3?: string
  city?: string
  region?: string
  country?: string
  postal?: string
  contactName?: string
  phone?: string
  email?: string
}

// Extended line — adds product-tab fields (Plan 2b)
export interface SellShipmentOrderLine {
  orderLineId?: string
  lineNumber?: string
  itemCode?: string
  itemDescription?: string
  packageCount?: number
  packageType?: string
  grossWeightValue?: number
  grossWeightUomCode?: string
  volumeValue?: number
  volumeUomCode?: string
  hazmatCode?: string | null
  hazmatClass?: string | null
  hazmatGroup?: string | null
  hazmatDescription?: string | null
  hazmatUnNumber?: string | null
  boilingPoint?: string | null
  marinePollutant?: string | null
  wgkClass?: string | null
  tunnelCode?: string | null
  productClass?: string
  shippingClass?: string
  flashPoint?: string | null
  countryOfOrigin?: string
  declaredValue?: number
  declaredValueCurrency?: string
  thirdPartRef?: string
  batchLot?: string
  lengthValue?: number
  widthValue?: number
  heightValue?: number
  dimensionsText?: string
  loadConstraints?: string | null
  toPartnerRef?: string
  thirdPartRefDate?: string
  tareWeightValue?: number
  netWeightValue?: number
}

export interface SellShipmentInstruction {
  sequenceNumber: number
  text: string
}

export interface SellShipmentOrderCost {
  apBaseAmount?: number
  apFuelAmount?: number
  apDiscountAmount?: number
  apHzcAmount?: number
  apSocAmount?: number
  apTotalAmount?: number
  arBaseAmount?: number
  arFuelAmount?: number
  arDiscountAmount?: number
  arHzcAmount?: number
  arSocAmount?: number
  arTotalAmount?: number
  directCostAmount?: number
}

export interface SellShipmentSpecialService {
  code: string
  desc: string
}

export interface SellShipmentOrder {
  orderId: string
  orderNumber?: string
  customerId?: string
  owningOrganization?: string
  consolidatable?: boolean
  equipmentCode?: string
  equipmentReferenceNumber?: string | null
  customerRequiredCarrier?: string | null
  pickupNumber?: string | null
  specialServices?: SellShipmentSpecialService[]
  poNumber?: string
  /* RDD/SSD per order (LINX-12898, generate.mjs); shipment-level Planning
     Type is derived from this — see mapSellShipmentOutToDetail's planningTypeFor. */
  planningDateType?: string
  bolNo?: string
  shipDirectionCode?: string // 'O' | 'I'
  origin?: SellShipmentAddress
  destination?: SellShipmentAddress
  scheduledShipDate?: string
  requestedShipDate?: string
  scheduledDeliveryDate?: string
  requestedDeliveryDate?: string
  pickupAppointment?: string | null
  deliveryAppointment?: string | null
  grossWeightValue?: number
  grossWeightUomCode?: string
  tareWeightValue?: number
  netWeightValue?: number
  volumeValue?: number
  volumeUomCode?: string
  orderLines?: SellShipmentOrderLine[]
  instructionList?: SellShipmentInstruction[]
  /* Customer-supplied extras, order-scoped and SPARSE — not a fixed schema.
     Often external in origin (CSV drop / email), so no domain guarantees. */
  userDefinedFieldList?: { name: string; value: string }[]
  cost?: SellShipmentOrderCost
}

// Stop along the route
export interface SellShipmentStop {
  stopSequence: number
  stopType: string  // 'pickup' | 'delivery'
  orderIds?: string[]
  facilityName?: string
  address1?: string
  city?: string
  region?: string
  postal?: string
  country?: string
  scheduledDateTime?: string
  appointmentTime?: string | null
  grossWeightValue?: number
  grossWeightUomCode?: string
  volumeValue?: number
  volumeUomCode?: string
  packageCount?: number | null
  pickupNumber?: string | null
}

export interface SellShipmentAdditionalCharge {
  code: string
  description: string
  amount: number
  currency: string
}

// LINX-13895 "Audit Information" — the six fields the Quote Entry Page shows
// read-only, written by the save in LINX-13896. `initialApAmount` is the AP
// total as it stood BEFORE the first user quote (null when the option had no
// rate at all); `finalApAmount` tracks the current one.
export interface SellShipmentQuoteAudit {
  createdBy: string
  createdDate: string
  updatedBy: string
  updatedDate: string
  initialApAmount: number | null
  finalApAmount: number | null
}

// One carrier option in the routing guide
export interface SellShipmentRoutingOption {
  rank: number
  routeRank?: number
  scac?: string
  carrierName?: string
  equipmentCode?: string
  rateAmount?: number
  rateCurrency?: string
  totalCostAmount?: number
  totalCostCurrency?: string
  rateDetails?: {
    baseRate: number
    currency: string
    markup: number
    additionalCharges: SellShipmentAdditionalCharge[]
    apTotal: number
    arTotal: number
  }
  /** LINX-13896/13897 — 'Y' once a USER-entered quote is saved, 'N' once deleted.
      Absent on a contracted-rate option, which is what tells the two apart. */
  quoteFlag?: 'Y' | 'N'
  /** LINX-13895 "Audit Information" / LINX-13896 "Audit Information". Written on
      every quote save, retained after a delete so the history survives. */
  quoteAudit?: SellShipmentQuoteAudit
  status?: string | null
  pickupDateTime?: string | null
  pickupTZ?: string
  pickupOrgHours?: string
  pickupOrgDay?: string
  deliveryDateTime?: string | null
  deliveryTZ?: string
  deliveryOrgHours?: string
  transitDays?: number
  distanceMiles?: number
  serviceLevel?: string | null
  routeGroup?: string
  apiSource?: string
  notifyDateTime?: string | null
  responseMethod?: string | null
  responseDateTime?: string | null
  carrierPickup?: string | null
  deliveryNum?: string | null
  transitTimeSource?: string
  description?: string | null
  responseUser?: string | null
  carrierQuoted?: string
  networkLeverage?: string
  proNumber?: string | null
  transportingCarrier?: string | null
  equipNumber?: string | null
  commitment?: number | null
  uom?: string | null
  vcEquipNumber?: string | null
  vcOpen?: number | null
  vcAccept?: number | null
  vcDecline?: number | null
  carrierApiTenderId?: string | null
  breakPoint?: string | null
  rateSource?: string | null
  distanceSource?: string | null
  transitTimeId?: string | null
  loadboardExpiry?: string | null
  rcpId?: string | null
  lcePkId?: number | null
  modifyUser?: string | null
  modifyDate?: string | null
  indirectPoint?: string | null
  roundTrip?: string
  customerPreferred?: string
  orderEquip?: string | null
  contactExped?: string | null
  note?: string | null
  linehaul?: string
  sl?: string
}

export interface SellShipmentCostSummary {
  apBaseAmount?: number
  apFuelAmount?: number
  apDiscountAmount?: number
  apAccessorialsAmount?: number
  apTotalAmount?: number
  arTotalAmount?: number
  marginAmount?: number
  marginPercent?: number
}

/** One shipment-stage reference row, as edited in the Shipment Details modal. */
export interface ShipmentReferenceOverride {
  id: string
  type: string
  value: string
}

/**
 * Shipment-STAGE field edits (2026-08-11). Server-side only — this is not a
 * field the real OdysseyONE contract returns; our API attaches it from the
 * `shipments.overrides` column. Every key is optional and an absent key means
 * "no override", NOT "cleared".
 *
 * `references` is keyed by orderNumber and REPLACES that order's whole
 * reference list when present — the modal seeds the draft from the current
 * values, so a save always carries the complete set. Per-field merging would
 * make deleting a reference impossible.
 */
export interface ShipmentOverridesDTO {
  mode?: string
  grossWeight?: string
  volume?: string
  references?: Record<string, ShipmentReferenceOverride[]>
}

export interface SellShipmentOut {
  shipmentId: string
  shipmentType?: string
  customerId?: string
  customerName?: string
  shipDirection?: string
  freightTerms?: string
  incotermInfo?: string
  numberOfStops?: number
  pgiFlag?: boolean
  ratingStatus?: string
  /** Tracking Link (R2-1). Shape INVENTED — no such field in the real contract yet. */
  trackingUrl?: string
  distanceMiles?: number
  totalVolumeValue?: number
  totalVolumeUomCode?: string
  acceptedCarrierLabel?: string
  seedEquipment?: string
  utilizationPercent?: number
  costSummary?: SellShipmentCostSummary
  orderList: SellShipmentOrder[]
  shipmentStopList?: SellShipmentStop[]
  shippingOptionList?: SellShipmentRoutingOption[]
  /* Fake-data-only attachments (no real-contract equivalent yet): passed through
     verbatim to the Documents / Notes / History panes. */
  documentList?: unknown[]
  noteList?: unknown[]
  historyList?: unknown[]
  overrides?: ShipmentOverridesDTO
}
