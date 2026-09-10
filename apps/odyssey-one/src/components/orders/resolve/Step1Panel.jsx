import { useMemo, useState } from 'react'
import { Accordion, Alert, EmptyState } from '@odyssey/ui'
import { CircleCheck } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import ConflictPicker from './ConflictPicker.jsx'
import StructuralGrid, { isStructuralFixed } from './StructuralGrid.jsx'
import MessageControlBlock from './MessageControlBlock.jsx'
import StickyFooter from '../create/StickyFooter.jsx'
import { freightTermLabel } from '../../../data/master-data'

const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)

/**
 * Wire code → human label, for the ONE conflict path that has a label table in
 * master-data. Every other path (planning date type 'SHIP'/'DELIVERY', cities,
 * dates, postals) is already human-readable on the wire and has no table — we
 * show the received value rather than invent a vocabulary the backend doesn't
 * share. `freightTermLabel` already falls back to the code for an unknown one.
 */
const optionLabel = (path, value) => (path === 'general.freightTerm' ? freightTermLabel(value) : value)

/**
 * The read-only "Received order data" accordion (16049 AC "show all fields").
 * Header-level fields only: the per-LINE data is what the two error accordions
 * above already show, field by field, where it can actually be acted on.
 */
const RECEIVED_FIELDS = [
  ['Equipment', 'general.equipment'], ['Freight Term', 'general.freightTerm'], ['Ship Direction', 'general.shipDirection'],
  ['Planning Date Type', 'pickupDelivery.planningDateType'],
  ['Shipper', 'pickupDelivery.consignor.idOrgName'], ['Shipper City', 'pickupDelivery.consignor.city'], ['Shipper Postal Code', 'pickupDelivery.consignor.postal'],
  ['Consignee', 'pickupDelivery.consignee.idOrgName'], ['Consignee City', 'pickupDelivery.consignee.city'], ['Consignee Postal Code', 'pickupDelivery.consignee.postal'],
  ['Requested Ship Date', 'pickupDelivery.latePickup.date'], ['Latest Delivery Date', 'pickupDelivery.lateDelivery.date'],
]

/**
 * Step1Panel — Order Interface Errors (LINX-16049), Step 1 of the two-step
 * resolution flow.
 *
 * ITS OWN LAYOUT, NOT THE CREATE FORM. Dave via Ramesh (transcript 2026-09-10):
 * a Level-1 defect is a fault in the MESSAGE — an extra schedule, lines that
 * disagree, a bad delete flag — and "you cannot put those into any one of these
 * sections, and hence you cannot reuse those to fix such errors". So the panel
 * groups by DEFECT CLASS (Level-1 design review §2.1), not by create-form
 * section. Step 2 (Level 2, LINX-11137) keeps the create form untouched.
 *
 * The 16049 AC — "show all fields & highlight fields currently in error;
 * present all errors together at the top; selecting an error navigates to the
 * affected field" — is met by:
 *   • the validation `Alert` at the top listing EVERY Step 1 error, each row
 *     clickable → expands its class and scrolls to the control;
 *   • the three class accordions, which ARE the highlighted fields;
 *   • the collapsed read-only "Received order data" accordion, so nothing the
 *     customer sent is hidden just because it happens to be valid.
 *
 * Controlled by the shell: `derived` (a `deriveInterfaceErrors` result), `draft`
 * (its `applyErrors` output), `onValidate({ picks, structuralFixes, deleteFlag })`,
 * `onCancel`. `readOnly` + `picks` render the look-back from Step 2/3.
 */
export default function Step1Panel({
  contextText, derived, draft, readOnly = false, onValidate, onCancel,
  // The read-only look-back needs ALL THREE answers, not just the picks: the
  // shell unmounts this panel on a step change, so anything held only in local
  // state comes back EMPTY and the Structural accordion paints a red "N Errors"
  // badge on a step the timeline calls "passed" (review, 2026-09-10). The shell
  // owns them and seeds them back here.
  picks: pickedProp = {}, structuralFixes: structuralProp = {}, deleteFlag: deleteFlagProp = null,
}) {
  const [picks, setPicks] = useState(pickedProp)
  const [structuralFixes, setStructuralFixes] = useState(structuralProp)
  const [deleteFlag, setDeleteFlag] = useState(deleteFlagProp)
  const [errorIndex, setErrorIndex] = useState(0)
  const [expanded, setExpanded] = useState({ conflicts: true, structural: true, control: true, received: false })

  const products = draft.products ?? []

  /**
   * Which structural faults are GENUINELY fixed. `isStructuralFixed` is
   * imported from StructuralGrid, not re-derived here: a typed-but-wrong gross
   * weight must not count, and two definitions of "fixed" would let the
   * accordion badge, the grid's row state and `applyFixes` disagree.
   */
  const structuralFixed = useMemo(() => new Set(
    derived.structural
      .filter((s) => isStructuralFixed(products[s.line - 1], s, structuralFixes[s.id]))
      .map((s) => s.id),
  ), [derived, structuralFixes, products])

  const resolvedIds = useMemo(() => {
    const state = { picks, structuralFixed, deleteFlag }
    return new Set(derived.errors.filter((e) => derived.isResolved(e, state)).map((e) => e.id))
  }, [derived, picks, structuralFixed, deleteFlag])

  // rules 8/9/11 have no fix in the UI at all (their exit is a backend decision,
  // still open with Venkat) — so the primary can never enable for such a message.
  // KEPT DELIBERATELY REDUNDANT: isResolved() already returns false for a
  // non-editable message-control error, so this guard changes nothing today.
  // It is defence in depth on a safety-critical gate — if isResolved ever grows
  // a branch that treats an unfixable error as resolved, this still blocks the
  // submit (review, 2026-09-10).
  const hasUnresolvable = derived.messageControl.some((m) => !m.editable)
  const allResolved = derived.errors.every((e) => resolvedIds.has(e.id)) && !hasUnresolvable

  // 1:1 with derived.errors ON PURPOSE — Alert's onErrorNav emits indices into
  // the array it was handed, resolved entries included, so any filtering here
  // would silently mis-target the scroll.
  const alertErrors = derived.errors.map((e) => ({ field: e.field, reason: e.message, resolved: resolvedIds.has(e.id) }))

  const openCount = (cls) => derived.errors.filter((e) => e.class === cls && !resolvedIds.has(e.id)).length
  const totalCount = (cls) => derived.errors.filter((e) => e.class === cls).length
  // Accordion contract: 'error' + errorCount → red "N Errors" badge, 'on' +
  // errorCount → green "Completed · N Errors validated". 'off' is the neutral
  // indicator — right for a class this order simply doesn't have (and for the
  // Received-data accordion, which is never in an error state at all).
  const status = (cls) => (totalCount(cls) === 0 ? 'off' : openCount(cls) > 0 ? 'error' : 'on')
  /**
   * The badge number. NOT simply the open count: Accordion's green 'on' badge
   * reads "Completed · N Errors validated", so N must be the TOTAL — and an
   * errorCount of 0 suppresses the badge entirely, which would make a fully
   * resolved section render with no badge at all. Open count while red, total
   * while green.
   */
  const badgeCount = (cls) => (openCount(cls) > 0 ? openCount(cls) : totalCount(cls))

  /**
   * The DOM anchor for one error. Conflicts get one control each, so they
   * anchor on themselves; the structural grid and the message-control block are
   * each a single control for their whole class, so every error of that class
   * anchors on the block. Resolving the anchor here (rather than assuming
   * `l1-<id>` exists) keeps the nav honest when that changes.
   */
  const anchorId = (err) => {
    if (err.class === 'conflict') return `l1-${err.id}`
    if (err.class === 'structural') return `l1-${derived.structural[0]?.id}`
    return `l1-${derived.messageControl[0]?.id}`
  }

  const handleErrorNav = (i) => {
    const err = derived.errors[i]
    if (!err) return
    setErrorIndex(i)
    const key = err.class === 'conflict' ? 'conflicts' : err.class === 'structural' ? 'structural' : 'control'
    setExpanded((prev) => ({ ...prev, [key]: true }))
    // After the accordion has actually expanded. `scrollIntoView` is optional
    // chained: jsdom (and any non-layout host) doesn't implement it.
    requestAnimationFrame(() => document.getElementById(anchorId(err))?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }))
  }

  const received = <ReceivedData draft={draft} expanded={expanded.received} onToggle={(v) => setExpanded((p) => ({ ...p, received: v }))} />

  if (derived.errors.length === 0) {
    return (
      <div className="step1-panel">
        <EmptyState icon={<CircleCheck {...ICON_LG} />} message="No message errors were found for this order." />
        {received}
      </div>
    )
  }

  return (
    <div className="step1-panel">
      {!readOnly && (
        <Alert errors={alertErrors} contextText={contextText} defaultExpanded errorIndex={errorIndex} onErrorNav={handleErrorNav} />
      )}
      {/* Message control first: whether the message CREATES or CANCELS decides
          what the rest of the screen even means. */}
      {derived.messageControl.length > 0 && (
        <Accordion position="start" status={status('message-control')} errorCount={badgeCount('message-control')} title="Message control" description="Provenance of the message. Only the create/cancel flag can be set here." expanded={expanded.control} onToggle={(v) => setExpanded((p) => ({ ...p, control: v }))}>
          <div id={`l1-${derived.messageControl[0].id}`}>
            <MessageControlBlock rows={derived.messageControl} deleteFlag={deleteFlag} onDeleteFlag={setDeleteFlag} disabled={readOnly} />
          </div>
        </Accordion>
      )}
      {derived.conflicts.size > 0 && (
        <Accordion position="mid" status={status('conflict')} errorCount={badgeCount('conflict')} title="Cross-line conflicts" description="Lines disagree. Pick the value that applies to the whole order." expanded={expanded.conflicts} onToggle={(v) => setExpanded((p) => ({ ...p, conflicts: v }))}>
          <div className="step1-panel__list">
            {derived.errors.filter((e) => e.class === 'conflict').map((e) => (
              <ConflictPicker
                key={e.id}
                id={`l1-${e.id}`}
                label={e.field}
                message={e.message}
                options={derived.conflicts.get(e.path).map((o) => ({ ...o, label: optionLabel(e.path, o.value) }))}
                value={picks[e.path] ?? null}
                onPick={(v) => setPicks((p) => ({ ...p, [e.path]: v }))}
                disabled={readOnly}
              />
            ))}
          </div>
        </Accordion>
      )}
      {derived.structural.length > 0 && (
        <Accordion position="mid" status={status('structural')} errorCount={badgeCount('structural')} title="Structural" description="A fault inside a line. Fix it in place." expanded={expanded.structural} onToggle={(v) => setExpanded((p) => ({ ...p, structural: v }))}>
          <div id={`l1-${derived.structural[0].id}`}>
            <StructuralGrid
              products={products}
              structural={derived.structural}
              fixes={structuralFixes}
              onFix={(id, fix) => setStructuralFixes((f) => ({ ...f, [id]: { ...f[id], ...fix } }))}
              disabled={readOnly}
            />
          </div>
        </Accordion>
      )}
      {received}
      {/* No Purge on Step 1 (PO ruling): purging is a Step 2 action. Hence
          showSave={false} — Step 1 is exactly Cancel · Validate and continue. */}
      {!readOnly && (
        <StickyFooter
          showSave={false}
          onCancel={onCancel}
          onCreate={() => onValidate({ picks, structuralFixes, deleteFlag })}
          primaryLabel="Validate and continue"
          createDisabled={!allResolved}
        />
      )}
    </div>
  )
}

function ReceivedData({ draft, expanded, onToggle }) {
  return (
    <Accordion position="end" status="off" title="Received order data" description="Everything the customer system sent, as received." expanded={expanded} onToggle={onToggle}>
      <dl className="step1-panel__received">
        {RECEIVED_FIELDS.map(([label, path]) => {
          // A conflicting field has no single header value (applyErrors blanks
          // it), so show what each line actually sent. `lineValues` is absent
          // on a clean draft — hence the optional chain.
          const perLine = draft.lineValues?.[path]
          const v = getPath(draft, path)
          return (
            <div key={path} className="step1-panel__received-row">
              <dt className="text-label-xs-regular">{label}</dt>
              <dd className="text-label-sm-regular">{perLine ? perLine.map((x, i) => `line ${i + 1}: ${x}`).join(' · ') : (v || '—')}</dd>
            </div>
          )
        })}
      </dl>
    </Accordion>
  )
}
