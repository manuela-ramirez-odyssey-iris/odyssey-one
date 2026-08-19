import { useEffect, useState } from 'react'
import { HERO_IMAGES, HERO_ROTATE_MS } from '../heroImages'

// Shared hero-photo cross-fade driver — extracted from Home.jsx (plan
// "carrier-bid-landing-page" §change-2, 2026-08-18) so CarrierBid can reuse
// it instead of a second setInterval. Advances through HERO_IMAGES every
// HERO_ROTATE_MS once `bgLoaded` (the first image has decoded), wrapping
// back to 0; every image stays mounted, only the active index is opaque
// (caller's job — see Home.jsx / CarrierBid.jsx render).
//
// `initialIndex` is the caller's own concern, not baked in here: Home
// starts from the shared random HERO_INITIAL_INDEX (keeps the Login→Home
// handoff on the same photo); CarrierBid starts from a fixed index so a
// demo reload always opens on the same frame.
//
// `respectReducedMotion` (default false): Home's rotation runs regardless
// of the OS setting today (a known pre-existing gap — plan §8) and this
// keeps that unchanged. CarrierBid opts in so a reduced-motion visitor
// never starts the interval at all (cheaper than gating each tick).
export function useHeroRotation(initialIndex, { bgLoaded = true, respectReducedMotion = false } = {}) {
  const [index, setIndex] = useState(initialIndex)

  useEffect(() => {
    if (!bgLoaded || HERO_IMAGES.length < 2) return
    if (respectReducedMotion && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    const id = setInterval(() => setIndex((i) => (i + 1) % HERO_IMAGES.length), HERO_ROTATE_MS)
    return () => clearInterval(id)
  }, [bgLoaded, respectReducedMotion])

  return index
}
