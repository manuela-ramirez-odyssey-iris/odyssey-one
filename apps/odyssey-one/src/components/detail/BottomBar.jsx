import React, { useState, useEffect, useCallback, useMemo, useRef, useTransition, Suspense } from 'react'
import { RefreshCw } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { ShipmentsBar, Button, Spinner } from '@odyssey/ui'
import ShipmentDetailsModal from './ShipmentDetailsModal'
import PaneErrorBoundary from '../common/PaneErrorBoundary.jsx'
import ErrorState from '../common/ErrorState.jsx'
import { getErrorDetail } from '../common/errorDetail.js'

const OrderTab = React.lazy(() => import('./OrderTab'))
const StopsTab = React.lazy(() => import('./StopsTab'))
const ProductTab = React.lazy(() => import('./ProductTab'))
const RoutingGuideTab = React.lazy(() => import('./RoutingGuideTab'))
const SpotBoardTab = React.lazy(() => import('./SpotBoardTab'))
const CostAllocationTab = React.lazy(() => import('./CostAllocationTab'))
const InstructionsTab = React.lazy(() => import('./InstructionsTab'))
const DocumentsTab = React.lazy(() => import('./DocumentsTab'))
const NotesTab = React.lazy(() => import('./NotesTab'))
const HistoryTab = React.lazy(() => import('./HistoryTab'))
const TenderHistoryTab = React.lazy(() => import('./TenderHistoryTab'))

// Fix (2026-08-10, user report "put the spinner in the vertical middle of
// the slot" — it wasn't): the S79f comment this replaced claimed height:100%
// always resolves because "the pane wrapper below is absolutely pinned to
// the content area while loading." Verified false as a general claim — that
// pinning (BottomBar's `style={freshLoading ? {position:'absolute',
// inset:0} : undefined}` on the key={selectedShipmentId} wrapper) only
// applies when `freshLoading` is true (first open, no data yet). On an
// ordinary TAB SWITCH — the far more common path, where a not-yet-loaded
// lazy pane trips the Suspense fallback below — `shownDetails` already
// exists, so that wrapper is a plain unstyled div with no explicit height.
// `height: 100%` on the old inline style then had no definite parent height
// to resolve against (percentage heights require one) and collapsed to the
// spinner's own size — never centered, just top-aligned content. `minHeight:
// 0` made it worse by killing the one thing that could've forced height.
// The comment was the bug: stale for 2 of TabLoader's 3 call sites (plain
// Suspense fallback; only accurate for the freshLoading branch and the
// already-absolute `.shipments-bar__pane-stale-overlay`).
//
// Fix: stop depending on the ancestor's per-render positioning at all.
// `.tab-loader` (styles/components.css) is itself `position: absolute;
// inset: 0`, anchored to `.shipments-bar__content` — that wrapper is
// UNCONDITIONALLY `position: relative` (packages/ui/src/ShipmentsBar.jsx:261
// wraps `children` in it directly, no state gate), so this resolves the same
// way regardless of freshLoading/tab-switch/stale-overlay. Token-based class
// over inline styles, matching the .centered-message conversion.
// jsdom cannot verify real vertical centering (no layout engine) — the test
// only asserts the class is applied; visual confirmation in a real browser
// is still owed.
function TabLoader() {
  return (
    <div className="tab-loader">
      <Spinner size={32} />
    </div>
  )
}

// Tab order + labels follow the Figma ShipmentsBar master (4106:1765):
// Orders first, History before Tender History. Keys are the pane ids.
// Exported for TabArrangementPanel (the arrange feature's item source).
export const TABS = [
  { key: 'order', label: 'Orders' },
  { key: 'product', label: 'Product' },
  { key: 'stops', label: 'Stops' },
  { key: 'routing', label: 'Tender' },
  { key: 'spot', label: 'SpotBid' },
  { key: 'cost', label: 'Cost Allocation' },
  { key: 'instructions', label: 'Instructions' },
  { key: 'documents', label: 'Documents' },
  { key: 'notes', label: 'Notes' },
  { key: 'history', label: 'History' },
  { key: 'tender', label: 'Tender History' },
]

export const DEFAULT_TAB_ORDER = TABS.map(t => t.key)

// Fix E (2026-08-10): per-tab error copy. PROVENANCE — the five strings this
// constant held originally were mandated VERBATIM by 5 Jira acceptance
// criteria (LINX-12069 stops / LINX-12072 instructions / LINX-12076 notes /
// LINX-12110 cost / LINX-12114 documents — customfield_10032, read
// 2026-08-10): long sentences like "Unable to load stop details at the
// moment. Please try again later. If the issue persists, contact support."
// SHORTENED on user ruling (2026-08-14): Figma `Table Container Error`
// (5065:8602) draws exactly two short lines — a headline + a brief reason —
// not a wall of text ("<Error1> explanation" is the user's own shorthand for
// "brief reason, not a big message"). The long AC sentences below are what
// this constant used to hold; this divergence from the ACs is deliberate,
// not a drop — raise it with Ramesh before treating either version as stale.
// Keys here are the real TABS keys above, NOT the AC's prose names — Tender
// is `routing` and Cost Allocation is `cost`.
//
// This is copy over the ONE shared fetch, not real per-tab failure isolation:
// getSellShipmentDetail returns a single blob (stops + notes + instructions +
// cost + documents + tender + history in one response), so there is exactly
// one `detailsError` boolean for the whole pane. A tab-specific backend
// failure is structurally impossible today. User decision (2026-08-10):
// ship the correct wording over the shared failure — the cheap option —
// rather than splitting into 7 requests per shipment click on a guess that
// the tabs' data is independently sourced. Whether it actually is stays open
// with Ramesh; if he confirms independent services, THIS map is what turns
// into real per-tab error state.
const TAB_ERROR_COPY = {
  stops: "Couldn't load stops.",
  instructions: "Couldn't load instructions.",
  notes: "Couldn't load notes.",
  cost: "Couldn't load cost details.",
  documents: "Couldn't load documents.",
}

// Fix D (LINX-11786, 2026-08-10): merge a STORED tab-order preference against
// the live TABS list rather than trusting it wholesale.
//
// A tab absent from the stored order is ambiguous on its own — it could be a
// tab the user deliberately UNCHECKED (TabArrangementPanel's "Available
// tabs" section; the pre-existing hidden-tabs feature this order array
// already doubled as, per BottomBar's "hidden = absent" convention), which
// must STAY hidden, or a tab that didn't exist yet when the order was saved
// (SpotBoard/S104 shipped after some users' saves), which must APPEAR. Both
// look identical as a bare array. Disambiguating requires knowing what tabs
// EXISTED at save time, so the stored shape is `{ order, knownKeys }` —
// `knownKeys` is a snapshot of DEFAULT_TAB_ORDER taken when that save
// happened. A key absent from `order` but present in `knownKeys` was
// deliberately hidden; absent from BOTH means it's new — append it.
//
// `stored` may also be a bare array (this session's own earlier saves before
// this shape existed, or any hand-seeded legacy data) — treated as
// `knownKeys === order`, i.e. "nothing existed beyond what's listed," which
// preserves the original missing-keys-get-appended behaviour for that case.
//
// Unknown keys (a tab since retired) are always dropped, and Orders is
// forced back to the first slot no matter what's stored (mirrors
// TabArrangementPanel.jsx's `PINNED_KEY` invariant, DEC-42) — a stored order
// must never be able to un-pin it. Same shape/intent as ColumnPanel.jsx's
// `mergeLateAddedColumns` for columns, plus the knownKeys epoch marker that
// problem doesn't need (columns are never individually hidden the same way).
export function mergeTabOrder(stored) {
  const isLegacyArray = Array.isArray(stored)
  const order = isLegacyArray ? stored : stored?.order
  const knownAtSave = isLegacyArray ? stored : (stored?.knownKeys ?? stored?.order)
  if (!Array.isArray(order) || !order.length) return DEFAULT_TAB_ORDER
  const known = new Set(DEFAULT_TAB_ORDER)
  const wasKnownAtSave = new Set(Array.isArray(knownAtSave) ? knownAtSave : [])
  const kept = order.filter(k => k !== 'order' && known.has(k))
  const missing = DEFAULT_TAB_ORDER.filter(k => k !== 'order' && !kept.includes(k) && !wasKnownAtSave.has(k))
  return ['order', ...kept, ...missing]
}

// Shipments detail bar — composes the normalized ShipmentsBar shell (strip +
// expansion + controls) and keeps the app wiring: lazy panes per tab slot, the
// multi-order switcher inside the Orders tab, loading/error/retry states.
export default function BottomBar({
  selectedShipmentId,
  shipmentDetails,
  shipment,
  rightOffset = 0,
  onTabArrangement,
  tabOrder = DEFAULT_TAB_ORDER,
  detailsLoading,
  detailsError,
  // Fix A (2026-08-10): the real ApiError/Error thrown by the detail query
  // (see api/client.ts's `apiErrorFrom` — every non-2xx response's real
  // `{message, detail}` body lands on `.message`). Was never threaded down
  // from ShipmentsRoute before, so this branch could only ever show the
  // hardcoded generic string below, even after that server-message parsing
  // fix landed (2026-08-09).
  error,
  // Fix B (2026-08-10): react-query's `isPlaceholderData` for this query —
  // true while `shipmentDetails` is still the PREVIOUS shipment's data,
  // served by `placeholderData: keepPreviousData` (useShipmentDetail.ts)
  // while the newly-selected shipment's real data fetches. Drives the
  // dim + spinner overlay below (user ruling, DEC-61).
  detailsStale,
  onRetryDetails,
  onPrevShipment,
  onNextShipment,
  prevDisabled,
  nextDisabled,
  onClose,
  // requestedTab: { key } token from the table's cell→tab mapping (S82) — a
  // fresh object per qualifying cell click so re-clicking the same column
  // re-applies the tab even after the user switched away.
  requestedTab,
}) {
  // Expansion is derived: selection ⇒ open. Close = deselect (`onClose`, wired
  // upstream to clear the selected row) — the 'collapsed with selection' state
  // no longer exists (S79c decision 4).
  const expanded = !!selectedShipmentId
  const [activeTab, setActiveTab] = useState('order')
  // Three-state bar (S82): selection opens PARTIAL (60dvh); the bar's
  // CollapseExpand walks partial → full → closed (close = deselect).
  const [stage, setStage] = useState('partial')
  // View Shipment Details modal — opened from the bar's shipment-id ButtonLink (S93).
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [, startTransition] = useTransition()

  // Only a FRESH open (null → id) resets to the Orders tab; a selected →
  // selected switch (prev/next arrows, row-to-row click) keeps the bar open on
  // the same tab (S79d — resetting on every id change lost the user's tab).
  const prevIdRef = useRef(null)
  useEffect(() => {
    const fresh = selectedShipmentId && !prevIdRef.current
    prevIdRef.current = selectedShipmentId
    if (!fresh) return
    setActiveTab('order')
    setStage('partial')
    setDetailsModalOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shipmentDetails read once at open
  }, [selectedShipmentId])

  // Cell→tab mapping (S82): a qualifying cell click lands on its mapped tab.
  // expandGeneralRef: when the Orders tab opens from a customer-identity cell
  // (customerId/customerName), the General Information section should auto-expand.
  // A ref (not state) so OrderTab can consume it once without triggering re-renders.
  const expandGeneralRef = useRef(false)
  useEffect(() => {
    if (requestedTab?.key) {
      expandGeneralRef.current = !!requestedTab.expandGeneral
      startTransition(() => setActiveTab(requestedTab.key))
    }
  }, [requestedTab])

  // Stale-while-loading (S79d / DEC-61): across a selected → selected switch
  // the pane shows the PREVIOUS shipment's details instead of flashing the
  // loader (the ratchet keeps the height; data swaps in place when it lands).
  // Fix B (2026-08-10) moved this from a hand-rolled `lastDetailsRef` to
  // react-query's own previous-data behaviour (`placeholderData:
  // keepPreviousData` in useShipmentDetail.ts) — `shipmentDetails` IS the
  // held-over data now, and `detailsStale` (isPlaceholderData) tells the pane
  // below when to show that visibly, rather than silently.
  const shownDetails = shipmentDetails

  // Tab switches ride a transition so the PREVIOUS pane stays mounted while
  // the next lazy chunk loads — the auto-height bar never collapses to the
  // Suspense fallback mid-switch (S79c decision 3). The fallback still covers
  // the FIRST pane after a row select (fresh mount via key={selectedShipmentId}).
  // ponytail: upgrade path = measure old→new pane heights and transition
  // between the two for an animated height change on tab switch.
  const handleTabChange = useCallback((key) => {
    startTransition(() => setActiveTab(key))
  }, [])

  // Click-outside closes (S79c decision 5) — document-level mousedown, active
  // only while a shipment is selected. Exempt (do NOT deselect): the bar
  // itself, table rows (they own selection toggling), right panels, inline
  // modal dialogs/overlays, and anything portaled to document.body outside
  // <main> (dropdown menus, popovers, tooltips, navbar/sidebar chrome).
  // Escape also closes — unless a modal is open (its own Escape wins) or focus
  // sits in an overlay/chrome region outside <main>.
  useEffect(() => {
    if (!selectedShipmentId || !onClose) return
    const EXEMPT = '[data-bottombar], .shipment-table tr, .right-panel, [aria-modal="true"], .modal-medium-overlay, .modal-large-overlay'
    const inChrome = (t) =>
      !t.closest('main') && t !== document.body && t !== document.documentElement
    const onDown = (e) => {
      const t = e.target
      if (!(t instanceof Element)) return
      if (t.closest(EXEMPT) || inChrome(t)) return
      onClose()
    }
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (document.querySelector('[aria-modal="true"]')) return
      const t = e.target
      if (t instanceof Element && inChrome(t)) return
      onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [selectedShipmentId, onClose])

  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0)

  const orders = useMemo(() => {
    if (!shownDetails?.orderDetails) return []
    return shownDetails.orderDetails.map(od => od.orderNumber)
  }, [shownDetails])

  // Reset selected order when shipment changes
  useEffect(() => {
    setSelectedOrderIndex(0)
  }, [selectedShipmentId])

  // Strip tabs follow the user's arrangement (`tabOrder` = ordered visible keys,
  // owned by ShipmentsRoute / TabArrangementPanel). The Orders tab is pinned:
  // if an order array somehow omits it, it's restored to the first position.
  const orderedTabs = useMemo(() => {
    const keys = tabOrder.includes('order') ? tabOrder : ['order', ...tabOrder]
    return keys.map(k => TABS.find(t => t.key === k)).filter(Boolean)
  }, [tabOrder])

  // If the active pane's tab was hidden by the arrangement, fall back to Orders.
  const shownTab = orderedTabs.some(t => t.key === activeTab) ? activeTab : 'order'

  // Orders tab is now a plain tab — the order switcher lives inside the OrderTab
  // pane as underline tabs, and the location/weight header row replaces the old
  // dropdown label (S79 Figma: State=Selected Dropdown removed from ShipmentsBarTab).
  const tabs = orderedTabs

  const renderTabContent = () => {
    if (detailsError) {
      // Fix E (2026-08-10) / user ruling (2026-08-14): line 1 is always a
      // SHORT headline — the mandated copy for the 5 ACs' tabs (TAB_ERROR_COPY,
      // see def'n above), else "Couldn't load <tab label>." derived from the
      // same TABS list the strip renders from (no separate copy to keep in
      // sync). Line 2 is the shared getErrorDetail() brief reason (never the
      // raw server string — see src/components/common/errorDetail.js) so both
      // BottomBar and the grid (ShipmentTable.jsx) draw the identical Figma
      // `Table Container Error` (5065:8602) two-line shape.
      const mandatedCopy = TAB_ERROR_COPY[shownTab]
      const tabLabel = TABS.find((t) => t.key === shownTab)?.label
      const primaryMessage = mandatedCopy ?? (tabLabel ? `Couldn't load ${tabLabel.toLowerCase()}.` : "Couldn't load shipment details.")
      // S116: the Figma error state landed (`Table Container Error` 5065:8602)
      // and this now matches it — two lines of label/xs in --text-error over a
      // secondary "Reload" button, NO icon. Same design as the grid, which took
      // it from DataTable's own `error` prop; the tabs can't use that prop (they
      // are panes, not tables), so ErrorState carries the identical treatment.
      //
      // No AC (LINX-12069/72/76/110/114 — the 5 mandating TAB_ERROR_COPY
      // above) requires a retry/reload control on error; verified directly,
      // all 5 only require "must not break the UI / keep the user in
      // shipment context." A working Retry affordance already existed here
      // before this pass, so dropping it on spec-silence would be a
      // regression — kept, restyled per explicit user ask: secondary Button,
      // "Reload" label, RefreshCw (circular-arrows, not a plain arrow) icon.
      // The Retry→Reload rename is a deliberate instruction, not a drive-by —
      // it breaks any test asserting the old accessible name.
      return (
        <ErrorState
          // Fills and centres in `.shipments-bar__content` exactly as TabLoader
          // does — this error REPLACES that spinner, so it must occupy the same
          // box rather than hugging the top of the pane. Opt-in modifier: the
          // grid's ErrorState is in page flow and must NOT take it.
          className="centered-message--fill"
          message={primaryMessage}
          detail={getErrorDetail(error)}
          action={(
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw {...ICON_MD} aria-hidden="true" />}
              onClick={onRetryDetails}
            >
              Reload
            </Button>
          )}
        />
      )
    }
    if (detailsLoading && !shownDetails) {
      return <TabLoader />
    }
    if (!shownDetails) return null
    switch (shownTab) {
      case 'order': {
        // Consume the expandGeneral flag once — reset after handing it to the pane
        // so subsequent manual tab switches don't re-expand.
        const expand = expandGeneralRef.current
        expandGeneralRef.current = false
        return (
          <OrderTab
            data={shownDetails.orderDetails?.[selectedOrderIndex]}
            orders={orders}
            selectedOrderIndex={selectedOrderIndex}
            onSelectOrder={setSelectedOrderIndex}
            instructions={shownDetails.instructionsData?.orders?.[selectedOrderIndex]?.instructions ?? []}
            productLines={shownDetails.productData?.orders?.[selectedOrderIndex]?.lines ?? []}
            expandGeneral={expand}
          />
        )
      }
      case 'stops': return <StopsTab data={shownDetails.stopsData} />
      case 'product': return <ProductTab data={shownDetails.productData} />
      // No onToggleColumnPanel here (Fix 3, 2026-08-10) — it used to be the SAME
      // handler ShipmentTable uses, so the Routing Guide's gear opened the
      // shipments-LIST column panel, not one of its own. Removed at the source.
      case 'routing': return <RoutingGuideTab data={shownDetails.routingData} shipmentDetails={shownDetails} shipment={shipment} />
      case 'spot': return <SpotBoardTab shipmentDetails={shownDetails} shipment={shipment} />
      case 'cost': return <CostAllocationTab data={shownDetails.costData} />
      case 'instructions': return <InstructionsTab data={shownDetails.instructionsData} />
      case 'documents': return <DocumentsTab data={shownDetails.documentsData} />
      case 'notes': return <NotesTab data={shownDetails.notesData} />
      case 'history': return <HistoryTab data={shownDetails.historyData} />
      case 'tender': return <TenderHistoryTab />
      default: return null
    }
  }

  // Fresh open with loading content: with the S93 fixed-stage heights the bar
  // opens to its full stage size regardless — the loader just needs an
  // absolutely-pinned wrapper so it centers in the canvas.
  const freshLoading = detailsLoading && !shownDetails

  return (
    <>
    <ShipmentsBar
        shipmentId={shipment?.buyShipment ?? selectedShipmentId}
        closeOnOutsideClick
        onShipmentIdClick={() => setDetailsModalOpen(true)}
        onPrevShipment={onPrevShipment}
        onNextShipment={onNextShipment}
        prevDisabled={prevDisabled}
        nextDisabled={nextDisabled}
        tabs={tabs}
        activeTab={selectedShipmentId ? shownTab : null}
        onTabChange={handleTabChange}
        expanded={expanded}
        stage={stage}
        onStageChange={setStage}
        onClose={onClose}
        onTabArrangement={onTabArrangement}
        rightOffset={rightOffset}
      >
        {/* key stays for data freshness (pane-local state resets per shipment)
            — on a switch it remounts SYNCHRONOUSLY with the held stale details
            (chunks already loaded), so no loader flash. While the fresh-open
            loader shows, the wrapper is absolutely pinned to the content area
            (position: relative on .shipments-bar__content) so TabLoader
            centers in the fixed-stage canvas. */}
        <div
          key={selectedShipmentId}
          className={detailsStale && shownDetails ? 'shipments-bar__pane--stale' : undefined}
          style={freshLoading ? { position: 'absolute', inset: 0 } : undefined}
        >
          {/* Fix C (2026-08-10): boundary sits OUTSIDE Suspense, INSIDE the bar
              chrome — a pane render throw degrades this pane only; the strip,
              tab buttons and shipment selection above stay alive. Keyed on
              shipment + tab so a switch of EITHER remounts it (clearing any
              caught error) instead of leaving a crash sticky across navigation. */}
          <PaneErrorBoundary key={`${selectedShipmentId}-${activeTab}`}>
            <Suspense fallback={<TabLoader />}>
              {renderTabContent()}
            </Suspense>
          </PaneErrorBoundary>
          {/* Fix B (2026-08-10, user ruling / DEC-61): `shownDetails` above may
              be the PREVIOUS shipment's data, held as a react-query placeholder
              while this one fetches (isPlaceholderData → `detailsStale`). Only
              overlay when there's actually content being held over — a
              genuinely-empty first open renders nothing here and shows the
              plain TabLoader inside renderTabContent() instead. */}
          {detailsStale && shownDetails && (
            <div className="shipments-bar__pane-stale-overlay" data-stale="true" aria-hidden="true">
              <TabLoader />
            </div>
          )}
        </div>
    </ShipmentsBar>
    {detailsModalOpen && selectedShipmentId && (
      <ShipmentDetailsModal
        shipment={shipment}
        shipmentDetails={shownDetails}
        error={detailsError}
        onClose={() => setDetailsModalOpen(false)}
        // "More" (Cost/Stops section headers) — reuses the same tab-switch
        // path a table cell click already rides (handleTabChange), just with
        // the modal's own onClose above doing the closing half.
        onViewTab={handleTabChange}
      />
    )}
    </>
  )
}
