import { HERO_IMAGES_LAND, heroPosition } from '../heroImages'

// Pure extraction from CarrierBid.jsx (S157, slice C) — no behaviour change.
// Shared by every standalone, unauthenticated, token-linked external page
// (CarrierBid today, TenderReview now). See CarrierBid.jsx for the original
// doc comments this was lifted from.

// TrailNav avatar — initials from the first two words of the carrier's full
// name (splitting on space AND hyphen, so "KNIGHT-SWIFT TRANSPORTATION" →
// "KS", not "KT"). Falls back to the first two SCAC characters when `name`
// isn't resolved yet.
export function carrierInitials(name, scac) {
  const words = (name ?? '').trim().split(/[\s-]+/).filter(Boolean)
  if (words.length > 0) return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (scac ?? '').slice(0, 2).toUpperCase()
}

// Hero background layer — layered "port-at-dusk" treatment (src/styles/hero.css:
// .hero-bg / .hero-bg__photo), FIXED to the viewport, VERTICALLY FLIPPED via
// `.hero-bg--flipped`. Cross-fades through HERO_IMAGES_LAND via the shared
// useHeroRotation hook — only the active index is opaque.
export function HeroBackground({ heroIndex }) {
  return (
    <div className="carrier-bid-page__bg hero-bg hero-bg--flipped" aria-hidden="true">
      {HERO_IMAGES_LAND.map((src, i) => (
        <div
          key={src}
          className="hero-bg__photo"
          style={{ backgroundImage: `url(${src})`, backgroundPosition: heroPosition(src), opacity: i === heroIndex ? 1 : 0 }}
        />
      ))}
    </div>
  )
}
