import { useState } from 'react'
import { Truck } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { ComboBox, Button } from '@odyssey/ui'
import { TENDER_SCAC_OPTIONS, equipmentForScac, EQUIPMENT_LABELS } from '../../data/master-data.js'

/**
 * LINX-15075 — the SCAC + Equipment picker doorway into Process SCAC.
 *
 * Presentational only, same contract DroppedCarrierSection's row button
 * follows: it reports the final selection via `onProcess` and renders the
 * disabled state it is told about via `processingScac`. It validates nothing
 * and knows nothing about routing/insertion/duplicates — that all lives in
 * RoutingGuideTab (`planProcessScac`/`insertRank`).
 *
 * Both fields are ComboBox (not Dropdown) — the option lists are
 * fetched/derived (Equipment re-derives per SCAC), which is this project's
 * Dropdown-vs-ComboBox rule (data source, not fixedness).
 *
 * Revised 2026-09-01 (placement doc): collapsed to a single button by
 * default, reading as the table's trailing row rather than a form bolted
 * above it. `onProcess` now doubles as the collapse signal — RoutingGuideTab's
 * handleProcessScac/runProcessScac resolves `true` only when the carrier
 * actually landed in the table (success, or PS3 routing-failed-but-added);
 * `false` for a duplicate refusal or a write failure, both of which must
 * keep the fields on screen with the selections intact for a retry.
 */

// Static for the app's lifetime — computed once, not per render.
const SCAC_OPTIONS = TENDER_SCAC_OPTIONS.map((c) => ({ value: c.scac, label: `${c.scac} — ${c.name}` }))

export default function ProcessScacBar({ onProcess, processingScac = null }) {
  const [expanded, setExpanded] = useState(false)
  const [scac, setScac] = useState(null)
  const [equipment, setEquipment] = useState(null)
  // Kept expanded for the duration of the exit animation — React would
  // otherwise drop the controls from the DOM on the same commit and there
  // would be nothing left to animate.
  const [collapsing, setCollapsing] = useState(false)

  const finishCollapse = () => {
    setCollapsing(false)
    setExpanded(false)
    setScac(null)
    setEquipment(null)
  }

  const collapse = () => {
    // Reduced motion means the CSS sets `animation: none`, so animationend
    // never fires and the row would sit open forever. Skip straight to closed.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      finishCollapse()
      return
    }
    setCollapsing(true)
  }

  if (!expanded) {
    return (
      <div className="process-scac-bar">
        <Button variant="secondary" size="sm" onClick={() => setExpanded(true)}>
          Add Carrier
        </Button>
      </div>
    )
  }

  // PS2 — WERN legitimately resolves to []. No validation message for it: an
  // empty list rendering its own "no options" copy in the popover is not the
  // same thing as a form error, and the AC is explicit that this is not one.
  const equipmentOptions = scac
    ? equipmentForScac(scac).map((code) => ({ value: code, label: `${code} — ${EQUIPMENT_LABELS[code] ?? code}` }))
    : []

  const carrierName = TENDER_SCAC_OPTIONS.find((c) => c.scac === scac)?.name ?? null
  const canProcess = !!scac && !!equipment && processingScac == null

  return (
    // The modifier drives the staggered slide (styles/panes/tender.css). It is
    // on the container, not each control, because the stagger is nth-child
    // based — the controls themselves stay unaware of it.
    <div
      className={`process-scac-bar process-scac-bar--${collapsing ? 'collapsing' : 'expanded'}`}
      // animationend bubbles from each control, so this fires once per child.
      // Under the reversed exit stagger the FIRST child (Cancel) leaves last,
      // making its end the whole exit's end — no timer duplicating the CSS
      // duration, and nothing to drift if that duration changes.
      onAnimationEnd={(e) => {
        if (collapsing && e.target === e.currentTarget.firstChild) finishCollapse()
      }}
    >
      <Button variant="secondary" size="sm" onClick={collapse}>
        Cancel
      </Button>
      <div className="process-scac-bar__divider" />
      <div className="process-scac-bar__field process-scac-bar__field--wide">
        <ComboBox
          variant="select"
          placeholder="Select SCAC"
          options={SCAC_OPTIONS}
          value={SCAC_OPTIONS.find((o) => o.value === scac)?.label ?? ''}
          // Selecting either SCAC or Carrier Name fills the pair — both live in
          // one label, and ComboBox's default filter already matches on it.
          onSelect={(value) => {
            setScac(value)
            // AC: Equipment resets whenever SCAC changes (including a clear).
            setEquipment(null)
          }}
          onClear={() => {}}
          emptyMessage="No matching SCACs"
        />
      </div>
      <div className="process-scac-bar__field">
        <ComboBox
          variant="select"
          placeholder="Equipment"
          disabled={!scac}
          options={equipmentOptions}
          value={equipmentOptions.find((o) => o.value === equipment)?.label ?? ''}
          // Never auto-selected, even with exactly one option — only a user
          // pick lands here.
          onSelect={(value) => setEquipment(value)}
          onClear={() => {}}
          emptyMessage="No equipment options"
        />
      </div>
      <Button
        variant="primary"
        size="sm"
        icon={<Truck {...ICON_MD} aria-hidden="true" />}
        disabled={!canProcess}
        onClick={async () => {
          const added = await onProcess({ scac, carrierName, equipment })
          // Duplicate/write-failure resolve false — stay put so the user can
          // correct and retry without losing their picks.
          if (added) collapse()
        }}
      >
        Process
      </Button>
    </div>
  )
}
