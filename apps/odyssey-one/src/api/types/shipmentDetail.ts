// The detail view-model the existing tabs consume. The mapper outputs this.

import type { ShipmentOverridesDTO } from './sellShipmentOut'


export interface AddressVM {
  siteId: string
  company: string
  location: string
  address: string
  /* split lines for the Orders-tab party columns (Figma 4292:17716) —
     `address` stays the joined form for existing consumers */
  address1: string
  address2: string
}

export interface SpecialServiceVM {
  code: string
  desc: string
}

export interface OrderDetailVM {
  orderNumber: string
  shipDirection: string
  orderDate: string
  paymentTerms: string
  shipmentMode: string
  expedited: string
  owningOrganization: string
  consolidatable: string
  equipment: string
  equipmentReferenceNumber: string
  specialServices: SpecialServiceVM[]
  lsp: string
  carrier: string
  serviceLevel: string
  transportPriority: string
  shipFrom: AddressVM
  shipTo: AddressVM
  earliestPickup: string
  latestPickup: string
  pickupAppointment: string
  earliestDelivery: string
  latestDelivery: string
  deliveryAppointment: string
  numProducts: string
  totalWeight: string
  totalVolume: string
  grossWeight: string
  tareWeight: string
  hazmat: string
  incoterm: string
  incotermLocation: string
  portOfLoading: string
  portOfDischarge: string
  salesOrder: string
  deliveryNumber: string
  poNumber: string
  proBooking: string
  pickupNumber: string
  confirmationNumber: string
  contactName: string
  contactEmail: string
  contactPhone: string
  destContactName: string
  destContactPhone: string
  destContactEmail: string
  customField1: string
  customField2: string
}

// ── Stops tab ────────────────────────────────────────────────
export interface StopVM {
  type: string
  stopNumber: number
  /* Joined display form, kept for existing consumers (Stops pane). */
  order: string
  /* Split form — a stop can serve several orders and the details modal renders
     one link per order (same joined/split pattern as AddressVM). */
  orderIds: string[]
  location: string
  address: string
  date: string
  appointment: string
  weight: string
  volume: string
  packageCount: string
  pickupNo: string
}

export interface StopsSummaryVM {
  distance: string
  grossWeight: string
  volume: string
  acceptedCarrier: string
  seedEquipment: string
  utilization: string
}

// ── Product tab ──────────────────────────────────────────────
export interface ProductLineVM {
  lineNumber: string
  shipItem: string
  description: string
  packageCount: string
  grossWeight: string
  volume: string
  hazmat: boolean
  tareWeight: string
  netWeight: string
  hazmatClass: string
  hazmatGroup: string
  hazmatDescription: string
  hazmatUnNumber: string
  boilingPoint: string
  marinePollutant: string
  wgkClass: string
  tunnelCode: string
  productClass: string
  shippingClass: string
  flashPoint: string
  countryOfOrigin: string
  declaredValue: string
  thirdPartRef: string
  batchLot: string
  length: string
  width: string
  height: string
  dimensions: string
  loadConstraints: string
  toPartnerRef: string
  thirdPartRefDate: string
}

export interface ProductOrderVM {
  orderId: string
  lineCount: number
  lines: ProductLineVM[]
}

// ── Routing guide tab ────────────────────────────────────────
export interface RoutingAdditionalChargeVM {
  code: string
  description: string
  amount: number
  currency: string
}

export interface RoutingOptionVM {
  rank: number
  routeRank: number
  scac: string
  carrierName: string
  equipment: string
  rate: string
  cost: string
  rateDetails: {
    baseRate: number
    currency: string
    markup: number
    additionalCharges: RoutingAdditionalChargeVM[]
    apTotal: number
    arTotal: number
  }
  status: string | null
  pickupDateTime: string | null
  pickupTZ: string
  pickupOrgHours: string
  pickupOrgDay: string
  deliveryDateTime: string | null
  deliveryTZ: string
  deliveryOrgHours: string
  transit: string
  distance: string
  sl: string
  linehaul: string
  routeGroup: string
  api: string
  notifyDateTime: string
  responseMethod: string
  responseDateTime: string
  carrierPickup: string
  deliveryNum: string
  transitTimeSource: string
  description: string
  responseUser: string | null
  carrierQuoted: string
  networkLeverage: string
  proNumber: string | null
  transportingCarrier: string
  equipNumber: string
  commitment: number | null
  uom: string | null
  vcEquipNumber: string | null
  vcOpen: number | null
  vcAccept: number | null
  vcDecline: number | null
  carrierApiTenderId: string | null
  breakPoint: string
  rateSource: string
  distanceSource: string
  transitTimeId: string
  loadboardExpiry: string
  rcpId: string
  lcePkId: number | null
  modifyUser: string
  modifyDate: string
  indirectPoint: string
  roundTrip: string
  customerPreferred: string
  orderEquip: string
  contactExped: string
  note: string
}

// ── Cost tab ─────────────────────────────────────────────────
export interface CostSummaryVM {
  base: string
  discount: string
  fuel: string
  accessorials: string
  apTotal: string
  arTotal: string
  margin: string
  /* Shipment-level rollup — the wire carries directCostAmount per ORDER only,
     so this is the sum across orderList (Shipment Details modal, 2026-07-30). */
  directCost: string
}

export interface CostOrderVM {
  orderId: string
  directCost: string
  apCost: string
  arCost: string
  margin: string
  apBase: string
  apFuel: string
  apDiscount: string
  apHzc: string
  apSoc: string
  arBase: string
  arFuel: string
  arDiscount: string
  arHzc: string
  arSoc: string
}

// ── Instructions tab ─────────────────────────────────────────
export interface InstructionVM {
  seq: number
  text: string
}

export interface InstructionOrderVM {
  orderId: string
  instructions: InstructionVM[]
}

// ── User Defined Fields ──────────────────────────────────────
// Order-scoped, sparse, customer-supplied (often external — CSV/email), so
// neither the key set nor the presence of any key is guaranteed.
export interface UserDefinedFieldVM {
  name: string
  value: string
}

export interface UserDefinedOrderVM {
  orderId: string
  fields: UserDefinedFieldVM[]
}

// ── Top-level VM ─────────────────────────────────────────────
export interface ShipmentDetailVM {
  /* Shipment header field — on the wire since S92 but never mapped until the
     Shipment Details modal needed it (2026-07-30). */
  ratingStatus: string
  /** Tracking Link URL, or '' when absent — the strip renders '--' for empty. */
  trackingUrl: string
  orderDetails: OrderDetailVM[]
  stopsData: { summary: StopsSummaryVM; stops: StopVM[] }
  productData: { orders: ProductOrderVM[] }
  routingData: { options: RoutingOptionVM[] }
  costData: { planned: { summary: CostSummaryVM; orders: CostOrderVM[] } }
  instructionsData: { orders: InstructionOrderVM[] }
  userDefinedData: { orders: UserDefinedOrderVM[] }
  documentsData: { documents: unknown[] }
  notesData: { notes: unknown[] }
  historyData: { entries: unknown[] }
  /** Shipment-stage field edits, passed through untouched. Absent = none. */
  overrides?: ShipmentOverridesDTO
}
