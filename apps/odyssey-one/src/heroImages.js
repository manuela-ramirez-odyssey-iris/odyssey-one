// Shared hero-background image set. Imported by BOTH Login and Home so the two
// routes open on the SAME photo across the login→home crossfade.
//
// HERO_IMAGES order is canonical; dropping a new bgN.webp in public/ and adding
// it here surfaces it everywhere. The fade mask + DSN/900 COLOR-blend tint live
// on the .home-background layers (Home.css), so every image gets the identical
// treatment — these are just the sources.
export const HERO_IMAGES = ['/bg1.webp', '/bg2.webp', '/bg3.webp', '/bg4.webp', '/bg5.webp']

// Home hero rotation cadence.
export const HERO_ROTATE_MS = 120000 // 2 minutes

// Per-image vertical framing (background-position) for `cover` crop. Default is
// 'center' (50% 50%); some photos frame better cropped lower, so we bias toward
// the bottom. Higher Y % = shows more of the image's bottom (50% = center).
// Home-only — Login always renders the matching image centered.
export const HERO_POSITIONS = {
  '/bg2.webp': 'center 90%', // toward bottom by 45%
  '/bg3.webp': 'center 110%', // bottom-aligned (asked for 90%; 100% is the floor)
  '/bg5.webp': 'center 150%', // bottom-aligned (asked for 90%; 100% is the floor)
  '/bg4.webp': 'center 150%'
}
export const heroPosition = (src) => HERO_POSITIONS[src] || 'center'

// Starting image, chosen ONCE per page load (module eval, so it's stable across
// the Login→Home handoff). Both routes read this same value to open on the same
// photo; Home then rotates forward from here every HERO_ROTATE_MS.
export const HERO_INITIAL_INDEX = Math.floor(Math.random() * HERO_IMAGES.length)
