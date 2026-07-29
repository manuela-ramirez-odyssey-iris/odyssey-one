import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Accordion, Alert, Breadcrumb, Button, PageHeader } from '@odyssey/ui'
import { ArrowLeft, ListChevronsUpDown, ListChevronsDownUp } from 'lucide-react'
import { deriveValidationErrors } from '../resolve/validationErrors.js'
import { ResolveModeProvider } from '../resolve/ResolveModeContext.jsx'
import { useCreateOrderMode } from '../../../contexts/CreateOrderModeContext.jsx'
import { useCreateOrder } from '../../../api/queries/useCreateOrder'
import { useSaveDraft } from '../../../api/queries/useSaveDraft'
import { getDraft, getOrderView } from '../../../api/services/orderService'
import { makeDefaultOrderFormValues } from '../../../api/types/orderFormVm'
import { createOrderSchema, saveGateSchema } from './schema'
import { useSectionStatus } from './useSectionStatus.js'
import StickyFooter from './StickyFooter.jsx'
import DiscardSaveModal from './DiscardSaveModal.jsx'
import GeneralInformationSection from './sections/GeneralInformationSection.jsx'
import PickupDeliverySection from './sections/PickupDeliverySection.jsx'
import ProductInformationSection from './sections/ProductInformationSection.jsx'
import SpecialServicesSection from './sections/SpecialServicesSection.jsx'

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
    getOrderView(resolveKey).then((values) => {
      if (cancelled || !values) return
      const errorCount = resolveMeta?.errorCount ?? 3
      const { errors, applyErrors, isResolved } = deriveValidationErrors(resolveKey, errorCount, values)
      reset(applyErrors(values))
      const source = resolveMeta?.customer ? ` · Integrated from ${resolveMeta.customer}` : ''
      setResolveState({ errors, isResolved, contextText: `${resolveKey}${source}` })
    })
    return () => { cancelled = true }
  }, [resolveKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const watchedAll = useWatch({ control })
  const resolvedSet = useMemo(() => {
    if (!resolveState) return new Set()
    const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)
    return new Set(
      resolveState.errors
        .filter((e) => resolveState.isResolved(e, get(watchedAll, e.path)))
        .map((e) => e.path),
    )
  }, [resolveState, watchedAll])
  const errorByPath = useMemo(
    () => new Map((resolveState?.errors ?? []).map((e) => [e.path, e])),
    [resolveState],
  )
  const allResolved = !!resolveState && resolvedSet.size === resolveState.errors.length
  const resolveCtx = useMemo(
    () => (resolveMode ? { errorByPath, resolvedSet } : null),
    [resolveMode, errorByPath, resolvedSet],
  )

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

  // Resolution Save — the resubmit-to-OIF transition. Stub; Task 6 fills it in.
  const handleResolveSave = () => {}

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

        <div className="co-sections">
          <div ref={sectionRefs.general}>
            <Accordion
              position="start"
              status={status.general ? 'on' : 'off'}
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
              status={status.pickupDelivery ? 'on' : 'off'}
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
              status={status.products ? 'on' : 'off'}
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
              status={status.specialServices ? 'on' : 'off'}
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
          onCreate={handleResolveSave}
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
