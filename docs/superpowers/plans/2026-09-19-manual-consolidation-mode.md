# Manual Consolidation — Consolidate Mode + Review Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Consolidate" stage of the Shipments route where a planner checks direct, untendered shipments of one customer, then reviews the proposed consolidation on `/shipments/consolidate/review` (Figma `x38TOJGsNryYl3LsKhCtSc` node `2249:46444`). Apply is a confirm-dialog stub this session.

**Architecture:** Mode state (`consolidate: { rows: Map }`) lives in `ShipmentsRoute`; the review route receives the row snapshots through `location.state` and hands them back the same way ("Modify Selection"). Pure modules under `src/consolidation/` own eligibility, capacity and the proposal derivation so both screens and their tests share one truth. Chrome changes are boolean props on the existing components (`hideExport`, `hideViewToggle`, `sidebarHidden`, `selectable`), never forks.

**Tech Stack:** React 18, react-router v6, TanStack Table + Query, `@odyssey/ui` (Button, Badge, Checkbox, DataTable, SubAccordion, SummaryStrip, Timeline, Breadcrumb, PageHeader, StepperButtonsFooter), vitest + Testing Library (jsdom). Spec: `docs/superpowers/specs/2026-09-19-manual-consolidation-mode-design.md`.

**Conventions every task follows**
- Run tests from `apps/odyssey-one`: `npx vitest run <path>` (the workspace `npm test` runs everything; use it once at the end of T7).
- Commit subjects start with `S154: ` (CLAUDE.md). Stage the files named in the task, nothing else (`feedback_verify_git_state_after_subagents`).
- Tokens only in CSS (`var(--spacing-*)`, `var(--radius-*)`, colour tokens); tiny component-internal px are allowed with a comment.
- Model tier: Sonnet implements; the main thread reviews between tasks.

---

## File map

| File | Responsibility |
|---|---|
| `src/consolidation/eligibility.js` (new) | `consolidationEligibility(row, anchorCustomerId)`, `CONSOLIDATION_ATTRIBUTE_KEYS` |
| `src/consolidation/equipmentCapacity.js` (new) | placeholder capacity table + `capacityFor`, `utilizationPct` |
| `src/consolidation/proposal.js` (new) | `buildProposal(rows, details)` → stops, totals, hazmat, utilization |
| `src/search/adapter-core.js` | `narrowSuggestionSections(sections, allowedKeys)` |
| `src/components/global-search/ShipmentsGlobalSearch.jsx` | `attributeKeys`, `placeholder` props |
| `src/components/shipments/ShipmentTable.jsx` | `selectable`, `selection`, `onSelectionChange`, `eligibility` props; `select` column; `action` hidden in mode |
| `src/components/shipments/TableControls.jsx` | `hideExport` |
| `src/components/shipments/ShipmentsPanelTabs.jsx` | `hideViewToggle` |
| `src/components/layout/AppShell.jsx`, `src/components/layout/Sidebar.jsx`, `src/styles/components.css` | `sidebarHidden` → `.sidebar--hidden` slide |
| `src/routes/shipments/ShipmentsRoute.jsx` | mode state, header buttons, customer lock, re-entry from `location.state.consolidate` |
| `src/routes/shipments/ConsolidationReviewRoute.jsx` (new) + `consolidation-review.css` (new) | the review screen |
| `src/App.jsx` | `/shipments/consolidate/review` |
| `vault/10-domains/consolidation/decisions/decision-log.md` | CNS-07…10 |

---

### Task 1: Eligibility + attribute keys (pure)

**Files:**
- Create: `apps/odyssey-one/src/consolidation/eligibility.js`
- Test: `apps/odyssey-one/src/consolidation/eligibility.test.js`

- [ ] **Step 1: Write the failing test**

```js
// apps/odyssey-one/src/consolidation/eligibility.test.js
import { describe, test, expect } from 'vitest'
import { consolidationEligibility, CONSOLIDATION_ATTRIBUTE_KEYS } from './eligibility'

const direct = (over = {}) => ({
  id: '1', shipmentType: 'Direct', tenderStatus: '', customerId: 'VALTRIS_01', ...over,
})

describe('consolidationEligibility', () => {
  test('a direct, untendered shipment is eligible (null reason)', () => {
    expect(consolidationEligibility(direct())).toBeNull()
  })
  test('Declined / Cancelled tenders do not block', () => {
    expect(consolidationEligibility(direct({ tenderStatus: 'Declined' }))).toBeNull()
    expect(consolidationEligibility(direct({ tenderStatus: 'Cancelled' }))).toBeNull()
  })
  test('a consolidated shipment is never a from-scratch candidate', () => {
    expect(consolidationEligibility(direct({ shipmentType: 'Consolidation' }))).toMatch(/direct/i)
    expect(consolidationEligibility(direct({ shipmentType: null }))).toMatch(/direct/i)
  })
  test('an active tender blocks (Sent / Accepted)', () => {
    expect(consolidationEligibility(direct({ tenderStatus: 'Sent' }))).toMatch(/tender/i)
    expect(consolidationEligibility(direct({ tenderStatus: 'Accepted' }))).toMatch(/tender/i)
  })
  test('another customer than the anchor blocks; no anchor means no customer check', () => {
    expect(consolidationEligibility(direct({ customerId: 'KEMIRA_NA_01' }), 'VALTRIS_01')).toMatch(/KEMIRA_NA_01|customer/i)
    expect(consolidationEligibility(direct({ customerId: 'KEMIRA_NA_01' }), null)).toBeNull()
  })
  test('order of checks: type before tender before customer', () => {
    expect(consolidationEligibility(direct({ shipmentType: 'Consolidation', tenderStatus: 'Sent' }), 'X')).toMatch(/direct/i)
  })
})

describe('CONSOLIDATION_ATTRIBUTE_KEYS', () => {
  test('is the consolidation-relevant subset of the shipments progression', () => {
    expect(CONSOLIDATION_ATTRIBUTE_KEYS).toEqual([
      'odyssey-shipment', 'order', 'customer-id', 'customer-name', 'origin', 'destination',
      'pickup-date', 'delivery-date', 'equipment-code', 'mode', 'shipment-type', 'gross-weight',
    ])
  })
})
```

- [ ] **Step 2: Run it — expect failure**

Run: `cd apps/odyssey-one && npx vitest run src/consolidation/eligibility.test.js`
Expected: FAIL — `Failed to resolve import "./eligibility"`.

- [ ] **Step 3: Implement**

```js
// apps/odyssey-one/src/consolidation/eligibility.js
// Who can join a from-scratch manual consolidation. Provisional (user,
// 2026-09-19: "we need to discuss this in the future but do your suggestion"):
//   1. direct shipments only  — Dave Schultz 2026-09-17 00:37:46 / 00:42:08
//   2. no active tender       — Dave 00:08:17 / 00:15:38 ("cancel that tender first")
//   3. one customer           — Ramesh 2026-09-15 00:05:00; LINX-15762/15786 BR
// Exceptions are irrelevant (Dave 00:09:06); Hold is fine. Ramesh's pool gates
// (Allow Optimization, OCM 97–101, status = Consolidation) are backend pool
// membership and are NOT applied to the checkbox. Spec §2.
const ACTIVE_TENDER = new Set(['Sent', 'Accepted'])

/** @returns {string|null} null = eligible; otherwise the reason shown in the checkbox tooltip */
export function consolidationEligibility(row, anchorCustomerId = null) {
  if (row.shipmentType !== 'Direct') return 'Only direct shipments can be consolidated from scratch'
  if (ACTIVE_TENDER.has(row.tenderStatus)) return 'Tendered — cancel the tender first'
  if (anchorCustomerId && row.customerId !== anchorCustomerId) return `Different customer than ${anchorCustomerId}`
  return null
}

// The GlobalSearch attributes offered while in consolidate mode (spec §3.5).
// Keys are SHIPMENTS_PROGRESSION attribute keys; the filter is applied at the
// adapter (narrowSuggestionSections), so progression.js and the Cognizant
// progression sheets are untouched.
export const CONSOLIDATION_ATTRIBUTE_KEYS = [
  'odyssey-shipment', 'order', 'customer-id', 'customer-name', 'origin', 'destination',
  'pickup-date', 'delivery-date', 'equipment-code', 'mode', 'shipment-type', 'gross-weight',
]
```

- [ ] **Step 4: Run — expect pass**

Run: `cd apps/odyssey-one && npx vitest run src/consolidation/eligibility.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/consolidation/eligibility.js apps/odyssey-one/src/consolidation/eligibility.test.js
git commit -m "S154: consolidation eligibility — direct + untendered + one customer (provisional)"
```

---

### Task 2: Capacity table + proposal derivation (pure)

**Files:**
- Create: `apps/odyssey-one/src/consolidation/equipmentCapacity.js`
- Create: `apps/odyssey-one/src/consolidation/proposal.js`
- Test: `apps/odyssey-one/src/consolidation/proposal.test.js`

- [ ] **Step 1: Write the failing test**

```js
// apps/odyssey-one/src/consolidation/proposal.test.js
import { describe, test, expect } from 'vitest'
import { buildProposal } from './proposal'
import { capacityFor, utilizationPct, DEFAULT_CAPACITY, EQUIPMENT_CAPACITY } from './equipmentCapacity'

const row = (i, over = {}) => ({
  id: `s${i}`, sellShipment: `s${i}`, buyShipment: `b${i}`, odysseyShipmentIdentifier: `O0000000${i}`,
  customerId: 'VALTRIS_01', customerName: 'Valtris Specialty Chemicals',
  origin: `Origin ${i}, TX`, destination: `Dest ${i}, NJ`,
  pickupDate: `0${i}/10/2026 08:00 CST`, deliveryDate: `0${i}/12/2026 08:00 CST`,
  grossWeight: '10000', equipmentCode: 'TL', ...over,
})
const detail = (volume, hazmat) => ({
  stopsData: { summary: { volume } },
  orderDetails: [{ hazmat }],
})

describe('equipmentCapacity', () => {
  test('known code → its row; unknown/empty → default', () => {
    expect(capacityFor('TL')).toBe(EQUIPMENT_CAPACITY.TL)
    expect(capacityFor('NOPE')).toBe(DEFAULT_CAPACITY)
    expect(capacityFor('')).toBe(DEFAULT_CAPACITY)
  })
  test('utilizationPct rounds to a whole percent and is null without a total', () => {
    expect(utilizationPct(22500, 45000)).toBe(50)
    expect(utilizationPct(1, 3)).toBe(33)
    expect(utilizationPct(null, 45000)).toBeNull()
  })
})

describe('buildProposal', () => {
  test('stops: every pickup in selection order, then every delivery', () => {
    const p = buildProposal([row(1), row(2)])
    expect(p.stops.map((s) => s.label)).toEqual(['P1', 'P2', 'D1', 'D2'])
    expect(p.stops[0]).toMatchObject({ type: 'pickup', location: 'Origin 1, TX', date: '01/10/2026 08:00 CST' })
    expect(p.stops[3]).toMatchObject({ type: 'delivery', location: 'Dest 2, NJ', date: '02/12/2026 08:00 CST' })
    expect(p.pickupCount).toBe(2)
    expect(p.deliveryCount).toBe(2)
  })
  test('customer + identifiers come from the rows (anchor = first row)', () => {
    const p = buildProposal([row(1), row(2)])
    expect(p.customerName).toBe('Valtris Specialty Chemicals')
    expect(p.identifiers).toEqual(['O00000001', 'O00000002'])
  })
  test('weight sums grossWeight; utilization uses the anchor equipment capacity', () => {
    const p = buildProposal([row(1), row(2, { grossWeight: '12,500' })])
    expect(p.weightLb).toBe(22500)
    expect(p.weightUtilization).toBe(utilizationPct(22500, capacityFor('TL').weightLb))
  })
  test('volume + hazmat need every detail; missing volume → null (renders --)', () => {
    const rows = [row(1), row(2)]
    expect(buildProposal(rows).volumeCuft).toBeNull()
    expect(buildProposal(rows).hazmat).toBeNull()
    const p = buildProposal(rows, [detail('1,000 cuft', 'No'), detail('375 cuft', 'Yes')])
    expect(p.volumeCuft).toBe(1375)
    expect(p.volumeUtilization).toBe(utilizationPct(1375, capacityFor('TL').volumeCuft))
    expect(p.hazmat).toBe(true)
    const q = buildProposal(rows, [detail('1,000 cuft', 'No'), detail('--', 'No')])
    expect(q.volumeCuft).toBeNull()
    expect(q.volumeUtilization).toBeNull()
    expect(q.hazmat).toBe(false)
  })
  test('empty rows → an empty proposal, no throw', () => {
    const p = buildProposal([])
    expect(p.stops).toEqual([])
    expect(p.weightLb).toBe(0)
    expect(p.customerName).toBe('')
  })
})
```

- [ ] **Step 2: Run — expect failure**

Run: `cd apps/odyssey-one && npx vitest run src/consolidation/proposal.test.js`
Expected: FAIL — cannot resolve `./proposal`.

- [ ] **Step 3: Implement the capacity table**

```js
// apps/odyssey-one/src/consolidation/equipmentCapacity.js
// ponytail: placeholder capacities per equipment code — no equipment master
// exists in this prototype and no one has given us the capacity rule (spec
// open question 2). Utilization = total / capacity. Replace this table with
// the real rule when Dave provides it; the callers only use capacityFor().
// Codes = EQUIPMENT_LABELS in tools/data-pools.mjs.
export const EQUIPMENT_CAPACITY = {
  TL:  { weightLb: 45000, volumeCuft: 3800 },
  TLR: { weightLb: 43000, volumeCuft: 3400 },
  TLH: { weightLb: 45000, volumeCuft: 3800 },
  TLF: { weightLb: 43000, volumeCuft: 3400 },
  TT:  { weightLb: 48000, volumeCuft: 900 },
  LTL: { weightLb: 20000, volumeCuft: 1500 },
  LTR: { weightLb: 18000, volumeCuft: 1300 },
  LTH: { weightLb: 20000, volumeCuft: 1500 },
  LCL: { weightLb: 25000, volumeCuft: 1000 },
  FCL: { weightLb: 44000, volumeCuft: 2350 },
  RR:  { weightLb: 200000, volumeCuft: 6000 },
}
export const DEFAULT_CAPACITY = { weightLb: 45000, volumeCuft: 3800 }

export function capacityFor(code) {
  return (code && EQUIPMENT_CAPACITY[code]) || DEFAULT_CAPACITY
}

/** Whole-percent utilization, or null when there is no total to divide. */
export function utilizationPct(total, capacity) {
  if (total == null || !capacity) return null
  return Math.round((total / capacity) * 100)
}
```

- [ ] **Step 4: Implement the proposal derivation**

```js
// apps/odyssey-one/src/consolidation/proposal.js
// The proposed consolidation, derived from the selected grid rows (+ their
// details when loaded). Pure: the review screen renders this, tests pin it.
// Stop sequence rule (Dave 2026-09-17 00:33:20 / 00:35:06): the system
// proposes an order, the planner re-sequences later — V1 proposes every
// pickup in selection order, then every delivery in selection order.
import { capacityFor, utilizationPct } from './equipmentCapacity'

// "12,500" / "1,375 cuft" / "--" / null → number | null
export function parseMeasure(s) {
  if (s == null || s === '' || s === '--') return null
  const n = Number(String(s).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && String(s).match(/\d/) ? n : null
}

export function buildProposal(rows = [], details = []) {
  const anchor = rows[0]
  const stop = (r, i, type) => ({
    key: `${type}-${r.sellShipment ?? i}`,
    label: `${type === 'pickup' ? 'P' : 'D'}${i + 1}`,
    type,
    location: (type === 'pickup' ? r.origin : r.destination) || '--',
    date: (type === 'pickup' ? r.pickupDate : r.deliveryDate) || '--',
    sellShipment: r.sellShipment,
  })
  const pickups = rows.map((r, i) => stop(r, i, 'pickup'))
  const deliveries = rows.map((r, i) => stop(r, i, 'delivery'))

  const weightLb = rows.reduce((sum, r) => sum + (parseMeasure(r.grossWeight) ?? 0), 0)

  // Volume and hazmat live on the detail (stopsData.summary.volume,
  // orderDetails[].hazmat 'Yes'/'No'); the grid row has neither. Until every
  // detail is here both are null → the strip shows '--'. A shipment without
  // volume keeps the whole volume null (LINX-15787 BR 3–4: missing volume
  // never blocks, utilization is shown only when the data is sufficient).
  const complete = rows.length > 0 && details.length === rows.length && details.every(Boolean)
  const volumes = complete ? details.map((d) => parseMeasure(d?.stopsData?.summary?.volume)) : []
  const volumeCuft = complete && volumes.every((v) => v != null) ? volumes.reduce((a, b) => a + b, 0) : null
  const hazmat = complete
    ? details.some((d) => (d?.orderDetails ?? []).some((o) => o.hazmat === 'Yes'))
    : null

  const equipmentCode = anchor?.equipmentCode || ''
  const cap = capacityFor(equipmentCode)

  return {
    customerId: anchor?.customerId ?? '',
    customerName: anchor?.customerName ?? '',
    identifiers: rows.map((r) => r.odysseyShipmentIdentifier || r.buyShipment || r.sellShipment),
    equipmentCode,
    stops: [...pickups, ...deliveries],
    pickupCount: pickups.length,
    deliveryCount: deliveries.length,
    weightLb,
    volumeCuft,
    weightUtilization: rows.length ? utilizationPct(weightLb, cap.weightLb) : null,
    volumeUtilization: utilizationPct(volumeCuft, cap.volumeCuft),
    hazmat,
  }
}
```

- [ ] **Step 5: Run — expect pass**

Run: `cd apps/odyssey-one && npx vitest run src/consolidation/proposal.test.js`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/src/consolidation/equipmentCapacity.js apps/odyssey-one/src/consolidation/proposal.js apps/odyssey-one/src/consolidation/proposal.test.js
git commit -m "S154: proposal derivation — stop sequence, totals, placeholder equipment capacity"
```

---

### Task 3: ShipmentTable — selectable checkbox column

**Files:**
- Modify: `apps/odyssey-one/src/components/shipments/ShipmentTable.jsx`
- Test: `apps/odyssey-one/src/components/shipments/ShipmentTable.select.test.jsx` (new)

- [ ] **Step 1: Write the failing test**

```jsx
// apps/odyssey-one/src/components/shipments/ShipmentTable.select.test.jsx
// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ShipmentTable from './ShipmentTable.jsx'

afterEach(cleanup)

const row = (i, over = {}) => ({
  id: `s${i}`, sellShipment: `s${i}`, buyShipment: `b${i}`, odysseyShipmentIdentifier: `O${i}`,
  orders: [], pickupNumbers: [], poNumbers: [], customerId: 'VALTRIS_01', shipmentType: 'Direct',
  tenderStatus: '', shipmentStatus: '', category: 'consolidation', grossWeight: '100', ...over,
})
const rows = [row(1), row(2, { tenderStatus: 'Sent' }), row(3)]

const baseProps = {
  shipments: rows, onRowSelect: vi.fn(), selectedId: null, onToggleColumnPanel: vi.fn(),
  visibleColumns: ['odysseyShipmentIdentifier', 'customerId'], sorting: [], onSortingChange: vi.fn(),
  onPageChange: vi.fn(), onPageSizeChange: vi.fn(), totalCount: 3,
}
const eligibility = (r) => (r.tenderStatus === 'Sent' ? 'Tendered — cancel the tender first' : null)

function renderTable(props) {
  return render(<MemoryRouter><ShipmentTable {...baseProps} {...props} /></MemoryRouter>)
}

describe('ShipmentTable — selectable mode', () => {
  test('default: no checkboxes, actions column present', () => {
    renderTable({})
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.getAllByRole('button', { name: 'Shipment actions' }).length).toBeGreaterThan(0)
  })

  test('selectable: one checkbox per row + header, actions column hidden, ineligible disabled', () => {
    renderTable({ selectable: true, selection: new Map(), onSelectionChange: vi.fn(), eligibility })
    expect(screen.queryByRole('button', { name: 'Shipment actions' })).toBeNull()
    expect(screen.getByRole('checkbox', { name: 'Select all eligible shipments on this page' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Select O1' }).disabled).toBe(false)
    expect(screen.getByRole('checkbox', { name: 'Select O2' }).disabled).toBe(true)
  })

  test('checking a row reports ([row], true); unchecking reports ([row], false)', () => {
    const onSelectionChange = vi.fn()
    const { rerender } = renderTable({ selectable: true, selection: new Map(), onSelectionChange, eligibility })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select O1' }))
    expect(onSelectionChange).toHaveBeenLastCalledWith([expect.objectContaining({ id: 's1' })], true)
    rerender(<MemoryRouter><ShipmentTable {...baseProps} selectable selection={new Map([['s1', rows[0]]])} onSelectionChange={onSelectionChange} eligibility={eligibility} /></MemoryRouter>)
    expect(screen.getByRole('checkbox', { name: 'Select O1' }).checked).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select O1' }))
    expect(onSelectionChange).toHaveBeenLastCalledWith([expect.objectContaining({ id: 's1' })], false)
  })

  test('header checkbox selects only the eligible rows on the page, and is indeterminate when partial', () => {
    const onSelectionChange = vi.fn()
    const { rerender } = renderTable({ selectable: true, selection: new Map(), onSelectionChange, eligibility })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all eligible shipments on this page' }))
    const [selected, checked] = onSelectionChange.mock.calls.at(-1)
    expect(checked).toBe(true)
    expect(selected.map((r) => r.id)).toEqual(['s1', 's3'])
    rerender(<MemoryRouter><ShipmentTable {...baseProps} selectable selection={new Map([['s1', rows[0]]])} onSelectionChange={onSelectionChange} eligibility={eligibility} /></MemoryRouter>)
    expect(screen.getByRole('checkbox', { name: 'Select all eligible shipments on this page' }).indeterminate).toBe(true)
  })

  test('row clicks are inert in selectable mode', () => {
    const onRowSelect = vi.fn()
    renderTable({ selectable: true, selection: new Map(), onSelectionChange: vi.fn(), eligibility, onRowSelect })
    fireEvent.click(screen.getByText('O1'))
    expect(onRowSelect).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run — expect failure**

Run: `cd apps/odyssey-one && npx vitest run src/components/shipments/ShipmentTable.select.test.jsx`
Expected: FAIL on the `selectable` tests (no checkboxes rendered; actions still present).

- [ ] **Step 3: Implement**

In `ShipmentTable.jsx`:

(a) Add `Checkbox` to the `@odyssey/ui` import:
```js
import { Badge, Button, Checkbox, DataTable, Paginator, ActionMenu } from '@odyssey/ui'
```

(b) Replace `deriveColumnState` so the `select`/`action` pair follows the mode:
```js
function deriveColumnState(visibleColumns, selectable = false) {
  const visibleKeys = (visibleColumns && visibleColumns.length)
    ? visibleColumns.filter((k) => ALL_KEYS.includes(k))
    : COLUMN_CONFIG.map((c) => c.key)

  const columnVisibility = { select: selectable, action: !selectable }
  for (const k of ALL_KEYS) columnVisibility[k] = visibleKeys.includes(k)
  const hidden = ALL_KEYS.filter((k) => !visibleKeys.includes(k))
  const columnOrder = ['select', ...visibleKeys, ...hidden, 'action']
  return { columnVisibility, columnOrder }
}
```

(c) Extend the component signature:
```js
export default function ShipmentTable({ shipments, onRowSelect, selectedId, onToggleColumnPanel, visibleColumns, pageNumber = 0, pageSize = 25, totalCount = 0, onPageChange, onPageSizeChange, sorting, onSortingChange, isLoading = false, isFetchingRows = false, isError = false, error, onRetry,
  // Consolidate mode (S154, spec §3.3): a multi-select checkbox lane replaces
  // the actions column and row clicks go inert. `selection` is the parent's
  // Map<id, row>; `onSelectionChange(rows[], checked)` reports one row (cell)
  // or every eligible row on the page (header). `eligibility(row)` returns
  // null or the reason shown as the disabled checkbox's tooltip.
  selectable = false, selection, onSelectionChange, eligibility }) {
```

(d) Inside the `columns` memo, before `return [...dataCols, actionColumn]`, add the select column and include it:
```js
    const isSelected = (r) => !!selection?.has(r.id)
    const selectColumn = columnHelper.display({
      id: 'select',
      enableResizing: false,
      enableSorting: false,
      header: ({ table }) => {
        const eligible = table.getRowModel().rows.map((r) => r.original).filter((r) => !eligibility?.(r))
        const picked = eligible.filter(isSelected)
        return (
          <Checkbox
            showLabel={false}
            aria-label="Select all eligible shipments on this page"
            disabled={eligible.length === 0}
            checked={eligible.length > 0 && picked.length === eligible.length}
            indeterminate={picked.length > 0 && picked.length < eligible.length}
            onChange={(e) => onSelectionChange?.(eligible, e.target.checked)}
          />
        )
      },
      cell: ({ row }) => {
        const r = row.original
        const reason = eligibility?.(r) ?? null
        const box = (
          <Checkbox
            showLabel={false}
            aria-label={`Select ${r.odysseyShipmentIdentifier || r.buyShipment || r.sellShipment}`}
            disabled={!!reason}
            checked={isSelected(r)}
            onChange={(e) => onSelectionChange?.([r], e.target.checked)}
          />
        )
        // A disabled input swallows pointer events, so the tooltip anchors on
        // a wrapping span (TooltipTrigger listens on the anchor, not the input).
        return reason
          ? <TooltipTrigger asSpan tooltipProps={{ groups: [{ content: reason }] }}><span style={{ display: 'inline-flex' }}>{box}</span></TooltipTrigger>
          : box
      },
      meta: { fixedWidth: true },
    })

    return [selectColumn, ...dataCols, actionColumn]
  }, [onToggleColumnPanel, navigate, selection, onSelectionChange, eligibility])
```
(The memo deps now include `selection`, `onSelectionChange`, `eligibility` — the select column reads them.)

(e) Column state + TanStack selection:
```js
  const { columnVisibility, columnOrder } = useMemo(
    () => deriveColumnState(visibleColumns, selectable),
    [visibleColumns, selectable]
  )

  // Single-row (detail bar) vs multi-row (consolidate mode) selection — both
  // controlled by the parent; TanStack only mirrors it for the row tint.
  const rowSelection = useMemo(() => {
    if (selectable) return Object.fromEntries([...(selection?.keys() ?? [])].map((id) => [id, true]))
    return selectedId ? { [selectedId]: true } : {}
  }, [selectable, selection, selectedId])
```
and in `useReactTable(...)`: `enableMultiRowSelection: selectable,`.

(f) `handleCellClick` stays; pass it conditionally, and drop the auto-scroll in mode. In the `<DataTable …>` props:
```jsx
          onCellClick={selectable ? undefined : handleCellClick}
          scrollSelectedIntoView={selectable ? false : {
            bottomBoundary: () => (document.querySelector('[data-bottombar]')?.getBoundingClientRect().top ?? window.innerHeight) - 12,
          }}
```
and the wrapper `paddingBottom`: `selectedId && !selectable ? 'var(--bottombar-partial)' : 'var(--bottombar-collapsed)'`.

- [ ] **Step 4: Run — expect pass, and the existing table tests still green**

Run: `cd apps/odyssey-one && npx vitest run src/components/shipments/`
Expected: all PASS (new file 5 tests; `ShipmentTable.test.jsx`, `ShipmentsPanelTabs.test.jsx` unchanged).

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/components/shipments/ShipmentTable.jsx apps/odyssey-one/src/components/shipments/ShipmentTable.select.test.jsx
git commit -m "S154: ShipmentTable selectable lane — checkbox column, eligibility tooltips, inert rows"
```

---

### Task 4: Chrome switches — Export, view toggle, sidebar slide

**Files:**
- Modify: `apps/odyssey-one/src/components/shipments/TableControls.jsx`
- Modify: `apps/odyssey-one/src/components/shipments/ShipmentsPanelTabs.jsx`
- Modify: `apps/odyssey-one/src/components/layout/AppShell.jsx`
- Modify: `apps/odyssey-one/src/components/layout/Sidebar.jsx`
- Modify: `apps/odyssey-one/src/styles/components.css` (the `.sidebar` block, ~line 7797)
- Test: `apps/odyssey-one/src/components/layout/AppShell.sidebarHidden.test.jsx` (new)

- [ ] **Step 1: Write the failing test**

```jsx
// apps/odyssey-one/src/components/layout/AppShell.sidebarHidden.test.jsx
// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppShell from './AppShell.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'
import TableControls from '../shipments/TableControls.jsx'
import ShipmentsPanelTabs from '../shipments/ShipmentsPanelTabs.jsx'

afterEach(cleanup)

function wrap(ui) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <CustomersProvider><EditModeProvider><CreateOrderModeProvider>{ui}</CreateOrderModeProvider></EditModeProvider></CustomersProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('consolidate-mode chrome switches', () => {
  test('AppShell sidebarHidden adds the slide class to the rail', () => {
    const { container, rerender } = wrap(<AppShell><div /></AppShell>)
    expect(container.querySelector('.sidebar--hidden')).toBeNull()
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <CustomersProvider><EditModeProvider><CreateOrderModeProvider><AppShell sidebarHidden><div /></AppShell></CreateOrderModeProvider></EditModeProvider></CustomersProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(container.querySelector('.sidebar.sidebar--hidden')).toBeTruthy()
  })

  test('TableControls hideExport removes the Export button', () => {
    const { rerender } = render(<TableControls itemCount={3} onExport={() => {}} />)
    expect(screen.getByRole('button', { name: /export/i })).toBeTruthy()
    rerender(<TableControls itemCount={3} onExport={() => {}} hideExport />)
    expect(screen.queryByRole('button', { name: /export/i })).toBeNull()
    expect(screen.getByText('3 items')).toBeTruthy()
  })

  test('ShipmentsPanelTabs hideViewToggle removes the pills/widgets toggle', () => {
    const props = { activePanel: 'exceptions', onPanelSelect: () => {}, activeTab: 'all', onTabSelect: () => {}, metrics: {}, visiblePanels: ['exceptions', 'monitoring', 'pgipgr'] }
    const { container, rerender } = render(<ShipmentsPanelTabs {...props} />)
    expect(container.querySelector('.button-toggle')).toBeTruthy()
    rerender(<ShipmentsPanelTabs {...props} hideViewToggle />)
    expect(container.querySelector('.button-toggle')).toBeNull()
  })
})
```

If `.button-toggle` is not the ButtonToggle root class, run `grep -n "className" packages/ui/src/ButtonToggle.jsx | head -3` and use the root class it prints.

- [ ] **Step 2: Run — expect failure**

Run: `cd apps/odyssey-one && npx vitest run src/components/layout/AppShell.sidebarHidden.test.jsx`
Expected: FAIL — no `.sidebar--hidden`; Export still rendered; toggle still rendered.

- [ ] **Step 3: Implement**

`TableControls.jsx` — add `hideExport = false` to the props and wrap the Export block:
```jsx
const TableControls = React.memo(function TableControls({ itemCount, onExport, hideExport = false }) {
  …
        <div className="flex items-center gap-2 shrink-0">
          {!hideExport && (
            <TooltipTrigger tooltipProps={{ groups: [{ content: 'Only the first 10,000 records will be exported to Excel' }] }}>
              <Button variant="secondary" size="sm" icon={<Upload size={20} />} disabled={itemCount === 0} onClick={() => setExportModalOpen(true)}>
                Export
              </Button>
            </TooltipTrigger>
          )}
        </div>
```

`ShipmentsPanelTabs.jsx` — add `hideViewToggle = false` to the destructured props (next to `viewMode`) and wrap the `<ButtonToggle …/>` (around line 42) in `{!hideViewToggle && ( … )}`.

`Sidebar.jsx` (app wrapper) — accept and forward `hidden`:
```jsx
const Sidebar = React.memo(function Sidebar({ expanded = false, onHoverChange, hidden = false }) {
  const { pathname } = useLocation()
  return (
    <OdysseySidebar
      // A hidden rail must not peek open on hover mid-slide.
      expanded={expanded && !hidden}
      onHoverChange={hidden ? undefined : onHoverChange}
      className={hidden ? 'sidebar--hidden' : undefined}
      aria-hidden={hidden || undefined}
      …existing props…
```
(`OdysseySidebar` already spreads `className` onto its root — `packages/ui/src/Sidebar.jsx:303`. If it does not forward `aria-hidden`, drop that line; the class is the contract.)

`AppShell.jsx` — add `sidebarHidden = false` to the props and pass it through:
```jsx
export default function AppShell({ children, filterPanel, onMainClick, transparentMain = false, searchSlot, titleMode, sidebarHidden = false }) {
  …
        {!isEditMode && (
          <Sidebar expanded={sidebarExpanded} onHoverChange={setSidebarPeeking} hidden={sidebarHidden} />
        )}
```

`components.css` — extend the `.sidebar` transition and add the hidden state right after `.sidebar--expanded`:
```css
.sidebar {
  …
  transition: width var(--transition-sidebar), padding var(--transition-sidebar);
}
.sidebar--expanded { width: var(--sidebar-width-expanded); }
/* Consolidate mode (S154): the rail slides left to nothing. Same width
   transition the hamburger/hover expand uses; padding rides along so the
   icons don't sit in a 0-width box with 12px of padding. */
.sidebar--hidden {
  width: 0;
  padding-left: 0;
  padding-right: 0;
  overflow: hidden;
}
```

- [ ] **Step 4: Run — expect pass; run the layout + shipments suites**

Run: `cd apps/odyssey-one && npx vitest run src/components/layout src/components/shipments`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/components/shipments/TableControls.jsx apps/odyssey-one/src/components/shipments/ShipmentsPanelTabs.jsx apps/odyssey-one/src/components/layout/AppShell.jsx apps/odyssey-one/src/components/layout/Sidebar.jsx apps/odyssey-one/src/styles/components.css apps/odyssey-one/src/components/layout/AppShell.sidebarHidden.test.jsx
git commit -m "S154: chrome switches — hideExport, hideViewToggle, sidebarHidden slide"
```

---

### Task 5: GlobalSearch — attribute narrowing + placeholder

**Files:**
- Modify: `apps/odyssey-one/src/search/adapter-core.js`
- Modify: `apps/odyssey-one/src/components/global-search/ShipmentsGlobalSearch.jsx`
- Test: `apps/odyssey-one/src/search/narrowSuggestionSections.test.js` (new)

- [ ] **Step 1: Write the failing test**

```js
// apps/odyssey-one/src/search/narrowSuggestionSections.test.js
import { describe, test, expect } from 'vitest'
import { narrowSuggestionSections } from './adapter-core'

const sections = [
  { title: 'What is it?', items: [
    { key: 'origin', kind: 'attribute', label: 'Origin' },
    { key: 'scac', kind: 'attribute', label: 'SCAC' },
  ] },
  { title: 'Filter by date', items: [{ key: 'date-pickup', kind: 'date', label: 'Pickup Date' }] },
  { title: 'Only excluded', items: [{ key: 'seal', kind: 'attribute', label: 'Seal Number' }] },
]

describe('narrowSuggestionSections', () => {
  test('no allow-list → sections untouched (same reference)', () => {
    expect(narrowSuggestionSections(sections, null)).toBe(sections)
    expect(narrowSuggestionSections(sections, undefined)).toBe(sections)
  })
  test('keeps allowed attribute items, keeps non-attribute items, drops emptied sections', () => {
    const out = narrowSuggestionSections(sections, ['origin'])
    expect(out).toEqual([
      { title: 'What is it?', items: [{ key: 'origin', kind: 'attribute', label: 'Origin' }] },
      { title: 'Filter by date', items: [{ key: 'date-pickup', kind: 'date', label: 'Pickup Date' }] },
    ])
  })
})
```

- [ ] **Step 2: Run — expect failure**

Run: `cd apps/odyssey-one && npx vitest run src/search/narrowSuggestionSections.test.js`
Expected: FAIL — `narrowSuggestionSections` is not exported.

- [ ] **Step 3: Implement the helper** (append to `src/search/adapter-core.js`)

```js
// Consolidate mode (S154, spec §3.5): restrict the suggestion sections an
// adapter returns to an attribute allow-list. Non-attribute items (dates,
// set-type) pass through; a section left with no items disappears. A null
// allow-list is a no-op so callers can pass the mode conditionally.
export function narrowSuggestionSections(sections, allowedKeys) {
  if (!allowedKeys) return sections
  const allowed = new Set(allowedKeys)
  return sections
    .map((s) => ({ ...s, items: s.items.filter((it) => it.kind !== 'attribute' || allowed.has(it.key)) }))
    .filter((s) => s.items.length > 0)
}
```

- [ ] **Step 4: Wire it into ShipmentsGlobalSearch**

Import: `import { narrowSuggestionSections } from '../../search/adapter-core'`

Signature: `export default function ShipmentsGlobalSearch({ onCommitQuery, onSelectShipment, seedChips, attributeKeys = null, placeholder = 'Search in Shipments' }) {`

Replace the `scopedAdapter` memo:
```js
  const { selectedDataIds } = useCustomers()
  const scopedAdapter = useMemo(() => ({
    ...shipmentsSearchAdapter,
    searchShipments: (chips, query) =>
      shipmentsSearchAdapter.searchShipments(chips, query, selectedDataIds),
    // Consolidate mode narrows what the bar SUGGESTS (spec §3.5). Called as
    // methods on the base adapter so its internal `this.getInitial` /
    // `this.validateCodes` keep working.
    getInitial: async (...args) => narrowSuggestionSections(await shipmentsSearchAdapter.getInitial(...args), attributeKeys),
    getSuggestions: async (...args) => narrowSuggestionSections(await shipmentsSearchAdapter.getSuggestions(...args), attributeKeys),
  }), [selectedDataIds, attributeKeys])
```

And the `<GlobalSearch …>` prop: `placeholder={placeholder}` (replacing the literal `"Search in Shipments"`).

- [ ] **Step 5: Run — helper test + the two GlobalSearch suites**

Run: `cd apps/odyssey-one && npx vitest run src/search/narrowSuggestionSections.test.js src/components/global-search/ShipmentsGlobalSearch.test.jsx src/search/useGlobalSearch.test.jsx`
Expected: PASS (no behaviour change without `attributeKeys`).

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/src/search/adapter-core.js apps/odyssey-one/src/search/narrowSuggestionSections.test.js apps/odyssey-one/src/components/global-search/ShipmentsGlobalSearch.jsx
git commit -m "S154: GlobalSearch attribute narrowing + placeholder for consolidate mode"
```

---

### Task 6: ShipmentsRoute — the consolidate mode

**Files:**
- Modify: `apps/odyssey-one/src/routes/shipments/ShipmentsRoute.jsx`
- Modify: `apps/odyssey-one/src/styles/components.css` (append)
- Test: `apps/odyssey-one/src/routes/shipments/consolidateMode.test.jsx` (new)

- [ ] **Step 1: Write the failing test**

```jsx
// apps/odyssey-one/src/routes/shipments/consolidateMode.test.jsx
// @vitest-environment jsdom
// Consolidate mode (S154) end-to-end through the real ShipmentsRoute + mock
// grid service. Same harness as tabOrderPersistence.test.jsx.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import ShipmentsRoute from './ShipmentsRoute.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'
import { __clearMockPreferences } from '../../api/services/preferenceService'

beforeEach(() => {
  __clearMockPreferences()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function ReviewProbe() {
  const { state } = useLocation()
  return <div data-testid="review-probe">{JSON.stringify(state?.rows?.map((r) => r.id) ?? null)}</div>
}

function renderRoute(state) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[{ pathname: '/shipments', state }]}>
        <CustomersProvider><EditModeProvider><CreateOrderModeProvider>
          <Routes>
            <Route path="/shipments/consolidate/review" element={<ReviewProbe />} />
            <Route path="/shipments/*" element={<ShipmentsRoute />} />
          </Routes>
        </CreateOrderModeProvider></EditModeProvider></CustomersProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const rowBoxes = () => screen.getAllByRole('checkbox').filter((c) => c.getAttribute('aria-label')?.startsWith('Select ') && !c.getAttribute('aria-label').startsWith('Select all'))
const enabledRowBoxes = () => rowBoxes().filter((c) => !c.disabled)

async function enterMode() {
  fireEvent.click(await screen.findByRole('button', { name: 'Consolidate' }))
  await screen.findByRole('heading', { name: 'Shipments Consolidation' })
}

describe('consolidate mode', () => {
  test('entering swaps the chrome: title, buttons, checkboxes, no Export/toggle/actions', async () => {
    renderRoute()
    expect(await screen.findByRole('heading', { name: 'Shipments' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /export/i })).toBeTruthy()
    await enterMode()
    expect(screen.queryByRole('button', { name: /export/i })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Shipment actions' })).toBeNull()
    expect(screen.getByRole('button', { name: '0 Shipments Selected' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
    await waitFor(() => expect(rowBoxes().length).toBeGreaterThan(0))
    expect(document.querySelector('.sidebar--hidden')).toBeTruthy()
    expect(screen.getByPlaceholderText('Search in Shipments')).toBeTruthy()
  })

  test('first check locks the customer: badge row, placeholder, list scoped; unchecking releases', async () => {
    renderRoute()
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(0))
    const first = enabledRowBoxes()[0]
    fireEvent.click(first)
    expect(await screen.findByText('Selected Customer:')).toBeTruthy()
    const badge = screen.getByText('Selected Customer:').parentElement.querySelector('.badge, [class*="badge"]')
    expect(badge?.textContent?.length).toBeGreaterThan(0)
    expect(screen.getByPlaceholderText(/^Search for /)).toBeTruthy()
    expect(screen.getByRole('button', { name: '1 Shipments Selected' }).disabled).toBe(true)
    // Every listed row now belongs to the anchor customer → no row is disabled for customer reasons.
    await waitFor(() => expect(rowBoxes().every((c) => !c.disabled || !c.closest('td')?.textContent?.includes('Different customer'))).toBe(true))
    fireEvent.click(screen.getByRole('checkbox', { name: first.getAttribute('aria-label') }))
    await waitFor(() => expect(screen.queryByText('Selected Customer:')).toBeNull())
    expect(screen.getByPlaceholderText('Search in Shipments')).toBeTruthy()
  })

  test('two selected enables the primary; proceeding hands the rows to the review route', async () => {
    renderRoute()
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(1))
    fireEvent.click(enabledRowBoxes()[0])
    await screen.findByText('Selected Customer:')
    await waitFor(() => expect(enabledRowBoxes().filter((c) => !c.checked).length).toBeGreaterThan(0))
    fireEvent.click(enabledRowBoxes().filter((c) => !c.checked)[0])
    const go = await screen.findByRole('button', { name: '2 Shipments Selected' })
    expect(go.disabled).toBe(false)
    fireEvent.click(go)
    const probe = await screen.findByTestId('review-probe')
    expect(JSON.parse(probe.textContent)).toHaveLength(2)
  })

  test('Cancel restores the normal chrome and clears the selection', async () => {
    renderRoute()
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(0))
    fireEvent.click(enabledRowBoxes()[0])
    await screen.findByText('Selected Customer:')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByRole('heading', { name: 'Shipments' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /export/i })).toBeTruthy()
    expect(screen.queryByText('Selected Customer:')).toBeNull()
    expect(screen.queryAllByRole('checkbox').filter((c) => c.getAttribute('aria-label')?.startsWith('Select '))).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Consolidate' }))
    expect(await screen.findByRole('button', { name: '0 Shipments Selected' })).toBeTruthy()
  })

  test('location.state.consolidate re-enters the mode with the selection', async () => {
    const rows = [
      { id: 'a', sellShipment: 'a', customerId: 'VALTRIS_01', customerName: 'Valtris', shipmentType: 'Direct', tenderStatus: '', orders: [], pickupNumbers: [], poNumbers: [] },
      { id: 'b', sellShipment: 'b', customerId: 'VALTRIS_01', customerName: 'Valtris', shipmentType: 'Direct', tenderStatus: '', orders: [], pickupNumbers: [], poNumbers: [] },
    ]
    renderRoute({ consolidate: { rows } })
    expect(await screen.findByRole('heading', { name: 'Shipments Consolidation' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '2 Shipments Selected' }).disabled).toBe(false)
    expect(screen.getByText('Selected Customer:')).toBeTruthy()
    expect(screen.getByText('Valtris')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run — expect failure**

Run: `cd apps/odyssey-one && npx vitest run src/routes/shipments/consolidateMode.test.jsx`
Expected: FAIL — no "Consolidate" button.

- [ ] **Step 3: Implement in `ShipmentsRoute.jsx`**

(a) Imports — add:
```js
import { Boxes, Combine, FileText } from 'lucide-react'
import { Badge, Button, PageHeader } from '@odyssey/ui'
import { consolidationEligibility, CONSOLIDATION_ATTRIBUTE_KEYS } from '../../consolidation/eligibility'
```
(replace the existing `FileText` and `PageHeader` import lines). Add `useNavigate` to the `react-router-dom` import.

(b) State — right after `const location = useLocation()`:
```js
  const navigate = useNavigate()
  // Consolidate mode (S154, spec §3). `null` = normal Shipments. In mode,
  // `rows` is the selection: Map<sellShipment, row VM> — the snapshot rides
  // with the id so the review renders without a refetch and a row paged or
  // filtered away stays selected. Re-entered from the review's "Modify
  // Selection" via location.state.consolidate.rows (an array).
  const [consolidate, setConsolidate] = useState(() => (
    location.state?.consolidate
      ? { rows: new Map((location.state.consolidate.rows ?? []).map((r) => [r.id, r])) }
      : null
  ))
  const inMode = consolidate !== null
  const selection = consolidate?.rows ?? EMPTY_SELECTION
  // The first checked row locks the customer (user, 2026-09-19): derived, never stored.
  const anchor = selection.size ? selection.values().next().value : null
  const anchorCustomerId = anchor?.customerId ?? null
```
and above the component: `const EMPTY_SELECTION = new Map()`.

(c) Customer scope — replace every use of `selectedDataIds` in `listParams`, `queryIdentity` and the three `useCategoryCounts` calls with `effectiveCustomerIds`, defined right after the state above:
```js
  // Customer lock (spec §3.4): while a row is selected the list and the pill
  // counts are scoped to that customer alone. `dataId` on the Customers
  // panel IS the customerId stamped on rows (CustomersContext.jsx:33), so the
  // anchor's customerId goes straight into the same param.
  const effectiveCustomerIds = useMemo(
    () => (anchorCustomerId ? [anchorCustomerId] : selectedDataIds),
    [anchorCustomerId, selectedDataIds],
  )
```

(d) Handlers — after `handleSelectShipment`:
```js
  const enterConsolidate = useCallback(() => {
    setConsolidate({ rows: new Map() })
    setSelectedShipmentId(null)   // the bar is hidden in mode; nothing stays "open"
    setViewMode('pills')          // the toggle is hidden; pills are the mode's face
  }, [])
  const exitConsolidate = useCallback(() => setConsolidate(null), [])
  const handleSelectionChange = useCallback((rows, checked) => {
    setConsolidate((prev) => {
      if (!prev) return prev
      const next = new Map(prev.rows)
      for (const r of rows) checked ? next.set(r.id, r) : next.delete(r.id)
      return { rows: next }
    })
  }, [])
  const eligibility = useCallback((row) => consolidationEligibility(row, anchorCustomerId), [anchorCustomerId])
  const proceedToReview = useCallback(() => {
    navigate('/shipments/consolidate/review', { state: { rows: [...selection.values()] } })
  }, [navigate, selection])
```

(e) JSX — `AppShell` gets `sidebarHidden={inMode}` and the search slot becomes:
```jsx
      searchSlot={
        <ShipmentsGlobalSearch
          onCommitQuery={handleCommitQuery}
          onSelectShipment={handleSelectShipment}
          seedChips={seedChips}
          attributeKeys={inMode ? CONSOLIDATION_ATTRIBUTE_KEYS : null}
          placeholder={anchor ? `Search for ${anchor.customerName || anchor.customerId}` : 'Search in Shipments'}
        />
      }
```

Header:
```jsx
      <PageHeader title={inMode ? 'Shipments Consolidation' : 'Shipments'} style={{ marginBottom: anchor ? 12 : 25 }}>
        {inMode && (
          <Button variant="secondary" className="consolidate-cancel" onClick={exitConsolidate}>Cancel</Button>
        )}
        <Button
          variant="primary"
          icon={inMode ? <Combine size={20} /> : <Boxes size={20} />}
          disabled={inMode && selection.size < 2}
          onClick={inMode ? proceedToReview : enterConsolidate}
        >
          {inMode ? `${selection.size} Shipments Selected` : 'Consolidate'}
        </Button>
      </PageHeader>
      {anchor && (
        <div className="consolidate-customer text-label-sm-regular">
          <span>Selected Customer:</span>
          <Badge variant="blue">{anchor.customerName || anchor.customerId}</Badge>
        </div>
      )}
```
(If `Button` does not accept `className`, wrap the Cancel button in `<span className="consolidate-cancel">`.)

Tabs + controls:
```jsx
      <ShipmentsPanelTabs … hideViewToggle={inMode} />
      <TableControls itemCount={totalCount} hideExport={inMode} onExport={…unchanged…} />
```

Table:
```jsx
        <ShipmentTable
          shipments={pageRows}
          selectedId={inMode ? null : selectedShipmentId}
          onRowSelect={handleRowSelect}
          selectable={inMode}
          selection={selection}
          onSelectionChange={handleSelectionChange}
          eligibility={eligibility}
          …rest unchanged…
        />
```

BottomBar: wrap in `{!inMode && ( <BottomBar … /> )}`.

(f) CSS — append to `components.css`:
```css
/* Consolidate mode (S154). The Cancel button slides in beside the primary;
   the Selected Customer row sits under the PageHeader. */
@keyframes consolidate-slide-in {
  from { opacity: 0; transform: translateX(var(--spacing-4)); }
  to   { opacity: 1; transform: translateX(0); }
}
.consolidate-cancel { animation: consolidate-slide-in var(--transition-panel); }
@media (prefers-reduced-motion: reduce) { .consolidate-cancel { animation: none; } }
.consolidate-customer {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  color: var(--text-tertiary);
  margin-bottom: var(--spacing-4);
}
```

- [ ] **Step 4: Run — expect pass; then the whole shipments route folder**

Run: `cd apps/odyssey-one && npx vitest run src/routes/shipments`
Expected: PASS (new 5 tests; `tabOrderPersistence`, `OrderChange*` untouched).

If the customer-lock test's "list scoped" `waitFor` is flaky on the mock service's async refetch, keep the assertion on the badge row + placeholder and move the scoping proof to the browser check in Task 8 — note it in the commit body.

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/routes/shipments/ShipmentsRoute.jsx apps/odyssey-one/src/styles/components.css apps/odyssey-one/src/routes/shipments/consolidateMode.test.jsx
git commit -m "S154: consolidate mode — header stage, selection map, customer lock, review handoff"
```

---

### Task 7: The review route

**Files:**
- Create: `apps/odyssey-one/src/routes/shipments/ConsolidationReviewRoute.jsx`
- Create: `apps/odyssey-one/src/routes/shipments/consolidation-review.css`
- Modify: `apps/odyssey-one/src/App.jsx`
- Test: `apps/odyssey-one/src/routes/shipments/ConsolidationReviewRoute.test.jsx` (new)

- [ ] **Step 1: Write the failing test**

```jsx
// apps/odyssey-one/src/routes/shipments/ConsolidationReviewRoute.test.jsx
// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import ConsolidationReviewRoute from './ConsolidationReviewRoute.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'

vi.mock('../../api/services/shipmentService', () => ({
  getSellShipmentDetail: vi.fn(async (id) => ({
    stopsData: { summary: { volume: id === 'a' ? '1,000 cuft' : '375 cuft' } },
    orderDetails: [{ hazmat: id === 'b' ? 'Yes' : 'No' }],
  })),
}))

afterEach(cleanup)

const rows = [
  { id: 'a', sellShipment: 'a', buyShipment: 'BUY-A', odysseyShipmentIdentifier: 'O00000001', customerId: 'VALTRIS_01', customerName: 'Valtris Specialty Chemicals', origin: 'Sparta, NJ', destination: 'Baltimore, MD', pickupDate: '12/16/2026 08:00 CST', deliveryDate: '12/17/2026 08:00 CST', grossWeight: '15000', equipmentCode: 'TL', shipmentType: 'Direct', tenderStatus: '', shipmentStatus: '', orders: ['ORD-1'], orderCount: '1', pickupNumbers: [], poNumbers: [] },
  { id: 'b', sellShipment: 'b', buyShipment: 'BUY-B', odysseyShipmentIdentifier: 'O00000002', customerId: 'VALTRIS_01', customerName: 'Valtris Specialty Chemicals', origin: 'Sewaren, NJ', destination: 'Fairfax, VA', pickupDate: '12/16/2026 12:00 CST', deliveryDate: '12/18/2026 08:00 CST', grossWeight: '12500', equipmentCode: 'TL', shipmentType: 'Direct', tenderStatus: '', shipmentStatus: '', orders: ['ORD-2'], orderCount: '1', pickupNumbers: [], poNumbers: [] },
]

function ShipmentsProbe() {
  const { state } = useLocation()
  return <div data-testid="shipments-probe">{JSON.stringify(state ?? null)}</div>
}

function renderReview(state) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[{ pathname: '/shipments/consolidate/review', state }]}>
        <CustomersProvider><EditModeProvider><CreateOrderModeProvider>
          <Routes>
            <Route path="/shipments/consolidate/review" element={<ConsolidationReviewRoute />} />
            <Route path="/shipments/*" element={<ShipmentsProbe />} />
          </Routes>
        </CreateOrderModeProvider></EditModeProvider></CustomersProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ConsolidationReviewRoute', () => {
  test('renders the proposal from location.state rows', async () => {
    renderReview({ rows })
    expect(screen.getByRole('heading', { name: 'Review & Apply Manual Consolidation' })).toBeTruthy()
    expect(screen.getByText('Valtris Specialty Chemicals')).toBeTruthy()
    expect(screen.getByText('Selected Shipments (2)')).toBeTruthy()
    expect(screen.getByText('O00000001')).toBeTruthy()
    expect(screen.getByText('2 Pickup Stops')).toBeTruthy()
    expect(screen.getByText('2 Delivery Stops')).toBeTruthy()
    expect(screen.getByText('27,500 LB')).toBeTruthy()
    // details resolve → volume + hazmat fill in
    expect(await screen.findByText('1,375 cuft')).toBeTruthy()
    expect(screen.getByText('Yes')).toBeTruthy()
    const table = screen.getByRole('table', { name: 'Selected shipments to consolidate' })
    expect(within(table).getByText('BUY-A')).toBeTruthy()
    expect(within(table).getByText('BUY-B')).toBeTruthy()
  })

  test('stop timeline lists pickups then deliveries in selection order', () => {
    renderReview({ rows })
    const labels = screen.getAllByText(/^(P|D)\d$/).map((el) => el.textContent)
    expect(labels).toEqual(['P1', 'P2', 'D1', 'D2'])
  })

  test('Modify Selection returns to Shipments in mode with the rows', () => {
    renderReview({ rows })
    fireEvent.click(screen.getByRole('button', { name: 'Modify Selection' }))
    const state = JSON.parse(screen.getByTestId('shipments-probe').textContent)
    expect(state.consolidate.rows.map((r) => r.id)).toEqual(['a', 'b'])
  })

  test('Cancel and Modify Selection asks "Yes, Cancel", then leaves with nothing retained', () => {
    renderReview({ rows })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel and Modify Selection' }))
    expect(screen.getByText(/Are you sure you want to cancel the proposed consolidation\?/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(screen.queryByText(/Are you sure you want to cancel/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel and Modify Selection' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Cancel' }))
    expect(JSON.parse(screen.getByTestId('shipments-probe').textContent)).toBeNull()
  })

  test('Apply Consolidation confirms; Yes is a stub that stays on the page', () => {
    renderReview({ rows })
    fireEvent.click(screen.getByRole('button', { name: 'Apply Consolidation' }))
    expect(screen.getByText('Are you sure you want to apply this consolidation?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(screen.queryByText('Are you sure you want to apply this consolidation?')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Review & Apply Manual Consolidation' })).toBeTruthy()
  })

  test('no rows in state → empty state with a way back', () => {
    renderReview(undefined)
    expect(screen.getByText('No consolidation to review.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back to Shipments' }))
    expect(screen.getByTestId('shipments-probe')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run — expect failure**

Run: `cd apps/odyssey-one && npx vitest run src/routes/shipments/ConsolidationReviewRoute.test.jsx`
Expected: FAIL — cannot resolve `./ConsolidationReviewRoute.jsx`.

- [ ] **Step 3: Implement the route**

```jsx
// apps/odyssey-one/src/routes/shipments/ConsolidationReviewRoute.jsx
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'
import { Inbox, MapPin, Pencil } from 'lucide-react'
import { Badge, Breadcrumb, Button, DataTable, EmptyState, PageHeader, StepperButtonsFooter, SubAccordion, SummaryStrip, Timeline } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import { COLUMN_CONFIG } from '../../components/shipments/ShipmentTable'
import { getSellShipmentDetail } from '../../api/services/shipmentService'
import { buildProposal } from '../../consolidation/proposal'
import '../../components/shipments/order-change/order-change.css'
import './consolidation-review.css'

// Review & Apply Manual Consolidation — /shipments/consolidate/review
// (LINX-15787; VD x38TOJGsNryYl3LsKhCtSc node 2249:46444). Input is the
// selection ShipmentsRoute's consolidate mode hands over in
// location.state.rows; nothing is fetched to render the page except each
// shipment's detail for volume/hazmat. Apply is a confirm-dialog STUB this
// session (user, 2026-09-19: "nothing for now, lets land the first part
// first") — the eventual mechanics are CNS-01 / DEC-156.

const COLUMN_BY_KEY = Object.fromEntries(COLUMN_CONFIG.map((c) => [c.key, c]))
const REVIEW_COLUMNS = ['buyShipment', 'customerId', 'shipmentStatus', 'orderCount', 'orders', 'pickupDate']
const columnHelper = createColumnHelper()

const fmtLb = (n) => `${Math.round(n).toLocaleString('en-US')} LB`
const fmtCuft = (n) => (n == null ? '--' : `${Math.round(n).toLocaleString('en-US')} cuft`)
const fmtPct = (n) => (n == null ? '--' : `${n}%`)

function SelectedShipmentsTable({ rows }) {
  const columns = useMemo(() => REVIEW_COLUMNS.map((key) => {
    const cfg = COLUMN_BY_KEY[key]
    return columnHelper.accessor(key, {
      id: key,
      header: cfg?.label ?? key,
      cell: cfg?.render ? ({ row }) => cfg.render(row.original) : ({ getValue }) => getValue() ?? '—',
      enableSorting: false,
    })
  }), [])
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel(), getRowId: (r) => r.id })
  return <DataTable table={table} ariaLabel="Selected shipments to consolidate" truncationTooltip />
}

export default function ConsolidationReviewRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const rows = location.state?.rows ?? []
  const [pending, setPending] = useState(null) // 'apply' | 'cancel' | null

  // Volume + hazmat live on the detail, not the grid row (proposal.js).
  const detailQueries = useQueries({
    queries: rows.map((r) => ({
      queryKey: ['shipment', 'detail', r.sellShipment],
      queryFn: () => getSellShipmentDetail(r.sellShipment),
    })),
  })
  const details = detailQueries.map((q) => q.data)
  const proposal = useMemo(() => buildProposal(rows, details), [rows, details]) // eslint-disable-line react-hooks/exhaustive-deps -- details is a fresh array each render; its contents are what matters

  const backInMode = () => navigate('/shipments', { state: { consolidate: { rows } } })
  const leave = () => navigate('/shipments')

  if (!rows.length) {
    return (
      <AppShell titleMode={{ title: 'Manual Consolidation', onClose: leave }}>
        <div className="order-change">
          <EmptyState icon={<Inbox size={32} />} message="No consolidation to review." />
          <div><Button variant="secondary" onClick={leave}>Back to Shipments</Button></div>
        </div>
      </AppShell>
    )
  }

  const timelineItems = proposal.stops.map((s) => ({
    key: s.key,
    label: s.label,
    // StopBadge has no blue/green "planned" skin yet — pending (white) is the
    // honest state for a stop that has not happened. VD colours are a
    // StopBadge variant owed to the D-thread.
    status: 'pending',
    content: (
      <div className="consolidation-review__stop">
        <div className="consolidation-review__stop-head">
          <span className="text-label-sm-medium">{s.location}</span>
          <Badge variant={s.type === 'pickup' ? 'blue' : 'green'}>{s.type === 'pickup' ? 'Pickup' : 'Delivery'}</Badge>
        </div>
        <span className="text-label-xs-regular consolidation-review__stop-date">Scheduled: {s.date}</span>
      </div>
    ),
  }))

  return (
    <AppShell titleMode={{ title: 'Manual Consolidation', onClose: backInMode }}>
      <div className="order-change consolidation-review">
        <nav className="order-change__crumbs" aria-label="Breadcrumb">
          <Breadcrumb label="Shipments Consolidation" onClick={backInMode} />
          <Breadcrumb label="Review & Apply" current />
        </nav>

        <PageHeader title="Review & Apply Manual Consolidation">
          <Button variant="secondary" icon={<Pencil size={20} />} onClick={backInMode}>Modify Selection</Button>
        </PageHeader>

        <div className="consolidation-review__body">
          <aside className="consolidation-review__side">
            <h2 className="text-display-xs-semibold consolidation-review__side-title">Proposed Stop Count &amp; Sequence</h2>
            <div className="consolidation-review__counts">
              <Badge variant="blue" leftIcon={<MapPin size={20} />}>{proposal.pickupCount} Pickup Stops</Badge>
              <Badge variant="green" leftIcon={<MapPin size={20} />}>{proposal.deliveryCount} Delivery Stops</Badge>
            </div>
            <h3 className="text-label-md-semibold">Planned Stops</h3>
            <Timeline items={timelineItems} aria-label="Planned stops" />
          </aside>

          <section className="consolidation-review__main">
            <h2 className="text-display-xs-semibold">Consolidation Summary</h2>
            <div className="consolidation-review__info">
              <div className="consolidation-review__info-cell">
                <span className="text-label-xs-regular consolidation-review__label">Customer Name</span>
                <span className="text-label-md-semibold">{proposal.customerName || proposal.customerId || '--'}</span>
              </div>
              <div className="consolidation-review__info-cell">
                <span className="text-label-xs-regular consolidation-review__label">Selected Shipments ({rows.length})</span>
                <div className="consolidation-review__chips">
                  {proposal.identifiers.map((id) => <Badge key={id} variant="purple">{id}</Badge>)}
                </div>
              </div>
            </div>
            <SummaryStrip
              className="consolidation-review__strip"
              items={[
                { label: 'Total Weight', value: fmtLb(proposal.weightLb) },
                { label: 'Weight Utilization', value: fmtPct(proposal.weightUtilization) },
                { label: 'Total Volume', value: fmtCuft(proposal.volumeCuft) },
                { label: 'Volume Utilization', value: fmtPct(proposal.volumeUtilization) },
                { label: 'Hazmat', value: proposal.hazmat == null ? '--' : (proposal.hazmat ? 'Yes' : 'No'), tone: proposal.hazmat ? 'negative' : undefined },
              ]}
            />
            <SubAccordion title="Selected shipments to consolidate" defaultExpanded meta={`${rows.length} items`}>
              <SelectedShipmentsTable rows={rows} />
            </SubAccordion>
          </section>
        </div>

        <div className="consolidation-review__footer">
          <StepperButtonsFooter
            cancelLabel="Cancel and Modify Selection"
            primaryLabel="Apply Consolidation"
            showSave={false}
            onCancel={() => setPending('cancel')}
            onPrimary={() => setPending('apply')}
          />
        </div>

        {pending === 'cancel' && (
          <ConfirmDialog
            title="Cancel Proposed Consolidation"
            message="Are you sure you want to cancel the proposed consolidation? All the selected shipments will be removed from the proposed consolidation."
            confirmLabel="Yes, Cancel"
            cancelLabel="No"
            onConfirm={leave}
            onCancel={() => setPending(null)}
          />
        )}
        {pending === 'apply' && (
          <ConfirmDialog
            title="Apply Proposed Consolidation"
            message="Are you sure you want to apply this consolidation?"
            confirmLabel="Yes"
            cancelLabel="No"
            // ponytail: Apply is a stub — creating the C… shipment, moving the
            // loads and soft-deleting the emptied directs (CNS-01/DEC-156) is
            // the next session's work. Yes just closes the dialog.
            onConfirm={() => setPending(null)}
            onCancel={() => setPending(null)}
          />
        )}
      </div>
    </AppShell>
  )
}
```

If `SubAccordion` has no `meta` prop that renders text (check `packages/ui/src/SubAccordion.jsx:85-100`), render `<span className="text-label-sm-regular">{rows.length} items</span>` as the first child instead. If `Badge` ignores `leftIcon` at 20px, pass `<MapPin size={16} />`.

- [ ] **Step 4: CSS**

```css
/* apps/odyssey-one/src/routes/shipments/consolidation-review.css
   Review & Apply Manual Consolidation (VD 2249:46444). Reuses .order-change
   for the page column + breadcrumb row; everything else is scoped here. */

.consolidation-review__body {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-6);
}

.consolidation-review__side {
  flex: 0 0 307px; /* VD SidePanel width */
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  padding: var(--spacing-5);
  background: var(--bg-primary);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-sm);
}
.consolidation-review__side-title { margin: 0; }
.consolidation-review__counts { display: flex; flex-direction: column; gap: var(--spacing-3); }
.consolidation-review__counts > * { justify-content: flex-start; padding: var(--spacing-3); }

.consolidation-review__stop { display: flex; flex-direction: column; gap: var(--spacing-1); }
.consolidation-review__stop-head { display: flex; align-items: center; gap: var(--spacing-2); }
.consolidation-review__stop-date { color: var(--text-tertiary); }

.consolidation-review__main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}
.consolidation-review__main > h2 { margin: 0; }

.consolidation-review__info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--bg-primary);
}
.consolidation-review__info-cell {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  padding: var(--spacing-4) var(--spacing-3);
}
.consolidation-review__info-cell + .consolidation-review__info-cell { border-left: 1px solid var(--border-subtle); }
.consolidation-review__label { color: var(--text-tertiary); }
.consolidation-review__chips { display: flex; flex-wrap: wrap; gap: var(--spacing-1); }

/* Bleed the footer to the main-content width like create-order's .co-footer. */
.consolidation-review__footer {
  margin-inline: calc(-1 * var(--spacing-8));
  margin-top: auto;
}
```

- [ ] **Step 5: Register the route** in `src/App.jsx` — add the import and the route above the splat:
```jsx
import ConsolidationReviewRoute from './routes/shipments/ConsolidationReviewRoute.jsx'
…
        <Route path="/shipments/consolidate/review" element={<ConsolidationReviewRoute />} />
        <Route path="/shipments/*" element={<ShipmentsRoute />} />
```

- [ ] **Step 6: Run — expect pass; then the full app suite and the build**

Run: `cd apps/odyssey-one && npx vitest run src/routes/shipments/ConsolidationReviewRoute.test.jsx`
Expected: PASS (6 tests).

Run: `cd apps/odyssey-one && npx vitest run`
Expected: all green (S153 baseline 2,716 tests + 24 new).

Run: `npm run build:odyssey-one` (repo root)
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add apps/odyssey-one/src/routes/shipments/ConsolidationReviewRoute.jsx apps/odyssey-one/src/routes/shipments/consolidation-review.css apps/odyssey-one/src/routes/shipments/ConsolidationReviewRoute.test.jsx apps/odyssey-one/src/App.jsx
git commit -m "S154: Review & Apply Manual Consolidation route (LINX-15787, VD 2249:46444) — Apply stubbed"
```

---

### Task 8: Decision log + browser check (main thread)

**Files:**
- Modify: `vault/10-domains/consolidation/decisions/decision-log.md`

- [ ] **Step 1: Append CNS-07…CNS-10** (same shape as CNS-01…06):

- **CNS-07 — Manual consolidation is a feature of the Shipments screen, not a sidebar area (Oct MVP).** Previous: CNS-02 (a 7th nav area with three sub-pages). Decision: a "Consolidate" stage of `/shipments` + `/shipments/consolidate/review`. Source: user 2026-09-19; Dave 2026-09-17 01:04:18 (*"it's not"* a different module); Manuela's proposal at 00:51:08 with Dave *"absolutely"* / Adam *"Yes"*. Affects: `ShipmentsRoute`, `App.jsx`; CNS-02 stays as the deck's reading.
- **CNS-08 — Checkbox eligibility = Direct + no active tender + one customer (PROVISIONAL).** Sources: Dave 00:37:46/00:42:08, 00:08:17/00:15:38, 00:09:06 (exceptions irrelevant); Ramesh 00:05:00. Not applied: Allow Optimization, OCM 97–101, status = Consolidation (backend pool). User 2026-09-19: *"we need to discuss this in the future but do your suggestion"*. Affects: `src/consolidation/eligibility.js`.
- **CNS-09 — Consolidation ID IS the Odyssey Shipment Identifier (`C…`) — closes CNS-04.** Source: Manuela/Adam/Dave 2026-09-17 00:51:01–00:51:07; Ramesh 2026-09-15 00:14:44 conceding. Affects: the review shows `odysseyShipmentIdentifier` chips; the success modal's "Consolidation ID" will be the new shipment's `C…` id.
- **CNS-10 — The first selected row locks the customer and scopes the list.** Decision: `customerIds = [anchor.customerId]` for list + counts while a selection exists; "Selected Customer" badge row; search placeholder "Search for {customer}". The Customers panel is untouched. Source: user 2026-09-19. Affects: `ShipmentsRoute` §3.4.

- [ ] **Step 2: Browser check, mock runtime** (`npm run dev:odyssey-one`): Consolidate → chrome swaps, sidebar slides, checkbox on a Sent-tendered row is disabled with the tooltip, first check shows the badge row + placeholder and the pill counts drop to one customer, two checks enable the primary, review renders totals and the timeline, Modify Selection returns with both rows still checked, Cancel and Modify Selection → Yes, Cancel lands on plain Shipments. Repeat against live (`.env.local`) for the list scoping and the detail-driven volume/hazmat.

- [ ] **Step 3: Commit**

```bash
git add vault/10-domains/consolidation/decisions/decision-log.md
git commit -m "S154: CNS-07…10 — consolidation as a Shipments feature, eligibility (provisional), Consolidation ID, customer lock"
```

---

## Self-review against the spec

- §3.1 enter → T6 (b,e). §3.2 chrome table → T4 + T6 (title, buttons, sidebar, Export, toggle, actions column T3, BottomBar/rows inert T3+T6, search T5+T6). §3.3 selection → T3 + T6 (Map, header checkbox, eligibility T1, tooltips). §3.4 customer lock → T6 (c, e) + CNS-10. §3.5 attributes → T1 (keys) + T5. §3.6 leaving → T6 (d). §4 review → T2 + T7 (layout, timeline, summary, strip, table, footer, three actions, empty state). §5 code shape → file map. §6 tests → T1–T7 test files; browser check T8. §7 open questions → unchanged, carried in the decision log.
- Names used consistently: `consolidationEligibility`, `CONSOLIDATION_ATTRIBUTE_KEYS`, `buildProposal`, `capacityFor`, `utilizationPct`, `narrowSuggestionSections`, props `selectable` / `selection` / `onSelectionChange` / `eligibility` / `hideExport` / `hideViewToggle` / `sidebarHidden` / `attributeKeys` / `placeholder`; state `location.state.rows` (→ review) and `location.state.consolidate.rows` (→ shipments).
- Known soft spots called out inline: `.button-toggle` class name (T4), `Button className` (T6), `SubAccordion meta` / `Badge leftIcon` (T7), mock-service async in the customer-lock test (T6).
