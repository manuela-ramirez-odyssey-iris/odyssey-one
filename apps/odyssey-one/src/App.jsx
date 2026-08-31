import { lazy, Suspense, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './api/queryClient'
import Home from './routes/Home.jsx'
import Login from './routes/Login.jsx'
import OrdersRoute from './routes/orders/OrdersRoute.jsx'
import CreateOrderRoute from './routes/orders/CreateOrderRoute.jsx'
import OrderSummaryRoute from './routes/orders/OrderSummaryRoute.jsx'
import Carriers from './routes/Carriers.jsx'
import Tracking from './routes/Tracking.jsx'
import Users from './routes/Users.jsx'
import Partners from './routes/Partners.jsx'
import ShipmentsRoute from './routes/shipments/ShipmentsRoute.jsx'
import OrderChangeReviewRoute from './routes/shipments/OrderChangeReviewRoute.jsx'
import SpotBidRoute from './routes/spotbid/SpotBidRoute.jsx'
import SpotBidDetailRoute from './routes/spotbid/SpotBidDetailRoute.jsx'
import ButtonDemo from './routes/ButtonDemo.jsx'
import DesignSystem from './routes/design-system/DesignSystem.jsx'
import DevMode from './devmode/DevMode.jsx'

// Standalone external page (no AppShell) — lazy so the token-decode +
// shipment-detail bid form never lands in the main app bundle.
const CarrierBid = lazy(() => import('./routes/CarrierBid.jsx'))

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

  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              {showHome && <Home />}
              {showLogin && <Login onLogin={handleLogin} phase={phase} />}
            </>
          }
        />
        <Route path="/orders" element={<OrdersRoute />} />
        <Route path="/orders/create" element={<CreateOrderRoute />} />
        <Route path="/orders/:orderId" element={<OrderSummaryRoute />} />
        <Route path="/carriers" element={<Carriers />} />
        {/* Must precede the /shipments/* wildcard below — a wildcard declared
            first would swallow this path and the row menu's navigate() would
            land back on the shipments table instead. */}
        <Route path="/shipments/order-change/:sellShipment" element={<OrderChangeReviewRoute />} />
        <Route path="/shipments/*" element={<ShipmentsRoute />} />
        <Route path="/spotbid" element={<SpotBidRoute />} />
        <Route path="/spotbid/:quoteId" element={<SpotBidDetailRoute />} />
        <Route path="/spotboard" element={<Navigate to="/spotbid" replace />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/users" element={<Users />} />
        <Route path="/partners" element={<Partners />} />
        <Route path="/button-demo" element={<ButtonDemo />} />
        <Route path="/design-system" element={<DesignSystem />} />
        <Route
          path="/spot-bid/:token"
          element={
            <Suspense fallback={null}>
              <CarrierBid />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <DevMode />
    </QueryClientProvider>
  )
}
