// The real shipment-service read contract (GET /sell-shipment-out/{id}).
// Numeric + nested (vs the prototype's pre-formatted view-model). Typed here
// for the fields the Order tab consumes; sibling sections (shipmentStopList,
// shippingOptionList, instructionList…) are added as those tabs are mapped.
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

export interface SellShipmentOrderLine {
  orderLineId?: string
  hazmatCode?: string | null
}

export interface SellShipmentOrder {
  orderId: string
  orderNumber?: string
  customerId?: string
  poNumber?: string
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
  orderList: SellShipmentOrder[]
}
