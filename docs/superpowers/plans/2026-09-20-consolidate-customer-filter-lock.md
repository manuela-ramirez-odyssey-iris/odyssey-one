# Consolidate mode — the customer lock becomes a locked FILTER

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** In consolidate mode the anchor customer stops being a private query override and becomes a real, visible **customer filter chip** in the search bar — the same filtering the planner already uses — locked so it can never hold two customers while rows are selected.

**Why:** user, 2026-09-20 — *"the customer selection will be applied at filter level, so is reusing the same filtering functionality we have… This way we gave user more clarity that we are filtering a customer"*, and *"I wanna make sure we dont bypass the rule of only one customer filtering in consol mode."*

**Architecture:** S154 shipped the lock as `effectiveCustomerIds`, a route-private override of `listParams.customerIds`. That override is **deleted**. Instead the route hands `ShipmentsGlobalSearch` a `lockedChip`; the bar guarantees that chip is present, committed, and unremovable while it is set. Because the table, the category counts and the search glimpse all already consume `searchCriteria`, filtering by chip needs no new query plumbing — it is a net deletion in the route.

**Decision taken (user, 2026-09-20):** when rows are selected the customer chip is **locked** — no X, not editable in the Filters panel, immune to Backspace. To change customer the planner clears the selection. The rule is unbypassable because the control is not offered.

**Behaviour, precisely**

| Moment | Behaviour |
|---|---|
| Enter consolidate mode | Existing committed filters are **preserved untouched** — including a customer filter holding any number of customers. No chip is added; nothing is locked yet. |
| First row checked | The customer filter is **set to exactly the anchor's customer** and locked. If a customer filter already held two or more customers, it is narrowed to the anchor's. If none existed, one is added. |
| Further rows checked | No change — every selectable row already belongs to the anchor customer. |
| Selection cleared (last row unchecked) | The chip unlocks and the **pre-selection customer filter is restored** — the two-customer filter comes back if that is what was there, and the added chip disappears if there was none. Symmetric with how leaving the mode restores sort and view. |
| Cancel / leave the mode | Same restore as above, plus the existing sort/view restore. |
| Planner edits filters while locked | The customer filter is disabled in the Filters panel and its chip has no X. Every other filter stays fully editable. |

**Tech:** React 18, TanStack Query/Table, the existing `useGlobalSearch` chip state and `criteria-core` matcher. `packages/ui/src/GlobalSearch.jsx` is touched — it is **not** a normalized component (`project_global_search_no_normalize_v1`: GlobalSearch v1 skips normalization until the API stabilises), so no DSM cycle is triggered. `SearchChip.jsx` is **not** touched.

**Conventions:** run tests from `apps/odyssey-one` (`npx vitest run <path>`); commit subjects start with `S154: `; stage by explicit path only.

---

## File map

| File | Change |
|---|---|
| `packages/ui/src/GlobalSearch.jsx` | a chip with `locked: true` renders no X and is skipped by Backspace-removal |
| `apps/odyssey-one/src/search/useGlobalSearch.js` | `onChipRemove` refuses a locked chip; new `setLockedChip(chip \| null)` mutator |
| `apps/odyssey-one/src/components/global-search/ShipmentsGlobalSearch.jsx` | `lockedChip` prop → applied to chip state + committed; `lockedKeys` passed to the Filters view |
| `apps/odyssey-one/src/components/global-search/ShipmentsFiltersView.jsx` | a locked attribute's control is disabled and cannot be edited/cleared |
| `apps/odyssey-one/src/routes/shipments/ShipmentsRoute.jsx` | **delete** `effectiveCustomerIds`; derive `lockedChip` from the anchor; snapshot/restore the prior customer filter |
| `apps/odyssey-one/src/styles/components.css` | `.consolidate-customer` bottom margin bumped |

---

### Task 1: a locked chip cannot be removed

**Files:**
- Modify: `packages/ui/src/GlobalSearch.jsx`
- Modify: `apps/odyssey-one/src/search/useGlobalSearch.js`
- Test: `apps/odyssey-one/src/search/lockedChip.test.jsx` (new)

- [ ] **Step 1: Write the failing test**

```jsx
// apps/odyssey-one/src/search/lockedChip.test.jsx
// @vitest-environment jsdom
// A locked chip (consolidate mode's customer filter) must be unremovable by
// every route the bar offers: the X, Backspace, and the removal callback.
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { GlobalSearch } from '@odyssey/ui'

afterEach(cleanup)

const plain = { key: 'origin', label: 'Origin: Houston', kind: 'attribute' }
const locked = { key: 'customer-id', label: 'Customer ID: VALTRIS_01', kind: 'attribute', locked: true }

describe('GlobalSearch — locked chips', () => {
  test('a normal chip offers a remove button; a locked chip does not', () => {
    render(<GlobalSearch value="" chips={[plain, locked]} onChange={() => {}} onChipRemove={() => {}} />)
    expect(screen.getByRole('button', { name: 'Remove Origin: Houston' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Remove Customer ID/ })).toBeNull()
    // The chip itself still renders — it is a visible filter, just not a removable one.
    expect(screen.getByText('Customer ID: VALTRIS_01')).toBeTruthy()
  })

  test('Backspace on an empty input removes the last UNLOCKED chip, never a locked one', () => {
    const onChipRemove = vi.fn()
    render(<GlobalSearch value="" chips={[plain, locked]} onChange={() => {}} onChipRemove={onChipRemove} />)
    const input = screen.getByRole('textbox')
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(onChipRemove).toHaveBeenCalledWith('origin')
  })

  test('Backspace does nothing when every chip is locked', () => {
    const onChipRemove = vi.fn()
    render(<GlobalSearch value="" chips={[locked]} onChange={() => {}} onChipRemove={onChipRemove} />)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Backspace' })
    expect(onChipRemove).not.toHaveBeenCalled()
  })
})
```

Then a hook-level guard test in the same file:

```jsx
import { renderHook, act } from '@testing-library/react'
import { useGlobalSearch } from './useGlobalSearch'

describe('useGlobalSearch — locked chips', () => {
  test('onChipRemove refuses a locked chip and removes an unlocked one', () => {
    const { result } = renderHook(() => useGlobalSearch(null, { initialChips: [plain, locked] }))
    act(() => result.current.onChipRemove('customer-id'))
    expect(result.current.chips.map((c) => c.key)).toEqual(['origin', 'customer-id'])
    act(() => result.current.onChipRemove('origin'))
    expect(result.current.chips.map((c) => c.key)).toEqual(['customer-id'])
  })

  test('setLockedChip adds, replaces and clears the locked chip without disturbing others', () => {
    const { result } = renderHook(() => useGlobalSearch(null, { initialChips: [plain] }))
    act(() => result.current.setLockedChip(locked))
    expect(result.current.chips).toEqual([plain, expect.objectContaining({ key: 'customer-id', locked: true })])
    act(() => result.current.setLockedChip({ ...locked, label: 'Customer ID: KEMIRA_NA_01', queryValue: 'KEMIRA_NA_01' }))
    expect(result.current.chips.filter((c) => c.key === 'customer-id')).toHaveLength(1)
    expect(result.current.chips.find((c) => c.key === 'customer-id').label).toBe('Customer ID: KEMIRA_NA_01')
    act(() => result.current.setLockedChip(null))
    expect(result.current.chips).toEqual([plain])
  })
})
```

- [ ] **Step 2: Run it — expect failure**

`cd apps/odyssey-one && npx vitest run src/search/lockedChip.test.jsx`
Expected: FAIL — the locked chip still renders an X; `setLockedChip` is not a function.

- [ ] **Step 3: Implement in `packages/ui/src/GlobalSearch.jsx`**

In `renderChip`'s plain-attribute branch, render the remove button only when the chip is not locked:
```jsx
      {chip.label}
      {/* A locked chip is a filter the host is enforcing (consolidate mode's
          customer lock) — it renders as a normal chip but offers no way to
          remove it, because removing it would break the rule it encodes. */}
      {!chip.locked && (
        <button
          type="button"
          className="global-search-chip__remove"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => { e.stopPropagation(); onChipRemove?.(chip.key) }}
          aria-label={`Remove ${chip.label}`}
        >
          <X size={12} strokeWidth={2.25} />
        </button>
      )}
```
And in the Backspace handler, target the last UNLOCKED chip:
```jsx
    if (e.key === 'Backspace' && !value && chips.length > 0) {
      const last = [...chips].reverse().find((c) => !c.locked)
      if (last) onChipRemove?.(last.key)
    }
```
Leave the date and set branches alone — the locked chip is always a plain attribute chip.

- [ ] **Step 4: Implement in `apps/odyssey-one/src/search/useGlobalSearch.js`**

Guard `onChipRemove` (defence in depth — the X is already gone, but the Filters view and Backspace also route here):
```js
  const onChipRemove = useCallback((key) => {
    // A locked chip is enforced by the host (consolidate mode's customer
    // filter); no removal route may drop it.
    if (chipsRef.current.find((c) => c.key === key)?.locked) return
    …existing body…
  }, [])
```
Add the mutator next to it, and export it in the returned object:
```js
  // Host-enforced chip (consolidate mode's customer lock). Adds it, replaces
  // it in place when the value changes, or clears it — never touching the
  // planner's own chips.
  const setLockedChip = useCallback((chip) => {
    const rest = chipsRef.current.filter((c) => !c.locked)
    chipsRef.current = chip ? [...rest, { ...chip, locked: true }] : rest
    setChips(chipsRef.current)
  }, [])
```
Keep `chipsRef` and `setChips` in sync exactly as every other mutator in the file does — read the neighbours first and follow them.

- [ ] **Step 5: Run — expect pass, and the search suites stay green**

`cd apps/odyssey-one && npx vitest run src/search src/components/global-search`

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/GlobalSearch.jsx apps/odyssey-one/src/search/useGlobalSearch.js apps/odyssey-one/src/search/lockedChip.test.jsx
git commit -m "S154: a locked search chip has no remove route"
```

---

### Task 2: the bar accepts a locked chip and the Filters panel respects it

**Files:**
- Modify: `apps/odyssey-one/src/components/global-search/ShipmentsGlobalSearch.jsx`
- Modify: `apps/odyssey-one/src/components/global-search/ShipmentsFiltersView.jsx`
- Test: `apps/odyssey-one/src/components/global-search/lockedCustomer.test.jsx` (new)

- [ ] **Step 1: Read first.** `ShipmentsGlobalSearch` owns `useGlobalSearch` and renders `ShipmentsFiltersView`. Find (a) where committed criteria are reported up (`onCommitQuery`), and (b) every path by which `ShipmentsFiltersView` writes chips back (`mergeFiltersIntoChips`, its Clear/Clear-all, its per-filter controls). The locked key must survive ALL of them.

- [ ] **Step 2: Write the failing test** — a component test mounting `ShipmentsGlobalSearch` with and without `lockedChip`, asserting:
  1. with `lockedChip` set, a chip with that label is in the bar and has no Remove button;
  2. `onCommitQuery` fires with criteria containing that chip (so the table filters);
  3. changing the `lockedChip` prop value replaces the chip rather than adding a second;
  4. setting it back to `null` removes it and leaves any other chip untouched;
  5. opening the Filters panel shows the customer control disabled while locked.

  Model the harness on the existing `ShipmentsGlobalSearch.test.jsx` in the same folder (providers, QueryClient, mock services) — read it and reuse its setup rather than inventing one.

- [ ] **Step 3: Implement.** `ShipmentsGlobalSearch` gains `lockedChip = null`. Apply it to the hook whenever it changes, and commit the resulting criteria so the table follows:
```jsx
  useEffect(() => {
    setLockedChip(lockedChip)
  }, [lockedChip, setLockedChip])
```
The commit must go through the SAME path a user-committed chip takes so `searchCriteria` and the glimpse stay coherent — find that path rather than calling `onCommitQuery` directly with a hand-built object, and say in your report which path you used and why.

Pass `lockedKeys={lockedChip ? [lockedChip.key] : []}` to `ShipmentsFiltersView`; there, a filter whose key is locked renders disabled, is excluded from "Clear"/"Clear all", and cannot be widened. Its value still displays — the planner must see what is being filtered.

- [ ] **Step 4: Run** `cd apps/odyssey-one && npx vitest run src/components/global-search src/search` — everything green.

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/components/global-search/ShipmentsGlobalSearch.jsx apps/odyssey-one/src/components/global-search/ShipmentsFiltersView.jsx apps/odyssey-one/src/components/global-search/lockedCustomer.test.jsx
git commit -m "S154: the shipments bar accepts a host-locked chip; Filters respects it"
```

---

### Task 3: the route drives it, and the override is deleted

**Files:**
- Modify: `apps/odyssey-one/src/routes/shipments/ShipmentsRoute.jsx`
- Modify: `apps/odyssey-one/src/styles/components.css`
- Modify: `apps/odyssey-one/src/routes/shipments/consolidateMode.test.jsx`

- [ ] **Step 1: Write the failing tests** — extend `consolidateMode.test.jsx`:
  1. entering the mode with a committed customer filter of TWO customers leaves it untouched (no narrowing before any row is checked);
  2. checking the first row narrows that filter to exactly the anchor customer, and the chip has no Remove button;
  3. clearing the selection restores the two-customer filter;
  4. Cancel restores it too.

  The existing file's `renderRoute(state)` harness and its `enabledRowBoxes()` helpers are already there — reuse them. To seed a pre-existing filter, use the route's existing `location.state` seam if it supports chips, otherwise commit them through the bar in the test the way a user would; read the file and pick the honest one.

- [ ] **Step 2: Run — expect failure.**

- [ ] **Step 3: Implement.**
  - **Delete `effectiveCustomerIds` entirely** and restore `selectedDataIds` in `listParams.customerIds`, `queryIdentity`, and the three `useCategoryCounts` calls. Filtering by customer now happens through the committed chip, which those queries already honour via `searchCriteria`. Leave a short comment saying so, because this reverses a deliberate S154 decision (CNS-10).
  - Derive the chip from the anchor:
```js
  // The customer lock is a real, visible filter chip — the same filtering the
  // planner already uses — not a private query override (user, 2026-09-20).
  const lockedChip = useMemo(
    () => (anchorCustomerId ? { ...attrChip('customer-id', anchorCustomerId), locked: true } : null),
    [anchorCustomerId],
  )
```
  (`attrChip` is already imported in this file for `seedChips`.)
  - Snapshot the planner's own customer filter when the lock first engages and restore it when the selection empties or the mode exits. Put the snapshot in the same `consolidate` state object that already carries `priorSorting`/`priorViewMode` — follow that pattern exactly, including `handleSelectionChange`'s `{ ...prev, rows: next }` spread.
  - Pass `lockedChip` to `<ShipmentsGlobalSearch …>`.

- [ ] **Step 4: CSS** — in `components.css`, `.consolidate-customer`'s `margin-bottom` goes from `var(--spacing-4)` to `var(--spacing-6)` (16px → 24px; the user asked for "10px or more"). Use the token, not a raw px.

- [ ] **Step 5: Run** the route folder, then the FULL suite:
```
cd apps/odyssey-one && npx vitest run src/routes/shipments
cd apps/odyssey-one && npx vitest run
```
Baseline is 202 files / 2760 tests, all passing.

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/src/routes/shipments/ShipmentsRoute.jsx apps/odyssey-one/src/styles/components.css apps/odyssey-one/src/routes/shipments/consolidateMode.test.jsx
git commit -m "S154: the consolidate customer lock is a locked filter chip, not a query override"
```

---

### Task 4: decision log + browser check (main thread)

- [ ] Amend **CNS-10** in `vault/10-domains/consolidation/decisions/decision-log.md`: the lock is a locked customer FILTER chip, not `effectiveCustomerIds`; record the user's 2026-09-20 rulings (filter-level for clarity; pre-existing filters preserved; a multi-customer filter narrows on first check; the chip is locked so the one-customer rule cannot be bypassed).
- [ ] Browser check in mock mode: enter the mode with a two-customer filter, check a row, confirm the chip narrows and has no X, confirm the Filters panel disables it, clear the selection and confirm the two-customer filter returns.

## Open

- Restoring the planner's prior customer filter on exit is **our** call, taken for symmetry with the sort/view restore. If the user would rather the narrowed filter persist after leaving the mode, it is a one-line change in `exitConsolidate`.
