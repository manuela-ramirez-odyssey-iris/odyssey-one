// Shared hero-background image set. Imported by BOTH Login and Home so the two
// routes open on the SAME photo across the login→home crossfade.
//
// HERO_IMAGES order is canonical; dropping a new bgN.webp in public/ and adding
// it here surfaces it everywhere. The fade mask + DSN/900 COLOR-blend tint live
// on the .home-background layers (Home.css), so every image gets the identical
// treatment — these are just the sources.
// bg6–bg8 added 2026-08-24 (Unsplash, free license, no attribution required):
// bg6 = trucks on a highway at sunset (unsplash qms-kprAgJM), bg7 = aerial
// highway interchange at dusk (xhDmzxQneqs), bg8 = white tractor under blue
// sky (5M_RGvhvQ_g) — sourced as the TL/LTL replacements for the maritime
// photos the bid page dropped.
export const HERO_IMAGES = ['/bg1.webp', '/bg2.webp', '/bg3.webp', '/bg4.webp', '/bg5.webp', '/bg6.webp', '/bg7.webp', '/bg8.webp']

// Land/trucking-only subset (user ruling, 2026-08-24). CarrierBid is the
// spot-bid page shown to TL/LTL carriers, so its background must never show
// ocean freight — bg1 (port at dusk), bg2 (ocean-line containers) and bg3
// (tanker at sea) are excluded. Road freight only: bg6 (sunset highway
// trucks — FIRST, it's the demo-opening frame), bg5 (tractor-trailer lot),
// bg4 (drayage tractors + trailers), bg7 (dusk interchange aerial), bg8
// (white tractor). Home/Login keep the full HERO_IMAGES set — they're
// multimodal surfaces.
export const HERO_IMAGES_LAND = ['/bg6.webp', '/bg5.webp', '/bg4.webp', '/bg7.webp', '/bg8.webp']

// Home hero rotation cadence.
export const HERO_ROTATE_MS = 120000 // 2 minutes

// Per-image vertical framing (background-position) for `cover` crop. Default is
// 'center' (50% 50%); some photos frame better cropped lower, so we bias toward
// the bottom. Higher Y % = shows more of the image's bottom, up to 100% = fully
// bottom-aligned (the image's bottom edge flush with the container's bottom
// edge) — that's the ceiling for `background-size: cover`; going past it pushes
// the image UP past the bottom, leaving a gap. Home-only — Login always renders
// the matching image centered.
export const HERO_POSITIONS = {
  '/bg2.webp': 'center 90%', // toward bottom by 45%
  '/bg3.webp': 'center 100%', // bottom-aligned (was 110% — past the 100% ceiling, left a gap)
  '/bg5.webp': 'center 100%', // bottom-aligned (was 150% — past the 100% ceiling, left a gap)
  '/bg4.webp': 'center 100%' // bottom-aligned (was 150% — past the 100% ceiling, left a gap)
}
// Clamps the Y% so no config value (present or future) can push the image past
// the bottom-aligned ceiling (100%) or above the top (0%) — every caller routes
// through here, so this is the one guard rather than one per call site.
export const heroPosition = (src) => {
  const pos = HERO_POSITIONS[src]
  if (!pos) return 'center'
  const [x, y] = pos.split(' ')
  const pct = parseFloat(y)
  if (Number.isNaN(pct)) return pos
  return `${x} ${Math.min(100, Math.max(0, pct))}%`
}

// Starting image, chosen ONCE per page load (module eval, so it's stable across
// the Login→Home handoff). Both routes read this same value to open on the same
// photo; Home then rotates forward from here every HERO_ROTATE_MS.
export const HERO_INITIAL_INDEX = Math.floor(Math.random() * HERO_IMAGES.length)
