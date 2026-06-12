import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Accordion, Alert, Button, PageHeader } from '@odyssey/ui'
import { ListChevronsUpDown, ListChevronsDownUp } from 'lucide-react'
import { useCreateOrderMode } from '../../../contexts/CreateOrderModeContext.jsx'
import { useCreateOrder } from '../../../api/queries/useCreateOrder'
import { useSaveDraft } from '../../../api/queries/useSaveDraft'
import { getDraft } from '../../../api/services/orderService'
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
export default function CreateOrderForm({ draftKey, onSubmitted }) {
  const navigate = useNavigate()
  const { enterCreateOrderMode, exitCreateOrderMode } = useCreateOrderMode()
  const methods = useForm({
    resolver: zodResolver(createOrderSchema),
    mode: 'onChange',
    defaultValues: makeDefaultOrderFormValues(),
  })
  const { control, formState, getValues, handleSubmit, reset } = methods

  const [expanded, setExpanded] = useState({
    general: true, pickupDelivery: false, products: false, specialServices: false,
  })
  const [bannerOpen, setBannerOpen] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saveGateError, setSaveGateError] = useState('')
  const [saveNotice, setSaveNotice] = useState('')
  const [draftId, setDraftId] = useState(null)

  const status = useSectionStatus(control)
  const createOrderMutation = useCreateOrder()
  const saveDraftMutation = useSaveDraft()

  // ── Draft reopen (spec §4): /orders/create?draft=<orderNumber> ──
  useEffect(() => {
    if (!draftKey) return
    let cancelled = false
    getDraft(draftKey).then((draft) => {
      if (cancelled || !draft) return
      reset(draft.values)
      setDraftId(draft.draftId)
    })
    return () => { cancelled = true }
  }, [draftKey, reset])

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

  // ── Navbar contextual mode: register latest handlers via a ref ──
  const saveForLaterRef = useRef(handleSaveForLater)
  useEffect(() => { saveForLaterRef.current = handleSaveForLater })
  useEffect(() => {
    enterCreateOrderMode({
      onSaveForLater: () => saveForLaterRef.current(),
      onClose: () => setModalOpen(true), // ✕ = same path as Cancel
    })
    return () => exitCreateOrderMode()
  }, [enterCreateOrderMode, exitCreateOrderMode])

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

  // Scroll philosophy: the user must not lose the spot they clicked.
  // Expand scrolls the MINIMUM needed to show the opened content:
  //   - content already fully visible  → no scroll at all
  //   - content taller than the viewport → align section top below the navbar
  //     (the most content a single viewport can show)
  //   - content runs below the fold but fits → nudge just enough to reveal it
  //     (block: 'nearest' — the header barely moves)
  // Collapse never scrolls: the clicked header stays under the cursor.
  const toggle = (key) => (next) => {
    setExpanded(e => ({ ...e, [key]: next }))
    if (!next) return
    requestAnimationFrame(() => {
      const el = sectionRefs[key].current
      if (!el) return
      const scroller = el.closest('main')
      const view = scroller ? scroller.getBoundingClientRect() : { top: 0, bottom: window.innerHeight }
      const rect = el.getBoundingClientRect()
      if (rect.top >= view.top && rect.bottom <= view.bottom) return
      const block = rect.height > view.bottom - view.top ? 'start' : 'nearest'
      el.scrollIntoView({ behavior: 'smooth', block })
    })
  }

  return (
    <FormProvider {...methods}>
      <div className="co-content">
        <nav className="co-breadcrumb text-label-sm-regular" aria-label="Breadcrumb">
          <Link to="/orders">Orders</Link>
          <span aria-hidden="true">›</span>
          <span>Create new order</span>
        </nav>

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

        {bannerOpen && (
          <Alert variant="warning" onClose={() => setBannerOpen(false)}>
            Required fields will complete steps.
          </Alert>
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
              description="Order identifiers, organization, equipment, and references"
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
              description="Consignor, consignee, and planning dates"
              expanded={expanded.pickupDelivery}
              onToggle={toggle('pickupDelivery')}
            >
              <PickupDeliverySection />
            </Accordion>
          </div>

          <div ref={sectionRefs.products}>
            <Accordion
              position="mid"
              status={status.products ? 'on' : 'off'}
              title="Product Information 🚧 Under Construction"
              description="Products on this order"
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
              description="Service requirements pulled from master data"
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

      <StickyFooter
        onCancel={() => setModalOpen(true)}
        onSave={handleSave}
        onCreate={onSubmit}
        createDisabled={!formState.isValid || createOrderMutation.isPending}
        saving={saveDraftMutation.isPending}
      />

      {modalOpen && (
        <DiscardSaveModal
          onClose={() => setModalOpen(false)}
          onSaveForLater={handleSaveForLater}
          onDiscard={handleDiscard}
          saving={saveDraftMutation.isPending}
        />
      )}
    </FormProvider>
  )
}
