import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import { Trash2, Plus } from 'lucide-react'
import { Navbar, LeadNav, GlobalSearch, TrailNav, OdysseyLogo, Button, Alert, Badge, ComboBox, FormField, SubAccordion, TitleSubtitle, ModalMedium } from '@odyssey/ui'
import MeasureField from '../components/orders/create/fields/MeasureField.jsx'
import { SummaryCard } from '../components/detail/QuoteModal.jsx'
import { decodeToken } from '../spotboard/token.js'
import { getQuote, submitBid, declineBid, hydrateQuote } from '../spotboard/spotStore.js'
import { getApiMode } from '../api/config'
import { useCountdown, formatHMS, URGENT_MS } from '../spotboard/Countdown.jsx'
import { useShipmentDetail } from '../api/queries/useShipmentDetail'
import { getLookupOptions } from '../api/services/lookupService'
import { parseDollar, fmtDollar } from '../utils/money'
import { formatDateTimeMDYHM } from '../lib/dates.js'
import { HERO_IMAGES, heroPosition } from '../heroImages'
import { useHeroRotation } from '../hooks/useHeroRotation'
import './carrierBid.css'

const USD_OPTIONS = [{ value: 'USD', label: 'USD' }]
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
// useHeroRotation hook (cross-fade through HERO_IMAGES every
// HERO_ROTATE_MS) — see the heroIndex hook call in CarrierBid() below.
// ponytail: a per-shipment hash would pin a different starting photo per
// carrier, but nothing in the plan asks for it — upgrade if wanted.
const HERO_INITIAL_INDEX = 0
const HERO_SRC = HERO_IMAGES[HERO_INITIAL_INDEX]
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
// styles/hero.css. Cross-fades through HERO_IMAGES via the shared
// useHeroRotation hook (§change-2): one stacked photo div per image, only
// the active index opaque, same mechanism as Home. Rendered identically in
// both the closed/expired branch and the active-bid branch below, so it's
// a shared component rather than duplicated JSX.
function HeroBackground({ heroIndex }) {
  return (
    <div className="carrier-bid-page__bg hero-bg hero-bg--flipped" aria-hidden="true">
      {HERO_IMAGES.map((src, i) => (
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
// (disabled)/MeasureField trio, same plain-Trash2 remove + "Add Row" link
// button). Two row origins, both `{ code, description, amount, derived }`:
//   - DERIVED rows seed once from order.specialServices (the shipment's own
//     required accessorials) — code ComboBox preselected+disabled,
//     Description disabled, remove disabled ("required for this shipment").
//     Amount stays editable: the service is mandatory, its dollar figure
//     isn't.
//   - CARRIER-ADDED rows come from "Add Row", fully editable, code picked off
//     the shared 'charge-code' lookup (data/master-data.js CHARGE_CODES,
//     §5.6), same registry QuoteModal's own Additional Charges uses.
// `shipment` loads asynchronously (react-query), so the derived seed can't be
// a lazy useState initializer (nothing to derive from at mount) — it's a
// one-shot effect gated by a ref, below.
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
export function BidCountdownTitle({ closeAt, onExpire }) {
  const remaining = useCountdown(closeAt, onExpire)
  const expired = remaining <= 0
  const urgent = !expired && remaining < URGENT_MS
  const { hh, mm, ss } = formatHMS(remaining)

  if (expired) return <div className="carrier-bid-countdown-title" role="timer">Closed</div>

  return (
    <div
      className={`carrier-bid-countdown-title${urgent ? ' carrier-bid-countdown-title--urgent' : ''}`}
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
  const heroIndex = useHeroRotation(HERO_INITIAL_INDEX, { bgLoaded, respectReducedMotion: true })

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

  // Submit/Update Bid confirmation (user ask: "we need a dialog confirmation
  // in submit and update bid") — declared here, above the closedReason early
  // return below, so the hook count stays constant across renders (Rules of
  // Hooks). Title tracks the trigger button's own label (Submit Bid vs
  // Update Bid).
  const [confirmOpen, setConfirmOpen] = useState(false)
  const confirmTitle = priorBid ? 'Update Bid' : 'Submit Bid'

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
    // handleSubmit below) rehydrate by matching code — derived rows first
    // (their amount, if any, from that prior submission), then any
    // remaining prior charges that AREN'T one of this shipment's special
    // services become carrier-added rows, so a returning "Update Bid" visit
    // doesn't drop a charge the carrier typed in themselves.
    const priorByCode = Object.fromEntries((priorBid?.accessorials ?? []).map((a) => [a.code, a.amount]))
    const derivedRows = (order.specialServices ?? []).map((s) => ({
      code: s.code,
      description: s.desc,
      amount: priorByCode[s.code] != null ? String(priorByCode[s.code]) : '',
      derived: true,
    }))
    const derivedCodes = new Set(derivedRows.map((r) => r.code))
    const freeRows = (priorBid?.accessorials ?? [])
      .filter((a) => !derivedCodes.has(a.code))
      .map((a) => ({ code: a.code, description: a.description, amount: String(a.amount), derived: false }))
    setChargeRows([...derivedRows, ...freeRows])
  }, [order, priorBid])

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
                <BidCountdownTitle closeAt={quote.closeAt} onExpire={() => setQuote(getQuote(shipmentId))} />
                <div className="carrier-bid-status-float">
                  <Badge variant="green" statusDot>Bid Open</Badge>
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
  // ponytail: the VM has no per-carrier fuel figure at bid time — stand in
  // with the shipment's own AP fuel amount ("precalculated") rather than
  // inventing a number. Flagged for Jana/David: real fuel-index source TBD.
  const fuel = shipment ? parseDollar(shipment.costData.planned.summary.fuel) ?? 0 : 0
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
  // Every typed amount counts toward the total regardless of whether its row
  // has a code yet — what the carrier sees add up IS what submits; the
  // accessorials filter below applies the same amount>0 rule, so the two
  // never disagree.
  const chargeTotal = chargeRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  const total = round2(linehaulNum + fuel + chargeTotal)

  const updateChargeRow = (idx, patch) =>
    setChargeRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  // Charge Description is auto-populated from the selected Charge Code's own
  // lookup option (same idiom as QuoteModal's setChargeCode) — never
  // re-derived locally.
  const setChargeCode = (idx, code, description) =>
    updateChargeRow(idx, { code: code ?? '', description: code ? (description ?? '') : '' })
  const addChargeRow = () =>
    setChargeRows((rows) => [...rows, { code: '', description: '', amount: '', derived: false }])
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
    const bid = { linehaul: linehaulNum, fuel, accessorials, total, submittedBy: carrier.name }
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
                  <MeasureField
                    id="cb-linehaul"
                    showLabel
                    label="Linehaul"
                    value={{ value: linehaulValue, uom: 'USD' }}
                    options={USD_OPTIONS}
                    decimals={2}
                    onChange={(v) => setLinehaulValue(v.value)}
                  />
                  {/* disabled, not readOnly — same ruling already applied to
                      SpotBidDetailRoute's own Fuel field (spotboard/spotbid/
                      SpotBidDetailRoute.jsx). */}
                  <FormField id="cb-fuel" label="Fuel (Estimated)" value={fmtDollar(fuel)} disabled />
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
                            loadOptions={(q) => getLookupOptions('charge-code', q)}
                            emptyMessage={(q) => (q.trim().length === 1 ? 'Type at least 2 characters' : 'No matching charge codes')}
                            value={row.code}
                            disabled={row.derived}
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
                        {/* Amount stays editable even on a derived row — the
                            special service is mandatory, its dollar figure
                            isn't (that's the carrier's own quote). */}
                        <MeasureField
                          id={`cb-charge-${idx}-amount`}
                          showLabel
                          label="Amount"
                          /* Money — 2, same as Base Charge above. Was 6
                             (copied from QuoteModal's LINX-13895 reading),
                             which `decimals` PADS to, so every entry blurred
                             to "150.000000". */
                          decimals={2}
                          value={{ value: row.amount, uom: 'USD' }}
                          options={USD_OPTIONS}
                          onChange={(v) => updateChargeRow(idx, { amount: v.value })}
                        />
                        {/* Plain icon affordance, never a Button (row-action
                            convention) — same as QuoteModal's own remove.
                            Disabled + titled on a derived row: it's required
                            for this shipment, not the carrier's to drop. */}
                        <button
                          type="button"
                          className="carrier-bid-charges__remove"
                          aria-label={`Remove charge ${idx + 1}`}
                          title={row.derived ? 'Required for this shipment' : undefined}
                          disabled={row.derived}
                          onClick={() => removeChargeRow(idx)}
                        >
                          <Trash2 size={20} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Button variant="link" icon={<Plus size={16} />} onClick={addChargeRow}>
                  Add
                </Button>
              </section>
            </div>

            {priorBid && (
              <p className="carrier-bid-page__last-submitted text-label-sm-regular">
                Last submitted: {fmtDollar(priorBid.total)} by {priorBid.submittedBy} · {formatDateTimeMDYHM(new Date(priorBid.respondedAt))}
              </p>
            )}
            {declined && !priorBid && (
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
                rows={[['Linehaul', linehaulNum], ['Fuel (Estimated)', fuel]]}
                total={round2(linehaulNum + fuel)}
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
                <Button variant="secondary" size="lg" onClick={handleDecline}>Decline</Button>
                <Button variant="primary" size="lg" onClick={() => setConfirmOpen(true)}>
                  {confirmTitle}
                </Button>
              </div>
            </div>
          </SubAccordion>
          </div>
        </>
      )}
      </main>

      {confirmOpen && createPortal(
        <ModalMedium
          title={confirmTitle}
          onClose={() => setConfirmOpen(false)}
          footer={
            <>
              <Button variant="secondary" size="lg" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  setConfirmOpen(false)
                  handleSubmit()
                }}
              >
                Confirm &amp; Submit
              </Button>
            </>
          }
        >
          <div className="carrier-bid-card__grid carrier-bid-card__grid--pairs">
            <TitleSubtitle subtitle="Base Charge" title={fmtDollar(round2(linehaulNum + fuel))} />
            <TitleSubtitle subtitle="Additional Charges" title={fmtDollar(chargeTotal)} />
          </div>
          <div className="carrier-bid-total carrier-bid-total--grand text-label-base-semibold">
            <span>Grand Total</span>
            <span>{fmtDollar(total)}</span>
          </div>
        </ModalMedium>,
        document.body
      )}
    </div>
  )
}
