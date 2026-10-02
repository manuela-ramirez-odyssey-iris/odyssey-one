import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { useParams, useSearchParams } from 'react-router-dom'
import { Navbar, LeadNav, GlobalSearch, TrailNav, OdysseyLogo, Alert, Badge, Button, Dropdown, TextArea, TitleSubtitle, SubAccordion, Timeline, Tooltip } from '@odyssey/ui'
import { decodeToken } from '../spotboard/token.js'
import { useShipmentDetail } from '../api/queries/useShipmentDetail'
import { saveTenderOption } from '../api/services/shipmentService'
import { routingOptionVmToDto } from '../api/mappers/mapSellShipmentOutToDetail'
import { formatDateTimeMDYHM } from '../lib/dates.js'
import { legMiles } from '../utils/legMiles.js'
import { isEmailNotify } from '../tender/email/tenderEmail.js'
import { tenderExpiry } from '../tender/email/tenderEmailContext.js'
import { PLANNING_GROUP_MAILBOX } from '../spotboard/email/emailContext.js'
import { HeroBackground, carrierInitials } from './externalPageChrome.jsx'
import { HERO_IMAGES_LAND } from '../heroImages'
import { useHeroRotation } from '../hooks/useHeroRotation'
import { DECLINE_REASONS as REASON_CODES } from '../data/declineReasons.js'
import { tenderWriteExtras } from '../lib/tenderAction.js'
import './carrierBid.css'
import './tenderReview.css'

// Carrier Tender Review page (LINX-15795/15796/15800, spec §4) — public,
// unauthenticated, token-linked, no AppShell. Reuses CarrierBid's chrome
// (externalPageChrome.jsx + carrierBid.css) rather than re-deriving it.
const HERO_INITIAL_INDEX = 0
const HERO_SRC = HERO_IMAGES_LAND[HERO_INITIAL_INDEX]
const ENTER_STEP_MS = 90

// LINX-15897 (A3) — the same 20 coded reasons as the planner's Decline dialog,
// replacing DEC-182's 5 placeholders. value = code; the description is what
// `declineReason` keeps.
const DECLINE_REASONS = REASON_CODES.map((r) => ({ value: r.code, label: `${r.code} — ${r.description}` }))

const COMMENTS_MAX = 200

// One stop in the Stops tab's markup, carrying only Papu's PDF fields.
function TenderStop({ stop, index, hasLeg, tipped }) {
  const isPickup = stop.type === 'pickup'
  const field = (label, value) => (
    <div className="stops-field">
      <span className="stops-field__label">{label}:</span>
      <span className="stops-field__value">{value || '--'}</span>
    </div>
  )
  return (
    <div className="tender-stop" data-stop-index={index}>
      <div className="stops-item__header">
        <span className="stops-item__stop-label">stop {stop.stopNumber}</span>
        <Badge variant="green">{isPickup ? 'Pickup' : 'Delivery'}</Badge>
      </div>
      <div className="stops-item__fields">
        {field('Location', stop.location)}
        {field('Address', stop.address)}
        {field(isPickup ? 'Pickup' : 'Deliver', stop.date)}
      </div>
      {/* Order change's leg cue (DEC-226): a decorative Info icon beside the
          line to the next stop; hovering it or the line shows the distance. */}
      {hasLeg && <span className="tender-stop__leg-icon" data-tipped={tipped || undefined} aria-hidden="true"><Info {...ICON_MD} /></span>}
    </div>
  )
}

export default function TenderReview() {
  const { token } = useParams()
  // ?demo=1 (the /tender-emails gallery's links; Adam, 2026-10-01): the answer
  // shows on the page but is never written, so the link never stops being open.
  const demo = useSearchParams()[0].get('demo') === '1'
  const decoded = useMemo(() => decodeToken(token), [token])
  const shipmentId = decoded?.shipmentId ?? null
  const scac = decoded?.scac ?? null

  const { data: shipment, isLoading, isError, refetch } = useShipmentDetail(shipmentId)
  const option = shipment?.routingData?.options?.find((o) => o.scac === scac && o.tenderToken === token) ?? null

  // Optimistic local override after a successful Accept/Decline write — the
  // review page has no durable store to reload from in mock mode (same
  // ponytail as saveTenderOption itself), so the just-written option is held
  // here rather than waiting on a refetch that would return stale data.
  const [localOption, setLocalOption] = useState(null)
  const [conflict, setConflict] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)
  // Leg-distance tooltip — EditStopsView's showRailTip, minus drag/panels:
  // body portal, fixed, no pointer events; opens left of the line.
  const [legTip, setLegTip] = useState(null)

  const effectiveOption = localOption ?? option

  const loading = !!decoded && isLoading
  const invalid = !decoded || (!isLoading && (isError || !shipment || !option))

  // Same preload/decode-gating idiom as CarrierBid — hold the section
  // entrance invisible until the first hero image has decoded.
  const [bgLoaded, setBgLoaded] = useState(() => {
    if (typeof Image === 'undefined') return true
    const img = new Image()
    img.src = HERO_SRC
    return img.complete
  })
  useEffect(() => {
    if (bgLoaded) return
    const img = new Image()
    img.src = HERO_SRC
    if (img.complete) { setBgLoaded(true); return }
    const onDone = () => setBgLoaded(true)
    img.addEventListener('load', onDone)
    img.addEventListener('error', onDone)
    const fallback = setTimeout(onDone, 1500)
    return () => {
      img.removeEventListener('load', onDone)
      img.removeEventListener('error', onDone)
      clearTimeout(fallback)
    }
  }, [])
  const sectionEnterClass = bgLoaded ? 'hero-enter' : 'hero-enter-waiting'
  const heroIndex = useHeroRotation(HERO_INITIAL_INDEX, { bgLoaded, respectReducedMotion: true, images: HERO_IMAGES_LAND })

  // Profile dropdown — same idiom as CarrierBid.
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

  const carrierFullName = effectiveOption?.carrierName ?? scac ?? ''
  const trailContent = (
    <>
      <TrailNav
        name={scac ?? ''}
        role={carrierFullName}
        avatar={
          <div className="carrier-bid-avatar" aria-hidden="true">
            {carrierInitials(carrierFullName, scac)}
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
            position: 'absolute', top: '100%', right: 0, marginTop: 4, width: 220,
            background: 'var(--dropdown-bg)', border: '1px solid var(--dropdown-border)',
            borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', zIndex: 9999,
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

  // S159 (user): the bar names the tender, with a "Request For Tender"
  // pretitle — passed as a node since GlobalSearch's title mode has no
  // pretitle prop (kept app-local, the normalized component is untouched).
  const tenderTitle = effectiveOption && shipment
    ? `${String(effectiveOption.carrierName ?? scac).toUpperCase()} - Tender ${shipment.odysseyShipmentIdentifier}`
    : null
  const navTitle = tenderTitle ? (
    <span className="tender-review-navtitle">
      <span className="tender-review-navtitle__pre text-label-xs-medium">Request For Tender</span>
      <span>{tenderTitle}</span>
    </span>
  ) : 'Carrier Portal'

  const navbar = (
    <div className="carrier-bid-navbar-wrap">
      <Navbar
        context="external"
        lead={<LeadNav showMenu={false} logo={<OdysseyLogo variant="dark" />} />}
        search={<GlobalSearch mode="title" title={navTitle} />}
        trailRef={profileDropdownRef}
        trail={trailContent}
      />
    </div>
  )

  // ── Accept / Decline write (spec §4) ────────────────────────────────────
  async function respond(patch, action) {
    if (!option || !shipmentId) return
    setSaving(true)
    const now = formatDateTimeMDYHM(new Date())
    const updated = {
      ...option,
      ...patch,
      responseMethod: 'Email Links Update',
      responseDateTime: now,
      responseUser: null,
      modifyUser: `${scac} (email link)`,
      modifyDate: now,
    }
    try {
      // tenderAction (+ TE-4 on Decline) rides the payload for saveTender's
      // guard + history entry (LINX-15899 spec §6).
      if (!demo) await saveTenderOption(shipmentId, { ...routingOptionVmToDto(updated), ...tenderWriteExtras(updated, action) }, { expectStatus: 'Sent' })
      setLocalOption(updated)
      setDeclining(false)
    } catch (err) {
      if (err?.status === 409) {
        setConflict(true)
        refetch()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleAccept = () => respond({ status: 'Accepted' }, 'Accept')
  // `declineReason` state holds the CODE (the Dropdown's value).
  const handleDeclineConfirm = () => respond({
    status: 'Declined',
    declineReasonCode: declineReason,
    declineReason: REASON_CODES.find((r) => r.code === declineReason)?.description ?? null,
    responseComments: comments.trim() ? comments.trim() : null,
  }, 'Decline')
  const handleDeclineCancel = () => {
    setDeclining(false)
    setDeclineReason('')
    setComments('')
  }

  if (loading || invalid) {
    return (
      <div className="carrier-bid-page">
        <HeroBackground heroIndex={heroIndex} />
        {navbar}
        <main className="carrier-bid-page__main">
          {loading
            ? <p className="carrier-bid-page__loading text-label-sm-regular">Loading shipment details…</p>
            : <Alert variant="warning" showClose={false}>This link is invalid or has expired.</Alert>}
        </main>
      </div>
    )
  }

  const order = shipment.orderDetails?.[0] ?? null
  const stops = shipment.stopsData?.stops ?? []
  const firstPickup = stops.find((s) => s.type === 'pickup') ?? stops[0] ?? null
  const lastDelivery = [...stops].reverse().find((s) => s.type === 'delivery') ?? stops[stops.length - 1] ?? null

  // Distance/weight fallback chains — same as CarrierBid's own (this option's
  // own value first, else any other routing option that carries a real one).
  const rawDistance = effectiveOption.distance
  const fallbackDistance = shipment.routingData.options.find((o) => o.distance && o.distance !== '--')?.distance
  const distanceDisplay = (rawDistance && rawDistance !== '--') ? rawDistance : (fallbackDistance ?? '--')
  const rawWeight = shipment.stopsData?.summary?.grossWeight
  const weightDisplay = (rawWeight && rawWeight !== '--')
    ? rawWeight
    : (order?.totalWeight && order.totalWeight !== '--' ? order.totalWeight : (order?.grossWeight ?? '--'))

  const offeredRate = [effectiveOption.rate, effectiveOption.rateDetails?.currency].filter(Boolean).join(' ')
  const allInstructions = (shipment.instructionsData?.orders ?? []).flatMap((o) => o.instructions ?? [])

  const isEmailEdi = String(effectiveOption.api ?? '').trim().toLowerCase() === 'email & edi'

  let responseContent
  if (conflict) {
    responseContent = (
      <Alert variant="error" showClose={false}>
        This tender response has already been submitted and cannot be processed again.
      </Alert>
    )
  } else if (effectiveOption.status === 'Accepted') {
    // TE-3 (user ruling 2026-09-24, Adam's ask) — Accept only, Email method
    // only; Email & EDI copies never reach this branch via a button (no
    // buttons render for that method), but a status loaded as Accepted
    // could still be Email & EDI-sourced, so the method is checked here too.
    responseContent = (
      <Alert variant="success" showClose={false}>
        {`Tender accepted – Recorded on ${effectiveOption.responseDateTime}. Reference ${shipment.odysseyShipmentIdentifier}.`}
      </Alert>
    )
  } else if (effectiveOption.status === 'Declined') {
    const reasonSuffix = effectiveOption.declineReason ? ` Reason: ${effectiveOption.declineReason}.` : ''
    responseContent = (
      <Alert variant="error" showClose={false}>
        {`Tender declined – Recorded on ${effectiveOption.responseDateTime}.${reasonSuffix}`}
      </Alert>
    )
  } else if (effectiveOption.status === 'Sent' && isEmailNotify(effectiveOption.api) && isEmailEdi) {
    responseContent = (
      <Alert variant="info" showClose={false}>
        This is an informational copy. This tender was also sent to you by EDI — please respond through your EDI connection.
      </Alert>
    )
  } else if (effectiveOption.status === 'Sent' && isEmailNotify(effectiveOption.api)) {
    responseContent = declining ? (
      <div className="tender-review-decline">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
          <label htmlFor="tr-decline-reason" className="text-label-sm-medium">Reason for declining</label>
          <Dropdown
            id="tr-decline-reason"
            value={declineReason}
            options={DECLINE_REASONS}
            onChange={setDeclineReason}
          />
        </div>
        <TextArea
          id="tr-decline-comments"
          label="Comments (optional)"
          value={comments}
          onChange={(e) => setComments(e.target.value.slice(0, COMMENTS_MAX))}
          maxLength={COMMENTS_MAX}
          rows={3}
        />
        <div className="carrier-bid-page__actions">
          <Button variant="secondary" size="lg" onClick={handleDeclineCancel} disabled={saving}>Cancel</Button>
          <Button variant="error" size="lg" onClick={handleDeclineConfirm} disabled={saving || !declineReason}>
            Confirm Decline
          </Button>
        </div>
      </div>
    ) : (
      <div className="carrier-bid-page__actions">
        <Button variant="secondary" size="lg" onClick={() => setDeclining(true)} disabled={saving}>Decline Tender</Button>
        <Button variant="primary" size="lg" onClick={handleAccept} disabled={saving}>Accept Tender</Button>
      </div>
    )
  } else {
    responseContent = (
      <Alert variant="warning" showClose={false}>This tender is no longer open.</Alert>
    )
  }

  const orders = shipment.orderDetails ?? []
  const productOrders = shipment.productData?.orders ?? []
  const dash = (v) => (v && v !== '--' ? v : '--')
  // City, state, postal of a stop — its location minus the facility name.
  const cityOf = (st) => (st?.location ?? '--').split(', ').slice(1).join(', ') || '--'
  // P1/P2… for pickups, D1/D2… for deliveries, in stop order.
  const stopLabels = new Map()
  let pCount = 0
  let dCount = 0
  for (const st of stops) stopLabels.set(st, st.type === 'pickup' ? `P${++pCount}` : `D${++dCount}`)
  const stopLabel = (st) => stopLabels.get(st) ?? '--'
  const showLegTip = (e) => {
    const hit = e.target.closest?.('.odyssey-timeline__rail, .tender-stop__leg-icon')
    const row = hit?.closest('.odyssey-timeline__row')
    const i = Number(row?.querySelector('[data-stop-index]')?.dataset.stopIndex)
    if (!row || !(i < stops.length - 1)) { setLegTip(null); return }
    const rr = row.querySelector('.odyssey-timeline__rail').getBoundingClientRect()
    const r = row.getBoundingClientRect()
    const miles = legMiles(stops[i], stops[i + 1])
    setLegTip({
      index: i,
      x: rr.left + rr.width / 2 - 8,
      y: Math.min(Math.max(e.clientY, r.top), r.bottom),
      subtitle: `Distance from ${stopLabel(stops[i])} to ${stopLabel(stops[i + 1])}`,
      content: miles == null ? '--' : `${miles.toFixed(2)} mi`,
    })
  }

  // Four collapsible SubAccordions (user, 2026-10-01) — supersedes S159's
  // one-card-with-plain-headings layout. Only one rule: summary facts / stops.
  // Load References = four separate fields per order.
  const block = (i, title, extra, body) => (
    <div className={`tender-review-block ${sectionEnterClass}`} style={{ '--enter-delay': `${i * ENTER_STEP_MS}ms` }}>
      <SubAccordion title={title} defaultExpanded {...extra}>
        <div className="tender-review-body">{body}</div>
      </SubAccordion>
    </div>
  )

  return (
    <div className="carrier-bid-page">
      <HeroBackground heroIndex={heroIndex} />
      {navbar}

      <main className="carrier-bid-page__main">
        {block(0, 'Summary', { badge: <Badge variant="blue">{`Tender Expires ${tenderExpiry(effectiveOption.notifyDateTime) || '--'}`}</Badge> }, (
          <>
            <div className="tender-review-facts">
              <TitleSubtitle subtitle="Shipper" title={shipment.customerName || '--'} />
              <TitleSubtitle subtitle="Carrier" title={`${effectiveOption.scac} - ${effectiveOption.carrierName}`} />
              <TitleSubtitle subtitle="Shipment ID" title={shipment.odysseyShipmentIdentifier || '--'} />
              <TitleSubtitle subtitle="Equipment" title={effectiveOption.equipment || '--'} />
              <TitleSubtitle subtitle="Weight" title={weightDisplay} />
              <TitleSubtitle subtitle="Hazmat" title={order?.hazmat || '--'} />
            </div>
            {/* The Stops tab's LOOK and arrival animation (shared Timeline +
                its stops-item classes), but only the PDF's per-stop data:
                location, address, pickup/deliver date (user, 2026-10-01).
                Keyed on the entrance class so it remounts — and animates —
                once the page is actually visible. */}
            <div className="tender-review-stops" onMouseMove={showLegTip} onMouseLeave={() => setLegTip(null)}>
              <p className="tender-review-route text-label-base-semibold">
                {`${cityOf(firstPickup)} → ${cityOf(lastDelivery)}`}
              </p>
              <div className="tender-review-facts">
                <TitleSubtitle subtitle="Distance" title={distanceDisplay} />
                {/* ponytail: first order's requestedDeliveryDate (mapped to
                    latestDelivery); a consolidation shows its first order's. */}
                <TitleSubtitle subtitle="Requested delivery" title={dash(order?.latestDelivery)} />
              </div>
              <Timeline
                key={sectionEnterClass}
                animate={bgLoaded}
                className="stops-timeline"
                aria-label="All stops"
                items={stops.map((st, i) => ({
                  key: st.stopNumber ?? i,
                  label: stopLabel(st),
                  status: st.status || 'completed',
                  content: <TenderStop stop={st} index={i} hasLeg={i < stops.length - 1} tipped={legTip?.index === i} />,
                }))}
              />
            </div>
          </>
        ))}

        {/* Field order per Papu's Tender Review Page PDF (vault/00-inbox). */}
        {block(1, 'Equipment & Freight', null, (
          <>
            <div className="tender-review-facts">
              {/* Mode: no field on the detail VM yet (shipmentMode is DASH) —
                  the planner's override is the only source today. */}
              <TitleSubtitle subtitle="Mode" title={dash(shipment.overrides?.mode)} />
              <TitleSubtitle subtitle="Equipment" title={effectiveOption.equipment || '--'} />
              <TitleSubtitle subtitle="Carrier ID" title={effectiveOption.scac || '--'} />
              <TitleSubtitle subtitle="Total weight" title={weightDisplay} />
              <TitleSubtitle subtitle="Package count" title={dash(shipment.stopsData?.summary?.packageCount)} />
              <TitleSubtitle subtitle="Freight terms" title={dash(order?.paymentTerms)} />
              <TitleSubtitle subtitle="Offered rate" title={offeredRate || '--'} />
            </div>
            {/* Papu 2026-10-01: one Load References section per load/order, its
                own line items under it. Product orders come from the same
                orderList as orderDetails, so they pair by index. */}
            {orders.map((o, oi) => (
              <div key={oi} className="tender-review-load">
                <h3 className="tender-review-h text-heading-lg-semibold">
                  {orders.length > 1 ? `Load References · ${oi + 1} of ${orders.length}` : 'Load References'}
                </h3>
                <div className="tender-review-facts tender-review-facts--4">
                  <TitleSubtitle subtitle="Order Number" title={dash(o.orderNumber)} />
                  {/* Load ID — source field in Buy Shipment Out still
                      unidentified (team review 2026-09-30). */}
                  <TitleSubtitle subtitle="Load ID" title={dash(o.loadId)} />
                  <TitleSubtitle subtitle="Customer PO Number" title={dash(o.poNumber)} />
                  <TitleSubtitle subtitle="Pickup Number" title={dash(o.pickupNumber)} />
                </div>
                {(productOrders[oi]?.lines ?? []).length > 0 && (
                  <>
                    <h3 className="tender-review-h text-heading-lg-semibold">Line Items</h3>
                    {/* Columns per the paper tender (Line.png, team review 2026-09-30). */}
                    <table className="tender-review-table">
                      <thead>
                        <tr>
                          <th>Item/Description/<br />Hazmat Description</th>
                          <th>Pkg Qty/<br />Hazmat Pkg. Group</th>
                          <th>Hazmat Code/<br />Hazmat Class</th>
                          <th>Weight/Volume<br />Dimensions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(productOrders[oi]?.lines ?? []).map((l, i) => (
                          <tr key={i}>
                            <td>{[l.shipItem, dash(l.description) !== '--' ? l.description : null, l.hazmat ? l.hazmatDescription : null].filter(Boolean).map((t, k) => <div key={k}>{t}</div>)}</td>
                            <td><div>{l.packageCount}</div>{l.hazmat && <div>{l.hazmatGroup}</div>}</td>
                            <td>{l.hazmat ? <><div>{l.hazmatUnNumber}</div><div>{l.hazmatClass}</div></> : '--'}</td>
                            <td><div>{l.grossWeight}</div><div>{l.volume}</div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            ))}
          </>
        ))}

        {block(2, 'Pickup & Delivery Instructions', null, (
          <>
            {allInstructions.length === 0 ? (
              <p className="text-label-sm-regular tender-review-muted">No special instructions.</p>
            ) : (
              <ol className="tender-review-instructions text-label-sm-regular">
                {allInstructions.map((instr, i) => <li key={i}>{instr.text}</li>)}
              </ol>
            )}
          </>
        ))}

        {block(3, 'Your Response', null, (
          <>
            <p className="text-label-sm-regular tender-review-lede">
              This decision is final and will be sent to {PLANNING_GROUP_MAILBOX} immediately.
            </p>
            {responseContent}
          </>
        ))}

        {legTip && createPortal(
          <div style={{ position: 'fixed', left: legTip.x, top: legTip.y, transform: 'translate(-100%, -50%)', width: 'max-content', zIndex: 9999, pointerEvents: 'none' }}>
            <Tooltip badgeVariant="info" groups={[{ subtitle: legTip.subtitle, content: legTip.content }]} />
          </div>,
          document.body,
        )}

        <p className="tender-review-footer text-label-xs-regular">
          Do not forward this link. It is unique to this tender option.
        </p>
      </main>
    </div>
  )
}
