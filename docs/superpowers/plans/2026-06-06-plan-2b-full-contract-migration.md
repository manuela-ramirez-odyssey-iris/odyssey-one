# Plan 2b — Full SellShipmentOut Contract Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the mapper to cover all 8 sibling tabs, rewrite the generator to emit `SellShipmentOut` format, and cut mock mode over to the mapper so the prototype runs entirely on the real contract shape.

**Architecture:** Each tab gets a dedicated `map*()` function inside `mapSellShipmentOutToDetail.ts`; `emptySiblings()` is deleted. The generator changes only its output format (faker logic stays); mock mode in `shipmentService.ts` calls `mapSellShipmentOutToDetail` on the loaded JSON exactly like live mode does. `live-sim` is retired (mock is now equivalent).

**Tech Stack:** TypeScript + Vitest (mapper tests), Node.js ESM (generator), `@faker-js/faker` (seed 42).

---

## File map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/api/types/sellShipmentOut.ts` | Add stop, routing-option, cost, instruction, extended order-line interfaces |
| Modify | `src/api/types/shipmentDetail.ts` | Replace `unknown[]` stubs with concrete VM interfaces |
| Modify | `src/api/mappers/mapSellShipmentOutToDetail.ts` | Add 5 tab mappers; delete `emptySiblings()` |
| Modify | `src/api/mappers/mapSellShipmentOutToDetail.test.ts` | Add describe blocks for each new tab |
| Modify | `src/api/fixtures/sellShipmentOut.sample.ts` | Add stops, routing options, cost, instructions, extended lines |
| Modify (full rewrite) | `apps/odyssey-one/tools/generate.mjs` | Emit `SellShipmentOut` DTO format, not view-model |
| Modify | `src/api/services/shipmentService.ts` | Mock path runs mapper; retire `live-sim` |
| Modify | `src/api/config.ts` | Remove `live-sim` from `ApiMode` union |

All paths are relative to `apps/odyssey-one/` unless stated otherwise.

---

## Task 1: Extend DTO types

**Files:**
- Modify: `apps/odyssey-one/src/api/types/sellShipmentOut.ts`

- [ ] **Step 1: Replace the file with the extended version**

```typescript
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
  instructionList?: SellShipmentInstruction[]
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
  distanceMiles?: number
  totalVolumeValue?: number
  totalVolumeUomCode?: string
  acceptedCarrierLabel?: string  // e.g. "ABFS - TL" for stops summary
  seedEquipment?: string
  utilizationPercent?: number
  costSummary?: SellShipmentCostSummary
  orderList: SellShipmentOrder[]
  shipmentStopList?: SellShipmentStop[]
  shippingOptionList?: SellShipmentRoutingOption[]
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd apps/odyssey-one && npm run typecheck
```

Expected: no errors (existing mapper still has `emptySiblings()` with `{}` — that's fine for now).

- [ ] **Step 3: Commit**

```bash
git add apps/odyssey-one/src/api/types/sellShipmentOut.ts
git commit -m "feat(api): extend SellShipmentOut DTO for all 8 tabs (Plan 2b)"
```

---

## Task 2: Extend view-model types

**Files:**
- Modify: `apps/odyssey-one/src/api/types/shipmentDetail.ts`

- [ ] **Step 1: Replace the file with concrete VM interfaces**

```typescript
// The detail view-model the existing tabs consume. The mapper outputs this.

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

// ── Stops tab ────────────────────────────────────────────────
export interface StopVM {
  type: string
  stopNumber: number
  order: string
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
  rate: string         // "$X.XX"
  cost: string         // "$X.XX USD"
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
  transit: string      // "N Days"
  distance: string     // "X.XX mi"
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

// ── Top-level VM ─────────────────────────────────────────────
export interface ShipmentDetailVM {
  orderDetails: OrderDetailVM[]
  stopsData: { summary: StopsSummaryVM; stops: StopVM[] }
  productData: { orders: ProductOrderVM[] }
  routingData: { options: RoutingOptionVM[] }
  costData: { planned: { summary: CostSummaryVM; orders: CostOrderVM[] } }
  instructionsData: { orders: InstructionOrderVM[] }
  documentsData: { documents: unknown[] }
  notesData: { notes: unknown[] }
  historyData: { entries: unknown[] }
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd apps/odyssey-one && npm run typecheck
```

Expected: the mapper's `emptySiblings()` will now fail to compile because `{ summary: {}, stops: [] }` doesn't satisfy `{ summary: StopsSummaryVM; stops: StopVM[] }`. That error is expected — we fix it in Task 3.

- [ ] **Step 3: Commit**

```bash
git add apps/odyssey-one/src/api/types/shipmentDetail.ts
git commit -m "feat(api): make ShipmentDetailVM sibling types concrete (Plan 2b)"
```

---

## Task 3: Stops tab mapper

**Files:**
- Modify: `src/api/mappers/mapSellShipmentOutToDetail.ts`
- Modify: `src/api/mappers/mapSellShipmentOutToDetail.test.ts`

- [ ] **Step 1: Add the stops describe block to the test file**

Add this inside the outer `describe('mapSellShipmentOutToDetail', ...)` block, after the existing tests:

```typescript
describe('stopsData', () => {
  it('maps one stop per shipmentStopList entry', () => {
    const dto: SellShipmentOut = {
      ...sellShipmentOutSample,
      shipmentStopList: [
        {
          stopSequence: 1,
          stopType: 'pickup',
          orderIds: ['ORD-1001'],
          facilityName: 'Acme Houston Plant',
          address1: '100 Refinery Rd',
          city: 'Houston',
          region: 'TX',
          postal: '77001',
          country: 'US',
          scheduledDateTime: '06/10/2026 08:00 CST',
          appointmentTime: '08:00 CST',
          grossWeightValue: 18207,
          grossWeightUomCode: 'LB',
          volumeValue: 420,
          volumeUomCode: 'cuft',
          packageCount: 12,
          pickupNumber: 'PU-820622',
        },
        {
          stopSequence: 2,
          stopType: 'delivery',
          orderIds: ['ORD-1001'],
          facilityName: 'Midwest Distribution Center',
          address1: '8800 Industrial Ave',
          city: 'Chicago',
          region: 'IL',
          postal: '60601',
          country: 'US',
          scheduledDateTime: '06/13/2026 09:00 CST',
          appointmentTime: null,
          grossWeightValue: 18207,
          grossWeightUomCode: 'LB',
          volumeValue: 420,
          volumeUomCode: 'cuft',
          packageCount: null,
          pickupNumber: null,
        },
      ],
    }
    const result = mapSellShipmentOutToDetail(dto)
    expect(result.stopsData.stops).toHaveLength(2)
  })

  it('formats stop fields into view-model strings', () => {
    const dto: SellShipmentOut = {
      ...sellShipmentOutSample,
      shipmentStopList: [
        {
          stopSequence: 1,
          stopType: 'pickup',
          orderIds: ['ORD-1001'],
          facilityName: 'Acme Houston Plant',
          address1: '100 Refinery Rd',
          city: 'Houston',
          region: 'TX',
          postal: '77001',
          country: 'US',
          scheduledDateTime: '06/10/2026 08:00 CST',
          appointmentTime: '08:00 CST',
          grossWeightValue: 18207,
          grossWeightUomCode: 'LB',
          volumeValue: 420,
          volumeUomCode: 'cuft',
          packageCount: 12,
          pickupNumber: 'PU-820622',
        },
      ],
    }
    const stop = mapSellShipmentOutToDetail(dto).stopsData.stops[0]
    expect(stop.type).toBe('pickup')
    expect(stop.stopNumber).toBe(1)
    expect(stop.order).toBe('ORD-1001')
    expect(stop.location).toBe('Acme Houston Plant, Houston, TX 77001 US')
    expect(stop.address).toBe('100 Refinery Rd')
    expect(stop.date).toBe('06/10/2026 08:00 CST')
    expect(stop.appointment).toBe('08:00 CST')
    expect(stop.weight).toBe('18,207 LB')
    expect(stop.volume).toBe('420 cuft')
    expect(stop.packageCount).toBe('12')
    expect(stop.pickupNo).toBe('PU-820622')
  })

  it('degrades null appointment and pickupNumber to "--"', () => {
    const dto: SellShipmentOut = {
      ...sellShipmentOutSample,
      shipmentStopList: [
        {
          stopSequence: 1,
          stopType: 'delivery',
          appointmentTime: null,
          pickupNumber: null,
        },
      ],
    }
    const stop = mapSellShipmentOutToDetail(dto).stopsData.stops[0]
    expect(stop.appointment).toBe('--')
    expect(stop.pickupNo).toBe('--')
  })

  it('builds summary from shipment header fields', () => {
    const dto: SellShipmentOut = {
      ...sellShipmentOutSample,
      distanceMiles: 367.52,
      grossWeightValue: undefined,  // falls back to sum of orderList weights
      totalVolumeValue: 600,
      totalVolumeUomCode: 'cuft',
      acceptedCarrierLabel: 'ABFS - TL',
      seedEquipment: 'VAN',
      utilizationPercent: 74,
      orderList: [
        { ...sellShipmentOutSample.orderList[0], grossWeightValue: 18207 },
        { ...sellShipmentOutSample.orderList[1], grossWeightValue: 9050 },
      ],
    }
    const summary = mapSellShipmentOutToDetail(dto).stopsData.summary
    expect(summary.distance).toBe('367.52 mi')
    expect(summary.grossWeight).toBe('27,257 LB')  // 18207 + 9050
    expect(summary.volume).toBe('600 cuft')
    expect(summary.acceptedCarrier).toBe('ABFS - TL')
    expect(summary.seedEquipment).toBe('VAN')
    expect(summary.utilization).toBe('74%')
  })

  it('degrades summary to "--" fields when header data absent', () => {
    const dto: SellShipmentOut = { ...sellShipmentOutSample, orderList: [] }
    const summary = mapSellShipmentOutToDetail(dto).stopsData.summary
    expect(summary.distance).toBe('--')
    expect(summary.grossWeight).toBe('--')
  })
})
```

- [ ] **Step 2: Run — expect FAIL (mapStops not implemented)**

```bash
cd apps/odyssey-one && npx vitest run src/api/mappers/mapSellShipmentOutToDetail.test.ts
```

Expected: compile error or test failures — the `stopsData` describe block can't pass yet.

- [ ] **Step 3: Add `mapStops()` to the mapper file**

Add these helpers and the function to `mapSellShipmentOutToDetail.ts` (before `emptySiblings`):

```typescript
import type {
  SellShipmentOut,
  SellShipmentOrder,
  SellShipmentAddress,
  SellShipmentStop,
} from '../types/sellShipmentOut'
import type {
  OrderDetailVM,
  ShipmentDetailVM,
  StopVM,
  StopsSummaryVM,
  ProductOrderVM,
  RoutingOptionVM,
  CostSummaryVM,
  CostOrderVM,
  InstructionOrderVM,
} from '../types/shipmentDetail'

// (keep existing DASH + fmtMeasure + fmtLocation + fmtAddress + mapShipDirection + hasHazmat + mapOrder)

function fmtDollar(v: number | undefined): string {
  if (v == null) return DASH
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDollarUSD(v: number | undefined): string {
  if (v == null) return DASH
  return `${fmtDollar(v)} USD`
}

function fmtInt(v: number | undefined): string {
  if (v == null) return DASH
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function fmtPct(v: number | undefined): string {
  if (v == null) return DASH
  return `${v}%`
}

function orDash(v: string | null | undefined): string {
  return v != null && v !== '' ? v : DASH
}

function mapStop(s: SellShipmentStop): StopVM {
  const loc = [s.facilityName, s.city, s.region ? `${s.region} ${s.postal ?? ''}` : s.postal, s.country]
    .filter(Boolean)
    .join(', ')
  return {
    type: s.stopType,
    stopNumber: s.stopSequence,
    order: (s.orderIds ?? []).join(', ') || DASH,
    location: loc || DASH,
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
```

- [ ] **Step 4: Replace `emptySiblings()` call with real mappers (partial — only stopsData for now)**

In `mapSellShipmentOutToDetail`:

```typescript
export function mapSellShipmentOutToDetail(dto: SellShipmentOut): ShipmentDetailVM {
  return {
    orderDetails: (dto.orderList ?? []).map((o) => mapOrder(o, dto)),
    stopsData: mapStops(dto),
    productData: { orders: [] },
    routingData: { options: [] },
    costData: { planned: { summary: { base: DASH, discount: DASH, fuel: DASH, accessorials: DASH, apTotal: DASH, arTotal: DASH, margin: DASH }, orders: [] } },
    instructionsData: { orders: [] },
    documentsData: { documents: [] },
    notesData: { notes: [] },
    historyData: { entries: [] },
  }
}
```

Also update the existing "empty sibling" test since `stopsData` is no longer `{ summary: {}, stops: [] }`:

```typescript
// Replace:
it('emits empty sibling sections so other tabs degrade gracefully', () => {
  expect(vm.stopsData).toEqual({ summary: {}, stops: [] })
  ...
})

// With:
it('emits empty routing/cost/instructions/docs/notes/history sections', () => {
  expect(vm.productData).toEqual({ orders: [] })
  expect(vm.routingData).toEqual({ options: [] })
  expect(vm.instructionsData).toEqual({ orders: [] })
  expect(vm.documentsData).toEqual({ documents: [] })
  expect(vm.notesData).toEqual({ notes: [] })
  expect(vm.historyData).toEqual({ entries: [] })
})

it('stops degrade gracefully when shipmentStopList absent', () => {
  const dto: SellShipmentOut = { ...sellShipmentOutSample, shipmentStopList: undefined }
  const result = mapSellShipmentOutToDetail(dto)
  expect(result.stopsData.stops).toHaveLength(0)
  expect(result.stopsData.summary.distance).toBe('--')
})
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd apps/odyssey-one && npx vitest run src/api/mappers/mapSellShipmentOutToDetail.test.ts
```

Expected: all stops tests pass; remaining tabs are stubs (empty arrays) so no regression.

- [ ] **Step 6: Typecheck**

```bash
cd apps/odyssey-one && npm run typecheck
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts \
        apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.test.ts
git commit -m "feat(api): map stops tab from SellShipmentOut (Plan 2b)"
```

---

## Task 4: Product tab mapper

**Files:**
- Modify: `src/api/mappers/mapSellShipmentOutToDetail.ts`
- Modify: `src/api/mappers/mapSellShipmentOutToDetail.test.ts`

- [ ] **Step 1: Add the product describe block to the test file**

```typescript
describe('productData', () => {
  it('maps one ProductOrderVM per order in orderList', () => {
    expect(vm.productData.orders).toHaveLength(2)
  })

  it('maps line count and lines array', () => {
    // sample order 0 has 1 line, order 1 has 2 lines
    expect(vm.productData.orders[0].lineCount).toBe(1)
    expect(vm.productData.orders[0].lines).toHaveLength(1)
    expect(vm.productData.orders[1].lineCount).toBe(2)
  })

  it('formats line weight and volume as strings', () => {
    // order 0 line 0: grossWeightValue=5000, LB; volumeValue=100, cuft
    const line = vm.productData.orders[0].lines[0]
    expect(line.grossWeight).toBe('5,000 LB')
    expect(line.volume).toBe('100 cuft')
    expect(line.tareWeight).toBe('1,000 LB')
    expect(line.netWeight).toBe('4,000 LB')
  })

  it('formats package count as "N type"', () => {
    const line = vm.productData.orders[0].lines[0]
    expect(line.packageCount).toBe('10 Drums')
  })

  it('sets hazmat boolean from hazmatCode presence', () => {
    expect(vm.productData.orders[0].lines[0].hazmat).toBe(false)
    expect(vm.productData.orders[1].lines[1].hazmat).toBe(true)
  })

  it('formats declaredValue as "$X.XX USD"', () => {
    const line = vm.productData.orders[0].lines[0]
    expect(line.declaredValue).toBe('$25,000.00 USD')
  })

  it('degrades absent line fields to "--"', () => {
    const dto: SellShipmentOut = {
      ...sellShipmentOutSample,
      orderList: [{ orderId: 'ORD-X', orderLines: [{ orderLineId: 'L1' }] }],
    }
    const line = mapSellShipmentOutToDetail(dto).productData.orders[0].lines[0]
    expect(line.shipItem).toBe('--')
    expect(line.description).toBe('--')
    expect(line.packageCount).toBe('--')
    expect(line.hazmat).toBe(false)
    expect(line.declaredValue).toBe('--')
  })
})
```

The tests reference `vm` (from the fixture) which currently has `orderLines` with minimal fields. Before running, the fixture needs product-tab fields. **Update `sellShipmentOut.sample.ts` minimally** so the tests can assert concrete values:

In `sellShipmentOut.sample.ts`, extend `orderLines` in order 0:
```typescript
orderLines: [{
  orderLineId: 'L1',
  lineNumber: '001',
  itemCode: '22071H5N',
  itemDescription: 'Ethylene Glycol Industrial',
  packageCount: 10,
  packageType: 'Drums',
  grossWeightValue: 5000,
  grossWeightUomCode: 'LB',
  volumeValue: 100,
  volumeUomCode: 'cuft',
  hazmatCode: null,
  hazmatClass: null,
  hazmatGroup: null,
  hazmatDescription: null,
  hazmatUnNumber: null,
  boilingPoint: null,
  marinePollutant: null,
  wgkClass: null,
  tunnelCode: null,
  productClass: 'Commodity',
  shippingClass: '667383',
  flashPoint: null,
  countryOfOrigin: 'USA',
  declaredValue: 25000,
  declaredValueCurrency: 'USD',
  thirdPartRef: 'S9696',
  batchLot: 'BL-44545',
  lengthValue: 5,
  widthValue: 6,
  heightValue: 5,
  dimensionsText: '41" x 39" x 71"',
  loadConstraints: null,
  toPartnerRef: 'TP-67812',
  thirdPartRefDate: '06/10/2026',
  tareWeightValue: 1000,
  netWeightValue: 4000,
}],
```

For order 1 line 1 (hazmat line), set `hazmatCode: 'UN1830'` and add the other hazmat fields.

- [ ] **Step 2: Run — expect FAIL**

```bash
cd apps/odyssey-one && npx vitest run src/api/mappers/mapSellShipmentOutToDetail.test.ts
```

- [ ] **Step 3: Add `mapProducts()` to the mapper**

```typescript
function mapLine(l: SellShipmentOrderLine): ProductLineVM {
  const DASH = '--'
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
    orders: (dto.orderList ?? []).map(o => ({
      orderId: o.orderId,
      lineCount: o.orderLines?.length ?? 0,
      lines: (o.orderLines ?? []).map(mapLine),
    })),
  }
}
```

Update the main function to use it:
```typescript
productData: mapProducts(dto),
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd apps/odyssey-one && npx vitest run src/api/mappers/mapSellShipmentOutToDetail.test.ts
```

- [ ] **Step 5: Typecheck + commit**

```bash
cd apps/odyssey-one && npm run typecheck
git add apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts \
        apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.test.ts \
        apps/odyssey-one/src/api/fixtures/sellShipmentOut.sample.ts
git commit -m "feat(api): map product tab from SellShipmentOut (Plan 2b)"
```

---

## Task 5: Routing tab mapper

**Files:**
- Modify: `src/api/mappers/mapSellShipmentOutToDetail.ts`
- Modify: `src/api/mappers/mapSellShipmentOutToDetail.test.ts`

- [ ] **Step 1: Add routing describe block to tests**

```typescript
describe('routingData', () => {
  it('maps one RoutingOptionVM per shippingOptionList entry', () => {
    // fixture needs at least 1 routing option — added in Task 8 fixture extension
    // For now test against a minimal DTO:
    const dto: SellShipmentOut = {
      ...sellShipmentOutSample,
      shippingOptionList: [
        {
          rank: 1,
          routeRank: 2,
          scac: 'ABFS',
          carrierName: 'ABF FREIGHT SYSTEM',
          equipmentCode: 'VAN',
          rateAmount: 395.33,
          rateCurrency: 'USD',
          totalCostAmount: 2162.72,
          totalCostCurrency: 'USD',
          rateDetails: {
            baseRate: 916.96,
            currency: 'USD',
            markup: 165.19,
            additionalCharges: [{ code: 'SOC', description: 'Stop-Off Charge', amount: 494.06, currency: 'USD' }],
            apTotal: 2162.72,
            arTotal: 2327.91,
          },
          status: 'Accepted',
          pickupDateTime: '01/20/2026 14:30 CST',
          pickupTZ: 'CST',
          pickupOrgHours: '12:00 - 18:30',
          pickupOrgDay: 'No',
          deliveryDateTime: '01/24/2026 14:30 CST',
          deliveryTZ: 'CST',
          deliveryOrgHours: '08:00 - 14:59',
          transitDays: 5,
          distanceMiles: 1337.39,
          serviceLevel: '97%',
          routeGroup: 'Primary',
          apiSource: 'API',
          linehaul: 'Completed',
        },
      ],
    }
    const options = mapSellShipmentOutToDetail(dto).routingData.options
    expect(options).toHaveLength(1)
    expect(options[0].rank).toBe(1)
    expect(options[0].carrierName).toBe('ABF FREIGHT SYSTEM')
    expect(options[0].rate).toBe('$395.33')
    expect(options[0].cost).toBe('$2,162.72 USD')
    expect(options[0].transit).toBe('5 Days')
    expect(options[0].distance).toBe('1,337.39 mi')
    expect(options[0].status).toBe('Accepted')
    expect(options[0].rateDetails.baseRate).toBe(916.96)
  })

  it('degrades absent numeric fields to "--"', () => {
    const dto: SellShipmentOut = {
      ...sellShipmentOutSample,
      shippingOptionList: [{ rank: 1, status: null }],
    }
    const opt = mapSellShipmentOutToDetail(dto).routingData.options[0]
    expect(opt.rate).toBe('--')
    expect(opt.cost).toBe('--')
    expect(opt.transit).toBe('--')
    expect(opt.distance).toBe('--')
  })

  it('passes string fields through unchanged', () => {
    const dto: SellShipmentOut = {
      ...sellShipmentOutSample,
      shippingOptionList: [{ rank: 1, routeGroup: 'Backup', apiSource: 'EDI', linehaul: 'Pending', sl: '92%' }],
    }
    const opt = mapSellShipmentOutToDetail(dto).routingData.options[0]
    expect(opt.routeGroup).toBe('Backup')
    expect(opt.api).toBe('EDI')
    expect(opt.linehaul).toBe('Pending')
    expect(opt.sl).toBe('92%')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd apps/odyssey-one && npx vitest run src/api/mappers/mapSellShipmentOutToDetail.test.ts
```

- [ ] **Step 3: Add `mapRouting()` to the mapper**

```typescript
function mapRoutingOption(o: SellShipmentRoutingOption): RoutingOptionVM {
  return {
    rank: o.rank,
    routeRank: o.routeRank ?? o.rank,
    scac: orDash(o.scac),
    carrierName: orDash(o.carrierName),
    equipment: orDash(o.equipmentCode),
    rate: o.rateAmount != null ? fmtDollar(o.rateAmount) : DASH,
    cost: o.totalCostAmount != null ? fmtDollarUSD(o.totalCostAmount) : DASH,
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
    distance: o.distanceMiles != null
      ? `${o.distanceMiles.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`
      : DASH,
    sl: orDash(o.serviceLevel),
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
```

Wire it: `routingData: mapRouting(dto),`

- [ ] **Step 4: Run tests — expect PASS + typecheck + commit**

```bash
cd apps/odyssey-one && npx vitest run src/api/mappers/mapSellShipmentOutToDetail.test.ts && npm run typecheck
git add apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts \
        apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.test.ts
git commit -m "feat(api): map routing guide tab from SellShipmentOut (Plan 2b)"
```

---

## Task 6: Cost tab mapper

**Files:**
- Modify: `src/api/mappers/mapSellShipmentOutToDetail.ts`
- Modify: `src/api/mappers/mapSellShipmentOutToDetail.test.ts`

- [ ] **Step 1: Add cost describe block to tests**

```typescript
describe('costData', () => {
  it('builds summary from costSummary header', () => {
    const dto: SellShipmentOut = {
      ...sellShipmentOutSample,
      orderList: [],
      costSummary: {
        apBaseAmount: 1384.16,
        apFuelAmount: 553.66,
        apDiscountAmount: 0,
        apAccessorialsAmount: 293.36,
        apTotalAmount: 2231.18,
        arTotalAmount: 2922.84,
        marginAmount: 691.66,
        marginPercent: 31.0,
      },
    }
    const summary = mapSellShipmentOutToDetail(dto).costData.planned.summary
    expect(summary.base).toBe('$1,384.16')
    expect(summary.discount).toBe('$0.00')
    expect(summary.fuel).toBe('$553.66')
    expect(summary.accessorials).toBe('$293.36')
    expect(summary.apTotal).toBe('$2,231.18')
    expect(summary.arTotal).toBe('$2,922.84')
    expect(summary.margin).toBe('$691.66 (31.0%)')
  })

  it('maps one CostOrderVM per order', () => {
    const dto: SellShipmentOut = {
      ...sellShipmentOutSample,
      orderList: [
        {
          orderId: 'ORD-1001',
          cost: {
            apBaseAmount: 1384.16,
            apFuelAmount: 553.66,
            apDiscountAmount: 0,
            apHzcAmount: 0,
            apSocAmount: 293.36,
            apTotalAmount: 2231.18,
            arBaseAmount: 1813.25,
            arFuelAmount: 725.29,
            arDiscountAmount: 0,
            arHzcAmount: 0,
            arSocAmount: 0,
            arTotalAmount: 2922.84,
            directCostAmount: 2565.86,
          },
        },
      ],
    }
    const order = mapSellShipmentOutToDetail(dto).costData.planned.orders[0]
    expect(order.orderId).toBe('ORD-1001')
    expect(order.apCost).toBe('$2,231.18 USD')
    expect(order.arCost).toBe('$2,922.84 USD')
    expect(order.apBase).toBe('$1,384.16')
    expect(order.apFuel).toBe('$553.66')
    expect(order.apDiscount).toBe('$0.00')
    expect(order.apSoc).toBe('$293.36')
    expect(order.apHzc).toBe('--')
  })

  it('degrades missing cost fields to "--"', () => {
    const dto: SellShipmentOut = {
      ...sellShipmentOutSample,
      orderList: [{ orderId: 'ORD-X' }],
    }
    const order = mapSellShipmentOutToDetail(dto).costData.planned.orders[0]
    expect(order.apCost).toBe('--')
    expect(order.apBase).toBe('--')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd apps/odyssey-one && npx vitest run src/api/mappers/mapSellShipmentOutToDetail.test.ts
```

- [ ] **Step 3: Add `mapCost()` to the mapper**

```typescript
function fmtCostAmt(v: number | undefined): string {
  // Zero is a valid cost; show "$0.00" not "--"
  if (v == null) return DASH
  return fmtDollar(v)
}

function mapCostOrder(o: SellShipmentOrder): CostOrderVM {
  const c = o.cost
  return {
    orderId: o.orderId,
    directCost: c?.directCostAmount != null ? fmtDollarUSD(c.directCostAmount) : DASH,
    apCost: c?.apTotalAmount != null ? fmtDollarUSD(c.apTotalAmount) : DASH,
    arCost: c?.arTotalAmount != null ? fmtDollarUSD(c.arTotalAmount) : DASH,
    margin: (c?.arTotalAmount != null && c?.apTotalAmount != null)
      ? fmtDollar(c.arTotalAmount - c.apTotalAmount)
      : DASH,
    apBase: fmtCostAmt(c?.apBaseAmount),
    apFuel: fmtCostAmt(c?.apFuelAmount),
    apDiscount: fmtCostAmt(c?.apDiscountAmount),
    apHzc: c?.apHzcAmount ? fmtCostAmt(c.apHzcAmount) : DASH,
    apSoc: c?.apSocAmount ? fmtCostAmt(c.apSocAmount) : DASH,
    arBase: fmtCostAmt(c?.arBaseAmount),
    arFuel: fmtCostAmt(c?.arFuelAmount),
    arDiscount: fmtCostAmt(c?.arDiscountAmount),
    arHzc: c?.arHzcAmount ? fmtCostAmt(c.arHzcAmount) : DASH,
    arSoc: c?.arSocAmount ? fmtCostAmt(c.arSocAmount) : DASH,
  }
}

function mapCost(dto: SellShipmentOut): ShipmentDetailVM['costData'] {
  const cs = dto.costSummary
  const summary: CostSummaryVM = {
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
```

Wire it: `costData: mapCost(dto),`

- [ ] **Step 4: Run tests — PASS + typecheck + commit**

```bash
cd apps/odyssey-one && npx vitest run src/api/mappers/mapSellShipmentOutToDetail.test.ts && npm run typecheck
git add apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts \
        apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.test.ts
git commit -m "feat(api): map cost allocation tab from SellShipmentOut (Plan 2b)"
```

---

## Task 7: Instructions tab mapper

**Files:**
- Modify: `src/api/mappers/mapSellShipmentOutToDetail.ts`
- Modify: `src/api/mappers/mapSellShipmentOutToDetail.test.ts`

- [ ] **Step 1: Add instructions describe block**

```typescript
describe('instructionsData', () => {
  it('maps instructionList per order to InstructionOrderVM', () => {
    const dto: SellShipmentOut = {
      ...sellShipmentOutSample,
      orderList: [
        {
          orderId: 'ORD-1001',
          instructionList: [
            { sequenceNumber: 1, text: 'Drivers must wear face coverings.' },
            { sequenceNumber: 2, text: 'Deliver to dock 26B only.' },
          ],
        },
      ],
    }
    const orders = mapSellShipmentOutToDetail(dto).instructionsData.orders
    expect(orders).toHaveLength(1)
    expect(orders[0].orderId).toBe('ORD-1001')
    expect(orders[0].instructions).toHaveLength(2)
    expect(orders[0].instructions[0].seq).toBe(1)
    expect(orders[0].instructions[0].text).toBe('Drivers must wear face coverings.')
  })

  it('emits empty instructions array for orders with no instructionList', () => {
    const dto: SellShipmentOut = {
      ...sellShipmentOutSample,
      orderList: [{ orderId: 'ORD-X' }],
    }
    const orders = mapSellShipmentOutToDetail(dto).instructionsData.orders
    expect(orders[0].instructions).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Add `mapInstructions()` to the mapper**

```typescript
function mapInstructions(dto: SellShipmentOut): ShipmentDetailVM['instructionsData'] {
  return {
    orders: (dto.orderList ?? []).map(o => ({
      orderId: o.orderId,
      instructions: (o.instructionList ?? []).map(i => ({
        seq: i.sequenceNumber,
        text: i.text,
      })),
    })),
  }
}
```

Wire it: `instructionsData: mapInstructions(dto),`

- [ ] **Step 4: Run tests — PASS + typecheck + commit**

```bash
cd apps/odyssey-one && npx vitest run src/api/mappers/mapSellShipmentOutToDetail.test.ts && npm run typecheck
git add apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts \
        apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.test.ts
git commit -m "feat(api): map instructions tab from SellShipmentOut (Plan 2b)"
```

---

## Task 8: Extend fixture with all new fields

**Files:**
- Modify: `src/api/fixtures/sellShipmentOut.sample.ts`

- [ ] **Step 1: Replace the fixture with the extended version**

Add to the existing two-order fixture:
- `distanceMiles`, `totalVolumeValue`, `totalVolumeUomCode`, `acceptedCarrierLabel`, `seedEquipment`, `utilizationPercent`
- `costSummary`
- `shipmentStopList` (2 stops)
- `shippingOptionList` (2 routing options — one Accepted, one null)
- Extend each order's `orderLines` with full product fields (as shown in Task 4 Step 1)
- Add `instructionList` to each order
- Add `cost` to each order

```typescript
import type { SellShipmentOut } from '../types/sellShipmentOut'

export const sellShipmentOutSample: SellShipmentOut = {
  shipmentId: '25690001',
  shipmentType: 'sell',
  customerId: 'ACME_CHM_01',
  customerName: 'Acme Chemicals',
  shipDirection: 'Outbound',
  freightTerms: 'Pre-Paid',
  incotermInfo: 'FOB',
  numberOfStops: 2,
  pgiFlag: false,
  ratingStatus: 'Not Rated',
  distanceMiles: 1337.39,
  totalVolumeValue: 600,
  totalVolumeUomCode: 'cuft',
  acceptedCarrierLabel: 'ABFS - TL',
  seedEquipment: 'VAN',
  utilizationPercent: 74,
  costSummary: {
    apBaseAmount: 1384.16,
    apFuelAmount: 553.66,
    apDiscountAmount: 0,
    apAccessorialsAmount: 293.36,
    apTotalAmount: 2231.18,
    arTotalAmount: 2922.84,
    marginAmount: 691.66,
    marginPercent: 31.0,
  },
  shipmentStopList: [
    {
      stopSequence: 1,
      stopType: 'pickup',
      orderIds: ['ORD-1001'],
      facilityName: 'Acme Houston Plant',
      address1: '100 Refinery Rd',
      city: 'Houston',
      region: 'TX',
      postal: '77001',
      country: 'US',
      scheduledDateTime: '06/10/2026 08:00 CST',
      appointmentTime: '08:00 CST',
      grossWeightValue: 18207,
      grossWeightUomCode: 'LB',
      volumeValue: 420,
      volumeUomCode: 'cuft',
      packageCount: 12,
      pickupNumber: 'PU-820622',
    },
    {
      stopSequence: 2,
      stopType: 'delivery',
      orderIds: ['ORD-1001', 'ORD-1002'],
      facilityName: 'Midwest Distribution Center',
      address1: '8800 Industrial Ave',
      city: 'Chicago',
      region: 'IL',
      postal: '60601',
      country: 'US',
      scheduledDateTime: '06/13/2026 09:00 CST',
      appointmentTime: null,
      grossWeightValue: 27257,
      grossWeightUomCode: 'LB',
      volumeValue: 600,
      volumeUomCode: 'cuft',
      packageCount: null,
      pickupNumber: null,
    },
  ],
  shippingOptionList: [
    {
      rank: 1,
      routeRank: 1,
      scac: 'ABFS',
      carrierName: 'ABF FREIGHT SYSTEM',
      equipmentCode: 'VAN',
      rateAmount: 1384.16,
      rateCurrency: 'USD',
      totalCostAmount: 2231.18,
      totalCostCurrency: 'USD',
      rateDetails: {
        baseRate: 1384.16,
        currency: 'USD',
        markup: 165.19,
        additionalCharges: [
          { code: 'SOC', description: 'Stop-Off Charge', amount: 494.06, currency: 'USD' },
        ],
        apTotal: 2231.18,
        arTotal: 2922.84,
      },
      status: 'Accepted',
      pickupDateTime: '06/10/2026 08:00 CST',
      pickupTZ: 'CST',
      pickupOrgHours: '07:00 - 17:00',
      pickupOrgDay: 'No',
      deliveryDateTime: '06/13/2026 09:00 CST',
      deliveryTZ: 'CST',
      deliveryOrgHours: '08:00 - 16:00',
      transitDays: 3,
      distanceMiles: 1337.39,
      serviceLevel: '97%',
      routeGroup: 'Primary',
      apiSource: 'API',
      linehaul: 'Completed',
      notifyDateTime: '06/08/2026 10:00 CST',
      responseMethod: 'API Update',
      responseDateTime: '06/08/2026 10:30 CST',
      carrierPickup: 'ABF-820622',
      deliveryNum: 'ABF-001342',
      transitTimeSource: 'SMC',
      description: 'Primary route',
      responseUser: 'Dana Pierce',
      carrierQuoted: 'Yes',
      networkLeverage: '22%',
      proNumber: 'PRO-12345678',
      transportingCarrier: 'ABF FREIGHT SYSTEM',
      equipNumber: 'EQ-ABCDE1',
      commitment: 5,
      uom: 'Loads/Week',
      vcEquipNumber: 'EQ-VAN01',
      vcOpen: 2,
      vcAccept: 3,
      vcDecline: 0,
      carrierApiTenderId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      breakPoint: 'Dallas',
      rateSource: 'Contract',
      distanceSource: 'PC Miler',
      transitTimeId: 'TT-ABCDE001',
      loadboardExpiry: '--',
      rcpId: 'RCP-ABCDE1',
      lcePkId: 123456,
      modifyUser: 'Sam Ortiz',
      modifyDate: '06/07/2026 14:00 CST',
      indirectPoint: 'N/A',
      roundTrip: 'No',
      customerPreferred: 'Yes',
      orderEquip: 'VAN',
      contactExped: 'Dana Pierce +1-713-555-0142',
      note: '--',
    },
    {
      rank: 2,
      routeRank: 2,
      scac: 'ODFL',
      carrierName: 'OLD DOMINION FREIGHT LINE',
      equipmentCode: 'REEFER',
      rateAmount: 1600.00,
      totalCostAmount: 2400.00,
      rateDetails: {
        baseRate: 1600.00,
        currency: 'USD',
        markup: 200.00,
        additionalCharges: [],
        apTotal: 2400.00,
        arTotal: 2800.00,
      },
      status: null,
      transitDays: 4,
      distanceMiles: 1400.00,
      routeGroup: 'Backup',
      apiSource: 'EDI',
      linehaul: 'Pending',
      sl: '90%',
    },
  ],
  orderList: [
    {
      orderId: 'ORD-1001',
      orderNumber: 'SO-660001',
      customerId: 'ACME_CHM_01',
      poNumber: 'PO-770001',
      bolNo: 'BOL-880001',
      shipDirectionCode: 'O',
      origin: {
        externalIdentifier: 'SITE-HOU-01',
        partnerId: 'PARTNER-01',
        fullName: 'Acme Houston Plant',
        address1: '100 Refinery Rd',
        city: 'Houston',
        region: 'TX',
        country: 'US',
        postal: '77001',
        contactName: 'Dana Pierce',
        phone: '+1-713-555-0142',
        email: 'dana.pierce@example.com',
      },
      destination: {
        externalIdentifier: 'SITE-CHI-04',
        fullName: 'Midwest Distribution Center',
        address1: '8800 Industrial Ave',
        city: 'Chicago',
        region: 'IL',
        country: 'US',
        postal: '60601',
      },
      scheduledShipDate: '06/10/2026 08:00 CST',
      requestedShipDate: '06/10/2026 12:00 CST',
      scheduledDeliveryDate: '06/13/2026 09:00 CST',
      requestedDeliveryDate: '06/13/2026 17:00 CST',
      pickupAppointment: '08:00 CST',
      deliveryAppointment: null,
      grossWeightValue: 18207,
      grossWeightUomCode: 'LB',
      tareWeightValue: 3641,
      netWeightValue: 14566,
      volumeValue: 420,
      volumeUomCode: 'cuft',
      instructionList: [
        { sequenceNumber: 1, text: 'Drivers must wear face coverings.' },
        { sequenceNumber: 2, text: 'Deliver to dock 26B only.' },
      ],
      cost: {
        apBaseAmount: 800.00,
        apFuelAmount: 320.00,
        apDiscountAmount: 0,
        apHzcAmount: 0,
        apSocAmount: 170.00,
        apTotalAmount: 1290.00,
        arBaseAmount: 1048.00,
        arFuelAmount: 419.20,
        arDiscountAmount: 0,
        arHzcAmount: 0,
        arSocAmount: 222.70,
        arTotalAmount: 1689.90,
        directCostAmount: 1483.50,
      },
      orderLines: [
        {
          orderLineId: 'L1',
          lineNumber: '001',
          itemCode: '22071H5N',
          itemDescription: 'Ethylene Glycol Industrial',
          packageCount: 10,
          packageType: 'Drums',
          grossWeightValue: 5000,
          grossWeightUomCode: 'LB',
          volumeValue: 100,
          volumeUomCode: 'cuft',
          hazmatCode: null,
          hazmatClass: null,
          hazmatGroup: null,
          hazmatDescription: null,
          hazmatUnNumber: null,
          boilingPoint: null,
          marinePollutant: null,
          wgkClass: null,
          tunnelCode: null,
          productClass: 'Commodity',
          shippingClass: '667383',
          flashPoint: null,
          countryOfOrigin: 'USA',
          declaredValue: 25000,
          declaredValueCurrency: 'USD',
          thirdPartRef: 'S9696',
          batchLot: 'BL-44545',
          lengthValue: 5,
          widthValue: 6,
          heightValue: 5,
          dimensionsText: '41" x 39" x 71"',
          loadConstraints: null,
          toPartnerRef: 'TP-67812',
          thirdPartRefDate: '06/10/2026',
          tareWeightValue: 1000,
          netWeightValue: 4000,
        },
      ],
    },
    {
      orderId: 'ORD-1002',
      orderNumber: 'SO-660002',
      customerId: 'ACME_CHM_01',
      poNumber: 'PO-770002',
      shipDirectionCode: 'O',
      origin: {
        externalIdentifier: 'SITE-HOU-01',
        fullName: 'Acme Houston Plant',
        address1: '100 Refinery Rd',
        city: 'Houston',
        region: 'TX',
        country: 'US',
        postal: '77001',
      },
      destination: {
        externalIdentifier: 'SITE-DAL-02',
        fullName: 'Dallas Hub',
        address1: '55 Logistics Pkwy',
        city: 'Dallas',
        region: 'TX',
        country: 'US',
        postal: '75201',
      },
      scheduledShipDate: '06/11/2026 07:00 CST',
      requestedShipDate: '06/11/2026 10:00 CST',
      scheduledDeliveryDate: '06/12/2026 14:00 CST',
      requestedDeliveryDate: '06/12/2026 18:00 CST',
      pickupAppointment: null,
      deliveryAppointment: '14:00 CST',
      grossWeightValue: 9050,
      grossWeightUomCode: 'LB',
      tareWeightValue: 1810,
      netWeightValue: 7240,
      volumeValue: 180,
      volumeUomCode: 'cuft',
      instructionList: [
        { sequenceNumber: 1, text: 'Hazmat: UN1830. Class 8. Packing Group II.' },
      ],
      cost: {
        apBaseAmount: 584.16,
        apFuelAmount: 233.66,
        apDiscountAmount: 0,
        apHzcAmount: 100.00,
        apSocAmount: 123.36,
        apTotalAmount: 941.18,
        arBaseAmount: 765.25,
        arFuelAmount: 306.09,
        arDiscountAmount: 0,
        arHzcAmount: 131.00,
        arSocAmount: 161.60,
        arTotalAmount: 1233.94,
        directCostAmount: 1082.36,
      },
      orderLines: [
        {
          orderLineId: 'L1',
          lineNumber: '001',
          itemCode: '28042B9G',
          itemDescription: 'Sulfuric Acid 93%',
          packageCount: 8,
          packageType: 'Drums',
          grossWeightValue: 4000,
          grossWeightUomCode: 'LB',
          volumeValue: 80,
          volumeUomCode: 'cuft',
          hazmatCode: null,
          hazmatClass: null,
          hazmatGroup: null,
          hazmatDescription: null,
          hazmatUnNumber: null,
          productClass: 'Commodity',
          shippingClass: '478493',
          countryOfOrigin: 'USA',
          declaredValue: 15000,
          declaredValueCurrency: 'USD',
          tareWeightValue: 800,
          netWeightValue: 3200,
        },
        {
          orderLineId: 'L2',
          lineNumber: '002',
          itemCode: '28042B9G',
          itemDescription: 'Sulfuric Acid 93%',
          packageCount: 5,
          packageType: 'Drums',
          grossWeightValue: 5050,
          grossWeightUomCode: 'LB',
          volumeValue: 100,
          volumeUomCode: 'cuft',
          hazmatCode: 'UN1830',
          hazmatClass: 'Class 8',
          hazmatGroup: 'II',
          hazmatDescription: 'Corrosive liquid',
          hazmatUnNumber: 'UN1830',
          boilingPoint: '337 F',
          marinePollutant: 'No',
          wgkClass: '2',
          tunnelCode: 'E',
          productClass: 'Commodity',
          shippingClass: '567291',
          flashPoint: null,
          countryOfOrigin: 'USA',
          declaredValue: 18000,
          declaredValueCurrency: 'USD',
          thirdPartRef: 'S7823',
          batchLot: 'BL-47231',
          lengthValue: 3,
          widthValue: 3,
          heightValue: 4,
          dimensionsText: '24" x 24" x 48"',
          loadConstraints: 'Temperature Controlled',
          toPartnerRef: 'TP-55912',
          thirdPartRefDate: '06/11/2026',
          tareWeightValue: 1010,
          netWeightValue: 4040,
        },
      ],
    },
  ],
}
```

- [ ] **Step 2: Run all tests — expect PASS**

```bash
cd apps/odyssey-one && npx vitest run src/api/mappers/mapSellShipmentOutToDetail.test.ts
```

- [ ] **Step 3: Typecheck + commit**

```bash
cd apps/odyssey-one && npm run typecheck
git add apps/odyssey-one/src/api/fixtures/sellShipmentOut.sample.ts
git commit -m "feat(api): extend sample fixture with all 8-tab fields (Plan 2b)"
```

---

## Task 9: Rewrite generator to emit SellShipmentOut format

**Files:**
- Modify (full rewrite of the `detail` object only): `apps/odyssey-one/tools/generate.mjs`

The generator is 1061 lines. The faker logic and helper functions are unchanged. Only the `detail` assembly changes. Key structural changes:

**A. Product lines** — change from view-model strings to DTO numeric fields:

```js
// BEFORE
lines.push({
  lineNumber: String(l + 1).padStart(3, '0'),
  shipItem: product.item,
  description: product.desc,
  packageCount: `${n} ${packageType}`,
  grossWeight: `${fmtInt(lineWeight)} LB`,
  volume: `${v} cuft`,
  hazmat: product.hazmat,
  tareWeight: `${fmtInt(tareWeight)} LB`,
  netWeight: `${fmtInt(lineWeight - tareWeight)} LB`,
  hazmatClass: product.hazmat ? product.hClass : '--',
  // ...
  declaredValue: `$${fmt(n)} USD`,
  // ...
});

// AFTER
lines.push({
  orderLineId: `${orderId}-L${l + 1}`,
  lineNumber: String(l + 1).padStart(3, '0'),
  itemCode: product.item,
  itemDescription: product.desc,
  packageCount: faker.number.int({ min: 5, max: 80 }),
  packageType,
  grossWeightValue: lineWeight,
  grossWeightUomCode: 'LB',
  volumeValue: faker.number.int({ min: 20, max: 200 }),
  volumeUomCode: 'cuft',
  hazmatCode: product.hazmat ? product.unNumber : null,
  hazmatClass: product.hazmat ? product.hClass : null,
  hazmatGroup: product.hazmat ? product.hGroup : null,
  hazmatDescription: product.hazmat ? (HAZMAT_DESCRIPTIONS[product.hClass] || product.hClass) : null,
  hazmatUnNumber: product.hazmat ? product.unNumber : null,
  boilingPoint: product.hazmat ? `${faker.number.int({ min: 150, max: 400 })} F` : null,
  marinePollutant: product.hazmat ? (faker.number.int({ min: 1, max: 100 }) <= 30 ? 'Yes' : 'No') : null,
  wgkClass: product.hazmat ? pick(['1', '2', '3']) : null,
  tunnelCode: product.hazmat ? pick(TUNNEL_CODES) : null,
  productClass: pick(PRODUCT_CLASSES),
  shippingClass: String(faker.number.int({ min: 100000, max: 999999 })),
  flashPoint: product.hazmat ? `${faker.number.int({ min: 60, max: 200 })} F` : null,
  countryOfOrigin: 'USA',
  declaredValue: faker.number.int({ min: 2000, max: 50000 }),
  declaredValueCurrency: 'USD',
  thirdPartRef: `S${faker.number.int({ min: 1000, max: 9999 })}`,
  batchLot: `BL-${faker.number.int({ min: 40000, max: 49999 })}`,
  lengthValue: faker.number.int({ min: 2, max: 6 }),
  widthValue: faker.number.int({ min: 2, max: 6 }),
  heightValue: faker.number.int({ min: 2, max: 6 }),
  dimensionsText: `${faker.number.int({ min: 24, max: 96 })}" x ${faker.number.int({ min: 24, max: 48 })}" x ${faker.number.int({ min: 24, max: 72 })}"`,
  loadConstraints: pick(LOAD_CONSTRAINTS) === '--' ? null : pick(LOAD_CONSTRAINTS),
  toPartnerRef: `TP-${faker.number.int({ min: 10000, max: 99999 })}`,
  thirdPartRefDate: formatShortDate(thirdPartRefDate),
  tareWeightValue: tareWeight,
  netWeightValue: lineWeight - tareWeight,
});
```

**B. Stops** — change from pre-formatted strings to DTO fields:

```js
// BEFORE
stops.push({
  type: 'pickup',
  stopNumber: s + 1,
  order: orders.slice(...).map(o => o.orderId).join(', '),
  location: `${stopLoc.facility}, ${stopLoc.city}, ...`,
  address: `${faker.location.streetAddress()}, ...`,
  date: `${formatDate(baseDate)} ${hour}:00 CST`,
  appointment: `${hour}:00 CST`,
  weight: `${fmtInt(Math.round(grossWeight / pickupStopCount))} LB`,
  volume: `${v} cuft`,
  packageCount: `${n}`,
  pickupNo: ...,
});

// AFTER
stops.push({
  stopSequence: s + 1,
  stopType: 'pickup',
  orderIds: orders.slice(...).map(o => o.orderId),
  facilityName: stopLoc.facility,
  address1: faker.location.streetAddress(),
  city: stopLoc.city,
  region: stopLoc.state,
  postal: stopLoc.zip,
  country: 'US',
  scheduledDateTime: `${formatDate(baseDate)} ${String(baseDate.getHours()).padStart(2, '0')}:00 CST`,
  appointmentTime: `${String(baseDate.getHours()).padStart(2, '0')}:00 CST`,
  grossWeightValue: Math.round(grossWeight / pickupStopCount),
  grossWeightUomCode: 'LB',
  volumeValue: faker.number.int({ min: 40, max: 300 }),
  volumeUomCode: 'cuft',
  packageCount: faker.number.int({ min: 5, max: 80 }),
  pickupNumber: faker.datatype.boolean() ? `PU-${faker.number.int({ min: 100000, max: 999999 })}` : null,
});
// Delivery stop:
stops.push({
  stopSequence: pickupStopCount + 1,
  stopType: 'delivery',
  orderIds: orders.map(o => o.orderId),
  facilityName: destLoc.facility,
  address1: faker.location.streetAddress(),
  city: destLoc.city,
  region: destLoc.state,
  postal: destLoc.zip,
  country: 'US',
  scheduledDateTime: `${formatDate(deliveryDate)} ${String(deliveryDate.getHours()).padStart(2, '0')}:00 CST`,
  appointmentTime: `${String(deliveryDate.getHours()).padStart(2, '0')}:00 CST`,
  grossWeightValue: grossWeight,
  grossWeightUomCode: 'LB',
  volumeValue: faker.number.int({ min: 40, max: 300 }),
  volumeUomCode: 'cuft',
  packageCount: null,
  pickupNumber: null,
});
```

**C. Routing options** — change formatted `rate`/`cost`/`transit`/`distance` to numeric DTO fields:

```js
// BEFORE
return {
  rank,
  routeRank: routeRanks[ri],
  scac: rc.scac,
  carrierName: rc.name,
  equipment: pick(EQUIPMENT_CODES),
  rate: `$${fmt(baseRate)}`,
  cost: `$${fmt(_apTotal)} USD`,
  rateDetails: { ... },
  transit: `${n} Days`,
  distance: `${d} mi`,
  // ...
};

// AFTER — only the changed fields listed; all others stay identical
return {
  rank,
  routeRank: routeRanks[ri],
  scac: rc.scac,
  carrierName: rc.name,
  equipmentCode: pick(EQUIPMENT_CODES),   // rename: equipment → equipmentCode
  rateAmount: baseRate,                    // was: rate: `$${fmt(baseRate)}`
  rateCurrency: 'USD',
  totalCostAmount: _apTotal,              // was: cost: `$${fmt(_apTotal)} USD`
  totalCostCurrency: 'USD',
  rateDetails: { ... },                   // unchanged
  transitDays: faker.number.int({ min: 1, max: 5 }),  // was: `N Days`
  distanceMiles: faker.number.float({ min: 100, max: 1500, fractionDigits: 2 }),  // was: `X mi`
  serviceLevel: `${faker.number.int({ min: 85, max: 99 })}%`,  // unchanged (string)
  apiSource: pick(ROUTING_APIS),           // rename: api → apiSource
  // ALL other fields unchanged (they're already strings)
  ...
};
```

**D. Cost** — add `cost` field to each order DTO; add `costSummary` to shipment:

```js
// In the orders map, add a `cost` field:
const ordCost = {
  apBaseAmount: ordApBase,
  apFuelAmount: ordApFuel,
  apDiscountAmount: ordApDiscount,
  apHzcAmount: ordApHzc > 0 ? ordApHzc : 0,
  apSocAmount: ordApSoc > 0 ? ordApSoc : 0,
  apTotalAmount: ordApTotal,
  arBaseAmount: ordArBase,
  arFuelAmount: ordArFuel,
  arDiscountAmount: ordArDiscount,
  arHzcAmount: ordArHzc > 0 ? ordArHzc : 0,
  arSocAmount: ordArSoc > 0 ? ordArSoc : 0,
  arTotalAmount: ordArTotal,
  directCostAmount: Math.round(ordApTotal * 1.15 * 100) / 100,
};
// The orders array (for orderList) gets: cost: ordCost

// Shipment-level costSummary:
const costSummary = {
  apBaseAmount: apBase,
  apFuelAmount: apFuel,
  apDiscountAmount: apDiscount,
  apAccessorialsAmount: apAccessorials,
  apTotalAmount: apTotal,
  arTotalAmount: arTotal,
  marginAmount: marginAmt,
  marginPercent: parseFloat((marginPct * 100).toFixed(1)),
};
```

**E. Instructions** — change `seq` to `sequenceNumber`:

```js
// BEFORE
instructions: templates.map((t, i) => ({ seq: i + 1, text: fillTemplate(t.text, null) }))

// AFTER
instructionList: templates.map((t, i) => ({ sequenceNumber: i + 1, text: fillTemplate(t.text, null) }))
```

**F. Detail object assembly** — replace view-model shape with SellShipmentOut shape:

```js
// BEFORE
const detail = {
  orderDetails,
  stopsData: { summary: {...}, stops },
  productData: { orders },
  routingData: { options: routingOptions },
  costData: { planned: { summary: {...}, orders: costOrders } },
  instructionsData: { orders: instrOrders },
  documentsData: { documents },
  notesData: { notes },
  historyData: { entries: historyEntries },
};

// AFTER — the detail IS the SellShipmentOut DTO
const detail = {
  shipmentId: sellShipment,
  shipmentType: 'sell',
  customerId: customer.id,
  customerName: customer.name,
  shipDirection: pick(SHIP_DIRECTIONS),
  freightTerms: pick(PAYMENT_TERMS),
  incotermInfo: pick(['FOB', 'CIF', 'DAP', 'DDP', 'EXW']),
  numberOfStops: stops.length,
  pgiFlag: faker.datatype.boolean(),
  ratingStatus: pick(['Rated', 'Not Rated', 'Pending']),
  distanceMiles: parseFloat(distance.toFixed(2)),
  totalVolumeValue: faker.number.int({ min: 50, max: 500 }),
  totalVolumeUomCode: 'cuft',
  acceptedCarrierLabel: acceptedOption ? `${acceptedOption.scac} - ${mode}` : null,
  seedEquipment: equipmentCode,
  utilizationPercent: faker.number.int({ min: 50, max: 100 }),
  costSummary,
  orderList: orderList,         // the orders array with cost + instructionList + orderLines
  shipmentStopList: stops,      // the DTO stops
  shippingOptionList: routingOptions,  // the DTO routing options
};
```

Note: the generator currently builds separate `orders` (for productData) and `orderDetails` (for orderDetails). After the rewrite:
- `orderList` entries contain: `orderId`, order-header fields, `orderLines` (the product lines), `instructionList`, `cost`
- The `orderDetails` view-model and `costOrders`, `instrOrders` arrays are eliminated
- Documents/notes/history are NOT in the DTO (no API yet) — these tabs will show empty in `live`/`live-sim`, and in `mock` mode too after cutover

- [ ] **Step 1: Apply all the changes described above to `generate.mjs`**

This is a single edit pass. Work through the file in order:
1. In the order-lines generation loop (around line 300), apply change A
2. In the stops generation (around line 350), apply change B
3. In the routing options map (around line 400), apply change C
4. In the cost orders generation (around line 600), apply change D (add `ordCost` to each order entry + build `costSummary`)
5. In instructions generation (around line 645), apply change E
6. Delete the `orderDetails` view-model construction (the map that builds formatted `orderNumber`, `paymentTerms`, etc.)
7. Delete `costOrders` + `instrOrders` separate array constructions
8. Replace `const detail = { ... }` (around line 944) with change F

- [ ] **Step 2: Run the generator**

```bash
cd apps/odyssey-one && node tools/generate.mjs
```

Expected output:
```
Generating 1200 shipments...
Done! Generated 1200 shipments.
  shipments.json: 1200 rows
  public/details/: 1200 detail files
  Total orders: ...
```

If there are errors, fix them before proceeding.

- [ ] **Step 3: Spot-check one generated file**

```bash
node -e "const d = JSON.parse(require('fs').readFileSync('public/details/' + require('./src/data/shipments.json')[0].buyShipment + '.json')); console.log(JSON.stringify({orderList: d.orderList?.length, stops: d.shipmentStopList?.length, routing: d.shippingOptionList?.length, costSummary: d.costSummary?.apTotalAmount}, null, 2))"
```

Expected: `orderList`, `shipmentStopList`, `shippingOptionList`, `costSummary` are all present and non-null.

- [ ] **Step 4: Commit generator + regenerated data**

```bash
git add apps/odyssey-one/tools/generate.mjs apps/odyssey-one/src/data/shipments.json
git commit -m "feat(generator): emit SellShipmentOut DTO format (Plan 2b)"
```

(The 1200 detail files in `public/details/` are gitignored — no need to stage them.)

---

## Task 10: Service cutover + retire live-sim

**Files:**
- Modify: `src/api/services/shipmentService.ts`
- Modify: `src/api/config.ts`

- [ ] **Step 1: Update `config.ts` — remove `live-sim` from the union**

```typescript
// BEFORE
export type ApiMode = 'mock' | 'live' | 'live-sim'

// AFTER
export type ApiMode = 'mock' | 'live'
```

- [ ] **Step 2: Update `shipmentService.ts` — mock path runs mapper**

```typescript
import { getApiMode } from '../config'
import { apiGet } from '../client'
import { mapSellShipmentOutToDetail } from '../mappers/mapSellShipmentOutToDetail'
import type { SellShipmentOut } from '../types/sellShipmentOut'
import type { ShipmentDetailVM } from '../types/shipmentDetail'

export async function getSellShipmentDetail(id: string): Promise<ShipmentDetailVM> {
  const mode = getApiMode()

  if (mode === 'live') {
    const dto = await apiGet<SellShipmentOut>(`/shipment-service/v1/sell-shipment-out/${id}`)
    return mapSellShipmentOutToDetail(dto)
  }

  // mock: load the generated SellShipmentOut DTO file and run it through the mapper
  const res = await fetch(`/details/${id}.json`)
  if (!res.ok) throw new Error(`Failed to load details for ${id}`)
  const dto = await res.json() as SellShipmentOut
  return mapSellShipmentOutToDetail(dto)
}
```

- [ ] **Step 3: Update `config.test.ts` if it references `live-sim`**

```bash
grep -n "live-sim" apps/odyssey-one/src/api/config.test.ts
```

If found, remove or update those test cases.

- [ ] **Step 4: Update `shipmentService.test.ts` if it references `live-sim`**

```bash
grep -n "live-sim" apps/odyssey-one/src/api/services/shipmentService.test.ts
```

Remove any `live-sim` test cases (the mode is retired).

- [ ] **Step 5: Run all tests**

```bash
cd apps/odyssey-one && npx vitest run
```

Expected: all tests pass. The `ShipmentDetailResult = ShipmentDetailVM | unknown` type alias in the service is now just `ShipmentDetailVM` — fix if TypeScript complains.

- [ ] **Step 6: Build**

```bash
cd apps/odyssey-one && npm run build
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add apps/odyssey-one/src/api/services/shipmentService.ts \
        apps/odyssey-one/src/api/config.ts \
        apps/odyssey-one/src/api/services/shipmentService.test.ts \
        apps/odyssey-one/src/api/config.test.ts
git commit -m "feat(api): mock mode runs mapper; retire live-sim (Plan 2b cutover)"
```

---

## Task 11: Integration smoke test

- [ ] **Step 1: Start the dev server**

```bash
cd apps/odyssey-one && npm run dev
```

- [ ] **Step 2: Open the app and click a shipment row**

The detail panel should open. Verify each tab renders data (not blank):
- Order tab: shows order number, ship from/to, weight
- Stops tab: shows stop list + summary bar
- Product tab: shows order lines with product details
- Routing Guide: shows carrier options with rates
- Cost Allocation: shows AP/AR summary + per-order rows
- Instructions: shows instruction text
- Documents/Notes/History: show empty state (no API yet)

- [ ] **Step 3: Run full test suite one final time**

```bash
cd apps/odyssey-one && npx vitest run && npm run typecheck && npm run build
```

Expected: all green.

- [ ] **Step 4: Commit progress note**

```bash
git add progress.md
git commit -m "docs: Session 42 progress — Plan 2b complete"
```

---

## Self-review

**Spec coverage:**
- ✅ Mapper extended to all 8 tabs (Tasks 3–7 cover Stops/Product/Routing/Cost/Instructions; Documents/Notes/History remain empty stubs — no API yet, per Session 41 notes)
- ✅ Generator rewrites 1200 detail files as `SellShipmentOut` (Task 9)
- ✅ Mock mode runs through mapper (Task 10)
- ✅ `live-sim` retired (Task 10)
- ✅ Fixture extended for all tabs (Task 8)

**Placeholder scan:** None found. All code steps are complete.

**Type consistency:** `SellShipmentRoutingOption.apiSource` is the DTO field; the mapper writes it to `RoutingOptionVM.api` (matching what `RoutingGuideTab.jsx` reads). `equipmentCode` in DTO → `equipment` in VM (matching the tab). All other field renames are in the mapper.
