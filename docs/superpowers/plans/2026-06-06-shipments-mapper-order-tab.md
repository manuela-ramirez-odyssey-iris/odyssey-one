# Shipments Detail Mapper — Order Tab Vertical Slice (Plan 2a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the real `SellShipmentOut` contract renders end-to-end through a typed DTO + mapper, visible in the Order tab via a `live-sim` mode — without touching the 1200 mock files yet.

**Architecture:** A new `SellShipmentOut` TS DTO models the real backend contract. A pure `mapSellShipmentOutToDetail` mapper converts it to the existing 9-key detail view-model (Order tab fully mapped at core fidelity; other 8 sections emitted empty so their tabs degrade gracefully). The mapper runs **inside the service's `live`/`live-sim` paths** (not the hook) — `mock` mode is untouched and still returns the raw view-model `/details` file. A new `live-sim` mode returns a bundled `SellShipmentOut` fixture through the mapper, so `VITE_API_MODE=live-sim` renders real-contract data in the app.

**Tech Stack:** TypeScript, Vitest, TanStack Query (already wired). Builds on Plan 1 (`feat/shipments-api-wiring`, PR #1).

**Scope note — this is Plan 2a.** Later slices add the remaining tabs to the mapper and **Plan 2b** rewrites `generate.mjs` to emit all 1200 `/details` as `SellShipmentOut` + the final cutover (so normal `mock` mode flows through the mapper too). Spec: `docs/superpowers/specs/2026-06-05-shipments-detail-api-wiring-design.md`. Mapper target contract is the current `/details` view-model: `orderDetails[]` (Order tab) + 8 sibling keys.

---

### Task 1: `SellShipmentOut` DTO type

**Files:**
- Create: `apps/odyssey-one/src/api/types/sellShipmentOut.ts`

- [ ] **Step 1: Create the DTO** (focused on what the Order tab maps; sibling sections typed in later slices)

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck -w odyssey-one-app`
Expected: clean (exit 0).

- [ ] **Step 3: Commit**

```bash
git add apps/odyssey-one/src/api/types/sellShipmentOut.ts
git commit -m "feat(api): SellShipmentOut DTO (Order-tab fields)"
```

---

### Task 2: View-model types

**Files:**
- Create: `apps/odyssey-one/src/api/types/shipmentDetail.ts`

- [ ] **Step 1: Create the view-model types** (the shape the detail tabs already consume)

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck -w odyssey-one-app`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/odyssey-one/src/api/types/shipmentDetail.ts
git commit -m "feat(api): detail view-model types (OrderDetailVM, ShipmentDetailVM)"
```

---

### Task 3: `SellShipmentOut` fixture

**Files:**
- Create: `apps/odyssey-one/src/api/fixtures/sellShipmentOut.sample.ts`

- [ ] **Step 1: Create one realistic synthetic record** (2 orders; one order has a hazmat line)

```ts
import type { SellShipmentOut } from '../types/sellShipmentOut'

// Synthetic SellShipmentOut record (no real customer data). Two orders; the
// second carries a hazmat line. Used by live-sim mode + mapper tests.
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
        contactName: 'Sam Ortiz',
        phone: '+1-312-555-0199',
        email: 'sam.ortiz@example.com',
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
      orderLines: [{ orderLineId: 'L1', hazmatCode: null }],
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
      orderLines: [
        { orderLineId: 'L1', hazmatCode: null },
        { orderLineId: 'L2', hazmatCode: 'UN1830' },
      ],
    },
  ],
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck -w odyssey-one-app`
Expected: clean (the fixture conforms to `SellShipmentOut`).

- [ ] **Step 3: Commit**

```bash
git add apps/odyssey-one/src/api/fixtures/sellShipmentOut.sample.ts
git commit -m "test(api): SellShipmentOut sample fixture (2 orders, 1 hazmat line)"
```

---

### Task 4: The mapper (`SellShipmentOut` → view-model)

**Files:**
- Create: `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts`
- Test: `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { mapSellShipmentOutToDetail } from './mapSellShipmentOutToDetail'
import { sellShipmentOutSample } from '../fixtures/sellShipmentOut.sample'

describe('mapSellShipmentOutToDetail', () => {
  const vm = mapSellShipmentOutToDetail(sellShipmentOutSample)

  it('maps one orderDetails entry per order', () => {
    expect(vm.orderDetails).toHaveLength(2)
  })

  it('maps identity + reference fields from the order', () => {
    const o = vm.orderDetails[0]
    expect(o.orderNumber).toBe('SO-660001')
    expect(o.poNumber).toBe('PO-770001')
    expect(o.shipDirection).toBe('Outbound')
  })

  it('formats weights as "value UOM" strings', () => {
    expect(vm.orderDetails[0].grossWeight).toBe('18,207 LB')
    expect(vm.orderDetails[0].tareWeight).toBe('3,641 LB')
    expect(vm.orderDetails[0].totalVolume).toBe('420 cuft')
  })

  it('builds shipFrom/shipTo from the address blocks', () => {
    const o = vm.orderDetails[0]
    expect(o.shipFrom.company).toBe('Acme Houston Plant')
    expect(o.shipFrom.location).toBe('77001, Houston, TX, US')
    expect(o.shipFrom.address).toBe('100 Refinery Rd')
    expect(o.shipTo.location).toBe('60601, Chicago, IL, US')
  })

  it('derives appointment booleans from presence', () => {
    expect(vm.orderDetails[0].pickupAppointment).toBe(true)
    expect(vm.orderDetails[0].deliveryAppointment).toBe(false)
  })

  it('derives hazmat from order lines', () => {
    expect(vm.orderDetails[0].hazmat).toBe('No')
    expect(vm.orderDetails[1].hazmat).toBe('Yes')
  })

  it('defaults unmapped fields to "--" (graceful degradation)', () => {
    expect(vm.orderDetails[0].salesOrder).toBe('--')
    expect(vm.orderDetails[0].customField1).toBe('--')
  })

  it('emits empty sibling sections so other tabs degrade gracefully', () => {
    expect(vm.stopsData).toEqual({ summary: {}, stops: [] })
    expect(vm.productData).toEqual({ orders: [] })
    expect(vm.costData).toEqual({ planned: { summary: {}, orders: [] } })
    expect(vm.notesData).toEqual({ notes: [] })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w odyssey-one-app -- mapSellShipmentOutToDetail`
Expected: FAIL — cannot find module `./mapSellShipmentOutToDetail`.

- [ ] **Step 3: Write the mapper**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w odyssey-one-app -- mapSellShipmentOutToDetail`
Expected: PASS (8 tests).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck -w odyssey-one-app`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.test.ts
git commit -m "feat(api): SellShipmentOut→view-model mapper (Order tab, core fidelity)"
```

---

### Task 5: Wire the mapper into the service + add `live-sim` mode

**Files:**
- Modify: `apps/odyssey-one/src/api/config.ts`
- Modify: `apps/odyssey-one/src/api/services/shipmentService.ts`
- Modify: `apps/odyssey-one/src/api/services/shipmentService.test.ts`

- [ ] **Step 1: Add `live-sim` to the mode type** — replace `config.ts` body with:

```ts
// Runtime config for the API layer. `mock` reads local generated detail files;
// `live` calls the real shipment-service; `live-sim` renders a bundled
// SellShipmentOut fixture through the mapper (visible proof without real access).
// Functions (not constants) so values are read at call time — testable via vi.stubEnv.
export type ApiMode = 'mock' | 'live' | 'live-sim'

export function getApiMode(): ApiMode {
  const m = import.meta.env.VITE_API_MODE
  if (m === 'live') return 'live'
  if (m === 'live-sim') return 'live-sim'
  return 'mock'
}

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? ''
}
```

- [ ] **Step 2: Update the `config.test.ts` mode tests** — add a case (inside the existing `describe('api config', ...)`):

```ts
  it('reads live-sim mode from env', () => {
    vi.stubEnv('VITE_API_MODE', 'live-sim')
    expect(getApiMode()).toBe('live-sim')
  })
```

- [ ] **Step 3: Update `shipmentService.test.ts`** — live mode now maps, so the existing live-mode test's data assertion must change; add a `live-sim` test. Keep the two mock tests as-is.

Add this import near the top of the file (after the existing imports):
```ts
import { sellShipmentOutSample } from '../fixtures/sellShipmentOut.sample'
```

**Replace** the existing test `it('live mode calls the real sell-shipment-out endpoint with headers', ...)` (which asserts `expect(data).toEqual({ shipmentId: '777' })` — wrong now that live maps) with this version, which still verifies the URL + correlation-id but feeds a real `SellShipmentOut` and asserts the **mapped** output:
```ts
  it('live mode calls sell-shipment-out with headers and maps the response', async () => {
    vi.stubEnv('VITE_API_MODE', 'live')
    vi.stubEnv('VITE_API_BASE_URL', '')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => sellShipmentOutSample })
    vi.stubGlobal('fetch', fetchMock)

    const data = (await getSellShipmentDetail('25690001')) as { orderDetails: { orderNumber: string }[] }

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/shipment-service/v1/sell-shipment-out/25690001')
    expect(init.headers['x-correlation-id']).toBeTruthy()
    expect(data.orderDetails).toHaveLength(2)
    expect(data.orderDetails[0].orderNumber).toBe('SO-660001')
  })
```

**Add** this new test (inside the same describe):
```ts
  it('live-sim mode returns the fixture mapped to the view-model', async () => {
    vi.stubEnv('VITE_API_MODE', 'live-sim')
    const data = (await getSellShipmentDetail('anything')) as { orderDetails: { orderNumber: string }[] }
    expect(data.orderDetails).toHaveLength(sellShipmentOutSample.orderList.length)
    expect(data.orderDetails[0].orderNumber).toBe('SO-660001')
  })
```

- [ ] **Step 4: Run the service test to verify the updated cases fail**

Run: `npm run test -w odyssey-one-app -- shipmentService.test`
Expected: FAIL — the replaced `live` test expects `orderDetails` (the service doesn't map yet) and `live-sim` mode isn't handled.

- [ ] **Step 5: Update the service** — replace `shipmentService.ts` with:

```ts
import { getApiMode } from '../config'
import { apiGet } from '../client'
import { mapSellShipmentOutToDetail } from '../mappers/mapSellShipmentOutToDetail'
import { sellShipmentOutSample } from '../fixtures/sellShipmentOut.sample'
import type { SellShipmentOut } from '../types/sellShipmentOut'
import type { ShipmentDetailVM } from '../types/shipmentDetail'

// mock returns the raw view-model JSON file (unknown until Plan 2b regenerates
// it to SellShipmentOut); live + live-sim return a mapped view-model.
export type ShipmentDetailResult = ShipmentDetailVM | unknown

export async function getSellShipmentDetail(id: string): Promise<ShipmentDetailResult> {
  const mode = getApiMode()

  if (mode === 'live') {
    const dto = await apiGet<SellShipmentOut>(`/shipment-service/v1/sell-shipment-out/${id}`)
    return mapSellShipmentOutToDetail(dto)
  }

  if (mode === 'live-sim') {
    // Visible proof: render the bundled SellShipmentOut fixture through the mapper.
    // (id is ignored — single fixture stands in for the real endpoint.)
    return mapSellShipmentOutToDetail(sellShipmentOutSample)
  }

  // mock: the locally generated detail file (served from public/details)
  const res = await fetch(`/details/${id}.json`)
  if (!res.ok) throw new Error(`Failed to load details for ${id}`)
  return res.json()
}
```

- [ ] **Step 6: Run the full suite to verify it passes**

Run: `npm run test -w odyssey-one-app`
Expected: all PASS — the prior suite plus the new config `live-sim` test, the `live-sim` service test, the updated `live` service test, and the 8 mapper tests (~31 total; exact count isn't important — zero failures is).

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck -w odyssey-one-app`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add apps/odyssey-one/src/api/config.ts apps/odyssey-one/src/api/config.test.ts apps/odyssey-one/src/api/services/shipmentService.ts apps/odyssey-one/src/api/services/shipmentService.test.ts
git commit -m "feat(api): run mapper in live/live-sim service paths + add live-sim mode"
```

---

### Task 6: Document `live-sim` + verify the render

**Files:**
- Modify: `apps/odyssey-one/.env.example`

- [ ] **Step 1: Document the new mode** — update the `VITE_API_MODE` line in `apps/odyssey-one/.env.example` to mention `live-sim`:

```bash
# 'mock' = local generated /details files (default). 'live' = real shipment-service.
# 'live-sim' = render the bundled SellShipmentOut fixture through the mapper
#              (proves real-contract rendering without API access — Order tab only for now).
VITE_API_MODE=mock
```

- [ ] **Step 2: Commit**

```bash
git add apps/odyssey-one/.env.example
git commit -m "docs: document live-sim mode"
```

- [ ] **Step 3: Manual verification (controller/user — needs a browser)**

Run: `VITE_API_MODE=live-sim npm run dev:odyssey-one`, open `/shipments`, click any shipment row, open the **Order** tab.
Expected: the Order tab renders the fixture's data — bold order `SO-660001`, ship-from `Acme Houston Plant` / `77001, Houston, TX, US`, gross weight `18,207 LB`, the order dropdown shows 2 orders, and the second order shows hazmat `Yes`. Other tabs render empty (expected — only the Order tab is mapped in this slice). Switch `VITE_API_MODE` back to `mock` → normal data returns.

---

## Self-review notes
- **Spec coverage:** DTO ✓ (Task 1), mapper ✓ (Task 4), wired so real-contract data renders ✓ (Task 5 live-sim), tests ✓. Deferred (documented): remaining tabs' mappings + `generate.mjs` regeneration + full `mock`-mode cutover → **Plan 2b**.
- **Graceful degradation:** unmapped Order fields → `'--'`; unmapped sibling tabs → empty structures (components already render `'--'`/empty).
- **No `mock` regression:** the mapper runs only in `live`/`live-sim`; `mock` still returns the raw `/details` file unchanged.

## What Plan 2b covers (not this plan)
- Extend `mapSellShipmentOutToDetail` to the other 8 tabs (Stops, Product, Routing, Cost, Instructions, Documents, Notes, History).
- Rewrite `tools/generate.mjs` to emit all 1200 `/details/{id}.json` as `SellShipmentOut`.
- Final cutover: `mock` mode also runs through the mapper; retire the `live-sim` scaffold.
