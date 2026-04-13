# David's Feedback Stories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 11 stories (SHP-43 through SHP-53) from David's feedback review and Apr 9 grooming session.

**Architecture:** Each story is independent — no cross-dependencies. Ordered from quick wins (XS/S) to larger stories (M/L). All changes are in existing files with no new files needed except for one potential utility. The codebase uses React 19 with inline styles, design tokens via CSS custom properties, and portal-based tooltips.

**Tech Stack:** React 19, Vite, lucide-react icons, react-window (virtualized table), CSS custom properties (tokens.css), createPortal tooltips

---

## Task 1: SHP-49 — Rename "Sent" → "Tender Sent" (XS)

**Files:**
- Modify: `src/components/shipments/MonitorPanels.jsx:23`

- [ ] **Step 1: Change the label**

In `MonitorPanels.jsx`, line 23, change:

```jsx
{ label: 'Sent', count: metrics.sent ?? 0 },
```

to:

```jsx
{ label: 'Tender Sent', count: metrics.sent ?? 0 },
```

- [ ] **Step 2: Verify in browser**

Run: `bun run dev`
Navigate to Monitoring panel. Confirm the tab that previously said "Sent" now reads "Tender Sent". Badge count should be unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/components/shipments/MonitorPanels.jsx
git commit -m "feat(SHP-49): rename 'Sent' to 'Tender Sent' in Monitoring panel tab"
```

---

## Task 2: SHP-52 — Order # Column Deprioritized (XS)

**Files:**
- Modify: `src/components/detail/ColumnPanel.jsx:52-56`

- [ ] **Step 1: Move 'orders' in DEFAULT_COLUMNS**

In `ColumnPanel.jsx`, lines 52-56, change:

```js
const DEFAULT_COLUMNS = [
  'buyShipment', 'customerId', 'shipmentStatus', 'orders', 'orderCount',
  'pickupDate', 'deliveryDate', 'origin', 'destination', 'grossWeight',
  'mode', 'equipmentCode', 'scac', 'apFreightCost', 'validationMessage',
]
```

to:

```js
const DEFAULT_COLUMNS = [
  'buyShipment', 'customerId', 'shipmentStatus', 'orderCount',
  'pickupDate', 'deliveryDate', 'origin', 'destination', 'grossWeight',
  'mode', 'equipmentCode', 'scac', 'orders', 'apFreightCost', 'validationMessage',
]
```

`orders` moves from position 4 to position 13 (after `scac`, before `apFreightCost`).

- [ ] **Step 2: Verify in browser**

Refresh the shipments table. Order # column should now appear toward the right side of the table, after SCAC. The column should still function (badges, tooltip on hover).

- [ ] **Step 3: Commit**

```bash
git add src/components/detail/ColumnPanel.jsx
git commit -m "feat(SHP-52): move Order # column to far right in default preset"
```

---

## Task 3: SHP-43 — Hazmat Badge Visual (S)

**Files:**
- Modify: `src/components/detail/ProductTab.jsx:115-133,276-281` (HazmatTag component + styles)
- Modify: `src/components/shipments/ShipmentTable.jsx:62-134` (COLUMN_CONFIG — hazardous column)
- Modify: `src/data/index.js` (if hazardous field needs adding to search attributes)

- [ ] **Step 1: Create HazmatBadge style constants in ProductTab.jsx**

In `ProductTab.jsx`, replace the existing hazmat styles (lines 115-133):

```jsx
const hazmatTagBase = {
  display: 'inline-block',
  fontSize: 12,
  fontWeight: 600,
  padding: '1px 8px',
  borderRadius: 'var(--radius-sm)',
}

const hazmatYesStyle = {
  ...hazmatTagBase,
  background: 'var(--badge-red-bg)',
  color: 'var(--badge-red-text)',
}

const hazmatNoStyle = {
  ...hazmatTagBase,
  background: 'var(--bg-tertiary)',
  color: 'var(--text-tertiary)',
}
```

with:

```jsx
const hazmatBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 12,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(245, 158, 11, 0.12)',
  color: 'rgb(180, 110, 5)',
}
```

- [ ] **Step 2: Update HazmatTag component in ProductTab.jsx**

Replace the `HazmatTag` function (lines 276-281):

```jsx
function HazmatTag({ value }) {
  if (value === true || value === 'Yes') {
    return <span style={hazmatYesStyle}>Yes</span>
  }
  return <span style={hazmatNoStyle}>No</span>
}
```

with:

```jsx
function HazmatTag({ value }) {
  if (value === true || value === 'Yes') {
    return (
      <span style={hazmatBadgeStyle}>
        <TriangleAlert size={12} />
        Hazmat
      </span>
    )
  }
  return <span style={{ color: 'var(--text-placeholder)' }}>--</span>
}
```

- [ ] **Step 3: Add TriangleAlert import**

At the top of `ProductTab.jsx`, add:

```jsx
import { TriangleAlert } from 'lucide-react'
```

- [ ] **Step 4: Verify Product tab in browser**

Select a shipment, go to Product tab. Hazmat "Yes" products should show a yellow badge with warning triangle icon + "Hazmat" text. Hazmat "No" products should show "--".

- [ ] **Step 5: Add hazmat rendering to ShipmentTable**

In `ShipmentTable.jsx`, find the `COLUMN_CONFIG` array (starts at line 62). There should be a column for hazardous. If it exists, update its render function. If not, it's in the ALL_COLUMNS list in ColumnPanel.jsx.

First check: in `ColumnPanel.jsx` ALL_COLUMNS (lines 4-50), find the `hazardous` entry and note its label. Change the label from `'Hazardous(Y/N)'` to `'Hazardous'`.

Then in `ShipmentTable.jsx` `COLUMN_CONFIG`, add or update the hazardous column with a custom render:

```jsx
{ key: 'hazardous', label: 'Hazardous', width: 100, render: (val) => {
  if (val === true || val === 'Yes' || val === 'Y') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 12, fontWeight: 600, padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(245, 158, 11, 0.12)', color: 'rgb(180, 110, 5)',
      }}>
        <TriangleAlert size={12} />
        Hazmat
      </span>
    )
  }
  return <span style={{ color: 'var(--text-placeholder)' }}>--</span>
}},
```

Add `import { TriangleAlert } from 'lucide-react'` to ShipmentTable.jsx imports if not already there (check existing lucide imports and add to the destructured list).

- [ ] **Step 6: Verify Shipments table**

Add "Hazardous" column via Column Arrangement panel. Verify yellow badge for hazmat shipments, "--" for non-hazmat.

- [ ] **Step 7: Commit**

```bash
git add src/components/detail/ProductTab.jsx src/components/shipments/ShipmentTable.jsx src/components/detail/ColumnPanel.jsx
git commit -m "feat(SHP-43): hazmat yellow badge with warning icon, '--' when false"
```

---

## Task 4: SHP-48 — Date-Only Display with Time-on-Hover (S)

**Files:**
- Modify: `src/components/shipments/ShipmentTable.jsx:62-134` (pickupDate + deliveryDate columns in COLUMN_CONFIG)

- [ ] **Step 1: Create date formatting helper**

At the top of `ShipmentTable.jsx` (after imports, before COLUMN_CONFIG), add:

```jsx
function formatDateOnly(raw) {
  if (!raw) return '--'
  // raw format: "05/08/2026 06:30 CST"
  const parts = raw.split(' ')
  const datePart = parts[0] // "05/08/2026"
  const [mm, dd, yyyy] = datePart.split('/')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(mm, 10) - 1]} ${parseInt(dd, 10)}, ${yyyy}`
}
```

- [ ] **Step 2: Update pickupDate and deliveryDate columns**

In the `COLUMN_CONFIG` array, find the `pickupDate` and `deliveryDate` entries. Update both to use a render function that wraps the formatted date in a `DarkTooltip` showing the full raw value:

```jsx
{ key: 'pickupDate', label: 'Pickup Date', width: 120, render: (val) => (
  <DarkTooltip text={val || null} width="auto">
    <span>{formatDateOnly(val)}</span>
  </DarkTooltip>
)},
{ key: 'deliveryDate', label: 'Delivery Date', width: 120, render: (val) => (
  <DarkTooltip text={val || null} width="auto">
    <span>{formatDateOnly(val)}</span>
  </DarkTooltip>
)},
```

Make sure `DarkTooltip` is imported at the top of `ShipmentTable.jsx`. Check if it's already imported (it's used for shipment status tooltip). If not:

```jsx
import DarkTooltip from '../ui/DarkTooltip'
```

- [ ] **Step 3: Reduce column widths**

Since dates are now shorter (e.g., "Apr 10, 2026" instead of "05/10/2026 06:30 CST"), reduce both column widths from their current value (likely 160px) to `120`:

The width is already set in the render objects above.

- [ ] **Step 4: Verify in browser**

Refresh shipments table. Pickup Date and Delivery Date columns should show short date only (e.g., "May 8, 2026"). Hovering should show the full date+time in a dark tooltip.

- [ ] **Step 5: Commit**

```bash
git add src/components/shipments/ShipmentTable.jsx
git commit -m "feat(SHP-48): date-only display in table, full date+time on hover"
```

---

## Task 5: SHP-51 — Remove TenderSummary, Relocate Button (S)

**Files:**
- Modify: `src/components/detail/RoutingGuideTab.jsx:239-280` (remove TenderSummary), `~1495-1502` (add button near Add Quote)

- [ ] **Step 1: Remove TenderSummary rendering**

In `RoutingGuideTab.jsx`, find where `<TenderSummary>` is rendered in the main component's return JSX (search for `TenderSummary` usage — it's called somewhere in the main render around line 1480-1490). Remove the `<TenderSummary ... />` line entirely.

Also find the `TenderSummary` component definition (lines 239-280) and the `SummaryField` helper near it. Remove both — they're no longer used.

- [ ] **Step 2: Add "View Shipment Details" button left of "Add Quote"**

Find where "Add Quote" button is rendered (around line 1497-1502). The current code looks like:

```jsx
<SecondaryButton onClick={() => setQuoteModal({ isOpen: true, mode: 'add', carrierData: null })}>
  Add Quote
</SecondaryButton>
```

Add the "View Shipment Details" button to the left of it. The buttons should be in a flex container. If they're already in one, add before Add Quote:

```jsx
<SecondaryButton onClick={() => setDetailModalOpen(true)}>
  View Shipment Details
</SecondaryButton>
<SecondaryButton onClick={() => setQuoteModal({ isOpen: true, mode: 'add', carrierData: null })}>
  Add Quote
</SecondaryButton>
```

Make sure `detailModalOpen` state and `setDetailModalOpen` exist. The TenderDetailModal should already be wired to this state — find how it was previously opened from the TenderSummary's "View Full Details" button and reuse the same state variable.

- [ ] **Step 3: Verify in browser**

Select a shipment, go to Tender tab. The TenderSummary card should be gone. The sub-tab row should now show "View Shipment Details" button to the left of "Add Quote". Clicking it should open the TenderDetailModal as before.

- [ ] **Step 4: Commit**

```bash
git add src/components/detail/RoutingGuideTab.jsx
git commit -m "feat(SHP-51): remove TenderSummary, add 'View Shipment Details' button left of Add Quote"
```

---

## Task 6: SHP-53 — Tender Collapse: Animated Transition + Default Collapsed (S)

**Files:**
- Modify: `src/components/detail/RoutingGuideTab.jsx` (collapse state initialization + transition styles)

- [ ] **Step 1: Change default collapse state**

In `RoutingGuideTab.jsx`, find where the collapse state is initialized. Look for a `useState` like:

```jsx
const [isCollapsed, setIsCollapsed] = useState(false)
```

Change to:

```jsx
const [isCollapsed, setIsCollapsed] = useState(true)
```

This makes the collapsible right section start collapsed for all sub-tabs.

- [ ] **Step 2: Add CSS transition to the collapsible container**

Find the container that holds the collapsible columns (the right-side scrollable section of the 3-part table). It likely has a style with `width` or `maxWidth` that changes based on `isCollapsed`. Add a transition:

```jsx
transition: 'width var(--transition-slow), max-width var(--transition-slow), opacity var(--transition-slow)'
```

If the collapse works by setting width to 0, also add `overflow: 'hidden'` when collapsed so content doesn't bleed out during animation.

Also add the same transition to the collapse toggle button's container and any divider element so they animate together smoothly.

- [ ] **Step 3: Verify in browser**

Select a shipment, go to Tender tab. The right-side collapsible columns should start **collapsed**. Clicking the expand button should smoothly animate them open (300ms ease). Clicking collapse should smoothly animate them closed. Switching sub-tabs should maintain the collapse state.

- [ ] **Step 4: Commit**

```bash
git add src/components/detail/RoutingGuideTab.jsx
git commit -m "feat(SHP-53): tender collapse defaults to collapsed, smooth animation on toggle"
```

---

## Task 7: SHP-46 — Product Tab Table Styling Overhaul (S)

**Files:**
- Modify: `src/components/detail/ProductTab.jsx:29-101,161,179-194,235-251`

- [ ] **Step 1: Remove negative margin hack**

In `ProductTab.jsx` line 161, the wrapper div has:

```jsx
<div style={{ ...wrapperStyle, margin: 'calc(-1 * var(--spacing-4)) calc(-1 * var(--spacing-5))' }}>
```

Change to add top spacing instead:

```jsx
<div style={{ ...wrapperStyle, marginTop: 'var(--spacing-3)' }}>
```

This separates the table from the tab bar above it.

- [ ] **Step 2: Align header color with Cost Allocation**

In `thStyle` (line 49-59), change:

```jsx
color: 'var(--text-tertiary)',
```

to:

```jsx
color: 'var(--text-placeholder)',
```

This matches `CostAllocationTab.jsx` line 14.

- [ ] **Step 3: Restyle order separator rows**

In the order separator row (lines 179-194), replace the heavy styling:

```jsx
style={{
  padding: orderIdx === 0 ? '8px 14px 6px' : '16px 14px 6px',
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--text-primary)',
  background: 'var(--bg-primary)',
  borderBottom: '2px solid var(--border-default)',
  letterSpacing: '0.02em',
}}
```

with a subtler treatment:

```jsx
style={{
  padding: orderIdx === 0 ? '8px 14px 6px' : '20px 14px 6px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  background: 'var(--bg-primary)',
  borderBottom: '1px solid var(--border-subtle)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}}
```

This makes separators feel like subtle group labels — smaller, lighter, uppercase — clearly subordinate to the column header.

- [ ] **Step 4: Restyle expand/collapse buttons**

Replace `expandBtnBase` (lines 84-101) and `expandBtnExpanded` (lines 103-107):

```jsx
const expandBtnBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  fontFamily: 'var(--font-primary)',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-placeholder)',
  cursor: 'pointer',
  transition: 'background var(--transition-fast), color var(--transition-fast)',
  lineHeight: 1,
  padding: 0,
}

const expandBtnExpanded = {
  ...expandBtnBase,
  color: 'var(--text-secondary)',
  background: 'var(--bg-tertiary)',
}
```

This removes the heavy bordered box — just a subtle icon that highlights on expand.

- [ ] **Step 5: Verify in browser**

Select a shipment, go to Product tab:
- Table header should be visually separated from tabs (gap above)
- Header text color should match Cost Allocation tab
- Order separator rows should be subtle uppercase labels, not competing with headers
- Expand/collapse buttons should be minimal (no box border)
- Overall table should look consistent with Cost Allocation tab style

- [ ] **Step 6: Commit**

```bash
git add src/components/detail/ProductTab.jsx
git commit -m "feat(SHP-46): product tab table styling — match Cost Allocation, subtle separators, minimal expand buttons"
```

---

## Task 8: SHP-45 — Cost Visibility from Tender Tab (S)

**Files:**
- Modify: `src/components/detail/RoutingGuideTab.jsx` (AP cost cell rendering in routing table)

- [ ] **Step 1: Find the AP cost cell rendering**

In `RoutingGuideTab.jsx`, search for where the `cost` or `apFreightCost` column is rendered in the routing table rows. It's in the LOCKED_COLUMNS (line 17-27) — the `cost` key. Find the table cell that renders this value in the row mapping.

- [ ] **Step 2: Create CostTooltip component**

Add a new component inside `RoutingGuideTab.jsx` (before the main export):

```jsx
function CostTooltip({ carrier, onViewDetails }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef(null)

  const handleEnter = () => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 })
    setShow(true)
  }

  const apTotal = carrier.cost || carrier.apFreightCost || '--'
  const arTotal = carrier.arCost || carrier.arFreightCost || '--'
  const apNum = parseFloat(String(apTotal).replace(/[^0-9.\-]/g, ''))
  const arNum = parseFloat(String(arTotal).replace(/[^0-9.\-]/g, ''))
  const margin = (!isNaN(apNum) && !isNaN(arNum)) ? arNum - apNum : null
  const marginPct = (margin != null && apNum > 0) ? ((margin / apNum) * 100).toFixed(1) : null

  return (
    <span
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
      style={{ cursor: 'pointer' }}
    >
      {apTotal}
      {show && createPortal(
        <div
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
            background: 'var(--deep-sea-neutral-900, #1B2537)',
            color: 'var(--deep-sea-neutral-300, #D0D4DB)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: 13,
            lineHeight: 1.6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            zIndex: 99999,
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
        >
          <div>AP Total: <strong>{apTotal}</strong></div>
          <div>AR Total: <strong>{arTotal}</strong></div>
          {margin != null && (
            <div style={{ color: margin >= 0 ? '#34d399' : '#f87171' }}>
              Margin: ${Math.abs(margin).toLocaleString('en-US', { minimumFractionDigits: 2 })} ({marginPct}%)
            </div>
          )}
          <div
            style={{
              marginTop: 6,
              paddingTop: 6,
              borderTop: '1px solid rgba(255,255,255,0.1)',
              color: '#93c5fd',
              cursor: 'pointer',
              fontSize: 12,
            }}
            onClick={(e) => { e.stopPropagation(); setShow(false); onViewDetails() }}
          >
            View Details →
          </div>
        </div>,
        document.body
      )}
    </span>
  )
}
```

Add `useRef` to the React imports if not already there.

- [ ] **Step 3: Wire CostTooltip into the routing table**

Find where the cost cell is rendered for each carrier row. Replace the plain text value with:

```jsx
<CostTooltip
  carrier={carrier}
  onViewDetails={() => setQuoteModal({ isOpen: true, mode: 'view', carrierData: carrier })}
/>
```

This opens the existing Show Rate Details modal (SHP-29) in view mode.

- [ ] **Step 4: Verify in browser**

Select a shipment, go to Tender tab. Hover over any AP cost value in the routing table. Should see dark tooltip with AP Total, AR Total, Margin (green if positive), and "View Details →" link. Clicking "View Details" should open the rate details modal.

- [ ] **Step 5: Commit**

```bash
git add src/components/detail/RoutingGuideTab.jsx
git commit -m "feat(SHP-45): AP cost hover tooltip with AP/AR/margin summary + view details link"
```

---

## Task 9: SHP-47 — Panel-Aware Column Presets (M)

**Files:**
- Modify: `src/components/detail/ColumnPanel.jsx:52-67,84-116` (separate state per panel, monitoring default)
- Modify: `src/components/shipments/ShipmentTable.jsx` (pass activePanel to column logic)
- Modify: `src/App.jsx` or parent component that manages panel state + column state

- [ ] **Step 1: Define panel-specific default columns**

In `ColumnPanel.jsx`, after `DEFAULT_COLUMNS`, add:

```jsx
const EXCEPTIONS_DEFAULT_COLUMNS = [
  'buyShipment', 'customerId', 'shipmentStatus', 'orderCount',
  'pickupDate', 'deliveryDate', 'origin', 'destination', 'grossWeight',
  'mode', 'equipmentCode', 'scac', 'orders', 'apFreightCost', 'validationMessage',
]

const MONITORING_DEFAULT_COLUMNS = [
  'buyShipment', 'customerId', 'shipmentStatus', 'orderCount',
  'pickupDate', 'deliveryDate', 'origin', 'destination', 'grossWeight',
  'mode', 'equipmentCode', 'scac', 'orders', 'apFreightCost',
]
```

Monitoring excludes `validationMessage` (meaningless in monitoring context). Export both.

- [ ] **Step 2: Track columns per panel in parent state**

Find where `visibleColumns` state is managed (likely in `App.jsx` or the parent component that passes it to both `ShipmentTable` and `ColumnPanel`). Change from a single array to a per-panel object:

```jsx
const [columnsByPanel, setColumnsByPanel] = useState({
  exceptions: EXCEPTIONS_DEFAULT_COLUMNS,
  monitoring: MONITORING_DEFAULT_COLUMNS,
})
```

Derive the active visible columns from the current panel:

```jsx
const visibleColumns = columnsByPanel[activePanel] || EXCEPTIONS_DEFAULT_COLUMNS
```

Update the `onColumnsChange` callback to write to the active panel's slot:

```jsx
const handleColumnsChange = (newColumns) => {
  setColumnsByPanel(prev => ({ ...prev, [activePanel]: newColumns }))
}
```

- [ ] **Step 3: Pass panel context to ColumnPanel**

Ensure `ColumnPanel` receives the current panel's columns and writes back to the correct slot. The existing `visibleColumns` and `onColumnsChange` props should already work since we derived them per-panel in step 2.

- [ ] **Step 4: Verify in browser**

1. Go to Exceptions panel — should see Validation Message column
2. Switch to Monitoring panel — Validation Message should disappear
3. In Monitoring, add a column via Column Arrangement — it should persist when switching away and back
4. Exceptions columns should be unchanged after Monitoring edits

- [ ] **Step 5: Commit**

```bash
git add src/components/detail/ColumnPanel.jsx src/App.jsx src/components/shipments/ShipmentTable.jsx
git commit -m "feat(SHP-47): panel-aware column presets — Exceptions and Monitoring have independent column configs"
```

---

## Task 10: SHP-50 — Order Tab Layout Overhaul (L)

**Files:**
- Modify: `src/components/detail/OrderTab.jsx:75-174` (section grid rewrite)
- Modify: `tools/generate.mjs` (add appointment fields to order data if not present)

- [ ] **Step 1: Check if appointment data exists in generator**

Search `tools/generate.mjs` for `appointment`. If the field doesn't exist in order details, add it:

In the order detail generation section, add to each order:

```js
pickupAppointment: faker.datatype.boolean(0.3), // 30% have appointments
deliveryAppointment: faker.datatype.boolean(0.2), // 20% have appointments
```

Regenerate data: `cd tools && node generate.mjs`

- [ ] **Step 2: Rewrite the grid layout in OrderTab.jsx**

Replace the entire grid section (lines 75-174) with the new layout. The grid keeps `repeat(4, 1fr)` but the sections are reordered:

**Row 1:**
1. General (as-is — same fields)
2. Totals (promoted from row 2 — fields: totalWeight, totalVolume, grossWeight, tareWeight)
3. Ship From + Pickup Dates (merged — fields: siteId, company, location, address, earliestPickup, latestPickup, plus appointment badge)
4. Ship To + Delivery Dates (merged — fields: siteId, company, location, address, earliestDelivery, latestDelivery, plus appointment badge)

**Row 2:**
1. Requested Transportation (demoted from row 1 — fields: mode, equipmentType, serviceLevel, transportPriority)
2. Products Info (as-is — fields: numProducts, totalWeight, totalVolume, hazmat)
3. References (promoted from row 3 — fields: salesOrder, deliveryNumber, poNumber, proBooking, pickupNumber, confirmationNumber)
4. Incoterms & Ocean/Air Ports (as-is — fields: incoterm, incotermLocation, portOfLoading, portOfDischarge)

**Row 3:**
1. Contact Details (fields: contactName, contactEmail, contactPhone)
2. Custom Fields General (fields: customField1, customField2)
3-4. Empty or removed (fewer sections means less white space)

```jsx
{/* Row 1 */}
<Section title="General" data={d} fields={[
  ['orderNumber','Order Number'], ['shipDirection','Ship Direction'],
  ['orderDate','Order Date'], ['paymentTerms','Payment Terms'],
  ['shipmentMode','Shipment Mode'], ['expedited','Expedited'],
  ['consolidatable','Consolidatable'], ['equipment','Equipment'],
  ['specialServices','Special Services'], ['lsp','LSP'], ['carrier','Carrier'],
]} />
<Section title="Totals" data={d} fields={[
  ['totalWeight','Total Weight'], ['totalVolume','Total Volume'],
  ['grossWeight','Gross Weight'], ['tareWeight','Tare Weight'],
]} />
<Section title="Ship From" data={d} fields={[
  ['shipFrom.siteId','Site ID'], ['shipFrom.company','Company'],
  ['shipFrom.location','Location'], ['shipFrom.address','Address'],
  ['earliestPickup','Earliest Pickup'], ['latestPickup','Latest Pickup'],
]} appointment={d.pickupAppointment} />
<Section title="Ship To" data={d} fields={[
  ['shipTo.siteId','Site ID'], ['shipTo.company','Company'],
  ['shipTo.location','Location'], ['shipTo.address','Address'],
  ['earliestDelivery','Earliest Delivery'], ['latestDelivery','Latest Delivery'],
]} appointment={d.deliveryAppointment} isLastCol />

{/* Row 2 */}
<Section title="Requested Transportation" data={d} fields={[
  ['mode','Mode'], ['equipmentType','Equipment Type'],
  ['serviceLevel','Service Level'], ['transportPriority','Transport Priority'],
]} />
<Section title="Products Info" data={d} fields={[
  ['numProducts','Products'], ['totalWeight','Total Weight'],
  ['totalVolume','Total Volume'], ['hazmat','Hazmat'],
]} />
<Section title="References" data={d} fields={[
  ['salesOrder','Sales Order'], ['deliveryNumber','Delivery Number'],
  ['poNumber','PO Number'], ['proBooking','PRO/Booking'],
  ['pickupNumber','Pickup Number'], ['confirmationNumber','Confirmation'],
]} />
<Section title="Incoterms &amp; Ports" data={d} fields={[
  ['incoterm','Incoterm'], ['incotermLocation','Incoterm Location'],
  ['portOfLoading','Port of Loading'], ['portOfDischarge','Port of Discharge'],
]} isLastCol />

{/* Row 3 */}
<Section title="Contact Details" data={d} fields={[
  ['contactName','Contact Name'], ['contactEmail','Contact Email'],
  ['contactPhone','Contact Phone'],
]} />
<Section title="Custom Fields" data={d} fields={[
  ['customField1','Custom Field 1'], ['customField2','Custom Field 2'],
]} />
```

- [ ] **Step 3: Add appointment badge to Section component**

In the `Section` component definition, add an `appointment` prop. After the fields, render the badge conditionally:

```jsx
function Section({ title, data, fields, isLastCol, appointment }) {
  // ... existing field rendering ...
  return (
    <div style={/* existing cell style */}>
      <div style={headerStyle}>{title}</div>
      {fields.map(([key, label]) => (
        <Field key={key} label={label} value={getNestedValue(data, key)} />
      ))}
      {appointment && (
        <div style={{ marginTop: 6 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600, padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(59, 130, 246, 0.10)',
            color: 'rgb(37, 99, 235)',
          }}>
            Appointment
          </span>
        </div>
      )}
    </div>
  )
}
```

Add a `getNestedValue` helper if fields use dot notation (e.g., `shipFrom.siteId`):

```jsx
function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj) ?? '—'
}
```

- [ ] **Step 4: Reduce white space**

Tighten the grid gap. In the parent grid container (line ~75), reduce gap if currently large:

```jsx
style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}
```

Each Section cell already has internal padding via its border styling — no outer gap needed.

- [ ] **Step 5: Verify in browser**

Select a shipment, go to Order tab:
- Row 1 should be: General | Totals | Ship From (with pickup dates + appointment badge) | Ship To (with delivery dates + appointment badge)
- Row 2 should be: Req. Transportation | Products Info | References | Incoterms
- Row 3 should be: Contacts | Custom Fields (compact)
- Appointment badge should appear as blue "Appointment" badge only when the order has an appointment
- Less white space overall

- [ ] **Step 6: Commit**

```bash
git add src/components/detail/OrderTab.jsx tools/generate.mjs
git commit -m "feat(SHP-50): order tab layout overhaul — totals promoted, dates merged into locations, appointment badge, reduced whitespace"
```

If data was regenerated:
```bash
git add public/details/ src/data/shipments.json
git commit -m "data: regenerate with appointment fields"
```

---

## Task 11: SHP-44 — Column Auto-Fit, Header Wrapping, and Manual Resize (L)

**Files:**
- Modify: `src/components/shipments/ShipmentTable.jsx` (header rendering, cell truncation, resize logic)
- Modify: `src/components/ui/DarkTooltip.jsx` (if needed for truncation tooltips)

This is the largest task. Break into sub-steps.

- [ ] **Step 1: Enable header text wrapping**

In `ShipmentTable.jsx`, find where header `<th>` or header cells are rendered. The header cells currently have `whiteSpace: 'nowrap'`. Change to allow wrapping:

```jsx
const headerCellStyle = {
  // ... existing styles ...
  whiteSpace: 'normal',      // was 'nowrap'
  wordBreak: 'break-word',
  lineHeight: 1.3,
  verticalAlign: 'bottom',   // align text to bottom of taller headers
}
```

This lets "Shipment Status" stack as two lines, making the header row taller but columns narrower.

- [ ] **Step 2: Implement auto-fit column widths**

Replace the fixed `width` values in `COLUMN_CONFIG` with a computed approach. Add a `minWidth` per column based on header label length:

```jsx
function computeAutoWidth(label) {
  // ~8px per character for 12px font, plus 28px padding
  const charWidth = label.length * 8 + 28
  // Cap single-line width at 120px — beyond that, header wraps
  const singleLineMax = 120
  // Buffer: 25% extra for content
  const withBuffer = Math.min(charWidth, singleLineMax) * 1.25
  return Math.max(80, Math.round(withBuffer))
}
```

Update each column in `COLUMN_CONFIG` to use `width: computeAutoWidth(col.label)` or keep explicit widths for columns that need them (like `buyShipment` which has a known format).

- [ ] **Step 3: Add content truncation with ellipsis**

For data cells, add truncation styling:

```jsx
const dataCellStyle = {
  // ... existing styles ...
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 0,  // forces truncation within table cell
}
```

- [ ] **Step 4: Add truncation tooltip (2+ words rule)**

Create a `TruncatedCell` wrapper component:

```jsx
function TruncatedCell({ value, width }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef(null)

  const handleEnter = () => {
    if (!ref.current) return
    const el = ref.current
    // Check if actually truncated
    if (el.scrollWidth <= el.clientWidth) return
    // Count truncated words
    const fullText = String(value || '')
    const words = fullText.split(/\s+/)
    // Estimate visible characters from clientWidth
    const visibleChars = Math.floor(el.clientWidth / 7.5)
    const visibleText = fullText.slice(0, visibleChars)
    const visibleWords = visibleText.trim().split(/\s+/).length
    const hiddenWords = words.length - visibleWords
    if (hiddenWords < 2) return // Only show tooltip if 2+ words hidden
    const rect = el.getBoundingClientRect()
    setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 })
    setShowTooltip(true)
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShowTooltip(false)}
        style={{
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value ?? '—'}
      </span>
      {showTooltip && createPortal(
        <div style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          transform: 'translate(-50%, -100%)',
          background: 'var(--deep-sea-neutral-900, #1B2537)',
          color: 'var(--deep-sea-neutral-300, #D0D4DB)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
          fontSize: 13,
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          zIndex: 99999,
          maxWidth: 300,
          whiteSpace: 'normal',
        }}>
          {value}
        </div>,
        document.body
      )}
    </>
  )
}
```

Wrap text data cells in `<TruncatedCell value={cellValue} />` instead of rendering the raw text.

- [ ] **Step 5: Add resize handles on header hover**

Add a resize handle to each header cell. On hover, show a draggable border indicator:

```jsx
function ResizeHandle({ onResize }) {
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handleMouseDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
    startX.current = e.clientX
    startWidth.current = e.target.parentElement.offsetWidth

    const handleMouseMove = (moveE) => {
      const delta = moveE.clientX - startX.current
      onResize(startWidth.current + delta)
    }
    const handleMouseUp = () => {
      setDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 4,
        cursor: 'col-resize',
        background: dragging ? 'var(--border-strong)' : 'transparent',
      }}
      onMouseEnter={(e) => { if (!dragging) e.target.style.background = 'var(--border-default)' }}
      onMouseLeave={(e) => { if (!dragging) e.target.style.background = 'transparent' }}
    />
  )
}
```

Add to each header cell:

```jsx
<div style={{ position: 'relative' }}>
  {col.label}
  <ResizeHandle onResize={(newWidth) => handleColumnResize(col.key, newWidth)} />
</div>
```

- [ ] **Step 6: Add column width state and min-width enforcement**

Add state to track custom column widths:

```jsx
const [columnWidths, setColumnWidths] = useState({})

const handleColumnResize = (key, newWidth) => {
  const col = COLUMN_CONFIG_MAP[key]
  const minWidth = computeAutoWidth(col?.label || key)
  setColumnWidths(prev => ({
    ...prev,
    [key]: Math.max(minWidth, newWidth)
  }))
}
```

When rendering columns, use `columnWidths[col.key] || computeAutoWidth(col.label)` as the width.

- [ ] **Step 7: Verify in browser**

1. Headers should wrap (e.g., "Shipment Status" on two lines)
2. Long content should show "..." truncation
3. Hover on truncated content — tooltip only appears if 2+ words are hidden
4. Hover on header right edge — resize handle stroke appears
5. Drag to resize — column follows mouse, stops at minimum (header text width)
6. Release — column stays at new width

- [ ] **Step 8: Commit**

```bash
git add src/components/shipments/ShipmentTable.jsx
git commit -m "feat(SHP-44): column auto-fit, header wrapping, content truncation with smart tooltips, drag-to-resize"
```

---

## Verification Checklist

After all tasks are complete, verify the full set:

- [ ] **SHP-49:** Monitoring panel shows "Tender Sent" tab (not "Sent")
- [ ] **SHP-52:** Order # column is near the right end of default preset
- [ ] **SHP-43:** Product tab + main table show yellow hazmat badge or "--"
- [ ] **SHP-48:** Date columns show date-only, time in hover tooltip
- [ ] **SHP-51:** No TenderSummary card, "View Shipment Details" button left of "Add Quote"
- [ ] **SHP-53:** Tender collapse starts collapsed, animates smoothly
- [ ] **SHP-46:** Product tab table matches Cost Allocation style, subtle separators
- [ ] **SHP-45:** AP cost hover shows AP/AR/margin tooltip with "View Details" link
- [ ] **SHP-47:** Switching Exceptions↔Monitoring shows different column sets
- [ ] **SHP-50:** Order tab: General→Totals→Ship From(+dates)→Ship To(+dates), appointment badges
- [ ] **SHP-44:** Headers wrap, content truncates, resize handles work, min-width enforced
