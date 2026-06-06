import type {
  SellShipmentOut,
  SellShipmentOrder,
  SellShipmentAddress,
} from '../types/sellShipmentOut'
import type { OrderDetailVM, ShipmentDetailVM } from '../types/shipmentDetail'

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

function mapOrder(order: SellShipmentOrder, header: SellShipmentOut): OrderDetailVM {
  const uom = order.grossWeightUomCode
  return {
    orderNumber: order.orderNumber ?? order.orderId,
    shipDirection: mapShipDirection(order.shipDirectionCode),
    orderDate: DASH,
    paymentTerms: header.freightTerms ?? DASH,
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
      siteId: order.origin?.externalIdentifier ?? order.origin?.partnerId ?? DASH,
      company: order.origin?.fullName ?? DASH,
      location: fmtLocation(order.origin),
      address: fmtAddress(order.origin),
    },
    shipTo: {
      siteId: order.destination?.externalIdentifier ?? order.destination?.partnerId ?? DASH,
      company: order.destination?.fullName ?? DASH,
      location: fmtLocation(order.destination),
      address: fmtAddress(order.destination),
    },
    earliestPickup: order.scheduledShipDate ?? order.requestedShipDate ?? DASH,
    latestPickup: order.requestedShipDate ?? order.scheduledShipDate ?? DASH,
    pickupAppointment: order.pickupAppointment != null,
    earliestDelivery: order.scheduledDeliveryDate ?? order.requestedDeliveryDate ?? DASH,
    latestDelivery: order.requestedDeliveryDate ?? order.scheduledDeliveryDate ?? DASH,
    deliveryAppointment: order.deliveryAppointment != null,
    numProducts: String((order.orderLines ?? []).length || DASH),
    totalWeight: fmtMeasure(order.netWeightValue ?? order.grossWeightValue, uom, 'LB'),
    totalVolume: fmtMeasure(order.volumeValue, order.volumeUomCode, 'cuft'),
    grossWeight: fmtMeasure(order.grossWeightValue, uom, 'LB'),
    tareWeight: fmtMeasure(order.tareWeightValue, uom, 'LB'),
    hazmat: hasHazmat(order),
    incoterm: header.incotermInfo ?? DASH,
    incotermLocation: DASH,
    portOfLoading: DASH,
    portOfDischarge: DASH,
    salesOrder: DASH,
    deliveryNumber: DASH,
    poNumber: order.poNumber ?? DASH,
    proBooking: DASH,
    pickupNumber: DASH,
    confirmationNumber: DASH,
    contactName: order.origin?.contactName ?? DASH,
    contactEmail: order.origin?.email ?? DASH,
    contactPhone: order.origin?.phone ?? DASH,
    customField1: DASH,
    customField2: DASH,
  }
}

// Sibling sections the Order-tab slice does not map yet — emitted empty so their
// tabs render gracefully. Later slices replace these with real mappings.
function emptySiblings(): Omit<ShipmentDetailVM, 'orderDetails'> {
  return {
    stopsData: { summary: {}, stops: [] },
    productData: { orders: [] },
    routingData: { options: [] },
    costData: { planned: { summary: {}, orders: [] } },
    instructionsData: { orders: [] },
    documentsData: { documents: [] },
    notesData: { notes: [] },
    historyData: { entries: [] },
  }
}

export function mapSellShipmentOutToDetail(dto: SellShipmentOut): ShipmentDetailVM {
  return {
    orderDetails: (dto.orderList ?? []).map((o) => mapOrder(o, dto)),
    ...emptySiblings(),
  }
}
