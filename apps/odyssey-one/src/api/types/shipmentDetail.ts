// The detail view-model the existing tabs consume. The mapper outputs this.
// OrderDetailVM matches what OrderTab reads from shipmentDetails.orderDetails[i].
export interface AddressVM {
  siteId: string
  company: string
  location: string
  address: string
}

export interface OrderDetailVM {
  orderNumber: string
  shipDirection: string
  orderDate: string
  paymentTerms: string
  shipmentMode: string
  expedited: string
  consolidatable: string
  equipment: string
  specialServices: string
  lsp: string
  carrier: string
  serviceLevel: string
  transportPriority: string
  shipFrom: AddressVM
  shipTo: AddressVM
  earliestPickup: string
  latestPickup: string
  pickupAppointment: boolean
  earliestDelivery: string
  latestDelivery: string
  deliveryAppointment: boolean
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
  customField1: string
  customField2: string
}

export interface ShipmentDetailVM {
  orderDetails: OrderDetailVM[]
  stopsData: { summary: Record<string, string>; stops: unknown[] }
  productData: { orders: unknown[] }
  routingData: { options: unknown[] }
  costData: { planned: { summary: Record<string, string>; orders: unknown[] } }
  instructionsData: { orders: unknown[] }
  documentsData: { documents: unknown[] }
  notesData: { notes: unknown[] }
  historyData: { entries: unknown[] }
}
