# Shipment Details Modal — Section-Level Edit Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Shipment Details modal per-section edit mode — an Edit → Save Changes button on each section header, editable General Information and Order Reference fields backed by a real shipment-override endpoint, and a Cost section that navigates in-place to the Edit Quote form.

**Architecture:** One `editing` state object at the modal level enforces "only one section at a time" structurally (a single `section` key cannot hold two values). Shipment-stage edits persist to a new additive `shipments.overrides` JSONB column via `PATCH .../overrides`; Equipment is the exception — it lives on the routing option and keeps routing through the existing `saveTenderOption` write, so General Information's save is a deliberate two-call split. The Cost section does not edit in place: it swaps the modal's own body for `QuoteModal`'s, which requires QuoteModal to gain an embedded (portal-less, shell-less) mode and `ModalMedium` to gain a `leading` header slot.

**Tech Stack:** React 18 + Vite, Vitest + Testing Library (jsdom), Postgres (Neon) via `packages/db`, `@odyssey/ui` component library, `@odyssey/tokens`.

---

## Scope note — what this plan does NOT do

- **Stops editing.** Task 9 renders a permanently disabled Edit button as a placeholder only. No Stops draft state, no Stops save path.
- **Grid consistency.** After a Mode or Gross Weight override, the shipments *list* still shows the pre-edit value. Task 12 fixes this and is deliberately last so it can be dropped without affecting anything above it.
- **Reference type reconciliation.** `referencesFor()` renders `Pro/Booking Number` and `Confirmation Number`, which are absent from `REFERENCE_TYPES` (`master-data.js:39`). Task 7 preserves them as read-only rows rather than silently dropping them; making the two lists agree is a question for Jana, logged in Task 13.

---

## File Structure

**Created:**
| File | Responsibility |
|---|---|
| `packages/db/migrations/008_shipment_overrides.sql` | Additive `overrides jsonb` column on `shipments` |
| `apps/odyssey-one/src/components/detail/DiscardChangesModal.jsx` | The "discard or save" confirmation that sits above the details modal |
| `apps/odyssey-one/src/components/detail/DiscardChangesModal.test.jsx` | Its tests |
| `apps/odyssey-one/src/components/detail/sectionDraft.js` | Pure draft/dirty helpers — no React, so they test without a DOM |
| `apps/odyssey-one/src/components/detail/sectionDraft.test.js` | Its tests |

**Modified:**
| File | Change |
|---|---|
| `apps/odyssey-one/api/_lib/shipments.mjs` | `buildOverridesQuery`, `saveShipmentOverrides`, merge overrides into `sellShipmentDetail` |
| `apps/odyssey-one/api/_lib/router.mjs` | Register the PATCH route |
| `apps/odyssey-one/src/api/services/shipmentService.ts` | `saveShipmentOverrides` client call |
| `apps/odyssey-one/src/api/types/sellShipmentOut.ts` | `ShipmentOverridesDTO` + `overrides?` on `SellShipmentOut` |
| `apps/odyssey-one/src/api/types/shipmentDetail.ts` | `overrides` on `ShipmentDetailVM` |
| `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts` | Honor overrides for grossWeight/volume; pass `overrides` through |
| `apps/odyssey-one/src/components/detail/ShipmentDetailsModal.jsx` | Edit-mode state machine, editable sections, Cost navigation |
| `apps/odyssey-one/src/components/detail/QuoteModal.jsx` | `embedded` mode |
| `apps/odyssey-one/src/components/orders/create/RepeatableRows.jsx` | Self-import its own CSS |
| `apps/odyssey-one/src/styles/components.css` | `.shp-details__section-head` and friends |
| `apps/odyssey-one/tools/data-pools.mjs` | Export `MODES` |
| `apps/odyssey-one/tools/generate.mjs` | Import `MODES` instead of defining it |
| `packages/ui/src/ModalMedium.jsx` | `leading` header slot (Figma-gated — Task 10) |

---

## Phase 1 — Persistence (Tasks 1–3)

### Task 1: Shipment overrides column

**Files:**
- Create: `packages/db/migrations/008_shipment_overrides.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 008_shipment_overrides.sql — shipment-STAGE field edits (Shipment Details
-- modal, 2026-08-11). Additive: a nullable column with no default, so no
-- backfill, no reseed, no data loss. Existing rows read NULL and behave
-- exactly as before.
--
-- Shape (all keys optional):
--   { "mode": "TL",
--     "grossWeight": "44,470 LB",
--     "volume": "200 cuft",
--     "references": { "<orderNumber>": [ { "id": "...", "type": "PO Number", "value": "PO-5512" } ] } }
--
-- Deliberately NOT here: `equipment`. Equipment belongs to the routing option
-- and persists through the existing tenders write (PUT .../tender), so putting
-- it here too would create two sources for one value.
--
-- References are shipment-stage ONLY (user, 2026-08-11): editing a PO Number
-- here must never write back to the order. That is why they live on the
-- shipment row and not in `orders`.
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS overrides jsonb;
```

- [ ] **Step 2: Apply it and verify the column exists**

Run:
```bash
cd packages/db && node -e "
import('./src/client.mjs').then(async ({ query }) => {
  const { rows } = await query(\"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='shipments' AND column_name='overrides'\")
  console.log(rows)
  process.exit(rows.length === 1 ? 0 : 1)
})"
```
Expected: `[ { column_name: 'overrides', data_type: 'jsonb' } ]`, exit 0.

> **STOP — user gate.** Applying a migration touches the live Neon database. Even though this one is additive and non-destructive, do not run it without explicit permission for *this* migration.

- [ ] **Step 3: Commit**

```bash
rtk git add packages/db/migrations/008_shipment_overrides.sql
rtk git commit -m "feat(db): additive shipments.overrides jsonb for shipment-stage field edits"
```

---

### Task 2: Override read + write in the API

**Files:**
- Modify: `apps/odyssey-one/api/_lib/shipments.mjs:205-227`
- Modify: `apps/odyssey-one/api/_lib/router.mjs:9-31`
- Test: `apps/odyssey-one/api/_lib/shipments.test.mjs`

- [ ] **Step 1: Write the failing tests**

Append to `apps/odyssey-one/api/_lib/shipments.test.mjs`:

```js
import { buildOverridesQuery, saveShipmentOverrides, sellShipmentDetail } from './shipments.mjs'

describe('shipment overrides', () => {
  it('buildOverridesQuery writes the whole object as one jsonb value', () => {
    const q = buildOverridesQuery('25068206', { mode: 'TL' })
    assert.match(q.text, /UPDATE shipments SET overrides = \$1/)
    assert.equal(q.values[0], JSON.stringify({ mode: 'TL' }))
    assert.equal(q.values[1], '25068206')
  })

  it('saveShipmentOverrides rejects a non-object body with 400', async () => {
    await assert.rejects(
      () => saveShipmentOverrides({ params: ['25068206'], body: { overrides: 'nope' }, db: fakeDb() }),
      (e) => e.status === 400,
    )
  })

  it('saveShipmentOverrides 404s when the shipment does not exist', async () => {
    const db = fakeDb({ rowCount: 0 })
    await assert.rejects(
      () => saveShipmentOverrides({ params: ['nope'], body: { overrides: {} }, db }),
      (e) => e.status === 404,
    )
  })

  it('sellShipmentDetail attaches overrides to the returned detail blob', async () => {
    const db = fakeDb({
      detailRow: { detail: { sellShipment: '25068206' }, overrides: { mode: 'TL' } },
    })
    const detail = await sellShipmentDetail({ params: ['25068206'], db })
    assert.deepEqual(detail.overrides, { mode: 'TL' })
  })

  it('sellShipmentDetail omits overrides entirely when the column is NULL', async () => {
    const db = fakeDb({ detailRow: { detail: { sellShipment: '25068206' }, overrides: null } })
    const detail = await sellShipmentDetail({ params: ['25068206'], db })
    assert.equal('overrides' in detail, false)
  })
})
```

If `fakeDb` does not already exist in that file, add it above the describe block:

```js
// Minimal db double: first query answers the detail SELECT, the rest answer
// with whatever `rowCount`/`rows` the caller configured.
function fakeDb({ detailRow = { detail: {}, overrides: null }, rowCount = 1 } = {}) {
  let call = 0
  return {
    query: async () => {
      call += 1
      if (call === 1) return { rows: [detailRow], rowCount: 1 }
      return { rows: [], rowCount }
    },
  }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/odyssey-one && rtk npx node --test api/_lib/shipments.test.mjs`
Expected: FAIL — `buildOverridesQuery is not a function`.

- [ ] **Step 3: Implement**

In `apps/odyssey-one/api/_lib/shipments.mjs`, change `buildDetailQuery` to select the new column. Find it (just above `buildTendersQuery` at :205) and make it read:

```js
export function buildDetailQuery(sellShipment) {
  return {
    text: 'SELECT detail, overrides FROM shipments WHERE sell_shipment = $1',
    values: [sellShipment],
  }
}
```

Then replace `sellShipmentDetail` (`:212-227`) with:

```js
export async function sellShipmentDetail({ params, db }) {
  const { rows } = await db.query(buildDetailQuery(params[0]))
  if (rows.length === 0) {
    const e = new Error(`No shipment: ${params[0]}`)
    e.status = 404
    throw e
  }
  const detail = rows[0].detail
  const { rows: tenders } = await db.query(buildTendersQuery(params[0]))
  // No tender rows = pre-seed shipment; fall back to the blob rather than
  // blanking the Tender tab. Rows without an option payload are ignored.
  const options = tenders.map(t => t.option).filter(Boolean)
  if (options.length > 0) detail.shippingOptionList = options
  // Shipment-stage field edits (2026-08-11). Attached rather than merged into
  // the blob: the mapper decides field by field which wins, and a consumer
  // that never asks for overrides keeps reading the untouched seeded values.
  // Absent column stays ABSENT — an `overrides: null` key would make every
  // `?? ` fallback in the mapper read as "explicitly cleared".
  if (rows[0].overrides) detail.overrides = rows[0].overrides
  return detail
}

// PATCH /shipment-service/v1/sell-shipment-out/:id/overrides — shipment-STAGE
// field edits from the Shipment Details modal. Whole-object replace, not a
// deep merge: the modal always sends the complete override set it is holding,
// so a merge would make it impossible to CLEAR a field.
export function buildOverridesQuery(sellShipment, overrides) {
  return {
    text: 'UPDATE shipments SET overrides = $1 WHERE sell_shipment = $2 RETURNING sell_shipment',
    values: [JSON.stringify(overrides), sellShipment],
  }
}

export async function saveShipmentOverrides({ params, body, db }) {
  const overrides = body?.overrides
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    const e = new Error('overrides object required'); e.status = 400; throw e
  }
  const { rowCount } = await db.query(buildOverridesQuery(params[0], overrides))
  if (rowCount === 0) {
    const e = new Error(`No shipment: ${params[0]}`); e.status = 404; throw e
  }
  return { success: true }
}
```

In `apps/odyssey-one/api/_lib/router.mjs`, add `saveShipmentOverrides` to the import on line 2:

```js
import { categoryCounts, shipmentErrorList, sellShipmentDetail, saveTender, saveShipmentOverrides } from './shipments.mjs'
```

and add the route immediately after the `saveTender` entry:

```js
  { name: 'saveShipmentOverrides', method: 'PATCH', pattern: /^\/shipment-service\/v1\/sell-shipment-out\/(\d+)\/overrides$/, handler: saveShipmentOverrides },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/odyssey-one && rtk npx node --test api/_lib/shipments.test.mjs`
Expected: PASS, all 5 new tests green.

- [ ] **Step 5: Mutation-check the 404 branch**

Temporarily change `if (rowCount === 0)` to `if (false)` and re-run. Expected: the "404s when the shipment does not exist" test FAILS. Revert the change and confirm green again. This proves the test is load-bearing.

- [ ] **Step 6: Commit**

```bash
rtk git add apps/odyssey-one/api/_lib/shipments.mjs apps/odyssey-one/api/_lib/router.mjs apps/odyssey-one/api/_lib/shipments.test.mjs
rtk git commit -m "feat(api): PATCH sell-shipment-out/:id/overrides + read-through on detail"
```

---

### Task 3: Types, mapper, and client service

**Files:**
- Modify: `apps/odyssey-one/src/api/types/sellShipmentOut.ts`
- Modify: `apps/odyssey-one/src/api/types/shipmentDetail.ts:270-286`
- Modify: `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts:185-200`
- Modify: `apps/odyssey-one/src/api/services/shipmentService.ts`
- Test: `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.test.ts`:

```ts
describe('shipment overrides', () => {
  it('grossWeight and volume prefer the override over the derived value', () => {
    const dto = { ...baseDto, totalVolumeValue: 200, totalVolumeUomCode: 'cuft',
      overrides: { grossWeight: '99,999 LB', volume: '5 m³' } } as any
    const vm = mapSellShipmentOutToDetail(dto)
    expect(vm.stopsData.summary.grossWeight).toBe('99,999 LB')
    expect(vm.stopsData.summary.volume).toBe('5 m³')
  })

  it('falls back to the derived value when the override key is absent', () => {
    const dto = { ...baseDto, totalVolumeValue: 200, totalVolumeUomCode: 'cuft',
      overrides: { mode: 'TL' } } as any
    const vm = mapSellShipmentOutToDetail(dto)
    expect(vm.stopsData.summary.volume).toBe('200 cuft')
  })

  it('passes the whole overrides object through to the VM', () => {
    const dto = { ...baseDto, overrides: { mode: 'TL', references: { L1: [] } } } as any
    expect(mapSellShipmentOutToDetail(dto).overrides).toEqual({ mode: 'TL', references: { L1: [] } })
  })

  it('overrides is undefined when the DTO carries none', () => {
    expect(mapSellShipmentOutToDetail(baseDto as any).overrides).toBeUndefined()
  })
})
```

If `baseDto` does not exist in that file, reuse whatever minimal DTO fixture the existing tests already build and rename accordingly.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/odyssey-one && rtk npx vitest run src/api/mappers/mapSellShipmentOutToDetail.test.ts`
Expected: FAIL — `vm.overrides` is `undefined` in the third test, and grossWeight reads the derived value in the first.

- [ ] **Step 3: Add the types**

In `apps/odyssey-one/src/api/types/sellShipmentOut.ts`, add near the other interfaces:

```ts
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
```

and add to the `SellShipmentOut` interface:

```ts
  overrides?: ShipmentOverridesDTO
```

In `apps/odyssey-one/src/api/types/shipmentDetail.ts`, import the type and add to `ShipmentDetailVM` (after `historyData` at :285):

```ts
  /** Shipment-stage field edits, passed through untouched. Absent = none. */
  overrides?: ShipmentOverridesDTO
```

- [ ] **Step 4: Implement the mapper changes**

In `mapSellShipmentOutToDetail.ts`, change `mapStops`'s signature and the two summary lines (`:185-197`):

```ts
function mapStops(dto: SellShipmentOut): ShipmentDetailVM['stopsData'] {
  const totalWeight = sumOrderWeights(dto)
  // Shipment-stage overrides win over the derived value (2026-08-11). Both are
  // already display strings, so there is nothing to re-format — the modal
  // stores exactly what it rendered.
  const ov = dto.overrides
  const summary: StopsSummaryVM = {
    distance: fmtDistance(currentTenderOption(dto.shippingOptionList)?.distanceMiles),
    grossWeight: ov?.grossWeight ?? (totalWeight != null ? `${fmtInt(totalWeight)} LB` : DASH),
    volume: ov?.volume ?? (dto.totalVolumeValue != null
      ? `${dto.totalVolumeValue} ${dto.totalVolumeUomCode ?? 'cuft'}`
      : DASH),
```

Leave the rest of `summary` untouched.

Then, in the top-level `mapSellShipmentOutToDetail` return object, add as the last property:

```ts
    overrides: dto.overrides,
```

- [ ] **Step 5: Add the client call**

In `apps/odyssey-one/src/api/services/shipmentService.ts`, add `apiPatch` to the import if it exists in `../client`; if the client exposes no PATCH helper, add one there following `apiPut`'s exact shape. Then append:

```ts
/**
 * Persist shipment-STAGE field edits (Mode, Gross Weight, Volume, and
 * per-order reference rows) from the Shipment Details modal. Whole-object
 * replace — send the complete override set, not a delta.
 *
 * Equipment is deliberately NOT handled here: it belongs to the routing option
 * and goes through saveTenderOption, so General Information's save makes two
 * calls on purpose.
 *
 * Live writes; mock is a no-op, same contract as saveTenderOption.
 */
export async function saveShipmentOverrides(
  sellShipment: string,
  overrides: Record<string, unknown>,
): Promise<void> {
  if (getApiMode() !== 'live') return
  await apiPatch(`/shipment-service/v1/sell-shipment-out/${sellShipment}/overrides`, { overrides })
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd apps/odyssey-one && rtk npx vitest run src/api/mappers/mapSellShipmentOutToDetail.test.ts`
Expected: PASS, 4 new tests green.

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one && rtk npx tsc --noEmit -p apps/odyssey-one`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
rtk git add apps/odyssey-one/src/api
rtk git commit -m "feat(api): ShipmentOverridesDTO through mapper + saveShipmentOverrides client"
```

---

## Phase 2 — Edit-mode mechanics (Tasks 4–5)

### Task 4: Draft/dirty helpers

**Files:**
- Create: `apps/odyssey-one/src/components/detail/sectionDraft.js`
- Test: `apps/odyssey-one/src/components/detail/sectionDraft.test.js`

Pure functions, no React — the dirty rule is the one piece of logic here that can silently rot, so it gets a test that runs without a DOM.

- [ ] **Step 1: Write the failing tests**

```js
import { describe, expect, it } from 'vitest'
import { isDirty, startEdit } from './sectionDraft'

describe('startEdit', () => {
  it('captures draft and baseline as separate objects', () => {
    const edit = startEdit('general', { mode: 'LTL' })
    expect(edit.section).toBe('general')
    expect(edit.draft).toEqual({ mode: 'LTL' })
    expect(edit.baseline).toEqual({ mode: 'LTL' })
    // Mutating the draft must not reach the baseline, or dirty is always false.
    edit.draft.mode = 'TL'
    expect(edit.baseline.mode).toBe('LTL')
  })
})

describe('isDirty', () => {
  it('is false for an untouched draft', () => {
    expect(isDirty(startEdit('general', { mode: 'LTL', volume: '200 cuft' }))).toBe(false)
  })

  it('is true once any value differs', () => {
    const edit = startEdit('general', { mode: 'LTL' })
    expect(isDirty({ ...edit, draft: { mode: 'TL' } })).toBe(true)
  })

  it('is false when a value is edited and then edited back', () => {
    const edit = startEdit('general', { mode: 'LTL' })
    expect(isDirty({ ...edit, draft: { mode: 'TL' } })).toBe(true)
    expect(isDirty({ ...edit, draft: { mode: 'LTL' } })).toBe(false)
  })

  it('is true when a reference row is added', () => {
    const edit = startEdit('references', { L1: [{ id: 'a', type: 'PO Number', value: 'x' }] })
    expect(isDirty({ ...edit, draft: { L1: [{ id: 'a', type: 'PO Number', value: 'x' }, { id: 'b', type: '', value: '' }] } })).toBe(true)
  })

  it('is false for a null edit', () => {
    expect(isDirty(null)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/odyssey-one && rtk npx vitest run src/components/detail/sectionDraft.test.js`
Expected: FAIL — cannot resolve `./sectionDraft`.

- [ ] **Step 3: Implement**

```js
// Draft/dirty helpers for the Shipment Details modal's section edit mode
// (2026-08-11). Pure so the dirty rule is testable without a DOM — it gates
// the Save Changes button AND the discard prompt, so a silent regression here
// would either strand the user or lose their work.

// ponytail: structural clone via JSON. These drafts are flat objects of
// strings and small arrays of {id,type,value} — no Dates, no undefined, no
// cycles. structuredClone if a draft ever holds something JSON can't carry.
const clone = (o) => JSON.parse(JSON.stringify(o))

/** Open a section for editing. Draft and baseline are independent copies. */
export function startEdit(section, initial) {
  return { section, draft: clone(initial), baseline: clone(initial) }
}

/**
 * Has anything actually changed? Key ORDER is irrelevant for the object-shaped
 * General Information draft but IS meaningful for reference arrays (the user
 * can reorder rows), and JSON.stringify honours both correctly: objects are
 * built from the same literal so their key order matches, arrays compare
 * positionally.
 */
export function isDirty(edit) {
  if (!edit) return false
  return JSON.stringify(edit.draft) !== JSON.stringify(edit.baseline)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/odyssey-one && rtk npx vitest run src/components/detail/sectionDraft.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 5: Mutation-check**

Change `isDirty` to `return true`. Re-run. Expected: the "untouched draft" and "edited back" tests FAIL. Revert, confirm green.

- [ ] **Step 6: Commit**

```bash
rtk git add apps/odyssey-one/src/components/detail/sectionDraft.js apps/odyssey-one/src/components/detail/sectionDraft.test.js
rtk git commit -m "feat(shipments): pure draft/dirty helpers for section edit mode"
```

---

### Task 5: Section header edit affordance

**Files:**
- Modify: `apps/odyssey-one/src/components/detail/ShipmentDetailsModal.jsx:81-96` (the `Section` component)
- Modify: `apps/odyssey-one/src/styles/components.css:3582` (after `.shp-details__section-title`)
- Test: `apps/odyssey-one/src/components/detail/ShipmentDetailsModal.test.jsx`

- [ ] **Step 1: Write the failing tests**

Append to `ShipmentDetailsModal.test.jsx`:

```jsx
// Helper — the existing tests render with MemoryRouter; reuse that shape.
const renderModal = (props = {}) => render(
  <MemoryRouter>
    <ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} {...props} />
  </MemoryRouter>,
)

describe('section edit affordance', () => {
  it('every editable section header carries an Edit button', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Edit General Information' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit Cost' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit Customer Reference Values' })).toBeTruthy()
  })

  it('Stops renders its Edit button disabled', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Edit Stops' }).disabled).toBe(true)
  })

  it('clicking Edit swaps the button to a disabled Save Changes', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    const save = screen.getByRole('button', { name: 'Save Changes' })
    expect(save.disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Edit General Information' })).toBeNull()
  })

  it('editing exposes a cancel X on the section header', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    expect(screen.getByRole('button', { name: 'Cancel editing General Information' })).toBeTruthy()
  })

  it('only one section can be in edit mode — opening a second closes the first', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Reference Values' }))
    // General Information is back to its Edit face; only one Save Changes exists.
    expect(screen.getByRole('button', { name: 'Edit General Information' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Save Changes' }).length).toBe(1)
  })

  it('there is no pen icon anywhere', () => {
    const { container } = renderModal()
    expect(container.querySelector('.shp-details__field-action')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/odyssey-one && rtk npx vitest run src/components/detail/ShipmentDetailsModal.test.jsx -t "section edit affordance"`
Expected: FAIL — no `Edit General Information` button exists.

- [ ] **Step 3: Rewrite `Section` and delete the pen**

Replace the `Section` component (`:81-96`) with:

```jsx
// Section header = title + its edit control. `editable` opts a section in;
// `editing` flips the control from a secondary Edit to a PRIMARY Save Changes
// (user, 2026-08-11: the save face is the promoted one) plus a cancel X.
// Save Changes stays disabled until something actually changed, so the button
// itself communicates whether there is anything to lose.
function Section({
  title, fields, renderField, children,
  editable = false, editing = false, dirty = false, editDisabled = false,
  onEdit, onSave, onCancel,
}) {
  return (
    <section className="shp-details__section">
      <div className="shp-details__section-head">
        <h3 className="text-label-base-semibold shp-details__section-title">{title}</h3>
        {editable && (
          <div className="shp-details__section-actions">
            {editing ? (
              <>
                <Button variant="primary" size="sm" disabled={!dirty} onClick={onSave}>
                  Save Changes
                </Button>
                <button
                  type="button"
                  className="icon-action"
                  aria-label={`Cancel editing ${title}`}
                  onClick={onCancel}
                >
                  <X {...ICON_LG} />
                </button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                disabled={editDisabled}
                aria-label={`Edit ${title}`}
                onClick={onEdit}
              >
                Edit
              </Button>
            )}
          </div>
        )}
      </div>
      {fields ? (
        <div className="shp-details__grid">
          {fields.map(([label, value]) =>
            renderField
              ? renderField(label, value)
              : <TitleSubtitle key={label} subtitle={label} title={value || DASH} />,
          )}
        </div>
      ) : children}
    </section>
  )
}
```

Change the icon import on line 4 from `Pencil` to `X`:

```jsx
import { X } from 'lucide-react'
```

Delete the `EditableField` component (`:51-68`) and the `EDITABLE_FIELDS` export (`:28-32`) along with their comment blocks — the pen is gone entirely (user, 2026-08-11) and nothing else imports them. Verify:

Run: `rtk grep -rn "EDITABLE_FIELDS\|EditableField" apps/ packages/`
Expected: no matches outside the deleted lines. If the test file references `EDITABLE_FIELDS`, delete those assertions too — they test a removed affordance.

- [ ] **Step 4: Add the styles**

In `apps/odyssey-one/src/styles/components.css`, immediately after the `.shp-details__section-title` rule (`:3582-3586`), add:

```css
/* Section header row — title leading, edit control trailing (2026-08-11).
   The title keeps its own margin-bottom so section spacing is unchanged when
   a section has no edit control at all. */
.shp-details__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
}

.shp-details__section-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  /* Matches the title's own margin so the control sits on the title baseline
     rather than dragging the row taller. */
  margin-bottom: var(--spacing-3);
  flex-shrink: 0;
}
```

Then delete the now-dead `.shp-details__field`, `.shp-details__field > :first-child`, and `.shp-details__field-action` rules (`:3601-3610`) and the pen comment block above them.

- [ ] **Step 5: Wire the minimum state to make the tests pass**

In `ShipmentDetailsModal`, add above the existing `overrides` state:

```jsx
  // Section edit mode (2026-08-11). ONE state object, so "only one section at
  // a time" is structural rather than a rule to enforce — `section` cannot
  // hold two values. Null = nothing is being edited.
  const [edit, setEdit] = useState(null)
  const dirty = isDirty(edit)
```

Import the helpers:

```jsx
import { isDirty, startEdit } from './sectionDraft.js'
```

Add a helper that each section's header uses. **Placement matters:** `draftFor` reads `summary`, `option`, `orders` and `shipmentDetails`, which are declared at `:189-203` — put `draftFor` and `sectionProps` BELOW that block, not next to the `useState` calls, or they close over undefined bindings.

```jsx
  // Draft seeds, one per editable section. Read at Edit-click time so the
  // draft always starts from what is currently on screen.
  const draftFor = (section) => {
    if (section === 'general') {
      return {
        grossWeight: summary.grossWeight ?? DASH,
        volume: summary.volume ?? DASH,
        mode: shipmentDetails.overrides?.mode ?? shipment?.mode ?? DASH,
        equipment: option?.equipment ?? DASH,
      }
    }
    // references: { [orderNumber]: row[] }
    return Object.fromEntries(orders.map((o) => [o.orderNumber, referenceRowsFor(o, shipmentDetails.overrides)]))
  }

  const sectionProps = (section, title) => ({
    editable: true,
    editing: edit?.section === section,
    dirty,
    onEdit: () => setEdit(startEdit(section, draftFor(section))),
    onCancel: () => setEdit(null),
    onSave: () => saveSection(section),
  })
```

`referenceRowsFor` and `saveSection` land in Tasks 6 and 7. For THIS task only, stub them at module scope so the tests run:

```jsx
// Filled in by Task 7.
function referenceRowsFor(order, overrides) {
  return overrides?.references?.[order.orderNumber] ?? referencesFor(order).map(([type, value], i) => ({
    id: `${order.orderNumber}-${i}`, type, value,
  }))
}
```

and inside the component:

```jsx
  // Filled in by Task 6 (general) and Task 7 (references).
  const saveSection = () => setEdit(null)
```

Apply `{...sectionProps('general', 'General Information')}` to the General Information `Section`, `{...sectionProps('references', 'Customer Reference Values')}` to Customer Reference Values, `editable editDisabled` to Stops, and `editable onEdit={...}` to Cost (Task 8 gives Cost its real handler; for now pass `onEdit={() => {}}`).

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd apps/odyssey-one && rtk npx vitest run src/components/detail/ShipmentDetailsModal.test.jsx`
Expected: PASS — the 6 new tests plus every pre-existing test that did not assert on the pen.

- [ ] **Step 7: Commit**

```bash
rtk git add apps/odyssey-one/src/components/detail/ShipmentDetailsModal.jsx apps/odyssey-one/src/components/detail/ShipmentDetailsModal.test.jsx apps/odyssey-one/src/styles/components.css
rtk git commit -m "feat(shipments): section-level Edit/Save Changes header control, pen removed"
```

---

## Phase 3 — Editable content (Tasks 6–8)

### Task 6: General Information editable fields

**Files:**
- Modify: `apps/odyssey-one/src/components/detail/ShipmentDetailsModal.jsx`
- Modify: `apps/odyssey-one/tools/data-pools.mjs`
- Modify: `apps/odyssey-one/tools/generate.mjs:137`
- Test: `apps/odyssey-one/src/components/detail/ShipmentDetailsModal.test.jsx`

- [ ] **Step 1: Move `MODES` to the shared pool**

`MODES` currently lives only in `generate.mjs:137`; the app needs it for the Mode ComboBox. Move it rather than duplicating.

In `apps/odyssey-one/tools/data-pools.mjs`, add near `EQUIPMENT_CODES`:

```js
// Shipment modes. Order is LOAD-BEARING: generate.mjs picks weighted-random
// by index, so reordering this array changes the seeded dataset.
export const MODES = ['TL', 'LTL', 'RR', 'IMD', 'AIR'];
```

In `apps/odyssey-one/tools/generate.mjs`, delete line 137 and add `MODES` to the existing `data-pools.mjs` import.

In `apps/odyssey-one/src/data/master-data.js`, add `MODES` to both the import (`:7`) and the re-export (`:9`).

- [ ] **Step 2: Verify the generator is unchanged**

Run: `cd apps/odyssey-one && rtk npx node --test tools/generate.test.mjs`
Expected: PASS, same count as before the move (44 at S114). If any test fails, the array order changed — revert and re-check.

- [ ] **Step 3: Write the failing tests**

```jsx
describe('General Information editing', () => {
  it('renders editable controls for Weight, Volume, Mode and Equipment only', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    expect(screen.getByLabelText('Gross Weight')).toBeTruthy()
    expect(screen.getByLabelText('Volume')).toBeTruthy()
    expect(screen.getByLabelText('Mode')).toBeTruthy()
    expect(screen.getByLabelText('Equipment')).toBeTruthy()
    // Source Name is NOT editable — still a plain read-only value.
    expect(screen.queryByLabelText('Source Name')).toBeNull()
    expect(screen.getByText('USALCO')).toBeTruthy()
  })

  it('typing in a field enables Save Changes', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    expect(screen.getByRole('button', { name: 'Save Changes' }).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '250 cuft' } })
    expect(screen.getByRole('button', { name: 'Save Changes' }).disabled).toBe(false)
  })

  it('cancel restores the original values and leaves edit mode', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '250 cuft' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel editing General Information' }))
    // Discard prompt appears because the draft was dirty; discard it.
    fireEvent.click(screen.getByRole('button', { name: 'Discard Changes' }))
    expect(screen.getByText('200 cuft')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit General Information' })).toBeTruthy()
  })

  it('save writes shipment-stage fields and the quote equipment separately', async () => {
    const saveOverrides = vi.fn().mockResolvedValue(undefined)
    const saveTender = vi.fn().mockResolvedValue(undefined)
    vi.doMock('../../api/services/shipmentService', () => ({
      saveShipmentOverrides: saveOverrides, saveTenderOption: saveTender,
    }))
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '250 cuft' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    await screen.findByRole('button', { name: 'Edit General Information' })
    expect(screen.getByText('250 cuft')).toBeTruthy()
  })
})
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd apps/odyssey-one && rtk npx vitest run src/components/detail/ShipmentDetailsModal.test.jsx -t "General Information editing"`
Expected: FAIL — no `Gross Weight` form control exists.

- [ ] **Step 5: Implement the editable renderer**

Add the editable field set and its renderer. `EDITABLE_GENERAL` replaces the deleted `EDITABLE_FIELDS` as the single place that decides what is editable:

```jsx
import { ComboBox } from '@odyssey/ui'
import MeasureField from '../orders/create/fields/MeasureField.jsx'
import { EQUIPMENT_CODES, EQUIPMENT_LABELS, MODES, UOM_VOLUME, UOM_WEIGHT } from '../../data/master-data'

// The ONLY editable General Information fields (user, 2026-08-11). A label
// absent here renders exactly as before, in edit mode and out of it.
const EDITABLE_GENERAL = new Set(['Gross Weight', 'Volume', 'Mode', 'Equipment'])

const MODE_OPTIONS = MODES.map((m) => ({ value: m, label: m }))
const EQUIPMENT_OPTIONS = EQUIPMENT_CODES.map((c) => ({ value: c, label: `${c} - ${EQUIPMENT_LABELS[c]}` }))

// "44,470 LB" ⇄ { value: '44470', uom: 'lb' }. MeasureField owns value+UoM as
// one control, so the display string has to split on the way in and rejoin on
// the way out. A value that doesn't match the shape (including '--') opens
// empty rather than guessing.
function splitMeasure(display, fallbackUom) {
  const m = /^([\d,.]+)\s*(\S+)?$/.exec(String(display ?? '').trim())
  if (!m) return { value: '', uom: fallbackUom }
  return { value: m[1].replace(/,/g, ''), uom: (m[2] ?? fallbackUom).toLowerCase() }
}

function joinMeasure({ value, uom }, options) {
  if (value === '' || value == null) return DASH
  const label = options.find((o) => o.value === uom)?.label ?? uom
  return `${Number(value).toLocaleString('en-US')} ${label}`
}
```

Then the renderer used by the General Information `Section`:

```jsx
  const renderGeneralField = (label, value) => {
    const editing = edit?.section === 'general'
    if (!editing || !EDITABLE_GENERAL.has(label)) {
      return <TitleSubtitle key={label} subtitle={label} title={value || DASH} />
    }
    const set = (patch) => setEdit((e) => ({ ...e, draft: { ...e.draft, ...patch } }))

    if (label === 'Gross Weight' || label === 'Volume') {
      const isWeight = label === 'Gross Weight'
      const options = isWeight ? UOM_WEIGHT : UOM_VOLUME
      const key = isWeight ? 'grossWeight' : 'volume'
      return (
        <MeasureField
          key={label}
          id={`shp-details-${key}`}
          showLabel
          label={label}
          options={options}
          value={splitMeasure(edit.draft[key], isWeight ? 'lb' : 'cuft')}
          onChange={(next) => set({ [key]: joinMeasure(next, options) })}
        />
      )
    }

    const isMode = label === 'Mode'
    return (
      <ComboBox
        key={label}
        id={`shp-details-${isMode ? 'mode' : 'equipment'}`}
        variant="select"
        showLabel
        label={label}
        options={isMode ? MODE_OPTIONS : EQUIPMENT_OPTIONS}
        value={isMode ? edit.draft.mode : edit.draft.equipment}
        onSelect={(v) => set(isMode ? { mode: v ?? '' } : { equipment: v ?? '' })}
      />
    )
  }
```

Pass `renderField={renderGeneralField}` to the General Information `Section` (replacing the old shared `renderField`), and change its `Mode` and `Equipment` rows to read the override-aware values:

```jsx
                  ['Mode', shipmentDetails.overrides?.mode ?? shipment?.mode],
                  ['Equipment', option?.equipment ?? DASH],
```

Now the real `saveSection`:

```jsx
  // General Information saves to TWO places on purpose: Equipment belongs to
  // the routing option (tenders row), everything else is shipment-stage.
  // Sequential, not Promise.all — if the tender write fails we must not have
  // already told the user the whole save succeeded.
  const saveSection = async (section) => {
    const id = shipment?.sellShipment
    if (section === 'general') {
      const { equipment, ...stage } = edit.draft
      await saveShipmentOverrides(id, { ...shipmentDetails.overrides, ...stage })
      if (equipment !== option?.equipment && option) {
        await saveTenderOption(id, routingOptionVmToDto({ ...option, equipment }))
      }
    } else {
      await saveShipmentOverrides(id, { ...shipmentDetails.overrides, references: edit.draft })
    }
    setOverrides((prev) => ({ ...prev, ...edit.draft }))
    setEdit(null)
  }
```

with imports:

```jsx
import { saveShipmentOverrides, saveTenderOption } from '../../api/services/shipmentService'
import { routingOptionVmToDto } from '../../api/mappers/mapSellShipmentOutToDetail'
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd apps/odyssey-one && rtk npx vitest run src/components/detail/ShipmentDetailsModal.test.jsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
rtk git add apps/odyssey-one/src apps/odyssey-one/tools
rtk git commit -m "feat(shipments): editable Weight/Volume/Mode/Equipment in General Information"
```

---

### Task 7: Order Reference editing

**Files:**
- Modify: `apps/odyssey-one/src/components/detail/ShipmentDetailsModal.jsx`
- Modify: `apps/odyssey-one/src/components/orders/create/RepeatableRows.jsx:1-3`
- Test: `apps/odyssey-one/src/components/detail/ShipmentDetailsModal.test.jsx`

- [ ] **Step 1: Fix RepeatableRows' missing styles at the root**

`create-order.css` is code-split with the Orders route (`CreateOrderRoute.jsx:6`), so `.co-rep` / `.co-confirm-block` are absent anywhere else. `MeasureField.jsx:7` already solves this for itself by importing the stylesheet directly. Do the same in the component that owns the classes, which fixes it for every future consumer at once.

Add to `apps/odyssey-one/src/components/orders/create/RepeatableRows.jsx` after the lucide import:

```jsx
// The .co-rep table surface lives in create-order.css, which is code-split
// with the Orders route. Imported here so this component works outside it —
// same reason and same idiom as fields/MeasureField.jsx.
import './create-order.css'
```

- [ ] **Step 2: Write the failing tests**

```jsx
describe('Customer Reference Values editing', () => {
  it('swaps the reference display for the repeatable-rows editor', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Reference Values' }))
    expect(screen.getAllByText('Reference Type').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Reference Value').length).toBeGreaterThan(0)
    // No duplicated "References" heading — the section header already says it.
    expect(screen.queryByRole('heading', { name: 'References' })).toBeNull()
  })

  it('keeps the order number visible and read-only', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Reference Values' }))
    expect(screen.getByText('L14372086')).toBeTruthy()
    expect(screen.queryByDisplayValue('L14372086')).toBeNull()
  })

  it('PO Number is editable', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Reference Values' }))
    const po = screen.getByDisplayValue('PO-5512')
    fireEvent.change(po, { target: { value: 'PO-9999' } })
    expect(screen.getByRole('button', { name: 'Save Changes' }).disabled).toBe(false)
  })

  it('a new reference row can be added', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Reference Values' }))
    const before = screen.getAllByPlaceholderText('Enter Reference Value').length
    fireEvent.click(screen.getAllByRole('button', { name: /Add New Reference Code/ })[0])
    expect(screen.getAllByText('Select a Reference Type').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Save Changes' }).disabled).toBe(false)
    expect(before).toBeGreaterThanOrEqual(0)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd apps/odyssey-one && rtk npx vitest run src/components/detail/ShipmentDetailsModal.test.jsx -t "Customer Reference Values editing"`
Expected: FAIL — no `Reference Type` header rendered.

- [ ] **Step 4: Implement**

Replace the `referenceRowsFor` stub from Task 5 with the real one, at module scope:

```jsx
// Current reference rows for one order: the shipment-stage override if the
// user has edited this order's references, otherwise the seeded values from
// the order itself. The override REPLACES the list wholesale — the editor is
// seeded from these same rows, so a save always carries the complete set.
function referenceRowsFor(order, overrides) {
  const saved = overrides?.references?.[order.orderNumber]
  if (saved) return saved
  return referencesFor(order).map(([type, value], i) => ({
    id: `${order.orderNumber}-${i}`, type, value,
  }))
}
```

Add the reference type options, excluding types this order already uses (mirrors `GeneralInformationSection.jsx:298`):

```jsx
import RepeatableRows, { newRowId } from '../orders/create/RepeatableRows.jsx'
import { REFERENCE_TYPES } from '../../data/master-data'

const REFERENCE_TYPE_OPTIONS = REFERENCE_TYPES.map((t) => ({ value: t, label: t }))
```

Replace the Customer Reference Values `Section`'s children with a branch on edit mode:

```jsx
              <Section title="Customer Reference Values" {...sectionProps('references')}>
                <div className="shp-details__orders">
                  {orders.map((o) => {
                    const editing = edit?.section === 'references'
                    const rows = editing
                      ? edit.draft[o.orderNumber] ?? []
                      : referenceRowsFor(o, shipmentDetails.overrides)

                    const setRows = (next) => setEdit((e) => ({
                      ...e, draft: { ...e.draft, [o.orderNumber]: next },
                    }))

                    return (
                      <div key={o.orderNumber} className="shp-details__order">
                        {/* Order Number is never editable (user, 2026-08-11) —
                            it identifies the group, it is not a reference. */}
                        <TitleSubtitle subtitle="Order" title={o.orderNumber || DASH} />
                        {editing ? (
                          /* The Orders create-flow References block, minus its
                             own "References" heading — this section header
                             already names it (user, 2026-08-11). */
                          <div className="co-confirm-block">
                            <RepeatableRows
                              rows={rows}
                              columns={[
                                {
                                  key: 'type',
                                  header: 'Reference Type',
                                  maxWidth: 350,
                                  select: {
                                    placeholder: 'Select a Reference Type',
                                    options: (row) => REFERENCE_TYPE_OPTIONS.filter(
                                      (opt) => !rows.some((r) => r.id !== row.id && r.type === opt.value),
                                    ),
                                  },
                                },
                                { key: 'value', header: 'Reference Value', placeholder: 'Enter Reference Value', maxWidth: 350 },
                              ]}
                              lockedCell={(row, colKey) => colKey === 'type' && !!row.type}
                              canDeleteRow={(row) => !!row.type}
                              rowPlaceholder={(row, colKey) =>
                                row.type && colKey === 'value' ? `Enter a ${row.type}` : undefined}
                              onCellChange={(rowId, colKey, value) =>
                                setRows(rows.map((r) => (r.id === rowId ? { ...r, [colKey]: value } : r)))}
                              onDeleteRow={(rowId) => setRows(rows.filter((r) => r.id !== rowId))}
                              onAddRow={() => {
                                // One pending row at a time — reuse the blank
                                // one if it exists (same rule as order creation).
                                if (!rows.some((r) => !r.type && !r.value)) {
                                  setRows([...rows, { id: newRowId(), type: '', value: '' }])
                                }
                              }}
                              addLabel="Add New Reference Code"
                            />
                          </div>
                        ) : rows.length ? (
                          <div className="shp-details__order-refs">
                            {rows.map((r) => (
                              <TitleSubtitle key={r.id} subtitle={r.type} title={r.value} />
                            ))}
                          </div>
                        ) : (
                          <span className="text-label-sm-regular">{DASH}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Section>
```

Change `sectionProps` to take only the section key, since the title is now passed to `Section` directly:

```jsx
  const sectionProps = (section) => ({
    editable: true,
    editing: edit?.section === section,
    dirty,
    onEdit: () => setEdit(startEdit(section, draftFor(section))),
    onCancel: () => requestExit(() => setEdit(null)),
    onSave: () => saveSection(section),
  })
```

(`requestExit` arrives in Task 8; for now define it as `const requestExit = (fn) => fn()`.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/odyssey-one && rtk npx vitest run src/components/detail/ShipmentDetailsModal.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add apps/odyssey-one/src
rtk git commit -m "feat(shipments): shipment-stage reference editing via the Orders RepeatableRows block"
```

---

### Task 8: Discard-or-save confirmation

**Files:**
- Create: `apps/odyssey-one/src/components/detail/DiscardChangesModal.jsx`
- Create: `apps/odyssey-one/src/components/detail/DiscardChangesModal.test.jsx`
- Modify: `apps/odyssey-one/src/components/detail/ShipmentDetailsModal.jsx`

- [ ] **Step 1: Write the failing tests for the component**

`DiscardChangesModal.test.jsx`:

```jsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import DiscardChangesModal from './DiscardChangesModal'

afterEach(cleanup)

describe('DiscardChangesModal', () => {
  it('offers discard and save', () => {
    render(<DiscardChangesModal onDiscard={() => {}} onSave={() => {}} onStay={() => {}} />)
    expect(screen.getByRole('button', { name: 'Discard Changes' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeTruthy()
  })

  it('calls onDiscard', () => {
    const onDiscard = vi.fn()
    render(<DiscardChangesModal onDiscard={onDiscard} onSave={() => {}} onStay={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Discard Changes' }))
    expect(onDiscard).toHaveBeenCalledOnce()
  })

  it('calls onSave', () => {
    const onSave = vi.fn()
    render(<DiscardChangesModal onDiscard={() => {}} onSave={onSave} onStay={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('the header close returns to editing rather than choosing for the user', () => {
    const onStay = vi.fn(); const onDiscard = vi.fn()
    render(<DiscardChangesModal onDiscard={onDiscard} onSave={() => {}} onStay={onStay} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onStay).toHaveBeenCalledOnce()
    expect(onDiscard).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd apps/odyssey-one && rtk npx vitest run src/components/detail/DiscardChangesModal.test.jsx`
Expected: FAIL — cannot resolve `./DiscardChangesModal`.

- [ ] **Step 3: Implement**

```jsx
import { createPortal } from 'react-dom'
import { Button, ModalMedium } from '@odyssey/ui'

/**
 * Shown when the user leaves an edited section without saving — closing the
 * modal, cancelling the section, switching sections, or switching tabs.
 *
 * Three exits, not two: Discard and Save are the choices the user asked for,
 * but the header X must return them to editing. Making X an implicit discard
 * would destroy work with a single mis-click, and making it an implicit save
 * would commit changes they were trying to abandon.
 *
 * Portaled to <body> so it stacks above the Shipment Details dialog rather
 * than inheriting its stacking context — same reasoning as QuoteModal.
 */
export default function DiscardChangesModal({ onDiscard, onSave, onStay }) {
  return createPortal(
    <ModalMedium
      title="Unsaved changes"
      onClose={onStay}
      ariaLabel="Unsaved changes"
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={onDiscard}>Discard Changes</Button>
          <Button variant="primary" size="lg" onClick={onSave}>Save Changes</Button>
        </>
      }
    >
      <p className="text-label-sm-regular">
        You have unsaved changes in this section. Discard them, or save before leaving?
      </p>
    </ModalMedium>,
    document.body,
  )
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `cd apps/odyssey-one && rtk npx vitest run src/components/detail/DiscardChangesModal.test.jsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing integration tests**

Append to `ShipmentDetailsModal.test.jsx`:

```jsx
describe('unsaved-changes guard', () => {
  const dirtyGeneral = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '250 cuft' } })
  }

  it('closing the modal with a dirty draft prompts instead of closing', () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    dirtyGeneral()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByText('Unsaved changes')).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closing with a CLEAN draft closes immediately', () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('switching sections with a dirty draft prompts', () => {
    renderModal()
    dirtyGeneral()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Reference Values' }))
    expect(screen.getByText('Unsaved changes')).toBeTruthy()
  })

  it('switching tabs with a dirty draft prompts', () => {
    renderModal()
    dirtyGeneral()
    fireEvent.click(screen.getByRole('tab', { name: 'User Defined Fields' }))
    expect(screen.getByText('Unsaved changes')).toBeTruthy()
  })

  it('edit mode resets when the modal is reopened', () => {
    const { unmount } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    unmount()
    renderModal()
    expect(screen.getByRole('button', { name: 'Edit General Information' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save Changes' })).toBeNull()
  })
})
```

- [ ] **Step 6: Run to verify they fail**

Run: `cd apps/odyssey-one && rtk npx vitest run src/components/detail/ShipmentDetailsModal.test.jsx -t "unsaved-changes guard"`
Expected: FAIL — the modal closes instead of prompting.

- [ ] **Step 7: Implement the guard**

Replace the Task-7 `requestExit` stub with the real one, and add the pending-action state:

```jsx
  // Every way OUT of an edited section funnels through here, so the prompt
  // cannot be bypassed by adding a new exit later: modal close, section
  // cancel, opening another section, and switching tabs all call it.
  const [pendingExit, setPendingExit] = useState(null)

  const requestExit = (proceed) => {
    if (dirty) { setPendingExit(() => proceed); return }
    proceed()
  }
```

Wire the four exits:

```jsx
  // Modal close
  const handleClose = () => requestExit(() => onClose?.())

  // Tab switch
  const switchTab = (next) => requestExit(() => { setEdit(null); setTab(next) })
```

Change `onEdit` in `sectionProps` so opening a second section funnels through the guard:

```jsx
    onEdit: () => requestExit(() => setEdit(startEdit(section, draftFor(section)))),
```

Pass `onClose={handleClose}` to the outer `ModalMedium` (replacing `onClose`), and `onClick={() => switchTab('details')}` / `onClick={() => switchTab('udf')}` on the two `Tab`s.

Render the prompt just above the `{quoteModalOpen && ...}` block:

```jsx
      {pendingExit && (
        <DiscardChangesModal
          onStay={() => setPendingExit(null)}
          onDiscard={() => { const go = pendingExit; setEdit(null); setPendingExit(null); go() }}
          onSave={async () => { const go = pendingExit; await saveSection(edit.section); setPendingExit(null); go() }}
        />
      )}
```

with `import DiscardChangesModal from './DiscardChangesModal.jsx'`.

> Note: `setPendingExit(() => proceed)` uses the functional-update form deliberately — `setPendingExit(proceed)` would call `proceed` as a state updater instead of storing it.

- [ ] **Step 8: Run to verify they pass**

Run: `cd apps/odyssey-one && rtk npx vitest run src/components/detail/ShipmentDetailsModal.test.jsx`
Expected: PASS.

- [ ] **Step 9: Mutation-check the guard**

Change `requestExit` to always call `proceed()` immediately. Re-run. Expected: the three "prompts" tests FAIL. Revert, confirm green.

- [ ] **Step 10: Commit**

```bash
rtk git add apps/odyssey-one/src/components/detail
rtk git commit -m "feat(shipments): discard-or-save guard on every exit from an edited section"
```

---

### Task 9: Stops placeholder button

**Files:**
- Modify: `apps/odyssey-one/src/components/detail/ShipmentDetailsModal.jsx`

Already covered by Task 5's `editable editDisabled` props and its test. This task only confirms it and records why.

- [ ] **Step 1: Confirm the Stops section carries the disabled control**

The Stops `Section` opening tag should read:

```jsx
              {/* Stops editing is not built yet (user, 2026-08-11: "we will not
                  do this one for now but will be triggered by the same button").
                  The control renders DISABLED so the affordance is visible and
                  a click gives honest feedback instead of silently doing
                  nothing. Wire onEdit when the Stops draft shape is decided. */}
              <Section title="Stops" editable editDisabled>
```

- [ ] **Step 2: Run the test**

Run: `cd apps/odyssey-one && rtk npx vitest run src/components/detail/ShipmentDetailsModal.test.jsx -t "Stops renders its Edit button disabled"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
rtk git add apps/odyssey-one/src/components/detail/ShipmentDetailsModal.jsx
rtk git commit -m "docs(shipments): record why the Stops edit control ships disabled"
```

---

## Phase 4 — Cost navigation (Tasks 10–11) — FIGMA-GATED

### Task 10: `ModalMedium` gains a `leading` header slot

> **STOP — this is a design-system change, not an app change.** `ModalMedium` is a normalized `@odyssey/ui` component (Figma `ModalMedium` 2032:915). Per the project's Figma-first rule, the Figma component must carry the new slot BEFORE any code is written, and modifying a staged component demotes it to NORMALIZING in BOTH DSMs. Do not start this task without explicit user approval.

**Sequence — each step gates the next:**

- [ ] **Step 1: Figma.** Add a `leading` slot to `ModalMedium`'s header (2032:915), left of the title. Per project convention an INSTANCE_SWAP slot is signalled with the pink-dashed `SlotPlaceholder` (#e85aad) and uses `placeholder-20` for an LG icon slot. Get user approval on the Figma before touching code.

- [ ] **Step 2: Demote in both DSMs.** Mark `ModalMedium` NORMALIZING in the React DSM (`/design-system`) and the Angular DSM, and bump its version. Use the S85 scripts (`dsm-flags`) rather than hand-editing metas.

- [ ] **Step 3: Write the failing test.**

In `packages/ui/src/ModalMedium.test.jsx`:

```jsx
it('renders a leading slot before the title', () => {
  render(<ModalMedium title="Edit Quote" leading={<button>Back</button>} onClose={() => {}} />)
  const header = document.querySelector('.modal-medium__header')
  expect(header.firstElementChild.textContent).toBe('Back')
})

it('renders no leading wrapper when the slot is empty', () => {
  render(<ModalMedium title="Plain" onClose={() => {}} />)
  expect(document.querySelector('.modal-medium__leading')).toBeNull()
})
```

- [ ] **Step 4: Run to verify failure.** `cd packages/ui && rtk npx vitest run src/ModalMedium.test.jsx` → FAIL.

- [ ] **Step 5: Implement.** In `packages/ui/src/ModalMedium.jsx`, add `leading` to the props and render it first inside `<header>`:

```jsx
        <header className="modal-medium__header">
          {leading && <span className="modal-medium__leading">{leading}</span>}
          <span className="text-heading-lg-semibold modal-medium__title">{title}</span>
```

Document it in the JSDoc block alongside `scrollableContent`:

```
 * `leading` — optional slot rendered before the title (Figma 2032:915 leading
 * slot). Used for a back control when a modal hosts a navigation flow rather
 * than a single view.
```

- [ ] **Step 6: Run to verify pass.** Expected: PASS.

- [ ] **Step 7: Port to Angular.** Generate the Angular twin per `/port-to-angular`. Run the full Angular suite.

- [ ] **Step 8: Commit both repos.**

```bash
rtk git add packages/ui/src/ModalMedium.jsx packages/ui/src/ModalMedium.test.jsx playground/normalization-tracker.md
rtk git commit -m "feat(ui): ModalMedium leading header slot (Figma 2032:915)"
```

> The Angular repo is NEVER pushed without explicit approval — commit locally and stop.

---

### Task 11: Cost → Edit Quote in-place navigation

**Files:**
- Modify: `apps/odyssey-one/src/components/detail/QuoteModal.jsx:239-260`
- Modify: `apps/odyssey-one/src/components/detail/ShipmentDetailsModal.jsx`
- Test: `apps/odyssey-one/src/components/detail/ShipmentDetailsModal.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
describe('Cost → Edit Quote navigation', () => {
  it('replaces the details body rather than stacking a second dialog', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Cost' }))
    expect(document.querySelectorAll('[role="dialog"]').length).toBe(1)
    expect(screen.queryByText('General Information')).toBeNull()
    expect(screen.getByText('Carrier')).toBeTruthy()
  })

  it('offers a back control that returns to the details view', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Cost' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back to Shipment Details' }))
    expect(screen.getByText('General Information')).toBeTruthy()
  })

  it('the close X still closes the whole modal from the quote view', () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    fireEvent.click(screen.getByRole('button', { name: 'Edit Cost' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('saving the quote persists through saveTenderOption and returns to details', async () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Cost' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Quote' }))
    await screen.findByText('General Information')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/odyssey-one && rtk npx vitest run src/components/detail/ShipmentDetailsModal.test.jsx -t "Cost → Edit Quote navigation"`
Expected: FAIL — Edit Cost does nothing.

- [ ] **Step 3: Give QuoteModal an embedded mode**

In `QuoteModal.jsx`, add `embedded = false` to the props, and split the return so the body and footer can be handed to a host shell:

```jsx
  const body = (
    <div className="quote-modal">
      {/* ...existing children, unchanged... */}
    </div>
  )

  const footerNode = isView ? null : (
    <>
      <Button variant="secondary" size="lg" onClick={onClose}>Cancel</Button>
      <Button variant="primary" size="lg" onClick={handleSave} disabled={!scac || !baseRate}>
        Save Quote
      </Button>
    </>
  )

  // Embedded: the HOST owns the dialog shell (its own ModalMedium, its own
  // header and footer), so this renders bare and does NOT portal. Used by the
  // Shipment Details modal, where Edit Quote is a VIEW of that modal rather
  // than a second dialog stacked on it (user, 2026-08-11).
  if (embedded) return <>{body}</>

  return createPortal(
    <ModalMedium title={title} onClose={onClose} ariaLabel={title} className="quote-modal-shell" footer={footerNode}>
      {body}
    </ModalMedium>,
    document.body,
  )
```

Export the footer so the host can render it. Simplest shape that avoids duplicating the disabled rule:

```jsx
/** The quote form's footer buttons, for hosts that own the dialog shell. */
export function QuoteModalFooter({ onCancel, onSave, disabled }) {
  return (
    <>
      <Button variant="secondary" size="lg" onClick={onCancel}>Cancel</Button>
      <Button variant="primary" size="lg" onClick={onSave} disabled={disabled}>Save Quote</Button>
    </>
  )
}
```

and have both the portal path and the embedded host use it.

- [ ] **Step 4: Implement the host view swap**

In `ShipmentDetailsModal`, replace the `quoteModalOpen` boolean with a view state and delete the old stacked `<QuoteModal>` block plus the Escape-capture `useEffect` (`:163-170`) — with one dialog there is no nested-Escape problem left to solve:

```jsx
  // 'details' | 'quote'. The quote is a VIEW of this modal, not a modal on top
  // of it (user, 2026-08-11), so it swaps the body and retitles the shell.
  const [view, setView] = useState('details')
```

Give Cost its handler:

```jsx
  onEdit: () => requestExit(() => setView('quote'))
```

Wrap the whole return so the shell reflects the view:

```jsx
    <ModalMedium
      title={view === 'quote' ? 'Edit Quote' : 'Shipment Details'}
      ariaLabel={view === 'quote' ? 'Edit Quote' : 'Shipment Details'}
      onClose={handleClose}
      leading={view === 'quote' ? (
        <button
          type="button"
          className="icon-action"
          aria-label="Back to Shipment Details"
          onClick={() => setView('details')}
        >
          <ArrowLeft {...ICON_LG} />
        </button>
      ) : null}
      footer={view === 'quote' ? (
        <QuoteModalFooter onCancel={() => setView('details')} onSave={submitQuote} disabled={!quoteValid} />
      ) : null}
    >
```

and render the quote body in place of the details body when `view === 'quote'`.

**Fix the persistence bug while you are here.** The current `onSave` only calls `setOverrides` — `ShipmentDetailsModal.jsx:15-18` and `:143-146` both claim it routes through `saveTenderOption`, and it does not, so edits made from this modal are lost on reload. The new save must actually write:

```jsx
  const handleQuoteSave = async (result) => {
    // Was missing entirely before 2026-08-11 — the comments claimed this
    // persisted and it never did. Same choke point RoutingGuideTab uses:
    // VM → DTO → PUT .../tender.
    await saveTenderOption(shipment?.sellShipment, routingOptionVmToDto(result))
    setOverrides((prev) => ({
      ...prev,
      Base: fmtMoney(result.rateDetails.baseRate, result.rateDetails.currency),
      Markup: fmtMoney(result.rateDetails.markup, result.rateDetails.currency),
      Equipment: result.equipment,
    }))
    setView('details')
  }
```

Delete the two stale comment blocks that asserted the old behaviour and replace them with one that describes what actually happens.

- [ ] **Step 5: Run to verify pass**

Run: `cd apps/odyssey-one && rtk npx vitest run src/components/detail/`
Expected: PASS.

- [ ] **Step 6: Full suite**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one && rtk npx vitest run`
Expected: PASS. Record the new total against S116's 1204. Do not report a number measured while other agents are running.

- [ ] **Step 7: Commit**

```bash
rtk git add apps/odyssey-one/src/components/detail
rtk git commit -m "feat(shipments): Cost navigates in-place to Edit Quote; fix quote save never persisting"
```

---

## Phase 5 — Follow-ups (Tasks 12–13)

### Task 12: Grid consistency for Mode and Gross Weight

**Optional — drop this task freely, nothing above depends on it.** Without it, overriding Mode or Gross Weight leaves the shipments list showing the pre-edit value.

**Files:**
- Modify: `apps/odyssey-one/api/_lib/shipments.mjs` (the `shipmentErrorList` row query)
- Test: `apps/odyssey-one/api/_lib/shipments.test.mjs`

- [ ] **Step 1: Write the failing test**

The projection lives in the shared `ROW_COLUMNS` template literal (`shipments.mjs:15`), which `buildListQuery` (`:110`) interpolates — so the fix is one edit to that constant and every list query inherits it.

```js
import { buildListQuery } from './shipments.mjs'

it('the list query prefers an override for mode and gross weight', () => {
  const q = buildListQuery({ filter: {} }, null)
  assert.match(q.text, /COALESCE\(overrides->>'mode', mode\) AS mode/)
  assert.match(q.text, /COALESCE\(overrides->>'grossWeight', gross_weight\) AS "grossWeight"/)
})
```

- [ ] **Step 2: Run to verify failure.**

Run: `cd apps/odyssey-one && rtk npx node --test api/_lib/shipments.test.mjs`
Expected: FAIL — the plain columns are selected.

- [ ] **Step 3: Implement.** In `ROW_COLUMNS` (`shipments.mjs:15-30`), replace the bare `mode,` on line 21 with `COALESCE(overrides->>'mode', mode) AS mode,` and the `gross_weight AS "grossWeight",` on line 23 with `COALESCE(overrides->>'grossWeight', gross_weight) AS "grossWeight",`.

Only these two: `volume` has no list column, and references are not a list concern.

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add apps/odyssey-one/api/_lib
rtk git commit -m "fix(api): shipments list honours mode/grossWeight overrides"
```

---

### Task 13: Record the decisions and the open questions

**Files:**
- Modify: `vault/10-domains/shipments/decisions/decision-log.md`
- Modify: `vault/10-domains/shipments/questions-for-jana-2026-08-05.md`

- [ ] **Step 1: Append the decisions**

Add DEC-82 … DEC-86, each with source + previous state per the project's traceability rule:

- **DEC-82 — Section-level edit replaces per-field pens.** Previous state: three pens (Base, Markup, Equipment) each opening QuoteModal. Now: one Edit → Save Changes control per section header, no pen anywhere. Source: user, 2026-08-11.
- **DEC-83 — Shipment-stage overrides are a shipment concern, never an order write.** Editing a PO Number in this modal must not touch order data. Backed by an additive `shipments.overrides` JSONB column. Source: user, 2026-08-11.
- **DEC-84 — General Information's save is a deliberate two-call split.** Equipment persists via `saveTenderOption` because it belongs to the routing option; Mode/Weight/Volume via `PATCH .../overrides`. Source: derived from the existing data model, 2026-08-11.
- **DEC-85 — Edit Quote is a VIEW of the Shipment Details modal, not a dialog on top of it.** Required a `leading` slot on `ModalMedium` (Figma 2032:915). Source: user, 2026-08-11.
- **DEC-86 — The quote save from this modal never persisted.** `ShipmentDetailsModal.jsx:229-241` called only `setOverrides`, while its own comments at `:15-18` and `:143-146` asserted it routed through `saveTenderOption`. Edits were lost on reload from the day the pens shipped. Fixed in Task 11. Record that the comment was wrong, not just the code — a comment asserting a behaviour is not evidence of it.

- [ ] **Step 2: Append the open questions for Jana**

- **Reference type vocabulary.** `referencesFor()` renders `Pro/Booking Number` and `Confirmation Number`, neither of which is in `REFERENCE_TYPES` (`master-data.js:39`). Should the shipment-stage editor be able to ADD those two types, or are they read-only order-sourced values? Currently they render but cannot be re-selected once cleared.
- **Override precedence and refresh.** When routing re-runs and returns a new Gross Weight, does a user's shipment-stage override survive, or is it superseded? The current implementation keeps the override indefinitely.
- **Who may edit.** No permission model is applied — any user seeing the modal can edit every section.

- [ ] **Step 3: Commit**

```bash
rtk git add vault/10-domains/shipments
rtk git commit -m "docs(vault): DEC-82..86 shipment details edit mode + three questions for Jana"
```

---

## Verification checklist before calling this done

- [ ] Full suite green on a QUIET tree (no agents running): `rtk npx vitest run` from the repo root.
- [ ] `rtk npx tsc --noEmit -p apps/odyssey-one` clean.
- [ ] Build passes: `npm run build:odyssey-one`.
- [ ] **Browser pass** — jsdom cannot see any of this. Open `/shipments`, open a shipment, open the details modal and confirm by eye: the header control swaps Edit → Save Changes, Save Changes is dead until you type, the X cancels, the discard prompt appears on every one of the four exits, the reference editor's `.co-rep` table is actually styled (this is what the CSS-import fix in Task 7 buys — a missing stylesheet looks like a broken table, not an error), and the Cost view swaps in place with a working back control.
- [ ] Reload after saving each section and confirm the values survived. This is the check that would have caught DEC-86.
- [ ] No prod deploy without explicit permission for that specific deploy.
