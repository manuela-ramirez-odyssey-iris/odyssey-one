import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Navbar, LeadNav, GlobalSearch, TrailNav, OdysseyLogo, Alert, Badge, Button, Dropdown, TextArea, SubAccordion, TitleSubtitle } from '@odyssey/ui'
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

  return (
    <div className="carrier-bid-page">
      <HeroBackground heroIndex={heroIndex} />
      {navbar}

      <main className="carrier-bid-page__main">
        <div className={sectionEnterClass} style={{ '--enter-delay': `${0 * ENTER_STEP_MS}ms` }}>
          <SubAccordion
            title={`${effectiveOption.carrierName} - Tender ${shipment.odysseyShipmentIdentifier}`}
            defaultExpanded
          >
            <div className="tender-review-subline text-label-sm-regular">
              {firstPickup?.location ?? '--'} → {lastDelivery?.location ?? '--'}
            </div>
            <Badge variant="blue">{`Tendered ${effectiveOption.notifyDateTime}`}</Badge>
            <div className="carrier-bid-card__grid carrier-bid-card__grid--pairs" style={{ marginTop: 'var(--spacing-3)' }}>
              <TitleSubtitle title={shipment.customerName} subtitle="Shipper" />
              <TitleSubtitle title={shipment.odysseyShipmentIdentifier} subtitle="Shipment ID" />
              <TitleSubtitle title={effectiveOption.carrierName} subtitle="Carrier" />
              <TitleSubtitle title={effectiveOption.equipment} subtitle="Equipment" />
              <TitleSubtitle title={distanceDisplay} subtitle="Distance" />
              <TitleSubtitle title={weightDisplay} subtitle="Weight" />
              <TitleSubtitle title={order?.hazmat ?? '--'} subtitle="Hazmat" />
            </div>
          </SubAccordion>
        </div>

        <div className={sectionEnterClass} style={{ '--enter-delay': `${1 * ENTER_STEP_MS}ms` }}>
          <SubAccordion title="Lane" defaultExpanded>
            <div className="tender-review-lane">
              <div className="tender-review-lane__stop">
                <TitleSubtitle title={firstPickup?.location ?? '--'} subtitle="Ship From" />
                <p className="text-label-sm-regular">{firstPickup?.address ?? '--'}</p>
                <p className="text-label-sm-regular">{`Pickup: ${effectiveOption.pickupDateTime ?? '--'} (${effectiveOption.pickupTZ})`}</p>
              </div>
              <span className="tender-review-lane__arrow" aria-hidden="true">→</span>
              <div className="tender-review-lane__stop">
                <TitleSubtitle title={lastDelivery?.location ?? '--'} subtitle="Ship To" />
                <p className="text-label-sm-regular">{lastDelivery?.address ?? '--'}</p>
                <p className="text-label-sm-regular">{`Delivery: ${effectiveOption.deliveryDateTime ?? '--'} (${effectiveOption.deliveryTZ})`}</p>
              </div>
            </div>
          </SubAccordion>
        </div>

        <div className={sectionEnterClass} style={{ '--enter-delay': `${2 * ENTER_STEP_MS}ms` }}>
          <SubAccordion title="Equipment & Freight" defaultExpanded>
            <div className="tender-review-rows">
              <div className="tender-review-row"><span>Equipment</span><span>{effectiveOption.equipment}</span></div>
              <div className="tender-review-row"><span>Carrier ID</span><span>{effectiveOption.scac}</span></div>
              <div className="tender-review-row"><span>Total weight</span><span>{weightDisplay}</span></div>
              <div className="tender-review-row"><span>Package count</span><span>{shipment.stopsData?.summary?.packageCount ?? '--'}</span></div>
              <div className="tender-review-row"><span>Requested delivery</span><span>{`${effectiveOption.deliveryDateTime ?? '--'} (${effectiveOption.deliveryTZ})`}</span></div>
              <div className="tender-review-row"><span>Transit</span><span>{effectiveOption.transit}</span></div>
              <div className="tender-review-row tender-review-row--bold"><span>Offered rate</span><span>{offeredRate || '--'}</span></div>
            </div>
          </SubAccordion>
        </div>

        <div className={sectionEnterClass} style={{ '--enter-delay': `${3 * ENTER_STEP_MS}ms` }}>
          <SubAccordion title="Load References" defaultExpanded>
            <div className="tender-review-rows">
              {(shipment.orderDetails ?? []).map((o, i) => (
                <div key={i} className="tender-review-row">
                  <span>{`Load ${shipment.odysseyShipmentIdentifier}`}</span>
                  <span>{`PO ${o.poNumber ?? '--'} · Pickup No ${o.pickupNumber ?? '--'}`}</span>
                </div>
              ))}
            </div>
          </SubAccordion>
        </div>

        <div className={sectionEnterClass} style={{ '--enter-delay': `${4 * ENTER_STEP_MS}ms` }}>
          <SubAccordion title="Pickup and delivery instructions" defaultExpanded>
            {allInstructions.length === 0 ? (
              <p className="text-label-sm-regular tender-review-instructions__empty">No special instructions.</p>
            ) : (
              <table className="tender-review-instructions">
                <thead>
                  <tr><th>#</th><th>Instruction Description</th></tr>
                </thead>
                <tbody>
                  {allInstructions.map((instr, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{instr.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SubAccordion>
        </div>

        <div className={sectionEnterClass} style={{ '--enter-delay': `${5 * ENTER_STEP_MS}ms` }}>
          <SubAccordion title="Your Response" defaultExpanded>
            <p className="text-label-sm-regular tender-review-lede">
              This decision is final and will be sent to {PLANNING_GROUP_MAILBOX} immediately.
            </p>
            {responseContent}
          </SubAccordion>
        </div>

        <p className="tender-review-footer text-label-xs-regular">
          Do not forward this link. It is unique to this tender option.
        </p>
      </main>
    </div>
  )
}
