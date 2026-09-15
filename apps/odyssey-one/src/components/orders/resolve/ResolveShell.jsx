import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Alert, Button, PageHeader, ResolveTimeline, Spinner } from '@odyssey/ui'
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
 *   `progress` — how far the planner has actually PROGRESSED (1 | 2 | 3);
 *                drives the timeline's `passed` flags, so the line animates
 *                the instant Validate/Save fires.
 *   `step`     — which step's status/detail/body the shell currently SHOWS.
 *                On a forward advance this lags `progress` until the line
 *                arrives (ResolveTimeline's `onArrive`, S147, user ruling:
 *                "the line's arrival is what brings the next step to life")
 *                — the previous body stays on screen and the next dot stays
 *                neutral until then. A `revealTimer` fallback fires the same
 *                reveal if `onArrive` never does (hidden tab, no preceding
 *                segment, anything unforeseen), and `prefers-reduced-motion`
 *                skips the wait entirely.
 *   `viewing`  — which body is on screen for a read-only LOOK-BACK (viewing
 *                < step). A step the planner has not reached has no
 *                `onClick`, which is what ResolveTimeline renders as locked.
 *                A look-back is instant — no line travels, nothing to await.
 *                On a forward advance `viewing` goes `null` for the transit
 *                (Validate/Save until arrival) so NEITHER step's body is
 *                rendered — a centred Spinner fills `.resolve-shell__body`
 *                instead of the old step's content sitting there frozen
 *                (user ruling, S147: "never a frozen previous step"). A
 *                look-back never sets `viewing` to `null` — only a forward
 *                advance does.
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
  const [progress, setProgress] = useState(1) // real progress — drives `passed` immediately
  const [step, setStep] = useState(1) // what's shown — lags `progress` until the line arrives
  const [viewing, setViewing] = useState(1)
  const revealTimer = useRef(null)
  // S147: reveal the next step's status/body. Called either by
  // ResolveTimeline's `onArrive` (line lands) or by the fallback timer below.
  // Idempotent-safe: whichever fires first wins, the other is cancelled.
  const reveal = useCallback((n) => {
    clearTimeout(revealTimer.current)
    setStep(n)
    setViewing(n)
  }, [])
  // Belt-and-braces: if `onArrive` never fires (reduced motion already
  // short-circuits below, but also a hidden/throttled tab, or any path not
  // foreseen), reveal anyway once the fill + pop would have finished — same
  // total as ResolveTimeline's own fill+pop (900 fill + 350 pop, S147) so the
  // fallback never fires BEFORE a real arrival could have.
  const scheduleReveal = useCallback((n) => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      reveal(n)
      return
    }
    clearTimeout(revealTimer.current)
    revealTimer.current = setTimeout(() => reveal(n), 900 + 350)
  }, [reveal])
  useEffect(() => () => clearTimeout(revealTimer.current), [])
  // Stable identity, not an inline arrow: ResolveTimeline's arrival effect is
  // keyed on [steps, onArrive], and `steps` already changes every render this
  // shell re-renders on — a fresh function here would re-run that effect's
  // cleanup and clear the pending arrival timer before it ever fires.
  const handleArrive = useCallback((key) => reveal(Number(key.slice(1))), [reveal])
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
  // S147: Step 1's live open-error count, reported by Step1Panel as the
  // planner works (its `onProgress` — a plain setter, not lifted state: the
  // panel already owns picks/structuralFixes/deleteFlag and already computes
  // this count off `derived.isResolved`, so a setter is the smallest way to
  // get the number out without duplicating that rule here). Drives the
  // timeline dot going green the moment every Step 1 error is resolved,
  // still on Step 1 — a solved step is progress, not a blocker (user ruling).
  const [step1OpenCount, setStep1OpenCount] = useState(0)
  // S147: same rule as step1OpenCount, mirrored for Step 2 — CreateOrderForm
  // already derives its Level-2 open-error count off resolveState; this just
  // catches what it reports, no second derivation.
  const [step2OpenCount, setStep2OpenCount] = useState(null)
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
      clearTimeout(revealTimer.current)
      setProgress(start)
      setStep(start)
      setViewing(start)
      setStep1({ picks: {}, structuralFixes: {}, deleteFlag: null })
      setStep1OpenCount(derived.errors.length)
      setStep2OpenCount(null)
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
    setStep2OpenCount(null)
    // S147: `progress` flips now (line animates); `step`/`viewing` — Step 2's
    // real status and body — wait for the line to arrive (or the fallback).
    // `viewing` goes null for the transit: a Spinner fills the body instead
    // of Step 1's now-stale content sitting there frozen.
    setProgress(2)
    setViewing(null)
    scheduleReveal(2)
  }, [loaded, orderNumber, scheduleReveal])

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
        detail: !loaded ? '' : step === 1
          ? (step1OpenCount > 0 ? `${plural(step1OpenCount)} · in progress` : 'all errors resolved · ready to continue')
          : l1Count ? `passed · ${plural(l1Count)} fixed` : 'no errors',
        // Current step reads GREEN once its open errors hit zero — solved is
        // progress, not a blocker (user ruling, S147). Passed steps (step > 1)
        // stay green regardless; unreached steps are handled below ('off').
        status: !loaded ? 'off' : step === 1 ? (step1OpenCount > 0 ? 'error' : 'on') : 'on',
        // S147: line only fills once the planner has ADVANCED past the step —
        // keyed on `progress`, not `viewing` (look-back) or `step` (which
        // lags until arrival) — so the line starts moving the instant
        // Validate fires, and opening Step 1 read-only doesn't un-green it.
        passed: progress > 1,
        onClick: step > 1 && viewing !== 1 ? () => setViewing(1) : undefined,
      },
      {
        key: 's2',
        label: 'Data errors',
        // Same rule as Step 1 (S147, user ruling): current step reads green
        // once its open errors hit zero — solved is progress, not a blocker.
        // `step2OpenCount === null` means CreateOrderForm hasn't reported yet
        // (just mounted / no resolveState) — treated as "in progress", not a
        // premature green flash.
        detail: step < 2 ? 'locked' : step === 2
          ? (step2OpenCount === 0 ? 'all errors resolved · ready to continue' : 'in progress')
          : 'passed',
        status: step < 2 ? 'off' : step === 2 ? (step2OpenCount === 0 ? 'on' : 'error') : 'on',
        passed: progress > 2,
        onClick: step >= 2 && viewing !== 2 ? () => setViewing(2) : undefined,
      },
      {
        key: 's3',
        label: 'Order ready',
        detail: step === 3 ? 'ready for planning' : '—',
        status: step === 3 ? 'on' : 'off',
        passed: false,
        onClick: step === 3 && viewing !== 3 ? () => setViewing(3) : undefined,
      },
    ]
  }, [loaded, step, progress, viewing, l1Count, step1OpenCount, step2OpenCount])

  return (
    <div className="resolve-shell">
      <div className="co-content resolve-shell__head">
        <PageHeader title="Order Validation Error Resolution">
          <Button variant="link" className="btn--link-black" icon={<ArrowLeft size={16} />} onClick={() => navigate('/orders')}>
            Back to overview page
          </Button>
        </PageHeader>
        <p className="text-label-sm-regular co-resolve-subheading">Order Number {orderNumber}</p>
        <ResolveTimeline
          className="resolve-shell__timeline"
          steps={steps}
          current={viewing != null ? `s${viewing}` : undefined}
          onArrive={handleArrive}
        />
        {saveError && (
          <Alert variant="error" onClose={() => setSaveError('')}>{saveError}</Alert>
        )}
      </div>

      <div className="resolve-shell__body">
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
          onProgress={setStep1OpenCount}
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
          onProgress={setStep2OpenCount}
          onResolved={(values) => { setFinalValues(values); setProgress(3); setViewing(null); scheduleReveal(3) }}
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
      {/* S147: viewing is null only mid-transit on a forward advance (never on
          a look-back) — neither step's body renders, a centred Spinner fills
          the gap instead of the previous step's now-stale content. */}
      {loaded && viewing == null && (
        <div className="resolve-shell__transit">
          <Spinner size={32} />
        </div>
      )}
      </div>
    </div>
  )
}
