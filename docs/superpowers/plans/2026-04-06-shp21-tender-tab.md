# SHP-21: Tender Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Tender tab (RoutingGuideTab.jsx) with proper summary, contextual 3-dot menu actions, sub-tabs with full data, and cascade tendering simulation.

**Architecture:** Single component rewrite of RoutingGuideTab.jsx with extracted sub-components (TenderSummary, TenderDetailModal, RoutingTable, ActionDropdown). Generator updated to produce ~25 new fields per carrier option. BottomBar.jsx gets minor prop cleanup (remove isFullscreen gating).

**Tech Stack:** React 19, lucide-react, createPortal, CSS custom properties (design tokens), faker.js seed 42

---

## Task 1: Update data generator with all 25 new fields

**Files:** `tools/generate.mjs` (lines 393-422)

### Steps

- [ ] **1.1** Open `tools/generate.mjs` and locate the carrier option return object (lines 393-421). After line 420 (`description: faker.lorem.words({ min: 2, max: 4 }),`), add the following new fields before the closing `};` on line 421:

```javascript
      // --- Routing Options tab (3 new) ---
      responseUser: wasTendered ? faker.person.fullName() : null,
      carrierQuoted: pick(['Yes', 'No']),
      networkLeverage: `${faker.number.int({ min: 0, max: 35 })}%`,

      // --- Notify & Response tab (3 new) ---
      proNumber: isAccepted ? `PRO-${faker.string.numeric(8)}` : null,
      transportingCarrier: faker.number.float({ min: 0, max: 1 }) < 0.7 ? rc.name : faker.company.name(),
      equipNumber: `EQ-${faker.string.alphanumeric(6).toUpperCase()}`,

      // --- Volume Commitment tab (6 new) ---
      // commitment is computed before the return — see step 1.2
      commitment: _commitment,
      uom: pick(['Loads/Week', 'Loads/Month']),
      vcEquipNumber: `EQ-${faker.string.alphanumeric(6).toUpperCase()}`,
      vcOpen: _vcOpen,
      vcAccept: _vcAccept,
      vcDecline: _vcDecline,

      // --- Additional Info tab (8 new) ---
      carrierApiTenderId: faker.string.uuid(),
      breakPoint: faker.number.float({ min: 0, max: 1 }) < 0.8 ? faker.location.city() : 'Direct',
      rateSource: pick(['Contract', 'Spot', 'Benchmark', 'Historical']),
      distanceSource: pick(['PC Miler', 'Google Maps', 'ALK', 'Manual']),
      transitTimeId: `TT-${faker.string.alphanumeric(8).toUpperCase()}`,
      loadboardExpiry: faker.number.float({ min: 0, max: 1 }) < 0.7 ? formatDateTime(genDate(baseDate, faker.number.int({ min: 5, max: 30 }))) : '--',
      rcpId: `RCP-${faker.string.alphanumeric(6).toUpperCase()}`,
      lcePkId: faker.number.int({ min: 100000, max: 999999 }),

      // --- Others tab (8 new) ---
      modifyUser: faker.person.fullName(),
      modifyDate: formatDateTime(genDate(baseDate, faker.number.int({ min: -10, max: 0 }))),
      indirectPoint: faker.number.float({ min: 0, max: 1 }) < 0.6 ? faker.location.city() : 'N/A',
      roundTrip: pick(['Yes', 'No']),
      customerPreferred: pick(['Yes', 'No']),
      orderEquip: pick(EQUIPMENT_CODES),
      contactExped: `${faker.person.fullName()} ${faker.phone.number()}`,
      note: faker.number.float({ min: 0, max: 1 }) < 0.5 ? faker.lorem.sentence() : '--',
```

- [ ] **1.2** The volume commitment fields (`vcOpen`, `vcAccept`, `vcDecline`) must sum to `commitment`. Compute them BEFORE the return statement. Insert the following lines right after line 392 (`const delivHour = ...`) and before the `return {` on line 393:

```javascript
    // Volume commitment: pre-compute so vcOpen + vcAccept + vcDecline === commitment
    const _commitment = faker.number.int({ min: 1, max: 20 });
    const _vcOpen = faker.number.int({ min: 0, max: _commitment });
    const _vcAccept = faker.number.int({ min: 0, max: _commitment - _vcOpen });
    const _vcDecline = _commitment - _vcOpen - _vcAccept;
```

The full modified section (lines 388-422+) should look like this when done:

```javascript
    const isAccepted = status === 'Accepted';
    const wasTendered = status !== null;
    const baseRate = faker.number.float({ min: 200, max: 2000, fractionDigits: 2 });
    const cost = faker.number.float({ min: 100, max: 800, fractionDigits: 2 });
    const pickupHour = faker.number.int({ min: 6, max: 16 });
    const delivHour = faker.number.int({ min: 6, max: 22 });

    // Volume commitment: pre-compute so vcOpen + vcAccept + vcDecline === commitment
    const _commitment = faker.number.int({ min: 1, max: 20 });
    const _vcOpen = faker.number.int({ min: 0, max: _commitment });
    const _vcAccept = faker.number.int({ min: 0, max: _commitment - _vcOpen });
    const _vcDecline = _commitment - _vcOpen - _vcAccept;

    return {
      rank,
      routeRank: faker.number.int({ min: 1, max: 3 }),
      // ... all existing fields unchanged ...
      description: faker.lorem.words({ min: 2, max: 4 }),

      // --- all 25 new fields from step 1.1 ---
    };
```

- [ ] **1.3** Regenerate data:

```bash
node tools/generate.mjs
```

- [ ] **1.4** Verify:

```bash
node -e "const d=require('./src/data/shipment-details.json'); const o=Object.values(d)[0].routingData.options[0]; console.log(Object.keys(o).length, 'fields'); console.log('responseUser:', o.responseUser); console.log('vcOpen:', o.vcOpen); console.log('modifyUser:', o.modifyUser);"
```

Expected: ~52 fields, non-null values for responseUser (if wasTendered), vcOpen (number), modifyUser (string).

- [ ] **1.5** Verify vc fields sum correctly:

```bash
node -e "const d=require('./src/data/shipment-details.json'); const o=Object.values(d)[0].routingData.options[0]; console.log('commitment:', o.commitment, '= open:', o.vcOpen, '+ accept:', o.vcAccept, '+ decline:', o.vcDecline, '= sum:', o.vcOpen+o.vcAccept+o.vcDecline);"
```

Expected: sum equals commitment.

- [ ] **1.6** Commit:

```bash
git add tools/generate.mjs src/data/shipment-details.json src/data/shipments.json
git commit -m "SHP-21: add 25 new carrier option fields to data generator"
```

---

## Task 2: Rewrite RoutingGuideTab.jsx — Constants and column definitions

**Files:** Full rewrite of `src/components/detail/RoutingGuideTab.jsx`

This task writes the top ~120 lines of the file: imports, constants, column definitions, action maps, and shared styles.

### Steps

- [ ] **2.1** Replace the entire contents of `src/components/detail/RoutingGuideTab.jsx` with the following (Tasks 3-5 will append to this file):

```jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical, Columns3Cog } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const STATUS_STYLES = {
  Accepted: { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
  Sent: { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  Declined: { bg: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)' },
  Cancelled: { bg: 'var(--bg-tertiary)', color: 'var(--text-placeholder)' },
}

/* Locked columns — visible in every sub-tab */
const LOCKED_COLUMNS = [
  { key: 'routeRank', label: 'Route Rank', primary: true },
  { key: 'rank', label: 'Rank', primary: true },
  { key: 'scac', label: 'SCAC' },
  { key: 'carrierName', label: 'Carrier Name', primary: true },
  { key: 'equipment', label: 'Equipment', dataKey: 'rate' },
  { key: 'cost', label: 'AP Cost' },
  { key: 'status', label: 'Tender Status' },
  { key: 'pickupDateTime', label: 'Pickup Date/Time' },
  { key: 'deliveryDateTime', label: 'Delivery Date/Time' },
]

/* Per-tab additional columns */
const TAB_COLUMNS = {
  'routing-options': [
    { key: 'transit', label: 'Transit Time' },
    { key: 'distance', label: 'Distance' },
    { key: 'api', label: 'Notify Method' },
    { key: 'notifyDateTime', label: 'Notify Date' },
    { key: 'responseMethod', label: 'Response Method' },
    { key: 'responseDateTime', label: 'Response Date' },
    { key: 'responseUser', label: 'Response User' },
    { key: 'carrierQuoted', label: 'Carrier Quoted' },
    { key: 'networkLeverage', label: 'Network Leverage' },
  ],
  'notify-response': [
    { key: 'proNumber', label: 'Pro #' },
    { key: 'transportingCarrier', label: 'Transporting Carrier' },
    { key: 'equipNumber', label: 'Equip #' },
    { key: 'routeGroup', label: 'Route Group' },
  ],
  'volume-commitment': [
    { key: 'commitment', label: 'Commitment' },
    { key: 'uom', label: 'UOM' },
    { key: 'vcEquipNumber', label: 'Equip #' },
    { key: 'vcOpen', label: 'Open' },
    { key: 'vcAccept', label: 'Accept' },
    { key: 'vcDecline', label: 'Decline' },
  ],
  'additional-info': [
    { key: 'carrierPickup', label: 'Carrier Pickup #' },
    { key: 'carrierApiTenderId', label: 'Carrier API Tender ID' },
    { key: 'breakPoint', label: 'Break Point' },
    { key: 'rateSource', label: 'Rate Source' },
    { key: 'distanceSource', label: 'Distance Source' },
    { key: 'description', label: 'Description' },
    { key: 'transitTimeSource', label: 'Transit Time Source' },
    { key: 'transitTimeId', label: 'Transit Time ID' },
    { key: 'loadboardExpiry', label: 'Loadboard Expiry' },
    { key: 'rcpId', label: 'RCP ID' },
    { key: 'lcePkId', label: 'LCE PK_ID' },
  ],
  others: [
    { key: 'modifyUser', label: 'Modify User' },
    { key: 'modifyDate', label: 'Modify Date' },
    { key: 'indirectPoint', label: 'Indirect Point' },
    { key: 'roundTrip', label: 'Round Trip' },
    { key: 'customerPreferred', label: 'Customer Preferred' },
    { key: 'orderEquip', label: 'Order Equip' },
    { key: 'contactExped', label: 'Contact Exped' },
    { key: 'note', label: 'Note' },
  ],
}

const SUB_TABS = [
  { key: 'routing-options', label: 'Routing Options' },
  { key: 'notify-response', label: 'Notify & Response Method' },
  { key: 'volume-commitment', label: 'View Volume Commitment' },
  { key: 'additional-info', label: 'Additional Info' },
  { key: 'others', label: 'Others' },
]

/* Action maps — which actions are available per status, and what status results */
const TENDER_ACTIONS = {
  null: ['Tender'],
  Sent: ['Accept', 'Decline', 'Cancel'],
  Accepted: ['Cancel'],
  Declined: ['Re-Tender'],
  Cancelled: ['Re-Tender'],
}

const STATUS_AFTER_ACTION = {
  Tender: 'Sent',
  Accept: 'Accepted',
  Decline: 'Declined',
  Cancel: 'Cancelled',
  'Re-Tender': 'Sent',
}

/* ═══════════════════════════════════════════════════════════════
   SHARED STYLES
   ═══════════════════════════════════════════════════════════════ */

const thStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border-subtle)',
  position: 'sticky',
  top: 0,
  zIndex: 2,
}

const tdStyle = {
  padding: '10px 14px',
  whiteSpace: 'nowrap',
  fontSize: '14px',
  fontWeight: 400,
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--bg-tertiary)',
}

/* ═══════════════════════════════════════════════════════════════
   SHARED UI HELPERS
   ═══════════════════════════════════════════════════════════════ */

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', lineHeight: 1.3, marginBottom: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
        {value || '\u2014'}
      </div>
    </div>
  )
}

function SectionHeader({ children }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--text-primary)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        paddingBottom: 6,
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  )
}

function CheckboxField({ label, checked }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <input type="checkbox" checked={checked} disabled style={{ accentColor: 'var(--border-focus)', width: 14, height: 14 }} />
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  )
}

function StatusBadge({ status }) {
  if (!status) return <span style={{ color: 'var(--text-placeholder)', fontSize: 13 }}>--</span>
  const style = STATUS_STYLES[status] || STATUS_STYLES.Declined
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-primary)',
        fontSize: '12px',
        fontWeight: 600,
        padding: '1px 8px',
        borderRadius: 'var(--radius-sm)',
        background: style.bg,
        color: style.color,
      }}
    >
      {status}
    </span>
  )
}

// --- END OF TASK 2 --- (Tasks 3-5 continue below)
```

- [ ] **2.2** Verify the file saves correctly (no syntax errors in the constant section). The file is incomplete at this point — Tasks 3-5 will complete it.

- [ ] **2.3** Commit:

```bash
git add src/components/detail/RoutingGuideTab.jsx
git commit -m "SHP-21: rewrite RoutingGuideTab constants, columns, action maps, and styles"
```

---

## Task 3: TenderSummary + TenderDetailModal components

**Files:** Continue writing in `src/components/detail/RoutingGuideTab.jsx`

### Steps

- [ ] **3.1** Replace the `// --- END OF TASK 2 ---` comment at the bottom of the file with the following components:

```jsx
/* ═══════════════════════════════════════════════════════════════
   TENDER SUMMARY (compact, always visible)
   ═══════════════════════════════════════════════════════════════ */

function TenderSummary({ shipment, shipmentDetails, onOpenDetail }) {
  const order = shipmentDetails?.orderDetails?.[0]
  const stops = shipmentDetails?.stopsData?.stops || []
  const pickupStop = stops.find(s => s.type === 'pickup')
  const deliveryStop = [...stops].reverse().find(s => s.type === 'delivery')

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 18px',
      }}
    >
      {/* Row 1: IDs, Mode, Weight */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 10 }}>
        <Field label="Buy Shipment ID" value={shipment?.buyShipment} />
        <Field label="Sell Shipment ID" value={shipment?.sellShipment} />
        <Field label="Mode" value={shipment?.mode} />
        <Field label="Weight" value={shipment?.grossWeight ? `${Number(shipment.grossWeight).toLocaleString()} LB` : null} />
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={onOpenDetail}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            View Full Details
          </button>
        </div>
      </div>

      {/* Row 2: Pickup + Delivery */}
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Field label="Pickup" value={order?.shipFrom?.company} />
          <Field label="Location" value={order?.shipFrom?.location} />
          <Field label="Date" value={pickupStop?.date} />
        </div>
        <div style={{ width: 1, background: 'var(--border-subtle)', alignSelf: 'stretch' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Field label="Delivery" value={order?.shipTo?.company} />
          <Field label="Location" value={order?.shipTo?.location} />
          <Field label="Date" value={deliveryStop?.date} />
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TENDER DETAIL MODAL (full detail, portal-rendered)
   ═══════════════════════════════════════════════════════════════ */

function TenderDetailModal({ isOpen, onClose, shipment, shipmentDetails }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const order = shipmentDetails?.orderDetails?.[0]
  const stops = shipmentDetails?.stopsData?.stops || []
  const summary = shipmentDetails?.stopsData?.summary || {}
  const costOrder = shipmentDetails?.costData?.planned?.orders?.[0]
  const pickupStop = stops.find(s => s.type === 'pickup')
  const deliveryStop = [...stops].reverse().find(s => s.type === 'delivery')

  const columnStyle = {
    padding: '14px 16px',
    borderRight: '1px solid var(--border-subtle)',
  }
  const lastColumnStyle = { ...columnStyle, borderRight: 'none' }

  return createPortal(
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          width: '90vw',
          maxWidth: 1100,
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: 'var(--shadow-lg)',
          fontFamily: 'var(--font-primary)',
        }}
      >
        {/* 4-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
          {/* Column 1: Shipment */}
          <div style={columnStyle}>
            <SectionHeader>Shipment</SectionHeader>
            <Field label="Buy Shipment ID" value={shipment?.buyShipment} />
            <Field label="Sell Shipment ID" value={shipment?.sellShipment} />
            <Field label="Mode" value={shipment?.mode} />
            <Field label="Seed Equipment" value={shipment?.equipmentCode} />
            <Field label="Planning Date Type" value="RDD" />
            <Field label="Gross Weight" value={shipment?.grossWeight ? `${Number(shipment.grossWeight).toLocaleString()} LB` : '\u2014'} />
            <Field label="Pkg Count" value={pickupStop?.packageCount || '\u2014'} />
            <Field label="Volume" value={summary.volume} />
            <Field label="Distance" value={summary.distance} />
            <CheckboxField label="Instructions" checked={true} />
            <CheckboxField label="Hazardous" checked={order?.hazmat === 'Yes'} />
          </div>

          {/* Column 2: Order */}
          <div style={columnStyle}>
            <SectionHeader>Order</SectionHeader>
            <Field label="Planning Date Type" value="RDD" />
            <Field label="Order Pickup Date/Time" value={order?.earliestPickup} />
            <Field label="Order Delivery Date/Time" value={order?.earliestDelivery} />
            <Field label="Order #" value={shipment?.orders?.join(', ')} />
            <Field label="Direct Cost" value={costOrder?.directCost || '\u2014'} />
            <Field label="Pickup #" value={order?.pickupNumber || '\u2014'} />
          </div>

          {/* Column 3: Initial Pickup */}
          <div style={columnStyle}>
            <SectionHeader>Initial Pickup</SectionHeader>
            <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', marginBottom: 4 }}>Pickup location name & Address</div>
            <Field label="Company" value={order?.shipFrom?.company} />
            <Field label="Address" value={order?.shipFrom?.address} />
            <Field label="Location" value={order?.shipFrom?.location} />
            <div style={{ marginTop: 8 }} />
            <Field label="Pickup Date/Time" value={pickupStop?.date} />
          </div>

          {/* Column 4: Final Delivery */}
          <div style={lastColumnStyle}>
            <SectionHeader>Final Delivery</SectionHeader>
            <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', marginBottom: 4 }}>Delivery location name & Address</div>
            <Field label="Company" value={order?.shipTo?.company} />
            <Field label="Address" value={order?.shipTo?.address} />
            <Field label="Location" value={order?.shipTo?.location} />
            <div style={{ marginTop: 8 }} />
            <Field label="Delivery Date/Time" value={deliveryStop?.date} />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <button
            onClick={() => console.log('[Tender] Routing Query (QCP) clicked')}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            Routing Query (QCP)
          </button>
          <button
            onClick={() => console.log('[Tender] View Stops clicked')}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            View Stops
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// --- END OF TASK 3 --- (Tasks 4-5 continue below)
```

- [ ] **3.2** Verify the file saves without syntax errors.

- [ ] **3.3** Commit:

```bash
git add src/components/detail/RoutingGuideTab.jsx
git commit -m "SHP-21: add TenderSummary and TenderDetailModal components"
```

---

## Task 4: RoutingTable with 3-dot menu and contextual actions

**Files:** Continue writing in `src/components/detail/RoutingGuideTab.jsx`

### Steps

- [ ] **4.1** Replace the `// --- END OF TASK 3 ---` comment at the bottom of the file with the following components:

```jsx
/* ═══════════════════════════════════════════════════════════════
   ACTION DROPDOWN (portal-rendered, 3-dot menu)
   ═══════════════════════════════════════════════════════════════ */

function ActionDropdown({ status, position, onAction, onClose }) {
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const actions = TENDER_ACTIONS[status] || TENDER_ACTIONS[null]

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translateX(-100%)',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        zIndex: 9999,
        minWidth: 220,
        padding: '4px 0',
        fontFamily: 'var(--font-primary)',
      }}
    >
      {/* Tender Actions group */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          padding: '8px 14px 4px',
        }}
      >
        TENDER ACTIONS
      </div>
      {actions.map((action) => (
        <button
          key={action}
          onClick={() => onAction(action)}
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 14px',
            background: 'transparent',
            border: 'none',
            textAlign: 'left',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-primary)',
            transition: 'background 0.12s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          {action}
        </button>
      ))}

      {/* Separator */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />

      {/* Rate Details group */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          padding: '8px 14px 4px',
        }}
      >
        RATE DETAILS
      </div>
      <button
        onClick={() => { console.log('[Tender] Show Rate Details clicked'); onClose() }}
        style={{
          display: 'block',
          width: '100%',
          padding: '8px 14px',
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontFamily: 'var(--font-primary)',
          transition: 'background 0.12s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        Show Rate Details
      </button>
    </div>,
    document.body
  )
}

/* ═══════════════════════════════════════════════════════════════
   ROUTING TABLE
   ═══════════════════════════════════════════════════════════════ */

function RoutingTable({ options, columns, highlightedRank, openMenuRank, onOpenMenu, onCloseMenu, onAction }) {
  if (!options || options.length === 0) {
    return (
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-placeholder)', padding: 16 }}>
        No routing options available.
      </div>
    )
  }

  const getCellValue = (option, col) => {
    const dataKey = col.dataKey || col.key
    return option[dataKey] ?? '--'
  }

  const handleDotClick = (e, rank) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    onOpenMenu(rank, { top: rect.bottom + 2, left: rect.right })
  }

  return (
    <div style={{ overflow: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '0 0 var(--radius-md) var(--radius-md)' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'var(--font-primary)',
          fontSize: '14px',
          color: 'var(--text-secondary)',
        }}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={thStyle}>
                {col.label}
              </th>
            ))}
            {/* Trailing column header: cog icon */}
            <th style={{ ...thStyle, width: 40, textAlign: 'center', padding: '10px 8px' }}>
              <Columns3Cog size={15} style={{ color: 'var(--text-placeholder)' }} />
            </th>
          </tr>
        </thead>
        <tbody>
          {options.map((option) => {
            const isHighlighted = highlightedRank === option.rank
            return (
              <tr
                key={option.rank}
                style={{
                  background: isHighlighted ? 'var(--badge-blue-bg)' : 'var(--bg-primary)',
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => { if (!isHighlighted) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                onMouseLeave={(e) => { if (!isHighlighted) e.currentTarget.style.background = 'var(--bg-primary)' }}
              >
                {columns.map((col) => {
                  const isPrimary = col.primary
                  const cellStyle = {
                    ...tdStyle,
                    ...(isHighlighted ? { fontWeight: 500 } : {}),
                    ...(isPrimary ? { fontWeight: 500, color: 'var(--text-primary)' } : {}),
                  }
                  return (
                    <td key={col.key} style={cellStyle}>
                      {col.key === 'status' ? (
                        <StatusBadge status={option.status} />
                      ) : (
                        getCellValue(option, col)
                      )}
                    </td>
                  )
                })}
                {/* Trailing column: 3-dot icon */}
                <td
                  style={{
                    ...tdStyle,
                    width: 40,
                    textAlign: 'center',
                    padding: '10px 8px',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  onClick={(e) => handleDotClick(e, option.rank)}
                >
                  <MoreVertical size={16} style={{ color: 'var(--text-placeholder)' }} />
                  {openMenuRank === option.rank && (
                    <ActionDropdown
                      status={option.status}
                      position={option._menuPos}
                      onAction={(action) => onAction(option.rank, action)}
                      onClose={onCloseMenu}
                    />
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ─── Sub-Tab Bar for Routing Table ─── */
function RoutingSubTabs({ activeSubTab, onTabChange }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        borderBottom: '2px solid var(--border-subtle)',
      }}
    >
      {SUB_TABS.map((tab) => {
        const isActive = tab.key === activeSubTab
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            style={{
              padding: '10px 18px',
              fontSize: 12,
              fontWeight: isActive ? 700 : 500,
              fontFamily: 'var(--font-primary)',
              color: isActive ? 'var(--text-link)' : 'var(--text-secondary)',
              background: 'transparent',
              border: 'none',
              borderBottom: isActive ? '2px solid var(--text-link)' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

// --- END OF TASK 4 --- (Task 5 continues below)
```

- [ ] **4.2** Verify the file saves without syntax errors.

- [ ] **4.3** Commit:

```bash
git add src/components/detail/RoutingGuideTab.jsx
git commit -m "SHP-21: add ActionDropdown, RoutingTable, and RoutingSubTabs components"
```

---

## Task 5: Main component — state management, cascade logic, sub-tabs

**Files:** Continue writing in `src/components/detail/RoutingGuideTab.jsx`

### Steps

- [ ] **5.1** Replace the `// --- END OF TASK 4 ---` comment at the bottom of the file with the main exported component:

```jsx
/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function RoutingGuideTab({ data, shipmentDetails, shipment }) {
  const [activeSubTab, setActiveSubTab] = useState('routing-options')
  const [highlightedRank, setHighlightedRank] = useState(null)
  const [openMenuRank, setOpenMenuRank] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [options, setOptions] = useState(() => data?.options || [])
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const tableRef = useRef(null)

  // Reset state when data changes (new shipment selected)
  useEffect(() => {
    setOptions(data?.options || [])
    setHighlightedRank(null)
    setOpenMenuRank(null)
    setIsDetailModalOpen(false)
  }, [data])

  // Click-outside: deselect highlighted row when clicking outside table + dropdown
  useEffect(() => {
    const handleClick = (e) => {
      // Don't deselect if clicking inside the table
      if (tableRef.current && tableRef.current.contains(e.target)) return
      // Don't deselect if clicking inside a portal-rendered dropdown
      if (e.target.closest('[data-tender-dropdown]')) return
      setHighlightedRank(null)
      setOpenMenuRank(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleOpenMenu = useCallback((rank, pos) => {
    setHighlightedRank(rank)
    setOpenMenuRank((prev) => (prev === rank ? null : rank))
    setMenuPos(pos)
  }, [])

  const handleCloseMenu = useCallback(() => {
    setOpenMenuRank(null)
  }, [])

  const handleAction = useCallback((rank, action) => {
    setOptions(prev => {
      const next = prev.map(o => ({ ...o }))
      const idx = next.findIndex(o => o.rank === rank)
      if (idx === -1) return prev

      next[idx].status = STATUS_AFTER_ACTION[action]

      // Cascade: on Decline or Cancel, auto-tender next null carrier
      if (action === 'Decline' || action === 'Cancel') {
        const nextNull = next
          .filter(o => o.rank !== rank && o.status === null)
          .sort((a, b) => a.rank - b.rank)[0]
        if (nextNull) {
          const nullIdx = next.findIndex(o => o.rank === nextNull.rank)
          next[nullIdx].status = 'Sent'
        }
      }

      return next
    })
    setOpenMenuRank(null)
  }, [])

  // Prepare options with menu position attached for the dropdown
  const optionsWithPos = options.map(o => ({
    ...o,
    _menuPos: o.rank === openMenuRank ? menuPos : null,
  }))

  const activeColumns = [...LOCKED_COLUMNS, ...(TAB_COLUMNS[activeSubTab] || [])]

  return (
    <div
      style={{
        margin: 'calc(-1 * var(--spacing-4)) calc(-1 * var(--spacing-5))',
        padding: 'var(--spacing-4) var(--spacing-5)',
        height: 'calc(100% + var(--spacing-4) * 2)',
        overflow: 'auto',
      }}
    >
      {/* Compact summary — always visible */}
      <TenderSummary
        shipment={shipment}
        shipmentDetails={shipmentDetails}
        onOpenDetail={() => setIsDetailModalOpen(true)}
      />

      {/* Sub-tab bar with Add Quote button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
        <RoutingSubTabs activeSubTab={activeSubTab} onTabChange={setActiveSubTab} />
        <button
          onClick={() => console.log('[Tender] Add Quote clicked')}
          style={{
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'var(--font-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          Add Quote
        </button>
      </div>

      {/* Routing table */}
      <div ref={tableRef}>
        <RoutingTable
          options={optionsWithPos}
          columns={activeColumns}
          highlightedRank={highlightedRank}
          openMenuRank={openMenuRank}
          onOpenMenu={handleOpenMenu}
          onCloseMenu={handleCloseMenu}
          onAction={handleAction}
        />
      </div>

      {/* Detail modal */}
      {isDetailModalOpen && (
        <TenderDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          shipment={shipment}
          shipmentDetails={shipmentDetails}
        />
      )}
    </div>
  )
}
```

- [ ] **5.2** Verify the complete file has no syntax errors. The file should now be fully self-contained with:
  - Imports (line 1-3)
  - Constants: STATUS_STYLES, LOCKED_COLUMNS, TAB_COLUMNS, SUB_TABS, TENDER_ACTIONS, STATUS_AFTER_ACTION (lines ~10-105)
  - Shared styles: thStyle, tdStyle (lines ~107-130)
  - Helper components: Field, SectionHeader, CheckboxField, StatusBadge (lines ~132-180)
  - TenderSummary (Task 3)
  - TenderDetailModal (Task 3)
  - ActionDropdown (Task 4)
  - RoutingTable (Task 4)
  - RoutingSubTabs (Task 4)
  - Main RoutingGuideTab export (Task 5)

- [ ] **5.3** Commit:

```bash
git add src/components/detail/RoutingGuideTab.jsx
git commit -m "SHP-21: add main RoutingGuideTab with state management and cascade logic"
```

---

## Task 6: BottomBar.jsx cleanup

**Files:** `src/components/detail/BottomBar.jsx` (line 100)

### Steps

- [ ] **6.1** In `src/components/detail/BottomBar.jsx`, change line 100 from:

```javascript
      case 'routing': return <RoutingGuideTab data={shipmentDetails.routingData} shipmentDetails={shipmentDetails} shipment={shipment} isFullscreen={barState === 'fullscreen'} />
```

to:

```javascript
      case 'routing': return <RoutingGuideTab data={shipmentDetails.routingData} shipmentDetails={shipmentDetails} shipment={shipment} />
```

This removes the `isFullscreen` prop which is no longer used — the Tender tab now renders all content in every bar state.

- [ ] **6.2** Verify visually: select a shipment, click the Tender tab. The compact summary, sub-tabs, and routing table should all be visible in both expanded and fullscreen modes.

- [ ] **6.3** Commit:

```bash
git add src/components/detail/BottomBar.jsx
git commit -m "SHP-21: remove isFullscreen prop from RoutingGuideTab render"
```

---

## Task 7: Regenerate data and verify

**Files:** None new — run generator and verify data integrity.

### Steps

- [ ] **7.1** Regenerate data (if not already done in Task 1):

```bash
node tools/generate.mjs
```

- [ ] **7.2** Verify field count and key new fields:

```bash
node -e "const d=require('./src/data/shipment-details.json'); const o=Object.values(d)[0].routingData.options[0]; console.log(Object.keys(o).length, 'fields'); ['responseUser','proNumber','commitment','vcOpen','vcAccept','vcDecline','carrierApiTenderId','modifyUser','note','networkLeverage','equipNumber','rateSource'].forEach(k => console.log(k+':', o[k]))"
```

Expected: ~52 fields, all listed keys present with non-null values (proNumber may be null if carrier is not Accepted).

- [ ] **7.3** Verify vc fields sum correctly:

```bash
node -e "const d=require('./src/data/shipment-details.json'); const o=Object.values(d)[0].routingData.options[0]; console.log('commitment:', o.commitment, '= open:', o.vcOpen, '+ accept:', o.vcAccept, '+ decline:', o.vcDecline, '= sum:', o.vcOpen+o.vcAccept+o.vcDecline)"
```

Expected: `sum` equals `commitment`.

- [ ] **7.4** Verify visually in the browser (user manages their own dev server):
  - Select any shipment
  - Click the "Tender" tab
  - Compact summary shows Buy/Sell IDs, Mode, Weight, Pickup, Delivery
  - Click "View Full Details" — modal opens with 4-column layout
  - Close modal (click Close button, click overlay, or press Escape)
  - Switch between all 5 sub-tabs — locked columns persist, tab-specific columns change
  - Click a 3-dot icon on any row — dropdown appears with contextual tender actions
  - Click "Accept" on a Sent carrier — badge changes to Accepted
  - Click "Decline" on a Sent carrier — badge changes to Declined AND next null carrier auto-tenders to Sent
  - Click "Cancel" on an Accepted carrier — badge changes to Cancelled AND cascade fires
  - Click "Re-Tender" on a Declined carrier — badge changes to Sent
  - Click "Tender" on a null carrier — badge changes to Sent
  - Click outside the table — row highlight clears
  - "Add Quote" button is visible at top-right of sub-tab bar

- [ ] **7.5** Commit regenerated data if changed:

```bash
git add src/data/shipment-details.json src/data/shipments.json
git commit -m "SHP-21: regenerate data with new carrier option fields"
```

---

## Task 8: Update backlog and progress

**Files:** `shipments-documentation/Documentation/backlog.html`, `progress.md`

### Steps

- [ ] **8.1** In `shipments-documentation/Documentation/backlog.html`, find the SHP-21 row and change its status from "Done" to "In Progress". The exact markup depends on the current format — look for the row containing "SHP-21" and update the status cell.

- [ ] **8.2** In `progress.md`, add a new Session 7 section at the bottom:

```markdown
## Session 7 — 2026-04-06

### SHP-21: Tender Tab Rebuild

- **Generator:** Added 25 new fields per carrier option (routing options, notify/response, volume commitment, additional info, others)
- **RoutingGuideTab.jsx:** Full rewrite (~450 lines)
  - Removed: CompactSummary, FullSummary, ActionButtons, radio buttons, isFullscreen gating, legacy COLUMNS array
  - Added: TenderSummary (compact, always visible), TenderDetailModal (portal, 4-column), ActionDropdown (contextual 3-dot menu), RoutingTable (no radio, 3-dot trailing column)
  - State: mutable options array, cascade tendering (Decline/Cancel auto-tenders next null carrier), sub-tab switching
  - 5 sub-tabs with proper column definitions referencing new data fields
- **BottomBar.jsx:** Removed isFullscreen prop from RoutingGuideTab render
- **Font sizes restored:** th=12px, td=14px, padding=10px 14px (was 11px/12px/6px 10px)
```

- [ ] **8.3** Commit:

```bash
git add shipments-documentation/Documentation/backlog.html progress.md
git commit -m "SHP-21: update backlog status and session 7 progress notes"
```

---

## Summary of all files modified

| File | Change |
|------|--------|
| `tools/generate.mjs` | Add 25 new fields to carrier option object + volume commitment pre-computation |
| `src/data/shipment-details.json` | Regenerated (auto) |
| `src/data/shipments.json` | Regenerated (auto) |
| `src/components/detail/RoutingGuideTab.jsx` | Full rewrite (~450 lines) |
| `src/components/detail/BottomBar.jsx` | Remove `isFullscreen` prop (line 100) |
| `shipments-documentation/Documentation/backlog.html` | SHP-21 status: Done -> In Progress |
| `progress.md` | Add Session 7 notes |

## Components removed
- `CompactSummary` (replaced by `TenderSummary`)
- `FullSummary` (replaced by `TenderDetailModal`)
- `ActionButtons` (replaced by contextual `ActionDropdown` in 3-dot menu)
- `ActionButton` helper (no longer needed — actions are in dropdown now)
- `parseLocationParts` helper (no longer needed — summary uses direct field display)
- Legacy flat `COLUMNS` array (replaced by `LOCKED_COLUMNS` + `TAB_COLUMNS`)
- `selectThStyle` / `selectTdStyle` (radio button column styles removed)

## Components added
- `TenderSummary` — compact always-visible summary with "View Full Details" button
- `TenderDetailModal` — portal-rendered 4-column detail modal
- `ActionDropdown` — portal-rendered contextual 3-dot dropdown with tender actions + rate details
- `RoutingTable` — rebuilt table with no radio buttons, 3-dot trailing column, row highlighting
- `RoutingSubTabs` — preserved from current code (minor style cleanup)
