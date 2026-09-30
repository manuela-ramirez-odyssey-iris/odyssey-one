import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Navbar, LeadNav, GlobalSearch, TrailNav, OdysseyLogo, Alert, Badge, Button, Dropdown, TextArea, TitleSubtitle, StopBadge } from '@odyssey/ui'
import { decodeToken } from '../spotboard/token.js'
import { useShipmentDetail } from '../api/queries/useShipmentDetail'
import { saveTenderOption } from '../api/services/shipmentService'
import { routingOptionVmToDto } from '../api/mappers/mapSellShipmentOutToDetail'
import { formatDateTimeMDYHM } from '../lib/dates.js'
import { isEmailNotify } from '../tender/email/tenderEmail.js'
import { buildTenderEmailContext, toEmailFor } from '../tender/email/tenderEmailContext.js'
import { PLANNING_GROUP_MAILBOX } from '../spotboard/email/emailContext.js'
import { HeroBackground, carrierInitials } from './externalPageChrome.jsx'
import { HERO_IMAGES_LAND } from '../heroImages'
import { useHeroRotation } from '../hooks/useHeroRotation'
import './carrierBid.css'
import './tenderReview.css'

// Carrier Tender Review page (LINX-15795/15796/15800, spec §4) — public,
// unauthenticated, token-linked, no AppShell. Reuses CarrierBid's chrome
// (externalPageChrome.jsx + carrierBid.css) rather than re-deriving it.
const HERO_INITIAL_INDEX = 0
const HERO_SRC = HERO_IMAGES_LAND[HERO_INITIAL_INDEX]
const ENTER_STEP_MS = 90

const DECLINE_REASONS = [
  'No capacity available',
  'Rate too low',
  'Lane not served',
  'Cannot meet pickup or delivery window',
  'Other',
].map((r) => ({ value: r, label: r }))

const COMMENTS_MAX = 200

export default function TenderReview() {
  const { token } = useParams()
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
  async function respond(patch) {
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
      await saveTenderOption(shipmentId, routingOptionVmToDto(updated), { expectStatus: 'Sent' })
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

  const handleAccept = () => respond({ status: 'Accepted' })
  const handleDeclineConfirm = () => respond({
    status: 'Declined',
    declineReason,
    responseComments: comments.trim() ? comments.trim() : null,
  })
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
        {!isEmailEdi && <><br />{`A confirmation has been emailed to ${toEmailFor(effectiveOption.scac)}.`}</>}
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
  const lines = productOrders.flatMap((o) => o.lines ?? [])
  const dash = (v) => (v && v !== '--' ? v : '--')
  // Same first/middle/last split the tender email uses — one source, so the
  // page and TE-1 never disagree on the lane.
  const laneCtx = buildTenderEmailContext({ shipment, option: effectiveOption })
  const middleStops = stops.filter((st) => st !== firstPickup && st !== lastDelivery)
  // P1/P2… for pickups, D1/D2… for deliveries, in stop order.
  const stopLabels = new Map()
  let pCount = 0
  let dCount = 0
  for (const st of stops) stopLabels.set(st, st.type === 'pickup' ? `P${++pCount}` : `D${++dCount}`)
  const stopLabel = (st) => stopLabels.get(st) ?? '--'

  // S159 (team review 2026-09-30, Papu's Tender Review Page PDF): ONE details
  // card with plain section headings — no SubAccordion per section — and a
  // separate response card. Load References = four separate fields per order.
  return (
    <div className="carrier-bid-page">
      <HeroBackground heroIndex={heroIndex} />
      {navbar}

      <main className="carrier-bid-page__main">
        {/* One card, app-native look (TitleSubtitle facts, no tinted bands).
            Keeps the tender email's PLACEMENT idea — lane with pickup and
            delivery on either side and the stops in the middle (user, S159). */}
        <section className={`tender-review-card ${sectionEnterClass}`} style={{ '--enter-delay': '0ms' }}>
          <div className="tender-review-top">
            <Badge variant="blue">{`Tendered ${effectiveOption.notifyDateTime}`}</Badge>
            <div className="tender-review-facts">
              <TitleSubtitle subtitle="Shipper" title={shipment.customerName || '--'} />
              <TitleSubtitle subtitle="Carrier" title={`${effectiveOption.scac} - ${effectiveOption.carrierName}`} />
              <TitleSubtitle subtitle="Shipment ID" title={shipment.odysseyShipmentIdentifier || '--'} />
              <TitleSubtitle subtitle="Equipment" title={effectiveOption.equipment || '--'} />
              <TitleSubtitle subtitle="Weight" title={weightDisplay} />
              <TitleSubtitle subtitle="Hazmat" title={order?.hazmat || '--'} />
            </div>
          </div>

          <div className="tender-review-section">
            <h2 className="tender-review-h text-label-sm-semibold">Lane</h2>
            <div className="tender-lane">
              <div className="tender-lane__end">
                <StopBadge label={stopLabel(firstPickup)} status="pending" />
                <span className="text-label-sm-semibold">{firstPickup?.location ?? '--'}</span>
                <span className="text-label-sm-regular tender-review-muted">{firstPickup?.address ?? '--'}</span>
                <TitleSubtitle subtitle="Pickup" title={laneCtx.pickupLine || '--'} />
              </div>

              <div className="tender-lane__middle">
                <span className="text-label-sm-medium">{distanceDisplay}</span>
                <div className="tender-lane__line" aria-hidden="true" />
                {middleStops.length === 0 ? (
                  <span className="text-label-xs-regular tender-review-muted">No intermediate stops</span>
                ) : (
                  <ul className="tender-lane__stops">
                    {middleStops.map((st, i) => (
                      <li key={i}>
                        <StopBadge label={stopLabel(st)} status="pending" />
                        <span className="tender-lane__stop-text">
                          <span className="text-label-xs-medium">{st.location}</span>
                          <span className="text-label-xs-regular tender-review-muted">{`${st.type === 'pickup' ? 'Pickup' : 'Drop-off'}: ${st.date ?? '--'}`}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="tender-lane__end tender-lane__end--to">
                <StopBadge label={stopLabel(lastDelivery)} status="pending" />
                <span className="text-label-sm-semibold">{lastDelivery?.location ?? '--'}</span>
                <span className="text-label-sm-regular tender-review-muted">{lastDelivery?.address ?? '--'}</span>
                <TitleSubtitle subtitle="Deliver" title={laneCtx.deliverLine || '--'} />
              </div>
            </div>
          </div>

          <div className="tender-review-section">
            <h2 className="tender-review-h text-label-sm-semibold">Equipment & Freight</h2>
            <div className="tender-review-facts">
              {/* Mode: no field on the detail VM yet (shipmentMode is DASH) —
                  the planner's override is the only source today. */}
              <TitleSubtitle subtitle="Mode" title={dash(shipment.overrides?.mode)} />
              <TitleSubtitle subtitle="Carrier ID" title={effectiveOption.scac || '--'} />
              <TitleSubtitle subtitle="Package count" title={dash(shipment.stopsData?.summary?.packageCount)} />
              <TitleSubtitle subtitle="Freight terms" title={dash(order?.paymentTerms)} />
              <TitleSubtitle subtitle="Offered rate" title={offeredRate || '--'} />
            </div>
          </div>

          <div className="tender-review-section">
            <h2 className="tender-review-h text-label-sm-semibold">Load References</h2>
            <table className="tender-review-table">
              <thead>
                <tr><th>Order Number</th><th>Load ID</th><th>Customer PO Number</th><th>Pickup Number</th></tr>
              </thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr key={i}>
                    <td>{dash(o.orderNumber)}</td>
                    {/* Load ID — source field in Buy Shipment Out still
                        unidentified (team review 2026-09-30). */}
                    <td>{dash(o.loadId)}</td>
                    <td>{dash(o.poNumber)}</td>
                    <td>{dash(o.pickupNumber)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lines.length > 0 && (
            <div className="tender-review-section">
              <h2 className="tender-review-h text-label-sm-semibold">Line Items</h2>
              {/* Columns per the paper tender (Line.png, team review 2026-09-30). */}
              <table className="tender-review-table">
                <thead>
                  <tr>
                    <th>Item/Description/<br />Hazmat Description</th>
                    <th className="is-num">Pkg Qty/<br />Hazmat Pkg. Group</th>
                    <th>Hazmat Code/<br />Hazmat Class</th>
                    <th>Weight/Volume<br />Dimensions</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td>{[l.shipItem, dash(l.description) !== '--' ? l.description : null, l.hazmat ? l.hazmatDescription : null].filter(Boolean).map((t, k) => <div key={k}>{t}</div>)}</td>
                      <td className="is-num"><div>{l.packageCount}</div>{l.hazmat && <div>{l.hazmatGroup}</div>}</td>
                      <td>{l.hazmat ? <><div>{l.hazmatUnNumber}</div><div>{l.hazmatClass}</div></> : '--'}</td>
                      <td><div>{l.grossWeight}</div><div>{l.volume}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="tender-review-section">
            <h2 className="tender-review-h text-label-sm-semibold">Pickup & Delivery Instructions</h2>
            {allInstructions.length === 0 ? (
              <p className="text-label-sm-regular tender-review-muted">No special instructions.</p>
            ) : (
              <ol className="tender-review-instructions text-label-sm-regular">
                {allInstructions.map((instr, i) => <li key={i}>{instr.text}</li>)}
              </ol>
            )}
          </div>
        </section>

        <section className={`tender-review-card ${sectionEnterClass}`} style={{ '--enter-delay': `${ENTER_STEP_MS}ms` }}>
          <h2 className="tender-review-h text-label-sm-semibold">Your Response</h2>
          <p className="text-label-sm-regular tender-review-lede">
            This decision is final and will be sent to {PLANNING_GROUP_MAILBOX} immediately.
          </p>
          {responseContent}
        </section>

        <p className="tender-review-footer text-label-xs-regular">
          Do not forward this link. It is unique to this tender option.
        </p>
      </main>
    </div>
  )
}
