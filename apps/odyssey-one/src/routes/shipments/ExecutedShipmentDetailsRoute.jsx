import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Breadcrumb, PageHeader, Alert, Button, StepperButtonsFooter } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import ExecutedShipmentAccordions, { SECTION_KEYS } from '../../components/pgipgr/ExecutedShipmentAccordions'
import { initialFieldValues, SELL_SHIPMENT_NUMBER } from '../../components/pgipgr/executedShipmentData'
import { showToast } from '../../utils/toast'
import useSheet from '../useSheet'

// /shipments/executed/:id — Executed Shipment Details, two modes off the
// SAME data module + accordion renderer (2026-09-24 Figma pass,
// x38TOJGsNryYl3LsKhCtSc):
//   EDIT       (?mode=edit, node 2577:77880) — from Post PGI/PGR Errors rows.
//              Editable inputs, red error fields, sticky footer.
//   READ-ONLY  (?mode=view, node 2701:9930, default) — from All Sell
//              Shipments / Rating Errors / Not Responsible rows. Label/value
//              text only, no footer.
// `?mode` travels in the sheet URL itself (PgipgrTable's openSheet call) so
// it survives the sheet stack the same way the path does.
//
// UI-only: EDIT fields are editable in LOCAL state, nothing persists.
// Reached from a Shipment ID link in any of the 4 PGI/PGR category tables,
// opened as a SHEET (docs/superpowers/plans/2026-09-23-slide-over-routes.md)
// — same convention as OrderChangeEditStopsRoute / OrderSummaryRoute /
// OrderAuditTrailRoute: PgipgrTable's link calls openSheet, every exit here
// calls closeSheet('/shipments') so the live PGI/PGR panel underneath (never
// unmounted) is exactly where the planner left it, slide-out included.
export default function ExecutedShipmentDetailsRoute() {
  const [searchParams] = useSearchParams()
  const readOnly = searchParams.get('mode') !== 'edit'
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
        title={readOnly ? 'Shipment Details' : `Executed Shipment: ${SELL_SHIPMENT_NUMBER}`}
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
        />
      </div>

      {!readOnly && (
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
    </AppShell>
  )
}
