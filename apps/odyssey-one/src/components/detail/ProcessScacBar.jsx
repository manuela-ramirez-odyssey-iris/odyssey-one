import { useState } from 'react'
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
 */

// Static for the app's lifetime — computed once, not per render.
const SCAC_OPTIONS = TENDER_SCAC_OPTIONS.map((c) => ({ value: c.scac, label: `${c.scac} — ${c.name}` }))

export default function ProcessScacBar({ onProcess, processingScac = null }) {
  const [scac, setScac] = useState(null)
  const [equipment, setEquipment] = useState(null)

  // PS2 — WERN legitimately resolves to []. No validation message for it: an
  // empty list rendering its own "no options" copy in the popover is not the
  // same thing as a form error, and the AC is explicit that this is not one.
  const equipmentOptions = scac
    ? equipmentForScac(scac).map((code) => ({ value: code, label: `${code} — ${EQUIPMENT_LABELS[code] ?? code}` }))
    : []

  const carrierName = TENDER_SCAC_OPTIONS.find((c) => c.scac === scac)?.name ?? null
  const canProcess = !!scac && !!equipment && processingScac == null

  return (
    <div className="process-scac-bar">
      <div className="process-scac-bar__field">
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
        variant="secondary"
        size="sm"
        disabled={!canProcess}
        onClick={() => onProcess({ scac, carrierName, equipment })}
      >
        Process SCAC
      </Button>
    </div>
  )
}
