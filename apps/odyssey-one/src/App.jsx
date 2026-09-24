import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './api/queryClient'
import SheetLayer from './components/layout/SheetLayer.jsx'
import './styles/sheet-layer.css'
import Home from './routes/Home.jsx'
import Login from './routes/Login.jsx'
import OrdersRoute from './routes/orders/OrdersRoute.jsx'
import CreateOrderRoute from './routes/orders/CreateOrderRoute.jsx'
import OrderSummaryRoute from './routes/orders/OrderSummaryRoute.jsx'
import OrderAuditTrailRoute from './routes/orders/OrderAuditTrailRoute.jsx'
import Carriers from './routes/Carriers.jsx'
import Tracking from './routes/Tracking.jsx'
import Users from './routes/Users.jsx'
import Partners from './routes/Partners.jsx'
import ShipmentsRoute from './routes/shipments/ShipmentsRoute.jsx'
import OrderChangeReviewRoute from './routes/shipments/OrderChangeReviewRoute.jsx'
import OrderChangeEditStopsRoute from './routes/shipments/OrderChangeEditStopsRoute.jsx'
import ConsolidationReviewRoute from './routes/shipments/ConsolidationReviewRoute.jsx'
import SpotBidRoute from './routes/spotbid/SpotBidRoute.jsx'
import SpotBidDetailRoute from './routes/spotbid/SpotBidDetailRoute.jsx'
import ButtonDemo from './routes/ButtonDemo.jsx'
import DesignSystem from './routes/design-system/DesignSystem.jsx'
import SpotEmailsRoute from './routes/spot-emails/SpotEmailsRoute.jsx'
import TenderEmailsRoute from './routes/tender-emails/TenderEmailsRoute.jsx'
import DevMode from './devmode/DevMode.jsx'

// Standalone external page (no AppShell) — lazy so the token-decode +
// shipment-detail bid form never lands in the main app bundle.
const CarrierBid = lazy(() => import('./routes/CarrierBid.jsx'))
// Same rationale — the carrier Tender Review page (S157, slice C).
const TenderReview = lazy(() => import('./routes/TenderReview.jsx'))

// Transition timeline (wall-clock ms from Log In click).
//   0    → 'intro'   : modal fades out + image fades in (400ms).
//   900  → 'exiting' : image hold of 500ms done. .login-page fades out
//                      over 400ms. Body bg is DSN/900 so the fade reveals
//                      a backdrop that matches the overlay color.
//   900  → mount Home behind the still-fading Login. Home gets a 400ms
//                      head-start (the full exit-fade window) to load its
//                      bg.webp + render widget DOM behind the message.
//   1300 → 'home'    : Login unmounts.
const INTRO_HOLD_END_MS = 900
const HOME_MOUNT_AT_MS = 900
const LOGIN_UNMOUNT_MS = 1300

// The exit-retention hold (App.jsx §2) — must match sheet-layer.css's
// --transition-drawer duration, same convention useSlideRoute used to keep.
const SHEET_LEAVE_MS = 300

// One route table, rendered once per "location" the sheet stack asks for:
// the base always gets it (its own <Routes location={baseLocation}>), and
// every open sheet layer gets it again with ITS OWN frozen location — each
// instance only ever matches the one Route its location points at, so this
// looks expensive but isn't: React Router's <Routes> is just a big switch.
function AppRoutes({ location, showHome, showLogin, phase, onLogin }) {
  return (
    <Routes location={location}>
      <Route
        path="/"
        element={
          <>
            {showHome && <Home />}
            {showLogin && <Login onLogin={onLogin} phase={phase} />}
          </>
        }
      />
      <Route path="/orders" element={<OrdersRoute />} />
      <Route path="/orders/create" element={<CreateOrderRoute />} />
      <Route path="/orders/:orderId" element={<OrderSummaryRoute />} />
      <Route path="/orders/:orderId/audit-trail" element={<OrderAuditTrailRoute />} />
      <Route path="/carriers" element={<Carriers />} />
      {/* Listed above the /shipments/* wildcard for readability only — react-router
          v6 ranks routes by specificity, not declaration order, so a dynamic
          segment here already outranks the splat below regardless of position. */}
      <Route path="/shipments/order-change/:sellShipment" element={<OrderChangeReviewRoute />} />
      <Route path="/shipments/order-change/:sellShipment/stops" element={<OrderChangeEditStopsRoute />} />
      <Route path="/shipments/consolidate/review" element={<ConsolidationReviewRoute />} />
      <Route path="/shipments/*" element={<ShipmentsRoute />} />
      <Route path="/spotbid" element={<SpotBidRoute />} />
      <Route path="/spotbid/:quoteId" element={<SpotBidDetailRoute />} />
      <Route path="/spotboard" element={<Navigate to="/spotbid" replace />} />
      <Route path="/tracking" element={<Tracking />} />
      {/* User Management: the two bare paths are disclosures in the sidebar,
          not destinations, so a direct URL lands on the first real section. */}
      <Route path="/users" element={<Navigate to="/users/accounts" replace />} />
      <Route path="/users/accounts" element={<Users />} />
      <Route path="/users/access" element={<Navigate to="/users/access/domains" replace />} />
      <Route path="/users/access/:section" element={<Users />} />
      <Route path="/partners" element={<Partners />} />
      <Route path="/button-demo" element={<ButtonDemo />} />
      <Route path="/design-system" element={<DesignSystem />} />
      <Route path="/spot-emails" element={<SpotEmailsRoute />} />
      <Route path="/tender-emails" element={<TenderEmailsRoute />} />
      <Route
        path="/spot-bid/:token"
        element={
          <Suspense fallback={null}>
            <CarrierBid />
          </Suspense>
        }
      />
      <Route
        path="/tender-review/:token"
        element={
          <Suspense fallback={null}>
            <TenderReview />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  // Prototype-level auth: in-memory only. Refresh clears the session.
  // Gated only on `/`.
  //
  // Phases:
  //   'login'   — modal visible
  //   'intro'   — modal fades out, MessageIntro image (160h) fades in at
  //               the same center spot. bg + overlay stay visible.
  //   'exiting' — image stays; the whole .login-page fades out over 400ms,
  //               revealing the DSN/900 body bg beneath.
  //   'home'    — Login unmounts.
  const [phase, setPhase] = useState('login')
  const [mountHome, setMountHome] = useState(false)

  const handleLogin = () => {
    if (phase !== 'login') return
    setPhase('intro')
    setTimeout(() => setPhase('exiting'), INTRO_HOLD_END_MS)
    setTimeout(() => setMountHome(true), HOME_MOUNT_AT_MS)
    setTimeout(() => setPhase('home'), LOGIN_UNMOUNT_MS)
  }

  const showLogin = phase !== 'home'
  const showHome = mountHome

  // Sheet stack (S158, docs/superpowers/plans/2026-09-23-slide-over-routes.md
  // Part 1 §1). `location.state.sheetStack` is the locations BENEATH the
  // current one; it travels with each history entry useSheet.js pushes, so
  // browser back/forward render the right layers for free just by us reading
  // location on every render — no separate POP handling needed.
  const location = useLocation()
  const stack = useMemo(() => location.state?.sheetStack ?? [], [location.state])
  // Base — always the first child, so it never remounts under an open sheet:
  // stack[0] is the location it was FIRST opened from; empty stack (a direct
  // URL, or a plain navigate with no sheetStack) means this location IS the
  // base, full page, no slide.
  const baseLocation = stack[0] ?? location
  // Layers — every location between the base and the current one, in order
  // (bottom to top), the current location always last (the top one).
  const activeLayers = useMemo(
    () => (stack.length ? [...stack.slice(1), location] : []),
    [stack, location],
  )

  // Exit retention (§2): a layer that drops out of `activeLayers` (closed, or
  // a browser-back POP past it) is kept mounted here ~SHEET_LEAVE_MS with
  // `leaving: true` so sheet-layer.css has something to slide off the live
  // page underneath — the navigate already happened, so that page is
  // interactive from the first frame; only the outgoing layer's own slide is
  // still playing, on top, pointer-events: none (sheet-layer.css).
  const [renderedLayers, setRenderedLayers] = useState(
    () => activeLayers.map((loc) => ({ key: loc.key, location: loc, leaving: false })),
  )
  const prevActiveKeysRef = useRef(new Set(activeLayers.map((l) => l.key)))
  const leaveTimersRef = useRef({})
  useEffect(() => {
    const activeKeys = new Set(activeLayers.map((l) => l.key))
    const prevKeys = prevActiveKeysRef.current
    // A key that's active again (e.g. a quick back-then-forward) must not be
    // dropped by a stale timer from when it was leaving.
    activeKeys.forEach((key) => {
      if (leaveTimersRef.current[key]) {
        clearTimeout(leaveTimersRef.current[key])
        delete leaveTimersRef.current[key]
      }
    })
    const newlyLeavingKeys = [...prevKeys].filter((key) => !activeKeys.has(key))
    prevActiveKeysRef.current = activeKeys
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    setRenderedLayers((prev) => {
      const nextActive = activeLayers.map((loc) => ({ key: loc.key, location: loc, leaving: false }))
      const stillLeaving = prev.filter((l) => l.leaving && !activeKeys.has(l.key))
      const justLeaving = reducedMotion
        ? []
        : prev.filter((l) => !l.leaving && newlyLeavingKeys.includes(l.key)).map((l) => ({ ...l, leaving: true }))
      return [...nextActive, ...stillLeaving, ...justLeaving]
    })

    if (!reducedMotion) {
      newlyLeavingKeys.forEach((key) => {
        leaveTimersRef.current[key] = setTimeout(() => {
          setRenderedLayers((prev) => prev.filter((l) => l.key !== key))
          delete leaveTimersRef.current[key]
        }, SHEET_LEAVE_MS)
      })
    }
    // Reconciles on navigation only — activeLayers is derived fresh from
    // `location` every render, so re-running this off its own identity would
    // just repeat the same diff against itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])
  useEffect(() => () => { Object.values(leaveTimersRef.current).forEach(clearTimeout) }, [])

  // Everything but the single layer actually on screen is `inert` (§2) — the
  // base when any layer is open, every layer under the current top, and any
  // layer that's leaving (still mounted for its slide-out, no longer live).
  const activeOnly = renderedLayers.filter((l) => !l.leaving)
  const topActiveKey = activeOnly.length ? activeOnly[activeOnly.length - 1].key : null

  return (
    <QueryClientProvider client={queryClient}>
      <div inert={topActiveKey !== null || undefined}>
        <AppRoutes location={baseLocation} showHome={showHome} showLogin={showLogin} phase={phase} onLogin={handleLogin} />
      </div>
      {renderedLayers.map((layer) => (
        <SheetLayer key={layer.key} leaving={layer.leaving} inert={layer.key !== topActiveKey}>
          <AppRoutes location={layer.location} showHome={showHome} showLogin={showLogin} phase={phase} onLogin={handleLogin} />
        </SheetLayer>
      ))}
      <DevMode />
    </QueryClientProvider>
  )
}
