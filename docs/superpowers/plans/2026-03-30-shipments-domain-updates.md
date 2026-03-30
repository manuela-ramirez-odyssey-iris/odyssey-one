# Shipments Domain Updates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the React prototype with all stakeholder feedback from the Mar 23 + Mar 25 grooming sessions (David Johns + Jana).

**Architecture:** The app is a React 19 + Vite + Tailwind v4 single-page prototype. All changes are to existing components — no new files needed. The data generator (`tools/generate.mjs`) produces `shipments.json` and `shipment-details.json` consumed by the app.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, lucide-react, @faker-js/faker (seed 42)

---

## Task 1: Fix Export Modal Labels

**Why:** Jana clarified that the export choice is about **columns**, not records. "Do you want all 42 columns or just the ones visible on the table?" Both options export the same filtered set of rows.

**Files:**
- Modify: `src/components/shipments/TableControls.jsx:269-317`

- [ ] **Step 1: Update the modal description and button labels**

In `src/components/shipments/TableControls.jsx`, find the export modal section (~line 269):

Replace the description text:
```
Old: "Choose which records to include in the export. Only the first 10,000 records will be exported."
New: "Choose which columns to include in the export. Only the first 10,000 records will be exported."
```

Replace the two button labels:
```
Old: "Export all records"     →  New: "Export all columns"
Old: "Export filtered records" →  New: "Export current columns"
```

Keep the record count badges on each button — they still show how many rows will be exported.

- [ ] **Step 2: Verify in browser**

Run: `bun run dev` (if not already running on localhost:3010)
Open the export modal from the toolbar. Confirm labels now read "Export all columns" and "Export current columns" with record counts still visible.

- [ ] **Step 3: Commit**

```bash
git add src/components/shipments/TableControls.jsx
git commit -m "fix: export modal labels — columns not records (Jana feedback)"
```

---

## Task 2: Reorder Bottom Bar Tabs

**Why:** David said stops should sit between Product and Routing Guide. Also, Tender History and History were deprioritized by Jana — move them to the end.

**Files:**
- Modify: `src/components/detail/BottomBar.jsx:26-37`

- [ ] **Step 1: Reorder the TABS array**

In `src/components/detail/BottomBar.jsx`, replace the TABS array (lines 26-37):

```javascript
const TABS = [
  { key: 'order', label: 'Order' },
  { key: 'product', label: 'Product' },
  { key: 'stops', label: 'Stops' },
  { key: 'routing', label: 'Routing guide' },
  { key: 'cost', label: 'Cost Allocation' },
  { key: 'instructions', label: 'Instructions' },
  { key: 'documents', label: 'Documents' },
  { key: 'notes', label: 'Notes' },
  { key: 'tender', label: 'Tender History' },
  { key: 'history', label: 'History' },
]
```

New order: Order → Product → **Stops** → Routing Guide → Cost Allocation → Instructions → Documents → Notes → Tender History → History (deprioritized to end).

- [ ] **Step 2: Verify in browser**

Select a shipment. Confirm tabs appear in the new order. Click each tab to verify content still loads.

- [ ] **Step 3: Commit**

```bash
git add src/components/detail/BottomBar.jsx
git commit -m "fix: reorder bottom bar tabs — stops after product, history tabs to end"
```

---

## Task 3: Enhance Order Dropdown with Context

**Why:** David said "just looking at 4 order IDs doesn't tell me which order I want to look at." Users need origin, destination, and weight alongside each order ID.

**Files:**
- Modify: `src/components/detail/BottomBar.jsx` (dropdown rendering, ~lines 353-372)
- Read: `src/data/index.js` (to understand how detail data is accessed)

- [ ] **Step 1: Identify available order data**

The `details` prop passed to BottomBar contains `orderDetails[]` where each entry has `shipFrom`, `shipTo`, and product totals. The `shipment` prop has `orders[]` (order IDs). Cross-reference by index — `orderDetails[i]` corresponds to `orders[i]`.

- [ ] **Step 2: Update the dropdown to show origin, destination, weight**

In the dropdown rendering section (~lines 353-372), update each order item to show additional context. Replace the simple badge-only rendering:

```jsx
{shipment.orders.map((ord, i) => {
  const orderDetail = details?.orderDetails?.[i]
  const origin = orderDetail?.shipFrom?.city || '—'
  const dest = orderDetail?.shipTo?.city || '—'
  const weight = orderDetail?.totals?.grossWeight
  const weightDisplay = weight ? `${Number(weight).toLocaleString()} lbs` : ''

  return (
    <button
      key={ord}
      onClick={() => { setSelectedOrderIdx(i); setOrderDropdownOpen(false) }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        background: selectedOrderIdx === i ? 'var(--bg-secondary)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-primary)',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => { if (selectedOrderIdx !== i) e.currentTarget.style.background = 'var(--bg-tertiary)' }}
      onMouseLeave={(e) => { if (selectedOrderIdx !== i) e.currentTarget.style.background = 'transparent' }}
    >
      <Badge variant={BADGE_COLORS[i]}>{ord}</Badge>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        {origin} → {dest}
      </span>
      {weightDisplay && (
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
          {weightDisplay}
        </span>
      )}
    </button>
  )
})}
```

- [ ] **Step 3: Adjust dropdown width to accommodate new content**

The dropdown needs to be wider to fit the extra text. Find the dropdown container style and update `minWidth` from its current value to `320px` (or `width: 'max-content', minWidth: 280`).

- [ ] **Step 4: Verify in browser**

Select a shipment with multiple orders. Open the order dropdown. Confirm each option shows: colored badge + origin → destination + weight. Verify selecting an order still updates the tab content.

- [ ] **Step 5: Commit**

```bash
git add src/components/detail/BottomBar.jsx
git commit -m "feat: order dropdown shows origin, destination, weight (David feedback)"
```

---

## Task 4: Products Tab — Default Expanded

**Why:** David said "when it's closed, it doesn't have any value." Users go to products to see everything on the shipment — pallets, hazmat, etc.

**Files:**
- Modify: `src/components/detail/ProductTab.jsx:136`

- [ ] **Step 1: Change default expanded state**

In `src/components/detail/ProductTab.jsx`, find the `expandedOrders` state initialization (~line 136):

```javascript
// Old:
const [expandedOrders, setExpandedOrders] = useState({})

// New — initialize all orders as expanded:
const [expandedOrders, setExpandedOrders] = useState(() => {
  if (!data?.orders) return {}
  const init = {}
  data.orders.forEach((order) => { init[order.orderNumber || order.orderId] = true })
  return init
})
```

Check what key is used for the expand toggle — the toggle handler likely uses `orderNumber` or `orderId`. Match the same key in the initializer.

- [ ] **Step 2: Handle data changes**

Add a `useEffect` to re-expand when data changes (e.g., user selects a different shipment):

```javascript
useEffect(() => {
  if (!data?.orders) return
  const init = {}
  data.orders.forEach((order) => { init[order.orderNumber || order.orderId] = true })
  setExpandedOrders(init)
}, [data])
```

- [ ] **Step 3: Verify in browser**

Select a shipment → go to Product tab. All order groups should be expanded by default. The collapse toggle should still work when clicked.

- [ ] **Step 4: Commit**

```bash
git add src/components/detail/ProductTab.jsx
git commit -m "fix: products tab defaults to expanded (David feedback)"
```

---

## Task 5: Remove Instruction Types

**Why:** David said business pushed back — "they don't have it today and it might be easier to ignore that type until the future."

**Files:**
- Modify: `src/components/detail/InstructionsTab.jsx`

- [ ] **Step 1: Remove TypeBadge rendering from instruction rows**

In `src/components/detail/InstructionsTab.jsx`:
- Find where `<TypeBadge type={instr.type} />` is rendered (~line 143) and remove it
- The sequence number and instruction text should remain
- The TypeBadge component definition and TYPE_COLORS map (lines 4-36) can be removed entirely since they'll be unused

- [ ] **Step 2: Verify in browser**

Select a shipment → Instructions tab. Instructions should show sequence number + text only, no colored type badges.

- [ ] **Step 3: Commit**

```bash
git add src/components/detail/InstructionsTab.jsx
git commit -m "fix: remove instruction type badges (business deprioritized)"
```

---

## Task 6: Fix Document Types — Replace Invoice with POD

**Why:** David said "we would never have an invoice" in shipments. Replace with POD (Proof of Delivery).

**Files:**
- Modify: `src/components/detail/DocumentsTab.jsx:13` (DOC_TYPES constant)
- Modify: `tools/generate.mjs:15` (DOC_TYPES in generator)

- [ ] **Step 1: Update DOC_TYPES in DocumentsTab.jsx**

```javascript
// Old:
const DOC_TYPES = ['BoL', 'MBoL', 'Invoice', 'Instructions', 'Other']

// New:
const DOC_TYPES = ['BoL', 'MBoL', 'POD', 'Instructions', 'Other']
```

- [ ] **Step 2: Update badge color for POD**

Find the badge color mapping for document types in the same file. Replace the "Invoice" color entry with "POD". If the mapping uses a switch or object:

```javascript
// Old: Invoice: 'yellow' (or similar)
// New: POD: 'yellow'
```

Keep the same color that Invoice had — yellow works well for POD.

- [ ] **Step 3: Update the data generator**

In `tools/generate.mjs`, find `DOC_TYPES` (~line 15):

```javascript
// Old:
const DOC_TYPES = ['BoL', 'MBoL', 'Invoice', 'Instructions', 'Other']

// New:
const DOC_TYPES = ['BoL', 'MBoL', 'POD', 'Instructions', 'Other']
```

- [ ] **Step 4: Regenerate data**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-shipments
node tools/generate.mjs
```

Verify `src/data/shipment-details.json` no longer contains "Invoice" document types and now has "POD" entries.

- [ ] **Step 5: Verify in browser**

Select a shipment → Documents tab. Document type dropdown should show POD instead of Invoice. Any existing documents should display the POD badge correctly.

- [ ] **Step 6: Commit**

```bash
git add src/components/detail/DocumentsTab.jsx tools/generate.mjs src/data/shipment-details.json
git commit -m "fix: replace Invoice with POD in document types (David feedback)"
```

---

## Task 7: Fix Routing Guide Status Logic in Generator

**Why:** David said demo data has unrealistic status combinations. Sequential tendering means: carriers above the accepted one should be declined/rejected, carriers below should have no status (not yet tendered). "If we showed operations this, they would get confused."

**Files:**
- Modify: `tools/generate.mjs` (routing guide generation section)

- [ ] **Step 1: Find routing option generation in generate.mjs**

Search for where routing guide options and their statuses are assigned. Currently statuses are likely random — one "Accepted" and the rest random (Pending/Rejected/Declined).

- [ ] **Step 2: Implement sequential tendering logic**

Replace the status assignment logic:

```javascript
// Generate routing options with realistic sequential tendering
const numOptions = faker.number.int({ min: 3, max: 6 })
const acceptedRank = faker.number.int({ min: 1, max: numOptions }) // which rank accepted

const options = Array.from({ length: numOptions }, (_, i) => {
  const rank = i + 1
  let status
  if (rank < acceptedRank) {
    // Carriers above accepted: they were tried first and said no
    status = faker.helpers.arrayElement(['Declined', 'Rejected'])
  } else if (rank === acceptedRank) {
    status = 'Accepted'
  } else {
    // Carriers below accepted: never tendered
    status = ''
  }

  return {
    rank,
    scac: /* existing scac generation */,
    carrierName: /* existing carrier generation */,
    // ... other fields stay the same ...
    status,
  }
})
```

The key rule: `rank < acceptedRank` → Declined or Rejected. `rank === acceptedRank` → Accepted. `rank > acceptedRank` → empty/no status.

- [ ] **Step 3: Regenerate data**

```bash
node tools/generate.mjs
```

- [ ] **Step 4: Spot-check the output**

```bash
# Quick check: look at a few routing guides in shipment-details.json
node -e "
const d = require('./src/data/shipment-details.json');
const keys = Object.keys(d).slice(0, 5);
keys.forEach(k => {
  const opts = d[k].routingGuide?.options || [];
  console.log(k, opts.map(o => o.rank + ':' + o.status).join(', '));
});
"
```

Expected pattern: `1:Declined, 2:Rejected, 3:Accepted, 4:, 5:` (or similar — accepted is never rank 1 unless it's a 1-carrier shipment).

- [ ] **Step 5: Update RoutingGuideTab display for empty status**

In `src/components/detail/RoutingGuideTab.jsx`, verify that an empty status string renders gracefully (no badge shown, or a subtle "—" placeholder). If currently it only handles Accepted/Pending/Rejected/Declined, add a fallback:

```javascript
// In the status badge rendering, handle empty/no status:
if (!option.status) return null  // or <span style={{ color: 'var(--text-tertiary)' }}>—</span>
```

- [ ] **Step 6: Verify in browser**

Select a shipment → Routing Guide tab. Statuses should follow sequential logic. No "Pending" status should appear alongside "Accepted."

- [ ] **Step 7: Commit**

```bash
git add tools/generate.mjs src/data/shipment-details.json src/components/detail/RoutingGuideTab.jsx
git commit -m "fix: routing guide statuses follow sequential tendering logic (David feedback)"
```

---

## Task 8: Stops Tab — Compact Layout + P/D Labels + Data Priority

**Why:** David wants stops condensed ("make that slimmer so they can see it all together"), P1/D1 naming convention, and location + date as the most prominent fields.

**Files:**
- Modify: `src/components/detail/StopsTab.jsx`

- [ ] **Step 1: Update stop labels from "Stop N" to P/D convention**

Find the stop label rendering (~line 100 area). Replace the "Stop {stopNumber}" pattern:

```javascript
// Old:
`Stop ${String(stop.stopNumber).padStart(2, '0')}`

// New:
const prefix = stop.type === 'pickup' ? 'P' : 'D'
// Count pickups and deliveries separately for numbering
const sameTypeStops = stops.filter(s => s.type === stop.type)
const typeIndex = sameTypeStops.indexOf(stop) + 1
const label = `${prefix}${typeIndex}`
```

This gives P1, P2 for pickups and D1, D2 for deliveries.

- [ ] **Step 2: Prioritize location and date visually**

Restructure each stop card to lead with:
1. **Location** (city, state) — largest/boldest text
2. **Date** — prominent secondary text
3. Other fields (weight, volume, appointment, etc.) — smaller/tertiary

Reduce padding inside stop cards. Target a compact look where each stop is ~60-80px tall instead of the current taller layout.

- [ ] **Step 3: Reduce vertical spacing between stops**

Find the gap/padding between stop items (~line 153, `paddingBottom: '20px'`) and reduce:

```javascript
// Old: paddingBottom: '20px'
// New: paddingBottom: '8px'
```

Also tighten the timeline connector height to match.

- [ ] **Step 4: Keep the timeline visual but make it thinner**

The colored nodes (green pickup, blue delivery) should remain but can be smaller. Reduce node sizes from their current diameter to ~20px. Keep the connecting line between nodes.

- [ ] **Step 5: Verify in browser**

Select a shipment → Stops tab. Stops should show:
- P1, P2, D1, D2 labels (not "Stop 01")
- Location and date prominent
- Compact vertical spacing — all stops visible without scrolling in most cases

- [ ] **Step 6: Commit**

```bash
git add src/components/detail/StopsTab.jsx
git commit -m "fix: stops tab — P/D labels, compact layout, location+date priority (David feedback)"
```

---

## Task 9: Cost Allocation — Load Detail Collapsed by Default

**Why:** David said "the summary level works fine — they're not going to need to go more detailed than the order level."

**Files:**
- Modify: `src/components/detail/CostAllocationTab.jsx:41-46`

- [ ] **Step 1: Check current behavior**

Currently all orders are expanded by default (lines 41-46 initialize all as `true`). The orders show a summary row that can be expanded to reveal load-level detail. We need:
- Order summary rows: **visible** (keep as-is — these ARE the expanded state)
- Load detail within each order: **collapsed** by default

If the expand/collapse is at the order level (showing/hiding load breakdowns), then we need a **second** state for load expansion. Check if there's already a `loads` expand toggle inside each order.

If the current expand toggle reveals load rows, change the default from `true` to `false`:

```javascript
// Old:
data.planned.orders.forEach((o) => { init[o.orderId] = true })

// New:
data.planned.orders.forEach((o) => { init[o.orderId] = false })
```

- [ ] **Step 2: Verify the summary row still shows key info when collapsed**

When collapsed, the order row should still display: order number, AP total, AR total, margin. Only the per-load breakdown rows should be hidden.

- [ ] **Step 3: Verify in browser**

Select a shipment → Cost Allocation tab. Order-level summary should be visible. Clicking an order should expand to show load-level detail.

- [ ] **Step 4: Commit**

```bash
git add src/components/detail/CostAllocationTab.jsx
git commit -m "fix: cost allocation loads collapsed by default, order summary visible (David feedback)"
```

---

## Task 10: Remove Instruction Types from Generator

**Why:** Aligns the generated data with Task 5 (UI already removed type badges). The data should match.

**Files:**
- Modify: `tools/generate.mjs` (instruction generation section)

- [ ] **Step 1: Remove type field from generated instructions**

In `tools/generate.mjs`, find where instructions are generated with a `type` field. Remove the type assignment — instructions should only have `seq` and `text`:

```javascript
// Old:
{ seq: n, type: faker.helpers.arrayElement(INSTRUCTION_TYPES), text: '...' }

// New:
{ seq: n, text: '...' }
```

The `INSTRUCTION_TYPES` constant at the top (~line 14) can be removed if no longer used.

If instruction text templates reference types (e.g., "BOL: Load per instructions..."), keep the text as-is — the instruction type was about the structured field, not the text content.

- [ ] **Step 2: Regenerate data**

```bash
node tools/generate.mjs
```

- [ ] **Step 3: Verify no type field in generated instructions**

```bash
node -e "
const d = require('./src/data/shipment-details.json');
const first = Object.values(d)[0];
console.log(JSON.stringify(first.instructions?.[0]?.instructions?.slice(0, 2), null, 2));
"
```

Should show `seq` and `text` only, no `type`.

- [ ] **Step 4: Commit**

```bash
git add tools/generate.mjs src/data/shipment-details.json
git commit -m "fix: remove instruction types from generated data"
```

---

## Task 11: Update Data Constraint — Multi-Customer Shipments

**Why:** David confirmed orders from DIFFERENT customers can be on the same shipment. The generator currently enforces same-customer-per-shipment. This affects cost allocation (different markup per customer).

**Files:**
- Modify: `tools/generate.mjs` (shipment generation section)

- [ ] **Step 1: Find the same-customer constraint in the generator**

Search for where orders within a shipment are forced to share a `customerId`. This is likely in the shipment loop where orders are generated or assigned.

- [ ] **Step 2: Allow ~20% of multi-order shipments to have mixed customers**

Only apply to shipments with 2+ orders. Keep 80% same-customer for realism:

```javascript
// For multi-order shipments:
const mixCustomers = shipment.orders.length > 1 && faker.number.float() < 0.2
if (mixCustomers) {
  // Assign a different customer to the second (and possibly third) order
  // Pick from the customer pool but exclude the primary customer
}
```

- [ ] **Step 3: Update cost allocation for mixed-customer shipments**

When generating cost allocation data for mixed-customer shipments, vary the markup percentage per order:

```javascript
// Per-order markup based on customer
const markupByCustomer = {
  [customerId1]: 1.25,  // 25% markup
  [customerId2]: 1.35,  // 35% markup
}
```

- [ ] **Step 4: Regenerate and spot-check**

```bash
node tools/generate.mjs
node -e "
const s = require('./src/data/shipments.json');
const multi = s.filter(sh => sh.orders.length > 1);
console.log('Multi-order shipments:', multi.length);
// Check if any have orders with different customerIds
"
```

- [ ] **Step 5: Commit**

```bash
git add tools/generate.mjs src/data/shipments.json src/data/shipment-details.json
git commit -m "feat: support multi-customer shipments in generated data (~20% of multi-order)"
```

---

## Task 12: Add Tender Status "Sent" + "Cancelled" to Routing Guide Display

**Why:** Jana defined 5 tender statuses (Sent, Accepted, Declined, Rejected, Cancelled). The current UI only styles 4 (Accepted, Pending, Rejected, Declined). "Pending" should be "Sent", and "Cancelled" needs to be added.

**Files:**
- Modify: `src/components/detail/RoutingGuideTab.jsx:4-8` (status styles)

- [ ] **Step 1: Update status badge styles**

```javascript
// Old:
const STATUS_STYLES = {
  Accepted: { bg: '...', color: '...' },  // green
  Pending: { bg: '...', color: '...' },    // yellow
  Rejected: { bg: '...', color: '...' },   // red
  Declined: { bg: '...', color: '...' },   // gray
}

// New:
const STATUS_STYLES = {
  Accepted: { bg: 'var(--bg-success-subtle, #ecfdf5)', color: 'var(--text-success, #065f46)' },
  Sent: { bg: 'var(--bg-warning-subtle, #fffbeb)', color: 'var(--text-warning, #92400e)' },
  Declined: { bg: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' },
  Rejected: { bg: 'var(--bg-error-subtle, #fef2f2)', color: 'var(--text-error, #991b1b)' },
  Cancelled: { bg: 'var(--bg-tertiary)', color: 'var(--text-placeholder)' },
}
```

Remove "Pending" — it's now "Sent" per Jana's definitions.

- [ ] **Step 2: Verify in browser**

Select a shipment → Routing Guide tab. Statuses should show as: Declined/Rejected (above accepted), Accepted (one carrier), empty (below). "Sent" and "Cancelled" styles are ready for when live data includes them.

- [ ] **Step 3: Commit**

```bash
git add src/components/detail/RoutingGuideTab.jsx
git commit -m "fix: tender statuses — Sent replaces Pending, add Cancelled (Jana definitions)"
```

---

## Summary of Changes

| Task | Component | Type | Source |
|------|-----------|------|--------|
| 1 | Export Modal | Fix labels | Jana |
| 2 | BottomBar Tabs | Reorder | David |
| 3 | Order Dropdown | Enhancement | David |
| 4 | ProductTab | Default expanded | David |
| 5 | InstructionsTab | Remove types | David |
| 6 | DocumentsTab + Generator | Replace Invoice→POD | David |
| 7 | Generator + RoutingGuide | Fix status logic | David |
| 8 | StopsTab | Compact + P/D labels | David |
| 9 | CostAllocationTab | Load detail collapsed | David |
| 10 | Generator | Remove instruction types | David |
| 11 | Generator | Multi-customer shipments | David |
| 12 | RoutingGuideTab | Tender status names | Jana |

**Dependencies:** Tasks 5→10 (remove types from UI before data). Tasks 6, 7, 10, 11 all modify the generator — run `node tools/generate.mjs` once after all generator changes if batching.

**Independent tasks (can be parallelized):** Tasks 1, 2, 3, 4, 8, 9 are all independent of each other and of generator tasks.
