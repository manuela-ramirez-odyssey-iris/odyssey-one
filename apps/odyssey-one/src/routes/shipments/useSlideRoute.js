import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Slide-in/slide-out for the full-page breadcrumb views (user, 2026-09-20:
// "a side/slide animation (no fade) for when opening them and closing them").
// React Router unmounts a route the instant you navigate, so the EXIT is
// played first and the navigation fires when it lands — which is why every
// in-app exit routes through `leaveTo` instead of calling navigate directly.

// Must match --transition-drawer's duration in packages/tokens/tokens.css
// (300ms cubic-bezier(0.16, 1, 0.3, 1)) — this is how long the leaving state
// is held before navigate() actually fires.
const SLIDE_DURATION_MS = 300

export default function useSlideRoute() {
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)

  const leaveTo = (to, options) => {
    // Same reduced-motion convention as ProcessScacBar.jsx/useHeroRotation.js:
    // CSS turns the animation off, so there's nothing to wait on — navigate now.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      navigate(to, options)
      return
    }
    setLeaving(true)
    setTimeout(() => navigate(to, options), SLIDE_DURATION_MS)
  }

  return {
    className: leaving ? 'slide-route slide-route--leaving' : 'slide-route',
    leaveTo,
  }
}
