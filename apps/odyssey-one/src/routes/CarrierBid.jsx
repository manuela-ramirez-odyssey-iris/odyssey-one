import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import { Trash2, Plus } from 'lucide-react'
import { Navbar, LeadNav, GlobalSearch, TrailNav, OdysseyLogo, Button, Alert, Badge, ComboBox, FormField, SubAccordion, TitleSubtitle, ModalMedium } from '@odyssey/ui'
import MeasureField from '../components/orders/create/fields/MeasureField.jsx'
import { SummaryCard } from '../components/detail/QuoteModal.jsx'
import { decodeToken } from '../spotboard/token.js'
import { getQuote, submitBid, declineBid, hydrateQuote } from '../spotboard/spotStore.js'
import { getFuelSchedule, computeFuel } from '../spotboard/fuelSchedule.js'
import { getApiMode } from '../api/config'
import { useCountdown, formatHMS, countdownTone } from '../spotboard/Countdown.jsx'
import { useShipmentDetail } from '../api/queries/useShipmentDetail'
import { getLookupOptions } from '../api/services/lookupService'
import { fmtDollar } from '../utils/money'
import { formatDateTimeMDYHM } from '../lib/dates.js'
import { HERO_IMAGES_LAND, heroPosition } from '../heroImages'
import { useHeroRotation } from '../hooks/useHeroRotation'
import './carrierBid.css'

// One currency for the WHOLE bid, selected once at bid level — never per
// charge line (SPB-66, Kathleen email 2026-08-24 item #3: "USD and CAD for
// now"). Each MeasureField's trailing edge just displays the bid currency
// (single-option list = no per-line choice). Amounts are kept as typed when
// the carrier switches currency mid-entry — whether they should convert or
// clear is an open question Kathleen herself flagged (SPB-66).
const CURRENCY_OPTIONS = [{ value: 'USD', label: 'USD' }, { value: 'CAD', label: 'CAD' }]
const round2 = (n) => Math.round(n * 100) / 100

// TrailNav avatar (change 2) — initials from the first two words of the
// carrier's full name (splitting on space AND hyphen, so "KNIGHT-SWIFT
// TRANSPORTATION" → "KS", not "KT"). Falls back to the first two SCAC
// characters when `name` isn't resolved yet (e.g. quote still loading) —
// no avatar/initials helper already existed in the repo (checked
// NoteAvatar in components/detail/NotesTab.jsx: same idea, different
// shape/normalization-candidate status, not reused as-is).
function carrierInitials(name, scac) {
  const words = (name ?? '').trim().split(/[\s-]+/).filter(Boolean)
  if (words.length > 0) return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (scac ?? '').slice(0, 2).toUpperCase()
}

// Hero background image (plan §3b, §change-2 2026-08-18) — the INITIAL
// image is deterministic, NOT Home's Math.random()-seeded
// HERO_INITIAL_INDEX: this page must open on the same photo across reloads
// during a demo. Rotation AFTER mount is fine and now shares Home's
// useHeroRotation hook (cross-fade every HERO_ROTATE_MS) — see the
// heroIndex hook call in CarrierBid() below.
// The set is HERO_IMAGES_LAND, not the full HERO_IMAGES: this page is the
// spot bid shown to TL/LTL carriers, so no ocean freight (user ruling,
// 2026-08-24 — see src/heroImages.js).
// ponytail: a per-shipment hash would pin a different starting photo per
// carrier, but nothing in the plan asks for it — upgrade if wanted.
const HERO_INITIAL_INDEX = 0
const HERO_SRC = HERO_IMAGES_LAND[HERO_INITIAL_INDEX]
// Section entrance stagger (plan §3c) — strictly top-to-bottom, no shuffle,
// no jitter (deliberate deviation from Home's randomized order).
const ENTER_STEP_MS = 90

// Hero background layer (plan §3b) — same layered "port-at-dusk" treatment
// as Home (src/styles/hero.css: .hero-bg / .hero-bg__photo), positioned
// FIXED to the viewport instead of scrolling with the page, and VERTICALLY
// FLIPPED via the `.hero-bg--flipped` modifier (§change-1, 2026-08-18):
// light/white sits at the top here, image toward the bottom — the mirror
// of Home's orientation. The modifier is scoped to this page only (Home's
// own `.hero-bg` div never carries it), so Home's mask is untouched — see
// styles/hero.css. Cross-fades through HERO_IMAGES_LAND via the shared
// useHeroRotation hook (§change-2): one stacked photo div per image, only
// the active index opaque, same mechanism as Home. Rendered identically in
// both the closed/expired branch and the active-bid branch below, so it's
// a shared component rather than duplicated JSX.
function HeroBackground({ heroIndex }) {
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

// Additional Charges — restored editable grid (QuoteModal.jsx's Additional
// Charges section is the pattern this models: same Code | Description |
// Amount | remove row shape, same ComboBox(variant="select")/FormField
// (disabled)/MeasureField trio, same plain-Trash2 remove + "Add More" link
// button). Every row is `{ code, description, amount }` — the `derived`
// lock (preselected+disabled Code, disabled remove) is RETIRED (bug fix,
// 2026-08-21): the shipment's real routing-option accessorials (Hazmat,
// Terminal Handling, Fuel Surcharge, etc.) weren't showing up here at all,
// and the user's ruling on what SHOULD show up ("so the user can edit them,
// delete them or add new") applies equally to every row regardless of where
// it came from. Three row origins, seeded in this priority:
//   - ROUTING-CHARGE rows seed from the first ranked routing option that
//     carries any `rateDetails.additionalCharges` — the shipment's actual
//     rate structure (mapRoutingOption passes it through verbatim, already
//     exposed on the VM; no mapper change needed).
//   - SPECIAL-SERVICE rows seed for any order.specialServices code NOT
//     already covered by the routing-charge set — still a real shipment
//     requirement, just no longer locked.
//   - CARRIER-ADDED rows come from "Add More", code picked off the shared
//     'charge-code' lookup (data/master-data.js CHARGE_CODES, §5.6), same
//     registry QuoteModal's own Additional Charges uses.
// A prior bid's accessorials rehydrate by code and WIN over both seed
// sources' amounts for a matching code; a prior-bid code covered by neither
// seed source still appends (returning-carrier edit isn't dropped).
// `shipment` loads asynchronously (react-query), so the seed can't be a lazy
// useState initializer (nothing to derive from at mount) — it's a one-shot
// effect gated by a ref, below.
//
// Page-scoped classes (`.carrier-bid-charges*`) — this page no longer
// borrows QuoteModal's `.quote-charges*` / `.quote-modal__*` BEM namespace
// (carrierBid.css); QuoteModal.jsx itself is untouched. No hand-rolled
// Code/Description/Amount header row either — each field carries its own
// accessible name via the component's own labelling API (ComboBox's
// showLabel doesn't wire a real `<label for>` in typeahead mode, a
// packages/ui gap this page works around with one real `<label>` per Code
// cell instead — see the row markup below).
// Bid countdown — standard Navbar center title (Task 10, replacing the
// sticky SummaryStrip instance from SPB-43 §2): the user ruling removed the
// SummaryStrip from the search slot in favor of the package Navbar's own
// center-title pattern, with Hours/Minutes/Seconds labels stacked below
// each value, values separated by ':'. The old SummaryStrip's fourth cell
// (the "Bid Open" status badge) no longer lives inside this component at
// all — it's rendered by the parent, INSIDE the search slot alongside this
// title (see `.carrier-bid-countdown-wrap` / `.carrier-bid-status-float` in
// CarrierBid() below) so its horizontal center tracks the title's own
// center rather than the whole navbar's (round 2 fix, 2026-08-20/21): the
// navbar's lead/trail slots aren't equal width, so a badge centered on the
// FULL bar drifts off the title's actual center. Nesting it in the same
// flex item as the title — both plain blocks that stretch to the search
// slot's width — means the title's own `justify-content: center` and the
// badge's `left: 50%` resolve to the identical pixel, without any JS
// measuring.
//
// The 4xl→lg scroll-shrink behavior is PRESERVED (user ruling): each
// value/separator carries the same `--compact` trigger class the old
// `.summary-strip__value--display` override used, just retargeted at this
// component's own `__value`/`__sep` classes (carrierBid.css).
//
// Reuses Countdown's own tick hook (useCountdown) rather than a second
// interval — exported so this component is unit-testable without the
// parent's closedReason gate.
//
// Hours cell resolves the old ">99 minutes" question — formatHMS gives
// minutes a real hour bucket to overflow into, so it never grows past 2
// digits itself. Hours is a floor not a ceiling (a >99-hour window just
// grows past 2 digits), same as minutes used to be.
//
// Closed/expired: `quote.status !== 'open' || isExpired` already routes the
// whole page to the Alert-only closedReason branch above, so this component
// only ever mounts for an open, unexpired quote — EXCEPT for the one tick
// where its own interval reaches 0 before that parent re-render lands. Guard
// that transient window the same way Countdown itself does: swap the H/M/S
// unit trio for a single "Closed" title rather than rendering stale/negative
// time. No urgent treatment for it — closed is terminal, not urgent.
//
// Color follows the SHARED SpotBid ramp (countdownTone — blue >30% of the
// window, amber 30→10%, red under 10%), the same one the Live Bids strip
// badge and the award dialog use, so the carrier and the planner never see
// the same quote at different urgencies (user, 2026-08-24). `openAt` is what
// makes it a real percentage rather than the absolute fallback.
export function BidCountdownTitle({ closeAt, openAt, onExpire }) {
  const remaining = useCountdown(closeAt, onExpire)
  const expired = remaining <= 0
  const tone = countdownTone(remaining, openAt ? closeAt - openAt : 0)
  const { hh, mm, ss } = formatHMS(remaining)

  if (expired) return <div className="carrier-bid-countdown-title" role="timer">Closed</div>

  return (
    <div
      className={`carrier-bid-countdown-title carrier-bid-countdown-title--${tone}`}
      role="timer"
      aria-label={`Bid closes in ${hh}:${mm}:${ss}`}
    >
      {[['Hours', hh], ['Minutes', mm], ['Seconds', ss]].map(([label, v], i) => (
        <Fragment key={label}>
          {i > 0 && <span className="carrier-bid-countdown-title__sep" aria-hidden="true">:</span>}
          <span className="carrier-bid-countdown-title__unit">
            <span className="carrier-bid-countdown-title__value">{v}</span>
            <span className="carrier-bid-countdown-title__label">{label}</span>
          </span>
        </Fragment>
      ))}
    </div>
  )
}

// The floating status badge under the countdown title. Its own hook, not a
// render-time Date.now(): the tone has to re-evaluate every tick, and a bare
// expression in the parent's JSX would freeze at whatever the last render
// computed. Tracks the SAME ramp as the title above it (user, 2026-08-24) —
// one quote, one urgency, whichever surface you read it on.
function BidStatusBadge({ closeAt, openAt }) {
  const remaining = useCountdown(closeAt)
  const tone = countdownTone(remaining, openAt ? closeAt - openAt : 0)
  return <Badge variant={tone} statusDot>{remaining > 0 ? 'Bid Open' : 'Bid Closed'}</Badge>
}

// Standalone external carrier page — reached via an unauthenticated token link
// (no login), so it renders NOTHING from AppShell: no sidebar, no app-chrome
// Navbar, no nav landmark at all (SpotBoard canon: carriers see only their
// own lane). Both branches (open-bid and closed/expired/invalid) render the
// same PACKAGE Navbar, in context="external" — Figma's purpose-built white
// gradient+blur variant for external landing pages (5152:3904), not
// AppShell's internal chrome — see `bidNavbar` below, built once and reused
// by both returns. Only the `search` slot differs: the open branch shows the
// live countdown, closed/expired/invalid keeps the static "Carrier Portal"
// title (nothing left to count down to).
export default function CarrierBid() {
  const { token } = useParams()
  const decoded = useMemo(() => decodeToken(token), [token])
  const shipmentId = decoded?.shipmentId ?? null
  const scac = decoded?.scac ?? null

  const [quote, setQuote] = useState(() => (shipmentId ? getQuote(shipmentId) : null))
  // Gates the closedReason "no longer available" flash below — true
  // immediately in mock mode (nothing to wait for), flips true once the live
  // hydrate SETTLES (success or failure; see the effect's .finally).
  const [hydrated, setHydrated] = useState(() => getApiMode() !== 'live')
  const { data: shipment, isLoading } = useShipmentDetail(shipmentId)

  // A carrier opening this token link in a FRESH browser has empty
  // localStorage — the DB (spot-service) is the only place the quote lives.
  // live mode only (no-op in mock/tests — see getApiMode/hydrateQuote).
  useEffect(() => {
    if (!shipmentId || getApiMode() !== 'live') return
    let cancelled = false
    hydrateQuote(shipmentId)
      .then((q) => { if (!cancelled) setQuote(q) })
      .catch(() => {
        // ponytail: swallow — a failed hydrate leaves the local-cache view
        // on screen (degraded, not blanked); no retry machinery.
      })
      .finally(() => { if (!cancelled) setHydrated(true) })
    return () => { cancelled = true }
  }, [shipmentId])

  // Same preload/decode-gating idiom as Home (routes/Home.jsx) — hold the
  // section entrance invisible until the FIRST hero image has decoded, so
  // sections never animate in over a still-blank background. Only the
  // initial image is gated here; the rotation hook below reads `bgLoaded`
  // to know when it's safe to start its own interval.
  const [bgLoaded, setBgLoaded] = useState(() => {
    if (typeof Image === 'undefined') return true
    const img = new Image()
    img.src = HERO_SRC
    return img.complete // cached → true synchronously, skip the waiting state entirely
  })
  useEffect(() => {
    if (bgLoaded) return
    const img = new Image()
    img.src = HERO_SRC
    if (img.complete) {
      setBgLoaded(true)
      return
    }
    const onDone = () => setBgLoaded(true)
    img.addEventListener('load', onDone)
    img.addEventListener('error', onDone) // don't strand the page on a 404
    const fallback = setTimeout(onDone, 1500) // never block sections longer than 1.5s
    return () => {
      img.removeEventListener('load', onDone)
      img.removeEventListener('error', onDone)
      clearTimeout(fallback)
    }
  }, [])
  const sectionEnterClass = bgLoaded ? 'hero-enter' : 'hero-enter-waiting'

  // Hero photo rotation (§change-2) — shared with Home via useHeroRotation.
  // respectReducedMotion: true skips starting the interval entirely for a
  // prefers-reduced-motion visitor (Home doesn't gate this — see the hook's
  // own doc comment for why that's a deliberate, pre-existing gap left
  // alone rather than "fixed" here for both pages).
  const heroIndex = useHeroRotation(HERO_INITIAL_INDEX, { bgLoaded, respectReducedMotion: true, images: HERO_IMAGES_LAND })

  // Profile dropdown, anchored via the package Navbar's `trailRef` slot — same
  // idiom as apps/odyssey-one/src/components/layout/Navbar.jsx (the app's own
  // internal chrome), copied rather than reinvented. TrailNav renders no
  // dropdown of its own; the consumer builds the panel.
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef(null)
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false)
      }
    }
    if (profileDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileDropdownOpen])

  // Scroll-shrink experiment (carrierBid.css) — past 20px scroll, the
  // countdown bar's H/M/S cells shrink (see the CSS for the size/motion
  // detail). Strict `> 20` check, no hysteresis — nothing in this page
  // sits close enough to that boundary for flapping to be visible. `last`
  // closes over the effect (not `scrolled`, which would need it in the
  // dep array and re-subscribe the listener every toggle) so setState only
  // fires when the class actually needs to flip, not on every scroll tick.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    let last = false
    function onScroll() {
      const next = window.scrollY > 20
      if (next !== last) {
        last = next
        setScrolled(next)
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const carrier = quote?.carriers.find((c) => c.scac === scac) ?? null
  const priorBid = carrier?.bid?.status === 'bid' ? carrier.bid : null
  const declined = carrier?.bid?.status === 'declined'
  // Confirmed-declined-with-no-bid-yet — same gate as the existing
  // post-decline note below (`declined && !priorBid`), reused rather than a
  // separate flag so the two stay coherent. Reads straight off the store
  // (quote.carriers[].bid.status), so a RETURNING declined carrier sees this
  // too, not just the one that just clicked through the dialog. The store's
  // bid is a single object with one status — submitBid overwrites it to
  // 'bid', so this naturally flips back to false (and Decline re-enables) on
  // its own once a bid lands; no separate reset needed.
  const declinedNoBid = declined && !priorBid

  // Confirmation dialog — Submit/Update Bid AND Decline (user asks, same
  // idiom both times: "we need a dialog confirmation"). One shared
  // 'submit' | 'decline' | null state rather than a second boolean — the two
  // triggers are mutually exclusive by construction, so a single value is
  // the smaller diff. Declared here, above the closedReason early return
  // below, so the hook count stays constant across renders (Rules of Hooks).
  const [confirmAction, setConfirmAction] = useState(null)
  // Bid Now once declined-with-no-bid (user ask) — dialog title tracks this
  // same label (see the ModalMedium title below), so Decline/Bid Now/Update
  // Bid all stay in sync off this one string.
  const confirmTitle = declinedNoBid ? 'Bid Now' : (priorBid ? 'Update Bid' : 'Submit Bid')

  // Carrier identity for the TrailNav profile — SCAC on top (prominent),
  // full carrier name on the second line (Figma External variant 5152:3904:
  // "KNGT" over "KNIGHT-SWIFT TRANSPORTATION"). carrier.name resolves from
  // the quote's carrier row (already looked up above); falls back to the
  // bare SCAC if the full name isn't available yet (e.g. before the quote
  // loads), so the second line is never empty.
  const carrierFullName = carrier?.name ?? scac ?? ''

  // TrailNav + its profile dropdown — factored out so both the real Navbar
  // (closedReason branch) and the countdown-bar experiment below (open-bid
  // branch) render the exact same markup off the exact same
  // profileDropdownOpen/profileDropdownRef state, without duplicating the
  // dropdown JSX. Safe to share: the two branches are mutually exclusive
  // early-returns, so only one of them is ever mounted at a time — no
  // double-mount, no ref collision.
  const trailContent = (
    <>
      <TrailNav
        name={scac ?? ''}
        role={carrierFullName}
        avatar={
          <div className="carrier-bid-avatar" aria-hidden="true">
            {carrierInitials(carrier?.name, scac)}
          </div>
        }
        showBell={false}
        showCustomers={false}
        dropdownOpen={profileDropdownOpen}
        onProfileClick={() => setProfileDropdownOpen((open) => !open)}
      />
      {profileDropdownOpen && (
        <div
          className="carrier-bid-page__profile-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            width: 220,
            background: 'var(--dropdown-bg)',
            border: '1px solid var(--dropdown-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 9999,
            padding: 'var(--spacing-3)',
          }}
        >
          <p className="text-label-sm-regular" style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Soon, your operations in ONE place
          </p>
        </div>
      )}
    </>
  )

  const order = shipment?.orderDetails?.[0] ?? null
  // Read twice off the same array: the read-only Shipment Detail card below
  // ("Special Services" TitleSubtitle) AND the Additional Charges seed
  // effect further down (order.specialServices → derived charge rows) —
  // kept as its own const here only for the TitleSubtitle read; the effect
  // reads `order.specialServices` directly rather than through this alias
  // since it also needs `order` itself as its gate.
  const services = order?.specialServices ?? []

  const [linehaulValue, setLinehaulValue] = useState(() => String(priorBid?.linehaul ?? ''))
  // Base-rate validation (SPB-65): required and > 0. The error message only
  // shows once the carrier has LEFT the field (touched) — no red flash on a
  // pristine form — but the Submit button gates on validity from the start.
  const [linehaulTouched, setLinehaulTouched] = useState(() => priorBid?.linehaul != null)
  // Bid-level currency (SPB-66) — one selector for the whole bid.
  const [currency, setCurrency] = useState(() => priorBid?.currency ?? 'USD')
  // %-of-linehaul fuel resolves ON BLUR of the base rate field (SPB-64), so
  // the resolved amount is state, not a render-time derivation — it must NOT
  // move while the carrier is still typing. A returning carrier's prior bid
  // already carries its resolved fuel.
  const [resolvedPctFuel, setResolvedPctFuel] = useState(() => priorBid?.fuel ?? null)
  // Additional Charges rows — `shipment` (and therefore order.specialServices)
  // isn't available at mount, so this can't be a lazy useState initializer
  // like `linehaulValue` above (priorBid IS available synchronously off
  // spotStore). Seeded once, gated by `chargeRowsSeeded` rather than an
  // empty-array check, so a carrier who deletes every carrier-added row back
  // down to zero doesn't get silently re-seeded on the next render.
  const [chargeRows, setChargeRows] = useState([])
  const chargeRowsSeeded = useRef(false)
  useEffect(() => {
    if (!order || chargeRowsSeeded.current) return
    chargeRowsSeeded.current = true
    // A prior bid's accessorials (submitted under this same wire shape,
    // handleSubmit below) rehydrate by code and WIN over either seed
    // source's amount for a matching code.
    const priorByCode = Object.fromEntries((priorBid?.accessorials ?? []).map((a) => [a.code, a.amount]))

    // Routing-charge seed — the shipment's real rate structure. Options are
    // rank-ordered; the first one carrying any additionalCharges is the
    // representative set (bug fix: these were never shown to the carrier at
    // all before this change).
    const routingCharges = (shipment?.routingData?.options ?? [])
      .map((o) => o.rateDetails?.additionalCharges ?? [])
      .find((charges) => charges.length > 0) ?? []
    // FSC is never SEEDED into Additional Charges anymore (SPB-64): fuel is
    // either a configured read-only element beneath Linehaul, or — when no
    // schedule is configured — something the carrier adds manually via Add
    // More (today's TMS behavior). Kathleen's conditional reads ambiguously
    // (recorded verbatim in SPB-64); never-seed satisfies both readings.
    const chargeRowsSeed = routingCharges.filter((c) => c.code !== 'FSC').map((c) => ({
      code: c.code,
      description: c.description,
      amount: priorByCode[c.code] != null ? String(priorByCode[c.code]) : String(c.amount),
    }))
    const seededCodes = new Set(chargeRowsSeed.map((r) => r.code))

    // Special-service seed — any service code not already covered by the
    // routing-charge set above (amount blank unless a prior bid covers it).
    const serviceRows = (order.specialServices ?? [])
      .filter((s) => !seededCodes.has(s.code))
      .map((s) => ({
        code: s.code,
        description: s.desc,
        amount: priorByCode[s.code] != null ? String(priorByCode[s.code]) : '',
      }))
    const coveredCodes = new Set([...seededCodes, ...serviceRows.map((r) => r.code)])

    // Any prior-bid code neither seed source covers still appends, so a
    // returning "Update Bid" visit doesn't drop a charge the carrier typed
    // in themselves.
    const freeRows = (priorBid?.accessorials ?? [])
      .filter((a) => !coveredCodes.has(a.code))
      .map((a) => ({ code: a.code, description: a.description, amount: String(a.amount) }))

    setChargeRows([...chargeRowsSeed, ...serviceRows, ...freeRows])
  }, [order, shipment, priorBid])

  const isExpired = !!quote?.closeAt && Date.now() > quote.closeAt
  let closedReason = null
  if (!decoded) closedReason = 'This link is invalid.'
  else if (!quote) closedReason = 'This quote is no longer available.'
  else if (!carrier) closedReason = 'This link is invalid.'
  // Forgery guard (defect 2 fix, token.js): decodeToken alone can't tell a
  // forged token (correct shipmentId/scac, wrong nonce) from the real one
  // minted onto this carrier's row — anyone who knows the pair can build a
  // well-shaped token that decodes cleanly. The raw URL token must
  // string-match carrier.token (minted once at draft->open, spotStore.sendRFQ)
  // or the link is treated exactly like a malformed one.
  else if (carrier.token !== token) closedReason = 'This link is invalid.'
  else if (quote.status !== 'open' || isExpired) closedReason = 'This bidding window has closed.'

  // Live-mode flash guard: a fresh browser's FIRST render has no local quote
  // yet (empty localStorage), which would otherwise flash "no longer
  // available" for the one round-trip before hydrateQuote settles above.
  // Only the `!quote` branch is time-sensitive this way — !decoded is known
  // synchronously (bad/malformed token, nothing to fetch) and needs no gate;
  // !carrier/closed/expired can't be reached until a quote HAS loaded.
  const awaitingFirstHydration = decoded && !quote && !hydrated

  // package Navbar, context="external" (Figma 5152:3904) — logo-only lead,
  // carrier identity in the trail, no bell/customers. One definition shared
  // by both the closedReason early-return below and the open-bid return
  // further down — only `search` differs (static title vs. live countdown).
  // Wrapped in `.carrier-bid-navbar-wrap` (carrierBid.css) for sticky
  // positioning only: the gradient + backdrop blur now live ON the Navbar
  // itself (packages/ui/src/Navbar.jsx / components.css, Job 1), so the
  // wrapper doesn't paint them a second time.
  const bidNavbar = (
    <div className={`carrier-bid-navbar-wrap${scrolled ? ' carrier-bid-navbar-wrap--compact' : ''}`}>
      <Navbar
        context="external"
        // LeadNav's `logo` is a plain composable slot (Code Connect resolves it
        // straight off the Figma instance, LeadNav.figma.tsx) — it doesn't
        // auto-swap for context. The default <OdysseyLogo /> is the light
        // variant built for dark surfaces (LeadNav's own demo copy), so the
        // white external bar needs the dark variant passed explicitly.
        lead={<LeadNav showMenu={false} logo={<OdysseyLogo variant="dark" />} />}
        search={
          closedReason
            ? <GlobalSearch mode="title" title="Carrier Portal" />
            : (
              // `.carrier-bid-countdown-wrap` is a plain relatively-positioned
              // div — no width of its own, so it stretches to the search
              // slot's width exactly like the title does, keeping the two in
              // the same coordinate space (see the doc comment on
              // BidCountdownTitle above). The badge is still visually
              // OUTSIDE the bar (carrierBid.css positions it below the
              // header's own bottom edge) even though it's now a DOM
              // descendant of the search slot.
              <div className="carrier-bid-countdown-wrap">
                <BidCountdownTitle closeAt={quote.closeAt} openAt={quote.openAt} onExpire={() => setQuote(getQuote(shipmentId))} />
                <div className="carrier-bid-status-float">
                  <BidStatusBadge closeAt={quote.closeAt} openAt={quote.openAt} />
                </div>
              </div>
            )
        }
        trailRef={profileDropdownRef}
        trail={trailContent}
      />
    </div>
  )

  if (closedReason) {
    return (
      <div className="carrier-bid-page">
        <HeroBackground heroIndex={heroIndex} />
        {bidNavbar}
        <main className="carrier-bid-page__main">
          {awaitingFirstHydration
            ? <p className="carrier-bid-page__loading text-label-sm-regular">Loading shipment details…</p>
            : <Alert variant="warning" showClose={false}>{closedReason}</Alert>}
        </main>
      </div>
    )
  }

  // ── Shipment detail (order[0] stands in for the shipment — SpotBoard lanes
  // are single-order in practice; a multi-order shipment would need a real
  // per-order picker, out of scope for v1). Instructions are read by the same
  // array position, never by orderId, so no order identifier is ever touched.
  // (order/services themselves moved above the closedReason return — see there.)
  const instructionsText = shipment
    ? (shipment.instructionsData.orders[0]?.instructions ?? []).map((i) => i.text).join(' ')
    : ''

  // Weight (SPB-43 §4) — stopsData.summary.grossWeight first, falling back to
  // the order's own totalWeight/grossWeight when the shipment-level summary
  // has none. Both are pre-formatted strings off the VM (e.g. "500 LB" or the
  // VM's own '--' dash) — no separate lb formatter to reinvent.
  const rawWeight = shipment?.stopsData?.summary?.grossWeight
  const weightDisplay = (rawWeight && rawWeight !== '--')
    ? rawWeight
    : (order?.totalWeight && order.totalWeight !== '--' ? order.totalWeight : (order?.grossWeight ?? '--'))

  // Distance (SPB-43 §4) — domain ruling: derived from origin/destination,
  // never empty. The VM only surfaces it off the current ACCEPTED/SENT tender
  // option (mapSellShipmentOutToDetail.ts's mapStops, LINX-12067) — no
  // header-level or geocoded fallback exists on the VM at all. Fall back to
  // any OTHER routing option that does carry a real distance before giving up.
  const rawDistance = shipment?.stopsData?.summary?.distance
  const fallbackDistance = shipment?.routingData?.options?.find((o) => o.distance && o.distance !== '--')?.distance
  // ponytail: genuine ceiling — a shipment with zero routing options has no
  // distance value anywhere on the VM (no coordinates, no header field
  // surfaced by the mapper). '--' here is the best available value, not a
  // fabricated one; upgrade when the VM exposes a header/geocoded fallback.
  const distanceDisplay = (rawDistance && rawDistance !== '--') ? rawDistance : (fallbackDistance ?? '--')

  const linehaulNum = Number(linehaulValue) || 0
  const linehaulInvalid = !(linehaulNum > 0)

  // ── Fuel (SPB-64): OCM fuel schedule per carrier — rate-per-mile resolves
  // immediately off the lane distance; %-of-linehaul resolves on base-rate
  // blur (resolvedPctFuel state above); no schedule → no fuel section at all.
  const fuelSchedule = getFuelSchedule(scac)
  const distanceMiles = parseFloat(String(distanceDisplay).replace(/[^\d.]/g, ''))
  const fuel = fuelSchedule?.type === 'perMile'
    ? computeFuel(fuelSchedule, { distanceMiles }) ?? 0
    : (resolvedPctFuel ?? null) // pct mode: null until the first base-rate blur
  // The fuel amount that actually counts toward totals / the submitted bid —
  // 0 while pct fuel is still unresolved or no schedule is configured.
  const effectiveFuel = fuelSchedule ? (fuel ?? 0) : 0
  const handleLinehaulBlur = () => {
    setLinehaulTouched(true)
    if (fuelSchedule?.type === 'pctLinehaul') {
      setResolvedPctFuel(linehaulNum > 0 ? computeFuel(fuelSchedule, { linehaul: linehaulNum }) : null)
    }
  }

  // Every typed amount counts toward the total regardless of whether its row
  // has a code yet — what the carrier sees add up IS what submits; the
  // accessorials filter below applies the same amount>0 rule, so the two
  // never disagree.
  const chargeTotal = chargeRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  const total = round2(linehaulNum + effectiveFuel + chargeTotal)

  const updateChargeRow = (idx, patch) =>
    setChargeRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  // Charge Description is auto-populated from the selected Charge Code's own
  // lookup option (same idiom as QuoteModal's setChargeCode) — never
  // re-derived locally.
  const setChargeCode = (idx, code, description) =>
    updateChargeRow(idx, { code: code ?? '', description: code ? (description ?? '') : '' })
  const addChargeRow = () =>
    setChargeRows((rows) => [...rows, { code: '', description: '', amount: '' }])
  const removeChargeRow = (idx) =>
    setChargeRows((rows) => rows.filter((_, i) => i !== idx))

  const handleSubmit = () => {
    // Wire shape stays `accessorials` — award.js/tolerance.js/LiveBids.jsx
    // already read that key as {code, description, amount}. A row the
    // carrier leaves blank is OMITTED rather than sent as a zero-amount line
    // — consistent with chargeTotal above, which already treats a blank the
    // same as absent (`Number('') || 0`).
    const accessorials = chargeRows
      .filter((r) => Number(r.amount) > 0)
      .map((r) => ({ code: r.code, description: r.description, amount: Number(r.amount) }))
    // `fuel` is the schedule-resolved amount (SPB-64) — 0 for an
    // unconfigured carrier, whose fuel (if any) rides in accessorials as a
    // manually-added charge. `currency` is bid-level (SPB-66).
    const bid = { linehaul: linehaulNum, fuel: effectiveFuel, accessorials, total, currency, submittedBy: carrier.name }
    setQuote(submitBid(shipmentId, scac, bid, Date.now()))
  }
  const handleDecline = () => {
    setQuote(declineBid(shipmentId, scac, Date.now()))
  }

  return (
    <div className="carrier-bid-page">
      <HeroBackground heroIndex={heroIndex} />
      {bidNavbar}

      <main className="carrier-bid-page__main">
      {isLoading || !order ? (
        <p className="carrier-bid-page__loading text-label-sm-regular">Loading shipment details…</p>
      ) : (
        <>
          {/* Entrance stagger (plan §3c) — each top-level section is wrapped
              (not the SubAccordion itself, which has no `style` prop and is
              a normalized @odyssey/ui component this task doesn't touch) so
              --enter-delay can be set inline. Strictly top-to-bottom,
              index * 90ms — no shuffle/jitter, unlike Home. */}
          <div className={sectionEnterClass} style={{ '--enter-delay': `${0 * ENTER_STEP_MS}ms` }}>
          <SubAccordion
            title={`Shipment Detail — Quote ${quote.quoteId}`}
            showIcon={false}
            defaultExpanded
          >
            {/* Descriptive values, not blocked form fields — TitleSubtitle pairs
                (value as title, label as subtitle), same idiom as OrderPaneSections'
                General Information card and the S112 Tender quote Rate Details
                rebuild. Never renders shipmentId/orderId (SPB-05: no Load ID on
                the carrier-facing page) — every field below already existed as a
                display-only value before this conversion. */}
            <div className="carrier-bid-card__grid carrier-bid-card__grid--pairs">
              <TitleSubtitle title={order.shipFrom.company} subtitle="Shipper" className="carrier-bid-card__grid-full" />
              <TitleSubtitle title={order.shipFrom.location} subtitle="Origin" />
              <TitleSubtitle title={order.shipTo.location} subtitle="Destination" />
              {/* Flexible badge (Quote Setup task) — quote.flexiblePickup,
                  persisted by SetupCarriers' saveDraft, surfaces beside both
                  Pickup and Delivery once checked. Grouping div keeps each
                  pair in the same grid--pairs cell the bare TitleSubtitle
                  used to occupy — grid placement is unchanged. */}
              <div className="carrier-bid-card__date-group">
                <TitleSubtitle title={order.earliestPickup} subtitle="Pickup" />
                {quote.flexiblePickup && <Badge variant="blue">Flexible</Badge>}
              </div>
              <div className="carrier-bid-card__date-group">
                <TitleSubtitle title={order.earliestDelivery} subtitle="Delivery" />
                {quote.flexiblePickup && <Badge variant="blue">Flexible</Badge>}
              </div>
              <TitleSubtitle title={String(shipment.stopsData.stops.length)} subtitle="Stops" />
              <TitleSubtitle title={distanceDisplay} subtitle="Distance" />
              <TitleSubtitle title={weightDisplay} subtitle="Weight" />
              <TitleSubtitle title={order.equipment} subtitle="Equipment" />
              <div className="carrier-bid-card__hazmat-group">
                {/* "Yes" is redundant once the MSDS link is shown (user ruling,
                    2026-08-19) — value text is dropped for the hazmat case,
                    label stays so the field is still identifiable. */}
                <TitleSubtitle title={order.hazmat === 'Yes' ? '' : order.hazmat} subtitle="Hazmat" />
                {order.hazmat === 'Yes' && (
                  // ponytail: no MSDS document URL exists on the VM — stub link,
                  // flagged for a real source when one is available.
                  <a
                    className="carrier-bid-card__msds text-label-sm-regular"
                    href="#msds"
                    onClick={(e) => e.preventDefault()}
                  >
                    MSDS
                  </a>
                )}
              </div>
              {/* Paired with Hazmat (user ruling, 2026-08-18) — moved out of
                  carrier-bid-card__grid-full so it shares Hazmat's row instead
                  of forcing its own; TitleSubtitle wraps rather than truncates
                  (packages/ui/src/TitleSubtitle.jsx), so a long services list
                  still degrades fine at half width, and the base flex-column
                  layout below 640px stacks both exactly as before. */}
              <TitleSubtitle title={services.length ? services.map((s) => s.desc).join(', ') : '--'} subtitle="Special Services" />
              <TitleSubtitle title={instructionsText || '--'} subtitle="Instructions" className="carrier-bid-card__grid-full" />
            </div>
          </SubAccordion>
          </div>

          <div className={sectionEnterClass} style={{ '--enter-delay': `${1 * ENTER_STEP_MS}ms` }}>
          <SubAccordion title="Your Bid" showIcon={false} defaultExpanded>
            <div className="carrier-bid-card__grid">
              <section className="carrier-bid-bid__section">
                <h3 className="text-label-base-semibold carrier-bid-bid__section-title">Base Charge</h3>
                <div className="carrier-bid-card__grid">
                  {/* ONE currency for the whole bid (SPB-66) — set from the
                      Linehaul field's OWN trailing UoM button (no separate
                      currency field: MeasureField already carries the
                      selector, and Base Charge is the bid-level anchor).
                      Every other amount field echoes it read-only via a
                      single-option list, so the lines can never diverge. */}
                  <MeasureField
                    id="cb-linehaul"
                    showLabel
                    label="Linehaul"
                    value={{ value: linehaulValue, uom: currency }}
                    options={CURRENCY_OPTIONS}
                    decimals={2}
                    onChange={(v) => { setLinehaulValue(v.value); setCurrency(v.uom) }}
                    onBlur={handleLinehaulBlur}
                    // Required and > 0 (SPB-65) — message appears once the
                    // field has been left; Submit gates on it regardless.
                    error={linehaulTouched && linehaulInvalid ? 'A base rate greater than zero is required.' : undefined}
                  />
                  {/* Fuel (SPB-64) — read-only element directly beneath
                      Linehaul, three states: resolved (per-mile, or % after
                      base-rate blur), pending (% before blur), absent (no
                      OCM fuel schedule configured — the whole field is gone;
                      the carrier may add fuel manually in Additional
                      Charges, which is why FSC stays in the charge-code
                      lookup only for unconfigured carriers). */}
                  {fuelSchedule && (
                    <div>
                      <FormField
                        id="cb-fuel"
                        label="Fuel"
                        value={fuel != null ? fmtDollar(fuel) : '—'}
                        disabled
                      />
                      <p className="carrier-bid-fuel__basis text-label-xs-regular">
                        {fuelSchedule.type === 'perMile'
                          ? `${fmtDollar(fuelSchedule.rate)}/mi × ${distanceDisplay}`
                          : `${fuelSchedule.pct}% of linehaul${fuel == null ? ' — calculated when you leave the base rate field' : ''}`}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="carrier-bid-bid__section">
                <h3 className="text-label-base-semibold carrier-bid-bid__section-title">Additional Charges</h3>
                {chargeRows.length === 0 ? (
                  <p className="text-label-sm-regular carrier-bid-charges__empty">No additional charges.</p>
                ) : (
                  <div className="carrier-bid-charges">
                    {chargeRows.map((row, idx) => (
                      <div key={idx} className="carrier-bid-charges__row">
                        <div>
                          {/* Real <label for>, not ComboBox's own `showLabel` —
                              that renders a bare <span> with no htmlFor in
                              typeahead mode (packages/ui gap, not touched
                              here), so it never gives the input an
                              accessible name. Reuses FormField's own label
                              classes for visual parity with the other two
                              cells rather than inventing a page-local one. */}
                          <label htmlFor={`cb-charge-${idx}-code`} className="form-field__label text-label-sm-medium">
                            Code
                          </label>
                          <ComboBox
                            id={`cb-charge-${idx}-code`}
                            variant="select"
                            showLabel={false}
                            placeholder="--"
                            // FSC is offerable ONLY when no fuel schedule is
                            // configured (SPB-64): configured fuel already
                            // renders as the read-only element above, so a
                            // manual FSC line would double-count it.
                            loadOptions={(q) => Promise.resolve(getLookupOptions('charge-code', q)).then(
                              (opts) => (fuelSchedule ? opts.filter((o) => o.value !== 'FSC') : opts)
                            )}
                            emptyMessage={(q) => (q.trim().length === 1 ? 'Type at least 2 characters' : 'No matching charge codes')}
                            value={row.code}
                            onSelect={(v, opt) => setChargeCode(idx, v, opt?.description)}
                          />
                        </div>
                        <FormField
                          id={`cb-charge-${idx}-description`}
                          showLabel
                          label="Description"
                          value={row.description}
                          disabled
                        />
                        <MeasureField
                          id={`cb-charge-${idx}-amount`}
                          showLabel
                          label="Amount"
                          /* Money — 2, same as Base Charge above. Was 6
                             (copied from QuoteModal's LINX-13895 reading),
                             which `decimals` PADS to, so every entry blurred
                             to "150.000000". */
                          decimals={2}
                          /* trailing edge echoes the BID-LEVEL currency
                             (SPB-66) — no per-line choice. The single-option
                             list makes MeasureField render the edge LOCKED
                             (no chevron, no button) — Base Charge drives it. */
                          value={{ value: row.amount, uom: currency }}
                          options={[{ value: currency, label: currency }]}
                          onChange={(v) => updateChargeRow(idx, { amount: v.value })}
                        />
                        {/* Plain icon affordance, never a Button (row-action
                            convention) — same as QuoteModal's own remove.
                            Every row is deletable now (the `derived` lock
                            that disabled this for a shipment's own required
                            accessorials is retired — see the section doc
                            comment above). */}
                        <button
                          type="button"
                          className="carrier-bid-charges__remove"
                          aria-label={`Remove charge ${idx + 1}`}
                          onClick={() => removeChargeRow(idx)}
                        >
                          <Trash2 size={20} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Button variant="link" icon={<Plus size={16} />} onClick={addChargeRow}>
                  Add More
                </Button>
              </section>
            </div>

            {priorBid && (
              <p className="carrier-bid-page__last-submitted text-label-sm-regular">
                Last submitted: {fmtDollar(priorBid.total)} by {priorBid.submittedBy} · {formatDateTimeMDYHM(new Date(priorBid.respondedAt))}
              </p>
            )}
            {declinedNoBid && (
              <p className="carrier-bid-page__note text-label-sm-regular">
                You declined this quote. You can still submit a bid while this window is open.
              </p>
            )}
          </SubAccordion>
          </div>

          <div className={sectionEnterClass} style={{ '--enter-delay': `${2 * ENTER_STEP_MS}ms` }}>
          <SubAccordion title="Summary" showIcon={false} defaultExpanded>
            {/* Modeled on QuoteModal's local SummaryCard (now exported for
                reuse) — no markup line: QMU is Odyssey-side, applied after
                award, and carriers never see it (SPB-15). */}
            <div className="carrier-bid-card__grid">
              <SummaryCard
                title="Base Charge"
                // Fuel row exists only when a schedule is configured
                // (SPB-64) — an unconfigured carrier's fuel (if any) sits in
                // Additional Charges as a manually-added line. Unresolved %
                // fuel counts as 0 until the base-rate blur resolves it.
                rows={fuelSchedule ? [['Linehaul', linehaulNum], ['Fuel', effectiveFuel]] : [['Linehaul', linehaulNum]]}
                total={round2(linehaulNum + effectiveFuel)}
              />
              <SummaryCard
                title="Additional Charges"
                rows={chargeRows
                  .filter((r) => Number(r.amount) > 0)
                  .map((r) => [r.code, Number(r.amount)])}
                total={chargeTotal}
              />
              <div className="carrier-bid-total carrier-bid-total--grand text-label-base-semibold">
                <span>Grand Total</span>
                <span>{fmtDollar(total)}</span>
              </div>
              {/* Decline/Submit moved into this section's foot, below the
                  grand total (was its own row under "Your Bid") — the
                  carrier's final decision sits right under the number it's
                  a decision about. */}
              <div className="carrier-bid-page__actions">
                <Button variant="secondary" size="lg" disabled={declinedNoBid} onClick={() => setConfirmAction('decline')}>
                  {declinedNoBid ? 'Declined' : 'Decline'}
                </Button>
                {/* Gated on a valid base rate (SPB-65) — the field-level
                    error above explains the disabled state once touched. */}
                <Button variant="primary" size="lg" disabled={linehaulInvalid} onClick={() => setConfirmAction('submit')}>
                  {confirmTitle}
                </Button>
              </div>
            </div>
          </SubAccordion>
          </div>
        </>
      )}
      </main>

      {confirmAction && createPortal(
        <ModalMedium
          title={confirmAction === 'decline' ? 'Decline Bid' : confirmTitle}
          onClose={() => setConfirmAction(null)}
          footer={
            <>
              <Button variant="secondary" size="lg" onClick={() => setConfirmAction(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  setConfirmAction(null)
                  if (confirmAction === 'decline') handleDecline()
                  else handleSubmit()
                }}
              >
                {confirmAction === 'decline' ? 'Confirm Decline' : 'Confirm & Submit'}
              </Button>
            </>
          }
        >
          {confirmAction === 'decline' ? (
            // Copy aligned with the existing post-decline note below (same
            // "you can still submit a bid while this window is open" idea).
            <p className="text-label-sm-regular">
              Declining tells the shipper you are passing on this load. While the
              bidding window is open you can still change your mind and submit or
              update a bid at any time.
            </p>
          ) : (
            <>
              <div className="carrier-bid-card__grid carrier-bid-card__grid--pairs">
                <TitleSubtitle subtitle="Base Charge" title={fmtDollar(round2(linehaulNum + effectiveFuel))} />
                <TitleSubtitle subtitle="Additional Charges" title={fmtDollar(chargeTotal)} />
              </div>
              <div className="carrier-bid-total carrier-bid-total--grand text-label-base-semibold">
                <span>Grand Total</span>
                <span>{fmtDollar(total)}</span>
              </div>
            </>
          )}
        </ModalMedium>,
        document.body
      )}
    </div>
  )
}
