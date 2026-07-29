import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Accordion, Alert, Breadcrumb, Button, ModalMedium, PageHeader } from '@odyssey/ui'
import { ArrowLeft, ListChevronsUpDown, ListChevronsDownUp } from 'lucide-react'
import { deriveValidationErrors } from '../resolve/validationErrors.js'
import { ResolveModeProvider } from '../resolve/ResolveModeContext.jsx'
import { useCreateOrderMode } from '../../../contexts/CreateOrderModeContext.jsx'
import { useCreateOrder } from '../../../api/queries/useCreateOrder'
import { useSaveDraft } from '../../../api/queries/useSaveDraft'
import { getDraft, getOrderList, getOrderView, resolveOrder } from '../../../api/services/orderService'
import { makeDefaultOrderFormValues } from '../../../api/types/orderFormVm'
import { createOrderSchema, saveGateSchema } from './schema'
import { useSectionStatus } from './useSectionStatus.js'
import StickyFooter from './StickyFooter.jsx'
import DiscardSaveModal from './DiscardSaveModal.jsx'
import GeneralInformationSection from './sections/GeneralInformationSection.jsx'
import PickupDeliverySection from './sections/PickupDeliverySection.jsx'
import ProductInformationSection from './sections/ProductInformationSection.jsx'
import SpecialServicesSection from './sections/SpecialServicesSection.jsx'

const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)

const SAVE_GATE_MESSAGE =
  'Order Number and Owning Organization are both required to save this order.'

/**
 * CreateOrderForm — the create-flow orchestrator (spec §2.2, §4).
 * RHF + zodResolver own validation; the four Accordions ARE the stepper
 * (Accordion embeds StepIndicator + rail — plan decision 5). Save flows:
 *  - Save (footer):           save-gate → draft upsert, UI stays open
 *  - Save for Later (navbar / modal): save-gate → draft + navigate to /orders
 *  - Discard (modal):         navigate, nothing kept
 *  - Create Order (footer):   full schema → createOrder → onSubmitted
 */
export default function CreateOrderForm({ draftKey, resolveKey, resolveMeta, onSubmitted }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { enterCreateOrderMode, exitCreateOrderMode } = useCreateOrderMode()
  const methods = useForm({
    resolver: zodResolver(createOrderSchema),
    // Validate on first blur (leaving/clicking outside a field), live afterwards
    // (user directive 2026-07-28 — was 'onChange', which flagged mid-typing)
    mode: 'onTouched',
    defaultValues: makeDefaultOrderFormValues(),
  })
  const { control, formState, getValues, handleSubmit, reset } = methods

  const [expanded, setExpanded] = useState({
    general: true, pickupDelivery: false, products: false, specialServices: false,
  })
  const [bannerOpen, setBannerOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [saveGateError, setSaveGateError] = useState('')
  const [saveNotice, setSaveNotice] = useState('')
  const [draftId, setDraftId] = useState(null)
  // ── Resolve mode (LINX-11137) ──
  const [resolveState, setResolveState] = useState(null) // { errors, isResolved, contextText }
  const [purgeOpen, setPurgeOpen] = useState(false)
  const [alertDocked, setAlertDocked] = useState(false)
  const [alertExpanded, setAlertExpanded] = useState(true)
  const [errorIndex, setErrorIndex] = useState(0)
  const alertSentinelRef = useRef(null)
  const alertWrapRef = useRef(null)
  const scrollerRef = useRef(null)
  const dockedRef = useRef(false)
  const preDockHeightRef = useRef(0)
  const dockScrolledPastRef = useRef(false)
  const navSessionRef = useRef(false)
  const resolveMode = !!resolveKey

  const status = useSectionStatus(control)
  const createOrderMutation = useCreateOrder()
  const saveDraftMutation = useSaveDraft()

  // The intro banner slides in 1s after the screen mounts (not on first paint),
  // so it reads as a deliberate hint rather than chrome. Once dismissed it stays
  // closed — the timer only fires once.
  useEffect(() => {
    const t = setTimeout(() => setBannerOpen(true), 1000)
    return () => clearTimeout(t)
  }, [])

  // ── Draft reopen (spec §4): /orders/create?draft=<orderNumber> ──
  // Session drafts resolve at full fidelity via getDraft. Any other order (a
  // generated or pending grid row — the grid's Edit action) falls back to
  // getOrderView. draftId stays null on the fallback: the first Save Draft
  // mints a session draft, and getOrderList's overlay shadowing replaces the
  // base row instead of duplicating it.
  useEffect(() => {
    if (!draftKey) return
    let cancelled = false
    getDraft(draftKey).then((draft) => {
      if (cancelled) return
      if (draft) {
        reset(draft.values)
        setDraftId(draft.draftId)
        return
      }
      return getOrderView(draftKey).then((values) => {
        if (!cancelled && values) reset(values)
      })
    })
    return () => { cancelled = true }
  }, [draftKey, reset])

  // ── Resolution reopen: /orders/create?resolve=<orderNumber> ──
  // The order hydrates read-only-ish, then the seeded errors are stamped into
  // the draft (blanked / corrupted / wrong values) so the form shows exactly
  // what OIF rejected. Replaced by a real OIF fetch when LINX-11137 lands.
  useEffect(() => {
    if (!resolveKey) return
    let cancelled = false
    // errorCount normally rides history state from the grid row. A direct or
    // refreshed ?resolve= URL loses it — fetch the order's own list row (it
    // carries errorCount in mock AND live) instead of fabricating 3; the
    // derive clamps at ≥1 so a truly missing count seeds a single error.
    const errorCountPromise = resolveMeta?.errorCount != null
      ? Promise.resolve(resolveMeta.errorCount)
      : getOrderList({ pagination: { pageNumber: 1, pageSize: 1 }, filters: { orderNumbers: [resolveKey] } })
          .then((res) => res.orders[0]?.errorCount ?? 1)
          .catch(() => 1)
    Promise.all([getOrderView(resolveKey), errorCountPromise]).then(([values, errorCount]) => {
      if (cancelled || !values) return
      const { errors, applyErrors, isResolved } = deriveValidationErrors(resolveKey, errorCount, values)
      const draft = applyErrors(values)
      // mapOrderViewToFormVm regenerates manualMode/showContact as false, so a
      // seeded error can land on a field that isn't rendered — unreachable, and
      // Save could never enable. Force the pools open for the erroring parties.
      for (const party of ['consignor', 'consignee']) {
        const partyErrors = errors.filter((e) => e.path.startsWith(`pickupDelivery.${party}.`))
        if (partyErrors.some((e) => !e.path.endsWith('contactPhone'))) draft.pickupDelivery[party].manualMode = true
        if (partyErrors.some((e) => e.path.endsWith('contactPhone'))) draft.pickupDelivery[party].showContact = true
      }
      reset(draft)
      const source = resolveMeta?.customer ? ` · Integrated from ${resolveMeta.customer}` : ''
      setResolveState({ errors, isResolved, contextText: `${resolveKey}${source}` })
      // Fresh order = fresh alert: ?resolve=A→B must not keep A's nav state.
      setErrorIndex(0)
      setAlertDocked(false)
      setAlertExpanded(true)
      dockedRef.current = false
      navSessionRef.current = false
      // Open exactly the sections the user has to fix.
      const secs = new Set(errors.map((e) => e.section))
      setExpanded({
        general: secs.has('general'),
        pickupDelivery: secs.has('pickupDelivery'),
        products: false,
        specialServices: false,
      })
    })
    return () => { cancelled = true }
  }, [resolveKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const watchedAll = useWatch({ control })
  // A field only counts resolved when the seeded-error module AND zod agree.
  // mode:'onTouched' means an untouched field has no zod error yet — fine, zod
  // flags it on touch.
  const rhfErrors = formState.errors
  const resolvedSet = useMemo(() => {
    if (!resolveState) return new Set()
    return new Set(
      resolveState.errors
        .filter((e) => resolveState.isResolved(e, get(watchedAll, e.path)) && !get(rhfErrors, e.path)?.message)
        .map((e) => e.path),
    )
  }, [resolveState, watchedAll, rhfErrors])
  const errorByPath = useMemo(
    () => new Map((resolveState?.errors ?? []).map((e) => [e.path, e])),
    [resolveState],
  )
  const allResolved = !!resolveState && resolvedSet.size === resolveState.errors.length
  const resolveCtx = useMemo(
    () => (resolveMode ? { errorByPath, resolvedSet } : null),
    [resolveMode, errorByPath, resolvedSet],
  )

  // ── Resolve alert + section badges ──
  const alertErrors = useMemo(
    () => (resolveState?.errors ?? []).map((e) => ({
      field: e.field, reason: e.reason, resolved: resolvedSet.has(e.path),
    })),
    [resolveState, resolvedSet],
  )

  const sectionErrorInfo = useMemo(() => {
    const info = { general: { total: 0, open: 0 }, pickupDelivery: { total: 0, open: 0 } }
    for (const e of resolveState?.errors ?? []) {
      info[e.section].total += 1
      if (!resolvedSet.has(e.path)) info[e.section].open += 1
    }
    return info
  }, [resolveState, resolvedSet])

  const accordionStatus = (key) => {
    if (resolveMode && sectionErrorInfo[key]?.total) return sectionErrorInfo[key].open > 0 ? 'error' : 'on'
    return status[key] ? 'on' : 'off'
  }
  // Red badge counts what's still OPEN (agreeing with the Alert above it); the
  // green "Completed · N validated" badge counts the total it validated.
  const accordionErrorCount = (key) => {
    const i = sectionErrorInfo[key]
    if (!resolveMode || !i?.total) return 0
    return i.open > 0 ? i.open : i.total
  }

  // Jump to an error: open its section, scroll the field into view, focus it.
  // Any error nav (Validate Errors, a list row, a docked arrow) starts a nav
  // SESSION: the alert collapses + docks and stays docked — even when the
  // target field sits near the top of the form — until the user deliberately
  // scrolls all the way back up (user ruling 2026-07-29). The scroll target is
  // floored at the alert's own slot so the sticky bar always pins flush under
  // the navbar (never a half-engaged bar with a gap above it).
  const handleErrorNav = (i) => {
    const err = resolveState?.errors[i]
    if (!err) return
    setErrorIndex(i)
    navSessionRef.current = true
    dockScrolledPastRef.current = false // wrapper is on screen — no scroll compensation
    setAlertExpanded(false)
    dockedRef.current = true
    setAlertDocked(true)
    const wasExpanded = expanded[err.section]
    setExpanded((prev) => ({ ...prev, [err.section]: true }))
    const reveal = () => {
      const el = document.getElementById(`co-${err.path.replace(/\./g, '-')}`)
      const scroller = scrollerRef.current
      const sentinel = alertSentinelRef.current
      if (el && scroller && sentinel) {
        const sRect = scroller.getBoundingClientRect()
        const elTop = el.getBoundingClientRect().top - sRect.top + scroller.scrollTop
        // Floor: at least past the alert's natural slot, so the sticky docked
        // bar engages and sits aligned below the navbar.
        const minTop = sentinel.getBoundingClientRect().top - sRect.top + scroller.scrollTop + 8
        scroller.scrollTo({ top: Math.max(elTop - scroller.clientHeight / 2, minTop), behavior: 'smooth' })
      } else {
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      // preventScroll: plain focus() jumps instantly and kills the smooth scroll.
      el?.focus?.({ preventScroll: true })
    }
    // An already-open section is laid out next frame. A collapsed one animates
    // its grid-rows reveal over 280ms — scrolling before that ends targets the
    // pre-expansion layout, so wait the curve out.
    if (wasExpanded) requestAnimationFrame(reveal)
    else setTimeout(reveal, 300)
  }

  // ── Dock model (reworked 2026-07-29, user ruling) ──
  // The expanded alert is a NORMAL in-flow block: scrolling simply scrolls it
  // away. Docking triggers only once its LAST list item has scrolled past the
  // navbar edge — at that moment it collapses (the return trip shows the
  // collapsed bar in its slot, no leftover hole) and turns sticky as the
  // full-width docked bar pinned below the navbar. Un-docking happens when the
  // alert's slot scrolls back into view; it stays collapsed (chevron re-opens).
  //
  // Scroll anchoring stays disabled for the session (overflow-anchor: none) —
  // it was the engine of the earlier flicker loop — and the expanded→bar
  // height delta is compensated with a single manual scrollTop adjustment in
  // a layout effect (only when the alert had fully scrolled past; docking
  // from a visible alert, e.g. Validate Errors at top, needs none).
  // The dock (wrapper bottom) and undock (sentinel top) thresholds are ~a full
  // alert height apart, so the two can never disagree.
  useEffect(() => {
    const sentinel = alertSentinelRef.current
    if (!resolveMode || !sentinel) return
    let scroller = sentinel.parentElement
    while (scroller && !/auto|scroll/.test(getComputedStyle(scroller).overflowY)) {
      scroller = scroller.parentElement
    }
    scrollerRef.current = scroller
    const prevAnchor = scroller ? scroller.style.overflowAnchor : ''
    if (scroller) scroller.style.overflowAnchor = 'none'
    const sync = () => {
      const st = scroller ? scroller.scrollTop : window.scrollY || 0
      const top = scroller ? scroller.getBoundingClientRect().top : 0
      const wrap = alertWrapRef.current
      if (!wrap) return
      const docked = dockedRef.current
      let next
      if (navSessionRef.current) {
        next = st > 2
        if (!next) navSessionRef.current = false // deliberate return to top ends the session
      } else if (docked) {
        // undock once the alert's slot is back in view
        next = sentinel.getBoundingClientRect().bottom < top + 8
      } else {
        // dock only when the whole (expanded or collapsed) alert scrolled past
        next = wrap.getBoundingClientRect().bottom < top + 1
      }
      if (next !== docked) {
        if (next) {
          preDockHeightRef.current = wrap.offsetHeight
          dockScrolledPastRef.current = true
          setAlertExpanded(false) // "it collapsed while we were scrolling down"
        }
        dockedRef.current = next
        setAlertDocked(next)
      }
    }
    sync()
    const target = scroller || window
    target.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      if (scroller) scroller.style.overflowAnchor = prevAnchor
      target.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [resolveMode, resolveState])

  // Docking shrinks the alert's in-flow slot (expanded → bar). When that slot
  // is entirely ABOVE the viewport the shrink would shift everything up by the
  // delta — compensate scrollTop once, before paint, so the view stays put.
  useLayoutEffect(() => {
    if (!alertDocked) return
    const scroller = scrollerRef.current
    const wrap = alertWrapRef.current
    if (!scroller || !wrap || !dockScrolledPastRef.current) return
    const delta = preDockHeightRef.current - wrap.offsetHeight
    if (delta > 0) scroller.scrollTop -= delta
  }, [alertDocked])

  // ── Save flows ──
  const passesSaveGate = useCallback(() => {
    const res = saveGateSchema.safeParse(getValues().general)
    if (res.success) {
      setSaveGateError('')
      return true
    }
    setSaveGateError(SAVE_GATE_MESSAGE) // red error Alert naming both fields (Q16/Q27)
    return false
  }, [getValues])

  const handleSave = useCallback(() => {
    if (!passesSaveGate()) return
    saveDraftMutation.mutate(
      { values: getValues(), draftId },
      {
        onSuccess: (res) => {
          setDraftId(res.draftId)
          setSaveNotice(`Draft saved (${res.orderNumber}). It stays open here and appears on the Orders grid.`)
        },
        onError: () => {
          setSaveGateError("Couldn't save the draft. Please try again.")
        },
      },
    )
  }, [passesSaveGate, saveDraftMutation, getValues, draftId])

  const handleSaveForLater = useCallback((onModalError) => {
    if (!passesSaveGate()) {
      setModalOpen(false) // surface the red alert in the form behind the modal
      return
    }
    saveDraftMutation.mutate(
      { values: getValues(), draftId },
      {
        onSuccess: () => navigate('/orders'),
        onError: () => {
          // If called from the modal, surface the error inside it (keep modal open).
          // If called from the navbar, surface the error in the form alert area.
          if (typeof onModalError === 'function') {
            onModalError("Couldn't save the draft. Please try again.")
          } else {
            setSaveGateError("Couldn't save the draft. Please try again.")
          }
        },
      },
    )
  }, [passesSaveGate, saveDraftMutation, getValues, draftId, navigate])

  const handleDiscard = useCallback(() => {
    navigate('/orders') // explicit confirm happened in the modal; nothing kept
  }, [navigate])

  // Resolution exit (LINX-11137): Save-with-all-resolved and Purge share one
  // path — status → 'Ready For Plan', which drops the row out of the Validation
  // Errors tab, then back to the list.
  const finishResolve = useCallback(async () => {
    // a failed status PATCH keeps the user on the form with their edits intact
    // instead of an unhandled rejection; siblings absorb this via mutations
    try { await resolveOrder(resolveKey) } catch (e) { console.error(e); return }
    queryClient.invalidateQueries({ queryKey: ['order-list'] })
    queryClient.invalidateQueries({ queryKey: ['order-tab-counts'] })
    navigate('/orders')
  }, [resolveKey, queryClient, navigate])

  // ── Navbar contextual mode: register latest handlers via a ref ──
  const saveForLaterRef = useRef(handleSaveForLater)
  useEffect(() => { saveForLaterRef.current = handleSaveForLater })
  useEffect(() => {
    if (resolveMode) return // resolution keeps the normal navbar (no Save for Later / ✕)
    enterCreateOrderMode({
      onSaveForLater: () => saveForLaterRef.current(),
      onClose: () => setModalOpen(true), // ✕ = same path as Cancel
    })
    return () => exitCreateOrderMode()
  }, [enterCreateOrderMode, exitCreateOrderMode, resolveMode])

  // ── Submit ──
  const onSubmit = handleSubmit((values) => {
    createOrderMutation.mutate(values, {
      onSuccess: (response) => {
        exitCreateOrderMode() // confirmation gets the normal navbar (plan decision 25)
        onSubmitted({ response, values })
      },
    })
  })

  const SECTION_KEYS = ['general', 'pickupDelivery', 'products', 'specialServices']
  const allExpanded = SECTION_KEYS.every((k) => expanded[k])

  const handleExpandCollapse = () => {
    if (allExpanded) {
      setExpanded({ general: false, pickupDelivery: false, products: false, specialServices: false })
    } else {
      setExpanded({ general: true, pickupDelivery: true, products: true, specialServices: true })
    }
  }

  const sectionRefs = {
    general: useRef(null),
    pickupDelivery: useRef(null),
    products: useRef(null),
    specialServices: useRef(null),
  }

  // PARKED (Manuela 2026-06-12): accordion auto-scroll disabled — the
  // minimal-reveal approach didn't feel right in practice. Revisit later;
  // the goal stands: never lose the click anchor, but show the opened
  // content (not just a glimpse). sectionRefs kept for that revisit.
  const toggle = (key) => (next) => {
    setExpanded(e => ({ ...e, [key]: next }))
  }

  return (
    <FormProvider {...methods}>
     <ResolveModeProvider value={resolveCtx}>
      <div className="co-content">
        <nav className="co-breadcrumb" aria-label="Breadcrumb">
          <Breadcrumb label="Orders" onClick={() => navigate('/orders')} />
          <Breadcrumb
            label={resolveMode ? 'Order Validation Error Resolution' : 'Create new order'}
            current
          />
        </nav>

        {resolveMode ? (
          <>
            {/* Back link takes the PageHeader actions slot; the order number
                sits under the title as a sub-heading (mock 6005:39544). */}
            <PageHeader title="Order Validation Error Resolution">
              <Button
                variant="link"
                className="btn--link-black"
                icon={<ArrowLeft size={16} />}
                onClick={() => navigate('/orders')}
              >
                Back to overview page
              </Button>
            </PageHeader>
            <p className="text-label-sm-regular co-resolve-subheading">Order Number {resolveKey}</p>
          </>
        ) : (
          <PageHeader title="Create New Order">
            <Button
              variant="link"
              className="co-expand-toggle"
              icon={allExpanded
                ? <ListChevronsDownUp size={16} />
                : <ListChevronsUpDown size={16} />}
              onClick={handleExpandCollapse}
            >
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </Button>
          </PageHeader>
        )}

        {!resolveMode && bannerOpen && (
          <div className="co-banner-enter">
            {/* LINX-12257 (2026-07-27 comment supersedes AC) */}
            <Alert variant="warning" onClose={() => setBannerOpen(false)}>
              Fields marked with an asterisk (*) are required
            </Alert>
          </div>
        )}

        {resolveMode && resolveState && (
          <>
            <div ref={alertSentinelRef} className="co-resolve-sentinel" aria-hidden="true" />
            <div ref={alertWrapRef} className={alertDocked ? 'co-resolve-alert co-resolve-alert--docked' : 'co-resolve-alert'}>
              <Alert
                errors={alertErrors}
                contextText={resolveState.contextText}
                expanded={alertDocked ? false : alertExpanded}
                onToggle={setAlertExpanded}
                docked={alertDocked}
                errorIndex={errorIndex}
                onErrorNav={handleErrorNav}
              />
            </div>
          </>
        )}

        {saveGateError && (
          <Alert variant="error" onClose={() => setSaveGateError('')}>
            {saveGateError}
          </Alert>
        )}

        {saveNotice && (
          <Alert variant="success" onClose={() => setSaveNotice('')}>
            {saveNotice}
          </Alert>
        )}

        {/* The CSS blanket only stops the mouse — locked fields are still
            tabbable and typable, which would also let bad values through the
            Save gate. Bounce focus back out of anything that isn't a field the
            user is here to fix. Accordion headers live outside __content and
            stay focusable. */}
        <div
          className={resolveMode ? 'co-sections co-resolve' : 'co-sections'}
          onFocusCapture={resolveMode ? (e) => {
            if (!e.target.closest('.accordion__content')) return
            if (!e.target.closest('.form-field--error, .form-field--validated, .search-field--error, .search-field--validated')) e.target.blur()
          } : undefined}
        >
          <div ref={sectionRefs.general}>
            <Accordion
              position="start"
              status={accordionStatus('general')}
              errorCount={accordionErrorCount('general')}
              title="General Information"
              expanded={expanded.general}
              onToggle={toggle('general')}
            >
              <GeneralInformationSection />
            </Accordion>
          </div>

          <div ref={sectionRefs.pickupDelivery}>
            <Accordion
              position="mid"
              status={accordionStatus('pickupDelivery')}
              errorCount={accordionErrorCount('pickupDelivery')}
              title="Pickup and Delivery"
              expanded={expanded.pickupDelivery}
              onToggle={toggle('pickupDelivery')}
            >
              <PickupDeliverySection />
            </Accordion>
          </div>

          {/* Expanded Product Information breaks out horizontally to reduce the
              grid's scroll (24px side paddings — user directive 2026-07-28) */}
          <div ref={sectionRefs.products} className={expanded.products ? 'co-breakout' : undefined}>
            <Accordion
              position="mid"
              status={accordionStatus('products')}
              errorCount={accordionErrorCount('products')}
              title="Product Information"
              expanded={expanded.products}
              onToggle={toggle('products')}
            >
              <ProductInformationSection />
            </Accordion>
          </div>

          <div ref={sectionRefs.specialServices}>
            <Accordion
              position="end"
              status={accordionStatus('specialServices')}
              errorCount={accordionErrorCount('specialServices')}
              title="Special Services (Optional)"
              expanded={expanded.specialServices}
              onToggle={toggle('specialServices')}
            >
              <SpecialServicesSection />
            </Accordion>
          </div>
        </div>

        {createOrderMutation.isError && (
          <Alert variant="error" showClose={false}>
            Something went wrong creating the order. Your entries are intact — try again.
          </Alert>
        )}
      </div>

      {resolveMode ? (
        <StickyFooter
          saveLabel="Purge"
          primaryLabel="Save"
          onCancel={() => navigate('/orders')}
          onSave={() => setPurgeOpen(true)}
          onCreate={finishResolve}
          createDisabled={!allResolved}
        />
      ) : (
        <StickyFooter
          onCancel={() => setModalOpen(true)}
          onSave={handleSave}
          onCreate={onSubmit}
          createDisabled={!formState.isValid || createOrderMutation.isPending}
          saving={saveDraftMutation.isPending}
        />
      )}

      {purgeOpen && (
        <ModalMedium
          title="Confirmation"
          onClose={() => setPurgeOpen(false)}
          ariaLabel="Purge order confirmation"
          footer={
            <>
              <Button variant="secondary" size="lg" onClick={() => setPurgeOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  setPurgeOpen(false)
                  finishResolve()
                }}
              >
                Yes
              </Button>
            </>
          }
        >
          <p className="text-label-sm-regular">Are you sure you want to purge this Order?</p>
        </ModalMedium>
      )}

      {modalOpen && (
        <DiscardSaveModal
          onClose={() => setModalOpen(false)}
          onSaveForLater={handleSaveForLater}
          onDiscard={handleDiscard}
          saving={saveDraftMutation.isPending}
        />
      )}
     </ResolveModeProvider>
    </FormProvider>
  )
}
