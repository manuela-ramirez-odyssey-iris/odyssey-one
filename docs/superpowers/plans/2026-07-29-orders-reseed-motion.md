# Orders Reseed Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close DB-update-ledger rows 1–9 in one motion: swap the shared data pools to the real vocabularies (equipment, freight-term/ship-direction wire codes, handling units, ship-class codes, NMFC product classes, 13-digit product IDs), promote the ~43 EXTRA_ORGS to real customers, enrich `manual_order` lines, weight errorCount low, add ~1000 order rows at seed volume, ship a `PATCH /order-service/v3/order/status` endpoint wired into the three live write flows, close the resolve-refresh errorCount seam — then regenerate, reseed Neon (⛔ gated), and deploy (⛔ gated).

**Architecture:** `tools/data-pools.mjs` becomes the single source for every shared catalog (it is already imported by both the node generators and the browser's `src/data/master-data.js`, so no lockstep comments are needed — master-data re-exports). The DB/generator store wire CODES (`P`/`O`/`PLT`/`H`…); the UI maps code→label at its existing single seams (`mapOrderListRow`, `mapSellShipmentOutToDetail`, `mapFormVmToOrderPane`); the create form's option values become the codes end-to-end. The API grows one route following the tested pure-query-builder pattern in `api/_lib/orders.mjs`.

**Tech Stack:** Node ESM + faker (seed 42) generators, `node:test` for tools/api, Vitest for the app, pg/Neon, Vercel single-function API, React 19 + RHF.

**Working directory for all commands:** `/Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one` unless stated otherwise.

**Test suites (canonical commands):**
- App: `npx vitest run` (currently 560 tests)
- Tools: `node --test tools/generate.test.mjs tools/seed.test.mjs`
- API: `node --test api/_lib/orders.test.mjs api/_lib/router.test.mjs api/_lib/shipments.test.mjs`
- Types: `npm run typecheck`

---

### Task 1: Equipment vocabulary — one catalog in data-pools

**Files:**
- Modify: `apps/odyssey-one/tools/data-pools.mjs:10`
- Modify: `apps/odyssey-one/src/data/master-data.js:7-37`
- Modify: `apps/odyssey-one/tools/generate.mjs:100`, `:933`
- Modify: `apps/odyssey-one/src/search/shipments/progression.js:76`

- [ ] **Step 1: Replace `EQUIPMENT_CODES` in data-pools with the real catalog (labels + derived codes)**

Replace line 10 of `tools/data-pools.mjs` (`export const EQUIPMENT_CODES = ['FLT', 'LTH', 'VAN', 'REEFER'];`) with:

```js
// Real equipment catalog (LINX-13893 matrix + old-TMS captures) — swapped at
// the end-of-Orders reseed (DB ledger row 1). SINGLE SOURCE: master-data.js
// re-exports these; both generators draw EQUIPMENT_CODES. Old mock LTH
// ("Lowboy") is gone — LTH now means LTL Hazmat everywhere.
export const EQUIPMENT_LABELS = {
  LTL: 'Less Than Truckload', LTR: 'LTL Refrigerated', LTH: 'LTL Hazmat',
  TL: 'Truck Load', TLR: 'Refrigerated Box Trailer', TLH: 'TL Hazmat',
  TT: 'Tank Truck', TLF: 'Frozen Box Trailer',
  LCL: 'Less than Container Load', FCL: 'Full Container Load', RR: 'Rail',
}
export const EQUIPMENT_CODES = Object.keys(EQUIPMENT_LABELS)
```

- [ ] **Step 2: Make master-data re-export instead of redefining**

In `src/data/master-data.js`, change the import (line 7) and the export (line 9) to include `EQUIPMENT_LABELS`, and delete the local `EQUIPMENT_LABELS` block (lines 18–30, including its "deliberately untouched" comment — that deferral is now shipped). Keep `EQUIPMENT_SCOPE` as-is.

```js
import { CUSTOMERS, LOCATIONS, EQUIPMENT_CODES, EQUIPMENT_LABELS, CHEMICAL_PRODUCTS, locationIdFor } from '../../tools/data-pools.mjs'

export { CUSTOMERS, LOCATIONS, EQUIPMENT_CODES, EQUIPMENT_LABELS, CHEMICAL_PRODUCTS }
```

and replace `export const EQUIPMENT_LOOKUP_CODES = Object.keys(EQUIPMENT_LABELS)` (line 31) with:

```js
export const EQUIPMENT_LOOKUP_CODES = EQUIPMENT_CODES
```

- [ ] **Step 3: Delete the divergent generator-local pool**

In `tools/generate.mjs`:
- Delete line 100: `const ORDER_EQUIPMENT_CODES = ['TL', 'LTL', 'VAN', 'REEFER', 'TANK', 'FLATBED'];`
- At line ~933 change `const orderEquipCode = pick(ORDER_EQUIPMENT_CODES);` to:

```js
    const orderEquipCode = pick(EQUIPMENT_CODES);
```

(Lines 308, 515, 584, 1319 already use `EQUIPMENT_CODES` — they now draw the real 11-code catalog; that is the point.)

- [ ] **Step 4: Swap the Shipments search enum**

In `src/search/shipments/progression.js`, add at the top of the file (after the header comment, with the other imports if any — the file currently has none):

```js
import { EQUIPMENT_CODES } from '../../data/master-data'
```

and change line 76 to:

```js
      { key: 'equipment-code', label: 'Equipment Code', dataKey: 'equipmentCode', match: 'enum', values: EQUIPMENT_CODES },
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run && node --test tools/generate.test.mjs tools/seed.test.mjs`
Expected: all pass (the `lookupService.test.ts` equipment test already asserts the 11-code catalog; fixture literals like `'VAN'` are opaque strings through the mappers and deliberately left alone).

- [ ] **Step 6: Commit**

```bash
git add tools/data-pools.mjs src/data/master-data.js tools/generate.mjs src/search/shipments/progression.js
git commit -m "feat(orders): single-source real equipment catalog in data-pools (ledger row 1)"
```

---

### Task 2: Freight-term + ship-direction wire codes in the pools/generator

**Files:**
- Modify: `apps/odyssey-one/tools/data-pools.mjs` (append)
- Modify: `apps/odyssey-one/src/data/master-data.js:43-53`
- Modify: `apps/odyssey-one/tools/generate.mjs:47`, `:120-121`, `:315-316`, `:961`, `:1317-1318`
- Modify: `apps/odyssey-one/src/api/services/lookupService.test.ts:41-45`

- [ ] **Step 1: Add codes + label helpers to data-pools**

Append to `tools/data-pools.mjs`:

```js
// Freight-term / ship-direction wire codes — CONFIRMED via live dev capture
// (DB ledger row 2). The DB and generator rows store the letter codes; the UI
// maps code → label at render. Order keeps Pre-Paid first (Q20 default).
export const FREIGHT_TERMS = [
  { value: 'P', label: 'Pre-Paid' },
  { value: 'C', label: 'Collect' },
  { value: 'A', label: 'Pre-Paid/Add' },
  { value: 'T', label: 'Third Party' },
  { value: 'N', label: 'No Charge' },
]
export const SHIP_DIRECTIONS = [
  { value: 'O', label: 'Outbound' },
  { value: 'I', label: 'Inbound' },
]
export const freightTermLabel = (code) => FREIGHT_TERMS.find((t) => t.value === code)?.label ?? code
export const shipDirectionLabel = (code) => SHIP_DIRECTIONS.find((d) => d.value === code)?.label ?? code
```

- [ ] **Step 2: master-data re-exports; delete local defs**

In `src/data/master-data.js` delete the local `FREIGHT_TERMS` (lines 40–49 incl. the "value=label until master data answers" comment — answered) and `SHIP_DIRECTIONS` (lines 50–53), and extend the data-pools import/export:

```js
import {
  CUSTOMERS, LOCATIONS, EQUIPMENT_CODES, EQUIPMENT_LABELS, CHEMICAL_PRODUCTS,
  FREIGHT_TERMS, SHIP_DIRECTIONS, freightTermLabel, shipDirectionLabel,
  locationIdFor,
} from '../../tools/data-pools.mjs'

export {
  CUSTOMERS, LOCATIONS, EQUIPMENT_CODES, EQUIPMENT_LABELS, CHEMICAL_PRODUCTS,
  FREIGHT_TERMS, SHIP_DIRECTIONS, freightTermLabel, shipDirectionLabel,
}
```

- [ ] **Step 3: Generator stores codes**

In `tools/generate.mjs`:

Line 47 import gains the two catalogs:

```js
import { CUSTOMERS, LOCATIONS, EQUIPMENT_CODES, CHEMICAL_PRODUCTS, FREIGHT_TERMS, SHIP_DIRECTIONS, locationIdFor } from './data-pools.mjs'
```

Replace lines 118–121 (the comment + `PAYMENT_TERMS` + local `SHIP_DIRECTIONS`) with:

```js
// Wire-code vocabulary (DB ledger row 2): rows store the letter codes; the UI
// maps code → label at render. Shipment detail and order rows agree verbatim.
const PAYMENT_TERMS = FREIGHT_TERMS.map((t) => t.value)          // P/C/A/T/N
const SHIP_DIRECTION_CODES = SHIP_DIRECTIONS.map((d) => d.value) // O/I
```

Line 315: `const shipDirection = pick(SHIP_DIRECTION_CODES);`
Line 961: `shipDirectionCode: shipDirection, // I2 — already the wire code ('O'/'I')`
Line 1317: `shipDirection: pick(SHIP_DIRECTION_CODES),`
(Lines 316 and 1318 `pick(PAYMENT_TERMS)` are unchanged in text but now yield codes.)

- [ ] **Step 4: Update the lookup test to expect codes**

In `src/api/services/lookupService.test.ts` (lines 41–45):

```ts
  it('select-like types return the full list with no typeahead gate', async () => {
    const terms = await getLookupOptions('freight-term', '')
    expect(terms.map(o => o.value)).toEqual(['P', 'C', 'A', 'T', 'N'])
    expect(terms.map(o => o.label)).toEqual(['Pre-Paid', 'Collect', 'Pre-Paid/Add', 'Third Party', 'No Charge'])
    const dirs = await getLookupOptions('ship-direction', '')
    expect(dirs.map(o => o.value)).toEqual(['O', 'I'])
  })
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run && node --test tools/generate.test.mjs`
Expected: all pass (form/mapper tests still use label strings for now — they are opaque pass-throughs until Task 3 changes the form values).

- [ ] **Step 6: Commit**

```bash
git add tools/data-pools.mjs src/data/master-data.js tools/generate.mjs src/api/services/lookupService.test.ts
git commit -m "feat(orders): freight-term + ship-direction wire codes in pools/generator (ledger row 2)"
```

---

### Task 3: Frontend code→label rendering + form values become codes

**Files:**
- Modify: `apps/odyssey-one/src/api/mappers/mapOrderListRow.ts:60-63`
- Modify: `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts:47-51`, `:77`
- Modify: `apps/odyssey-one/src/components/orders/summary/mapFormVmToOrderPane.js:2`, `:71-72`, `:133`
- Modify: `apps/odyssey-one/src/api/types/orderFormVm.ts:128-129`
- Modify: `apps/odyssey-one/src/components/orders/create/sections/GeneralInformationSection.jsx:71`, `:216`
- Modify tests/fixtures: `orderFormValues.sample.ts`, `orderListRow.sample.ts`, `sellShipmentOut.sample.ts`, `mapFormToOrderInterface.test.ts`, `mapOrderViewToFormVm.test.ts`, `mapOrderListRow.test.ts`, `orderService.getOrderView.test.ts`, `validationErrors.test.js`

- [ ] **Step 1: Grid seam maps codes to labels**

`src/api/mappers/mapOrderListRow.ts` — add the import and change the two VM fields (lines 62–63):

```ts
import { freightTermLabel, shipDirectionLabel } from '../../data/master-data'
```

```ts
    shipDirection: shipDirectionLabel(s(row.shipDirection)),
    freightTerms: freightTermLabel(s(row.freightTerms)),
```

(Unknown/legacy values fall through the helpers unchanged, so overlay rows written before the flip still render.)

- [ ] **Step 2: Shipment-detail seam maps freight terms**

`src/api/mappers/mapSellShipmentOutToDetail.ts` — add the import and use it at line 77 (`mapShipDirection` already handles `O`/`I`; leave it):

```ts
import { freightTermLabel } from '../../data/master-data'
```

```ts
    paymentTerms: header.freightTerms ? freightTermLabel(header.freightTerms) : DASH,
```

- [ ] **Step 3: Summary/confirmation seam maps both**

`src/components/orders/summary/mapFormVmToOrderPane.js` — line 2 becomes:

```js
import { HANDLING_UNITS, SPECIAL_SERVICES, freightTermLabel, shipDirectionLabel } from '../../../data/master-data'
```

Lines 71–72:

```js
    paymentTerms: freightTermLabel(general.freightTerm), // detail-VM label drift: Freight Term
    shipDirection: shipDirectionLabel(general.shipDirection),
```

Line 133 (`strip`):

```js
    paymentTerms: freightTermLabel(general.freightTerm),
```

- [ ] **Step 4: Form option values are now the codes — update defaults + Q20 literals**

`src/api/types/orderFormVm.ts` lines 128–129:

```ts
      freightTerm: 'P',   // Q20: Outbound default → Pre-Paid (wire code)
      shipDirection: 'O', // default per Efrain §1 (wire code)
```

`src/components/orders/create/sections/GeneralInformationSection.jsx` line 71:

```js
    const directionDefault = g.shipDirection === 'I' ? 'C' : 'P'
```

line 216:

```js
                  setValue('general.freightTerm', v === 'I' ? 'C' : 'P', { shouldValidate: true })
```

(No other change needed: `FREIGHT_TERMS`/`SHIP_DIRECTIONS` imported from master-data are now `{value: code, label}` pairs, and the pick-only ComboBox renders the option label for a committed value — `packages/ui/src/ComboBox.jsx:218-221`.)

- [ ] **Step 5: Update fixtures + assertions to codes (VM assertions stay labels)**

- `src/api/fixtures/orderFormValues.sample.ts:13-14` → `freightTerm: 'P',` / `shipDirection: 'O',`
- `src/api/fixtures/orderListRow.sample.ts:9-10` → `shipDirection: 'I',` / `freightTerms: 'P',`
- `src/api/fixtures/sellShipmentOut.sample.ts:10-11` → `shipDirection: 'O',` / `freightTerms: 'P',`
- `src/api/mappers/mapFormToOrderInterface.test.ts:12-13` → `expect(mo.freightTermCode).toBe('P')` / `expect(mo.shipDirectionCode).toBe('O')`
- `src/api/mappers/mapOrderViewToFormVm.test.ts:38-39` → `freightTermCode: 'P',` / `shipDirectionCode: 'O',`; lines 89–90 → `expect(vm.general.freightTerm).toBe('P')` / `expect(vm.general.shipDirection).toBe('O')`
- `src/api/mappers/mapOrderListRow.test.ts:20-21` → input `shipDirection: 'I', freightTerms: 'P',`; the VM expectations keep `shipDirection: 'Inbound'` / `freightTerms: 'Pre-Paid'` (that is the new mapping under test). Line 60's second fixture likewise → `shipDirection: 'I', freightTerms: 'P',`.
- `src/api/services/orderService.getOrderView.test.ts:10-11` → `shipDirection: 'O',` / `freightTerms: 'P',`; lines 47–48 → `expect(vm!.general.freightTerm).toBe('P')` / `expect(vm!.general.shipDirection).toBe('O')`
- `src/api/services/orderService.test.ts:12-13` (mk fixture) → `shipDirection: 'O',` / `freightTerms: 'P',`
- `src/components/orders/resolve/validationErrors.test.js:8-9` → `v.general.freightTerm = 'P'` / `v.general.shipDirection = 'O'`
- `src/api/mappers/mapSellShipmentOutToDetail.test.ts` — find the paymentTerms assertion (search `paymentTerms`); it should now expect `'Pre-Paid'` from the `'P'` fixture (update if it asserted the raw string).

- [ ] **Step 6: Run tests + typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: all pass. If a confirmation/summary test renders `Pre-Paid` text it still passes (labels unchanged on screen).

- [ ] **Step 7: Commit**

```bash
git add -A src/api src/components/orders src/data
git commit -m "feat(orders): code-valued freight term / ship direction end-to-end with label rendering (ledger row 2)"
```

---

### Task 4: Promote EXTRA_ORGS to real seeded customers

**Files:**
- Modify: `apps/odyssey-one/tools/data-pools.mjs` (append after `CUSTOMERS`)
- Modify: `apps/odyssey-one/src/data/master-data.js:167-194`
- Modify: `apps/odyssey-one/tools/generate.mjs:47`, `:292`, `:1280`
- Modify: `apps/odyssey-one/tools/seed.mjs:6`, `:43`
- Modify: `apps/odyssey-one/tools/generate.test.mjs` (new test)

- [ ] **Step 1: Move the 43-name list into data-pools as `EXTRA_CUSTOMERS`**

Append to `tools/data-pools.mjs` (names copied VERBATIM from `master-data.js` lines 173–191; the id derivation is the same formula master-data used for lookup values, so existing lookup values stay stable):

```js
// Promoted create-order orgs (user decision 2026-07-29 — DB ledger row 3):
// formerly lookup-only EXTRA_ORGS; now real seeded customers that can own
// orders. Ids derive from the names exactly as master-data's lookup values
// always did.
export const EXTRA_CUSTOMERS = [
  'RECKITT-BENCKISER (SOURCE)', 'REDLAND BRICK INC (SOURCE)', 'REHEIS INC (SOURCE)',
  'REVLON CONSUMER PRODUCTS CORP (SOURCE)', '*ADAMS-REMCO SOURCE SYSTEM 01',
  '*EASTERNWIRE SOURCE SYSTEM 01', '*HABASIT-READ SOURCE SYSTEM 01',
  'AKZO NOBEL COATINGS (SOURCE)', 'ARKEMA INC (SOURCE)', 'ASHLAND SPECIALTY (SOURCE)',
  'AXALTA COATING SYSTEMS (SOURCE)', 'BRENNTAG NORTH AMERICA (SOURCE)',
  'CABOT CORPORATION (SOURCE)', 'CHEMOURS COMPANY (SOURCE)', 'CLARIANT CORP (SOURCE)',
  'ECOLAB INC (SOURCE)', 'EVONIK INDUSTRIES (SOURCE)', 'FERRO CORPORATION (SOURCE)',
  'GRACE & CO (SOURCE)', 'HB FULLER COMPANY (SOURCE)', 'HENKEL CORPORATION (SOURCE)',
  'HEXION INC (SOURCE)', 'HONEYWELL PMT (SOURCE)', 'ICL SPECIALTY PRODUCTS (SOURCE)',
  'KRATON POLYMERS (SOURCE)', 'LANXESS CORPORATION (SOURCE)', 'LUBRIZOL CORP (SOURCE)',
  'MOMENTIVE PERFORMANCE (SOURCE)', 'OLIN CORPORATION (SOURCE)', 'PPG INDUSTRIES (SOURCE)',
  'SABIC AMERICAS (SOURCE)', 'SOLVAY USA (SOURCE)', 'STEPAN COMPANY (SOURCE)',
  'TRINSEO LLC (SOURCE)', 'WACKER CHEMICAL (SOURCE)',
  '*BORAL-ROOF SOURCE SYSTEM 01', '*CARLISLE-CM SOURCE SYSTEM 01',
  '*DELTA-FAUCET SOURCE SYSTEM 01', '*GAF-MATERIALS SOURCE SYSTEM 01',
  '*JELD-WEN SOURCE SYSTEM 01', '*MASCO-CABINET SOURCE SYSTEM 01',
  '*PELLA-CORP SOURCE SYSTEM 01', '*USG-CORP SOURCE SYSTEM 01',
].map((name) => ({
  id: name.replace(/[^A-Z0-9]+/gi, '_').replace(/^_|_$/g, ''),
  name,
}))
```

- [ ] **Step 2: master-data derives `EXTRA_ORGS` from it**

Replace the whole `EXTRA_ORGS` block in `src/data/master-data.js` (lines 167–194) with:

```js
// ── Extra owning orgs — PROMOTED to real seeded customers at the end-of-Orders
// reseed (DB ledger row 3): the list now lives in data-pools EXTRA_CUSTOMERS,
// gets inserted into the customers table, and owns a thin tail of orders.
export const EXTRA_ORGS = EXTRA_CUSTOMERS.map((c) => ({ value: c.id, label: c.name }))
```

and add `EXTRA_CUSTOMERS` to the data-pools import in the same file.

- [ ] **Step 3: Weighted customer pick in the generator (originals stay dominant)**

In `tools/generate.mjs`, add `EXTRA_CUSTOMERS` to the data-pools import, then add below the `pick`/`pickN` helpers (~line 215):

```js
// Ownership pick (DB ledger row 3): the original 25 shared-pool customers stay
// dominant (~92% of shipments/orders); promoted extras own a thin tail so they
// exist observably without re-shaping per-customer distributions.
function pickCustomer() {
  return faker.number.float({ min: 0, max: 1 }) < 0.92 ? pick(CUSTOMERS) : pick(EXTRA_CUSTOMERS)
}
```

Change line 292 (`generateShipment`) and line 1280 (`generateUnshippedOrder`) from `const customer = pick(CUSTOMERS);` to:

```js
  const customer = pickCustomer();
```

- [ ] **Step 4: Seed extras into the customers table**

`tools/seed.mjs` line 6 import gains `EXTRA_CUSTOMERS`:

```js
import { CUSTOMERS, EXTRA_CUSTOMERS, LOCATIONS, locationIdFor } from './data-pools.mjs'
```

Line 43 becomes:

```js
  await insertRows(client, 'customers', ['id', 'name'],
    [...CUSTOMERS, ...EXTRA_CUSTOMERS].map((c) => [c.id, c.name]))
```

(orders.customer has a FK to customers(id) — this insert is what makes extra-owned rows insertable. `seed-users.mjs` assignments stay untouched: scoped planners simply never see extra-owned rows; guest/admin, being unscoped, do.)

- [ ] **Step 5: Write the generator test**

Append to `tools/generate.test.mjs` (add `import { EXTRA_CUSTOMERS } from './data-pools.mjs'` at the top):

```js
test('promoted extra orgs own a thin tail; original customers dominate', () => {
  const { orders } = buildDataset({ totalShipments: 200 })
  const extraIds = new Set(EXTRA_CUSTOMERS.map((c) => c.id))
  const extras = orders.filter((o) => extraIds.has(o.customer)).length
  assert.ok(extras > 0, 'extras own some orders')
  assert.ok(extras / orders.length < 0.2, `extras own ${extras}/${orders.length}`)
})
```

- [ ] **Step 6: Run tests**

Run: `node --test tools/generate.test.mjs tools/seed.test.mjs && npx vitest run`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add tools/data-pools.mjs tools/generate.mjs tools/generate.test.mjs tools/seed.mjs src/data/master-data.js
git commit -m "feat(orders): promote 43 EXTRA_ORGS to seeded customers with weighted ownership (ledger row 3)"
```

---

### Task 5: 13-digit external product IDs, single-sourced

**Files:**
- Modify: `apps/odyssey-one/tools/data-pools.mjs:83-104`
- Modify: `apps/odyssey-one/src/api/services/lookupService.ts:103-114`
- Modify: `apps/odyssey-one/src/api/services/lookupService.test.ts` (product test)

- [ ] **Step 1: Data-pools computes the id; product lines carry it as `item`**

In `tools/data-pools.mjs`, insert above `CHEMICAL_PRODUCTS`:

```js
// 13-digit external product IDs (legacy 18-digit mf_ship_item.external_id
// minus 5 leading zeros — user decision 2026-07-29; DB ledger row 5). Single
// source for pool lines AND the create-flow product lookup.
export const productExternalId = (i) => String(100027 + i).padStart(13, '0')
```

and change the `CHEMICAL_PRODUCTS` declaration so each entry's `item` becomes the external id (keep all 20 objects verbatim, wrap the array):

```js
export const CHEMICAL_PRODUCTS = [
  { item: '32041H1D', desc: 'Sodium Hydroxide Solution 50%', hazmat: true, hClass: 'Class 8', hGroup: 'II', unNumber: 'UN1824' },
  /* … the remaining 19 entries UNCHANGED … */
  { item: '39076P8U', desc: 'PVC Compound Rigid', hazmat: false },
].map((p, i) => ({ ...p, item: productExternalId(i) }))
```

(Every consumer reads `product.item` — generator `itemCode`, enrichment `shipItemIdentifier` — so the swap propagates with zero further edits.)

- [ ] **Step 2: Lookup serves the same ids**

In `src/api/services/lookupService.ts`, replace the `'product'` case (lines 103–114) with:

```ts
    case 'product':
      // Product ID = 13-digit external id (18-digit legacy minus 5 leading
      // zeros — DB ledger row 5). Single-sourced: data-pools stamps the same
      // id on the pool lines, so create-flow picks match seeded lines.
      return CHEMICAL_PRODUCTS.map((p: { item: string; desc: string; hazmat: boolean }, i: number) => ({
        value: p.item,
        label: p.item,
        description: p.desc,
        frequency: CHEMICAL_PRODUCTS.length - i,
        meta: { hazmat: p.hazmat },
      }))
```

- [ ] **Step 3: Update the lookup test**

In `src/api/services/lookupService.test.ts`, in the product test (lines ~59–65) replace the format assertion:

```ts
    // Product ID = 13-digit external id (18-digit legacy minus 5 leading zeros)
    expect(opt.value).toMatch(/^\d{13}$/)
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run && node --test tools/generate.test.mjs`
Expected: all pass (the `confirmation.test.jsx` 18-digit `productId` fixture is an opaque string — untouched).

- [ ] **Step 5: Commit**

```bash
git add tools/data-pools.mjs src/api/services/lookupService.ts src/api/services/lookupService.test.ts
git commit -m "feat(orders): 13-digit external product IDs single-sourced in data-pools (ledger row 5)"
```

---

### Task 6: Handling-unit codes, ship-class codes (H/C/P/N) and real NMFC product classes

**Files:**
- Modify: `apps/odyssey-one/tools/data-pools.mjs` (append)
- Modify: `apps/odyssey-one/src/data/master-data.js:54-68`, `:259-271`
- Modify: `apps/odyssey-one/tools/generate.mjs:47`, `:124`, `:364`, `:1297`
- Modify: `apps/odyssey-one/src/components/orders/create/ProductGrid.jsx:16-24`
- Modify: `apps/odyssey-one/src/api/services/lookupService.ts:88-91`

Field assignment (the two concepts, decided): the create-form's `shipClass` cell (labelled "Product Class") is the class-TYPE selector — wire codes `H/C/P/N`; enrichment `orderLines[].shipClass` carries that TYPE code. The NMFC scale (`'50'…'650'`) is the class-VALUE catalog and rides the shipment-detail line field `productClass` (replacing today's fake 4-entry type list there). `handlingUnit` on every generated line stores the CODE (`PLT/BOX/DRM/BUL/CRT`).

- [ ] **Step 1: Add the catalogs to data-pools**

Append to `tools/data-pools.mjs`:

```js
// Class-TYPE selector (QA-confirmed): wire codes H/C/P/N. This is the create
// form's "Product Class" cell. The NMFC scale below is the separate
// class-VALUE catalog (live dev capture, dirty rows excluded).
export const SHIP_CLASSES = [
  { value: 'H', label: 'Harmonized' },
  { value: 'C', label: 'Commodity' },
  { value: 'P', label: 'Product' },
  { value: 'N', label: 'NMFC' },
]
export const SHIP_CLASS_CODES = SHIP_CLASSES.map((c) => c.value)
export const PRODUCT_CLASSES = [
  '50', '55', '60', '65', '70', '77.5', '85', '92.5', '100', '110',
  '125', '150', '175', '200', '250', '300', '350', '400', '450', '500', '650',
]
// Handling units — complete real catalog (live dev capture, LINX-8135).
// Order lines store the CODE (DB ledger row 6).
export const HANDLING_UNITS = [
  { code: 'PLT', label: 'Pallet' },
  { code: 'BOX', label: 'Box' },
  { code: 'DRM', label: 'Drum' },
  { code: 'BUL', label: 'Bulk' },
  { code: 'CRT', label: 'Crate' },
]
```

- [ ] **Step 2: master-data re-exports; delete its local `SHIP_CLASSES` (line 58), `PRODUCT_CLASSES` (lines 60–68) and `HANDLING_UNITS` (lines 259–271)**

Extend the data-pools import/export in `src/data/master-data.js` with `SHIP_CLASSES, SHIP_CLASS_CODES, PRODUCT_CLASSES, HANDLING_UNITS` (same pattern as Tasks 1–2, 4).

- [ ] **Step 3: Generator draws codes + real classes**

In `tools/generate.mjs`:
- Import gains `SHIP_CLASS_CODES, PRODUCT_CLASSES, HANDLING_UNITS` from `./data-pools.mjs`.
- Delete line 124: `const PRODUCT_CLASSES = ['Commodity', 'Harmonized', 'NMFC', 'Product Class'];`
- In the shipped-line builder (inside `generateShipment`, the `lines.push({...})` object ~line 344–381), change `productClass: pick(PRODUCT_CLASSES),` (line 364) to and add the new fields alongside it:

```js
        productClass: pick(PRODUCT_CLASSES),      // NMFC class VALUE ('50'…'650')
        shipClassCode: pick(SHIP_CLASS_CODES),    // class TYPE (H/C/P/N) — form wire `shipClass`
        handlingUnit: pick(HANDLING_UNITS).code,  // PLT/BOX/DRM/BUL/CRT (ledger row 6)
        harmonizedCode: `${faker.number.int({ min: 2800, max: 3999 })}.${faker.string.numeric(2)}.${faker.string.numeric(2)}.${faker.string.numeric(2)}`,
        stccCode: faker.string.numeric(7),
```

- In the unshipped-line builder (~line 1290–1300), replace the line object with:

```js
    lines.push({
      itemCode: product.item,
      itemDescription: product.desc,
      grossWeightValue: faker.number.int({ min: 1000, max: 15000 }),
      volumeValue: faker.number.int({ min: 20, max: 200 }),
      packageCount: faker.number.int({ min: 5, max: 80 }),
      shipClassCode: pick(SHIP_CLASS_CODES),
      handlingUnit: pick(HANDLING_UNITS).code,
      lengthValue: faker.number.int({ min: 2, max: 6 }),
      widthValue: faker.number.int({ min: 2, max: 6 }),
      heightValue: faker.number.int({ min: 2, max: 6 }),
      harmonizedCode: `${faker.number.int({ min: 2800, max: 3999 })}.${faker.string.numeric(2)}.${faker.string.numeric(2)}.${faker.string.numeric(2)}`,
      stccCode: faker.string.numeric(7),
      declaredValue: faker.number.int({ min: 2000, max: 50000 }),
      declaredValueCurrency: 'USD',
      hazmat: product.hazmat, // local only — not serialized; feeds row.hazardous derivation below
    });
```

(The two enrichment `orderLines` maps that read `l.productClass` switch to the new fields in Task 7.)

- [ ] **Step 4: ProductGrid + lookup use the pair-shaped SHIP_CLASSES**

`src/components/orders/create/ProductGrid.jsx` lines 16–24 — `SHIP_CLASSES` is now `{value,label}[]`:

```js
const SELECT_OPTIONS = {
  // QA screenshot 2026-07-28: the UI's Product Class dropdown IS the 4-type
  // selector; wire codes are the letters H/C/P/N (DB ledger row 6). The NMFC
  // 50–650 catalog (PRODUCT_CLASSES) is a different lookup, not this cell.
  shipClass: SHIP_CLASSES,
  handlingUnit: HANDLING_UNITS.map((u) => ({ value: u.code, label: u.label })),
  declaredValueCurrency: toOptions(CURRENCIES),
  manufacturingCountry: toOptions(COUNTRIES),
}
```

`src/api/services/lookupService.ts` `'ship-class'` case (lines 88–91):

```ts
    case 'ship-class':
      return SHIP_CLASSES.map((c: { value: string; label: string }, i: number) => ({
        ...c, frequency: SHIP_CLASSES.length - i,
      }))
```

- [ ] **Step 5: Run tests; fix any ship-class assertion**

Run: `npx vitest run && node --test tools/generate.test.mjs && npm run typecheck`
Expected: all pass. If `lookupService.test.ts` or a ProductGrid test asserts ship-class values as the label strings, update it to expect values `['H','C','P','N']` with labels `['Harmonized','Commodity','Product','NMFC']`.

- [ ] **Step 6: Commit**

```bash
git add tools/data-pools.mjs tools/generate.mjs src/data/master-data.js src/components/orders/create/ProductGrid.jsx src/api/services/lookupService.ts src/api/services/lookupService.test.ts
git commit -m "feat(orders): handling-unit codes, H/C/P/N ship-class codes, real NMFC classes (ledger row 6)"
```

---

### Task 7: manual_order enrichment lines carry the create-form wire fields

**Files:**
- Modify: `apps/odyssey-one/tools/generate.mjs:1186-1195` (buildOrderEnrichment) and `:1396-1405` (unshipped enrichment)
- Modify: `apps/odyssey-one/src/api/mappers/mapOrderViewToFormVm.ts:109-116`
- Modify: `apps/odyssey-one/tools/generate.test.mjs` (new test)
- Modify: `apps/odyssey-one/src/api/mappers/mapOrderViewToFormVm.test.ts` (extend line fixture + assertions)

Wire keys are EXACTLY `mapFormToOrderInterface.ts:77-102`'s `ManualOrderLine` keys (`src/api/types/createOrder.ts:34-57` already declares them all — no type change needed).

- [ ] **Step 1: Shipped enrichment lines (buildOrderEnrichment, generate.mjs:1186-1195)**

Replace the `orderLines:` map with:

```js
    orderLines: lines.map((l, i) => ({
      lineIdentifier: i + 1,
      shipItemIdentifier: l.itemCode,
      productDescription: l.itemDescription,
      hazardous: !!l.hazmatCode || undefined,
      grossWeightValue: l.grossWeightValue,
      grossWeightUomCode: 'lb',
      volumeValue: l.volumeValue,
      volumeUomCode: 'cuft',
      shipClass: l.shipClassCode,               // class TYPE code (H/C/P/N)
      handlingUnit: l.handlingUnit,             // PLT/BOX/DRM/BUL/CRT
      handlingUnitCount: l.packageCount,
      lengthValue: l.lengthValue,
      widthValue: l.widthValue,
      heightValue: l.heightValue,
      dimensionUomCode: 'ft',
      harmonizedCode: l.harmonizedCode,
      declaredValue: l.declaredValue,
      declaredValueCurrency: l.declaredValueCurrency,
      manufacturingCountryCode: 'United States', // matches the form's COUNTRIES select values
      stccCode: l.stccCode,
    })),
```

- [ ] **Step 2: Unshipped enrichment lines (generate.mjs:1396-1405)**

Replace that `orderLines:` map with:

```js
      orderLines: lines.map((l, i) => ({
        lineIdentifier: i + 1,
        shipItemIdentifier: l.itemCode,
        productDescription: l.itemDescription,
        hazardous: l.hazmat || undefined,
        grossWeightValue: l.grossWeightValue,
        grossWeightUomCode: 'lb',
        volumeValue: l.volumeValue,
        volumeUomCode: 'cuft',
        shipClass: l.shipClassCode,
        handlingUnit: l.handlingUnit,
        handlingUnitCount: l.packageCount,
        lengthValue: l.lengthValue,
        widthValue: l.widthValue,
        heightValue: l.heightValue,
        dimensionUomCode: 'ft',
        harmonizedCode: l.harmonizedCode,
        declaredValue: l.declaredValue,
        declaredValueCurrency: l.declaredValueCurrency,
        manufacturingCountryCode: 'United States',
        stccCode: l.stccCode,
      })),
```

- [ ] **Step 3: Reverse mapper recovers the new keys (views/reopened drafts read real data)**

`src/api/mappers/mapOrderViewToFormVm.ts` — replace the `products:` map (lines 109–116) with:

```ts
    products: (mo.orderLines ?? []).map((l, i) => ({
      id: `prod-${i + 1}`,
      hazardous: l.hazardous ?? false,
      productId: l.shipItemIdentifier,
      description: l.productDescription,
      grossWeight: { value: String(l.grossWeightValue), uom: l.grossWeightUomCode },
      volume: { value: String(l.volumeValue), uom: l.volumeUomCode },
      shipClass: l.shipClass,
      handlingUnit: l.handlingUnit ?? '',
      handlingCount: l.handlingUnitCount != null ? String(l.handlingUnitCount) : '',
      length: { value: l.lengthValue != null ? String(l.lengthValue) : '', uom: l.dimensionUomCode ?? 'ft' },
      width: { value: l.widthValue != null ? String(l.widthValue) : '', uom: l.dimensionUomCode ?? 'ft' },
      height: { value: l.heightValue != null ? String(l.heightValue) : '', uom: l.dimensionUomCode ?? 'ft' },
      harmonizedCode: l.harmonizedCode ?? '',
      declaredValue: l.declaredValue != null ? String(l.declaredValue) : '',
      declaredValueCurrency: l.declaredValueCurrency ?? '',
      manufacturingCountry: l.manufacturingCountryCode ?? '',
      stccCode: l.stccCode ?? '',
    })),
```

- [ ] **Step 4: Tests**

Append to `tools/generate.test.mjs`:

```js
test('enrichment orderLines carry the create-form wire fields (ledger rows 4/5/6)', () => {
  const ds = buildDataset({ totalShipments: 50 })
  const enriched = Object.values(ds.orderDetails)
  assert.ok(enriched.length > 0)
  for (const mo of enriched) {
    for (const l of mo.orderLines) {
      assert.match(l.shipItemIdentifier, /^\d{13}$/)
      assert.ok(['H', 'C', 'P', 'N'].includes(l.shipClass), `shipClass ${l.shipClass}`)
      assert.ok(['PLT', 'BOX', 'DRM', 'BUL', 'CRT'].includes(l.handlingUnit))
      assert.equal(typeof l.handlingUnitCount, 'number')
      assert.equal(typeof l.declaredValue, 'number')
      assert.equal(l.declaredValueCurrency, 'USD')
      assert.equal(l.manufacturingCountryCode, 'United States')
      assert.match(l.stccCode, /^\d{7}$/)
      assert.equal(typeof l.lengthValue, 'number')
    }
  }
})
```

In `src/api/mappers/mapOrderViewToFormVm.test.ts`, extend the DTO line fixture (the object near line 40 that feeds `orderLines`) with the new keys and assert recovery — add inside the existing describe:

```ts
  it('recovers the LINX-13893 line fields from the view DTO', () => {
    const vm = mapOrderViewToFormVm({
      orderLines: [{
        lineIdentifier: 1, shipItemIdentifier: '0000000100027', productDescription: 'Caustic',
        grossWeightValue: 100, grossWeightUomCode: 'lb', volumeValue: 10, volumeUomCode: 'cuft',
        shipClass: 'N', hazardous: true, handlingUnit: 'PLT', handlingUnitCount: 24,
        lengthValue: 4, widthValue: 4, heightValue: 5, dimensionUomCode: 'ft',
        harmonizedCode: '3401.20.00.00', declaredValue: 2500, declaredValueCurrency: 'USD',
        manufacturingCountryCode: 'United States', stccCode: '2812345',
      }],
    } as never)
    const p = vm.products[0]
    expect(p.hazardous).toBe(true)
    expect(p.handlingUnit).toBe('PLT')
    expect(p.handlingCount).toBe('24')
    expect(p.length).toEqual({ value: '4', uom: 'ft' })
    expect(p.harmonizedCode).toBe('3401.20.00.00')
    expect(p.declaredValue).toBe('2500')
    expect(p.declaredValueCurrency).toBe('USD')
    expect(p.manufacturingCountry).toBe('United States')
    expect(p.stccCode).toBe('2812345')
  })
```

- [ ] **Step 5: Run tests**

Run: `node --test tools/generate.test.mjs && npx vitest run && npm run typecheck`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add tools/generate.mjs tools/generate.test.mjs src/api/mappers/mapOrderViewToFormVm.ts src/api/mappers/mapOrderViewToFormVm.test.ts
git commit -m "feat(orders): manual_order lines carry full create-form wire fields (ledger row 4)"
```

---

### Task 8: errorCount weighted low (shared helper, both sites)

**Files:**
- Modify: `apps/odyssey-one/tools/generate.mjs:1122`, `:1350` (+ helper near `weightedPick`)
- Modify: `apps/odyssey-one/tools/generate.test.mjs:31` + new test

- [ ] **Step 1: Add the helper** (place right after the `pickN` helper, ~line 214 — before both call sites):

```js
// errorCount weighted LOW (DB ledger row 7 — user flagged too many 12s):
// most orders 1–4 errors, thin tail to 8, rare 9–12. Cap 12 stays under the
// OIF RESOLVE_POOL size (15) so the resolve view can always seed them.
function genErrorCount() {
  return faker.helpers.weightedArrayElement([
    { value: 1, weight: 28 }, { value: 2, weight: 24 }, { value: 3, weight: 18 },
    { value: 4, weight: 12 }, { value: 5, weight: 7 },  { value: 6, weight: 4 },
    { value: 7, weight: 3 },  { value: 8, weight: 2 },
    { value: 9, weight: 0.6 }, { value: 10, weight: 0.5 },
    { value: 11, weight: 0.5 }, { value: 12, weight: 0.4 },
  ])
}
```

- [ ] **Step 2: Use it at both sites**

Line 1122: `orderRow.errorCount = genErrorCount();`
Line 1350: `row.errorCount = genErrorCount();`

- [ ] **Step 3: Test**

Append to `tools/generate.test.mjs` (the existing I10 range assertion at line 31 stays valid):

```js
test('errorCount is weighted low: majority 1–4, hard cap 12 (ledger row 7)', () => {
  const counts = buildDataset().orders.filter((o) => o.errorCount != null).map((o) => o.errorCount)
  assert.ok(counts.length > 0)
  assert.ok(Math.max(...counts) <= 12)
  const low = counts.filter((c) => c <= 4).length
  assert.ok(low / counts.length > 0.7, `low share ${(low / counts.length).toFixed(2)}`)
})
```

- [ ] **Step 4: Run tests**

Run: `node --test tools/generate.test.mjs`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add tools/generate.mjs tools/generate.test.mjs
git commit -m "feat(orders): weighted-low errorCount via shared genErrorCount (ledger row 7)"
```

---

### Task 9: +1000 order rows at seed volume (mock CLI volume unchanged)

**Decision (stated per spec):** raise `unshippedOrders` by +1000 at seed time only, via an explicit override in `seed.mjs`. The CLI/mock build stays at 2200 shipments / 550 unshipped — the browser bundle size is unchanged, and the +1000 exists where the user asked for it: the DB.

**Files:**
- Modify: `apps/odyssey-one/tools/seed.mjs:40-41`

- [ ] **Step 1: Override at seed volume**

```js
export async function seed(client, { totalShipments = 10000 } = {}) {
  // +1000 unshipped rows at seed volume (DB ledger row 8). Mock CLI volume
  // (2200 shipments) deliberately unchanged — bundle size stays flat.
  const ds = buildDataset({ totalShipments, unshippedOrders: Math.round(totalShipments * 0.25) + 1000 })
```

Expected row counts at `totalShipments=10000`: shipped orders ≈ 20,500 (E[orders/shipment] = 2.05), unshipped 2,500 → 3,500, pending 20 → **orders total ≈ 24,000 (+1,000 over today's ≈ 23,000)**.

- [ ] **Step 2: Run tests**

Run: `node --test tools/seed.test.mjs tools/generate.test.mjs`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add tools/seed.mjs
git commit -m "feat(orders): +1000 unshipped order rows at seed volume (ledger row 8)"
```

---

### Task 10: PATCH order-status endpoint (builder + route + client + live wiring)

**Files:**
- Modify: `apps/odyssey-one/api/_lib/orders.mjs` (append)
- Test: `apps/odyssey-one/api/_lib/orders.test.mjs` (append)
- Modify: `apps/odyssey-one/api/_lib/router.mjs:3`, `:6-13`
- Test: `apps/odyssey-one/api/_lib/router.test.mjs` (append)
- Modify: `apps/odyssey-one/src/api/client.ts` (append)
- Modify: `apps/odyssey-one/src/api/services/orderService.ts:1-2`, `:209-230`
- Test: `apps/odyssey-one/src/api/services/orderService.test.ts` (append; extend client mock)

- [ ] **Step 1: Write the failing builder/handler tests** — append to `api/_lib/orders.test.mjs` (extend the import on line 3 with `buildUpdateOrderStatusQuery, updateOrderStatus`):

```js
test('update status: builder by number and by pending id', () => {
  const q = buildUpdateOrderStatusQuery('ORD-123', 'Ready For Plan')
  assert.match(q.text, /UPDATE orders SET order_status = \$1 WHERE order_number = \$2/)
  assert.deepEqual(q.values, ['Ready For Plan', 'ORD-123'])
  const p = buildUpdateOrderStatusQuery('pending-42', 'Cancelled')
  assert.match(p.text, /order_number = '' AND order_id = \$2/)
  assert.deepEqual(p.values, ['Cancelled', 42])
})

test('update status: whitelist, missing key, missing row', async () => {
  await assert.rejects(() => updateOrderStatus({ body: { status: 'Ready For Plan' }, db: null }), (e) => e.status === 400)
  await assert.rejects(() => updateOrderStatus({ body: { orderNumber: 'x', status: 'Shipped; DROP TABLE' }, db: null }), (e) => e.status === 400)
  const dbMiss = { query: async () => ({ rows: [] }) }
  await assert.rejects(() => updateOrderStatus({ body: { orderNumber: 'x', status: 'Cancelled' }, db: dbMiss }), (e) => e.status === 404)
  const dbHit = { query: async () => ({ rows: [{ order_number: 'x' }] }) }
  assert.deepEqual(await updateOrderStatus({ body: { orderNumber: 'x', status: 'Ready For Plan' }, db: dbHit }), { success: true })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test api/_lib/orders.test.mjs`
Expected: FAIL — `buildUpdateOrderStatusQuery` is not exported.

- [ ] **Step 3: Implement** — append to `api/_lib/orders.mjs`:

```js
// ── Status update (DB ledger row 9) ─────────────────────────────────────────
// PATCH /order-service/v3/order/status — the write path behind the three UI
// flows (Draft submit → Ready For Plan, OIF resolve/purge → Ready For Plan,
// cancel → Cancelled). Status values come ONLY from this whitelist.
const ALLOWED_STATUS_UPDATES = ['Ready For Plan', 'Cancelled']

export function buildUpdateOrderStatusQuery(key, status) {
  const pendingId = key.startsWith('pending-') ? key.slice('pending-'.length) : null
  if (pendingId) {
    return {
      text: `UPDATE orders SET order_status = $1 WHERE order_number = '' AND order_id = $2 RETURNING order_id`,
      values: [status, Number(pendingId)],
    }
  }
  return {
    text: `UPDATE orders SET order_status = $1 WHERE order_number = $2 RETURNING order_number`,
    values: [status, key],
  }
}

export async function updateOrderStatus({ body, db }) {
  const key = body?.orderNumber
  const status = body?.status
  if (!key) { const e = new Error('orderNumber required'); e.status = 400; throw e }
  if (!ALLOWED_STATUS_UPDATES.includes(status)) {
    const e = new Error(`status must be one of: ${ALLOWED_STATUS_UPDATES.join(', ')}`); e.status = 400; throw e
  }
  const { rows } = await db.query(buildUpdateOrderStatusQuery(String(key), status))
  if (rows.length === 0) { const e = new Error(`No order: ${key}`); e.status = 404; throw e }
  return { success: true }
}
```

- [ ] **Step 4: Route it** — in `api/_lib/router.mjs`, line 3 import gains `updateOrderStatus`, and ROUTES gains:

```js
  { name: 'updateOrderStatus', method: 'PATCH', path: '/order-service/v3/order/status', handler: updateOrderStatus },
```

Append to `api/_lib/router.test.mjs`:

```js
test('matches PATCH order status route', () => {
  const m = matchRoute('PATCH', '/order-service/v3/order/status')
  assert.equal(m.name, 'updateOrderStatus')
  assert.equal(matchRoute('POST', '/order-service/v3/order/status'), null)
})
```

Run: `node --test api/_lib/orders.test.mjs api/_lib/router.test.mjs` — Expected: PASS.

- [ ] **Step 5: `apiPatch` in the client** — append to `src/api/client.ts`:

```ts
export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const correlationId = newCorrelationId()
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-correlation-id': correlationId,
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new ApiError(`Request failed (${res.status}): ${path}`, res.status, correlationId)
  }
  return (await res.json()) as T
}
```

- [ ] **Step 6: Wire the three live branches** — in `src/api/services/orderService.ts`, change line 2 to `import { apiGet, apiPost, apiPatch } from '../client'`, then replace the three functions (lines 208–230):

```ts
// Shared live write: PATCH /order-service/v3/order/status (DB ledger row 9).
// Pending rows are addressed as 'pending-<orderId>' — the builder resolves them.
async function patchOrderStatus(orderNumber: string, status: string): Promise<void> {
  await apiPatch('/order-service/v3/order/status', { orderNumber, status })
}

/** Draft-tab Submit (LINX-11663): Draft → 'Ready For Plan'; row moves to All. */
export async function submitDraftOrder(orderNumber: string): Promise<void> {
  if (getApiMode() === 'live') return patchOrderStatus(orderNumber, 'Ready For Plan')
  overlayUpdateStatus(orderNumber, 'Ready For Plan')
}

/**
 * OIF resolution (LINX-11137): Save-with-all-resolved and Purge both send the
 * order to the re-processing queue → 'Ready For Plan'. The status flip alone
 * moves the row out of the Validation Errors tab into All.
 */
export async function resolveOrder(orderNumber: string): Promise<void> {
  if (getApiMode() === 'live') return patchOrderStatus(orderNumber, 'Ready For Plan')
  overlayUpdateStatus(orderNumber, 'Ready For Plan')
}

/** Cancel (LINX-10258 soft delete): status → 'Cancelled'. */
export async function cancelOrder(orderNumber: string): Promise<void> {
  if (getApiMode() === 'live') return patchOrderStatus(orderNumber, 'Cancelled')
  overlayUpdateStatus(orderNumber, 'Cancelled')
}
```

- [ ] **Step 7: Service test** — in `src/api/services/orderService.test.ts`, extend the client mock (line 5) to `vi.mock('../client', () => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPatch: vi.fn() }))`, then append:

```ts
describe('live status writes (ledger row 9)', () => {
  it('submit/resolve/cancel PATCH the status endpoint in live mode', async () => {
    const { getApiMode } = await import('../config')
    const { apiPatch } = await import('../client')
    vi.mocked(getApiMode).mockReturnValue('live')
    vi.mocked(apiPatch).mockResolvedValue({ success: true })
    const { submitDraftOrder, resolveOrder, cancelOrder } = await import('./orderService')
    await submitDraftOrder('ORD-1')
    expect(apiPatch).toHaveBeenLastCalledWith('/order-service/v3/order/status', { orderNumber: 'ORD-1', status: 'Ready For Plan' })
    await resolveOrder('ORD-2')
    expect(apiPatch).toHaveBeenLastCalledWith('/order-service/v3/order/status', { orderNumber: 'ORD-2', status: 'Ready For Plan' })
    await cancelOrder('ORD-3')
    expect(apiPatch).toHaveBeenLastCalledWith('/order-service/v3/order/status', { orderNumber: 'ORD-3', status: 'Cancelled' })
    vi.mocked(getApiMode).mockReturnValue('mock')
  })
})
```

- [ ] **Step 8: Run everything**

Run: `node --test api/_lib/orders.test.mjs api/_lib/router.test.mjs api/_lib/shipments.test.mjs && npx vitest run && npm run typecheck`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add api/_lib/orders.mjs api/_lib/orders.test.mjs api/_lib/router.mjs api/_lib/router.test.mjs src/api/client.ts src/api/services/orderService.ts src/api/services/orderService.test.ts
git commit -m "feat(orders): PATCH /order-service/v3/order/status + live wiring for submit/resolve/cancel (ledger row 9)"
```

---

### Task 11: Resolve-refresh seam — real errorCount on direct `?resolve=` URLs

**Files:**
- Modify: `apps/odyssey-one/src/components/orders/create/CreateOrderForm.jsx:13`, `:113-119`
- Test: `apps/odyssey-one/src/components/orders/resolve/resolve.test.jsx` (append)

- [ ] **Step 1: Fallback fetch of the row's errorCount** — line 13 import gains `getOrderList`:

```js
import { getDraft, getOrderList, getOrderView, resolveOrder } from '../../../api/services/orderService'
```

Replace the start of the resolve effect (lines 113–119) with:

```js
  useEffect(() => {
    if (!resolveKey) return
    let cancelled = false
    // errorCount normally rides history state from the grid row. A direct or
    // refreshed ?resolve= URL loses it — fetch the order's own list row (it
    // carries errorCount in mock AND live) instead of fabricating 3; the
    // derive clamps at ≥1 so a truly missing count seeds a single error.
    const errorCountPromise = resolveMeta?.errorCount != null
      ? Promise.resolve(resolveMeta.errorCount)
      : getOrderList({ pagination: { pageNumber: 1, pageSize: 1 }, filters: { orderNumbers: [resolveKey] } })
          .then((res) => res.orders[0]?.errorCount ?? 1)
          .catch(() => 1)
    Promise.all([getOrderView(resolveKey), errorCountPromise]).then(([values, errorCount]) => {
      if (cancelled || !values) return
      const { errors, applyErrors, isResolved } = deriveValidationErrors(resolveKey, errorCount, values)
```

(The rest of the effect body — `applyErrors` onward through the cleanup return — is unchanged.)

- [ ] **Step 2: Test** — append to `src/components/orders/resolve/resolve.test.jsx` (uses the existing `renderResolve` helper; passing `undefined` state simulates a direct URL — history state lost):

```jsx
describe('resolve mode — direct URL (no history state)', () => {
  test('falls back to the row errorCount instead of 3 (S99 seam closure)', async () => {
    renderResolve(ORDER, undefined)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Order Validation Error Resolution' })).toBeTruthy())
    // The seeded row's own errorCount drives the alert list length — assert the
    // alert enumerates exactly that many errors (read errorCount from the data).
    const { getAllOrders } = await import('../../../data/orders')
    const row = getAllOrders().find((o) => o.orderNumber === ORDER)
    await waitFor(() => {
      const alert = document.querySelector('.co-resolve-alert')
      expect(alert).toBeTruthy()
      expect(alert.textContent).toContain(`${row.errorCount}`)
    })
  })
})
```

(If the Alert renders counts differently, match on the number of list items instead — `within(alert).getAllByRole('listitem')` length === `row.errorCount`; keep whichever assertion holds against the real Alert markup.)

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/components/orders/resolve/resolve.test.jsx`
Expected: PASS (existing resolve tests too — they pass state, so the fast path is unchanged).

- [ ] **Step 4: Commit**

```bash
git add src/components/orders/create/CreateOrderForm.jsx src/components/orders/resolve/resolve.test.jsx
git commit -m "fix(orders): resolve mode fetches real errorCount on direct ?resolve= URLs (ledger row 7 tail)"
```

---

### Task 12: Regenerate mock JSON, reconcile dataset-pinned tests, full verification

**Files:**
- Regenerated: `src/data/shipments.json`, `src/data/orders.json`, `src/data/order-details.json`, `public/details/*.json`
- Possibly modify: `src/components/orders/resolve/resolve.test.jsx:17` (`ORDER` constant), `:60`, `:114` comments

- [ ] **Step 1: Regenerate**

Run: `node tools/generate.mjs`
Expected: `Done! Generated 2200 shipments.` + `orders.json: ~5150 rows` (≈4510 shipped + 550 unshipped + 20 pending — exact number is deterministic; note it).

- [ ] **Step 2: Full suites**

Run: `npx vitest run && node --test tools/generate.test.mjs tools/seed.test.mjs && node --test api/_lib/orders.test.mjs api/_lib/router.test.mjs api/_lib/shipments.test.mjs && npm run typecheck`
Expected: the ONLY plausible failures are `resolve.test.jsx` (its `ORDER = 'VAL100000'` pins the pre-regen dataset) — everything else must pass.

- [ ] **Step 3: If resolve.test fails, re-pin the order deterministically**

Find a replacement Shipment-Failed row whose derived errors (at the test's `errorCount: 5`) include `general.equipment` and a `consignor.postal` path (the paths the test drives):

```bash
node --input-type=module -e "
import { deriveValidationErrors } from './src/components/orders/resolve/validationErrors.js'
import { readFileSync } from 'fs'
const orders = JSON.parse(readFileSync('./src/data/orders.json','utf8'))
const stub = { general: {}, pickupDelivery: { consignor: {}, consignee: {} } }
for (const o of orders) {
  if (o.orderStatus !== 'Shipment Failed') continue
  const { errors } = deriveValidationErrors(o.orderNumber, 5, stub)
  const paths = errors.map(e => e.path)
  if (paths.includes('general.equipment') && paths.includes('pickupDelivery.consignor.postal')) {
    console.log(o.orderNumber, JSON.stringify(paths)); break
  }
}"
```

Update `resolve.test.jsx:17` `const ORDER = '<new number>'` and the two comments (lines ~60 and ~114) naming the seeded paths. Re-run `npx vitest run src/components/orders/resolve/resolve.test.jsx` — Expected: PASS.

- [ ] **Step 4: Build**

Run: `npm run build` (from `apps/odyssey-one`; prebuild regenerates + runs domain-usage)
Expected: clean Vite build, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/data public/details src/components/orders/resolve/resolve.test.jsx
git commit -m "chore(orders): regenerate mock dataset with reseed-motion vocabularies"
```

---

### Task 13: ⛔ GATE — Neon reseed (REQUIRES EXPLICIT USER PERMISSION)

**⛔ STOP. Do not run anything in this task until the user explicitly green-lights the reseed at execution time. This is a hard rule — the reset drops the entire public schema.**

- [ ] **Step 1: Ask the user for permission to reseed Neon.** Quote the exact commands below and wait for an explicit yes.

- [ ] **Step 2 (after explicit permission): run the ritual** (verified against `tools/seed.mjs:1-3` and `packages/db/migrate.mjs` header; both need `DATABASE_URL` from the app's `.env.local`):

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one
node --env-file=.env.local ../../packages/db/migrate.mjs --reset --yes
node --env-file=.env.local tools/seed.mjs
```

Expected: `applied 001_schema.sql`, `applied 002_orders_grid_fields.sql`, then a `seed: …` timing line and a counts object with `shipments: 10000`, `orders: ≈24000` (20,4xx shipped + 3,500 unshipped + 20 pending), plus stops/tenders/events counts.

- [ ] **Step 3: Spot-verify** with `node --env-file=.env.local -e` one-liners (read-only):

```bash
node --env-file=.env.local --input-type=module -e "
import pg from 'pg'
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await c.connect()
console.log((await c.query('SELECT count(*)::int AS orders, count(*) FILTER (WHERE freight_terms = ANY(\$1))::int AS coded FROM orders', [['P','C','A','T','N']])).rows[0])
console.log((await c.query('SELECT count(*)::int FROM customers')).rows[0])          // expect 69 (26 + 43)
console.log((await c.query('SELECT max(error_count)::int AS max, avg(error_count)::numeric(4,2) AS avg FROM orders WHERE error_count IS NOT NULL')).rows[0]) // max ≤ 12, avg ≈ 3
await c.end()"
```

Expected: `coded === orders`, 69 customers, max ≤ 12 with a low average.

---

### Task 14: ⛔ GATE — Production deploy + post-deploy verification (REQUIRES EXPLICIT PER-DEPLOY PERMISSION)

**⛔ STOP. Ask the user for explicit permission for THIS deploy before running. The API change (PATCH route), the reseed, and the deploy ride together (S93 lesson) — deploying without the reseed (or vice versa) leaves live mode broken.**

- [ ] **Step 1: Ask the user for deploy permission.** Wait for an explicit yes.

- [ ] **Step 2 (after explicit permission): deploy from the repo root**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
npx vercel --prod
```

Expected: successful production deployment URL.

- [ ] **Step 3: Post-deploy verification (live mode in the deployed app)**
  - Orders grid: Freight Terms / Ship Direction columns show **labels** (Pre-Paid / Outbound…) while the network response rows carry codes (`P`/`O`) — inspect the `/order-service/v3/order/list` response.
  - Equipment column shows the 11-code catalog (no FLT/VAN/REEFER).
  - Validation Errors tab: error counts read low (mostly 1–4, no wall of 12s).
  - Open a Validation-Errors row → Resolve → Purge → confirm: the PATCH fires (network tab: `PATCH /api/order-service/v3/order/status` → 200 `{success:true}`) and the row leaves the tab.
  - Open a `?resolve=` URL directly (paste in a fresh tab): the alert shows the row's real errorCount, not 3.
  - View an enriched order: Product Information shows handling unit labels, dims, declared value, STCC (from the new `manual_order` line fields).

---

### Task 15: Ledger + decision-log traceability

**Files:**
- Modify: `vault/10-domains/orders/db-update-ledger.md`
- Modify: `vault/10-domains/orders/decisions/decision-log.md`

- [ ] **Step 1: Mark ledger rows shipped.** In `db-update-ledger.md`, append a `Shipped` note to each of rows 1–9's Detail cell (or add a `Status` line under the table): `SHIPPED <date> — orders-reseed motion (plan 2026-07-29-orders-reseed-motion)`, and change the front-matter `status: active` to `status: shipped`. Keep the "Related open questions" block — those stay open.

- [ ] **Step 2: Decision-log entry.** Append to `vault/10-domains/orders/decisions/decision-log.md` (match the file's existing entry format — date, decision, rationale):

```markdown
## 2026-07-29 — Orders reseed motion shipped (DB ledger rows 1–9)
- Wire codes everywhere: freight terms {P,C,N,T,A}, ship direction {O,I}, ship-class types {H,C,P,N}, handling units {PLT,BOX,DRM,BUL,CRT}; UI maps code→label at the mapper seams (mapOrderListRow / mapSellShipmentOutToDetail / mapFormVmToOrderPane); form option values are the codes end-to-end.
- data-pools.mjs is the single source for all shared catalogs; master-data.js re-exports (no lockstep comments needed — same module both runtimes).
- EXTRA_ORGS (43) promoted to real customers; original 25 stay dominant (~92% weighted ownership).
- Product IDs are 13-digit external ids (18-digit legacy minus 5 leading zeros), single-sourced (productExternalId).
- manual_order lines carry the full create-form wire fields; reopened views read real data.
- errorCount weighted low (shared genErrorCount, cap 12 < RESOLVE_POOL 15); resolve-refresh seam closed via list-row fallback fetch.
- +1000 unshipped rows at seed volume only (mock CLI volume unchanged); Neon reseeded (~24k orders) + prod deployed with the new PATCH /order-service/v3/order/status endpoint (user-gated).
```

- [ ] **Step 3: Commit**

```bash
git add vault/10-domains/orders/db-update-ledger.md vault/10-domains/orders/decisions/decision-log.md
git commit -m "docs(orders): mark DB-update ledger rows 1-9 shipped + decision-log entry"
```

---

## Self-review against the spec

1. Equipment vocab swap + `ORDER_EQUIPMENT_CODES` deletion + single source → Task 1 (single source chosen: data-pools, since master-data already imports it in the browser bundle — no lockstep duplication needed). 2. Wire codes + full render-seam scope (grid, shipment detail, summary/confirmation, form defaults, Q20, resolve derivation untouched by design — it blanks/corrupts values regardless of vocabulary) → Tasks 2–3. 3. EXTRA_ORGS promotion + seeding + explicit dominance weighting (92/8) → Task 4. 4. Enrichment lines with the exact `ManualOrderLine` PROVISIONAL keys + reverse-mapper recovery → Task 7. 5. 13-digit IDs, lookup + pool single-sourced → Task 5. 6. Handling-unit codes; shipClass TYPE codes vs NMFC VALUE catalog explicitly assigned → Task 6. 7. Weighted errorCount, one shared helper, both sites, cap ≤ 12 → Task 8. 8. +1000 via seed-time `unshippedOrders` override, mock volume explicitly unchanged, expected counts stated → Task 9. 9. PATCH endpoint with tested pure builder + whitelist + three live wirings + node/service tests → Task 10. 10. Resolve-refresh fallback via `getOrderList` (works mock AND live; `getOrderView` returns a form VM without errorCount, so the list row is the correct carrier) + test → Task 11. Gates are marked ⛔ with explicit stop-and-ask steps (Tasks 13–14); ledger/decision-log discipline → Task 15; determinism/test-churn constraint handled in Task 12 (only known dataset-pinned test is `resolve.test.jsx`, with a deterministic re-pin recipe). No git push / Angular / Figma work included.

---

### Critical Files for Implementation
- /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one/tools/data-pools.mjs
- /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one/tools/generate.mjs
- /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one/src/data/master-data.js
- /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one/api/_lib/orders.mjs
- /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one/src/api/services/orderService.ts
