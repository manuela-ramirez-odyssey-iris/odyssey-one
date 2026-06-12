# Create Order Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Create New Manual Order flow (screens 1–7): one progressive-disclosure form (Quick → Long) of four accordion-stepper sections, manual save/draft semantics (Q27), a confirmation page (sync + async variants), and a mock write layer on the LLD-shaped `POST /order-service/v3/manual-order` contract — same seam as the Summary Page, so flipping to the live API is an env-var change.

**Architecture:** Extends the existing `src/api/` seam: LLD-verbatim DTOs → pure `mapFormToOrderInterface` → `orderService` write layer with an in-memory overlay over `orders.json` → react-query mutations/lookup queries → app-local UI in `src/components/orders/create/`. Form state is `react-hook-form` + one composed zod schema; section StepIndicators derive from per-section sub-schema validity. Navbar flips contextually via a new `CreateOrderModeContext` that mirrors `EditModeContext`. Route `/orders/create` lives inside `AppShell` (sidebar stays).

**Tech Stack:** React 19, TypeScript (data layer + logic cores; UI stays `.jsx` per app convention), react-hook-form + zod + @hookform/resolvers (new deps), @tanstack/react-query v5 (present), vitest (import-after-mock idiom), `@odyssey/ui` primitives (Button, FormField, FieldSelect, SearchField, Checkbox, Radio, Alert, Badge, ButtonToggle text mode, StepIndicator, Accordion, ModalMedium, Navbar shell parts), `.odyssey-table` cell contract for the Product grid.

**Spec:** `docs/superpowers/specs/2026-06-11-create-order-flow-design.md` (approved). Field-level detail defers to `vault/10-domains/orders/screens-reference.md` (screens 1–7); Efrain's texts (`vault-sources/10-domains/orders/efrain/orders-sections-efrain-descriptions.md`) outrank Jira story texts on conflicts.

**Effort calibration:** The seam (types, mapper, services, schemas) is the durable part — build it precisely. The UI skin is "looks right at a glance"; every new piece is a normalization candidate for the parallel session, so keep styles token-bound but don't pixel-tune. No gold-plating: inert affordances (column-manage icon, row-expand icon, help `?`) stay inert.

---

## Plan-level decisions (resolved during planning — read first)

Resolutions baked in from the spec (Q numbers from `vault/10-domains/orders/open-questions.md`), plus mismatches found while reading the real code/LLD:

1. **The LLD's create payload root is `manualOrder`, NOT `orderInterface`.** The spec (§2.3) says "orderInterface{} … LLD-verbatim names", but the Phase-2 LLD's `POST order-service/v3/manual-order` row (the create-order payload section) wraps the body in `"manualOrder": { … }` — `"orderInterface"` is the root of the *generic* `/order-service/v3/order` endpoint. LLD-verbatim wins: types model `CreateOrderRequest { manualOrder: ManualOrder }` with `manualOrder`'s flattened field names (`originCity`, `destinationPostal`, `requestedDateType`, `poNumber`, `pickupNumber`, `orderInstructionList`, `orderAccessorialDetails`, …). The mapper file keeps the spec's name `mapFormToOrderInterface.ts` so the spec's file map stays valid.
2. **`ManualOrder` is typed as the populated subset.** The LLD payload has ~100 fields (charges, AP/AR costs, hazmat detail, …) this form never fills. The type declares only the fields the mapper writes — names verbatim, everything optional except where the mapper always emits. The full payload remains documented in `vault-sources/10-domains/orders/lld/order-service-phase-2.md` (line ~671).
3. **TrailNav needs NO extension.** Its `mode="editor"` API already expresses the Create-Order chrome: `showPrimaryButton={false}` + `secondaryButtonLabel="Save for Later"` (outline button) + default help icon + `onRightIconClick` for ✕. Spec's "extend minimally only if needed" → not needed.
4. **`Radio` exists in `@odyssey/ui`** (spec §8 said "if present") — used for the Q22 two-way Planning Date Type pair.
5. **SectionStepper collapses into `CreateOrderForm`.** `Accordion` already embeds `StepIndicator` + the connecting rail (`position`/`status` props, content "cuts" the line). Composing four Accordions (`start`/`mid`/`mid`/`end`) IS the stepper; a separate SectionStepper component would be a pass-through.
6. **Banner is the `warning` (yellow) Alert**, text exactly `Required fields will complete steps.` (Q27 — auto-save claim dropped). Spec §2.2 says "info Alert" but spec §6's own inventory and screen 1 both show the yellow banner; "info" is read as the informational *role*, not the blue variant. One-word change if Efrain overrules.
7. **zod is pinned `^3`** (`zod@^3.25`): the plan's schema code uses the stable v3 API (`z.string().email()`, `superRefine`, `.passthrough()`) that `@hookform/resolvers` v5 supports without migration surprises.
8. **Early/Late → `manualOrder` date-field mapping is provisional** (residual for Ramesh): the LLD header has no `earliest*/latest*` fields, so Early Pickup → `requestedPickupDate(+TimeZoneCode)`, **Late Pickup → `pickupAppointment(+TimeZoneCode)`**, Early Delivery → `requestedDeliveryDate`, **Late Delivery → `deliveryAppointment`**, with `requestedDateType` ← the Q22 radio (`SHIP`/`DELIVERY`). One reconciliation point: the mapper.
9. **Consolidatable (Q15) and free-form references (Q21) ride `userFieldList`** — `manualOrder` has dedicated `pickupNumber`/`poNumber` header fields for the guided rows but nothing for the consolidatable flag or arbitrary type/value pairs: consolidatable → `{ userfieldType: 'FLAG', name: 'CONSOLIDATABLE', value: 'Y'|'N' }`, each free-form row → `{ userfieldType: 'REFERENCE', name: <type>, value }`. Residual mapping for Ramesh.
10. **Date entry is a masked text field** (`MM/DD/YYYY`, auto-slash, calendar trailing icon, no popover calendar). A real date-picker is a known component gap (screens-reference gap table) owned by the parallel normalization session; this build doesn't pre-build it.
11. **No DOM component tests.** Spec §7's "component smoke" is satisfied by per-batch dev-server smoke steps + the final checklist — adding jsdom/@testing-library is outside the approved dep list (RHF/zod/resolvers only). TDD stays on the logic cores: schemas, mapper, orderService write layer, lookupService, productMath.
12. **Product editor row is local state; the RHF `products` array holds SAVED rows only.** Per-row Save validates against `productRowSchema` (all five fields, Q26); the ≥1-product submit rule counts saved rows — matching the per-row Save/Cancel design (screen 4).
13. **Repeatable arrays (references/instructions/products/services) are managed via a single `Controller` per array with immutable updates** — not `useFieldArray` (its `update()` re-registers inputs and drops focus mid-typing). Rows are keyed by a generated `id`.
14. **Select-like lookups skip the 2-char typeahead gate.** `freight-term`, `ship-direction`, `ship-class`, `timezone` are full-list selects; the LINX-7553 typeahead contract (2-char min excluding spaces, case-insensitive, frequency-sorted, ~250ms debounce) applies to `owning-org`, `equipment`, `org-address`, `product`, `special-service`, `carrier`.
15. **Mock equipment scoping is an explicit map** (`EQUIPMENT_SCOPE` in master-data): listed orgs get a restricted subset, everyone else gets all four codes; no org selected → empty list (the field is disabled until an Owning Organization is picked).
16. **City/State/Postal/Country render as `SelectField`s over master-data pools** (screens show comboboxes; a lean select now — same master-data, swappable skin).
17. **Draft reopen keys on the order number:** `/orders/create?draft=<orderNumber>` (the save-gate guarantees every draft has one). `getDraft()` resolves by internal draftId OR orderNumber; the form keeps the returned `draftId` so re-saves upsert the same draft even if the user edits the order number.
18. **OrdersTable ID-cell click threads through TanStack `meta.onRowIdClick`** (COLUMNS stays module-level). OrdersRoute navigates only for `status === 'Draft'` rows; all other IDs stay inert (detail page is a future build).
19. **Confirmation strip:** Shipment Mode comes from the mock response (`"Ground"`, Q28 open); "Payment terms" displays the form's Freight Term (label drift noted on screen 6).
20. **Optional Special Services step shows green only once ≥1 service is picked.** Pure schema-validity would render the step permanently green (an optional schema always passes), which misreads as "done" on first paint.
21. **`getDraft` live branch throws** (`order/view` → form hydration needs an inverse mapper — out of scope; mock-only this build). `createOrder`/`saveDraft` live branches are real `apiPost` calls.
22. **Lookup live endpoint:** `POST /order-service/v1/<type>/lookup` per spec §2.3, with the LLD's lookup *request* shape (`{ lookup, pageNumber, pageSize }` — the only lookup examples in the LLD are `/v3/order-status/lookup` & `/v3/order-number/lookup`; v1-vs-v3 path is a flip-time reconciliation, single constant).
23. **Consignor ≠ Consignee identical-address validation (Efrain §2 note) is NOT built** — spec §2.4's validation model omits it; logged as a residual, one `superRefine` away if it lands.
24. **The Under Construction label on Product Information is KEPT, rendered with the 🚧 emoji** (user call 2026-06-11, reversing the planner's drop): the form section's Accordion title is `Product Information 🚧 Under Construction`. The ConfirmationView's Product Information accordion does NOT carry it (screens 6/7 show no label).
25. **Confirmation page exits create-order navbar mode** (normal navbar returns; the form unmounts, spec §5) and renders on the same route.

---

## File structure

```
apps/odyssey-one/
├── package.json                                    MODIFY — add react-hook-form, zod@^3, @hookform/resolvers
├── src/
│   ├── App.jsx                                     MODIFY — add /orders/create route
│   ├── main.jsx                                    MODIFY — mount CreateOrderModeProvider
│   ├── contexts/
│   │   └── CreateOrderModeContext.jsx              CREATE — navbar contextual state (mirrors EditModeContext)
│   ├── components/layout/
│   │   └── Navbar.jsx                              MODIFY — create-order branch (title navbar + Save for Later/?/✕)
│   ├── data/
│   │   └── master-data.js                          CREATE — lookup pools (orgs, equipment+scope, freight terms, ship dirs,
│   │                                                        ship classes, services, carriers, TZs, city→TZ, addresses, UoMs)
│   ├── api/
│   │   ├── types/createOrder.ts                    CREATE — ManualOrder subset (LLD-verbatim names) + request/response envelope
│   │   ├── types/orderFormVm.ts                    CREATE — OrderFormValues (UI shape) + default-values factories
│   │   ├── fixtures/orderFormValues.sample.ts      CREATE — filled long-form sample for mapper/service tests
│   │   ├── mappers/mapFormToOrderInterface.ts      CREATE — form values → CreateOrderRequest (TDD)
│   │   ├── mappers/mapFormToOrderInterface.test.ts CREATE
│   │   ├── services/orderService.ts                MODIFY — write layer: createOrder/saveDraft/getDraft + overlay in getOrderList
│   │   ├── services/orderServiceWrite.test.ts      CREATE — write-layer tests (TDD)
│   │   ├── services/lookupService.ts               CREATE — typeahead lookups behind the mock/live seam (TDD)
│   │   ├── services/lookupService.test.ts          CREATE
│   │   └── queries/
│   │       ├── useCreateOrder.ts                   CREATE — useMutation (maps form → request in the hook)
│   │       ├── useSaveDraft.ts                     CREATE — useMutation (upsert draft)
│   │       └── useLookup.ts                        CREATE — useQuery factory (gated, frequency-sorted results)
│   ├── components/orders/
│   │   ├── OrderRowActionMenu.jsx                  MODIFY — accept actions/onAction props (reused by Product grid rows)
│   │   ├── OrdersTable.jsx                         MODIFY — meta.onRowIdClick threading (Draft reopen)
│   │   └── create/
│   │       ├── create-order.css                    CREATE — all create-flow styles, token-bound
│   │       ├── CreateOrderForm.jsx                 CREATE — orchestrator: RHF provider, banner, accordions, footer, modal, save flows
│   │       ├── useSectionStatus.js                 CREATE — per-section sub-schema validity (debounced) → StepIndicator status
│   │       ├── schema.ts                           CREATE — zod sub-schemas + composed createOrderSchema + saveGateSchema + warnings (TDD)
│   │       ├── schema.test.ts                      CREATE
│   │       ├── productMath.ts                      CREATE — US|Metric display conversion + confirmation roll-ups (TDD)
│   │       ├── productMath.test.ts                 CREATE
│   │       ├── StickyFooter.jsx                    CREATE — Cancel · Save · Create Order
│   │       ├── DiscardSaveModal.jsx                CREATE — screen-3 modal on ModalMedium
│   │       ├── RepeatableRows.jsx                  CREATE — generic add/delete row table (references, instructions)
│   │       ├── ProductGrid.jsx                     CREATE — .odyssey-table grid + inline ProductRowEditor
│   │       ├── SpecialServicesPicker.jsx           CREATE — search → tabular dropdown → selected-rows table
│   │       ├── ConfirmationView.jsx                CREATE — screens 6/7 (sync + async variants)
│   │       ├── fields/
│   │       │   ├── useDebouncedValue.js            CREATE — ~250ms debounce hook
│   │       │   ├── TypeaheadSelect.jsx             CREATE — generic async lookup field (FormField + dropdown)
│   │       │   ├── SelectField.jsx                 CREATE — static-option select (FormField-skinned trigger + dropdown)
│   │       │   ├── DateInput.jsx                   CREATE — masked MM/DD/YYYY + warning slot
│   │       │   ├── TimeSelect.jsx                  CREATE — HH:MM 24h half-hour select
│   │       │   └── TimezoneSelect.jsx              CREATE — TZ select (auto-derived upstream)
│   │       └── sections/
│   │           ├── GeneralInformationSection.jsx   CREATE — quick fields + references + Add More Details expansion
│   │           ├── PickupDeliverySection.jsx       CREATE — mirrored party columns + planning date/time block
│   │           ├── AddressFields.jsx               CREATE — manual address grid
│   │           ├── ContactFields.jsx               CREATE — name / E.164 phone / email
│   │           ├── ProductInformationSection.jsx   CREATE — toolbar (search, US|Metric, sort) + ProductGrid wiring
│   │           └── SpecialServicesSection.jsx      CREATE — picker wiring
│   └── routes/orders/
│       ├── OrdersRoute.jsx                         MODIFY — wire Create Order button + Draft-row navigation
│       └── CreateOrderRoute.jsx                    CREATE — /orders/create: form ↔ confirmation, ?draft= & ?confirm=async
```

---

## Batch 1 — Contract, mapper, services: the seam (TDD)

### Task 1: Install the form stack

**Files:**
- Modify: `apps/odyssey-one/package.json` (dependencies added by npm)

- [ ] **Step 1: Install the dependencies**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npm install react-hook-form zod@^3.25 @hookform/resolvers
```

Expected: `package.json` gains `"react-hook-form": "^7.x"`, `"zod": "^3.25.x"`, `"@hookform/resolvers": "^5.x"` in `dependencies`; root `package-lock.json` updates. zod is pinned `^3` deliberately (plan decision 7).

- [ ] **Step 2: Verify they resolve**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
node -e "Promise.all([import('react-hook-form'), import('zod'), import('@hookform/resolvers/zod')]).then(([rhf, z, r]) => console.log(typeof rhf.useForm, typeof z.z.object, typeof r.zodResolver))"
```

Expected: `function function function`

- [ ] **Step 3: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/package.json package-lock.json
git commit -m "orders: add react-hook-form + zod + resolvers (create-order form stack)"
```

---

### Task 2: Master-data lookup pools

The mock lookup service serves from the shared generator pools (`tools/data-pools.mjs` — Summary-Page decision A7) plus create-order-only pools that don't exist yet. One app-side module re-exports both so `src/` never reaches into `tools/` from more than one place.

**Files:**
- Create: `apps/odyssey-one/src/data/master-data.js`

- [ ] **Step 1: Write `src/data/master-data.js`**

```js
// src/data/master-data.js — master-data pools for the create-order mock lookups.
// Shared pools come from tools/data-pools.mjs (A7: master data is shared
// cross-domain — the grid generator and these lookups must agree). Pools that
// only the create flow needs (freight terms, ship classes, special services,
// carriers, timezones, UoMs) are defined here. `frequency` drives the
// LINX-7553 frequency sort in lookupService; values are PROVISIONAL fakes.
import { CUSTOMERS, LOCATIONS, EQUIPMENT_CODES, CHEMICAL_PRODUCTS } from '../../tools/data-pools.mjs'

export { CUSTOMERS, LOCATIONS, EQUIPMENT_CODES, CHEMICAL_PRODUCTS }

// ── Owning organizations (typeahead) ───────────────────────
export const OWNING_ORGS = CUSTOMERS.map((c, i) => ({
  value: c.id,
  label: c.name,
  frequency: CUSTOMERS.length - i,
}))

// ── Equipment (typeahead, scoped by Owning Organization) ───
// Labels are provisional fakes; codes are the shared pool.
export const EQUIPMENT_LABELS = { FLT: 'Flatbed', LTH: 'Lowboy', VAN: 'Dry Van', REEFER: 'Refrigerated' }
// Orgs listed here see a restricted subset; everyone else sees all four
// (plan decision 15 — proves org scoping observably in mock mode).
export const EQUIPMENT_SCOPE = {
  ACME_LOG_01: ['VAN', 'FLT'],
  WEYERH_01: ['FLT', 'LTH'],
}

// ── Plain selects ──────────────────────────────────────────
export const FREIGHT_TERMS = [
  { value: 'Pre-Paid', label: 'Pre-Paid' },
  { value: 'COL', label: 'COL (Collect)' },
  { value: 'Third Party', label: 'Third Party' },
]
export const SHIP_DIRECTIONS = [
  { value: 'Outbound', label: 'Outbound' },
  { value: 'Inbound', label: 'Inbound' },
]
// The 4-option class lookup (domain-analysis §3.3). Column label stays the
// interim constant "Ship Class" (Q26 residual — Efrain owns the canonical pick).
export const SHIP_CLASSES = ['Product Class', 'Commodity', 'Harmonized', 'NMFC']

// ── Special services (typeahead; codes from screens 5) ─────
export const SPECIAL_SERVICES = [
  { code: 'PALEXG', description: 'Pallet Jack', frequency: 90 },
  { code: 'PJC', description: 'Pallet Exchange', frequency: 80 },
  { code: 'LFT', description: 'Lift gate', frequency: 75 },
  { code: 'INSD', description: 'Inside Delivery', frequency: 50 },
  { code: 'RESD', description: 'Residential Delivery', frequency: 35 },
  { code: 'LUMP', description: 'Lumper Service', frequency: 20 },
]

// ── Carriers (SCAC typeahead; free-typed values also allowed) ──
export const CARRIERS = [
  { scac: 'KNGT', name: 'Knight-Swift Transportation', frequency: 95 },
  { scac: 'SCNN', name: 'Schneider National', frequency: 90 },
  { scac: 'JBHT', name: 'J.B. Hunt Transport', frequency: 85 },
  { scac: 'WERN', name: 'Werner Enterprises', frequency: 70 },
  { scac: 'ODFL', name: 'Old Dominion Freight Line', frequency: 60 },
  { scac: 'SAIA', name: 'Saia LTL Freight', frequency: 40 },
]

// ── Timezones + city→TZ auto-derivation (spec §10: static map in mock) ──
export const TIMEZONES = ['EST', 'CST', 'MST', 'PST', 'AKST', 'HST']
export const CITY_TIMEZONES = {
  Houston: 'CST', Bastrop: 'CST', Geismar: 'CST', Dallas: 'CST',
  'Lake Charles': 'CST', 'Baton Rouge': 'CST', Freeport: 'CST', Baytown: 'CST',
  Channelview: 'CST', Odessa: 'CST', Atlanta: 'EST', Columbus: 'EST',
  Chicago: 'CST', Miami: 'EST', 'San Antonio': 'CST', Kingsport: 'EST',
  Wyandotte: 'EST', Phoenix: 'MST', Denver: 'MST', Seattle: 'PST',
  Portland: 'PST', Minneapolis: 'CST', Detroit: 'EST', 'New Orleans': 'CST',
  'Salt Lake City': 'MST', 'Kansas City': 'CST', 'San Diego': 'PST',
  Neenah: 'CST', McIntosh: 'CST', 'Green River': 'MST',
}
export const deriveTimezone = (city) => CITY_TIMEZONES[city] ?? ''

// ── Location addresses (org-address typeahead; hydrates the manual grid) ──
// locationId formula is IDENTICAL to generate-orders.mjs LOCATION_IDS, so
// lookup picks match the ids already on the Summary grid.
export const LOCATION_ADDRESSES = LOCATIONS.map((loc, i) => {
  const initials = loc.facility.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase()
  return {
    locationId: `${initials}-${loc.state}-${String(i + 1).padStart(3, '0')}`,
    longName: loc.facility,
    address1: `${100 + i} Industrial Blvd`, // synthetic street — pools carry no street line
    city: loc.city,
    state: loc.state,
    postal: loc.zip,
    country: 'United States',
    frequency: LOCATIONS.length - i,
  }
})

// ── Address sub-form selects (screens show comboboxes; lean selects now) ──
export const US_STATES = [...new Set(LOCATIONS.map(l => l.state))].sort()
export const CITY_OPTIONS = [...new Set(LOCATIONS.map(l => l.city))].sort()
export const POSTAL_OPTIONS = [...new Set(LOCATIONS.map(l => l.zip))].sort()
export const COUNTRIES = ['United States', 'Canada', 'Mexico']

// ── UoM selects (Product grid; stored codes, display labels) ──
export const UOM_WEIGHT = [
  { value: 'lb', label: 'Lb' },
  { value: 'kg', label: 'Kg' },
]
export const UOM_VOLUME = [
  { value: 'cuft', label: 'Cu ft' },
  { value: 'm3', label: 'm³' },
]
```

- [ ] **Step 2: Smoke-check it loads (node, same as the generators)**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
node -e "import('./src/data/master-data.js').then(m => console.log(m.OWNING_ORGS.length, m.LOCATION_ADDRESSES[0].locationId, m.deriveTimezone('Houston'), m.US_STATES.length))"
```

Expected: `15 EW-TX-001 CST` + a state count (≈19). `EW-TX-001` proves the locationId formula matches the generator's (Houston / ERCO WORLDWIDE / index 0).

- [ ] **Step 3: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/data/master-data.js
git commit -m "orders: master-data pools for create-order lookups (shared + create-only)"
```

---

### Task 3: Contract types + form view-model

**Files:**
- Create: `apps/odyssey-one/src/api/types/createOrder.ts`
- Create: `apps/odyssey-one/src/api/types/orderFormVm.ts`

- [ ] **Step 1: Write `src/api/types/createOrder.ts`**

```ts
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
  productDescription: string    // 1–150 chars
  grossWeightValue: number
  grossWeightUomCode: string
  volumeValue: number
  volumeUomCode: string
  shipClass: string             // interim label "Ship Class" (Q26 residual)
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
  orderNumber: string           // "S260004NGW" (sync) — async variant renders "–"
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
```

- [ ] **Step 2: Write `src/api/types/orderFormVm.ts`**

```ts
// OrderFormValues — the UI-friendly form shape react-hook-form holds.
// Everything is strings/booleans the inputs bind to directly; the mapper
// (mapFormToOrderInterface) owns the translation to the LLD wire shape.

export interface MeasureValue {
  value: string   // raw input text; validated numeric by productRowSchema
  uom: string     // stored code ('lb'|'kg'|'cuft'|'m3') — US|Metric toggle converts DISPLAY only
}

export interface ReferenceRowValues {
  id: string
  guided: boolean // guided rows (Pickup Number / PO Number) → dedicated header fields (Q21)
  type: string
  value: string
}

export interface InstructionRowValues {
  id: string
  description: string // ≤2,000 chars; instructionType defaults "0012" in the mapper (Q19)
}

export interface DateTimeTriad {
  date: string      // MM/DD/YYYY
  time: string      // HH:MM 24h, defaults 00:00
  timezone: string  // auto-derived from city when possible
}

export interface PartyValues {
  locationId: string   // lookup pick; empty when manual-only
  manualMode: boolean  // "+ Add Location Manually" toggled
  idOrgName: string
  longName: string
  address1: string
  address2: string
  city: string
  state: string
  postal: string
  country: string
  showContact: boolean
  contactName: string
  contactPhone: string // display format free; validated E.164 after normalization
  contactEmail: string
}

export interface GeneralInfoValues {
  orderNumber: string
  owningOrganization: string      // org id
  owningOrganizationName: string  // display label (confirmation page); not validated
  equipment: string
  freightTerm: string
  shipDirection: string
  consolidatable: boolean         // header checkbox, checked by default (Q15)
  carrierScac: string             // Customer Required Carrier (Long)
  equipmentReferenceNumber: string
  instructions: InstructionRowValues[]
  references: ReferenceRowValues[]
}

export interface ProductRowValues {
  id: string
  productId: string
  description: string
  grossWeight: MeasureValue
  volume: MeasureValue
  shipClass: string
}

export interface SpecialServiceValues {
  code: string
  description: string
}

export interface PickupDeliveryValues {
  consignor: PartyValues
  consignee: PartyValues
  planningDateType: 'SHIP' | 'DELIVERY' // Q22 two-way radio
  earlyPickup: DateTimeTriad
  latePickup: DateTimeTriad
  earlyDelivery: DateTimeTriad
  lateDelivery: DateTimeTriad
}

export interface OrderFormValues {
  general: GeneralInfoValues
  pickupDelivery: PickupDeliveryValues
  products: ProductRowValues[]
  specialServices: SpecialServiceValues[]
}

export function makeEmptyTriad(): DateTimeTriad {
  return { date: '', time: '00:00', timezone: '' }
}

export function makeEmptyParty(): PartyValues {
  return {
    locationId: '', manualMode: false,
    idOrgName: '', longName: '', address1: '', address2: '',
    city: '', state: '', postal: '', country: '',
    showContact: false, contactName: '', contactPhone: '', contactEmail: '',
  }
}

export function makeDefaultOrderFormValues(): OrderFormValues {
  return {
    general: {
      orderNumber: '',
      owningOrganization: '',
      owningOrganizationName: '',
      equipment: '',
      freightTerm: 'Pre-Paid',   // Q20: Outbound default → Pre-Paid
      shipDirection: 'Outbound', // default per Efrain §1
      consolidatable: true,      // Q15: checked by default
      carrierScac: '',
      equipmentReferenceNumber: '',
      instructions: [],
      // Guided rows pre-seeded (screen 1-Long); free-form rows added by the user
      references: [
        { id: 'ref-pickup', guided: true, type: 'Pickup Number', value: '' },
        { id: 'ref-po', guided: true, type: 'PO Number', value: '' },
      ],
    },
    pickupDelivery: {
      consignor: makeEmptyParty(),
      consignee: makeEmptyParty(),
      planningDateType: 'SHIP', // screen 2 default selection
      earlyPickup: makeEmptyTriad(),
      latePickup: makeEmptyTriad(),
      earlyDelivery: makeEmptyTriad(),
      lateDelivery: makeEmptyTriad(),
    },
    products: [],
    specialServices: [],
  }
}
```

- [ ] **Step 3: Type-check (no emit)**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/api/types/createOrder.ts apps/odyssey-one/src/api/types/orderFormVm.ts
git commit -m "orders: create-order contract types (LLD manualOrder subset) + form VM"
```

---

### Task 4: Form-values fixture

**Files:**
- Create: `apps/odyssey-one/src/api/fixtures/orderFormValues.sample.ts`

- [ ] **Step 1: Write the fixture (a fully-filled Long-form order; ids/products from the real pools so totals land on the LLD's example numbers 4300/730)**

```ts
import type { OrderFormValues } from '../types/orderFormVm'

// Filled long-form sample for schema/mapper/service tests. Location ids use
// the generator formula (EW-TX-001 = Houston/ERCO, GCR-TX-015 = San Antonio/
// GULF COAST RECEIVING); product items come from CHEMICAL_PRODUCTS; weights
// sum to 4300 lb / 730 cuft — the LLD list example's numbers.
export const orderFormValuesSample: OrderFormValues = {
  general: {
    orderNumber: 'ORD-1001',
    owningOrganization: 'ERCO_SYS_01',
    owningOrganizationName: 'ERCO Systems Inc',
    equipment: 'VAN',
    freightTerm: 'Pre-Paid',
    shipDirection: 'Outbound',
    consolidatable: true,
    carrierScac: 'KNGT',
    equipmentReferenceNumber: 'EQ-REF-9',
    instructions: [
      { id: 'i1', description: 'Call ahead before pickup' },
    ],
    references: [
      { id: 'ref-pickup', guided: true, type: 'Pickup Number', value: '41197' },
      { id: 'ref-po', guided: true, type: 'PO Number', value: 'I567649422' },
      { id: 'r3', guided: false, type: 'Dock Code', value: 'D-12' },
    ],
  },
  pickupDelivery: {
    consignor: {
      locationId: 'EW-TX-001', manualMode: false,
      idOrgName: 'EW-TX-001', longName: 'ERCO WORLDWIDE',
      address1: '100 Industrial Blvd', address2: '',
      city: 'Houston', state: 'TX', postal: '77001', country: 'United States',
      showContact: true,
      contactName: 'Nick Strauss',
      contactPhone: '+1 (765) 670-4444',
      contactEmail: 'nick.strauss@krm.com',
    },
    consignee: {
      locationId: 'GCR-TX-015', manualMode: false,
      idOrgName: 'GCR-TX-015', longName: 'GULF COAST RECEIVING',
      address1: '114 Industrial Blvd', address2: '',
      city: 'San Antonio', state: 'TX', postal: '78201', country: 'United States',
      showContact: false, contactName: '', contactPhone: '', contactEmail: '',
    },
    planningDateType: 'SHIP',
    earlyPickup: { date: '06/15/2026', time: '08:00', timezone: 'CST' },
    latePickup: { date: '06/15/2026', time: '16:00', timezone: 'CST' },
    earlyDelivery: { date: '', time: '00:00', timezone: '' },
    lateDelivery: { date: '06/18/2026', time: '12:00', timezone: 'CST' },
  },
  products: [
    {
      id: 'p1', productId: '39011E6K', description: 'Polyethylene Resin HD',
      grossWeight: { value: '100', uom: 'lb' }, volume: { value: '79', uom: 'cuft' },
      shipClass: 'Commodity',
    },
    {
      id: 'p2', productId: '28042B9G', description: 'Sulfuric Acid 93%',
      grossWeight: { value: '4200', uom: 'lb' }, volume: { value: '651', uom: 'cuft' },
      shipClass: 'Product Class',
    },
  ],
  specialServices: [
    { code: 'LFT', description: 'Lift gate' },
  ],
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/api/fixtures/orderFormValues.sample.ts
git commit -m "orders: filled long-form fixture for create-order tests"
```

---
### Task 5: Zod schemas — submit, save-gate, warnings (TDD)

**Files:**
- Create: `apps/odyssey-one/src/components/orders/create/schema.ts`
- Test: `apps/odyssey-one/src/components/orders/create/schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import {
  createOrderSchema,
  generalInfoSchema,
  pickupDeliverySchema,
  productRowSchema,
  productsSchema,
  saveGateSchema,
  getPastDateWarnings,
  normalizePhone,
} from './schema'
import { makeDefaultOrderFormValues } from '../../../api/types/orderFormVm'
import { orderFormValuesSample } from '../../../api/fixtures/orderFormValues.sample'

const sample = () => structuredClone(orderFormValuesSample)

describe('createOrderSchema (submit gate)', () => {
  it('passes the filled long-form sample', () => {
    expect(createOrderSchema.safeParse(sample()).success).toBe(true)
  })

  it('fails the pristine defaults (required sets empty, no products)', () => {
    const res = createOrderSchema.safeParse(makeDefaultOrderFormValues())
    expect(res.success).toBe(false)
  })
})

describe('generalInfoSchema', () => {
  it('requires owning org, equipment, freight term, ship direction — not order number', () => {
    const v = sample().general
    v.orderNumber = '' // optional at entry (Q16)
    expect(generalInfoSchema.safeParse(v).success).toBe(true)
    for (const key of ['owningOrganization', 'equipment', 'freightTerm', 'shipDirection'] as const) {
      const broken = { ...sample().general, [key]: '' }
      expect(generalInfoSchema.safeParse(broken).success).toBe(false)
    }
  })

  it('caps instruction descriptions at 2,000 chars', () => {
    const v = sample().general
    v.instructions = [{ id: 'i1', description: 'x'.repeat(2001) }]
    expect(generalInfoSchema.safeParse(v).success).toBe(false)
  })
})

describe('pickupDeliverySchema (Q22 conditional dates)', () => {
  it('SHIP selected → Late Pickup date required', () => {
    const v = sample().pickupDelivery
    v.latePickup = { date: '', time: '00:00', timezone: '' }
    const res = pickupDeliverySchema.safeParse(v)
    expect(res.success).toBe(false)
    expect(res.success ? [] : res.error.issues.map(i => i.path.join('.'))).toContain('latePickup.date')
  })

  it('DELIVERY selected → Late Delivery date required, Late Pickup free', () => {
    const v = sample().pickupDelivery
    v.planningDateType = 'DELIVERY'
    v.latePickup = { date: '', time: '00:00', timezone: '' }
    v.lateDelivery = { date: '', time: '00:00', timezone: '' }
    const res = pickupDeliverySchema.safeParse(v)
    expect(res.success).toBe(false)
    const paths = res.success ? [] : res.error.issues.map(i => i.path.join('.'))
    expect(paths).toContain('lateDelivery.date')
    expect(paths).not.toContain('latePickup.date')
  })

  it('enforces Early ≤ Late (pickup pair)', () => {
    const v = sample().pickupDelivery
    v.earlyPickup = { date: '06/16/2026', time: '08:00', timezone: 'CST' }
    v.latePickup = { date: '06/15/2026', time: '16:00', timezone: 'CST' }
    const res = pickupDeliverySchema.safeParse(v)
    expect(res.success).toBe(false)
    expect(res.success ? [] : res.error.issues.map(i => i.path.join('.'))).toContain('earlyPickup.date')
  })

  it('requires a timezone on any triad that has a date', () => {
    const v = sample().pickupDelivery
    v.latePickup = { date: '06/15/2026', time: '16:00', timezone: '' }
    const res = pickupDeliverySchema.safeParse(v)
    expect(res.success).toBe(false)
    expect(res.success ? [] : res.error.issues.map(i => i.path.join('.'))).toContain('latePickup.timezone')
  })

  it('party resolves via lookup pick OR complete manual address', () => {
    const v = sample().pickupDelivery
    v.consignor.locationId = '' // still complete manually → OK
    expect(pickupDeliverySchema.safeParse(v).success).toBe(true)
    v.consignor.city = '' // now incomplete and no pick → fail
    expect(pickupDeliverySchema.safeParse(v).success).toBe(false)
  })

  it('validates phone (E.164 after normalization) and email only when filled', () => {
    const v = sample().pickupDelivery
    v.consignor.contactPhone = '+1 (765) 670-4444' // display format → normalizes clean
    v.consignor.contactEmail = 'nick.strauss@krm.com'
    expect(pickupDeliverySchema.safeParse(v).success).toBe(true)
    v.consignor.contactPhone = '765-4444' // no +country → fail
    expect(pickupDeliverySchema.safeParse(v).success).toBe(false)
    v.consignor.contactPhone = ''
    v.consignor.contactEmail = 'not-an-email'
    expect(pickupDeliverySchema.safeParse(v).success).toBe(false)
    v.consignor.contactEmail = '' // both empty → fine (optional)
    expect(pickupDeliverySchema.safeParse(v).success).toBe(true)
  })
})

describe('productsSchema (Q26 — all five required, ≥1 row)', () => {
  it('rejects an empty product list', () => {
    expect(productsSchema.safeParse([]).success).toBe(false)
  })

  it('rejects a row missing any of the five fields', () => {
    const base = sample().products[0]
    expect(productRowSchema.safeParse(base).success).toBe(true)
    expect(productRowSchema.safeParse({ ...base, productId: '' }).success).toBe(false)
    expect(productRowSchema.safeParse({ ...base, description: '' }).success).toBe(false)
    expect(productRowSchema.safeParse({ ...base, grossWeight: { value: '', uom: 'lb' } }).success).toBe(false)
    expect(productRowSchema.safeParse({ ...base, volume: { value: '79', uom: '' } }).success).toBe(false)
    expect(productRowSchema.safeParse({ ...base, shipClass: '' }).success).toBe(false)
  })

  it('caps description at 150 chars and requires numeric positive measures', () => {
    const base = sample().products[0]
    expect(productRowSchema.safeParse({ ...base, description: 'x'.repeat(151) }).success).toBe(false)
    expect(productRowSchema.safeParse({ ...base, grossWeight: { value: 'abc', uom: 'lb' } }).success).toBe(false)
    expect(productRowSchema.safeParse({ ...base, grossWeight: { value: '0', uom: 'lb' } }).success).toBe(false)
  })
})

describe('saveGateSchema (Q16/Q27 — Order Number + Owning Organization)', () => {
  it('passes with just the two fields present', () => {
    const g = makeDefaultOrderFormValues().general
    g.orderNumber = 'ORD-1'
    g.owningOrganization = 'ERCO_SYS_01'
    expect(saveGateSchema.safeParse(g).success).toBe(true)
  })

  it('fails when either is missing', () => {
    const g1 = makeDefaultOrderFormValues().general
    g1.orderNumber = 'ORD-1'
    expect(saveGateSchema.safeParse(g1).success).toBe(false)
    const g2 = makeDefaultOrderFormValues().general
    g2.owningOrganization = 'ERCO_SYS_01'
    expect(saveGateSchema.safeParse(g2).success).toBe(false)
  })
})

describe('getPastDateWarnings (warnings, never errors)', () => {
  it('flags past/current dates and leaves future dates alone', () => {
    const v = sample().pickupDelivery
    const now = new Date('2026-06-16T12:00:00')
    const w = getPastDateWarnings(v, now)
    expect(w.earlyPickup).toMatch(/Past or current date/) // 06/15 is past
    expect(w.lateDelivery).toBeUndefined()                // 06/18 is future
  })

  it('past dates never block the schema (still valid)', () => {
    expect(pickupDeliverySchema.safeParse(sample().pickupDelivery).success).toBe(true)
  })
})

describe('normalizePhone', () => {
  it('strips display punctuation', () => {
    expect(normalizePhone('+1 (765) 670-4444')).toBe('+17656704444')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx vitest run src/components/orders/create/schema.test.ts
```

Expected: FAIL — `Cannot find module './schema'` (or equivalent resolve error).

- [ ] **Step 3: Write `src/components/orders/create/schema.ts`**

```ts
import { z } from 'zod'
import type { PickupDeliveryValues, DateTimeTriad } from '../../../api/types/orderFormVm'

// Validation model (spec §2.4). Two gates:
//  - createOrderSchema → enables Create Order (full form must pass)
//  - saveGateSchema    → Save / Save-for-Later (Order Number + Owning Org only; Q16/Q27)
// Past/current dates are WARNINGS (getPastDateWarnings), never schema errors
// (LINX-7632 family). Date format MM/DD/YYYY, time HH:MM 24h.

const DATE_RE = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const E164_RE = /^\+[1-9]\d{6,14}$/

export const normalizePhone = (raw: string): string => raw.replace(/[\s().-]/g, '')

// "06/15/2026" + "16:00" → "2026-06-15T16:00" (lexicographically comparable)
export function toComparableDateTime(date: string, time: string): string {
  const [m, d, y] = date.split('/')
  return `${y}-${m}-${d}T${time || '00:00'}`
}

const optionalDate = z.string().refine(v => v === '' || DATE_RE.test(v), 'Use MM/DD/YYYY')
const optionalTime = z.string().refine(v => v === '' || TIME_RE.test(v), 'Use HH:MM (24h)')

const dateTriadSchema = z.object({
  date: optionalDate,
  time: optionalTime,
  timezone: z.string(),
})

const referenceRowSchema = z.object({
  id: z.string(),
  guided: z.boolean(),
  type: z.string(),
  value: z.string(),
})

const instructionRowSchema = z.object({
  id: z.string(),
  description: z.string().max(2000, 'Maximum 2,000 characters'),
})

export const generalInfoSchema = z.object({
  orderNumber: z.string(), // optional at entry — auto-generated when blank (Q16)
  owningOrganization: z.string().min(1, 'Owning Organization is required'),
  owningOrganizationName: z.string(),
  equipment: z.string().min(1, 'Equipment is required'),
  freightTerm: z.string().min(1, 'Freight Term is required'),
  shipDirection: z.string().min(1, 'Ship Direction is required'),
  consolidatable: z.boolean(),
  carrierScac: z.string(),
  equipmentReferenceNumber: z.string(),
  instructions: z.array(instructionRowSchema),
  references: z.array(referenceRowSchema),
})

const MANUAL_ADDRESS_KEYS = ['idOrgName', 'longName', 'address1', 'city', 'state', 'postal', 'country'] as const

const partySchema = z.object({
  locationId: z.string(),
  manualMode: z.boolean(),
  idOrgName: z.string(),
  longName: z.string(),
  address1: z.string(),
  address2: z.string(), // optional (Efrain §2)
  city: z.string(),
  state: z.string(),
  postal: z.string(),
  country: z.string(),
  showContact: z.boolean(),
  contactName: z.string(),
  contactPhone: z.string().refine(
    v => v === '' || E164_RE.test(normalizePhone(v)),
    'Enter a valid phone number (e.g. +1 765 670 4444)',
  ),
  contactEmail: z.string().refine(
    v => v === '' || z.string().email().safeParse(v).success,
    'Enter a valid email address',
  ),
}).superRefine((p, ctx) => {
  // Resolved = lookup pick OR complete manual address (validated in combination)
  const manualComplete = MANUAL_ADDRESS_KEYS.every(k => p[k].trim() !== '')
  if (p.locationId.trim() !== '' || manualComplete) return
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ['locationId'],
    message: 'Pick a location or complete the manual address',
  })
  if (p.manualMode) {
    for (const k of MANUAL_ADDRESS_KEYS) {
      if (p[k].trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [k], message: 'Required' })
      }
    }
  }
})

const TRIAD_KEYS = ['earlyPickup', 'latePickup', 'earlyDelivery', 'lateDelivery'] as const

export const pickupDeliverySchema = z.object({
  consignor: partySchema,
  consignee: partySchema,
  planningDateType: z.enum(['SHIP', 'DELIVERY']),
  earlyPickup: dateTriadSchema,
  latePickup: dateTriadSchema,
  earlyDelivery: dateTriadSchema,
  lateDelivery: dateTriadSchema,
}).superRefine((pd, ctx) => {
  // Q22: Ship → Late Pickup required; Delivery → Late Delivery required
  const requiredKey = pd.planningDateType === 'SHIP' ? 'latePickup' : 'lateDelivery'
  if (pd[requiredKey].date === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [requiredKey, 'date'],
      message: pd.planningDateType === 'SHIP' ? 'Late Pickup date is required' : 'Late Delivery date is required',
    })
  }
  // Timezone required whenever its triad carries a date (auto-derive prefills;
  // manual select covers the not-derivable case — spec §2.4)
  for (const key of TRIAD_KEYS) {
    if (pd[key].date !== '' && pd[key].timezone === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key, 'timezone'], message: 'Time zone is required' })
    }
  }
  // Early ≤ Late ordering (only when both ends of a pair are filled)
  const after = (a: DateTimeTriad, b: DateTimeTriad) =>
    toComparableDateTime(a.date, a.time) > toComparableDateTime(b.date, b.time)
  if (pd.earlyPickup.date && pd.latePickup.date && after(pd.earlyPickup, pd.latePickup)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['earlyPickup', 'date'],
      message: 'Early Pickup must be on or before Late Pickup',
    })
  }
  if (pd.earlyDelivery.date && pd.lateDelivery.date && after(pd.earlyDelivery, pd.lateDelivery)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['earlyDelivery', 'date'],
      message: 'Early Delivery must be on or before Late Delivery',
    })
  }
})

const positiveNumeric = z.string().refine(
  v => v.trim() !== '' && !Number.isNaN(Number(v)) && Number(v) > 0,
  'Enter a value',
)

// Q26: ALL FIVE fields required per row (design supersedes LINX-9874 either/or)
export const productRowSchema = z.object({
  id: z.string(),
  productId: z.string().min(1, 'Select a Product ID'),
  description: z.string().min(1, 'Please provide a description').max(150, 'Maximum 150 characters'),
  grossWeight: z.object({ value: positiveNumeric, uom: z.string().min(1, 'Select') }),
  volume: z.object({ value: positiveNumeric, uom: z.string().min(1, 'Select') }),
  shipClass: z.string().min(1, 'Select a Ship Class'),
})

export const productsSchema = z.array(productRowSchema).min(1, 'Add at least one product')

export const specialServicesSchema = z.array(z.object({
  code: z.string().min(1),
  description: z.string(),
}))

export const createOrderSchema = z.object({
  general: generalInfoSchema,
  pickupDelivery: pickupDeliverySchema,
  products: productsSchema,
  specialServices: specialServicesSchema,
})

// Save-gate (Q16/Q27): Order Number + Owning Organization, applied to
// values.general by every save path (footer Save, Save-for-Later, navbar).
export const saveGateSchema = z.object({
  orderNumber: z.string().trim().min(1),
  owningOrganization: z.string().trim().min(1),
}).passthrough()

export const PAST_DATE_WARNING = 'Past or current date selected. Please check and modify as needed.'

// Non-blocking warnings (LINX-7632): date+time evaluated in combination.
export function getPastDateWarnings(
  pd: Pick<PickupDeliveryValues, 'earlyPickup' | 'latePickup' | 'earlyDelivery' | 'lateDelivery'>,
  now: Date = new Date(),
): Partial<Record<(typeof TRIAD_KEYS)[number], string>> {
  const pad = (n: number) => String(n).padStart(2, '0')
  const nowComparable = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  const warnings: Partial<Record<(typeof TRIAD_KEYS)[number], string>> = {}
  for (const key of TRIAD_KEYS) {
    const t = pd[key]
    if (t.date !== '' && DATE_RE.test(t.date) && toComparableDateTime(t.date, t.time) <= nowComparable) {
      warnings[key] = PAST_DATE_WARNING
    }
  }
  return warnings
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx vitest run src/components/orders/create/schema.test.ts
```

Expected: PASS (15 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/components/orders/create/schema.ts apps/odyssey-one/src/components/orders/create/schema.test.ts
git commit -m "orders: create-order zod schemas — submit + save-gate + date warnings (TDD)"
```

---
### Task 6: Mapper — form values → manualOrder (TDD)

**Files:**
- Create: `apps/odyssey-one/src/api/mappers/mapFormToOrderInterface.ts`
- Test: `apps/odyssey-one/src/api/mappers/mapFormToOrderInterface.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { mapFormToOrderInterface } from './mapFormToOrderInterface'
import { orderFormValuesSample } from '../fixtures/orderFormValues.sample'

const sample = () => structuredClone(orderFormValuesSample)

describe('mapFormToOrderInterface', () => {
  it('maps header identity + Q20/Q22 fields verbatim', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.orderNumber).toBe('ORD-1001')
    expect(mo.customerId).toBe('ERCO_SYS_01')
    expect(mo.freightTermCode).toBe('Pre-Paid')
    expect(mo.shipDirectionCode).toBe('Outbound')
    expect(mo.requestedDateType).toBe('SHIP')
  })

  it('omits a blank order number (backend auto-generates, Q16)', () => {
    const v = sample()
    v.general.orderNumber = '   '
    expect(mapFormToOrderInterface(v).manualOrder.orderNumber).toBeUndefined()
  })

  it('splits guided references into dedicated header fields, free-form into userFieldList (Q21)', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.pickupNumber).toBe('41197')
    expect(mo.poNumber).toBe('I567649422')
    expect(mo.userFieldList).toContainEqual({ userfieldType: 'REFERENCE', name: 'Dock Code', value: 'D-12' })
    // guided rows must NOT leak into the generic list
    expect(mo.userFieldList!.filter(f => f.userfieldType === 'REFERENCE')).toHaveLength(1)
  })

  it('omits empty guided fields and skips blank free-form rows', () => {
    const v = sample()
    v.general.references = [
      { id: 'ref-pickup', guided: true, type: 'Pickup Number', value: '' },
      { id: 'ref-po', guided: true, type: 'PO Number', value: '' },
      { id: 'r3', guided: false, type: '', value: '' },
    ]
    const mo = mapFormToOrderInterface(v).manualOrder
    expect(mo.pickupNumber).toBeUndefined()
    expect(mo.poNumber).toBeUndefined()
    expect(mo.userFieldList!.filter(f => f.userfieldType === 'REFERENCE')).toHaveLength(0)
  })

  it('writes consolidatable as a FLAG user field (Q15; residual mapping)', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.userFieldList).toContainEqual({ userfieldType: 'FLAG', name: 'CONSOLIDATABLE', value: 'Y' })
    const v = sample()
    v.general.consolidatable = false
    expect(mapFormToOrderInterface(v).manualOrder.userFieldList)
      .toContainEqual({ userfieldType: 'FLAG', name: 'CONSOLIDATABLE', value: 'N' })
  })

  it('defaults instruction type to 0012 and numbers rows (Q19)', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.orderInstructionList).toEqual([
      { instructionNumber: 1, instructionType: '0012', instructionDetail: 'Call ahead before pickup' },
    ])
  })

  it('maps equipment + carrier SCAC to orderCarrierEquipDetailList, eq ref number to equipmentNumber', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.orderCarrierEquipDetailList).toEqual([
      { carrierSequence: 1, scacCode: 'KNGT', equipmentCode: 'VAN' },
    ])
    expect(mo.equipmentNumber).toBe('EQ-REF-9')
  })

  it('flattens the parties to origin*/destination* fields incl. contact', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.originPartnerId).toBe('EW-TX-001')
    expect(mo.originFullName).toBe('ERCO WORLDWIDE')
    expect(mo.originAddress1).toBe('100 Industrial Blvd')
    expect(mo.originCity).toBe('Houston')
    expect(mo.originRegion).toBe('TX')
    expect(mo.originPostal).toBe('77001')
    expect(mo.originCountry).toBe('United States')
    expect(mo.originContactName).toBe('Nick Strauss')
    expect(mo.originPhone).toBe('+17656704444') // normalized E.164 on the wire
    expect(mo.originEmail).toBe('nick.strauss@krm.com')
    expect(mo.destinationPartnerId).toBe('GCR-TX-015')
    expect(mo.destinationCity).toBe('San Antonio')
    expect(mo.destinationContactName).toBeUndefined() // consignee has no contact
  })

  it('maps the date triads per the provisional early/late convention (plan decision 8)', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.requestedPickupDate).toBe('2026-06-15T08:00:00')
    expect(mo.requestedPickupTimeZoneCode).toBe('CST')
    expect(mo.pickupAppointment).toBe('2026-06-15T16:00:00')
    expect(mo.pickupAppointmentTimeZoneCode).toBe('CST')
    expect(mo.requestedDeliveryDate).toBeUndefined() // early delivery left empty
    expect(mo.deliveryAppointment).toBe('2026-06-18T12:00:00')
    expect(mo.deliveryAppointmentTimeZoneCode).toBe('CST')
  })

  it('maps product rows to orderLines with numeric measures {value, uom} verbatim', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.orderLines).toHaveLength(2)
    expect(mo.orderLines![0]).toEqual({
      lineIdentifier: 1,
      shipItemIdentifier: '39011E6K',
      productDescription: 'Polyethylene Resin HD',
      grossWeightValue: 100,
      grossWeightUomCode: 'lb',
      volumeValue: 79,
      volumeUomCode: 'cuft',
      shipClass: 'Commodity',
    })
  })

  it('computes header roll-ups (sum of lines, first line UoM)', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.grossWeightValue).toBe(4300)
    expect(mo.grossWeightUomCode).toBe('lb')
    expect(mo.volumeValue).toBe(730)
    expect(mo.volumeUomCode).toBe('cuft')
  })

  it('maps special services to orderAccessorialDetails in order', () => {
    const mo = mapFormToOrderInterface(sample()).manualOrder
    expect(mo.orderAccessorialDetails).toEqual([
      { accessorialCode: 'LFT', orderAccessorialDetailSequence: 1 },
    ])
  })

  it('stamps status RD_4_PLNNG on create, DRAFT when draft (LLD remark)', () => {
    expect(mapFormToOrderInterface(sample()).manualOrder.orderStatus)
      .toEqual({ orderStatusCode: 'RD_4_PLNNG', orderStatusName: 'Ready for Planning' })
    expect(mapFormToOrderInterface(sample(), { draft: true }).manualOrder.orderStatus)
      .toEqual({ orderStatusCode: 'DRAFT', orderStatusName: 'Draft' })
  })

  it('stamps the source application', () => {
    expect(mapFormToOrderInterface(sample()).manualOrder.sourceApplication)
      .toEqual({ sourceApplicationCode: 'ODYSSEY_ONE', sourceApplicationName: 'OdysseyOne' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx vitest run src/api/mappers/mapFormToOrderInterface.test.ts
```

Expected: FAIL — cannot resolve `./mapFormToOrderInterface`.

- [ ] **Step 3: Write the mapper**

```ts
import type {
  CreateOrderRequest,
  ManualOrder,
  ManualOrderLine,
  UserField,
} from '../types/createOrder'
import type { OrderFormValues, DateTimeTriad, PartyValues } from '../types/orderFormVm'
import { normalizePhone } from '../../components/orders/create/schema'

// OrderFormValues → POST /order-service/v3/manual-order request. The single
// reconciliation point for the create contract (plan decisions 1/8/9):
//  - root key is "manualOrder" (LLD-verbatim; spec said orderInterface{})
//  - early/late dates ride requested*/appointment fields (PROVISIONAL — Ramesh)
//  - consolidatable + free-form references ride userFieldList (no LLD home)
// Sends entered values verbatim — the US|Metric toggle is display-only.

const trimmedOrUndefined = (v: string): string | undefined => {
  const t = v.trim()
  return t === '' ? undefined : t
}

// "06/15/2026" + "16:00" → "2026-06-15T16:00:00" (wall time; TZ rides the
// sibling *TimeZoneCode field — no Z suffix, no timezone shifting)
function toIsoTimestamp(triad: DateTimeTriad): string | undefined {
  if (triad.date === '') return undefined
  const [m, d, y] = triad.date.split('/')
  return `${y}-${m}-${d}T${triad.time || '00:00'}:00`
}

const tzOf = (triad: DateTimeTriad): string | undefined =>
  triad.date === '' ? undefined : trimmedOrUndefined(triad.timezone)

type PartyPrefix = 'origin' | 'destination'

function mapParty(prefix: PartyPrefix, p: PartyValues): Partial<ManualOrder> {
  const out: Record<string, string | undefined> = {
    [`${prefix}PartnerId`]: trimmedOrUndefined(p.locationId) ?? trimmedOrUndefined(p.idOrgName),
    [`${prefix}FullName`]: trimmedOrUndefined(p.longName),
    [`${prefix}Address1`]: trimmedOrUndefined(p.address1),
    [`${prefix}Address2`]: trimmedOrUndefined(p.address2),
    [`${prefix}City`]: trimmedOrUndefined(p.city),
    [`${prefix}Region`]: trimmedOrUndefined(p.state),
    [`${prefix}Country`]: trimmedOrUndefined(p.country),
    [`${prefix}Postal`]: trimmedOrUndefined(p.postal),
    [`${prefix}ContactName`]: trimmedOrUndefined(p.contactName),
    [`${prefix}Phone`]: p.contactPhone.trim() === '' ? undefined : normalizePhone(p.contactPhone),
    [`${prefix}Email`]: trimmedOrUndefined(p.contactEmail),
  }
  return out as Partial<ManualOrder>
}

export function mapFormToOrderInterface(
  values: OrderFormValues,
  { draft = false }: { draft?: boolean } = {},
): CreateOrderRequest {
  const { general, pickupDelivery, products, specialServices } = values

  // Q21: guided rows → dedicated header fields; free-form rows → userFieldList
  const guided = (type: string): string | undefined =>
    trimmedOrUndefined(general.references.find(r => r.guided && r.type === type)?.value ?? '')
  const userFieldList: UserField[] = [
    // Q15 residual: no LLD home for the consolidatable header flag
    { userfieldType: 'FLAG', name: 'CONSOLIDATABLE', value: general.consolidatable ? 'Y' : 'N' },
    ...general.references
      .filter(r => !r.guided && (r.type.trim() !== '' || r.value.trim() !== ''))
      .map(r => ({ userfieldType: 'REFERENCE', name: r.type.trim(), value: r.value.trim() })),
  ]

  const orderLines: ManualOrderLine[] = products.map((p, i) => ({
    lineIdentifier: i + 1,
    shipItemIdentifier: p.productId,
    productDescription: p.description,
    grossWeightValue: Number(p.grossWeight.value),
    grossWeightUomCode: p.grossWeight.uom,
    volumeValue: Number(p.volume.value),
    volumeUomCode: p.volume.uom,
    shipClass: p.shipClass,
  }))

  // Header roll-ups: raw sum, first line's UoM (mock-grade; mixed-UoM totals
  // are a live-flip reconciliation item)
  const sum = (pick: (l: ManualOrderLine) => number) =>
    orderLines.reduce((acc, l) => acc + pick(l), 0)

  const manualOrder: ManualOrder = {
    orderNumber: trimmedOrUndefined(general.orderNumber),
    customerId: trimmedOrUndefined(general.owningOrganization),
    freightTermCode: trimmedOrUndefined(general.freightTerm),
    shipDirectionCode: trimmedOrUndefined(general.shipDirection),
    pickupNumber: guided('Pickup Number'),
    poNumber: guided('PO Number'),
    requestedDateType: pickupDelivery.planningDateType,
    requestedPickupDate: toIsoTimestamp(pickupDelivery.earlyPickup),
    requestedPickupTimeZoneCode: tzOf(pickupDelivery.earlyPickup),
    pickupAppointment: toIsoTimestamp(pickupDelivery.latePickup),
    pickupAppointmentTimeZoneCode: tzOf(pickupDelivery.latePickup),
    requestedDeliveryDate: toIsoTimestamp(pickupDelivery.earlyDelivery),
    requestedDeliveryTimeZoneCode: tzOf(pickupDelivery.earlyDelivery),
    deliveryAppointment: toIsoTimestamp(pickupDelivery.lateDelivery),
    deliveryAppointmentTimeZoneCode: tzOf(pickupDelivery.lateDelivery),
    equipmentNumber: trimmedOrUndefined(general.equipmentReferenceNumber),
    ...mapParty('origin', pickupDelivery.consignor),
    ...mapParty('destination', pickupDelivery.consignee),
    grossWeightValue: orderLines.length ? sum(l => l.grossWeightValue) : undefined,
    grossWeightUomCode: orderLines[0]?.grossWeightUomCode,
    volumeValue: orderLines.length ? sum(l => l.volumeValue) : undefined,
    volumeUomCode: orderLines[0]?.volumeUomCode,
    orderStatus: draft
      ? { orderStatusCode: 'DRAFT', orderStatusName: 'Draft' }
      : { orderStatusCode: 'RD_4_PLNNG', orderStatusName: 'Ready for Planning' },
    sourceApplication: { sourceApplicationCode: 'ODYSSEY_ONE', sourceApplicationName: 'OdysseyOne' },
    orderInstructionList: general.instructions
      .filter(i => i.description.trim() !== '')
      .map((i, idx) => ({
        instructionNumber: idx + 1,
        instructionType: '0012', // Q19: type removed from UI; backend default
        instructionDetail: i.description,
      })),
    orderCarrierEquipDetailList: (general.equipment || general.carrierScac)
      ? [{
          carrierSequence: 1,
          scacCode: trimmedOrUndefined(general.carrierScac),
          equipmentCode: trimmedOrUndefined(general.equipment),
        }]
      : [],
    orderLines,
    orderAccessorialDetails: specialServices.map((s, i) => ({
      accessorialCode: s.code,
      orderAccessorialDetailSequence: i + 1,
    })),
    userFieldList,
  }

  return { manualOrder }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx vitest run src/api/mappers/mapFormToOrderInterface.test.ts
```

Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/api/mappers/mapFormToOrderInterface.ts apps/odyssey-one/src/api/mappers/mapFormToOrderInterface.test.ts
git commit -m "orders: mapFormToOrderInterface — form → LLD manualOrder, Q15/Q19/Q21/Q22 baked (TDD)"
```

---

### Task 7: Order service write layer — createOrder / saveDraft / getDraft (TDD)

The mock write layer is a module-level in-memory overlay over `orders.json`: created orders and drafts prepend rows that `getOrderList` merges in, so they appear in the Summary grid. Lost on refresh — accepted (spec §2.3).

**Files:**
- Modify: `apps/odyssey-one/src/api/services/orderService.ts`
- Test: `apps/odyssey-one/src/api/services/orderServiceWrite.test.ts` (new file; the existing `orderService.test.ts` stays untouched and must keep passing)

- [ ] **Step 1: Write the failing test (import-after-mock idiom)**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))
vi.mock('../../data/orders', () => ({ getAllOrders: () => [] }))

import { createOrder, saveDraft, getDraft, getOrderList, __resetOrderWriteState } from './orderService'
import { mapFormToOrderInterface } from '../mappers/mapFormToOrderInterface'
import { orderFormValuesSample } from '../fixtures/orderFormValues.sample'

const sample = () => structuredClone(orderFormValuesSample)
const page = () => ({ pagination: { pageNumber: 1, pageSize: 20 } })

beforeEach(() => __resetOrderWriteState())

describe('orderService.createOrder (mock)', () => {
  it('returns the LINX-9340 envelope with a generated S26… number when blank', async () => {
    const v = sample()
    v.general.orderNumber = ''
    const res = await createOrder(mapFormToOrderInterface(v))
    expect(res.success).toBe(true)
    expect(res.orderId).toBeTruthy()
    expect(res.data!.orderNumber).toMatch(/^S26\d{4}NGW$/)
    expect(res.message).toContain(res.data!.orderNumber)
    expect(res.data!.shipmentMode).toBe('Ground') // Q28 open; mock constant
  })

  it('respects a provided order number', async () => {
    const res = await createOrder(mapFormToOrderInterface(sample()))
    expect(res.data!.orderNumber).toBe('ORD-1001')
  })

  it('appends a Ready For Plan row the Summary grid can see', async () => {
    await createOrder(mapFormToOrderInterface(sample()))
    const list = await getOrderList(page())
    const row = list.orders.find(o => o.orderNumber === 'ORD-1001')
    expect(row).toBeDefined()
    expect(row!.orderStatus).toBe('Ready For Plan')
    expect(row!.orderSource).toBe('MANUAL')
    expect(row!.customer).toBe('ERCO_SYS_01')
    expect(row!.consignor.locationId).toBe('EW-TX-001')
    expect(row!.grossWeight).toEqual({ value: 4300, uom: 'lb' })
  })
})

describe('orderService.saveDraft / getDraft (mock)', () => {
  it('upserts a Draft row and round-trips the form values', async () => {
    const saved = await saveDraft(sample())
    expect(saved.draftId).toBeTruthy()
    expect(saved.orderNumber).toBe('ORD-1001')

    const list = await getOrderList(page())
    const row = list.orders.find(o => o.orderNumber === 'ORD-1001')
    expect(row!.orderStatus).toBe('Draft')

    const draft = await getDraft(saved.draftId)
    expect(draft!.values).toEqual(sample())
  })

  it('resolves a draft by order number too (the ?draft=<orderNumber> path)', async () => {
    await saveDraft(sample())
    const draft = await getDraft('ORD-1001')
    expect(draft).not.toBeNull()
    expect(draft!.values.general.owningOrganization).toBe('ERCO_SYS_01')
  })

  it('re-saving with the same draftId updates in place — no duplicate rows', async () => {
    const first = await saveDraft(sample())
    const v = sample()
    v.general.orderNumber = 'ORD-1001-EDITED'
    const second = await saveDraft(v, first.draftId)
    expect(second.draftId).toBe(first.draftId)

    const list = await getOrderList(page())
    expect(list.orders.filter(o => o.orderStatus === 'Draft')).toHaveLength(1)
    expect(list.orders[0].orderNumber).toBe('ORD-1001-EDITED')

    const draft = await getDraft(first.draftId)
    expect(draft!.values.general.orderNumber).toBe('ORD-1001-EDITED')
  })

  it('returns null for an unknown draft key', async () => {
    expect(await getDraft('nope')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx vitest run src/api/services/orderServiceWrite.test.ts
```

Expected: FAIL — `createOrder` is not exported from `./orderService`.

- [ ] **Step 3: Extend `src/api/services/orderService.ts`**

Two edits. First, add the new imports at the top (below the existing ones):

```ts
import { mapFormToOrderInterface } from '../mappers/mapFormToOrderInterface'
import type { CreateOrderRequest, CreateOrderResponse, ManualOrder } from '../types/createOrder'
import type { OrderFormValues } from '../types/orderFormVm'
```

Second, inside `getOrderList`, change the mock-branch source line:

```ts
// before
let rows = getAllOrders() as OrderListRow[]
// after — merge the in-memory write overlay (created orders + drafts) ahead
// of the static dataset so new rows surface on page 1 of a desc sort too
let rows = [...overlayRows, ...(getAllOrders() as OrderListRow[])]
```

Then append the write layer at the end of the file:

```ts
// ─── Write layer (spec §2.3) ────────────────────────────────────────────────
// Mock mode keeps a module-level in-memory overlay over orders.json: created
// orders and drafts prepend grid rows; drafts also retain their form values
// for reopen via /orders/create?draft=<key>. Lost on refresh — accepted.

let overlayRows: OrderListRow[] = []
const draftValues = new Map<string, OrderFormValues>()
const draftIdByOrderNumber = new Map<string, string>()
const orderNumberByDraftId = new Map<string, string>()
let createSeq = 0
let draftSeq = 0

/** Test hook — resets all mock write state. */
export function __resetOrderWriteState(): void {
  overlayRows = []
  draftValues.clear()
  draftIdByOrderNumber.clear()
  orderNumberByDraftId.clear()
  createSeq = 0
  draftSeq = 0
}

function manualOrderToListRow(mo: ManualOrder, orderNumber: string, statusLabel: string): OrderListRow {
  return {
    orderNumber,
    orderSource: 'MANUAL',
    customer: mo.customerId ?? '',
    shipDirection: mo.shipDirectionCode ?? '',
    freightTerms: mo.freightTermCode ?? '',
    equipment: mo.orderCarrierEquipDetailList?.[0]?.equipmentCode ?? '',
    consignor: {
      locationId: mo.originPartnerId ?? '',
      city: mo.originCity ?? '',
      state: mo.originRegion ?? '',
      country: 'US',
      earliestPickupDateTime: mo.requestedPickupDate ?? '',
      latestPickupDateTime: mo.pickupAppointment ?? '',
    },
    consignee: {
      locationId: mo.destinationPartnerId ?? '',
      city: mo.destinationCity ?? '',
      state: mo.destinationRegion ?? '',
      country: 'US',
      earliestDeliveryDateTime: mo.requestedDeliveryDate ?? '',
      latestDeliveryDateTime: mo.deliveryAppointment ?? '',
    },
    grossWeight: { value: mo.grossWeightValue ?? 0, uom: mo.grossWeightUomCode ?? 'lbs' },
    volume: { value: mo.volumeValue ?? 0, uom: mo.volumeUomCode ?? 'cbf' },
    commodity: mo.orderLines?.[0]?.productDescription ?? '',
    orderStatus: statusLabel,
  }
}

export async function createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
  if (getApiMode() === 'live') {
    return apiPost<CreateOrderResponse>('/order-service/v3/manual-order', request)
  }
  createSeq += 1
  const mo = request.manualOrder
  // Screen-6 shape "S260004NGW"; deterministic suffix keeps tests stable
  const orderNumber = mo.orderNumber?.trim() || `S26${String(createSeq).padStart(4, '0')}NGW`
  overlayRows = [
    manualOrderToListRow(mo, orderNumber, 'Ready For Plan'),
    ...overlayRows.filter(r => r.orderNumber !== orderNumber),
  ]
  return {
    orderId: 90000 + createSeq,
    success: true,
    message: `Order ${orderNumber} created successfully`,
    data: {
      orderNumber,
      orderDate: new Date().toISOString(),
      orderDateTimeZoneCode: 'EST',
      shipmentMode: 'Ground', // Q28 open — derivation unknown; mock constant
    },
  }
}

export interface SaveDraftResult {
  draftId: string
  orderNumber: string
}

export async function saveDraft(values: OrderFormValues, draftId?: string | null): Promise<SaveDraftResult> {
  const request = mapFormToOrderInterface(values, { draft: true })
  if (getApiMode() === 'live') {
    // LLD remark: draft orders go through the same manual-order POST with
    // orderStatusCode DRAFT (the mapper already stamped it)
    await apiPost('/order-service/v3/manual-order', request)
    const orderNumber = request.manualOrder.orderNumber ?? ''
    return { draftId: orderNumber, orderNumber }
  }
  const id = draftId ?? `draft-${++draftSeq}`
  const orderNumber = values.general.orderNumber.trim() // save-gate guarantees non-empty
  const previousNumber = orderNumberByDraftId.get(id)
  if (previousNumber && previousNumber !== orderNumber) draftIdByOrderNumber.delete(previousNumber)
  overlayRows = [
    manualOrderToListRow(request.manualOrder, orderNumber, 'Draft'),
    ...overlayRows.filter(r => r.orderNumber !== orderNumber && r.orderNumber !== previousNumber),
  ]
  draftValues.set(id, structuredClone(values))
  draftIdByOrderNumber.set(orderNumber, id)
  orderNumberByDraftId.set(id, orderNumber)
  return { draftId: id, orderNumber }
}

export interface DraftRecord {
  draftId: string
  values: OrderFormValues
}

/** Resolves by internal draftId OR order number (the ?draft=<orderNumber> URL). */
export async function getDraft(key: string): Promise<DraftRecord | null> {
  if (getApiMode() === 'live') {
    // Reopening a live draft needs the inverse mapping (order/view → form
    // values) — out of scope this build (plan decision 21)
    throw new Error('getDraft: live mapping pending (order/view → form hydration); mock-mode only')
  }
  const draftId = draftValues.has(key) ? key : draftIdByOrderNumber.get(key)
  if (!draftId) return null
  const values = draftValues.get(draftId)
  return values ? { draftId, values: structuredClone(values) } : null
}
```

- [ ] **Step 4: Run the new tests AND the existing list tests (regression)**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx vitest run src/api/services/orderServiceWrite.test.ts src/api/services/orderService.test.ts
```

Expected: PASS — 8 new write tests + the 5 existing list tests (overlay is empty there, behavior unchanged).

- [ ] **Step 5: Type-check, then commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx tsc --noEmit
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/api/services/orderService.ts apps/odyssey-one/src/api/services/orderServiceWrite.test.ts
git commit -m "orders: orderService write layer — createOrder/saveDraft/getDraft over an in-memory overlay (TDD)"
```

---
### Task 8: Lookup service (TDD)

**Files:**
- Create: `apps/odyssey-one/src/api/services/lookupService.ts`
- Test: `apps/odyssey-one/src/api/services/lookupService.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))

import { getLookupOptions, TYPEAHEAD_MIN_CHARS } from './lookupService'

describe('lookupService.getLookupOptions (mock)', () => {
  it('gates typeahead types at 2 characters, excluding spaces (LINX-7553)', async () => {
    expect(TYPEAHEAD_MIN_CHARS).toBe(2)
    expect(await getLookupOptions('owning-org', 'e')).toEqual([])
    expect(await getLookupOptions('owning-org', ' e ')).toEqual([]) // spaces don't count
    expect((await getLookupOptions('owning-org', 'er')).length).toBeGreaterThan(0)
  })

  it('matches case-insensitively across value, label, and description', async () => {
    const byLabel = await getLookupOptions('owning-org', 'erco systems')
    expect(byLabel.map(o => o.value)).toContain('ERCO_SYS_01')
    const byValue = await getLookupOptions('owning-org', 'erco_sys')
    expect(byValue.map(o => o.value)).toContain('ERCO_SYS_01')
    const byDesc = await getLookupOptions('special-service', 'lift')
    expect(byDesc.map(o => o.value)).toContain('LFT')
  })

  it('sorts by frequency descending', async () => {
    const all = await getLookupOptions('special-service', 'pallet') // PALEXG(90) + PJC(80)
    expect(all.map(o => o.value)).toEqual(['PALEXG', 'PJC'])
  })

  it('scopes equipment by owning organization (empty without one)', async () => {
    expect(await getLookupOptions('equipment', 'va')).toEqual([])
    const acme = await getLookupOptions('equipment', 'va', { orgId: 'ACME_LOG_01' })
    expect(acme.map(o => o.value)).toEqual(['VAN'])
    const acmeAll = await getLookupOptions('equipment', '  ', { orgId: 'ACME_LOG_01' })
    expect(acmeAll.map(o => o.value).sort()).toEqual(['FLT', 'VAN']) // restricted subset
    const erco = await getLookupOptions('equipment', '', { orgId: 'ERCO_SYS_01' })
    expect(erco).toHaveLength(4) // unrestricted org sees all codes
  })

  it('select-like types return the full list with no typeahead gate', async () => {
    const terms = await getLookupOptions('freight-term', '')
    expect(terms.map(o => o.value)).toEqual(['Pre-Paid', 'COL', 'Third Party'])
    const dirs = await getLookupOptions('ship-direction', '')
    expect(dirs.map(o => o.value)).toEqual(['Outbound', 'Inbound'])
  })

  it('org-address options carry the hydration meta (manual-grid autofill)', async () => {
    const [opt] = await getLookupOptions('org-address', 'EW-TX-001')
    expect(opt.value).toBe('EW-TX-001')
    expect(opt.meta).toMatchObject({
      longName: 'ERCO WORLDWIDE',
      city: 'Houston',
      state: 'TX',
      postal: '77001',
      country: 'United States',
    })
  })

  it('product options carry the description for the auto-filled cell', async () => {
    const [opt] = await getLookupOptions('product', '39011E6K')
    expect(opt.description).toBe('Polyethylene Resin HD')
  })
})
```

Note the equipment expectation: `'va'` matches `VAN` by value AND label (`Dry Van`); the empty/whitespace query on a scoped org returns the full restricted subset — equipment's gate is the org, not the character count (the field is disabled without an org, and on focus it should show the org's catalog).

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx vitest run src/api/services/lookupService.test.ts
```

Expected: FAIL — cannot resolve `./lookupService`.

- [ ] **Step 3: Write `src/api/services/lookupService.ts`**

```ts
import { getApiMode } from '../config'
import { apiPost } from '../client'
import {
  OWNING_ORGS,
  EQUIPMENT_CODES,
  EQUIPMENT_LABELS,
  EQUIPMENT_SCOPE,
  FREIGHT_TERMS,
  SHIP_DIRECTIONS,
  SHIP_CLASSES,
  SPECIAL_SERVICES,
  CARRIERS,
  TIMEZONES,
  LOCATION_ADDRESSES,
  CHEMICAL_PRODUCTS,
} from '../../data/master-data'

// Typeahead lookups behind the mock/live seam (spec §2.3). live → the
// order-service lookup catalog; mock → master-data pools with the LINX-7553
// contract: 2-char minimum (excluding spaces) on typeahead types,
// case-insensitive matching, frequency-sorted. Debounce (~250ms) lives in
// the UI hook (useDebouncedValue) — the service is synchronous-shaped.

export type LookupType =
  | 'owning-org'
  | 'equipment'
  | 'freight-term'
  | 'ship-direction'
  | 'org-address'
  | 'product'
  | 'ship-class'
  | 'special-service'
  | 'timezone'
  | 'carrier'

export interface LookupOption {
  value: string
  label: string
  description?: string
  frequency: number
  meta?: Record<string, unknown> // org-address: address fields for hydration
}

export const TYPEAHEAD_MIN_CHARS = 2

// Plain selects return their full list; only true typeaheads gate on length
// (plan decision 14). Equipment gates on org instead (decision 15).
const TYPEAHEAD_TYPES = new Set<LookupType>([
  'owning-org', 'org-address', 'product', 'special-service', 'carrier',
])

export interface LookupParams {
  orgId?: string
}

function poolFor(type: LookupType, params: LookupParams): LookupOption[] {
  switch (type) {
    case 'owning-org':
      return OWNING_ORGS
    case 'equipment': {
      if (!params.orgId) return [] // scoped by Owning Organization — none picked, no catalog
      const codes: string[] = EQUIPMENT_SCOPE[params.orgId as keyof typeof EQUIPMENT_SCOPE] ?? EQUIPMENT_CODES
      return codes.map((code: string, i: number) => ({
        value: code,
        label: `${code} — ${EQUIPMENT_LABELS[code as keyof typeof EQUIPMENT_LABELS] ?? code}`,
        frequency: codes.length - i,
      }))
    }
    case 'freight-term':
      return FREIGHT_TERMS.map((t: { value: string; label: string }, i: number) => ({
        ...t, frequency: FREIGHT_TERMS.length - i,
      }))
    case 'ship-direction':
      return SHIP_DIRECTIONS.map((d: { value: string; label: string }, i: number) => ({
        ...d, frequency: SHIP_DIRECTIONS.length - i,
      }))
    case 'ship-class':
      return SHIP_CLASSES.map((c: string, i: number) => ({
        value: c, label: c, frequency: SHIP_CLASSES.length - i,
      }))
    case 'org-address':
      return LOCATION_ADDRESSES.map((a: Record<string, string | number>) => ({
        value: String(a.locationId),
        label: `${a.locationId}: ${a.longName}`,
        description: `${a.city}, ${a.state} ${a.postal}`,
        frequency: Number(a.frequency),
        meta: {
          longName: a.longName, address1: a.address1, city: a.city,
          state: a.state, postal: a.postal, country: a.country,
        },
      }))
    case 'product':
      return CHEMICAL_PRODUCTS.map((p: { item: string; desc: string; hazmat: boolean }, i: number) => ({
        value: p.item,
        label: p.item,
        description: p.desc,
        frequency: CHEMICAL_PRODUCTS.length - i,
        meta: { hazmat: p.hazmat },
      }))
    case 'special-service':
      return SPECIAL_SERVICES.map((s: { code: string; description: string; frequency: number }) => ({
        value: s.code, label: s.code, description: s.description, frequency: s.frequency,
      }))
    case 'timezone':
      return TIMEZONES.map((tz: string, i: number) => ({
        value: tz, label: tz, frequency: TIMEZONES.length - i,
      }))
    case 'carrier':
      return CARRIERS.map((c: { scac: string; name: string; frequency: number }) => ({
        value: c.scac, label: `${c.scac} — ${c.name}`, frequency: c.frequency,
      }))
  }
}

export async function getLookupOptions(
  type: LookupType,
  query: string,
  params: LookupParams = {},
): Promise<LookupOption[]> {
  if (getApiMode() === 'live') {
    // Path per spec §2.3 (v1 catalog); request body per the LLD lookup shape
    // ({ lookup, pageNumber, pageSize }). Response-shape reconciliation is a
    // flip-time task against live Swagger (plan decision 22).
    return apiPost<LookupOption[]>(`/order-service/v1/${type}/lookup`, {
      lookup: query,
      pageNumber: 0,
      pageSize: 30,
      ...(params.orgId ? { owningOrganizationId: params.orgId } : {}),
    })
  }

  const gateLength = query.replace(/\s+/g, '').length // spaces excluded (LINX-7553)
  if (TYPEAHEAD_TYPES.has(type) && gateLength < TYPEAHEAD_MIN_CHARS) return []

  const q = query.trim().toLowerCase()
  return poolFor(type, params)
    .filter(o =>
      q === '' ||
      o.value.toLowerCase().includes(q) ||
      o.label.toLowerCase().includes(q) ||
      (o.description ?? '').toLowerCase().includes(q))
    .sort((a, b) => b.frequency - a.frequency || a.label.localeCompare(b.label))
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx vitest run src/api/services/lookupService.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/api/services/lookupService.ts apps/odyssey-one/src/api/services/lookupService.test.ts
git commit -m "orders: lookupService — typeahead contract over master-data pools, mock/live seam (TDD)"
```

---

### Task 9: React-query hooks

**Files:**
- Create: `apps/odyssey-one/src/api/queries/useCreateOrder.ts`
- Create: `apps/odyssey-one/src/api/queries/useSaveDraft.ts`
- Create: `apps/odyssey-one/src/api/queries/useLookup.ts`

- [ ] **Step 1: Write `src/api/queries/useCreateOrder.ts`**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createOrder } from '../services/orderService'
import { mapFormToOrderInterface } from '../mappers/mapFormToOrderInterface'
import type { OrderFormValues } from '../types/orderFormVm'

// Mapping lives in the hook (Shipments/S52 precedent): the component hands
// over raw form values, the seam owns the wire shape.
export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: OrderFormValues) => createOrder(mapFormToOrderInterface(values)),
    onSuccess: () => {
      // The new Ready For Plan row must surface on the Summary grid
      queryClient.invalidateQueries({ queryKey: ['order-list'] })
    },
  })
}
```

- [ ] **Step 2: Write `src/api/queries/useSaveDraft.ts`**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveDraft } from '../services/orderService'
import type { OrderFormValues } from '../types/orderFormVm'

export interface SaveDraftInput {
  values: OrderFormValues
  draftId?: string | null // pass the previous id to upsert the same draft
}

export function useSaveDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ values, draftId }: SaveDraftInput) => saveDraft(values, draftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-list'] }) // Draft row appears in the grid
    },
  })
}
```

- [ ] **Step 3: Write `src/api/queries/useLookup.ts`**

```ts
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getLookupOptions } from '../services/lookupService'
import type { LookupType } from '../services/lookupService'

export interface UseLookupOptions {
  orgId?: string
  enabled?: boolean // consumers gate on dropdown-open; debounce lives in useDebouncedValue
}

export function useLookup(type: LookupType, query: string, opts: UseLookupOptions = {}) {
  return useQuery({
    queryKey: ['lookup', type, query.trim().toLowerCase(), opts.orgId ?? null],
    queryFn: () => getLookupOptions(type, query, { orgId: opts.orgId }),
    enabled: opts.enabled ?? true,
    staleTime: 5 * 60 * 1000, // master data is stable within a session
    placeholderData: keepPreviousData, // no dropdown flash while typing
  })
}
```

- [ ] **Step 4: Type-check + full api suite (no regressions)**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx tsc --noEmit
npx vitest run src/api src/components/orders/create
```

Expected: tsc exit 0; all tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/api/queries/useCreateOrder.ts apps/odyssey-one/src/api/queries/useSaveDraft.ts apps/odyssey-one/src/api/queries/useLookup.ts
git commit -m "orders: create-order mutations + gated lookup query hook"
```

---

## Batch 2 — Route, contextual navbar, section shell

### Task 10: CreateOrderModeContext + navbar branch

**Files:**
- Create: `apps/odyssey-one/src/contexts/CreateOrderModeContext.jsx`
- Modify: `apps/odyssey-one/src/main.jsx`
- Modify: `apps/odyssey-one/src/components/layout/Navbar.jsx`

- [ ] **Step 1: Write `src/contexts/CreateOrderModeContext.jsx` (mirrors EditModeContext's handlersRef pattern)**

```jsx
import { createContext, useContext, useState, useCallback, useRef } from 'react'

const CreateOrderModeContext = createContext(null)

// Contextual-navbar state for /orders/create (spec §2.1) — the Home
// widget-edit pattern: the route's form registers handlers on mount; the
// Navbar's create-order branch calls them. saveForLater does NOT exit the
// mode itself — the handler navigates away, which unmounts the form and
// exits via its cleanup.
export function CreateOrderModeProvider({ children }) {
  const [isCreateOrderMode, setIsCreateOrderMode] = useState(false)
  const handlersRef = useRef({ onSaveForLater: null, onClose: null })

  const enterCreateOrderMode = useCallback(({ onSaveForLater, onClose } = {}) => {
    handlersRef.current = { onSaveForLater, onClose }
    setIsCreateOrderMode(true)
  }, [])

  const exitCreateOrderMode = useCallback(() => {
    handlersRef.current = { onSaveForLater: null, onClose: null }
    setIsCreateOrderMode(false)
  }, [])

  const saveForLater = useCallback(() => {
    handlersRef.current.onSaveForLater?.()
  }, [])

  // ✕ routes through the same path as Cancel: the discard/save modal
  const close = useCallback(() => {
    handlersRef.current.onClose?.()
  }, [])

  return (
    <CreateOrderModeContext.Provider
      value={{ isCreateOrderMode, enterCreateOrderMode, exitCreateOrderMode, saveForLater, close }}
    >
      {children}
    </CreateOrderModeContext.Provider>
  )
}

export function useCreateOrderMode() {
  const ctx = useContext(CreateOrderModeContext)
  if (!ctx) throw new Error('useCreateOrderMode must be used inside CreateOrderModeProvider')
  return ctx
}
```

- [ ] **Step 2: Mount the provider in `src/main.jsx`**

Add the import next to the other context imports:

```jsx
import { CreateOrderModeProvider } from './contexts/CreateOrderModeContext.jsx'
```

and wrap inside `EditModeProvider` (outside `CustomersProvider` — order among siblings doesn't matter, mirror the existing nesting):

```jsx
// before
      <EditModeProvider>
        <CustomersProvider>
          <App />
        </CustomersProvider>
      </EditModeProvider>
// after
      <EditModeProvider>
        <CreateOrderModeProvider>
          <CustomersProvider>
            <App />
          </CustomersProvider>
        </CreateOrderModeProvider>
      </EditModeProvider>
```

- [ ] **Step 3: Add the create-order branch to `src/components/layout/Navbar.jsx`**

Add the hook import below the EditMode import:

```jsx
import { useCreateOrderMode } from '../../contexts/CreateOrderModeContext.jsx'
```

Destructure it below the `useEditMode()` line:

```jsx
  const { isCreateOrderMode, saveForLater, close } = useCreateOrderMode()
```

Then insert a second contextual branch directly after the `if (isEditMode) { … }` block (TrailNav's editor API expresses everything — plan decision 3):

```jsx
  if (isCreateOrderMode) {
    return (
      <NavbarShell
        compact
        lead={<LeadNav />}
        search={<GlobalSearch mode="title" title="Create New Order" />}
        trail={
          <TrailNav
            mode="editor"
            showPrimaryButton={false}
            secondaryButtonLabel="Save for Later"
            onSecondaryButtonClick={saveForLater}
            onHelpClick={() => {}} // inert this build (spec §2.1)
            onRightIconClick={close}
          />
        }
      />
    )
  }
```

- [ ] **Step 4: Quick render check**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
npm run build:odyssey-one
```

Expected: build succeeds (the branch is dead until Task 12 mounts the route; this catches syntax/import errors).

- [ ] **Step 5: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/contexts/CreateOrderModeContext.jsx apps/odyssey-one/src/main.jsx apps/odyssey-one/src/components/layout/Navbar.jsx
git commit -m "orders: CreateOrderModeContext + contextual navbar (title + Save for Later + ✕)"
```

---
### Task 11: create-order.css + StickyFooter + DiscardSaveModal

orders.css stays Summary-page-only (it's organized as page plumbing for the grid); the create flow gets its own sheet, same conventions (`co-` prefix, token-bound — colors/radii/type/shadows always via `var(--…)`; tiny component-internal geometric paddings may be raw px per the token-discipline refinement).

**Files:**
- Create: `apps/odyssey-one/src/components/orders/create/create-order.css`
- Create: `apps/odyssey-one/src/components/orders/create/StickyFooter.jsx`
- Create: `apps/odyssey-one/src/components/orders/create/DiscardSaveModal.jsx`

- [ ] **Step 1: Write `create-order.css`**

```css
/* Create Order flow — app-local styles (spec §2; normalization candidates
   land in the parallel session, so every class here is a swap seam).
   Token discipline: colors/radii/type/shadows via tokens only. */

.create-order-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  gap: var(--spacing-4);
}

.co-breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  color: var(--text-tertiary);
}

.co-breadcrumb a {
  color: var(--text-tertiary);
  text-decoration: none;
}

.co-breadcrumb a:hover {
  color: var(--text-secondary);
  text-decoration: underline;
}

/* ── Sections (accordion stack — the Accordion owns the rail) ── */

.co-sections {
  display: flex;
  flex-direction: column;
}

.co-section-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.co-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-4) var(--spacing-6);
  align-items: start;
}

.co-subhead {
  margin: 0;
  color: var(--text-primary);
}

.co-field-hint {
  margin: var(--spacing-1) 0 0;
  color: var(--text-tertiary);
}

.co-field-warning {
  margin: var(--spacing-1) 0 0;
  color: var(--badge-yellow-text);
}

.co-link-row {
  display: flex;
  align-items: center;
}

/* ── Typeahead / select dropdowns ───────────────────────── */

.co-typeahead {
  position: relative;
}

.co-dropdown {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  z-index: 60;
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-1) 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

.co-dropdown__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  border: none;
  background: transparent;
  text-align: left;
  padding: var(--spacing-2) var(--spacing-4);
  color: var(--text-secondary);
  cursor: pointer;
}

.co-dropdown__item:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.co-dropdown__item-desc {
  color: var(--text-tertiary);
}

.co-dropdown__status {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  color: var(--text-tertiary);
}

/* ── Repeatable rows (references / instructions) ────────── */

.co-rep {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  align-items: flex-start;
}

.co-rep__grid {
  display: grid;
  gap: var(--spacing-2) var(--spacing-3);
  align-items: center;
  width: 100%;
}

.co-rep__head {
  color: var(--text-secondary);
}

.co-rep__num,
.co-rep__locked {
  color: var(--text-primary);
}

/* ── Pickup & Delivery ──────────────────────────────────── */

.co-party-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-8);
  align-items: start;
}

.co-party {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  align-items: flex-start;
}

.co-party > .co-typeahead {
  width: 100%;
}

.co-party__title {
  margin: 0;
  color: var(--text-primary);
}

.co-address-grid,
.co-contact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-4);
  width: 100%;
}

.co-planning {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.co-radio-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
}

.co-date-groups {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-6);
}

.co-triad {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: var(--spacing-3);
  align-items: start;
}

/* ── Product Information ────────────────────────────────── */

.co-product-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
}

.co-product-search {
  width: 280px;
}

.co-product-toolbar__right {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

.co-product-count {
  margin: 0;
  color: var(--text-tertiary);
}

.co-product-table-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  align-items: flex-start;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--spacing-2) var(--spacing-4) var(--spacing-4);
  background: var(--bg-primary);
  width: 100%;
  overflow-x: auto;
}

.co-product-table-wrap .odyssey-table {
  min-width: 880px;
}

.co-product-empty {
  color: var(--text-tertiary);
  text-align: center;
}

.co-cell-measure {
  display: grid;
  grid-template-columns: minmax(72px, 1fr) minmax(88px, auto);
  gap: var(--spacing-2);
  align-items: start;
}

.co-inline-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

/* Editor-row cells host inputs; loosen the read-row nowrap */
.co-product-editor td {
  white-space: normal;
  vertical-align: top;
}

/* ── Special Services ───────────────────────────────────── */

.co-services {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  align-items: stretch;
}

.co-services .co-typeahead {
  max-width: 480px;
}

.co-services-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.co-services-table th,
.co-services-table td {
  text-align: left;
  padding: var(--spacing-3) var(--spacing-4);
  border-bottom: 1px solid var(--border-subtle);
}

.co-services-table th {
  color: var(--text-secondary);
}

.co-services-table td {
  color: var(--text-primary);
}

.co-dropdown--table .co-services-table tbody tr {
  cursor: pointer;
}

.co-dropdown--table .co-services-table tbody tr:hover td {
  background: var(--bg-secondary);
}

/* ── Sticky footer ──────────────────────────────────────── */

.co-footer {
  position: sticky;
  bottom: 0;
  z-index: 30;
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  padding: var(--spacing-4) var(--spacing-6);
  background: var(--bg-primary);
  border-top: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-md);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.co-footer__right {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

/* ── Modal footer ───────────────────────────────────────── */

.co-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-3);
}

.co-modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  color: var(--text-secondary);
}

/* ── Confirmation (screens 6/7) ─────────────────────────── */

.co-confirm-strip {
  display: flex;
  align-items: center;
  gap: var(--spacing-10);
  padding: var(--spacing-4) var(--spacing-6);
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}

.co-kv {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-4) var(--spacing-6);
}

.co-kv__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.co-kv__label {
  color: var(--text-tertiary);
}

.co-kv__value {
  color: var(--text-primary);
}

.co-confirm-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}
```

- [ ] **Step 2: Write `StickyFooter.jsx`**

```jsx
import { Button } from '@odyssey/ui'

/**
 * StickyFooter — Cancel (left) · Save · Create Order (right, primary,
 * disabled until the full-form schema passes). Spec §2.2 / Q27: Save keeps
 * the UI open; Cancel routes through the discard/save modal.
 */
export default function StickyFooter({ onCancel, onSave, onCreate, createDisabled, saving }) {
  return (
    <div className="co-footer">
      <Button variant="secondary" size="lg" onClick={onCancel}>Cancel</Button>
      <div className="co-footer__right">
        <Button variant="secondary" size="lg" onClick={onSave} disabled={saving}>Save</Button>
        <Button variant="primary" size="lg" onClick={onCreate} disabled={createDisabled}>Create Order</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write `DiscardSaveModal.jsx`**

```jsx
import { Button, ModalMedium } from '@odyssey/ui'

/**
 * DiscardSaveModal — screen 3. Reached from footer Cancel AND navbar ✕
 * (same path, spec §4). Save for Later = secondary; Discard = primary
 * (explicit confirm — clicking it IS the confirmation). Copy verbatim
 * from the design capture.
 */
export default function DiscardSaveModal({ onClose, onSaveForLater, onDiscard, saving }) {
  return (
    <ModalMedium
      title="Discard order"
      onClose={onClose}
      ariaLabel="Discard order"
      footer={
        <div className="co-modal-footer">
          <Button variant="secondary" size="lg" onClick={onSaveForLater} disabled={saving}>
            Save for Later
          </Button>
          <Button variant="primary" size="lg" onClick={onDiscard}>
            Discard
          </Button>
        </div>
      }
    >
      <div className="co-modal-body">
        <p className="text-label-sm-regular" style={{ margin: 0 }}>Would you like to cancel this order?</p>
        <p className="text-label-sm-regular" style={{ margin: 0 }}>Alternatively, you can save it to complete later.</p>
      </div>
    </ModalMedium>
  )
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/components/orders/create/create-order.css apps/odyssey-one/src/components/orders/create/StickyFooter.jsx apps/odyssey-one/src/components/orders/create/DiscardSaveModal.jsx
git commit -m "orders: create-flow styles + sticky footer + discard/save modal"
```

---

### Task 12: Route + CreateOrderForm shell (stepper, banner, footer, modal, save flows)

The shell mounts the whole save/draft state machine with placeholder section bodies; Batches 3–6 fill the sections in. After this task the flow is walkable end-to-end (minus real fields).

**Files:**
- Create: `apps/odyssey-one/src/components/orders/create/useSectionStatus.js`
- Create: `apps/odyssey-one/src/components/orders/create/CreateOrderForm.jsx`
- Create: `apps/odyssey-one/src/routes/orders/CreateOrderRoute.jsx`
- Modify: `apps/odyssey-one/src/App.jsx`
- Modify: `apps/odyssey-one/src/routes/orders/OrdersRoute.jsx`

- [ ] **Step 1: Write `useSectionStatus.js`**

```js
import { useEffect, useState } from 'react'
import { useWatch } from 'react-hook-form'
import { generalInfoSchema, pickupDeliverySchema, productsSchema } from './schema'

/**
 * Per-section StepIndicator status (spec §2.2): each circle derives from its
 * sub-schema's validity against watched values, debounced 300ms. Special
 * Services is optional — it shows complete once ≥1 service is picked (plan
 * decision 20; a pure schema check would render it green from first paint).
 */
export function useSectionStatus(control) {
  const values = useWatch({ control })
  const [status, setStatus] = useState({
    general: false,
    pickupDelivery: false,
    products: false,
    specialServices: false,
  })

  useEffect(() => {
    const t = setTimeout(() => {
      setStatus({
        general: generalInfoSchema.safeParse(values?.general).success,
        pickupDelivery: pickupDeliverySchema.safeParse(values?.pickupDelivery).success,
        products: productsSchema.safeParse(values?.products).success,
        specialServices: (values?.specialServices?.length ?? 0) > 0,
      })
    }, 300)
    return () => clearTimeout(t)
  }, [values])

  return status
}
```

- [ ] **Step 2: Write `CreateOrderForm.jsx`**

```jsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Accordion, Alert, Button, PageHeader } from '@odyssey/ui'
import { useCreateOrderMode } from '../../../contexts/CreateOrderModeContext.jsx'
import { useCreateOrder } from '../../../api/queries/useCreateOrder'
import { useSaveDraft } from '../../../api/queries/useSaveDraft'
import { getDraft } from '../../../api/services/orderService'
import { makeDefaultOrderFormValues } from '../../../api/types/orderFormVm'
import { createOrderSchema, saveGateSchema } from './schema'
import { useSectionStatus } from './useSectionStatus.js'
import StickyFooter from './StickyFooter.jsx'
import DiscardSaveModal from './DiscardSaveModal.jsx'
import GeneralInformationSection from './sections/GeneralInformationSection.jsx'
import PickupDeliverySection from './sections/PickupDeliverySection.jsx'
import ProductInformationSection from './sections/ProductInformationSection.jsx'
import SpecialServicesSection from './sections/SpecialServicesSection.jsx'

const SAVE_GATE_MESSAGE =
  'Order Number and Owning Organization are both required to save this order.'

/**
 * CreateOrderForm — the create-flow orchestrator (spec §2.2, §4).
 * RHF + zodResolver own validation; the four Accordions ARE the stepper
 * (Accordion embeds StepIndicator + rail — plan decision 5). Save flows:
 *  - Save (footer):           save-gate → draft upsert, UI stays open
 *  - Save for Later (navbar / modal): save-gate → draft + navigate to /orders
 *  - Discard (modal):         navigate, nothing kept
 *  - Create Order (footer):   full schema → createOrder → onSubmitted
 */
export default function CreateOrderForm({ draftKey, onSubmitted }) {
  const navigate = useNavigate()
  const { enterCreateOrderMode, exitCreateOrderMode } = useCreateOrderMode()
  const methods = useForm({
    resolver: zodResolver(createOrderSchema),
    mode: 'onChange',
    defaultValues: makeDefaultOrderFormValues(),
  })
  const { control, formState, getValues, handleSubmit, reset } = methods

  const [expanded, setExpanded] = useState({
    general: true, pickupDelivery: false, products: false, specialServices: false,
  })
  const [bannerOpen, setBannerOpen] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saveGateError, setSaveGateError] = useState('')
  const [saveNotice, setSaveNotice] = useState('')
  const [draftId, setDraftId] = useState(null)

  const status = useSectionStatus(control)
  const createOrderMutation = useCreateOrder()
  const saveDraftMutation = useSaveDraft()

  // ── Draft reopen (spec §4): /orders/create?draft=<orderNumber> ──
  useEffect(() => {
    if (!draftKey) return
    let cancelled = false
    getDraft(draftKey).then((draft) => {
      if (cancelled || !draft) return
      reset(draft.values)
      setDraftId(draft.draftId)
    })
    return () => { cancelled = true }
  }, [draftKey, reset])

  // ── Save flows ──
  const passesSaveGate = useCallback(() => {
    const res = saveGateSchema.safeParse(getValues().general)
    if (res.success) {
      setSaveGateError('')
      return true
    }
    setSaveGateError(SAVE_GATE_MESSAGE) // red error Alert naming both fields (Q16/Q27)
    return false
  }, [getValues])

  const handleSave = useCallback(() => {
    if (!passesSaveGate()) return
    saveDraftMutation.mutate(
      { values: getValues(), draftId },
      {
        onSuccess: (res) => {
          setDraftId(res.draftId)
          setSaveNotice(`Draft saved (${res.orderNumber}). It stays open here and appears on the Orders grid.`)
        },
      },
    )
  }, [passesSaveGate, saveDraftMutation, getValues, draftId])

  const handleSaveForLater = useCallback(() => {
    if (!passesSaveGate()) {
      setModalOpen(false) // surface the red alert in the form behind the modal
      return
    }
    saveDraftMutation.mutate(
      { values: getValues(), draftId },
      { onSuccess: () => navigate('/orders') },
    )
  }, [passesSaveGate, saveDraftMutation, getValues, draftId, navigate])

  const handleDiscard = useCallback(() => {
    navigate('/orders') // explicit confirm happened in the modal; nothing kept
  }, [navigate])

  // ── Navbar contextual mode: register latest handlers via a ref ──
  const saveForLaterRef = useRef(handleSaveForLater)
  useEffect(() => { saveForLaterRef.current = handleSaveForLater })
  useEffect(() => {
    enterCreateOrderMode({
      onSaveForLater: () => saveForLaterRef.current(),
      onClose: () => setModalOpen(true), // ✕ = same path as Cancel
    })
    return () => exitCreateOrderMode()
  }, [enterCreateOrderMode, exitCreateOrderMode])

  // ── Submit ──
  const onSubmit = handleSubmit((values) => {
    createOrderMutation.mutate(values, {
      onSuccess: (response) => {
        exitCreateOrderMode() // confirmation gets the normal navbar (plan decision 25)
        onSubmitted({ response, values })
      },
    })
  })

  const toggle = (key) => (next) => setExpanded(e => ({ ...e, [key]: next }))
  const expandAll = () => setExpanded({ general: true, pickupDelivery: true, products: true, specialServices: true })

  return (
    <FormProvider {...methods}>
      <nav className="co-breadcrumb text-label-sm-regular" aria-label="Breadcrumb">
        <Link to="/orders">Orders</Link>
        <span aria-hidden="true">›</span>
        <span>Create new order</span>
      </nav>

      <PageHeader title="Create New Order">
        <Button variant="link" onClick={expandAll}>Expand All</Button>
      </PageHeader>

      {bannerOpen && (
        <Alert variant="warning" onClose={() => setBannerOpen(false)}>
          Required fields will complete steps.
        </Alert>
      )}

      {saveGateError && (
        <Alert variant="error" onClose={() => setSaveGateError('')}>
          {saveGateError}
        </Alert>
      )}

      {saveNotice && (
        <Alert variant="success" onClose={() => setSaveNotice('')}>
          {saveNotice}
        </Alert>
      )}

      <div className="co-sections">
        <Accordion
          position="start"
          status={status.general ? 'on' : 'off'}
          title="General Information"
          description="Order identifiers, organization, equipment, and references"
          expanded={expanded.general}
          onToggle={toggle('general')}
        >
          <GeneralInformationSection />
        </Accordion>

        <Accordion
          position="mid"
          status={status.pickupDelivery ? 'on' : 'off'}
          title="Pickup and Delivery"
          description="Consignor, consignee, and planning dates"
          expanded={expanded.pickupDelivery}
          onToggle={toggle('pickupDelivery')}
        >
          <PickupDeliverySection />
        </Accordion>

        <Accordion
          position="mid"
          status={status.products ? 'on' : 'off'}
          title="Product Information 🚧 Under Construction"
          description="Products on this order"
          expanded={expanded.products}
          onToggle={toggle('products')}
        >
          <ProductInformationSection />
        </Accordion>

        <Accordion
          position="end"
          status={status.specialServices ? 'on' : 'off'}
          title="Special Services (Optional)"
          description="Service requirements pulled from master data"
          expanded={expanded.specialServices}
          onToggle={toggle('specialServices')}
        >
          <SpecialServicesSection />
        </Accordion>
      </div>

      {createOrderMutation.isError && (
        <Alert variant="error" showClose={false}>
          Something went wrong creating the order. Your entries are intact — try again.
        </Alert>
      )}

      <StickyFooter
        onCancel={() => setModalOpen(true)}
        onSave={handleSave}
        onCreate={onSubmit}
        createDisabled={!formState.isValid || createOrderMutation.isPending}
        saving={saveDraftMutation.isPending}
      />

      {modalOpen && (
        <DiscardSaveModal
          onClose={() => setModalOpen(false)}
          onSaveForLater={handleSaveForLater}
          onDiscard={handleDiscard}
          saving={saveDraftMutation.isPending}
        />
      )}
    </FormProvider>
  )
}
```

- [ ] **Step 3: Create the four placeholder section files** (replaced in Batches 3–6 — they exist now so the shell compiles; each is a two-liner, NOT committed as final)

`sections/GeneralInformationSection.jsx`, `sections/PickupDeliverySection.jsx`, `sections/ProductInformationSection.jsx`, `sections/SpecialServicesSection.jsx` — identical placeholder bodies (swap the name):

```jsx
export default function GeneralInformationSection() {
  return <p className="text-label-sm-regular" style={{ color: 'var(--text-tertiary)', margin: 0 }}>Section content lands in its build batch.</p>
}
```

- [ ] **Step 4: Write `src/routes/orders/CreateOrderRoute.jsx`**

```jsx
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppShell from '../../components/layout/AppShell'
import CreateOrderForm from '../../components/orders/create/CreateOrderForm.jsx'
import ConfirmationView from '../../components/orders/create/ConfirmationView.jsx'
import '../../components/orders/create/create-order.css'

/**
 * CreateOrderRoute — /orders/create inside AppShell (sidebar stays; the
 * navbar flips via CreateOrderModeContext). Post-submit, the form unmounts
 * and the confirmation renders on the same route (spec §5).
 * Dev triggers: ?draft=<orderNumber> reopens a draft; ?confirm=async forces
 * the async confirmation variant (Q17 — mock always returns sync).
 */
export default function CreateOrderRoute() {
  const [searchParams] = useSearchParams()
  const [submitted, setSubmitted] = useState(null)
  const draftKey = searchParams.get('draft')
  const forceAsync = searchParams.get('confirm') === 'async'

  return (
    <AppShell>
      <div className="create-order-page">
        {submitted ? (
          <ConfirmationView
            data={submitted.response.data}
            values={submitted.values}
            variant={forceAsync ? 'async' : 'sync'}
          />
        ) : (
          <CreateOrderForm draftKey={draftKey} onSubmitted={setSubmitted} />
        )}
      </div>
    </AppShell>
  )
}
```

Also create the `ConfirmationView.jsx` placeholder (real version lands in Task 23):

```jsx
export default function ConfirmationView() {
  return <p className="text-label-sm-regular" style={{ color: 'var(--text-tertiary)', margin: 0 }}>Confirmation lands in Batch 6.</p>
}
```

- [ ] **Step 5: Wire the route in `src/App.jsx`**

Add the import next to `OrdersRoute`:

```jsx
import CreateOrderRoute from './routes/orders/CreateOrderRoute.jsx'
```

and the route directly after the `/orders` route line:

```jsx
        <Route path="/orders" element={<OrdersRoute />} />
        <Route path="/orders/create" element={<CreateOrderRoute />} />
```

- [ ] **Step 6: Wire the Summary page's Create Order button in `src/routes/orders/OrdersRoute.jsx`**

Add `useNavigate` to the router import and instantiate it:

```jsx
import { useNavigate } from 'react-router-dom'
// inside the component, next to the other hooks:
const navigate = useNavigate()
```

Then replace the inert button:

```jsx
// before
          {/* Inert until the create-form build (spec §2) */}
          <Button variant="primary" icon={<Plus {...ICON_MD} />}>Create Order</Button>
// after
          <Button variant="primary" icon={<Plus {...ICON_MD} />} onClick={() => navigate('/orders/create')}>
            Create Order
          </Button>
```

- [ ] **Step 7: Smoke-verify the shell in the dev server**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
npm run dev:odyssey-one
```

Navigate to `/orders` → click **Create Order** and verify:
1. Route lands on `/orders/create`; sidebar stays; navbar flips to compact title "Create New Order" + **Save for Later** + ? + ✕.
2. Breadcrumb "Orders › Create new order", PageHeader "Create New Order" + Expand All.
3. Yellow banner "Required fields will complete steps." (dismissible).
4. Four accordion sections with grey StepIndicators on a connected rail; General Information starts expanded; Expand All opens all four.
5. Footer: Cancel / Save / **Create Order disabled**.
6. **Save** with empty fields → red Alert naming Order Number + Owning Organization (modal NOT involved).
7. **Cancel** and navbar **✕** both open the Discard order modal; **Discard** → back to `/orders`, nothing kept; **Save for Later** with empty fields → modal closes, red Alert shows.
8. Leaving the route restores the normal navbar (GlobalSearch back).
9. Console: no errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/components/orders/create apps/odyssey-one/src/routes/orders apps/odyssey-one/src/App.jsx
git commit -m "orders: /orders/create shell — stepper accordions, banner, footer, modal, save-gate flows"
```

---
## Batch 3 — General Information (Quick + Long)

### Task 13: Field primitives — useDebouncedValue, TypeaheadSelect, SelectField

**Files:**
- Create: `apps/odyssey-one/src/components/orders/create/fields/useDebouncedValue.js`
- Create: `apps/odyssey-one/src/components/orders/create/fields/TypeaheadSelect.jsx`
- Create: `apps/odyssey-one/src/components/orders/create/fields/SelectField.jsx`

- [ ] **Step 1: Write `fields/useDebouncedValue.js`**

```js
import { useEffect, useState } from 'react'

// ~250ms debounce for the typeahead contract (LINX-7553 / spec §2.3)
export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
```

- [ ] **Step 2: Write `fields/TypeaheadSelect.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button, FormField } from '@odyssey/ui'
import { useLookup } from '../../../../api/queries/useLookup'
import { useDebouncedValue } from './useDebouncedValue.js'

/**
 * TypeaheadSelect — generic async lookup field (spec §8). FormField skin +
 * a co-dropdown of useLookup results. Contract: 2-char min (service-gated),
 * case-insensitive, frequency-sorted, ~250ms debounce. `allowFreeText`
 * commits the raw text on blur (Customer Required Carrier). Lookup failures
 * render an inline "couldn't load" row with retry — never crash the form
 * (spec §6). Required-ness is conveyed by the caller's label ("… *").
 */
export default function TypeaheadSelect({
  label,
  showLabel = true,
  placeholder,
  lookupType,
  orgId,
  selected,        // { value, label } | null — the committed pick
  onSelect,        // (option | null) => void
  allowFreeText = false,
  error,
  disabled = false,
  id,
}) {
  const [inputText, setInputText] = useState(selected?.label ?? '')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const debounced = useDebouncedValue(inputText, 250)
  const lookup = useLookup(lookupType, debounced, { orgId, enabled: open && !disabled })
  const options = lookup.data ?? []
  const minCharsPending = debounced.replace(/\s/g, '').length < 2

  // External changes (draft hydration, org-change clearing) refresh the text
  useEffect(() => {
    setInputText(selected?.label ?? '')
  }, [selected?.value, selected?.label])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const commitFreeText = () => {
    if (!allowFreeText) return
    const text = inputText.trim()
    if (text !== '' && text !== (selected?.label ?? '')) {
      onSelect({ value: text, label: text, freeText: true })
    }
  }

  const pick = (opt) => {
    onSelect(opt)
    setInputText(opt.label)
    setOpen(false)
  }

  return (
    <div className="co-typeahead" ref={wrapRef}>
      <FormField
        id={id}
        label={label}
        showLabel={showLabel}
        placeholder={placeholder}
        value={inputText}
        error={error}
        disabled={disabled}
        trailingIcon={<ChevronDown size={16} />}
        autoComplete="off"
        onChange={(e) => {
          setInputText(e.target.value)
          setOpen(true)
          if (selected && e.target.value !== selected.label) onSelect(null) // typing invalidates the pick
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => commitFreeText()}
      />
      {open && !disabled && (
        <div className="co-dropdown" onMouseDown={(e) => e.preventDefault()}>
          {lookup.isError ? (
            <div className="co-dropdown__status text-label-sm-regular">
              Couldn’t load options.
              <Button variant="link" onClick={() => lookup.refetch()}>Retry</Button>
            </div>
          ) : options.length > 0 ? (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="co-dropdown__item"
                onClick={() => pick(opt)}
              >
                <span className="text-label-sm-regular">{opt.label}</span>
                {opt.description && (
                  <span className="co-dropdown__item-desc text-label-xs-regular">{opt.description}</span>
                )}
              </button>
            ))
          ) : (
            <div className="co-dropdown__status text-label-sm-regular">
              {lookup.isFetching
                ? 'Searching…'
                : minCharsPending && lookupType !== 'equipment'
                  ? 'Type at least 2 characters'
                  : 'No matches'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write `fields/SelectField.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { FormField } from '@odyssey/ui'

/**
 * SelectField — static-option select on the FormField skin (read-only input
 * as the trigger; FormField spreads unknown props onto its <input>, so
 * readOnly/onMouseDown/onKeyDown land there). Lean stand-in for the future
 * normalized dropdown (SHP-66); options: [{ value, label }].
 */
export default function SelectField({
  label,
  showLabel = true,
  placeholder = 'Select an option',
  options,
  value,
  onChange,
  error,
  disabled = false,
  id,
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const selectedOption = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="co-typeahead" ref={wrapRef}>
      <FormField
        id={id}
        label={label}
        showLabel={showLabel}
        placeholder={placeholder}
        value={selectedOption?.label ?? ''}
        onChange={() => {}}
        error={error}
        disabled={disabled}
        trailingIcon={<ChevronDown size={16} />}
        readOnly
        style={{ cursor: disabled ? 'default' : 'pointer' }}
        onMouseDown={(e) => {
          e.preventDefault()
          if (!disabled) setOpen(o => !o)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!disabled) setOpen(o => !o)
          }
          if (e.key === 'Escape') setOpen(false)
        }}
      />
      {open && !disabled && (
        <div className="co-dropdown" onMouseDown={(e) => e.preventDefault()}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="co-dropdown__item"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              <span className="text-label-sm-regular">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/components/orders/create/fields
git commit -m "orders: TypeaheadSelect + SelectField + debounce hook (create-flow field primitives)"
```

---

### Task 14: RepeatableRows (references / instructions)

**Files:**
- Create: `apps/odyssey-one/src/components/orders/create/RepeatableRows.jsx`

- [ ] **Step 1: Write `RepeatableRows.jsx`**

```jsx
import { Fragment } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, FormField } from '@odyssey/ui'

export const newRowId = () => `row-${Math.random().toString(36).slice(2, 9)}`

/**
 * RepeatableRows — generic add/delete row table (spec §8): References
 * (two columns, guided rows lock the Type cell to a static label — Q21)
 * and Instructions (numbered, one description column). Rows are plain
 * objects keyed by `id`; the parent owns the array (Controller +
 * immutable updates — plan decision 13).
 *
 * columns:        [{ key, header, placeholder, maxLength? }]
 * lockedCell:     (row, colKey) => boolean — render as static label
 * rowPlaceholder: (row, colKey) => string | undefined — per-row override
 */
export default function RepeatableRows({
  numbered = false,
  columns,
  rows,
  lockedCell,
  rowPlaceholder,
  onCellChange,   // (rowId, colKey, value)
  onDeleteRow,    // (rowId)
  onAddRow,       // ()
  addLabel,
}) {
  const template = `${numbered ? '32px ' : ''}repeat(${columns.length}, 1fr) 40px`
  return (
    <div className="co-rep">
      {rows.length > 0 && (
        <div className="co-rep__grid" style={{ gridTemplateColumns: template }}>
          {numbered && <span className="co-rep__head text-label-sm-medium">#</span>}
          {columns.map((col) => (
            <span key={col.key} className="co-rep__head text-label-sm-medium">{col.header}</span>
          ))}
          <span className="co-rep__head" aria-hidden="true" />
          {rows.map((row, i) => (
            <Fragment key={row.id}>
              {numbered && <span className="co-rep__num text-label-sm-regular">{i + 1}</span>}
              {columns.map((col) =>
                lockedCell?.(row, col.key) ? (
                  <span key={col.key} className="co-rep__locked text-label-sm-medium">{row[col.key]}</span>
                ) : (
                  <FormField
                    key={col.key}
                    showLabel={false}
                    placeholder={rowPlaceholder?.(row, col.key) ?? col.placeholder}
                    value={row[col.key]}
                    maxLength={col.maxLength}
                    onChange={(e) => onCellChange(row.id, col.key, e.target.value)}
                  />
                ),
              )}
              <Button
                variant="icon"
                size="sm"
                icon={<Trash2 size={16} />}
                aria-label="Delete row"
                onClick={() => onDeleteRow(row.id)}
              />
            </Fragment>
          ))}
        </div>
      )}
      <Button variant="link" icon={<Plus size={16} />} onClick={onAddRow}>{addLabel}</Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/components/orders/create/RepeatableRows.jsx
git commit -m "orders: RepeatableRows — guided + free-form row table (references/instructions)"
```

---

### Task 15: General Information section (Quick + Long)

Replaces the Task-12 placeholder. Layout per screens 1/1-Long: core fields → **References (in Quick, above Add More Details — screens-reference discrepancy note)** → Add More Details toggle → Additional Information + Add Instructions.

**Files:**
- Modify (replace placeholder): `apps/odyssey-one/src/components/orders/create/sections/GeneralInformationSection.jsx`

- [ ] **Step 1: Write the section**

```jsx
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Controller, useFormContext } from 'react-hook-form'
import { Button, Checkbox, FormField } from '@odyssey/ui'
import TypeaheadSelect from '../fields/TypeaheadSelect.jsx'
import SelectField from '../fields/SelectField.jsx'
import RepeatableRows, { newRowId } from '../RepeatableRows.jsx'
import { FREIGHT_TERMS, SHIP_DIRECTIONS } from '../../../../data/master-data'

/**
 * General Information (spec §3.1, screens 1/1-Long).
 * Quick: Order Number (optional, auto-gen helper), Owning Organization*,
 * Equipment* (org-scoped), Freight Term* (Q20 dynamic default), Ship
 * Direction* (default Outbound), Consolidatable (checked — Q15), References.
 * Long ("Add More Details"): Additional Information (Carrier SCAC typeahead
 * w/ free text, Equipment Reference Number) + Add Instructions (Q19
 * description-only rows).
 */
export default function GeneralInformationSection() {
  const { control, setValue, watch, getValues } = useFormContext()
  const [isLongMode, setIsLongMode] = useState(false)

  const owningOrg = watch('general.owningOrganization')
  const owningOrgName = watch('general.owningOrganizationName')
  const shipDirection = watch('general.shipDirection')

  // Q20: dynamic Freight Term default — Outbound→Pre-Paid, Inbound→COL.
  // Never overwrites once the user touched the Freight Term field.
  const freightTouched = useRef(false)
  useEffect(() => {
    if (freightTouched.current) return
    setValue('general.freightTerm', shipDirection === 'Inbound' ? 'COL' : 'Pre-Paid')
  }, [shipDirection, setValue])

  // Draft reopen: a hydrated draft that carries Long-only data should open Long
  useEffect(() => {
    const g = getValues('general')
    if (g.carrierScac || g.equipmentReferenceNumber || g.instructions.length > 0) {
      setIsLongMode(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateRows = (name) => (rowId, key, value) => {
    const rows = getValues(name)
    setValue(name, rows.map(r => (r.id === rowId ? { ...r, [key]: value } : r)), { shouldValidate: true })
  }
  const deleteRow = (name) => (rowId) => {
    setValue(name, getValues(name).filter(r => r.id !== rowId), { shouldValidate: true })
  }

  return (
    <div className="co-section-body">
      <div className="co-grid-2">
        <Controller
          name="general.orderNumber"
          control={control}
          render={({ field }) => (
            <div>
              <FormField
                label="Order Number"
                placeholder="Enter an ID"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
              />
              <p className="co-field-hint text-label-xs-regular">Auto-generated if left blank.</p>
            </div>
          )}
        />

        <Controller
          name="general.owningOrganization"
          control={control}
          render={({ field, fieldState }) => (
            <TypeaheadSelect
              label="Owning Organization *"
              placeholder="Search an organization"
              lookupType="owning-org"
              selected={field.value ? { value: field.value, label: owningOrgName || field.value } : null}
              onSelect={(opt) => {
                field.onChange(opt?.value ?? '')
                setValue('general.owningOrganizationName', opt?.label ?? '')
                // Equipment options are org-scoped — a different org means a different catalog
                setValue('general.equipment', '', { shouldValidate: true })
              }}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="general.equipment"
          control={control}
          render={({ field, fieldState }) => (
            <TypeaheadSelect
              label="Equipment *"
              placeholder={owningOrg ? 'Search equipment' : 'Pick an Owning Organization first'}
              lookupType="equipment"
              orgId={owningOrg || undefined}
              disabled={!owningOrg}
              selected={field.value ? { value: field.value, label: field.value } : null}
              onSelect={(opt) => field.onChange(opt?.value ?? '')}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="general.freightTerm"
          control={control}
          render={({ field, fieldState }) => (
            <SelectField
              label="Freight Term *"
              options={FREIGHT_TERMS}
              value={field.value}
              onChange={(v) => {
                freightTouched.current = true // Q20: user pick wins over the dynamic default
                field.onChange(v)
              }}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="general.shipDirection"
          control={control}
          render={({ field, fieldState }) => (
            <SelectField
              label="Ship Direction *"
              options={SHIP_DIRECTIONS}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="general.consolidatable"
          control={control}
          render={({ field }) => (
            <div className="co-link-row" style={{ alignSelf: 'end', paddingBottom: 6 }}>
              <Checkbox
                label="Consolidatable"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            </div>
          )}
        />
      </div>

      {/* References sit in Quick, ABOVE Add More Details (screen 1 discrepancy note) */}
      <div className="co-confirm-block">
        <h3 className="co-subhead text-label-base-medium">References</h3>
        <Controller
          name="general.references"
          control={control}
          render={({ field }) => (
            <RepeatableRows
              columns={[
                { key: 'type', header: 'Reference Type', placeholder: 'Enter Reference Type' },
                { key: 'value', header: 'Reference Value', placeholder: 'Enter Reference Value' },
              ]}
              rows={field.value}
              lockedCell={(row, colKey) => row.guided && colKey === 'type'} // Q21 guided rows
              rowPlaceholder={(row, colKey) =>
                row.guided && colKey === 'value' ? `Enter a ${row.type}` : undefined}
              onCellChange={updateRows('general.references')}
              onDeleteRow={deleteRow('general.references')}
              onAddRow={() =>
                field.onChange([...field.value, { id: newRowId(), guided: false, type: '', value: '' }])}
              addLabel="Add New Reference Code"
            />
          )}
        />
      </div>

      <div className="co-link-row">
        <Button
          variant="link"
          iconRight={isLongMode ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          onClick={() => setIsLongMode(v => !v)}
        >
          Add More Details
        </Button>
      </div>

      {isLongMode && (
        <>
          <div className="co-confirm-block">
            <h3 className="co-subhead text-label-base-medium">Additional Information</h3>
            <div className="co-grid-2">
              <Controller
                name="general.carrierScac"
                control={control}
                render={({ field }) => (
                  <TypeaheadSelect
                    label="Customer Required Carrier"
                    placeholder="Select a Carrier"
                    lookupType="carrier"
                    allowFreeText
                    selected={field.value ? { value: field.value, label: field.value } : null}
                    onSelect={(opt) => field.onChange(opt?.value ?? '')}
                  />
                )}
              />
              <Controller
                name="general.equipmentReferenceNumber"
                control={control}
                render={({ field }) => (
                  <FormField
                    label="Equipment Reference Number"
                    placeholder="Enter the Equipment Numbers"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
            </div>
          </div>

          <div className="co-confirm-block">
            <h3 className="co-subhead text-label-base-medium">Add Instructions</h3>
            <Controller
              name="general.instructions"
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <RepeatableRows
                    numbered
                    columns={[{
                      key: 'description',
                      header: 'Instruction Description',
                      placeholder: 'Provide instruction details',
                      maxLength: 2000, // Q19: description-only, ≤2,000 chars
                    }]}
                    rows={field.value}
                    onCellChange={updateRows('general.instructions')}
                    onDeleteRow={deleteRow('general.instructions')}
                    onAddRow={() => field.onChange([...field.value, { id: newRowId(), description: '' }])}
                    addLabel="Add New Instruction"
                  />
                  {fieldState.error && (
                    <p className="co-field-warning text-label-xs-regular">Check instruction lengths (max 2,000 characters).</p>
                  )}
                </>
              )}
            />
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Smoke-verify in the dev server**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
npm run dev:odyssey-one
```

On `/orders/create` verify:
1. Owning Organization typeahead: 1 char → "Type at least 2 characters"; `er` → ERCO/Werner-style matches with names; pick fills the field.
2. Equipment disabled until an org is picked; with `ACME_LOG_01` only VAN/FLT appear; switching org clears Equipment.
3. Ship Direction → Inbound flips Freight Term to **COL (Collect)**; back to Outbound → Pre-Paid; manually pick Third Party, then flip Ship Direction → Freight Term stays Third Party (Q20 never-overwrite).
4. Consolidatable starts checked.
5. References shows the two guided rows (locked Type labels "Pickup Number"/"PO Number", value placeholders "Enter a Pickup Number"/"Enter a PO Number"); Add New Reference Code appends a free row; trash deletes; typing keeps focus.
6. Add More Details reveals Additional Information + Add Instructions; carrier accepts a free-typed SCAC on blur.
7. Filling Owning Org + Equipment (Freight Term/Ship Direction defaulted) flips the General Information StepIndicator green after ~300ms.

- [ ] **Step 3: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/components/orders/create/sections/GeneralInformationSection.jsx
git commit -m "orders: General Information section — quick fields, Q20 default, references, long expansion"
```

---
## Batch 4 — Pickup & Delivery

### Task 16: Date/Time/Timezone field primitives

**Files:**
- Create: `apps/odyssey-one/src/components/orders/create/fields/DateInput.jsx`
- Create: `apps/odyssey-one/src/components/orders/create/fields/TimeSelect.jsx`
- Create: `apps/odyssey-one/src/components/orders/create/fields/TimezoneSelect.jsx`

- [ ] **Step 1: Write `fields/DateInput.jsx`**

```jsx
import { Calendar } from 'lucide-react'
import { FormField } from '@odyssey/ui'

// "06152026" → "06/15/2026" while typing (digits-only mask)
export function maskDate(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/**
 * DateInput — masked MM/DD/YYYY text field with a calendar trailing icon
 * (no popover calendar — plan decision 10; the real date-picker is a
 * parallel-session normalization). `warning` renders the amber past-date
 * message (LINX-7632 — non-blocking); a real `error` wins the slot.
 */
export default function DateInput({ label, showLabel = true, value, onChange, error, warning, disabled, id }) {
  return (
    <div className="co-date-input">
      <FormField
        id={id}
        label={label}
        showLabel={showLabel}
        placeholder="MM/DD/YYYY"
        value={value}
        onChange={(e) => onChange(maskDate(e.target.value))}
        error={error}
        disabled={disabled}
        trailingIcon={<Calendar size={16} />}
        inputMode="numeric"
        autoComplete="off"
      />
      {!error && warning && (
        <p className="co-field-warning text-label-xs-regular">{warning}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write `fields/TimeSelect.jsx`**

```jsx
import SelectField from './SelectField.jsx'

// HH:MM 24h on the half hour; time defaults 00:00 (spec §2.4)
export const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0')
  const m = i % 2 ? '30' : '00'
  return { value: `${h}:${m}`, label: `${h}:${m}` }
})

export default function TimeSelect({ label, showLabel = true, value, onChange, error, disabled, id }) {
  return (
    <SelectField
      id={id}
      label={label}
      showLabel={showLabel}
      placeholder="00:00"
      options={TIME_OPTIONS}
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled}
    />
  )
}
```

- [ ] **Step 3: Write `fields/TimezoneSelect.jsx`**

```jsx
import SelectField from './SelectField.jsx'
import { TIMEZONES } from '../../../../data/master-data'

const TZ_OPTIONS = TIMEZONES.map((tz) => ({ value: tz, label: tz }))

// Auto-derivation from the party city happens upstream (PickupDeliverySection
// effect via deriveTimezone) — this stays a dumb select for the manual case.
export default function TimezoneSelect({ label, showLabel = true, value, onChange, error, disabled, id }) {
  return (
    <SelectField
      id={id}
      label={label}
      showLabel={showLabel}
      placeholder="Select"
      options={TZ_OPTIONS}
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled}
    />
  )
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/components/orders/create/fields/DateInput.jsx apps/odyssey-one/src/components/orders/create/fields/TimeSelect.jsx apps/odyssey-one/src/components/orders/create/fields/TimezoneSelect.jsx
git commit -m "orders: date/time/timezone field primitives (masked date, half-hour times)"
```

---

### Task 17: AddressFields + ContactFields

**Files:**
- Create: `apps/odyssey-one/src/components/orders/create/sections/AddressFields.jsx`
- Create: `apps/odyssey-one/src/components/orders/create/sections/ContactFields.jsx`

- [ ] **Step 1: Write `sections/AddressFields.jsx`**

```jsx
import { Controller, useFormContext } from 'react-hook-form'
import { FormField } from '@odyssey/ui'
import SelectField from '../fields/SelectField.jsx'
import { CITY_OPTIONS, US_STATES, POSTAL_OPTIONS, COUNTRIES } from '../../../../data/master-data'

const toOptions = (list) => list.map((v) => ({ value: v, label: v }))
const CITY_OPTS = toOptions(CITY_OPTIONS)
const STATE_OPTS = toOptions(US_STATES)
const POSTAL_OPTS = toOptions(POSTAL_OPTIONS)
const COUNTRY_OPTS = toOptions(COUNTRIES)

/**
 * AddressFields — the manual-address grid (screen 2-manual; Efrain §2).
 * Mandatory: ID/Org Name, Long Name, Address 1, City, State, Postal,
 * Country; Address 2 optional. City/State/Postal/Country are selects over
 * master-data (plan decision 16). `basePath` = "pickupDelivery.consignor" etc.
 */
export default function AddressFields({ basePath }) {
  const { control } = useFormContext()
  const text = (name, label, placeholder) => (
    <Controller
      name={`${basePath}.${name}`}
      control={control}
      render={({ field, fieldState }) => (
        <FormField
          label={label}
          placeholder={placeholder}
          value={field.value}
          onChange={(e) => field.onChange(e.target.value)}
          error={fieldState.error?.message}
        />
      )}
    />
  )
  const select = (name, label, options, placeholder) => (
    <Controller
      name={`${basePath}.${name}`}
      control={control}
      render={({ field, fieldState }) => (
        <SelectField
          label={label}
          placeholder={placeholder}
          options={options}
          value={field.value}
          onChange={field.onChange}
          error={fieldState.error?.message}
        />
      )}
    />
  )

  return (
    <div className="co-address-grid">
      {text('idOrgName', 'ID/Org Name *', 'e.g., KRM1234')}
      {text('longName', 'Long Name *', 'e.g., KRM Engineering')}
      {text('address1', 'Address 1 *', 'e.g., 123 manufacturing st.')}
      {text('address2', 'Address 2', 'Apt, Suite, Building')}
      {select('city', 'City *', CITY_OPTS, 'e.g., Dallas')}
      {select('state', 'State *', STATE_OPTS, 'Select an option')}
      {select('postal', 'Postal Code *', POSTAL_OPTS, 'e.g., 75201')}
      {select('country', 'Country *', COUNTRY_OPTS, 'Select an option')}
    </div>
  )
}
```

- [ ] **Step 2: Write `sections/ContactFields.jsx`**

```jsx
import { Controller, useFormContext } from 'react-hook-form'
import { FormField } from '@odyssey/ui'

/**
 * ContactFields — optional contact for a party (Efrain §2): Name, Phone
 * (E.164 after normalization — schema-validated only when filled), Email.
 */
export default function ContactFields({ basePath }) {
  const { control } = useFormContext()
  const field = (name, label, placeholder, type = 'text') => (
    <Controller
      name={`${basePath}.${name}`}
      control={control}
      render={({ field: f, fieldState }) => (
        <FormField
          label={label}
          placeholder={placeholder}
          type={type}
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          error={fieldState.error?.message}
        />
      )}
    />
  )
  return (
    <div className="co-contact-grid">
      {field('contactName', 'Contact Name', 'e.g., Nick Strauss')}
      {field('contactPhone', 'Phone Number', '+1 (765) 670-4444')}
      {field('contactEmail', 'Email Address', 'name@company.com', 'email')}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/components/orders/create/sections/AddressFields.jsx apps/odyssey-one/src/components/orders/create/sections/ContactFields.jsx
git commit -m "orders: manual address grid + contact fields (party sub-forms)"
```

---

### Task 18: Pickup & Delivery section

Replaces the Task-12 placeholder. Mirrored Consignor | Consignee columns + the Planning Date/Time block (Q22 radio, conditional Late requirement, Early ≤ Late, past-date warnings, TZ auto-derive).

**Files:**
- Modify (replace placeholder): `apps/odyssey-one/src/components/orders/create/sections/PickupDeliverySection.jsx`

- [ ] **Step 1: Write the section**

```jsx
import { useEffect } from 'react'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { Controller, useFormContext } from 'react-hook-form'
import { Alert, Button, Radio } from '@odyssey/ui'
import TypeaheadSelect from '../fields/TypeaheadSelect.jsx'
import DateInput from '../fields/DateInput.jsx'
import TimeSelect from '../fields/TimeSelect.jsx'
import TimezoneSelect from '../fields/TimezoneSelect.jsx'
import AddressFields from './AddressFields.jsx'
import ContactFields from './ContactFields.jsx'
import { getPastDateWarnings } from '../schema'
import { deriveTimezone } from '../../../../data/master-data'

// Lookup pick hydrates the manual fields from master data, so the mapper
// reads ONE set of address fields regardless of entry path.
function applyLocation(setValue, base, opt) {
  if (!opt) {
    setValue(`${base}.locationId`, '', { shouldValidate: true })
    return
  }
  const a = opt.meta ?? {}
  setValue(`${base}.locationId`, opt.value, { shouldValidate: true })
  setValue(`${base}.idOrgName`, opt.value)
  setValue(`${base}.longName`, a.longName ?? '')
  setValue(`${base}.address1`, a.address1 ?? '')
  setValue(`${base}.address2`, '')
  setValue(`${base}.city`, a.city ?? '', { shouldValidate: true })
  setValue(`${base}.state`, a.state ?? '')
  setValue(`${base}.postal`, a.postal ?? '')
  setValue(`${base}.country`, a.country ?? 'United States')
}

function PartyColumn({ side, title }) {
  const { control, setValue, watch } = useFormContext()
  const base = `pickupDelivery.${side}`
  const manualMode = watch(`${base}.manualMode`)
  const showContact = watch(`${base}.showContact`)
  const longName = watch(`${base}.longName`)

  return (
    <div className="co-party">
      <h3 className="co-party__title text-label-base-medium">{title}</h3>
      <Controller
        name={`${base}.locationId`}
        control={control}
        render={({ field, fieldState }) => (
          <TypeaheadSelect
            label="Add Location *"
            placeholder="Search for ID/Org Name, Address, City, State and Postal Code"
            lookupType="org-address"
            selected={field.value
              ? { value: field.value, label: longName ? `${field.value}: ${longName}` : field.value }
              : null}
            onSelect={(opt) => applyLocation(setValue, base, opt)}
            error={fieldState.error?.message}
          />
        )}
      />
      {!manualMode && (
        <Button variant="link" icon={<Plus size={16} />} onClick={() => setValue(`${base}.manualMode`, true)}>
          Add Location Manually
        </Button>
      )}
      {manualMode && <AddressFields basePath={base} />}
      <Button
        variant="link"
        iconRight={showContact ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        onClick={() => setValue(`${base}.showContact`, !showContact)}
      >
        Add Contact Information
      </Button>
      {showContact && <ContactFields basePath={base} />}
    </div>
  )
}

function DateTimeGroup({ basePath, label, required, warning }) {
  const { control } = useFormContext()
  const star = required ? ' *' : ''
  return (
    <div className="co-triad">
      <Controller
        name={`${basePath}.date`}
        control={control}
        render={({ field, fieldState }) => (
          <DateInput
            label={`${label} Date${star}`}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            warning={warning}
          />
        )}
      />
      <Controller
        name={`${basePath}.time`}
        control={control}
        render={({ field, fieldState }) => (
          <TimeSelect
            label={`Time${star}`}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        name={`${basePath}.timezone`}
        control={control}
        render={({ field, fieldState }) => (
          <TimezoneSelect
            label={`Time Zone${star}`}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
    </div>
  )
}

/**
 * Pickup & Delivery (spec §3.2, screens 2/2-manual/2-Long). Quick and Long
 * are structurally identical here — the Long delta lives in General Info.
 */
export default function PickupDeliverySection() {
  const { control, watch, getValues, setValue } = useFormContext()
  const planningDateType = watch('pickupDelivery.planningDateType')
  const consignorCity = watch('pickupDelivery.consignor.city')
  const consigneeCity = watch('pickupDelivery.consignee.city')
  const warnings = getPastDateWarnings(watch('pickupDelivery'))

  // TZ auto-derive (spec §10): pickup TZs from the consignor city, delivery
  // TZs from the consignee city — only when the field is still empty.
  useEffect(() => {
    const tz = deriveTimezone(consignorCity)
    if (!tz) return
    for (const key of ['earlyPickup', 'latePickup']) {
      if (!getValues(`pickupDelivery.${key}.timezone`)) {
        setValue(`pickupDelivery.${key}.timezone`, tz, { shouldValidate: true })
      }
    }
  }, [consignorCity, getValues, setValue])
  useEffect(() => {
    const tz = deriveTimezone(consigneeCity)
    if (!tz) return
    for (const key of ['earlyDelivery', 'lateDelivery']) {
      if (!getValues(`pickupDelivery.${key}.timezone`)) {
        setValue(`pickupDelivery.${key}.timezone`, tz, { shouldValidate: true })
      }
    }
  }, [consigneeCity, getValues, setValue])

  return (
    <div className="co-section-body">
      <div className="co-party-grid">
        <PartyColumn side="consignor" title="Consignor" />
        <PartyColumn side="consignee" title="Consignee" />
      </div>

      <div className="co-planning">
        <h3 className="co-subhead text-label-base-medium">Planning Date/Time</h3>
        <Alert variant="info" showClose={false}>
          Please enter one of the following fields: ‘Late Pickup’ or ‘Late Delivery.’
        </Alert>
        <Controller
          name="pickupDelivery.planningDateType"
          control={control}
          render={({ field }) => (
            <div className="co-radio-row">
              <Radio
                name="planningDateType"
                value="SHIP"
                label="Ship Date & Time"
                checked={field.value === 'SHIP'}
                onChange={() => field.onChange('SHIP')}
              />
              <Radio
                name="planningDateType"
                value="DELIVERY"
                label="Delivery Date & Time"
                checked={field.value === 'DELIVERY'}
                onChange={() => field.onChange('DELIVERY')}
              />
            </div>
          )}
        />
        <div className="co-date-groups">
          <DateTimeGroup basePath="pickupDelivery.earlyPickup" label="Early Pickup" required={false} warning={warnings.earlyPickup} />
          <DateTimeGroup basePath="pickupDelivery.latePickup" label="Late Pickup" required={planningDateType === 'SHIP'} warning={warnings.latePickup} />
          <DateTimeGroup basePath="pickupDelivery.earlyDelivery" label="Early Delivery" required={false} warning={warnings.earlyDelivery} />
          <DateTimeGroup basePath="pickupDelivery.lateDelivery" label="Late Delivery" required={planningDateType === 'DELIVERY'} warning={warnings.lateDelivery} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Smoke-verify in the dev server**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
npm run dev:odyssey-one
```

On `/orders/create`, expand Pickup and Delivery and verify:
1. Mirrored Consignor | Consignee columns; location typeahead matches by id, name, and city; picking hydrates nothing visible until "+ Add Location Manually" — then the grid shows the auto-populated values.
2. Picking a Houston location pre-fills CST on the pickup Time Zones (and consignee city → delivery TZs); a manually-set TZ is never overwritten.
3. Radio default Ship Date & Time → Late Pickup row carries `*` on Date/Time/Time Zone; switching to Delivery moves the `*` to Late Delivery.
4. Typing `06152026` in a date masks to `06/15/2026`; an Early Pickup after Late Pickup shows the ordering error on Early Pickup; a past date shows the amber warning but Create-gating is unaffected by warnings.
5. Contact phone `765-4444` errors; `+1 (765) 670-4444` passes; bad email errors; both empty → clean.
6. Completing both parties + a Late Pickup flips the section's StepIndicator green.

- [ ] **Step 3: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/components/orders/create/sections/PickupDeliverySection.jsx
git commit -m "orders: Pickup & Delivery — mirrored parties, Q22 planning dates, TZ auto-derive"
```

---
## Batch 5 — Product Information grid

### Task 19: productMath — US|Metric display conversion + roll-ups (TDD)

**Files:**
- Create: `apps/odyssey-one/src/components/orders/create/productMath.ts`
- Test: `apps/odyssey-one/src/components/orders/create/productMath.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { convertMeasureDisplay, computeProductRollups } from './productMath'
import { orderFormValuesSample } from '../../../api/fixtures/orderFormValues.sample'

describe('convertMeasureDisplay (display only — stored values untouched)', () => {
  it('passes through when the stored UoM already matches the system', () => {
    expect(convertMeasureDisplay({ value: '100', uom: 'lb' }, 'us')).toBe('100.00 Lb')
    expect(convertMeasureDisplay({ value: '79', uom: 'cuft' }, 'us')).toBe('79.00 Cu ft')
  })

  it('converts lb→kg and cuft→m³ for metric display', () => {
    expect(convertMeasureDisplay({ value: '100', uom: 'lb' }, 'metric')).toBe('45.36 Kg')
    expect(convertMeasureDisplay({ value: '79', uom: 'cuft' }, 'metric')).toBe('2.24 m³')
  })

  it('converts kg→lb for US display', () => {
    expect(convertMeasureDisplay({ value: '45.359237', uom: 'kg' }, 'us')).toBe('100.00 Lb')
  })

  it('degrades gracefully on unknown UoMs and blank values', () => {
    expect(convertMeasureDisplay({ value: '5', uom: 'each' }, 'metric')).toBe('5.00 each')
    expect(convertMeasureDisplay({ value: '', uom: 'lb' }, 'us')).toBe('')
  })
})

describe('computeProductRollups (confirmation page, spec §3.3)', () => {
  it('counts, totals per display system, and derives hazmat from master data', () => {
    const us = computeProductRollups(orderFormValuesSample.products, 'us')
    expect(us.count).toBe(2)
    expect(us.totalWeight).toBe('4300.00 Lb')   // 100 + 4200
    expect(us.totalVolume).toBe('730.00 Cu ft') // 79 + 651
    expect(us.hazmat).toBe('Yes')               // 28042B9G (Sulfuric Acid) is hazmat
  })

  it('totals convert in metric', () => {
    const metric = computeProductRollups(orderFormValuesSample.products, 'metric')
    expect(metric.totalWeight).toBe('1950.45 Kg') // 4300 lb → kg
  })

  it('non-hazmat-only lists report No', () => {
    const only = [orderFormValuesSample.products[0]] // 39011E6K Polyethylene — not hazmat
    expect(computeProductRollups(only, 'us').hazmat).toBe('No')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx vitest run src/components/orders/create/productMath.test.ts
```

Expected: FAIL — cannot resolve `./productMath`.

- [ ] **Step 3: Write `productMath.ts`**

```ts
import type { MeasureValue, ProductRowValues } from '../../../api/types/orderFormVm'
import { CHEMICAL_PRODUCTS } from '../../../data/master-data'

// US|Metric ButtonToggle converts DISPLAY only (spec §10): stored values keep
// the entered { value, uom } and the mapper sends them verbatim. This module
// is the single conversion point for read rows + confirmation roll-ups.

export type UnitSystem = 'us' | 'metric'

const KG_PER_LB = 0.45359237
const M3_PER_CUFT = 0.0283168

// uom → its system + the conversion into the other system
const CONVERSIONS: Record<string, { system: UnitSystem; to: { uom: string; factor: number } }> = {
  lb: { system: 'us', to: { uom: 'kg', factor: KG_PER_LB } },
  kg: { system: 'metric', to: { uom: 'lb', factor: 1 / KG_PER_LB } },
  cuft: { system: 'us', to: { uom: 'm3', factor: M3_PER_CUFT } },
  m3: { system: 'metric', to: { uom: 'cuft', factor: 1 / M3_PER_CUFT } },
}

const UOM_DISPLAY_LABELS: Record<string, string> = {
  lb: 'Lb', kg: 'Kg', cuft: 'Cu ft', m3: 'm³',
}

export function toDisplayMeasure(measure: MeasureValue, system: UnitSystem): { value: number; uom: string } | null {
  const n = Number(measure.value)
  if (measure.value.trim() === '' || Number.isNaN(n)) return null
  const conv = CONVERSIONS[measure.uom]
  if (!conv || conv.system === system) return { value: n, uom: measure.uom } // passthrough (incl. unknown uoms)
  return { value: n * conv.to.factor, uom: conv.to.uom }
}

export function formatMeasure(m: { value: number; uom: string } | null): string {
  if (!m) return ''
  return `${m.value.toFixed(2)} ${UOM_DISPLAY_LABELS[m.uom] ?? m.uom}`
}

export function convertMeasureDisplay(measure: MeasureValue, system: UnitSystem): string {
  return formatMeasure(toDisplayMeasure(measure, system))
}

export interface ProductRollups {
  count: number
  totalWeight: string
  totalVolume: string
  hazmat: 'Yes' | 'No'
}

export function computeProductRollups(products: ProductRowValues[], system: UnitSystem): ProductRollups {
  const total = (pick: (p: ProductRowValues) => MeasureValue, uom: string) => {
    const sum = products.reduce((acc, p) => acc + (toDisplayMeasure(pick(p), system)?.value ?? 0), 0)
    return formatMeasure({ value: sum, uom })
  }
  const hazmat = products.some(p =>
    (CHEMICAL_PRODUCTS as Array<{ item: string; hazmat: boolean }>).find(c => c.item === p.productId)?.hazmat,
  )
  return {
    count: products.length,
    totalWeight: total(p => p.grossWeight, system === 'metric' ? 'kg' : 'lb'),
    totalVolume: total(p => p.volume, system === 'metric' ? 'm3' : 'cuft'),
    hazmat: hazmat ? 'Yes' : 'No',
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx vitest run src/components/orders/create/productMath.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/components/orders/create/productMath.ts apps/odyssey-one/src/components/orders/create/productMath.test.ts
git commit -m "orders: productMath — US|Metric display conversion + confirmation roll-ups (TDD)"
```

---

### Task 20: OrderRowActionMenu — actions/onAction props

The Product grid's saved rows need an Edit/Delete three-dot menu (screen 4-3). The existing Summary-grid menu already has the portal + positioning + a11y plumbing — extend it backwards-compatibly instead of duplicating it.

**Files:**
- Modify: `apps/odyssey-one/src/components/orders/OrderRowActionMenu.jsx`

- [ ] **Step 1: Make three exact edits**

Edit 1 — the signature (defaults preserve the Summary grid's six inert items):

```jsx
// before
export default function OrderRowActionMenu() {
// after
export default function OrderRowActionMenu({ actions = ACTIONS, onAction }) {
```

Edit 2 — the map source:

```jsx
// before
          {ACTIONS.map(action => (
// after
          {actions.map(action => (
```

Edit 3 — the item click handler:

```jsx
// before
              onClick={() => setOpen(false)}
// after
              onClick={() => { setOpen(false); onAction?.(action) }}
```

Also update the doc comment's first line to mention the dual use, e.g. append: `Consumers may pass actions/onAction (Product grid rows use ['Edit','Delete']).`

- [ ] **Step 2: Regression-check the Summary grid in the dev server** — `/orders` three-dot menu still opens with the six items, closes on outside click/scroll, items remain inert (no `onAction` passed).

- [ ] **Step 3: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/components/orders/OrderRowActionMenu.jsx
git commit -m "orders: OrderRowActionMenu accepts actions/onAction (Product grid reuse)"
```

---

### Task 21: ProductGrid + Product Information section

Replaces the Task-12 placeholder. Grid on the `.odyssey-table` cell contract — a plain in-section table, NOT the OrdersTable split-sticky-header architecture.

**Files:**
- Create: `apps/odyssey-one/src/components/orders/create/ProductGrid.jsx`
- Modify (replace placeholder): `apps/odyssey-one/src/components/orders/create/sections/ProductInformationSection.jsx`

- [ ] **Step 1: Write `ProductGrid.jsx`**

```jsx
import { useState } from 'react'
import { Maximize2, Plus } from 'lucide-react'
import { Button, FormField } from '@odyssey/ui'
import TypeaheadSelect from './fields/TypeaheadSelect.jsx'
import SelectField from './fields/SelectField.jsx'
import OrderRowActionMenu from '../OrderRowActionMenu.jsx'
import { productRowSchema } from './schema'
import { convertMeasureDisplay } from './productMath'
import { SHIP_CLASSES, UOM_WEIGHT, UOM_VOLUME } from '../../../data/master-data'

const newId = () => `prod-${Math.random().toString(36).slice(2, 9)}`
const SHIP_CLASS_OPTIONS = SHIP_CLASSES.map((v) => ({ value: v, label: v }))

const EMPTY_ROW = () => ({
  id: newId(),
  productId: '',
  description: '',
  grossWeight: { value: '', uom: 'lb' },
  volume: { value: '', uom: 'cuft' },
  shipClass: '',
})

/**
 * ProductRowEditor — inline edit row (screen 4): Product ID typeahead,
 * Description enabled after ID (1–150), Gross Weight + UoM, Volume + UoM,
 * Ship Class, per-row Cancel/Save + inert expand icon. Save validates the
 * Q26 all-five rule via productRowSchema; errors render inline per cell.
 * Local state until Save (plan decision 12).
 */
function ProductRowEditor({ index, initial, onSave, onCancel }) {
  const [row, setRow] = useState(initial ?? EMPTY_ROW())
  const [errors, setErrors] = useState({})
  const set = (patch) => setRow((r) => ({ ...r, ...patch }))

  const handleSave = () => {
    const res = productRowSchema.safeParse(row)
    if (!res.success) {
      const map = {}
      for (const issue of res.error.issues) map[issue.path.join('.')] = issue.message
      setErrors(map)
      return
    }
    onSave(row)
  }

  return (
    <tr className="co-product-editor">
      <td className="text-label-sm-regular">{index}</td>
      <td>
        <TypeaheadSelect
          showLabel={false}
          placeholder="Search an ID"
          lookupType="product"
          selected={row.productId ? { value: row.productId, label: row.productId } : null}
          onSelect={(opt) =>
            set(opt
              ? { productId: opt.value, description: opt.description ?? row.description }
              : { productId: '' })}
          error={errors.productId}
        />
      </td>
      <td>
        <FormField
          showLabel={false}
          placeholder="Add Description"
          value={row.description}
          disabled={!row.productId} // enabled after ID (spec §3.3)
          maxLength={150}
          onChange={(e) => set({ description: e.target.value })}
          error={errors.description}
        />
      </td>
      <td>
        <div className="co-cell-measure">
          <FormField
            showLabel={false}
            placeholder="0.00"
            inputMode="decimal"
            value={row.grossWeight.value}
            onChange={(e) => set({ grossWeight: { ...row.grossWeight, value: e.target.value } })}
            error={errors['grossWeight.value']}
          />
          <SelectField
            showLabel={false}
            placeholder="Select"
            options={UOM_WEIGHT}
            value={row.grossWeight.uom}
            onChange={(uom) => set({ grossWeight: { ...row.grossWeight, uom } })}
            error={errors['grossWeight.uom']}
          />
        </div>
      </td>
      <td>
        <div className="co-cell-measure">
          <FormField
            showLabel={false}
            placeholder="0.00"
            inputMode="decimal"
            value={row.volume.value}
            onChange={(e) => set({ volume: { ...row.volume, value: e.target.value } })}
            error={errors['volume.value']}
          />
          <SelectField
            showLabel={false}
            placeholder="Select"
            options={UOM_VOLUME}
            value={row.volume.uom}
            onChange={(uom) => set({ volume: { ...row.volume, uom } })}
            error={errors['volume.uom']}
          />
        </div>
      </td>
      <td>
        <SelectField
          showLabel={false}
          placeholder="Select a Ship Class"
          options={SHIP_CLASS_OPTIONS}
          value={row.shipClass}
          onChange={(v) => set({ shipClass: v })}
          error={errors.shipClass}
        />
      </td>
      <td>
        <div className="co-inline-actions">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSave}>Save</Button>
          <Button variant="icon" size="sm" icon={<Maximize2 size={16} />} aria-label="Expand row (coming soon)" disabled />
        </div>
      </td>
    </tr>
  )
}

/**
 * ProductGrid — `.odyssey-table` contract skin (S-handoff 2026-06-11); a
 * simple in-section table, deliberately NOT the OrdersTable sticky-header
 * architecture. Read rows show display-converted measures (US|Metric);
 * saved rows re-edit in place; three-dot menu = Edit/Delete.
 * Class column label is the interim constant "Ship Class" (Q26 residual).
 */
export default function ProductGrid({ products, system, search, sortDir, onChange }) {
  const [editing, setEditing] = useState(null) // null | 'new' | row id

  const q = search.trim().toLowerCase()
  let visible = products.filter(
    (p) => q === '' || p.productId.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
  )
  if (sortDir) {
    visible = [...visible].sort(
      (a, b) => a.productId.localeCompare(b.productId) * (sortDir === 'asc' ? 1 : -1),
    )
  }

  const saveRow = (row) => {
    if (editing === 'new') onChange([...products, row])
    else onChange(products.map((p) => (p.id === editing ? row : p)))
    setEditing(null)
  }
  const deleteRow = (id) => onChange(products.filter((p) => p.id !== id))

  return (
    <div className="co-product-table-wrap">
      <table className="odyssey-table">
        <thead>
          <tr>
            <th className="text-label-sm-medium">#</th>
            <th className="text-label-sm-medium">Product ID *</th>
            <th className="text-label-sm-medium">Product Description *</th>
            <th className="text-label-sm-medium">Gross Weight *</th>
            <th className="text-label-sm-medium">Volume *</th>
            <th className="text-label-sm-medium">Ship Class *</th>
            <th aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 && editing !== 'new' && (
            <tr>
              <td colSpan={7} className="co-product-empty text-label-sm-regular">0 products added</td>
            </tr>
          )}
          {visible.map((p, i) =>
            editing === p.id ? (
              <ProductRowEditor key={p.id} index={i + 1} initial={p} onSave={saveRow} onCancel={() => setEditing(null)} />
            ) : (
              <tr key={p.id}>
                <td className="text-label-sm-regular">{i + 1}</td>
                <td className="odyssey-table__cell--title text-label-sm-medium">{p.productId}</td>
                <td className="text-label-sm-regular">{p.description}</td>
                <td className="text-label-sm-regular">{convertMeasureDisplay(p.grossWeight, system)}</td>
                <td className="text-label-sm-regular">{convertMeasureDisplay(p.volume, system)}</td>
                <td className="text-label-sm-regular">{p.shipClass}</td>
                <td>
                  <OrderRowActionMenu
                    actions={['Edit', 'Delete']}
                    onAction={(action) => (action === 'Edit' ? setEditing(p.id) : deleteRow(p.id))}
                  />
                </td>
              </tr>
            ),
          )}
          {editing === 'new' && (
            <ProductRowEditor index={products.length + 1} initial={null} onSave={saveRow} onCancel={() => setEditing(null)} />
          )}
        </tbody>
      </table>
      {editing !== 'new' && (
        <Button variant="link" icon={<Plus size={16} />} onClick={() => setEditing('new')}>
          Add Product
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write `sections/ProductInformationSection.jsx` (replace placeholder)**

```jsx
import { useState } from 'react'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Columns3 } from 'lucide-react'
import { Controller, useFormContext } from 'react-hook-form'
import { Button, ButtonToggle, SearchField } from '@odyssey/ui'
import ProductGrid from '../ProductGrid.jsx'

/**
 * Product Information (spec §3.3, screens 4). Toolbar: search · US|Metric
 * ButtonToggle (text mode — display conversion only) · sort direction ·
 * column-manage affordance (inert this build). The RHF `products` array
 * holds saved rows; ProductGrid owns the in-flight editor row.
 */
export default function ProductInformationSection() {
  const { control } = useFormContext()
  const [search, setSearch] = useState('')
  const [system, setSystem] = useState('us') // US default (screens 4)
  const [sortDir, setSortDir] = useState(null) // null = insertion order until first toggle

  const SortIcon = sortDir === 'asc' ? ArrowUpNarrowWide : ArrowDownWideNarrow

  return (
    <Controller
      name="products"
      control={control}
      render={({ field }) => (
        <div className="co-section-body">
          <div className="co-product-toolbar">
            <SearchField
              className="co-product-search"
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder="Search"
            />
            <div className="co-product-toolbar__right">
              <ButtonToggle
                firstLabel="US"
                secondLabel="Metric"
                selected={system === 'us' ? 'first' : 'second'}
                onChange={(next) => setSystem(next === 'first' ? 'us' : 'metric')}
              />
              <Button
                variant="icon"
                size="sm"
                icon={<SortIcon size={20} />}
                aria-label="Toggle sort by Product ID"
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              />
              <Button
                variant="icon"
                size="sm"
                icon={<Columns3 size={20} />}
                aria-label="Manage columns (coming soon)"
                disabled
              />
            </div>
          </div>

          <p className="co-product-count text-label-sm-regular">
            {field.value.length} products added
          </p>

          <ProductGrid
            products={field.value}
            system={system}
            search={search}
            sortDir={sortDir}
            onChange={field.onChange}
          />
        </div>
      )}
    />
  )
}
```

- [ ] **Step 3: Smoke-verify in the dev server**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
npm run dev:odyssey-one
```

On `/orders/create`, expand Product Information and verify:
1. Empty state: "0 products added" row + the six asterisked headers + "+ Add Product".
2. Add Product opens the editor row: Description disabled until a Product ID is picked; picking `39011E6K` auto-fills the description.
3. Save with gaps → inline red errors per missing cell ("Please provide a description", "Enter a value", "Select a Ship Class") — the row does NOT save.
4. A complete row saves; count updates; read row shows `100.00 Lb` / `79.00 Cu ft` style values.
5. US|Metric toggle flips read-row display (`45.36 Kg`) — re-edit shows the stored entry (`100`, Lb) untouched.
6. Three-dot → Edit reopens in place; Delete removes; search filters by ID/description; sort toggles by Product ID.
7. With ≥1 saved row the section StepIndicator flips green.
8. Known cosmetic limit: the editor row's dropdowns open inside the table wrap's scroll container (`overflow-x: auto`) and may need a scroll on short viewports — acceptable for the prototype; the normalized grid editor resolves it (portal dropdowns).

- [ ] **Step 4: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/components/orders/create/ProductGrid.jsx apps/odyssey-one/src/components/orders/create/sections/ProductInformationSection.jsx
git commit -m "orders: Product Information — odyssey-table grid, inline row editor, US|Metric display"
```

---
## Batch 6 — Special Services, Confirmation, draft reopen

### Task 22: SpecialServicesPicker + section

**Files:**
- Create: `apps/odyssey-one/src/components/orders/create/SpecialServicesPicker.jsx`
- Modify (replace placeholder): `apps/odyssey-one/src/components/orders/create/sections/SpecialServicesSection.jsx`

- [ ] **Step 1: Write `SpecialServicesPicker.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Badge, Button, SearchField } from '@odyssey/ui'
import { useLookup } from '../../../api/queries/useLookup'
import { useDebouncedValue } from './fields/useDebouncedValue.js'

/**
 * SpecialServicesPicker (spec §3.4, screens 5): search typeahead whose
 * dropdown is a TABLE (Service Category code + Description, frequency-
 * sorted, searchable by either). Click-to-add; selected rows render the
 * code as a gray Badge + auto description + trash. Entirely optional.
 * `value`/`onChange` come from the parent Controller.
 */
export default function SpecialServicesPicker({ value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const debounced = useDebouncedValue(query, 250)
  const lookup = useLookup('special-service', debounced, { enabled: open })
  const minCharsPending = debounced.replace(/\s/g, '').length < 2
  const options = (lookup.data ?? []).filter((o) => !value.some((s) => s.code === o.value))

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const add = (opt) => {
    onChange([...value, { code: opt.value, description: opt.description ?? '' }])
    setQuery('')
  }

  return (
    <div className="co-services">
      <div className="co-typeahead" ref={wrapRef}>
        <SearchField
          showLabel
          label="Special Services"
          showInfoIcon
          placeholder="Search a special services"
          value={query}
          onChange={(v) => { setQuery(v); setOpen(true) }}
          onClear={() => setQuery('')}
          onFocus={() => setOpen(true)}
        />
        {open && (
          <div className="co-dropdown co-dropdown--table" onMouseDown={(e) => e.preventDefault()}>
            {lookup.isError ? (
              <div className="co-dropdown__status text-label-sm-regular">
                Couldn’t load services.
                <Button variant="link" onClick={() => lookup.refetch()}>Retry</Button>
              </div>
            ) : minCharsPending ? (
              <div className="co-dropdown__status text-label-sm-regular">Type at least 2 characters</div>
            ) : options.length === 0 ? (
              <div className="co-dropdown__status text-label-sm-regular">
                {lookup.isFetching ? 'Searching…' : 'No matches'}
              </div>
            ) : (
              <table className="co-services-table">
                <thead>
                  <tr>
                    <th className="text-label-sm-medium">Service Category</th>
                    <th className="text-label-sm-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {options.map((opt) => (
                    <tr key={opt.value} onClick={() => add(opt)}>
                      <td className="text-label-sm-regular">{opt.value}</td>
                      <td className="text-label-sm-regular">{opt.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <table className="co-services-table co-services-table--selected">
        <thead>
          <tr>
            <th className="text-label-sm-medium">Service Category</th>
            <th className="text-label-sm-medium">Description</th>
            <th aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {value.length === 0 ? (
            <tr>
              <td className="text-label-sm-regular" style={{ color: 'var(--text-tertiary)' }}>–</td>
              <td className="text-label-sm-regular" style={{ color: 'var(--text-tertiary)' }}>–</td>
              <td aria-hidden="true" />
            </tr>
          ) : (
            value.map((s) => (
              <tr key={s.code}>
                <td><Badge variant="gray">{s.code}</Badge></td>
                <td className="text-label-sm-regular">{s.description}</td>
                <td>
                  <Button
                    variant="icon"
                    size="sm"
                    icon={<Trash2 size={16} />}
                    aria-label={`Remove ${s.code}`}
                    onClick={() => onChange(value.filter((v) => v.code !== s.code))}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Write `sections/SpecialServicesSection.jsx` (replace placeholder)**

```jsx
import { Controller, useFormContext } from 'react-hook-form'
import SpecialServicesPicker from '../SpecialServicesPicker.jsx'

export default function SpecialServicesSection() {
  const { control } = useFormContext()
  return (
    <Controller
      name="specialServices"
      control={control}
      render={({ field }) => (
        <SpecialServicesPicker value={field.value} onChange={field.onChange} />
      )}
    />
  )
}
```

- [ ] **Step 3: Smoke-verify in the dev server** — on `/orders/create`, expand Special Services: typing `pa` lists PALEXG (Pallet Jack) above PJC (Pallet Exchange) — frequency order; `lift` matches LFT by description; clicking adds a row (gray code Badge + description + trash) and removes it from the dropdown; trash removes it; the section StepIndicator turns green only with ≥1 row; Create Order remains gated only by the other three sections.

- [ ] **Step 4: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/components/orders/create/SpecialServicesPicker.jsx apps/odyssey-one/src/components/orders/create/sections/SpecialServicesSection.jsx
git commit -m "orders: Special Services — tabular typeahead picker + selected-rows table"
```

---

### Task 23: ConfirmationView (sync + async)

Replaces the Task-12 placeholder. Renders **what was filled** (Quick/Long richness automatic, spec §5) from the submitted form values; the response supplies number/date/mode. Async variant is render-only (Q17): blue info Alert, Order Number "–", no polling; reachable via tests of the dev trigger `?confirm=async`.

**Files:**
- Modify (replace placeholder): `apps/odyssey-one/src/components/orders/create/ConfirmationView.jsx`

- [ ] **Step 1: Write `ConfirmationView.jsx`**

```jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Accordion, Alert, Badge, Button, PageHeader } from '@odyssey/ui'
import { computeProductRollups, convertMeasureDisplay } from './productMath'

const formatOrderDate = (iso, tz) => {
  if (!iso) return ''
  const [date, time] = iso.split('T')
  if (!date || !time) return iso
  const [y, m, d] = date.split('-')
  return `${m}/${d}/${y} ${time.slice(0, 5)}${tz ? `, ${tz}` : ''}`
}

const triadLabel = (t) => (t.date ? `${t.date} at ${t.time} ${t.timezone}`.trim() : '')

function KV({ label, value }) {
  return (
    <div className="co-kv__item">
      <span className="co-kv__label text-label-xs-regular">{label}</span>
      <span className="co-kv__value text-label-sm-medium">{value || '–'}</span>
    </div>
  )
}

function PartyBlock({ title, party }) {
  return (
    <div className="co-confirm-block">
      <h3 className="co-subhead text-label-base-medium">{title}</h3>
      <div className="co-kv">
        <KV label="ID/Org Name" value={party.idOrgName} />
        <KV label="Long Name" value={party.longName} />
        <KV label="Address 1" value={party.address1} />
        <KV label="Address 2" value={party.address2} />
        <KV label="City" value={party.city} />
        <KV label="State" value={party.state} />
        <KV label="Postal" value={party.postal} />
        <KV label="Country" value={party.country} />
        {party.contactName && <KV label="Contact Name" value={party.contactName} />}
        {party.contactPhone && <KV label="Phone Number" value={party.contactPhone} />}
        {party.contactEmail && <KV label="Email Address" value={party.contactEmail} />}
      </div>
    </div>
  )
}

/**
 * ConfirmationView — screens 6 (sync) / 7 (async). Read-only accordions,
 * all expanded, status green. Renders what was filled — Long-only blocks
 * (references with values, instructions, contacts, carrier) appear only
 * when present. Header strip: Order Number · Order Date/TZ · Shipment Mode
 * (mock "Ground", Q28) · Payment terms (= Freight Term — label drift noted).
 */
export default function ConfirmationView({ data, values, variant }) {
  const [alertOpen, setAlertOpen] = useState(true)
  const isAsync = variant === 'async'
  const { general, pickupDelivery, products, specialServices } = values
  const rollups = computeProductRollups(products, 'us')
  const filledReferences = general.references.filter((r) => r.value.trim() !== '' || (!r.guided && r.type.trim() !== ''))
  const filledInstructions = general.instructions.filter((i) => i.description.trim() !== '')

  return (
    <>
      <PageHeader title="Create New Order">
        <Link to="/orders" style={{ textDecoration: 'none' }}>
          <Button variant="secondary">Back to Orders</Button>
        </Link>
      </PageHeader>

      {alertOpen && (isAsync ? (
        <Alert variant="info" onClose={() => setAlertOpen(false)}>
          Your Order was saved. You will receive a notification when the Order number have been created.
        </Alert>
      ) : (
        <Alert variant="success" onClose={() => setAlertOpen(false)}>
          Your Order was created successfully
        </Alert>
      ))}

      <div className="co-confirm-strip">
        <KV label="Order Number" value={isAsync ? '–' : data?.orderNumber} />
        <KV label="Order Date" value={formatOrderDate(data?.orderDate, data?.orderDateTimeZoneCode)} />
        <KV label="Shipment Mode" value={data?.shipmentMode} />
        <KV label="Payment terms" value={general.freightTerm} />
      </div>

      <div className="co-sections">
        <Accordion position="start" status="on" title="General Information" defaultExpanded>
          <div className="co-section-body">
            <div className="co-confirm-block">
              <h3 className="co-subhead text-label-base-medium">General</h3>
              <div className="co-kv">
                <KV label="Owning Organization" value={general.owningOrganizationName || general.owningOrganization} />
                <KV label="Freight Term" value={general.freightTerm} />
                <KV label="Ship Direction" value={general.shipDirection} />
                <KV label="Consolidatable" value={general.consolidatable ? 'Yes' : 'No'} />
              </div>
            </div>
            <div className="co-confirm-block">
              <h3 className="co-subhead text-label-base-medium">Requested Transportation</h3>
              <div className="co-kv">
                <KV label="Equipment" value={general.equipment} />
                {general.equipmentReferenceNumber && (
                  <KV label="Equipment Reference Number" value={general.equipmentReferenceNumber} />
                )}
                {general.carrierScac && (
                  <KV label="Customer Required Carrier" value={general.carrierScac} />
                )}
              </div>
            </div>
            {filledReferences.length > 0 && (
              <div className="co-confirm-block">
                <h3 className="co-subhead text-label-base-medium">References</h3>
                <table className="co-services-table">
                  <thead>
                    <tr>
                      <th className="text-label-sm-medium">Reference Type</th>
                      <th className="text-label-sm-medium">Reference Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filledReferences.map((r) => (
                      <tr key={r.id}>
                        <td className="text-label-sm-regular">{r.type}</td>
                        <td className="text-label-sm-regular">{r.value || '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {filledInstructions.length > 0 && (
              <div className="co-confirm-block">
                <h3 className="co-subhead text-label-base-medium">Instructions</h3>
                <table className="co-services-table">
                  <thead>
                    <tr>
                      <th className="text-label-sm-medium">#</th>
                      <th className="text-label-sm-medium">Instruction Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filledInstructions.map((ins, i) => (
                      <tr key={ins.id}>
                        <td className="text-label-sm-regular">{i + 1}</td>
                        <td className="text-label-sm-regular">{ins.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Accordion>

        <Accordion position="mid" status="on" title="Pickup and Delivery" defaultExpanded>
          <div className="co-section-body">
            <div className="co-party-grid">
              <PartyBlock title="Consignor details" party={pickupDelivery.consignor} />
              <PartyBlock title="Consignee details" party={pickupDelivery.consignee} />
            </div>
            <div className="co-confirm-block">
              <h3 className="co-subhead text-label-base-medium">Planning Date/Time</h3>
              <div className="co-kv">
                {pickupDelivery.earlyPickup.date && <KV label="Early Pickup" value={triadLabel(pickupDelivery.earlyPickup)} />}
                {pickupDelivery.latePickup.date && <KV label="Late Pickup" value={triadLabel(pickupDelivery.latePickup)} />}
                {pickupDelivery.earlyDelivery.date && <KV label="Early Delivery" value={triadLabel(pickupDelivery.earlyDelivery)} />}
                {pickupDelivery.lateDelivery.date && <KV label="Late Delivery" value={triadLabel(pickupDelivery.lateDelivery)} />}
              </div>
            </div>
          </div>
        </Accordion>

        <Accordion position="mid" status="on" title="Product Information" defaultExpanded>
          <div className="co-section-body">
            <div className="co-kv">
              <KV label="Number of Products" value={String(rollups.count)} />
              <KV label="Total Product Weight" value={rollups.totalWeight} />
              <KV label="Total Volume" value={rollups.totalVolume} />
              <KV label="Hazmat" value={rollups.hazmat} />
            </div>
            <table className="co-services-table">
              <thead>
                <tr>
                  <th className="text-label-sm-medium">#</th>
                  <th className="text-label-sm-medium">Product ID</th>
                  <th className="text-label-sm-medium">Product Description</th>
                  <th className="text-label-sm-medium">Gross Weight</th>
                  <th className="text-label-sm-medium">Volume</th>
                  <th className="text-label-sm-medium">Ship Class</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.id}>
                    <td className="text-label-sm-regular">{i + 1}</td>
                    <td className="text-label-sm-regular">{p.productId}</td>
                    <td className="text-label-sm-regular">{p.description}</td>
                    <td className="text-label-sm-regular">{convertMeasureDisplay(p.grossWeight, 'us')}</td>
                    <td className="text-label-sm-regular">{convertMeasureDisplay(p.volume, 'us')}</td>
                    <td className="text-label-sm-regular">{p.shipClass}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Accordion>

        <Accordion position="end" status="on" title="Special Services (Optional)" defaultExpanded>
          <table className="co-services-table">
            <thead>
              <tr>
                <th className="text-label-sm-medium">Service Category</th>
                <th className="text-label-sm-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {specialServices.length === 0 ? (
                <tr>
                  <td className="text-label-sm-regular" style={{ color: 'var(--text-tertiary)' }}>–</td>
                  <td className="text-label-sm-regular" style={{ color: 'var(--text-tertiary)' }}>–</td>
                </tr>
              ) : (
                specialServices.map((s) => (
                  <tr key={s.code}>
                    <td><Badge variant="gray">{s.code}</Badge></td>
                    <td className="text-label-sm-regular">{s.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Accordion>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Smoke-verify in the dev server**

Fill the form completely (General + parties + Late Pickup + ≥1 product), click **Create Order**, and verify:
1. The form unmounts; the confirmation renders on `/orders/create` with the normal navbar back.
2. Green success Alert; strip shows the real `ORD-…`/`S26…` number, Order Date with EST, Shipment Mode Ground, Payment terms = freight term.
3. All four sections expanded with green checks; Quick fill shows no References/Instructions/contact blocks; a Long fill shows them (richness automatic).
4. Product roll-ups (count/total weight/total volume/Hazmat) are correct; hazmat product (e.g. `28042B9G`) flips Hazmat to Yes.
5. Back to Orders → the Summary grid shows the new row with status Ready For Plan (overlay + query invalidation).
6. Async variant: visit `/orders/create?confirm=async`, submit again → blue info Alert with the screen-7 copy, Order Number `–`, everything else populated.

- [ ] **Step 3: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/components/orders/create/ConfirmationView.jsx
git commit -m "orders: confirmation page — sync/async variants, what-was-filled rendering, roll-ups"
```

---

### Task 24: Draft reopen loop (Summary grid → form hydration)

**Files:**
- Modify: `apps/odyssey-one/src/components/orders/OrdersTable.jsx`
- Modify: `apps/odyssey-one/src/routes/orders/OrdersRoute.jsx`

- [ ] **Step 1: Thread an ID-click handler through TanStack `meta` in `OrdersTable.jsx`**

Edit the `idLabel` column cell (COLUMNS stays module-level — the handler arrives via table meta):

```jsx
// before
  columnHelper.accessor('idLabel', {
    header: 'ID',
    // Link-styled, navigates nowhere yet — order detail build wires it (spec §2)
    cell: info => <Button variant="link">{info.getValue()}</Button>,
  }),
// after
  columnHelper.accessor('idLabel', {
    header: 'ID',
    // Link-styled. Draft rows navigate to the create-form reopen; other rows
    // stay inert until the order-detail build (spec §2).
    cell: info => (
      <Button
        variant="link"
        onClick={() => info.table.options.meta?.onRowIdClick?.(info.row.original)}
      >
        {info.getValue()}
      </Button>
    ),
  }),
```

Add the prop and meta to the component (signature + `useReactTable` options):

```jsx
// before
export default function OrdersTable({ rows, rowSelection, onRowSelectionChange, children }) {
// after
export default function OrdersTable({ rows, rowSelection, onRowSelectionChange, onRowIdClick, children }) {
```

and inside the `useReactTable({ … })` options object, add (next to `manualSorting: true`):

```jsx
    meta: { onRowIdClick },
```

- [ ] **Step 2: Navigate from Draft rows in `OrdersRoute.jsx`**

The route already has `useNavigate` (Task 12). Pass the handler to the table:

```jsx
// before
            <OrdersTable
              rows={data.rows}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
            >
// after
            <OrdersTable
              rows={data.rows}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              onRowIdClick={(row) => {
                // Draft rows reopen in the create form (spec §4); others stay
                // inert until the order-detail build. Draft key = orderNumber
                // (plan decision 17 — the save-gate guarantees one).
                if (row.status === 'Draft') navigate(`/orders/create?draft=${encodeURIComponent(row.id)}`)
              }}
            >
```

- [ ] **Step 3: Smoke-verify the full draft loop in the dev server**

1. `/orders/create` → fill Order Number `DRAFT-1` + an Owning Organization (+ a couple more fields) → **Save** → success notice, UI stays open, keep editing → Cancel → **Save for Later** → lands on `/orders`.
2. The grid (orderNumber desc) shows `DRAFT-1` with status Draft — exactly one row even after multiple saves.
3. Click the `DRAFT-1` ID link → `/orders/create?draft=DRAFT-1` → form hydrated: every saved field back, Long mode auto-open if Long data was saved, StepIndicators reflecting the hydrated state.
4. Edit the order number to `DRAFT-2`, Save → back on `/orders`: one Draft row, now `DRAFT-2` (upsert by draftId, no duplicate).
5. A non-Draft row's ID link does nothing.
6. Refresh the browser → Draft rows are gone (in-memory overlay; accepted).

- [ ] **Step 4: Commit**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add apps/odyssey-one/src/components/orders/OrdersTable.jsx apps/odyssey-one/src/routes/orders/OrdersRoute.jsx
git commit -m "orders: draft reopen loop — Draft ID links into /orders/create?draft=<number>"
```

---
## Verification

### Task 25: Verify — tests, type-check, build, manual smoke

**Files:** none (verification only)

- [ ] **Step 1: Full test suite + type-check**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
npx vitest run
npx tsc --noEmit
```

Expected: ALL tests PASS — the new suites (schema, mapFormToOrderInterface, orderServiceWrite, lookupService, productMath) AND every pre-existing suite (orderService list, mapOrderListRow, gridService, shipmentService, client/config/auth, mapSellShipmentOutToDetail, mapShipmentErrorRow). tsc exit 0.

- [ ] **Step 2: Production build (exercises the prebuild generator chain too)**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
npm run build:odyssey-one
git diff --exit-code apps/odyssey-one/src/data/
```

Expected: build succeeds; both generators log (`1200` shipments + `Wrote 4509 orders`); committed JSONs unchanged (exit 0 on the diff — the master-data module must not have perturbed the pools).

- [ ] **Step 3: Manual smoke — the full flow**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
npm run dev:odyssey-one
```

Walk the whole flow against the spec:

**Entry + chrome (spec §2.1)**
1. `/orders` → Create Order → `/orders/create`; sidebar stays; navbar = compact title "Create New Order" + Save for Later + ? + ✕; leaving restores the normal navbar.

**Create → confirm (sync)**
2. Quick fill: Owning Org (`er` typeahead) → Equipment (org-scoped) → Freight Term/Ship Direction defaulted → Consolidatable checked → both parties via location lookup → Late Pickup date/time (TZ auto-derived) → one product row (all five fields). Each completed section's StepIndicator flips green; Create Order enables only when all gating sections pass.
3. Create Order → confirmation: green Alert, real order number, strip values, sections expanded, roll-ups correct. Back to Orders → new Ready For Plan row in the grid.

**Async variant (Q17)**
4. `/orders/create?confirm=async` → submit → blue info Alert, Order Number `–`, full summary otherwise; no polling, nothing else changes.

**Save / draft / discard (Q16/Q27, spec §4)**
5. Save with missing Order Number or Owning Org → red Alert naming both; with both → in-place draft, UI open, Draft row in the grid.
6. Cancel → modal: Discard → `/orders`, nothing kept. Cancel → modal: Save for Later → draft + `/orders`. Navbar Save for Later → same without the modal. Navbar ✕ → opens the modal (same path as Cancel).
7. Draft reopen: grid Draft ID → form hydrated (incl. Long-mode auto-open); re-save upserts (no duplicate row); refresh clears drafts (accepted).

**Long mode**
8. Add More Details: carrier free-text SCAC, equipment ref number, instructions (≤2,000), free-form references; guided references map through (verify on the confirmation: Pickup/PO under References, free rows listed); Long confirmation shows the extra blocks.

**Validation errors (spec §2.4/§6)**
9. Q20 flip-flop incl. never-overwrite after manual pick. Late-date conditional asterisk + error follows the radio. Early > Late errors on the Early field. Past date warns (amber) without blocking. Phone/email errors only when filled. Product row Save blocks with inline per-cell errors. Submit-failure path: temporarily set `VITE_API_MODE=live` (no backend) → submit → error Alert above the footer, form intact, retry available; unset afterwards.

**US|Metric (spec §10)**
10. Toggle flips read-row + roll-up display (Lb↔Kg, Cu ft↔m³); re-editing a row shows the original entered value + UoM; the confirmation and the grid row created from it carry the entered values.

**Regressions**
11. `/orders` Summary grid: pagination/sort/selection/three-dot all behave as before; `/shipments` and Home unaffected; widget-edit mode navbar (Home) still works alongside the new branch.
12. Console: no errors or warnings anywhere in the flow.

- [ ] **Step 4: Fix anything found, then final commit if fixes were made**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add -A apps/odyssey-one/src
git commit -m "orders: create-order flow smoke-test fixes"
```

---

## Out of scope (per spec §0 — do NOT build)

Navbar bell notification for async order numbers (cross-domain chrome), edit-existing-order, copy, templates, OIF failure review, screen-0 follow-ups (tabs/filters/CSV), order-detail navigation for non-Draft rows, `/normalize` cycles for the new pieces (parallel session), browser-back interception, real calendar popover, column management behavior, duplicate-order-number validation endpoint (`/order/validation` — needs a backend), consignor≠consignee identical-address rule (plan decision 23), jsdom component tests (plan decision 11).

## Deferred bookkeeping (post-build, not in this plan's tasks)

- `progress.md` session entry + `vault/10-domains/orders/decisions/decision-log.md` updates happen at `/wrap`, per routine (traceability: every implemented decision → source + previous state).
- Residuals to log in `open-questions.md`: early/late→manualOrder field mapping (decision 8, Ramesh), consolidatable/free-form-reference `userFieldList` homes (decision 9, Ramesh), lookup v1-vs-v3 path + response shape (decision 22), class column canonical label (Q26, Efrain), banner variant if Efrain overrules (decision 6), Q28 shipment-mode derivation.
- Normalization candidates recorded for the parallel session: TypeaheadSelect, SelectField, DateInput/TimeSelect/TimezoneSelect, RepeatableRows, ProductGrid editor row, SpecialServicesPicker, StickyFooter, ConfirmationView KV/strip, DiscardSaveModal footer layout.
