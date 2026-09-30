import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Navbar, LeadNav, GlobalSearch, TrailNav, OdysseyLogo, Alert, Badge, Button, Dropdown, TextArea } from '@odyssey/ui'
import { decodeToken } from '../spotboard/token.js'
import { useShipmentDetail } from '../api/queries/useShipmentDetail'
import { saveTenderOption } from '../api/services/shipmentService'
import { routingOptionVmToDto } from '../api/mappers/mapSellShipmentOutToDetail'
import { formatDateTimeMDYHM } from '../lib/dates.js'
import { isEmailNotify } from '../tender/email/tenderEmail.js'
import { toEmailFor } from '../tender/email/tenderEmailContext.js'
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

  const navbar = (
    <div className="carrier-bid-navbar-wrap">
      <Navbar
        context="external"
        lead={<LeadNav showMenu={false} logo={<OdysseyLogo variant="dark" />} />}
        search={<GlobalSearch mode="title" title="Carrier Portal" />}
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
  const fact = (label, value) => (
    <div className="tender-review-fact">
      <span className="text-label-xs-regular">{label}</span>
      <span className="text-label-sm-medium">{value || '--'}</span>
    </div>
  )

  // S159 (team review 2026-09-30, Papu's Tender Review Page PDF): ONE details
  // card with plain section headings — no SubAccordion per section — and a
  // separate response card. Load References = four separate fields per order.
  return (
    <div className="carrier-bid-page">
      <HeroBackground heroIndex={heroIndex} />
      {navbar}

      <main className="carrier-bid-page__main">
        <section className={`tender-review-card ${sectionEnterClass}`} style={{ '--enter-delay': '0ms' }}>
          <header className="tender-review-head">
            <h1 className="text-heading-lg-semibold">{`${effectiveOption.carrierName} — Tender ${shipment.odysseyShipmentIdentifier}`}</h1>
            <div className="tender-review-subline text-label-sm-regular">
              {firstPickup?.location ?? '--'} → {lastDelivery?.location ?? '--'}
            </div>
            <Badge variant="blue">{`Tendered ${effectiveOption.notifyDateTime}`}</Badge>
          </header>

          <div className="tender-review-facts tender-review-facts--summary">
            {fact('Shipper', shipment.customerName)}
            {fact('Carrier', `${effectiveOption.scac} - ${effectiveOption.carrierName}`)}
            {fact('Shipment ID', shipment.odysseyShipmentIdentifier)}
            {fact('Equipment', effectiveOption.equipment)}
            {fact('Weight', weightDisplay)}
            {fact('Hazmat', order?.hazmat)}
          </div>

          <div className="tender-review-section">
            <h2 className="tender-review-h text-label-sm-semibold">Lane</h2>
            <div className="tender-review-lane">
              <div className="tender-review-lane__stop">
                <span className="text-label-xs-regular tender-review-muted">Ship From</span>
                <span className="text-label-sm-medium">{firstPickup?.location ?? '--'}</span>
                <span className="text-label-sm-regular">{firstPickup?.address ?? '--'}</span>
                <span className="text-label-sm-regular">{`Pickup: ${effectiveOption.pickupDateTime ?? '--'} (${effectiveOption.pickupTZ})`}</span>
              </div>
              <span className="tender-review-lane__arrow" aria-hidden="true">→</span>
              <div className="tender-review-lane__stop">
                <span className="text-label-xs-regular tender-review-muted">Ship To</span>
                <span className="text-label-sm-medium">{lastDelivery?.location ?? '--'}</span>
                <span className="text-label-sm-regular">{lastDelivery?.address ?? '--'}</span>
                <span className="text-label-sm-regular">{`Delivery: ${effectiveOption.deliveryDateTime ?? '--'} (${effectiveOption.deliveryTZ})`}</span>
              </div>
            </div>
          </div>

          <div className="tender-review-section tender-review-split">
            <div>
              <h2 className="tender-review-h text-label-sm-semibold">Schedule & Distance</h2>
              <div className="tender-review-facts">
                {fact('Requested delivery', `${effectiveOption.deliveryDateTime ?? '--'} (${effectiveOption.deliveryTZ})`)}
                {fact('Distance', distanceDisplay)}
              </div>
            </div>
            <div>
              <h2 className="tender-review-h text-label-sm-semibold">Equipment & Freight</h2>
              <div className="tender-review-facts">
                {/* Mode: no field on the detail VM yet (shipmentMode is DASH) —
                    the planner's override is the only source today. */}
                {fact('Mode', dash(shipment.overrides?.mode))}
                {fact('Equipment', effectiveOption.equipment)}
                {fact('Carrier ID', effectiveOption.scac)}
                {fact('Total weight', weightDisplay)}
                {fact('Package count', shipment.stopsData?.summary?.packageCount)}
                {fact('Freight terms', dash(order?.paymentTerms))}
                {fact('Offered rate', offeredRate)}
              </div>
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
              <table className="tender-review-table tender-review-table--lines">
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
