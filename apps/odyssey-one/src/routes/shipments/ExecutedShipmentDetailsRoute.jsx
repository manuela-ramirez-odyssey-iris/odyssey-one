import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Breadcrumb, PageHeader, Alert, Button, StepperButtonsFooter } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import ExecutedShipmentAccordions, { SECTION_KEYS } from '../../components/pgipgr/ExecutedShipmentAccordions'
import { initialFieldValues, SELL_SHIPMENT_NUMBER, SELL_EDIT_FIELD_IDS } from '../../components/pgipgr/executedShipmentData'
import { showToast } from '../../utils/toast'
import useSheet from '../useSheet'

// /shipments/executed/:id — Executed Shipment Details, three modes off the
// SAME data module + accordion renderer (2026-09-24/25 Figma + Jira passes,
// x38TOJGsNryYl3LsKhCtSc):
//   EDIT       (?mode=edit, node 2577:77880) — from Post PGI/PGR Errors rows.
//              Editable inputs, red error fields, sticky footer (Cancel /
//              Mark as shipped).
//   SELL-EDIT  (?mode=sell-edit) — from the All Sell Shipments table's
//              per-row Edit action (Jira story). Renders VIEW-shaped
//              (TitleSubtitle, no error states) except a 3-field editable
//              whitelist (SELL_EDIT_FIELD_IDS): Equipment + Shipment Weight
//              (Header), Shipment Weight (Line > Product Details). Sticky
//              footer labeled Cancel / Save.
//   READ-ONLY  (?mode=view or absent, node 2701:9930, default) — from All
//              Sell Shipments (Shipment ID link) / Rating Errors / Not
//              Responsible rows. Label/value text only, no footer.
// `?mode` travels in the sheet URL itself (PgipgrTable's openSheet call) so
// it survives the sheet stack the same way the path does.
//
// UI-only: EDIT/SELL-EDIT fields are editable in LOCAL state, nothing persists.
// Reached from a Shipment ID link (or, sell-edit, the row Edit action) in any
// of the 4 PGI/PGR category tables, opened as a SHEET (docs/superpowers/plans/
// 2026-09-23-slide-over-routes.md) — same convention as OrderChangeEditStopsRoute
// / OrderSummaryRoute / OrderAuditTrailRoute: PgipgrTable's link calls
// openSheet, every exit here calls closeSheet('/shipments') so the live
// PGI/PGR panel underneath (never unmounted) is exactly where the planner
// left it, slide-out included.
export default function ExecutedShipmentDetailsRoute() {
  const [searchParams] = useSearchParams()
  const rawMode = searchParams.get('mode')
  const mode = rawMode === 'edit' || rawMode === 'sell-edit' ? rawMode : 'view'
  // Accordions render VIEW-shaped (TitleSubtitle, no errors, "Packaging"
  // title) for both 'view' and 'sell-edit' — sell-edit's editable whitelist
  // is layered on top via editableIds, not a third readOnly branch.
  const readOnly = mode !== 'edit'
  const editableIds = mode === 'sell-edit' ? SELL_EDIT_FIELD_IDS : undefined
  const { closeSheet } = useSheet()

  const [values, setValues] = useState(initialFieldValues)
  const onChange = (fieldId, val) => setValues((prev) => ({ ...prev, [fieldId]: val }))

  // Every section starts expanded — Expand All / Collapse All (spec #5) then
  // flips them all together. Accordion has no built-in all-toggle (only
  // SubAccordion does), so this page owns the control + the per-section state.
  const [expandedMap, setExpandedMap] = useState(() =>
    Object.fromEntries(SECTION_KEYS.map((k) => [k, true])),
  )
  const allExpanded = SECTION_KEYS.every((k) => expandedMap[k])
  const toggleAll = () =>
    setExpandedMap(Object.fromEntries(SECTION_KEYS.map((k) => [k, !allExpanded])))
  const toggleSection = (key) => setExpandedMap((prev) => ({ ...prev, [key]: !prev[key] }))

  const goToList = () => closeSheet('/shipments')

  return (
    <AppShell>
      <div className="flex items-center" style={{ gap: 'var(--spacing-1)', marginBottom: 'var(--spacing-4)' }}>
        <Breadcrumb label="Shipments" onClick={goToList} />
        <Breadcrumb label="Executed Shipment Details" current />
      </div>

      <PageHeader
        title={mode === 'view' ? 'Shipment Details' : `Executed Shipment: ${SELL_SHIPMENT_NUMBER}`}
        style={{ marginBottom: 'var(--spacing-4)' }}
      >
        <Button variant="secondary" size="sm" onClick={toggleAll}>
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </Button>
      </PageHeader>

      {readOnly ? (
        // Figma's own copy here is "1 Error: Validation Required" on a GREEN
        // success surface — a copy mistake (wrong string left on the success
        // variant), not real content (S159 task ruling). Using sensible
        // success copy instead.
        <Alert variant="success" style={{ marginBottom: 'var(--spacing-5)' }}>
          Validation passed — no errors found.
        </Alert>
      ) : (
        <Alert
          variant="error"
          errors={[{ field: 'Sell Shipment #', reason: 'No matching shipment found' }]}
          style={{ marginBottom: 'var(--spacing-5)' }}
        />
      )}

      <div style={{ paddingBottom: 'var(--spacing-8)' }}>
        <ExecutedShipmentAccordions
          expandedMap={expandedMap}
          onToggleSection={toggleSection}
          values={values}
          onChange={onChange}
          readOnly={readOnly}
          editableIds={editableIds}
        />
      </div>

      {mode === 'edit' && (
        <StepperButtonsFooter
          className="executed-shipment__footer"
          cancelLabel="Cancel"
          primaryLabel="Mark as shipped"
          showSave={false}
          onCancel={goToList}
          onPrimary={() => {
            goToList()
            showToast('Shipment marked as shipped.')
          }}
        />
      )}

      {mode === 'sell-edit' && (
        <StepperButtonsFooter
          className="executed-shipment__footer"
          cancelLabel="Cancel"
          primaryLabel="Save"
          showSave={false}
          onCancel={goToList}
          onPrimary={() => {
            goToList()
            showToast('Shipment updated.')
          }}
        />
      )}
    </AppShell>
  )
}
