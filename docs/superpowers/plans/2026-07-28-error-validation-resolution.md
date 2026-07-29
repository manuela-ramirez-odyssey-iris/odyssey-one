# Error Validation Resolution (OIF behavior) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking Resolve on a Validation Errors row opens the create-order form in a resolution mode — order hydrated, only seeded error fields editable (red → green Validated as fixed), an error-validation Alert (list → docked stepper) driving navigation, and Save/Purge transitioning the order out of the tab.

**Architecture:** A pure `deriveValidationErrors` module (deterministic per order number) seeds blanks/corruptions into the hydrated form values and describes each error. `CreateOrderForm` gains a resolve mode: a `ResolveModeContext` injects `error`/`validated` props into the ~7 pool-field call sites (spread wins over `fieldState`), blanket CSS locks every other control, the existing `Alert`/`Accordion` error anatomies are fed from live `useWatch`-computed resolution state, and Save/Purge flip the order's status through the existing `overlayUpdateStatus` mechanism (status change alone moves it between tabs, because the Validation Errors tab filters on status).

**Tech Stack:** React 19, react-hook-form + zod (existing form), `@odyssey/ui` Alert/Accordion/ModalMedium/FormField/ComboBox (all already built), vitest + RTL.

**Spec:** `docs/superpowers/specs/2026-07-28-error-validation-resolution-design.md`
**Deviations from spec (both noted for the wrap):**
- Route is `/orders/create?resolve=<orderNumber>` (not `/orders/resolve/:orderNumber`) — matches the existing Edit pattern `?draft=<orderNumber>`; `CreateOrderRoute` already reads searchParams.
- Product-grid errors are OUT of v1 — the seeded pool covers General Information + Pickup & Delivery (15 candidates ≥ max errorCount 12). The product grid's draft-state ComboBox cells + MeasureField need their own validated-state pass; deferred, flagged in the wrap.

**Key existing facts (verified 2026-07-28):**
- `OrdersRoute.jsx:191-201` row-action handler; `Resolve` is a commented no-op today. Rows carry `errorCount`, `customer`, `orderSource`, `draftOrderStatus`.
- `OrdersTable.jsx:35-52` Resolve button, `disabled={row.original.draftOrderStatus !== 'Ready'}` — already correct, untouched.
- Validation Errors tab = status filter `VALIDATION_ERROR_STATUSES = ['Planning Failed', 'Shipment Failed']` (`orderService.ts:68`); All tab shows everything → flipping a row's `orderStatus` to `'Ready For Plan'` via `overlayUpdateStatus(orderNumber, status)` (`orderService.ts:198-206`) performs the whole tab transition.
- `getOrderView(orderNumber)` (`orderService.ts:372-411`) returns `OrderFormValues` — direct `reset()` hydration (Edit's fallback path).
- `CreateOrderForm.jsx`: props `{ draftKey, onSubmitted }`; RHF `mode:'onTouched'` + zodResolver; 4 Accordions at 231-281 (`status={status.X ? 'on' : 'off'}`, `sectionRefs` exist at 174-179); header = Breadcrumb + PageHeader (192-208); footer = `StickyFooter` → `StepperButtonsFooter` (`cancelLabel/saveLabel/primaryLabel/showSave/onCancel/onSave/onPrimary/primaryDisabled`).
- Field DOM ids: `co-general-equipment` etc.; AddressFields/ContactFields derive `co-<basePath dashed>-<name>` — **error nav = `document.getElementById('co-' + path.replace(/\./g,'-'))`**.
- AddressFields renders via `text/select/combo` factory helpers; ContactFields via one `field` factory — resolve-prop injection = 4 factory edits + 3 explicit sites in GeneralInformationSection (lines ~152/172/195).
- `Alert` `errors=[{field,reason,resolved?}]` + `docked` + `onErrorNav(i)` (original indices); consumer owns sticky + scroll trigger. `.alert--docked` CSS exists (`components.css:1820`).
- `Accordion` `status='error'|'on'` + `errorCount` renders the red/green badges.
- ComboBox root gets `search-field--error` class but has NO `search-field--validated` class yet (needed by the CSS lock exceptions).

---

### Task 1: `deriveValidationErrors` — pure derivation module (TDD)

**Files:**
- Create: `apps/odyssey-one/src/components/orders/resolve/validationErrors.js`
- Test: `apps/odyssey-one/src/components/orders/resolve/validationErrors.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// apps/odyssey-one/src/components/orders/resolve/validationErrors.test.js
import { describe, test, expect } from 'vitest'
import { deriveValidationErrors, RESOLVE_POOL } from './validationErrors.js'
import { makeDefaultOrderFormValues } from '../../../api/types/orderFormVm'

function sampleValues() {
  const v = makeDefaultOrderFormValues()
  v.general.equipment = 'SUTU3456789'
  v.general.freightTerm = 'Pre-Paid'
  v.general.shipDirection = 'Outbound'
  v.pickupDelivery.consignor.idOrgName = 'PMX1214'
  v.pickupDelivery.consignor.address1 = '714 Warehouse St'
  v.pickupDelivery.consignor.city = 'Missoula'
  v.pickupDelivery.consignor.state = 'MT'
  v.pickupDelivery.consignor.postal = '59801'
  v.pickupDelivery.consignor.contactPhone = '+1 (765) 670-4444'
  v.pickupDelivery.consignee.idOrgName = 'DEST01'
  v.pickupDelivery.consignee.address1 = '496 Distribution Ave'
  v.pickupDelivery.consignee.city = 'Eden'
  v.pickupDelivery.consignee.state = 'NC'
  v.pickupDelivery.consignee.postal = '30340'
  v.pickupDelivery.consignee.contactPhone = '+1 (782) 605-6660'
  return v
}

describe('deriveValidationErrors', () => {
  test('deterministic: same order → same errors', () => {
    const a = deriveValidationErrors('S260004NGW', 5, sampleValues())
    const b = deriveValidationErrors('S260004NGW', 5, sampleValues())
    expect(a.errors.map((e) => e.path)).toEqual(b.errors.map((e) => e.path))
  })

  test('different orders → different sets (spot check)', () => {
    const a = deriveValidationErrors('S260004NGW', 5, sampleValues())
    const b = deriveValidationErrors('S260009XKQ', 5, sampleValues())
    expect(a.errors.map((e) => e.path)).not.toEqual(b.errors.map((e) => e.path))
  })

  test('count fidelity + pool cap', () => {
    expect(deriveValidationErrors('X', 5, sampleValues()).errors).toHaveLength(5)
    expect(deriveValidationErrors('X', 99, sampleValues()).errors).toHaveLength(RESOLVE_POOL.length)
  })

  test('errors are in pool (DOM) order and carry field/reason/section/path', () => {
    const { errors } = deriveValidationErrors('S260004NGW', 6, sampleValues())
    const poolIdx = errors.map((e) => RESOLVE_POOL.findIndex((p) => p.path === e.path))
    expect([...poolIdx].sort((x, y) => x - y)).toEqual(poolIdx)
    for (const e of errors) {
      expect(e.field).toMatch(/\*$/)
      expect(['Missing Mandatory', 'Invalid Data', 'Invalid Data Type']).toContain(e.reason)
      expect(['general', 'pickupDelivery']).toContain(e.section)
    }
  })

  test('mutateDraft blanks Missing Mandatory paths and corrupts the others', () => {
    const values = sampleValues()
    const { errors, mutateDraft } = deriveValidationErrors('S260004NGW', 8, values)
    const draft = mutateDraft(structuredClone(values))
    for (const e of errors) {
      const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)
      if (e.reason === 'Missing Mandatory') expect(get(draft, e.path)).toBe('')
      else expect(get(draft, e.path)).toBeTruthy() // corrupted, not blanked
    }
  })

  test('isResolved: blank fails, filled passes; corrupted value fails until changed', () => {
    const values = sampleValues()
    const { errors, mutateDraft, isResolved } = deriveValidationErrors('S260004NGW', 8, values)
    const draft = mutateDraft(structuredClone(values))
    const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)
    for (const e of errors) {
      expect(isResolved(e, get(draft, e.path))).toBe(false)
      if (e.reason === 'Missing Mandatory') expect(isResolved(e, 'fixed')).toBe(true)
      if (e.reason === 'Invalid Data') expect(isResolved(e, 'DIFFERENT-VALUE')).toBe(true)
      if (e.reason === 'Invalid Data Type') {
        expect(isResolved(e, 'still-letters')).toBe(false)
        expect(isResolved(e, '+1 555 0100')).toBe(true)
      }
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run apps/odyssey-one/src/components/orders/resolve/validationErrors.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

```js
// apps/odyssey-one/src/components/orders/resolve/validationErrors.js
/**
 * Deterministic derive+seed error generator for the OIF resolution behavior
 * (LINX-11137). Seeded by order number so the Validation Errors tab's
 * errorCount and the resolution view always agree. This module is the seam a
 * real OIF endpoint replaces when LINX-11137 leaves Analysis (Q3).
 *
 * Three AC categories:
 * - Missing Mandatory  → field blanked in the hydrated draft (data agrees)
 * - Invalid Data       → value present but wrong (TMS-master mismatch stand-in);
 *                        resolved when the user CHANGES it
 * - Invalid Data Type  → corrupted value (letters in a phone); resolved when
 *                        the value parses again
 */

// Pool order = DOM order (top of the form → bottom), so "Error 1/N" reads
// naturally. Labels match the field labels on screen (mock 6005:39544).
export const RESOLVE_POOL = [
  { path: 'general.equipment',      field: 'Equipment *',      section: 'general', reason: 'Invalid Data' },
  { path: 'general.freightTerm',    field: 'Freight Term *',   section: 'general', reason: 'Missing Mandatory' },
  { path: 'general.shipDirection',  field: 'Ship Direction *', section: 'general', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignor.idOrgName',    field: 'Shipper ID/Org Name *', section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignor.address1',     field: 'Shipper Address 1 *',   section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignor.city',         field: 'Shipper City *',        section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignor.state',        field: 'Shipper State *',       section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignor.postal',       field: 'Shipper Postal Code *', section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignor.contactPhone', field: 'Shipper Phone Number *', section: 'pickupDelivery', reason: 'Invalid Data Type' },
  { path: 'pickupDelivery.consignee.idOrgName',    field: 'Destination ID/Org Name *', section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignee.address1',     field: 'Destination Address 1 *',   section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignee.city',         field: 'Destination City *',        section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignee.state',        field: 'Destination State *',       section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignee.postal',       field: 'Destination Postal Code *', section: 'pickupDelivery', reason: 'Missing Mandatory' },
  { path: 'pickupDelivery.consignee.contactPhone', field: 'Destination Phone Number *', section: 'pickupDelivery', reason: 'Invalid Data Type' },
]

const INVALID_EQUIPMENT_FALLBACK = 'SUTU3456789' // mock 5711:16403's bad value
const CORRUPT_PHONE = 'not-a-number'

// Tiny deterministic PRNG (xmur3 hash → mulberry32). No app-wide util exists;
// keep it local — the generator uses faker seeding, not reusable here.
function seededRandom(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = (h ^= h >>> 16) >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}
function setPath(obj, path, value) {
  const keys = path.split('.')
  const last = keys.pop()
  const target = keys.reduce((o, k) => o[k], obj)
  target[last] = value
}

export function deriveValidationErrors(orderNumber, errorCount, values) {
  const rand = seededRandom(String(orderNumber))
  const count = Math.max(1, Math.min(errorCount || 3, RESOLVE_POOL.length))

  // Fisher-Yates pick of `count` pool entries, then restore DOM order.
  const idx = RESOLVE_POOL.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  const chosen = idx.slice(0, count).sort((a, b) => a - b)

  const errors = chosen.map((i) => {
    const p = RESOLVE_POOL[i]
    const original = getPath(values, p.path)
    // Invalid Data keeps a visible-but-wrong value; remember what "wrong" is.
    const badValue =
      p.reason === 'Invalid Data' ? (original || INVALID_EQUIPMENT_FALLBACK)
      : p.reason === 'Invalid Data Type' ? CORRUPT_PHONE
      : ''
    return { ...p, badValue }
  })

  const mutateDraft = (draft) => {
    for (const e of errors) {
      if (e.reason === 'Missing Mandatory') setPath(draft, e.path, '')
      else setPath(draft, e.path, e.badValue)
    }
    return draft
  }

  const isResolved = (error, currentValue) => {
    const v = (currentValue ?? '').trim()
    if (!v) return false
    if (error.reason === 'Invalid Data') return v !== error.badValue
    if (error.reason === 'Invalid Data Type') return !/[a-z]/i.test(v)
    return true // Missing Mandatory: any non-blank value
  }

  return { errors, mutateDraft, isResolved }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run apps/odyssey-one/src/components/orders/resolve/validationErrors.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/components/orders/resolve/
git commit -m "feat(orders): deriveValidationErrors — deterministic OIF error seeding (LINX-11137 seam)"
```

---

### Task 2: ComboBox `search-field--validated` root class

The resolve CSS lock (Task 4) re-enables fields by state class; ComboBox exposes `search-field--error` but not a validated equivalent.

**Files:**
- Modify: `packages/ui/src/ComboBox.jsx` (typeahead-branch root className, ~line 600)
- Test: `packages/ui/src/ComboBox.typeahead.test.jsx` (extend the validated test)

- [ ] **Step 1: Extend the existing validated test**

In `ComboBox.typeahead.test.jsx`, inside the test `'validated renders success border, check icon, and Validated line; error wins'`, after the first `expect(getByText('Validated')).toBeTruthy()` add:

```js
    expect(container.querySelector('.search-field--validated')).toBeTruthy()
```

and after the rerender with `error="Invalid Data"`:

```js
    expect(container.querySelector('.search-field--validated')).toBeNull()
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run packages/ui/src/ComboBox.typeahead.test.jsx`
Expected: FAIL — `.search-field--validated` not found.

- [ ] **Step 3: Implement**

In `ComboBox.jsx`, the typeahead-mode return's root className currently reads:

```jsx
className={`search-field${error ? ' search-field--error' : ''} ${className}`.trim()}
```

Replace with (note `isValidated` is already computed above the helper fragments):

```jsx
className={`search-field${error ? ' search-field--error' : ''}${isValidated ? ' search-field--validated' : ''} ${className}`.trim()}
```

Apply the same two-state suffix to the other two return branches' root `className` (`search-field ${className}` → same template) so plain/slot modes carry the classes too.

- [ ] **Step 4: Run tests**

Run: `npx vitest run packages/ui/src/ComboBox.typeahead.test.jsx packages/ui/src/ComboBox.conformance.test.jsx`
Expected: PASS

- [ ] **Step 5: Re-demote ComboBox (post-approval modification rule) + commit**

ComboBox meta is `normalizing: true, approved: true` (GATE B stamped earlier today). A contract-level change resets it:

```bash
node tools/dsm-flags.mjs --demote ComboBox 2>/dev/null || true
```

If the script fails on the Angular-name mismatch (known: twin is `search-field`), hand-edit instead: in `apps/odyssey-one/src/routes/design-system/demos/ComboBox.demo.jsx` meta remove `approved: true` (keep `normalizing: true`). The Angular `search-field.demo.meta.ts` is already `normalizing: true` — leave it.

```bash
git add packages/ui/src/ComboBox.jsx packages/ui/src/ComboBox.typeahead.test.jsx apps/odyssey-one/src/routes/design-system/demos/ComboBox.demo.jsx
git commit -m "feat(ui): ComboBox state classes search-field--validated on all branches (resolve-mode CSS hook)"
```

---

### Task 3: Resolve entry plumbing — route param, hydration, chrome swap

**Files:**
- Modify: `apps/odyssey-one/src/routes/orders/OrdersRoute.jsx:191-201` (Resolve navigation)
- Modify: `apps/odyssey-one/src/routes/orders/CreateOrderRoute.jsx` (read `?resolve=`)
- Modify: `apps/odyssey-one/src/components/orders/create/CreateOrderForm.jsx` (resolve hydration + header/footer swap; Alert/fields come in Tasks 4-5)
- Create: `apps/odyssey-one/src/components/orders/resolve/ResolveModeContext.jsx`
- Test: `apps/odyssey-one/src/components/orders/resolve/resolve.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// apps/odyssey-one/src/components/orders/resolve/resolve.test.jsx
// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CreateOrderRoute from '../../../routes/orders/CreateOrderRoute.jsx'
import { __resetOrderWriteState } from '../../../api/services/orderService'

// An order number present in the seeded mock data with draftOrderStatus Ready.
// Discover one at execution time: any row from the validation-errors tab works —
// grep orders.json for '"draftOrderStatus": "Ready"' and use its orderNumber.
const ORDER = 'REPLACE_WITH_SEEDED_READY_ORDER'

function renderResolve(orderNumber = ORDER, state = { errorCount: 5, customer: 'ACME', orderSource: 'Integrated' }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[{ pathname: '/orders/create', search: `?resolve=${orderNumber}`, state }]}>
        <Routes>
          <Route path="/orders/create" element={<CreateOrderRoute />} />
          <Route path="/orders" element={<div>orders list</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => __resetOrderWriteState())

describe('resolve mode — chrome', () => {
  test('renders the resolution title, order-number sub-heading, and back link', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByText('Order Validation Error Resolution')).toBeTruthy())
    expect(screen.getByText(`Order Number ${ORDER}`)).toBeTruthy()
    expect(screen.getByText('Back to overview page')).toBeTruthy()
  })

  test('footer shows Cancel / Purge / Save (no Create Order button)', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByText('Order Validation Error Resolution')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Purge' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Create Order' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run apps/odyssey-one/src/components/orders/resolve/resolve.test.jsx`
Expected: FAIL — resolution title not rendered.

- [ ] **Step 3: Create ResolveModeContext**

```jsx
// apps/odyssey-one/src/components/orders/resolve/ResolveModeContext.jsx
import { createContext, useContext } from 'react'

/**
 * Resolve-mode plumbing (LINX-11137 behavior). Inactive (null) in the normal
 * create/edit flow — useResolveField then returns {} so every field call site
 * is a zero-cost spread.
 *
 * Active value shape (built in CreateOrderForm):
 *   { errorByPath: Map<path, error>, resolvedSet: Set<path> }
 */
const ResolveModeContext = createContext(null)
export const ResolveModeProvider = ResolveModeContext.Provider

export function useResolveMode() {
  return useContext(ResolveModeContext)
}

/**
 * Per-field prop injection. Spread LAST at a call site so it wins:
 *   <ComboBox ... error={fieldState.error?.message} {...resolveField('general.equipment')} />
 * - not in resolve mode → {}
 * - pool field, unresolved → { error: <category reason> } (mock-conformant copy)
 * - pool field, resolved   → { error: undefined, validated: true }
 * - non-pool field in resolve mode → {} (the blanket CSS lock handles it)
 */
export function useResolveField(path) {
  const ctx = useContext(ResolveModeContext)
  if (!ctx) return {}
  const err = ctx.errorByPath.get(path)
  if (!err) return {}
  return ctx.resolvedSet.has(path)
    ? { error: undefined, validated: true }
    : { error: err.reason, validated: false }
}
```

- [ ] **Step 4: CreateOrderRoute — read the param**

In `CreateOrderRoute.jsx`, next to the existing `searchParams.get('draft')` read, add `const resolveKey = searchParams.get('resolve')` and pass `resolveKey={resolveKey}` through to `<CreateOrderForm />` (alongside `draftKey`). Also import `useLocation` and pass `resolveMeta={location.state}` (the row's `{ errorCount, customer, orderSource }`; may be undefined on a direct URL).

- [ ] **Step 5: CreateOrderForm — resolve hydration + state**

In `CreateOrderForm.jsx` (signature becomes `{ draftKey, resolveKey, resolveMeta, onSubmitted }`):

```jsx
import { deriveValidationErrors } from '../resolve/validationErrors.js'
import { ResolveModeProvider } from '../resolve/ResolveModeContext.jsx'

// state near the other useState calls:
const [resolveState, setResolveState] = useState(null) // { errors, isResolved, contextText }
const resolveMode = !!resolveKey

// hydration effect, alongside the existing draftKey effect:
useEffect(() => {
  if (!resolveKey) return
  getOrderView(resolveKey).then((values) => {
    if (!values) return
    const errorCount = resolveMeta?.errorCount ?? 3
    const { errors, mutateDraft, isResolved } = deriveValidationErrors(resolveKey, errorCount, values)
    reset(mutateDraft(structuredClone(values)))
    const source = resolveMeta?.customer ? ` · Integrated from ${resolveMeta.customer}` : ''
    setResolveState({ errors, isResolved, contextText: `${resolveKey}${source}` })
  })
}, [resolveKey])  // eslint-disable-line react-hooks/exhaustive-deps

// live resolution: watch all pool paths, recompute resolved set (Task 5 uses it)
const watchedAll = useWatch({ control })
const resolvedSet = useMemo(() => {
  if (!resolveState) return new Set()
  const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)
  return new Set(
    resolveState.errors
      .filter((e) => resolveState.isResolved(e, get(watchedAll, e.path)))
      .map((e) => e.path),
  )
}, [resolveState, watchedAll])
const errorByPath = useMemo(
  () => new Map((resolveState?.errors ?? []).map((e) => [e.path, e])),
  [resolveState],
)
const allResolved = !!resolveState && resolvedSet.size === resolveState.errors.length
```

Wrap the rendered form content in the provider (immediately inside `FormProvider`):

```jsx
<ResolveModeProvider value={resolveMode ? { errorByPath, resolvedSet } : null}>
  {/* existing content */}
</ResolveModeProvider>
```

- [ ] **Step 6: Chrome swap — header + footer**

Header (192-208 region): in resolve mode replace the breadcrumb second label with `"Order Validation Error Resolution"` and the PageHeader block with:

```jsx
{resolveMode ? (
  <div className="co-resolve-header">
    <div>
      <PageHeader title="Order Validation Error Resolution" />
      <p className="text-label-sm-regular co-resolve-subheading">Order Number {resolveKey}</p>
    </div>
    <Button variant="link" className="btn--link-black" iconLeft={<ArrowLeft {...ICON_MD} />} onClick={() => navigate('/orders')}>
      Back to overview page
    </Button>
  </div>
) : (
  /* existing PageHeader block unchanged */
)}
```

(`ArrowLeft` from lucide-react, `ICON_MD` from `@odyssey/tokens`; `navigate` already exists in the file. If `PageHeader` doesn't accept a bare title this way, reuse the exact existing PageHeader usage with the new title and put the sub-heading `<p>` after it. Add `.co-resolve-header { display:flex; justify-content:space-between; align-items:flex-start; }` and `.co-resolve-subheading { color: var(--text-secondary); margin: var(--spacing-1) 0 0; }` to `create-order.css`.)

Keep the warning banner (`bannerOpen`) OUT of resolve mode: `{!resolveMode && bannerOpen && (...)}`.

Footer: replace the StickyFooter call site with a conditional:

```jsx
{resolveMode ? (
  <StickyFooter
    cancelLabel="Cancel"
    saveLabel="Purge"
    primaryLabel="Save"
    showSave
    onCancel={() => navigate('/orders')}
    onSave={() => setPurgeOpen(true)}
    onCreate={handleResolveSave}          /* implemented in Task 6; stub as no-op () => {} for now */
    createDisabled={!allResolved}
  />
) : (
  /* existing StickyFooter unchanged */
)}
```

Add `const [purgeOpen, setPurgeOpen] = useState(false)` now (modal renders in Task 6). Check `StickyFooter.jsx`'s actual prop names first (it wraps StepperButtonsFooter — if it hardcodes `primaryLabel="Create Order"` / labels, add pass-through props `primaryLabel`, `saveLabel`, `cancelLabel` with those defaults so the create flow is untouched).

Also: in resolve mode skip the create-mode navbar context (`useCreateOrderMode` enter/exit at 145-151) — guard those effects with `if (resolveMode) return`.

- [ ] **Step 7: OrdersRoute — wire Resolve**

Replace the commented no-op in `OrdersRoute.jsx:191-201`:

```js
else if (action === 'Resolve')
  navigate(`/orders/create?resolve=${encodeURIComponent(row.id)}`, {
    state: { errorCount: row.errorCount, customer: row.customer, orderSource: row.orderSource },
  })
```

- [ ] **Step 8: Fill the test's ORDER constant + run**

Find a seeded Ready order: `grep -l '"draftOrderStatus": *"Ready"' apps/odyssey-one/src/data/orders*` then extract one orderNumber (or query `getAllOrders()` in a scratch node script). Replace `REPLACE_WITH_SEEDED_READY_ORDER`.

Run: `npx vitest run apps/odyssey-one/src/components/orders/resolve/resolve.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 9: Full suite guard + commit**

Run: `npx vitest run` — Expected: all pass (create/edit flows untouched).

```bash
git add apps/odyssey-one/src apps/odyssey-one/src/components/orders/resolve/
git commit -m "feat(orders): resolve-mode entry — ?resolve= route param, hydration+seeding, chrome swap, Resolve navigation"
```

---

### Task 4: Field prop injection + blanket CSS lock

**Files:**
- Modify: `apps/odyssey-one/src/components/orders/create/sections/GeneralInformationSection.jsx` (3 call sites: ~152, ~172, ~195)
- Modify: `apps/odyssey-one/src/components/orders/create/sections/AddressFields.jsx` (3 factories)
- Modify: `apps/odyssey-one/src/components/orders/create/sections/ContactFields.jsx` (1 factory)
- Modify: `apps/odyssey-one/src/components/orders/create/CreateOrderForm.jsx` (`co-resolve` wrapper class)
- Modify: `apps/odyssey-one/src/components/orders/create/create-order.css`
- Test: extend `resolve.test.jsx`

- [ ] **Step 1: Write the failing tests**

Append to `resolve.test.jsx`:

```jsx
import { fireEvent } from '@testing-library/react'
import { deriveValidationErrors } from './validationErrors.js'

describe('resolve mode — fields', () => {
  test('seeded error fields render the category reason; fixing one flips it to Validated', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByText('Order Validation Error Resolution')).toBeTruthy())
    // Derivation is deterministic — recompute to know what to assert.
    const { getOrderView } = await import('../../../api/services/orderService')
    const values = await getOrderView(ORDER)
    const { errors } = deriveValidationErrors(ORDER, 5, values)
    const missing = errors.find((e) => e.reason === 'Missing Mandatory')
    expect(missing).toBeTruthy()
    // Its category reason is visible under the field.
    expect(screen.getAllByText(missing.reason).length).toBeGreaterThan(0)
    // Fix it: the field input carries the id co-<path dashed>.
    const input = document.getElementById(`co-${missing.path.replace(/\./g, '-')}`)
    expect(input).toBeTruthy()
    if (input.tagName === 'INPUT' && !input.readOnly) {
      fireEvent.change(input, { target: { value: 'FIXED' } })
      fireEvent.blur(input)
      await waitFor(() => expect(screen.getAllByText('Validated').length).toBeGreaterThan(0))
    }
  })

  test('form body carries the co-resolve lock class', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByText('Order Validation Error Resolution')).toBeTruthy())
    expect(document.querySelector('.co-resolve')).toBeTruthy()
  })
})
```

Note: if the deterministic pick for ORDER yields no ComboBox-free Missing Mandatory field reachable via plain input, pick a different seeded ORDER whose derivation includes e.g. `address1` (plain FormField) — check with a scratch run of `deriveValidationErrors(ORDER, 5, ...)` first and keep the constant.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run apps/odyssey-one/src/components/orders/resolve/resolve.test.jsx`
Expected: the two new tests FAIL.

- [ ] **Step 3: Inject at the 7 sites**

GeneralInformationSection — the three Controllers (`general.equipment`, `general.freightTerm`, `general.shipDirection`): import `{ useResolveField }` won't work per-field inside render props cleanly as a hook — instead call it at component top:

```jsx
import { useResolveMode } from '../../resolve/ResolveModeContext.jsx'
// top of the component:
const resolve = useResolveMode()
const resolveProps = (path) => {
  if (!resolve) return {}
  const err = resolve.errorByPath.get(path)
  if (!err) return {}
  return resolve.resolvedSet.has(path)
    ? { error: undefined, validated: true }
    : { error: err.reason, validated: false }
}
```

(Delete the `useResolveField` hook from ResolveModeContext.jsx and export this logic instead as `export function resolveFieldProps(ctx, path)` so sections share one implementation: `const resolveProps = (path) => resolveFieldProps(resolve, path)`. Keep `useResolveMode` as the only hook.)

Then spread LAST on each of the three components:

```jsx
<ComboBox
  id="co-general-equipment"
  ...existing props...
  error={fieldState.error?.message}
  {...resolveProps('general.equipment')}
/>
```

AddressFields — same import + `resolveProps` helper at top; in each of the three factories (`text`, `select`, `combo`) add `{...resolveProps(`${basePath}.${name}`)}` as the LAST prop of the FormField/ComboBox.

ContactFields — same, in the single `field` factory.

- [ ] **Step 4: The blanket CSS lock**

In `CreateOrderForm.jsx`, add the class to the sections wrapper (the element containing the four Accordions): `className={...existing + (resolveMode ? ' co-resolve' : '')}`.

In `create-order.css`:

```css
/* === Resolve mode (LINX-11137) — read-only blanket ======================
   Everything inside accordion content is locked; fields carrying an
   error/validated state class stay interactive (they're the ones the user
   must fix). Accordion headers stay clickable (outside __content). */
.co-resolve .accordion__content :is(input, button, textarea, select, [role='checkbox']) {
  pointer-events: none;
}
.co-resolve .accordion__content
  :is(.form-field--error, .form-field--validated, .search-field--error, .search-field--validated)
  :is(input, button) {
  pointer-events: auto;
}
/* Muted read-only look for locked fields (inline bg on ComboBox bars wins
   over a plain background rule, so use opacity — reads as disabled). */
.co-resolve .accordion__content .form-field:not(.form-field--error):not(.form-field--validated),
.co-resolve .accordion__content .search-field:not(.search-field--error):not(.search-field--validated) {
  opacity: 0.6;
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run apps/odyssey-one/src/components/orders/resolve/resolve.test.jsx`
Expected: PASS. Then `npx vitest run` — full suite green (the spreads return `{}` outside resolve mode).

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/src
git commit -m "feat(orders): resolve-mode field injection (error/validated) + read-only blanket lock"
```

---

### Task 5: Alert + Accordion wiring — list, navigation, docked morph

**Files:**
- Modify: `apps/odyssey-one/src/components/orders/create/CreateOrderForm.jsx`
- Modify: `apps/odyssey-one/src/components/orders/create/create-order.css`
- Test: extend `resolve.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
describe('resolve mode — alert + accordions', () => {
  test('validation alert lists the open errors with context', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByText(/Errors: Validation Required/)).toBeTruthy())
    expect(screen.getByText(/5 Errors: Validation Required/)).toBeTruthy()
    expect(screen.getByText(/Integrated from ACME/)).toBeTruthy()
    expect(screen.getByText('Validate Errors')).toBeTruthy()
  })

  test('sections with errors show the red error badge', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByText(/Errors: Validation Required/)).toBeTruthy())
    // At least one Accordion badge "N Error(s)" renders (derivation always
    // hits general and/or pickupDelivery).
    expect(screen.getAllByText(/^\d+ Errors?$/).length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run apps/odyssey-one/src/components/orders/resolve/resolve.test.jsx`
Expected: new tests FAIL.

- [ ] **Step 3: Implement the Alert block**

In `CreateOrderForm.jsx`, resolve-mode state additions:

```jsx
const [alertDocked, setAlertDocked] = useState(false)
const [alertExpanded, setAlertExpanded] = useState(true)
const [errorIndex, setErrorIndex] = useState(0)
const alertSentinelRef = useRef(null)

// Alert props: errors with live resolved flags, ORIGINAL-array indices.
const alertErrors = useMemo(
  () => (resolveState?.errors ?? []).map((e) => ({
    field: e.field,
    reason: e.reason,
    resolved: resolvedSet.has(e.path),
  })),
  [resolveState, resolvedSet],
)

const handleErrorNav = (i) => {
  const err = resolveState.errors[i]
  if (!err) return
  setErrorIndex(i)
  // Section must be expanded before the field can be scrolled to.
  setExpanded((prev) => ({ ...prev, [err.section]: true }))
  requestAnimationFrame(() => {
    const el = document.getElementById(`co-${err.path.replace(/\./g, '-')}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el?.focus?.()
  })
}

// Dock when the inline alert position scrolls out of view (sentinel pattern).
useEffect(() => {
  if (!resolveMode || !alertSentinelRef.current) return
  const obs = new IntersectionObserver(([entry]) => setAlertDocked(!entry.isIntersecting))
  obs.observe(alertSentinelRef.current)
  return () => obs.disconnect()
}, [resolveMode, resolveState])
```

JSX, rendered between the header and the accordions (only in resolve mode, when `resolveState` is set):

```jsx
{resolveMode && resolveState && (
  <>
    <div ref={alertSentinelRef} aria-hidden="true" />
    <div className={alertDocked ? 'co-resolve-alert co-resolve-alert--docked' : 'co-resolve-alert'}>
      <Alert
        errors={alertErrors}
        contextText={resolveState.contextText}
        expanded={alertDocked ? false : alertExpanded}
        onToggle={setAlertExpanded}
        docked={alertDocked}
        errorIndex={errorIndex}
        onErrorNav={handleErrorNav}
        className={allResolved ? 'co-resolve-alert--done' : ''}
      />
    </div>
  </>
)}
```

`Alert` is already imported (warning banner uses it).

CSS in `create-order.css`:

```css
/* Sticky wrapper for the resolve alert: in flow at the top; when the sentinel
   above it leaves the viewport the alert morphs to the docked bar and sticks
   under the navbar. -32px offsets the AppShell content padding (same trick
   as .orders-toolbar). Full-bleed while docked. */
.co-resolve-alert {
  position: sticky;
  top: calc(-1 * var(--spacing-8));
  z-index: 5;
}
.co-resolve-alert--docked {
  margin-inline: calc(-1 * var(--spacing-8));
}
/* All resolved: the docked bar flips to the success tint (mock 6146:22632). */
.co-resolve-alert--done.alert--validation {
  background: var(--status-success-message);
}
```

Note: `co-resolve-alert--done` is passed to the Alert's own `className` so the override targets the `.alert--validation` element itself. When all errors are resolved the Alert renders "N out of N errors resolved" in docked mode automatically (resolved flags drive it) — only the tint needs the override. Verify the exact success-tint variable renders correctly against `.alert--error`'s specificity; if it loses, use `.co-resolve-alert--done.alert--error.alert--validation`.

- [ ] **Step 4: Accordion status override**

Where the four Accordions render `status={status.X ? 'on' : 'off'}` (lines ~231-281), compute per-section resolve counts first:

```jsx
const sectionErrorInfo = useMemo(() => {
  const info = { general: { total: 0, open: 0 }, pickupDelivery: { total: 0, open: 0 } }
  for (const e of resolveState?.errors ?? []) {
    info[e.section].total += 1
    if (!resolvedSet.has(e.path)) info[e.section].open += 1
  }
  return info
}, [resolveState, resolvedSet])

const accordionStatus = (key) => {
  if (resolveMode && sectionErrorInfo[key]?.total) {
    return sectionErrorInfo[key].open > 0 ? 'error' : 'on'
  }
  return status[key] ? 'on' : 'off'
}
const accordionErrorCount = (key) =>
  resolveMode ? (sectionErrorInfo[key]?.total ?? 0) : 0
```

Each Accordion becomes `status={accordionStatus('general')} errorCount={accordionErrorCount('general')}` etc. (products/specialServices have no pool entries → `errorCount 0`, normal derived status → unchanged rendering).

Initial expansion in resolve mode: sections WITH errors expanded, without collapsed — in the resolve hydration effect (Task 3), after `setResolveState(...)`:

```jsx
const secs = new Set(errors.map((e) => e.section))
setExpanded({
  general: secs.has('general'),
  pickupDelivery: secs.has('pickupDelivery'),
  products: false,
  specialServices: false,
})
```

(Match the actual `expanded` state shape already in the file.)

- [ ] **Step 5: Run tests**

Run: `npx vitest run apps/odyssey-one/src/components/orders/resolve/resolve.test.jsx` → PASS.
Full suite: `npx vitest run` → green.

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/src
git commit -m "feat(orders): resolve-mode Alert (list→docked stepper, error nav) + per-section error badges"
```

---

### Task 6: Save / Purge / Cancel — the transition

**Files:**
- Modify: `apps/odyssey-one/src/api/services/orderService.ts` (add `resolveOrder`)
- Modify: `apps/odyssey-one/src/components/orders/create/CreateOrderForm.jsx` (wire Save/Purge + modal)
- Test: extend `resolve.test.jsx` + `apps/odyssey-one/src/api/services/orderService` test file if one exists (check `orderService.test.ts` / co-located tests; if none, service coverage rides through the RTL test)

- [ ] **Step 1: Write the failing tests**

```jsx
describe('resolve mode — save/purge transition', () => {
  test('Purge: confirm modal → order status flips to Ready For Plan (leaves VE tab)', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByText('Order Validation Error Resolution')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Purge' }))
    expect(await screen.findByText('Are you sure you want to purge this Order?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    // Navigates back to the list
    await waitFor(() => expect(screen.getByText('orders list')).toBeTruthy())
    // Overlay row shadows the base: status no longer a VE status
    const { getOrderList } = await import('../../../api/services/orderService')
    const ve = await getOrderList({ tab: 'validation-errors', page: 1, pageSize: 100 })
    expect(ve.rows.find((r) => r.orderNumber === ORDER)).toBeUndefined()
  })

  test('Save is disabled until all errors are resolved', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByText('Order Validation Error Resolution')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true)
  })
})
```

Adjust the `getOrderList` request shape to the real signature (check `useOrderList`'s request object — tab/status filters may be expressed as `{ statuses }`; assert on whatever the service actually takes, the point is: ORDER is absent from the VE-filtered rows and present in All with status `'Ready For Plan'`).

- [ ] **Step 2: Run to verify failure** — the Purge test fails (no modal), Save-disabled may already pass from Task 3's `createDisabled={!allResolved}` (fine).

- [ ] **Step 3: Service function**

In `orderService.ts`, next to `submitDraftOrder`/`cancelOrder` (~line 209):

```ts
/** OIF resolution (LINX-11137): Save-with-all-resolved and Purge both send the
 * order to the re-processing queue → 'Ready For Plan' (existing app vocabulary
 * for the AC's "Ready for Planning"). Status flip alone moves it out of the
 * Validation Errors tab (status-filtered) and into All. */
export async function resolveOrder(orderNumber: string): Promise<void> {
  overlayUpdateStatus(orderNumber, 'Ready For Plan')
}
```

(Mock-only like its siblings; if `submitDraftOrder`/`cancelOrder` have a live-mode branch, mirror their pattern — check before writing.)

- [ ] **Step 4: Wire Save + Purge in CreateOrderForm**

```jsx
import ModalMedium from ... // check existing import path used by DiscardSaveModal / OrdersRoute
import { resolveOrder } from '../../../api/services/orderService'
import { useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()
const finishResolve = async () => {
  await resolveOrder(resolveKey)
  queryClient.invalidateQueries({ queryKey: ['order-list'] })
  queryClient.invalidateQueries({ queryKey: ['order-tab-counts'] }) // check the real key used by getOrderTabCounts' hook
  navigate('/orders')
}
const handleResolveSave = () => finishResolve()   // replaces the Task 3 stub
```

Purge modal JSX (near the existing DiscardSaveModal):

```jsx
{purgeOpen && (
  <ModalMedium
    title="Confirmation"
    onClose={() => setPurgeOpen(false)}
    ariaLabel="Purge order confirmation"
    footer={<>
      <Button variant="secondary" size="lg" onClick={() => setPurgeOpen(false)}>Cancel</Button>
      <Button variant="primary" size="lg" onClick={() => { setPurgeOpen(false); finishResolve() }}>Yes</Button>
    </>}
  >
    <p className="text-label-sm-regular">Are you sure you want to purge this Order?</p>
  </ModalMedium>
)}
```

- [ ] **Step 5: Run tests** — `npx vitest run apps/odyssey-one/src/components/orders/resolve/resolve.test.jsx` → PASS; full `npx vitest run` → green.

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/src
git commit -m "feat(orders): resolve Save/Purge — status transition via overlay, Purge confirm modal (LINX-11137 statuses)"
```

---

### Task 7: Full verification + browser QA

**Files:** none new (fixes only if QA finds issues)

- [ ] **Step 1: Full test suite + build**

Run: `npx vitest run` → all green (expect ~555+).
Run: `npm run build:odyssey-one` (repo root) → clean.

- [ ] **Step 2: Browser QA via puppeteer-core (real Chrome, S96 pattern)**

Start dev (`npm run dev:odyssey-one`), then drive: `/orders` → Validation Errors tab → click an enabled Resolve → verify: title/sub-heading/back-link; alert count matches the row's Errors Count; expanded list rows; click a row → scrolls + focuses the field + alert docks with `← Error i/N →`; fix a Missing Mandatory field → field flips green Validated, alert count drops, section badge flips at 0 open; fix all → docked bar shows N/N + success tint, Save enables; Save → back on list, row gone from VE tab, visible in All as Ready For Plan. Repeat once with Purge (no fixing). Screenshot the docked-red, docked-green, and validated-field states.

- [ ] **Step 3: Commit any QA fixes**

```bash
git add -A && git commit -m "fix(orders): resolve-mode QA round"
```

---

## Self-review notes (done at write time)

- **Spec coverage:** entry/gating (T3 §7 — gating pre-existed), error definition + 3 categories (T1), only-error-fields-editable (T4), immediate re-validation + validated flip (T4), alert list/nav/docked + counts (T5), accordion badges + expansion (T5), Save gating + Purge modal + transition (T6), Back link + title + sub-heading (T3), out-of-scope items unchanged. Product-grid errors: deliberately deferred (header deviation note).
- **Types:** `resolveProps` shared as `resolveFieldProps(ctx, path)` (T4 supersedes T3's `useResolveField` — T4 Step 3 deletes it); `resolveState={errors,isResolved,contextText}` consistent across T3/T5/T6; DOM-id convention `co-<path dashed>` used in T1 pool paths ↔ T4/T5 lookups.
- **Known soft spots for the executor:** exact `expanded` state shape in CreateOrderForm (match the file), StickyFooter label pass-through (check before editing), `getOrderList` request shape in the T6 test, ORDER constant must be a seeded Ready row whose derivation includes a plain-input field (verify with a scratch run).
