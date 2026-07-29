// Create Manual Order contract — field names VERBATIM from the Phase-2 LLD's
// POST order-service/v3/manual-order payload (Confluence 3401056276; raw dump
// at vault-sources/10-domains/orders/lld/order-service-phase-2.md, ~line 671).
//
// NOTE (plan decision 1): the LLD wraps this payload in "manualOrder" — NOT
// "orderInterface" (that root belongs to the generic /v3/order endpoint).
// This type declares ONLY the subset the create form populates (decision 2);
// all names are verbatim so the live flip is an env-var change. Final
// confirmation against live Swagger remains; mapFormToOrderInterface is the
// single reconciliation point.

export interface OrderStatusInfo {
  orderStatusCode: string   // "RD_4_PLNNG" on create, "DRAFT" on save (LLD remark)
  orderStatusName: string   // "Ready for Planning" | "Draft"
}

export interface SourceApplication {
  sourceApplicationCode: string
  sourceApplicationName: string
}

export interface OrderInstruction {
  instructionNumber: number
  instructionType: string   // backend default "0012" (Q19 — type removed from UI)
  instructionDetail: string
}

export interface OrderCarrierEquipDetail {
  carrierSequence: number
  scacCode?: string         // Customer Required Carrier (free-typed allowed)
  equipmentCode?: string    // Equipment (org-scoped lookup)
}

export interface ManualOrderLine {
  lineIdentifier: number
  shipItemIdentifier: string    // Product ID
  productDescription: string    // ≤75 chars (user ruling 2026-07-28; Jira said 150)
  grossWeightValue: number
  grossWeightUomCode: string
  volumeValue: number
  volumeUomCode: string
  shipClass: string             // label "Product Class" (wire key unchanged)
  // LINX-13893 per-equipment fields — optional; PROVISIONAL wire keys (no LLD
  // home confirmed for the manual-order line shape; reconcile at live flip)
  hazardous?: boolean
  handlingUnit?: string
  handlingUnitCount?: number
  lengthValue?: number
  widthValue?: number
  heightValue?: number
  dimensionUomCode?: string
  harmonizedCode?: string
  declaredValue?: number
  declaredValueCurrency?: string
  manufacturingCountryCode?: string
  stccCode?: string
}

export interface OrderAccessorialDetail {
  accessorialCode: string       // Special Service code (PALEXG, LFT, …)
  orderAccessorialDetailSequence: number
}

export interface UserField {
  userfieldType: string         // 'FLAG' (consolidatable) | 'REFERENCE' (free-form rows) — decision 9
  name: string
  value: string
}

export interface ManualOrder {
  orderNumber?: string          // omitted when blank — backend auto-generates (Q16)
  customerId?: string           // Owning Organization id
  freightTermCode?: string
  shipDirectionCode?: string
  pickupNumber?: string         // guided reference row (Q21)
  poNumber?: string             // guided reference row (Q21)
  requestedDateType?: string    // 'SHIP' | 'DELIVERY' (Q22 radio)
  // Early/Late mapping is PROVISIONAL (plan decision 8; residual for Ramesh):
  requestedPickupDate?: string             // Early Pickup
  requestedPickupTimeZoneCode?: string
  pickupAppointment?: string               // Late Pickup
  pickupAppointmentTimeZoneCode?: string
  requestedDeliveryDate?: string           // Early Delivery
  requestedDeliveryTimeZoneCode?: string
  deliveryAppointment?: string             // Late Delivery
  deliveryAppointmentTimeZoneCode?: string
  equipmentNumber?: string      // Equipment Reference Number (free text)
  originPartnerId?: string
  originFullName?: string
  originAddress1?: string
  originAddress2?: string
  originCity?: string
  originRegion?: string
  originCountry?: string
  originPostal?: string
  originContactName?: string
  originPhone?: string
  originEmail?: string
  destinationPartnerId?: string
  destinationFullName?: string
  destinationAddress1?: string
  destinationAddress2?: string
  destinationCity?: string
  destinationRegion?: string
  destinationCountry?: string
  destinationPostal?: string
  destinationContactName?: string
  destinationPhone?: string
  destinationEmail?: string
  // Header roll-ups (sum of lines, first line's UoM — mock-grade):
  grossWeightValue?: number
  grossWeightUomCode?: string
  volumeValue?: number
  volumeUomCode?: string
  orderStatus?: OrderStatusInfo
  sourceApplication?: SourceApplication
  orderInstructionList?: OrderInstruction[]
  orderCarrierEquipDetailList?: OrderCarrierEquipDetail[]
  orderLines?: ManualOrderLine[]
  orderAccessorialDetails?: OrderAccessorialDetail[]
  userFieldList?: UserField[]
}

export interface CreateOrderRequest {
  manualOrder: ManualOrder
}

// LLD response: { orderId, success, message, data: { /* Order payload */ } }.
// data is typed as what the confirmation page consumes (mock supplies it;
// live reconciliation at flip time).
export interface CreatedOrderData {
  orderNumber: string           // auto-generated = String(orderId), LINX-9742 (sync) — async variant renders "–"
  orderDate: string             // ISO
  orderDateTimeZoneCode: string // "EST"
  shipmentMode: string          // "Ground" — derivation open (Q28); mock constant
}

export interface CreateOrderResponse {
  orderId: number | string
  success: boolean
  message: string
  data: CreatedOrderData | null
}
