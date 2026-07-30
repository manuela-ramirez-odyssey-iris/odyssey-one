import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Controller, useFormContext } from 'react-hook-form'
import { Button, Checkbox, ComboBox, FormField } from '@odyssey/ui'
import RepeatableRows, { newRowId } from '../RepeatableRows.jsx'
import { useResolveMode, resolveFieldProps } from '../../resolve/ResolveModeContext.jsx'
import { getLookupOptions } from '../../../../api/services/lookupService'
import { EQUIPMENT_CODES, EQUIPMENT_LABELS, EQUIPMENT_SCOPE, FREIGHT_TERMS, REFERENCE_TYPES, SHIP_DIRECTIONS } from '../../../../data/master-data'

// Server-search fields (Jira: infinite-scroll lookups) render ComboBox —
// Customer + Carrier. Chevron click BROWSES the catalog (first page, then
// lazy-loads on scroll — LINX-8118 25–30/page); typing searches, gated at
// 2 chars. Small org-scoped/static lists (Equipment / Freight Term / Ship
// Direction / Reference Type) are pick-only ComboBoxes (typable={false}).
const LOOKUP_PAGE_SIZE = 25
const pagedLookup = (type, opts) => async (q, skip = 0) => {
  if (q.trim().length === 1) return { options: [], total: 0 } // typing gate
  const all = await getLookupOptions(type, q, opts)
  return { options: all.slice(skip, skip + LOOKUP_PAGE_SIZE), total: all.length }
}
const gatedEmptyMessage = (q) =>
  q.trim().length === 1 ? 'Type at least 2 characters' : 'No matches'

const REFERENCE_TYPE_OPTIONS = REFERENCE_TYPES.map((t) => ({ value: t, label: t }))

/**
 * General Information (spec §3.1, screens 1/1-Long; Figma 4139:8806 / 4139:9050).
 * Quick: Customer* (full-width ComboBox — renamed from Owning Organization,
 * LINX-13553), then Order Number / Equipment* (org-scoped ComboBox) / Freight
 * Term* (Q20 dynamic default), then Ship Direction* / Hazardous (LINX-12102) /
 * Consolidatable (checked — Q15), References (quick shows only the add link).
 * Long ("Add More Details"): Additional Information (Carrier ComboBox w/ free
 * text, Equipment Reference Number) + Add Instructions (Q19 description-only
 * rows).
 */
export default function GeneralInformationSection({ lockIdentity = false }) {
  const { control, setValue, watch, getValues } = useFormContext()
  const resolve = useResolveMode()
  // Resolve mode locks EVERYTHING; resolveFieldProps re-enables pool fields
  // (spread last → its disabled:false wins).
  const locked = !!resolve
  // Edit Order (LINX-10248): Order Number + Customer are identity — locked once
  // the order exists. (Creation timestamp isn't a form field.)
  const identityLocked = locked || lockIdentity
  const [isLongMode, setIsLongMode] = useState(false)

  const owningOrg = watch('general.owningOrganization')
  const owningOrgName = watch('general.owningOrganizationName')

  // Equipment is an org-scoped SMALL list → plain dropdown, "CODE - meaning"
  // labels (user, 2026-07-27; nomenclature per the TMS lookup).
  const equipmentOptions = (owningOrg
    ? (EQUIPMENT_SCOPE[owningOrg] ?? EQUIPMENT_CODES)
    : []
  ).map((code) => ({ value: code, label: `${code} - ${EQUIPMENT_LABELS[code] ?? code}` }))

  // Q20: dynamic Freight Term default — Outbound→Pre-Paid, Inbound→COL.
  // Never overwrites once the user touched the Freight Term field.
  //
  // WHY this lives in onChange (not a useEffect watching shipDirection):
  // reset() — used to hydrate a saved draft — never fires onChange, so keeping
  // the re-default here means draft hydration can NEVER clobber a saved
  // freightTerm.  A useEffect would fire on every render where shipDirection
  // changes, including the render triggered by reset(), causing a spurious
  // overwrite (Q20 bug fix, 2026-06-11).
  const freightTouched = useRef(false)

  // Draft reopen: a hydrated draft that carries Long-only data should open Long.
  // Also re-arms freightTouched when the hydrated freightTerm diverges from the
  // Q20 direction default — meaning the user made a deliberate pick in a prior
  // session and that pick must survive future Ship Direction changes.
  useEffect(() => {
    const g = getValues('general')
    if (g.carrierScac || g.equipmentReferenceNumber || g.instructions.length > 0) {
      setIsLongMode(true)
    }
    const directionDefault = g.shipDirection === 'I' ? 'C' : 'P'
    if (g.freightTerm && g.freightTerm !== directionDefault) {
      freightTouched.current = true // re-arm: hydrated value was a deliberate user pick
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateRows = (name) => (rowId, key, value) => {
    const rows = getValues(name)
    setValue(name, rows.map(r => (r.id === rowId ? { ...r, [key]: value } : r)), { shouldValidate: true })
  }
  const deleteRow = (name) => (rowId) => {
    setValue(name, getValues(name).filter(r => r.id !== rowId), { shouldValidate: true })
  }

  // LINX-12102: order hazardous derives from product lines (≥1 hazmat line ⇒
  // hazardous, cannot be manually unchecked while one exists).
  const products = watch('products')
  const derivedHazardous = (products ?? []).some((r) => r?.hazardous)
  useEffect(() => {
    if (derivedHazardous && !getValues('general.hazardous')) {
      setValue('general.hazardous', true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derivedHazardous])

  const carrierTypedRef = useRef('')

  return (
    <div className="co-section-body">
      {/* Field rows sit 24px apart; the 36px section-body gap separates blocks */}
      <div className="co-field-stack">
      {/* Customer sits alone on a full-width row (Figma 4139:8806) */}
      <Controller
        name="general.owningOrganization"
        control={control}
        render={({ field, fieldState }) => (
          <ComboBox
            id="co-general-customer"
            variant="select"
            showLabel
            label="Customer *"
            placeholder="Search an Organization"
            disabled={identityLocked}
            value={field.value ? (owningOrgName || field.value) : ''}
            onChange={(text) => {
              // Typing invalidates the committed pick (and the org-scoped equipment)
              if (field.value && text !== (owningOrgName || field.value)) {
                field.onChange('')
                setValue('general.owningOrganizationName', '')
                setValue('general.equipment', '') // no shouldValidate — don't flag a field the user hasn't touched
              }
            }}
            loadOptions={pagedLookup('owning-org')}
            rowProps={{ showAvatar: true, iconType: 'handshake' }}
            emptyMessage={gatedEmptyMessage}
            onSelect={(val, opt) => {
              field.onChange(val ?? '')
              setValue('general.owningOrganizationName', opt?.label ?? '')
              // Equipment options are org-scoped — a different org means a different catalog
              setValue('general.equipment', '') // no shouldValidate — don't flag a field the user hasn't touched
            }}
            error={fieldState.error?.message}
          />
        )}
      />

      <div className="co-grid-3">
        <Controller
          name="general.orderNumber"
          control={control}
          render={({ field, fieldState }) => (
            <FormField
              id="co-general-orderNumber"
              label="Order Number"
              placeholder="Enter an ID"
              disabled={identityLocked}
              value={field.value}
              error={fieldState.error?.message}
              onChange={(e) => field.onChange(e.target.value)}
            />
          )}
        />

        <Controller
          name="general.equipment"
          control={control}
          render={({ field, fieldState }) => (
            <ComboBox
              id="co-general-equipment"
              variant="select"
              typable={false}
              showLabel
              label="Equipment *"
              placeholder={owningOrg ? 'Select an equipment' : 'Pick a Customer first'}
              disabled={!owningOrg || locked}
              options={equipmentOptions}
              value={field.value}
              onSelect={(v) => field.onChange(v ?? '')}
              error={fieldState.error?.message}
              {...resolveFieldProps(resolve, 'general.equipment', fieldState.error?.message)}
            />
          )}
        />

        <Controller
          name="general.freightTerm"
          control={control}
          render={({ field, fieldState }) => (
            <ComboBox
              id="co-general-freightTerm"
              variant="select"
              typable={false}
              showLabel
              label="Freight Term *"
              disabled={locked}
              options={FREIGHT_TERMS}
              value={field.value}
              onSelect={(v) => {
                freightTouched.current = true // Q20: user pick wins over the dynamic default
                field.onChange(v ?? '')
              }}
              error={fieldState.error?.message}
              {...resolveFieldProps(resolve, 'general.freightTerm', fieldState.error?.message)}
            />
          )}
        />
      </div>

      <div className="co-grid-3">
        <Controller
          name="general.shipDirection"
          control={control}
          render={({ field, fieldState }) => (
            <ComboBox
              id="co-general-shipDirection"
              variant="select"
              typable={false}
              showLabel
              label="Ship Direction *"
              disabled={locked}
              options={SHIP_DIRECTIONS}
              value={field.value}
              onSelect={(v) => {
                field.onChange(v ?? '')
                // Q20: apply Freight Term default only when the user is the one
                // changing Ship Direction and has not already picked a Freight Term.
                // reset() never calls this handler, so draft hydration is safe.
                if (!freightTouched.current) {
                  setValue('general.freightTerm', v === 'I' ? 'C' : 'P', { shouldValidate: true })
                }
              }}
              error={fieldState.error?.message}
              {...resolveFieldProps(resolve, 'general.shipDirection', fieldState.error?.message)}
            />
          )}
        />

        <Controller
          name="general.hazardous"
          control={control}
          render={({ field }) => (
            <div className="co-link-row" style={{ alignSelf: 'end', paddingBottom: 6 }}>
              <Checkbox
                label="Hazardous"
                disabled={locked}
                checked={field.value}
                onChange={(e) => {
                  // LINX-12102: can't uncheck while a hazardous product line exists
                  if (!e.target.checked && derivedHazardous) return
                  field.onChange(e.target.checked)
                }}
              />
            </div>
          )}
        />

        <Controller
          name="general.consolidatable"
          control={control}
          render={({ field }) => (
            <div className="co-link-row" style={{ alignSelf: 'end', paddingBottom: 6 }}>
              <Checkbox
                label="Consolidatable"
                disabled={locked}
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            </div>
          )}
        />
      </div>
      </div>

      <hr className="co-divider co-divider--spaced" />

      {/* References sit in Quick, ABOVE Add More Details (screen 1 discrepancy note).
          Quick shows only the add link — the table (incl. guided rows) renders in
          Long, or once the user adds a row (Figma 4139:8806 vs 4139:9050). */}
      <div className="co-confirm-block">
        <h3 className="co-subhead text-label-base-semibold">References</h3>
        <Controller
          name="general.references"
          control={control}
          render={({ field }) => (
            <RepeatableRows
              disabled={locked}
              rows={field.value}
              columns={[
                // Each row starts as a type dropdown; picking a type locks the
                // cell into a plain label (Figma 6238:24599 — the Pickup/PO
                // label rows in the mock are the POST-selection face)
                {
                  key: 'type',
                  header: 'Reference Type',
                  maxWidth: 350,
                  select: {
                    placeholder: 'Select a Reference Type',
                    // No duplicate types: each row's dropdown excludes types
                    // already taken by other rows (LINX-8128 only-1-of-each)
                    options: (row) => REFERENCE_TYPE_OPTIONS.filter(
                      (o) => !field.value.some((r) => r.id !== row.id && r.type === o.value),
                    ),
                  },
                },
                { key: 'value', header: 'Reference Value', placeholder: 'Enter Reference Value', maxWidth: 350 },
              ]}
              lockedCell={(row, colKey) => colKey === 'type' && !!row.type}
              canDeleteRow={(row) => !!row.type} // the pending dropdown row can't be deleted
              rowPlaceholder={(row, colKey) =>
                row.type && colKey === 'value' ? `Enter a ${row.type}` : undefined}
              onCellChange={updateRows('general.references')}
              onDeleteRow={deleteRow('general.references')}
              onAddRow={() => {
                // One ref line at a time: reuse the pristine dropdown row if
                // one exists, only append once it's taken
                const hasEmptyRow = field.value.some((r) => !r.type && !r.value)
                if (!hasEmptyRow) {
                  field.onChange([...field.value, { id: newRowId(), guided: false, type: '', value: '' }])
                }
              }}
              addLabel="Add New Reference Code"
            />
          )}
        />
      </div>

      {/* Add More Details groups with its divider, 32px from siblings (Figma 6238:24599) */}
      <div className={`co-addmore${isLongMode ? '' : ' co-addmore--collapsed'}`}>
        <hr className="co-divider" />
        <div className="co-link-row">
          <Button
            variant="link"
            iconRight={isLongMode ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            disabled={locked}
            onClick={() => setIsLongMode(v => !v)}
          >
            Add More Details
          </Button>
        </div>
      </div>

      {isLongMode && (
        <>
          <div className="co-confirm-block">
            <h3 className="co-subhead text-label-base-semibold">Additional Information</h3>
            {/* 3-track grid caps each field at ~350px (Figma 6238:24599) */}
            <div className="co-grid-3">
              <Controller
                name="general.carrierScac"
                control={control}
                render={({ field }) => (
                  <ComboBox
                    id="co-general-carrierScac"
                    variant="select"
                    showLabel
                    label="Customer Required Carrier"
                    placeholder="Search a Carrier"
                    disabled={locked}
                    value={field.value}
                    onChange={(text) => {
                      carrierTypedRef.current = text
                      if (field.value && text !== field.value) field.onChange('')
                    }}
                    // LINX-8126: manual (free-text) carrier entry allowed — commit on blur
                    onBlur={() => {
                      const text = carrierTypedRef.current.trim()
                      if (text && text !== field.value) field.onChange(text)
                    }}
                    loadOptions={pagedLookup('carrier')}
                    emptyMessage={gatedEmptyMessage}
                    onSelect={(val) => {
                      carrierTypedRef.current = val ?? ''
                      field.onChange(val ?? '')
                    }}
                  />
                )}
              />
              <Controller
                name="general.equipmentReferenceNumber"
                control={control}
                render={({ field }) => (
                  <FormField
                    id="co-general-equipmentReferenceNumber"
                    label="Equipment Reference Number"
                    placeholder="Enter the Equipment Numbers"
                    disabled={locked}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
            </div>
          </div>

          <hr className="co-divider co-divider--spaced" />

          <div className="co-confirm-block">
            <h3 className="co-subhead text-label-base-semibold">Add Instructions</h3>
            <Controller
              name="general.instructions"
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <RepeatableRows
                    numbered
                    disabled={locked}
                    columns={[{
                      key: 'description',
                      header: 'Instruction Description',
                      placeholder: 'Provide instruction details',
                      maxLength: 2000, // Q19: description-only, ≤2,000 chars
                      // Ends flush with the References value column: 350+350
                      // minus the 32px # column, so the trash icons align
                      maxWidth: 668,
                    }]}
                    rows={field.value}
                    onCellChange={updateRows('general.instructions')}
                    onDeleteRow={deleteRow('general.instructions')}
                    onAddRow={() => field.onChange([...field.value, { id: newRowId(), description: '' }])}
                    addLabel="Add New Instruction"
                  />
                  {fieldState.error && (
                    <p className="co-field-warning text-label-xs-regular">Check instruction lengths (max 2,000 characters).</p>
                  )}
                </>
              )}
            />
          </div>
        </>
      )}
    </div>
  )
}
