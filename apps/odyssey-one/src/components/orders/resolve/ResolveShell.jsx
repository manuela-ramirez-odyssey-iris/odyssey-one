import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Alert, Button, PageHeader, ResolveTimeline } from '@odyssey/ui'
import CreateOrderForm from '../create/CreateOrderForm.jsx'
import ConfirmationView from '../create/ConfirmationView.jsx'
import Step1Panel from './Step1Panel.jsx'
import { deriveInterfaceErrors } from './interfaceErrors.js'
import { getOrderList, getOrderView, saveInterfaceFixes } from '../../../api/services/orderService'

/**
 * ResolveShell — the OIF resolution page. Jira split the work in two
 * (LINX-16049 Level 1 = "can this message even be transformed?", LINX-11137
 * Level 2 = master-data validation), and the user ruled 2026-09-09 that the
 * two are STEPS ON A TIMELINE, NOT TABS: "tabs mean options, not steps". A
 * third step previews the resolved order.
 *
 * Navigation is BOTH WAYS, EDITABLE ONLY FORWARD:
 *   `step`    — how far the planner has actually PROGRESSED (1 | 2 | 3)
 *   `viewing` — which body is on screen
 * They differ during a read-only look-back (viewing < step). A step the
 * planner has not reached has no `onClick`, which is what ResolveTimeline
 * renders as locked.
 *
 * Entry (LINX-16049 §II): Level 1 errors → Step 1; none → Step 2 with dot 1
 * already passed. "Validate and continue" SAVES the Step 1 fixes immediately
 * (Ramesh, PO, 2026-09-10 #2) and re-mounts Step 2 on the saved values so its
 * Level 2 errors derive from the FIXED order (LINX-11137 §E "real time").
 *
 * SEED CAVEAT: `interfaceErrorCount` / `interfaceErrorClass` are mock-only —
 * Neon has no column for them (Q-OIF-4). In LIVE every order reports 0 Level 1
 * errors and therefore opens straight at Step 2. Expected, not a bug.
 */
export default function ResolveShell({ orderNumber }) {
  const navigate = useNavigate()
  const location = useLocation()
  const meta = location.state ?? {}
  const [loaded, setLoaded] = useState(null) // { derived, draft, values }
  const [step, setStep] = useState(1)
  const [viewing, setViewing] = useState(1)
  /**
   * ALL THREE pieces of Step 1's answer live here, not just `picks`
   * (amendment, Task 7 review #1). Step1Panel seeds `structuralFixes` and
   * `deleteFlag` from local state at MOUNT, and a step change unmounts it —
   * so handing back only `picks` would re-render the look-back with the
   * structural rows unfixed and the delete flag unanswered, painting a RED
   * "N Errors" badge on a step the timeline calls "passed". The shell needs
   * `structuralFixes` for `applyFixes` anyway, so it owns all three.
   */
  const [step1, setStep1] = useState({ picks: {}, structuralFixes: {}, deleteFlag: null })
  const [step2Key, setStep2Key] = useState(0)
  const [finalValues, setFinalValues] = useState(null)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    let cancelled = false
    // A deep link (or a refresh) has no history state, so the Level 1 metadata
    // falls back to a one-row list fetch — same seam CreateOrderForm uses for
    // errorCount. A failed fetch degrades to "no Level 1 errors" (Step 2),
    // which is exactly what live mode looks like today.
    const metaPromise = meta.interfaceErrorCount != null
      ? Promise.resolve({ count: meta.interfaceErrorCount, klass: meta.interfaceErrorClass })
      : getOrderList({ pagination: { pageNumber: 1, pageSize: 1 }, filters: { orderNumbers: [orderNumber] } })
        .then((res) => ({ count: res.orders[0]?.interfaceErrorCount ?? 0, klass: res.orders[0]?.interfaceErrorClass ?? null }))
        .catch(() => ({ count: 0, klass: null }))
    Promise.all([getOrderView(orderNumber), metaPromise]).then(([values, m]) => {
      if (cancelled || !values) return
      const derived = deriveInterfaceErrors(orderNumber, m.count, m.klass, values)
      const start = derived.errors.length ? 1 : 2
      setLoaded({ derived, draft: derived.applyErrors(values), values })
      setStep(start)
      setViewing(start)
      setStep1({ picks: {}, structuralFixes: {}, deleteFlag: null })
    })
    return () => { cancelled = true }
  }, [orderNumber]) // eslint-disable-line react-hooks/exhaustive-deps -- meta is history state; it never changes under a mounted shell

  const contextText = `${orderNumber}${meta.customer ? ` · Integrated from ${meta.customer}` : ''}`

  const handleValidate = useCallback(async ({ picks, structuralFixes, deleteFlag }) => {
    const fixed = loaded.derived.applyFixes(loaded.values, picks, structuralFixes)
    // PO ruling: Step 1 commits on Validate, it is not held until the Step 2
    // Save. `saveInterfaceFixes` also zeroes the row's Level 1 count, so the
    // remount below re-derives Step 2 from the persisted, fixed order.
    try {
      await saveInterfaceFixes(orderNumber, fixed)
    } catch (e) {
      // Same rule the form applies to a failed purge (Task 8 ruling): a write
      // that failed must SAY so. A bare `return` here left the planner on an
      // unchanged Step 1 with no explanation for why nothing happened.
      console.error(e)
      setSaveError(`Couldn't save the message fixes for order ${orderNumber}. ${e?.message || 'Please try again.'}`)
      return
    }
    setSaveError('')
    setStep1({ picks, structuralFixes, deleteFlag })
    setLoaded((l) => ({ ...l, values: fixed }))
    // CreateOrderForm hydrates in an effect keyed on [resolveKey], which does
    // NOT change here — only a remount re-runs it. Hence the key bump.
    setStep2Key((k) => k + 1)
    setStep(2)
    setViewing(2)
  }, [loaded, orderNumber])

  // Every number the timeline shows comes from the DERIVED error list, never
  // from the seeded `interfaceErrorCount`: the seed is clamped per class, so
  // the two can legitimately disagree and the derive is what is on screen.
  const l1Count = loaded?.derived.errors.length ?? 0
  const steps = useMemo(() => {
    const plural = (n) => `${n} error${n === 1 ? '' : 's'}`
    return [
      {
        key: 's1',
        label: 'Message errors',
        detail: !loaded ? '' : step === 1 ? `${plural(l1Count)} · in progress` : l1Count ? `passed · ${plural(l1Count)} fixed` : 'no errors',
        status: !loaded ? 'off' : step === 1 ? 'error' : 'on',
        onClick: step > 1 && viewing !== 1 ? () => setViewing(1) : undefined,
      },
      {
        key: 's2',
        label: 'Data errors',
        detail: step < 2 ? 'locked' : step === 2 ? 'in progress' : 'passed',
        status: step < 2 ? 'off' : step === 2 ? 'error' : 'on',
        onClick: step >= 2 && viewing !== 2 ? () => setViewing(2) : undefined,
      },
      {
        key: 's3',
        label: 'Order ready',
        detail: step === 3 ? 'ready for planning' : '—',
        status: step === 3 ? 'on' : 'off',
        onClick: step === 3 && viewing !== 3 ? () => setViewing(3) : undefined,
      },
    ]
  }, [loaded, step, viewing, l1Count])

  return (
    <div className="resolve-shell">
      <div className="co-content resolve-shell__head">
        <PageHeader title="Order Validation Error Resolution">
          <Button variant="link" className="btn--link-black" icon={<ArrowLeft size={16} />} onClick={() => navigate('/orders')}>
            Back to overview page
          </Button>
        </PageHeader>
        <p className="text-label-sm-regular co-resolve-subheading">Order Number {orderNumber}</p>
        <ResolveTimeline className="resolve-shell__timeline" steps={steps} current={`s${viewing}`} />
        {saveError && (
          <Alert variant="error" onClose={() => setSaveError('')}>{saveError}</Alert>
        )}
      </div>

      {loaded && viewing === 1 && (
        <Step1Panel
          orderNumber={orderNumber}
          contextText={contextText}
          derived={loaded.derived}
          draft={loaded.draft}
          readOnly={step > 1}
          picks={step1.picks}
          structuralFixes={step1.structuralFixes}
          deleteFlag={step1.deleteFlag}
          onValidate={handleValidate}
          onCancel={() => navigate('/orders')}
        />
      )}
      {loaded && viewing === 2 && (
        <CreateOrderForm
          key={step2Key}
          resolveKey={orderNumber}
          resolveMeta={meta}
          hideHeader
          pickedPaths={Object.keys(step1.picks)}
          onResolved={(values) => { setFinalValues(values); setStep(3); setViewing(3) }}
          /* A FAILED purge is surfaced by the form itself (its page-level error
             Alert) — this only runs on success. */
          onPurged={() => navigate('/orders')}
        />
      )}
      {viewing === 3 && (
        <div className="order-summary-page resolve-shell__preview">
          {/* variant="sync" + a real data.orderNumber: an integrated order
              always HAS its number, so the confirmation renders the success
              state immediately and never arms the async-assignment timer or
              the navbar notification. */}
          <ConfirmationView
            data={{ orderNumber }}
            values={finalValues ?? loaded?.values}
            variant="sync"
            /* The order was RESOLVED, not created — the create-flow copy would
               tell the planner something untrue (user ruling 2026-09-10).
               "Ready for Planning" is LINX-11137 §D's own wording for what
               Complete means: the order is now in the Order Table. */
            successMessage="Order validation errors resolved. The order is now Ready for Planning."
          />
          <div className="resolve-shell__preview-footer">
            <Button variant="primary" size="lg" onClick={() => navigate('/orders')}>Back to overview</Button>
          </div>
        </div>
      )}
    </div>
  )
}
