# Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate UI lag at 700+ shipments and scale to 1000 with no infrastructure changes.

**Architecture:** Replace monolithic table rendering with `react-window` virtualization (only ~20 visible rows in DOM). Split 21 MB detail JSON into per-shipment files loaded on demand via `fetch()`. Add `React.memo` to 10+ components and pre-compute filter indexes for O(1) panel/category lookups.

**Tech Stack:** React 19, react-window, Vite 8, existing CSS/Tailwind v4 design system.

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `tools/generate.mjs` | Data generator — outputs to `public/details/` + `src/data/shipments.json` | Modify (lines 1024-1034) |
| `src/data/index.js` | Data accessor layer — fetch-based detail loader, index builders | Rewrite |
| `src/App.jsx` | Root state — async detail loading, pre-computed metrics, indexed filters | Modify (lines 53-180) |
| `src/components/shipments/ShipmentTable.jsx` | Virtualized table — react-window FixedSizeList | Major rewrite |
| `src/components/shipments/MonitorPanels.jsx` | Monitor panels — wrap React.memo | Minor edit |
| `src/components/shipments/ShipmentTabs.jsx` | Tab bar — wrap React.memo | Minor edit |
| `src/components/shipments/TableControls.jsx` | Table toolbar — wrap React.memo | Minor edit |
| `src/components/layout/Navbar.jsx` | Top navbar — wrap React.memo | Minor edit |
| `src/components/layout/Sidebar.jsx` | Side navigation — wrap React.memo | Minor edit |
| `src/components/detail/OrderTab.jsx` | Order detail — wrap React.memo | Minor edit |
| `src/components/detail/StopsTab.jsx` | Stops detail — wrap React.memo | Minor edit |
| `src/components/detail/ProductTab.jsx` | Product detail — wrap React.memo | Minor edit |
| `src/components/detail/CostAllocationTab.jsx` | Cost detail — wrap React.memo | Minor edit |
| `src/components/detail/InstructionsTab.jsx` | Instructions detail — wrap React.memo | Minor edit |
| `src/components/detail/DocumentsTab.jsx` | Documents detail — wrap React.memo | Minor edit |
| `src/components/detail/NotesTab.jsx` | Notes detail — wrap React.memo | Minor edit |
| `src/components/detail/HistoryTab.jsx` | History detail — wrap React.memo | Minor edit |
| `package.json` | Dependencies — add react-window | Minor edit |
| `public/details/*.json` | Per-shipment detail files (generated) | Created by generator |

---

### Task 1: Install react-window and update generator to split detail data

**Files:**
- Modify: `package.json`
- Modify: `tools/generate.mjs:1016-1034`
- Create: `public/details/*.json` (1000 files, generated)
- Delete: `src/data/shipment-details.json` (21 MB monolith)

- [ ] **Step 1: Install react-window**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-shipments && bun add react-window
```

- [ ] **Step 2: Update generator — change count to 1000 and output per-shipment files**

In `tools/generate.mjs`, replace the final output section (the last ~15 lines starting at `console.log('Generating 700 shipments...')`) with:

```js
// ============================================================
// GENERATE 1000 SHIPMENTS
// ============================================================

import { mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';

console.log('Generating 1000 shipments...');

const TOTAL_SHIPMENTS = 1000;
const shipments = [];
const shipmentDetails = {};

for (let i = 0; i < TOTAL_SHIPMENTS; i++) {
  const { mainRow, detail } = generateShipment(i);
  shipments.push(mainRow);
  shipmentDetails[mainRow.buyShipment] = detail;
}

// Write main table data (statically imported by app)
const outDir = new URL('../src/data/', import.meta.url);
writeFileSync(new URL('shipments.json', outDir), JSON.stringify(shipments, null, 2));

// Write per-shipment detail files to public/details/
const detailsDir = new URL('../public/details/', import.meta.url);
const detailsDirPath = new URL('.', detailsDir).pathname;

// Ensure directory exists
mkdirSync(detailsDirPath, { recursive: true });

// Clean old detail files
if (existsSync(detailsDirPath)) {
  for (const f of readdirSync(detailsDirPath)) {
    if (f.endsWith('.json')) unlinkSync(detailsDirPath + f);
  }
}

// Write individual files
for (const [id, detail] of Object.entries(shipmentDetails)) {
  writeFileSync(detailsDirPath + id + '.json', JSON.stringify(detail));
}

console.log(`Done! Generated ${shipments.length} shipments.`);
console.log(`  shipments.json: ${shipments.length} rows`);
console.log(`  public/details/: ${Object.keys(shipmentDetails).length} detail files`);
console.log(`  Total orders: ${shipments.reduce((s, r) => s + r.orders.length, 0)}`);
```

Also move the `import { writeFileSync } from 'fs'` at line 2 to include the new imports:

```js
import { writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
```

(Remove the duplicate `import` block from the bottom — keep only the one at line 2.)

- [ ] **Step 3: Run the generator**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-shipments && bun tools/generate.mjs
```

Expected output:
```
Generating 1000 shipments...
Done! Generated 1000 shipments.
  shipments.json: 1000 rows
  public/details/: 1000 detail files
  Total orders: ~XXXX
```

- [ ] **Step 4: Verify output**

```bash
ls public/details/ | wc -l  # Should be 1000
ls -lh public/details/ | head -5  # Each ~25-35 KB
ls -lh src/data/shipments.json  # ~0.9 MB
```

- [ ] **Step 5: Delete the old monolithic file**

```bash
rm src/data/shipment-details.json
```

- [ ] **Step 6: Add public/details/ to .gitignore** (generated files, not committed)

Append to `.gitignore`:

```
# Generated per-shipment detail files
public/details/
```

- [ ] **Step 7: Commit**

```bash
git add package.json bun.lockb tools/generate.mjs .gitignore src/data/shipments.json
git commit -m "chore: bump to 1000 shipments, split detail data into per-shipment files in public/details/"
```

---

### Task 2: Rewrite data layer — fetch-based detail loader with cache + filter indexes

**Files:**
- Rewrite: `src/data/index.js`

- [ ] **Step 1: Rewrite `src/data/index.js`**

Replace the entire file with:

```js
import shipments from './shipments.json'

// ─── Shipment list (statically imported, ~0.9 MB) ───────────

export function getAllShipments() {
  return shipments
}

export function getShipmentById(id) {
  return shipments.find(s => s.buyShipment === id) || null
}

// ─── Pre-built indexes for O(1) panel/category lookups ──────

const byPanel = Map.groupBy(shipments, s => s.panel)

const byPanelAndCategory = new Map()
for (const [panel, items] of byPanel) {
  byPanelAndCategory.set(panel, Map.groupBy(items, s => s.category))
}

export function getShipmentsByPanel(panel) {
  return byPanel.get(panel) || []
}

export function getShipmentsByPanelAndCategory(panel, category) {
  const panelMap = byPanelAndCategory.get(panel)
  if (!panelMap) return []
  return panelMap.get(category) || []
}

export function getCategoryCount(panel, category) {
  const panelMap = byPanelAndCategory.get(panel)
  if (!panelMap) return 0
  return panelMap.get(category)?.length ?? 0
}

// ─── Per-shipment detail loader (fetch on demand) ───────────

const detailsCache = new Map()

export async function fetchShipmentDetails(id) {
  if (detailsCache.has(id)) return detailsCache.get(id)

  const res = await fetch(`/details/${id}.json`)
  if (!res.ok) throw new Error(`Failed to load details for ${id}`)
  const data = await res.json()
  detailsCache.set(id, data)

  // Cap cache at 50 entries (~1.5 MB)
  if (detailsCache.size > 50) {
    const oldest = detailsCache.keys().next().value
    detailsCache.delete(oldest)
  }

  return data
}

export function getCachedShipmentDetails(id) {
  return detailsCache.get(id) || null
}

// ─── Search attributes ──────────────────────────────────────

export const SEARCH_ATTRIBUTES = [
  { key: 'buy-shipment', label: 'Buy Shipment #', type: 'number-text', dataKey: 'buyShipment' },
  { key: 'sell-shipment', label: 'Sell Shipment #', type: 'number-text', dataKey: 'sellShipment' },
  { key: 'order', label: 'Order #', type: 'text', dataKey: 'orders' },
  { key: 'pro', label: 'Pro#/Booking #', type: 'number-text', dataKey: 'pro' },
  { key: 'customer-id', label: 'Customer ID', type: 'text', dataKey: 'customerId' },
  { key: 'customer-name', label: 'Customer Name', type: 'text', dataKey: 'customerName' },
  { key: 'consignor', label: 'Consignor', type: 'text', dataKey: 'consignor' },
  { key: 'consignee', label: 'Consignee', type: 'text', dataKey: 'consignee' },
  { key: 'origin', label: 'Origin', type: 'text', dataKey: 'origin' },
  { key: 'destination', label: 'Destination', type: 'text', dataKey: 'destination' },
  { key: 'mode', label: 'Mode', type: 'dropdown', dataKey: 'mode', values: ['TL', 'LTL', 'RR', 'IMD', 'AIR'] },
  { key: 'scac', label: 'SCAC', type: 'dropdown', dataKey: 'scac' },
  { key: 'tender-status', label: 'Tender Status', type: 'dropdown', dataKey: 'tenderStatus', values: ['Sent', 'Accepted', 'Declined', 'Cancelled'] },
  { key: 'shipment-status', label: 'Shipment Status', type: 'dropdown', dataKey: 'shipmentStatus', values: ['Review', 'Done'] },
  { key: 'equipment-code', label: 'Equipment Code', type: 'dropdown', dataKey: 'equipmentCode', values: ['FLT', 'LTH', 'VAN', 'REEFER'] },
]
```

- [ ] **Step 2: Verify the dev server starts without errors**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-shipments && bun run dev
```

The app will show errors in the browser because `App.jsx` still references `loadShipmentDetails` and `getShipmentDetails` — that's expected and gets fixed in Task 3.

- [ ] **Step 3: Commit**

```bash
git add src/data/index.js
git commit -m "feat: rewrite data layer with fetch-based detail loader and pre-built filter indexes"
```

---

### Task 3: Update App.jsx — async detail loading + indexed filters + pre-computed metrics

**Files:**
- Modify: `src/App.jsx:1-180`

- [ ] **Step 1: Update imports at top of App.jsx**

Replace line 12:

```js
import { getAllShipments, getShipmentDetails, loadShipmentDetails, SEARCH_ATTRIBUTES } from './data'
```

With:

```js
import { getAllShipments, fetchShipmentDetails, getCachedShipmentDetails, getShipmentsByPanel, getShipmentsByPanelAndCategory, getCategoryCount, SEARCH_ATTRIBUTES } from './data'
```

- [ ] **Step 2: Replace detail loading logic (lines 49-69)**

Replace:

```js
  const [detailsLoaded, setDetailsLoaded] = useState(false)
```

With:

```js
  const [shipmentDetails, setShipmentDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
```

Replace the `useEffect` and `shipmentDetails` useMemo (lines 55-69):

```js
  useEffect(() => {
    if (selectedShipmentId) {
      setMetricsCollapsed(true)
      loadShipmentDetails().then(() => {
        setDetailsLoaded(true)
      })
    } else {
      setMetricsCollapsed(false)
    }
  }, [selectedShipmentId])

  const shipmentDetails = useMemo(() => {
    if (!selectedShipmentId) return null
    return getShipmentDetails(selectedShipmentId)
  }, [selectedShipmentId, detailsLoaded])
```

With:

```js
  useEffect(() => {
    if (selectedShipmentId) {
      setMetricsCollapsed(true)
      // Check cache first (instant)
      const cached = getCachedShipmentDetails(selectedShipmentId)
      if (cached) {
        setShipmentDetails(cached)
        return
      }
      // Fetch on demand (~30 KB per shipment)
      setDetailsLoading(true)
      let stale = false
      fetchShipmentDetails(selectedShipmentId).then(data => {
        if (!stale) {
          setShipmentDetails(data)
          setDetailsLoading(false)
        }
      }).catch(() => {
        if (!stale) setDetailsLoading(false)
      })
      return () => { stale = true }
    } else {
      setMetricsCollapsed(false)
      setShipmentDetails(null)
    }
  }, [selectedShipmentId])
```

- [ ] **Step 3: Replace filteredShipments with indexed lookups (lines 76-156)**

Replace the entire `filteredShipments` useMemo:

```js
  const filteredShipments = useMemo(() => {
    // O(1) panel lookup instead of O(n) filter
    let result = activeTab === 'all'
      ? getShipmentsByPanel(activePanel)
      : getShipmentsByPanelAndCategory(activePanel, activeTab)

    // Apply saved query filters
    if (appliedSavedQuery) {
      const conditions = parseSavedQuery(appliedSavedQuery.query)
      result = result.filter((s) =>
        conditions.every(({ key, value }) => {
          const attr = SEARCH_ATTRIBUTES.find((a) => a.key === key)
          if (!attr) return true
          const fieldVal = s[attr.dataKey]
          if (Array.isArray(fieldVal)) return fieldVal.some((v) => String(v).toLowerCase().includes(value.toLowerCase()))
          return String(fieldVal || '').toLowerCase().includes(value.toLowerCase())
        })
      )
    }

    // Apply text/chip search filtering
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase()
      if (activeChipKey) {
        const attr = SEARCH_ATTRIBUTES.find((a) => a.key === activeChipKey)
        if (attr) {
          result = result.filter((s) => {
            const val = s[attr.dataKey]
            if (Array.isArray(val)) return val.some((v) => String(v).toLowerCase().includes(q))
            return String(val || '').toLowerCase().includes(q)
          })
        }
      } else {
        result = result.filter((s) =>
          s.buyShipment.toLowerCase().includes(q) ||
          s.customerId.toLowerCase().includes(q) ||
          s.orders.some((o) => o.toLowerCase().includes(q)) ||
          s.origin.toLowerCase().includes(q) ||
          s.pickupDate.toLowerCase().includes(q) ||
          s.deliveryDate.toLowerCase().includes(q)
        )
      }
    }

    // Apply panel filters
    if (filters.origin) result = result.filter((s) => s.origin === filters.origin)
    if (filters.destination) result = result.filter((s) => s.destination === filters.destination)
    if (filters.shipmentStatus) result = result.filter((s) => s.shipmentStatus === filters.shipmentStatus)
    if (filters.scac) result = result.filter((s) => s.scac === filters.scac)

    // Date range filters
    if (filters.pickupDateFrom) {
      result = result.filter((s) => {
        const d = parseShipmentDate(s.pickupDate)
        return d && d >= filters.pickupDateFrom
      })
    }
    if (filters.pickupDateTo) {
      result = result.filter((s) => {
        const d = parseShipmentDate(s.pickupDate)
        return d && d <= filters.pickupDateTo
      })
    }
    if (filters.deliveryDateFrom) {
      result = result.filter((s) => {
        const d = parseShipmentDate(s.deliveryDate)
        return d && d >= filters.deliveryDateFrom
      })
    }
    if (filters.deliveryDateTo) {
      result = result.filter((s) => {
        const d = parseShipmentDate(s.deliveryDate)
        return d && d <= filters.deliveryDateTo
      })
    }

    return result
  }, [allShipments, activePanel, activeTab, debouncedQuery, activeChipKey, filters, appliedSavedQuery])
```

- [ ] **Step 4: Replace metrics computation (lines 158-180)**

Replace the entire `metrics` useMemo:

```js
  const metrics = useMemo(() => {
    return {
      // Exception counts — O(1) lookups
      dateIssues: getCategoryCount('exceptions', 'date-issues'),
      routingReview: getCategoryCount('exceptions', 'routing-review'),
      tenderIssues: getCategoryCount('exceptions', 'tender-issues'),
      tenderReview: getCategoryCount('exceptions', 'tender-review'),
      bidReview: getCategoryCount('exceptions', 'bid-review'),
      // Monitoring counts
      hold: getCategoryCount('monitoring', 'hold'),
      consolidation: getCategoryCount('monitoring', 'consolidation'),
      sent: getCategoryCount('monitoring', 'sent'),
      spotBid: getCategoryCount('monitoring', 'spotbid'),
      approved: getCategoryCount('monitoring', 'approved'),
      // PGI/PGR counts
      pgipgrErrors: getCategoryCount('pgipgr', 'pgipgr-errors'),
      ratingFailure: getCategoryCount('pgipgr', 'rating-failure'),
      manualPgipgr: getCategoryCount('pgipgr', 'manual-pgipgr'),
    }
  }, [allShipments])
```

- [ ] **Step 5: Pass detailsLoading to BottomBar for loading state**

Find the `<BottomBar` render (~line 330) and add the `detailsLoading` prop:

```jsx
      <BottomBar
        selectedShipmentId={selectedShipmentId}
        shipmentDetails={shipmentDetails}
        shipment={selectedShipment}
        onClose={handleBottomBarClose}
        rightOffset={rightOffset}
        onToggleColumnPanel={handleToggleColumnPanel}
        detailsLoading={detailsLoading}
      />
```

- [ ] **Step 6: Verify the app compiles and detail tabs load on shipment click**

Open the browser, click a shipment, verify the bottom bar tabs show data. Check browser Network tab — should see a single `/details/SHP-XXXX.json` request (~30 KB).

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx
git commit -m "feat: async per-shipment detail loading and O(1) indexed filter lookups"
```

---

### Task 4: Virtualize ShipmentTable with react-window

**Files:**
- Rewrite: `src/components/shipments/ShipmentTable.jsx:273-357`

This is the highest-impact change. The table currently renders ALL filtered shipments as `<tr>` elements. We replace with `react-window` `FixedSizeList` that only renders ~20 visible rows.

- [ ] **Step 1: Add react-window import**

At top of `ShipmentTable.jsx`, add:

```js
import { FixedSizeList as List } from 'react-window'
```

- [ ] **Step 2: Replace the ShipmentTable component (lines 273-357)**

Replace the entire `export default function ShipmentTable` with:

```jsx
const ROW_HEIGHT = 56

export default function ShipmentTable({ shipments, onRowSelect, selectedId, onToggleColumnPanel, visibleColumns }) {
  const containerRef = useRef(null)
  const listRef = useRef(null)

  const orderedColumns = useMemo(() => {
    if (!visibleColumns) return COLUMN_CONFIG
    return visibleColumns
      .map(key => {
        const fromConfig = COLUMN_CONFIG.find(c => c.key === key)
        if (fromConfig) return fromConfig
        const allCol = ALL_COLUMNS.find(c => c.key === key)
        return { key, label: allCol ? allCol.label : key }
      })
      .filter(Boolean)
  }, [visibleColumns])

  const handleSelect = useCallback((shipment) => {
    onRowSelect(selectedId === shipment.buyShipment ? null : shipment.buyShipment)
  }, [onRowSelect, selectedId])

  // Auto-scroll selected row into view
  useEffect(() => {
    if (selectedId && listRef.current) {
      const idx = shipments.findIndex(s => s.buyShipment === selectedId)
      if (idx >= 0) {
        setTimeout(() => {
          listRef.current?.scrollToItem(idx, 'smart')
        }, 100)
      }
    }
  }, [selectedId, shipments])

  // Shared data passed to each row via itemData (avoids re-creating props)
  const itemData = useMemo(() => ({
    shipments,
    selectedId,
    handleSelect,
    orderedColumns,
  }), [shipments, selectedId, handleSelect, orderedColumns])

  return (
    <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden flex flex-col"
      style={{ borderRadius: 'var(--radius-lg)', paddingBottom: 'var(--bottombar-collapsed)', minHeight: 560 }}>
      {/* Sticky header — separate from virtual list */}
      <div style={{ flexShrink: 0, overflowX: 'auto' }}>
        <div className="flex" style={{ minWidth: 'max-content' }}>
          {/* Radio column header */}
          <div style={{ width: 48, flexShrink: 0, padding: '0 var(--spacing-4)', height: 'var(--bottombar-collapsed)', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
          {/* Data column headers */}
          {orderedColumns.map(col => (
            <div key={col.key} className="text-left whitespace-nowrap"
              style={{ flex: '1 0 0', minWidth: 100, padding: '0 var(--spacing-4)', height: 'var(--bottombar-collapsed)', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-placeholder)', fontWeight: 600, fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center' }}>
              {col.label}
            </div>
          ))}
          {/* Actions column header */}
          <div style={{ ...stickyLastCol, zIndex: 5, width: 56, flexShrink: 0, padding: '0 var(--spacing-4)', height: 'var(--bottombar-collapsed)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
              className="flex items-center justify-center mx-auto bg-transparent border-none cursor-pointer p-1 rounded"
              style={{ color: 'var(--text-placeholder)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-placeholder)'}
              onClick={() => { if (onToggleColumnPanel) onToggleColumnPanel() }}
              title="Column arrangement"
            >
              <Columns3Cog size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Virtualized row list */}
      {shipments.length === 0 ? (
        <div className="flex items-center justify-center" style={{ padding: '48px 0', color: 'var(--text-placeholder)', fontSize: 'var(--font-size-sm)' }}>
          No shipments found
        </div>
      ) : (
        <List
          ref={listRef}
          height={Math.max(400, (containerRef.current?.clientHeight || 600) - 48)}
          itemCount={shipments.length}
          itemSize={ROW_HEIGHT}
          width="100%"
          overscanCount={10}
          itemData={itemData}
          style={{ overflowX: 'auto' }}
        >
          {VirtualRow}
        </List>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add the VirtualRow component**

Add this above the `ShipmentTable` export (after `ShipmentRow`, around line 271):

```jsx
const VirtualRow = React.memo(function VirtualRow({ index, style, data }) {
  const { shipments, selectedId, handleSelect, orderedColumns } = data
  const s = shipments[index]
  return (
    <div style={style}>
      <ShipmentRow
        shipment={s}
        isSelected={selectedId === s.buyShipment}
        onSelect={handleSelect}
        orderedColumns={orderedColumns}
      />
    </div>
  )
})
```

- [ ] **Step 4: Convert ShipmentRow from `<tr>` to flex `<div>`**

Replace the existing `ShipmentRow` component (lines 201-271) with:

```jsx
const ShipmentRow = React.memo(function ShipmentRow({ shipment, isSelected, onSelect, orderedColumns }) {
  const s = shipment
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const rowBg = isSelected ? 'var(--badge-blue-bg)' : 'var(--bg-primary)'

  return (
    <div
      className="flex items-center cursor-pointer transition-colors duration-150 group"
      style={{ background: rowBg, height: ROW_HEIGHT, minWidth: 'max-content' }}
      onClick={() => onSelect(s)}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)'
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'var(--bg-primary)'
      }}
    >
      {/* Radio */}
      <div style={{ width: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: ROW_HEIGHT, borderBottom: '1px solid var(--bg-tertiary)' }}
        onClick={(e) => { e.stopPropagation(); onSelect(s) }}>
        <input
          type="radio"
          name="shipment-select"
          checked={isSelected}
          readOnly
          style={{ accentColor: 'var(--text-primary)', width: 16, height: 16, cursor: 'pointer', pointerEvents: 'none' }}
        />
      </div>

      {/* Data columns */}
      {orderedColumns.map(col => {
        const configCol = COLUMN_CONFIG_MAP[col.key]
        return (
          <div key={col.key} style={{
            flex: '1 0 0',
            minWidth: 100,
            padding: '0 var(--spacing-4)',
            height: ROW_HEIGHT,
            borderBottom: '1px solid var(--bg-tertiary)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            ...(col.key === 'buyShipment' ? { fontWeight: 500, color: 'var(--text-secondary)' } : {}),
          }}>
            {configCol && configCol.render ? configCol.render(s) : (s[col.key] || '--')}
          </div>
        )
      })}

      {/* Sticky actions column */}
      <div
        onClick={(e) => {
          e.stopPropagation()
          const rect = e.currentTarget.getBoundingClientRect()
          setMenuPos({ top: rect.bottom + 4, left: rect.right })
          setMenuOpen((prev) => !prev)
        }}
        style={{ ...stickyLastCol, width: 56, flexShrink: 0, height: ROW_HEIGHT, borderBottom: '1px solid var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: isSelected ? 'var(--badge-blue-bg)' : 'var(--bg-primary)' }}
      >
        <MoreVertical size={16} style={{ color: 'var(--text-placeholder)' }} />
        {menuOpen && <ActionMenu shipmentId={s.buyShipment} position={menuPos} onClose={() => setMenuOpen(false)} />}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.isSelected === nextProps.isSelected &&
    prevProps.shipment === nextProps.shipment &&
    prevProps.orderedColumns === nextProps.orderedColumns
})
```

Note: Remove the `rowRef` prop — the auto-scroll now uses `listRef.current.scrollToItem()` instead of a row ref.

- [ ] **Step 5: Handle dynamic list height**

The `List` height is set to `containerRef.current?.clientHeight - 48`. To handle initial render (when `clientHeight` is 0), add a resize observer. Add this inside `ShipmentTable`, before the `return`:

```jsx
  const [listHeight, setListHeight] = useState(600)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      setListHeight(Math.max(400, entry.contentRect.height - 48))
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])
```

Then in the `<List>` component, replace `height={Math.max(400, ...)}` with:

```jsx
  height={listHeight}
```

- [ ] **Step 6: Open the app in the browser and verify**

1. Shipments table should render with smooth scrolling
2. Only ~20 rows visible in DOM (inspect with DevTools Elements tab)
3. Selecting a row should scroll it into view
4. Column arrangement panel should still work
5. Three-dot menu should still open correctly
6. Horizontal scrolling for many columns should still work

- [ ] **Step 7: Commit**

```bash
git add src/components/shipments/ShipmentTable.jsx
git commit -m "feat: virtualize shipments table with react-window — only visible rows rendered"
```

---

### Task 5: Memoize layout and detail components

**Files:**
- Modify: `src/components/shipments/MonitorPanels.jsx` (line 40)
- Modify: `src/components/shipments/ShipmentTabs.jsx` (line 26)
- Modify: `src/components/shipments/TableControls.jsx` (line 6)
- Modify: `src/components/layout/Navbar.jsx` (line 11)
- Modify: `src/components/layout/Sidebar.jsx` (line 17)
- Modify: `src/components/detail/OrderTab.jsx` (line 64)
- Modify: `src/components/detail/StopsTab.jsx` (line 211)
- Modify: `src/components/detail/ProductTab.jsx` (line 135)
- Modify: `src/components/detail/CostAllocationTab.jsx` (line 70)
- Modify: `src/components/detail/InstructionsTab.jsx` (line 129)
- Modify: `src/components/detail/DocumentsTab.jsx` (line 102)
- Modify: `src/components/detail/NotesTab.jsx` (line 141)
- Modify: `src/components/detail/HistoryTab.jsx` (line 1)

Each component follows the same pattern: wrap `export default function X` with `React.memo`. Add `import React from 'react'` if not already imported.

- [ ] **Step 1: Memoize MonitorPanels**

In `MonitorPanels.jsx`, change line 40:

```js
// Before
export default function MonitorPanels({ activePanel, onPanelSelect, metrics, collapsed: controlledCollapsed, onToggleCollapsed }) {

// After  
import React from 'react'
// ... (add at top if not present)

const MonitorPanels = React.memo(function MonitorPanels({ activePanel, onPanelSelect, metrics, collapsed: controlledCollapsed, onToggleCollapsed }) {
```

And at the bottom of the file, change:

```js
// Remove "export default" from function declaration
// Add at end of file:
export default MonitorPanels
```

Close the function with `})` instead of just `}`.

- [ ] **Step 2: Memoize ShipmentTabs**

In `ShipmentTabs.jsx`, same pattern — line 26:

```js
// Before
export default function ShipmentTabs({ activePanel, activeTab, onTabSelect, badgeCounts }) {

// After
const ShipmentTabs = React.memo(function ShipmentTabs({ activePanel, activeTab, onTabSelect, badgeCounts }) {
  // ... existing body ...
})
export default ShipmentTabs
```

- [ ] **Step 3: Memoize TableControls**

In `TableControls.jsx`, line 6:

```js
// Before
export default function TableControls({

// After
const TableControls = React.memo(function TableControls({
  // ... existing body ...
})
export default TableControls
```

- [ ] **Step 4: Memoize Navbar and Sidebar**

`Navbar.jsx` line 11 — same pattern. These take no props, so `React.memo` prevents any re-render from parent.

`Sidebar.jsx` line 17 — same pattern. `export default function Sidebar()` → `const Sidebar = React.memo(function Sidebar() { ... }); export default Sidebar`

- [ ] **Step 5: Memoize all detail tabs**

Apply the same pattern to each:

| File | Function name at line | Change to |
|------|----------------------|-----------|
| `OrderTab.jsx:64` | `export default function OrderTab({ data })` | `const OrderTab = React.memo(function OrderTab({ data }) { ... }); export default OrderTab` |
| `StopsTab.jsx:211` | `export default function StopsTab({ data })` | Same pattern |
| `ProductTab.jsx:135` | `export default function ProductTab({ data })` | Same pattern |
| `CostAllocationTab.jsx:70` | `export default function CostAllocationTab({ data, selectedOrderIdx = 0 })` | Same pattern |
| `InstructionsTab.jsx:129` | `export default function InstructionsTab({ data })` | Same pattern |
| `DocumentsTab.jsx:102` | `export default function DocumentsTab({ data })` | Same pattern |
| `NotesTab.jsx:141` | `export default function NotesTab({ data })` | Same pattern |
| `HistoryTab.jsx:1` | `export default function HistoryTab({ data })` | Same pattern |

For each file, ensure `React` is imported (add `import React from 'react'` or add `React` to the existing import if it's `import { useState } from 'react'` → `import React, { useState } from 'react'`).

- [ ] **Step 6: Verify the app still works**

Open the browser. Click through all panels, tabs, select shipments, switch detail tabs. Everything should work identically — just faster.

- [ ] **Step 7: Commit**

```bash
git add src/components/shipments/MonitorPanels.jsx src/components/shipments/ShipmentTabs.jsx src/components/shipments/TableControls.jsx src/components/layout/Navbar.jsx src/components/layout/Sidebar.jsx src/components/detail/OrderTab.jsx src/components/detail/StopsTab.jsx src/components/detail/ProductTab.jsx src/components/detail/CostAllocationTab.jsx src/components/detail/InstructionsTab.jsx src/components/detail/DocumentsTab.jsx src/components/detail/NotesTab.jsx src/components/detail/HistoryTab.jsx
git commit -m "perf: wrap 13 components in React.memo to prevent unnecessary re-renders"
```

---

### Task 6: Handle BottomBar detailsLoading prop + final verification

**Files:**
- Modify: `src/components/detail/BottomBar.jsx` (add loading state)

- [ ] **Step 1: Accept detailsLoading prop in BottomBar**

In `BottomBar.jsx`, find the component function signature and add `detailsLoading` to props:

```jsx
// Find the BottomBar function declaration and add detailsLoading
// Show a spinner overlay when detailsLoading is true and shipmentDetails is null
```

Inside `renderTabContent()` (or wherever the tab content is rendered), add a loading check before rendering tab content:

```jsx
if (detailsLoading && !shipmentDetails) {
  return <TabLoader />
}
```

This reuses the existing `TabLoader` spinner component already defined at line 19.

- [ ] **Step 2: Full smoke test**

Test the complete flow in browser:

1. **Initial load** — Table renders instantly (1000 shipments, only ~20 visible in DOM)
2. **Scroll** — Smooth, no jank (virtual scrolling)
3. **Click shipment** — Bottom bar opens, shows spinner briefly, then detail data
4. **Switch tabs** — Order, Product, Stops, Tender, Cost, etc. all work
5. **Click another shipment** — Cached if previously visited (instant), fetched if new
6. **Panel switch** — Exceptions → Monitoring: instant (O(1) lookup)
7. **Tab filter** — Date Issues, Routing Review etc.: instant
8. **Search** — Type in search bar, results filter after 150ms debounce
9. **Column arrangement** — Open panel, toggle/reorder columns
10. **Three-dot menu** — Opens correctly on virtualized rows

- [ ] **Step 3: Check DOM node count**

Open Chrome DevTools → Elements panel. Count `<div>` children inside the virtual list container. Should be ~20-30 rows, not 1000.

- [ ] **Step 4: Check Network tab**

Click a shipment. Network tab should show a single `GET /details/SHP-XXXX.json` request, ~25-35 KB. No 21 MB chunk.

- [ ] **Step 5: Commit**

```bash
git add src/components/detail/BottomBar.jsx
git commit -m "feat: add loading state for async detail fetching in BottomBar"
```

- [ ] **Step 6: Final commit — all performance work**

```bash
git add -A
git status  # Verify nothing unexpected
git commit -m "perf: complete performance optimization — virtualization, split details, memoization, indexed filters

- react-window virtualization: only ~20 visible rows in DOM (was 700+)
- Per-shipment detail files: ~30KB fetch per click (was 21MB bulk load)
- React.memo on 13 components to prevent cascade re-renders
- O(1) panel/category filter indexes (was O(n) chain)
- Scaled from 700 to 1000 shipments"
```

---

## Summary of Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| DOM nodes in table | 700-1000 rows | ~20 visible |
| Detail data per click | 21 MB (all) | ~30 KB (one) |
| Memory peak | ~35 MB | ~5 MB + cache |
| Panel/tab filter | O(n) x2 | O(1) |
| Metrics computation | 10 filter passes | Pre-computed |
| Components re-rendering | Entire tree | Only changed |
| Shipment count | 700 | 1000 |
