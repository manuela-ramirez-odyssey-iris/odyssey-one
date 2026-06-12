import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Controller, useFormContext } from 'react-hook-form'
import { Button, Checkbox, FormField } from '@odyssey/ui'
import TypeaheadSelect from '../fields/TypeaheadSelect.jsx'
import SelectField from '../fields/SelectField.jsx'
import RepeatableRows, { newRowId } from '../RepeatableRows.jsx'
import { FREIGHT_TERMS, SHIP_DIRECTIONS } from '../../../../data/master-data'

/**
 * General Information (spec §3.1, screens 1/1-Long).
 * Quick: Order Number (optional, auto-gen helper), Owning Organization*,
 * Equipment* (org-scoped), Freight Term* (Q20 dynamic default), Ship
 * Direction* (default Outbound), Consolidatable (checked — Q15), References.
 * Long ("Add More Details"): Additional Information (Carrier SCAC typeahead
 * w/ free text, Equipment Reference Number) + Add Instructions (Q19
 * description-only rows).
 */
export default function GeneralInformationSection() {
  const { control, setValue, watch, getValues } = useFormContext()
  const [isLongMode, setIsLongMode] = useState(false)

  const owningOrg = watch('general.owningOrganization')
  const owningOrgName = watch('general.owningOrganizationName')

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
    const directionDefault = g.shipDirection === 'Inbound' ? 'COL' : 'Pre-Paid'
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

  return (
    <div className="co-section-body">
      <div className="co-grid-2">
        <Controller
          name="general.orderNumber"
          control={control}
          render={({ field }) => (
            <div>
              <FormField
                id="co-general-orderNumber"
                label="Order Number"
                placeholder="Enter an ID"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
              />
              <p className="co-field-hint text-label-xs-regular">Auto-generated if left blank.</p>
            </div>
          )}
        />

        <Controller
          name="general.owningOrganization"
          control={control}
          render={({ field, fieldState }) => (
            <TypeaheadSelect
              id="co-general-owningOrganization"
              label="Owning Organization *"
              placeholder="Search an organization"
              lookupType="owning-org"
              selected={field.value ? { value: field.value, label: owningOrgName || field.value } : null}
              onSelect={(opt) => {
                field.onChange(opt?.value ?? '')
                setValue('general.owningOrganizationName', opt?.label ?? '')
                // Equipment options are org-scoped — a different org means a different catalog
                setValue('general.equipment', '', { shouldValidate: true })
              }}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="general.equipment"
          control={control}
          render={({ field, fieldState }) => (
            <TypeaheadSelect
              id="co-general-equipment"
              label="Equipment *"
              placeholder={owningOrg ? 'Search equipment' : 'Pick an Owning Organization first'}
              lookupType="equipment"
              orgId={owningOrg || undefined}
              disabled={!owningOrg}
              selected={field.value ? { value: field.value, label: field.value } : null}
              onSelect={(opt) => field.onChange(opt?.value ?? '')}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="general.freightTerm"
          control={control}
          render={({ field, fieldState }) => (
            <SelectField
              id="co-general-freightTerm"
              label="Freight Term *"
              options={FREIGHT_TERMS}
              value={field.value}
              onChange={(v) => {
                freightTouched.current = true // Q20: user pick wins over the dynamic default
                field.onChange(v)
              }}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="general.shipDirection"
          control={control}
          render={({ field, fieldState }) => (
            <SelectField
              id="co-general-shipDirection"
              label="Ship Direction *"
              options={SHIP_DIRECTIONS}
              value={field.value}
              onChange={(v) => {
                field.onChange(v)
                // Q20: apply Freight Term default only when the user is the one
                // changing Ship Direction and has not already picked a Freight Term.
                // reset() never calls this handler, so draft hydration is safe.
                if (!freightTouched.current) {
                  setValue('general.freightTerm', v === 'Inbound' ? 'COL' : 'Pre-Paid', { shouldValidate: true })
                }
              }}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="general.consolidatable"
          control={control}
          render={({ field }) => (
            <div className="co-link-row" style={{ alignSelf: 'end', paddingBottom: 6 }}>
              <Checkbox
                label="Consolidatable"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            </div>
          )}
        />
      </div>

      {/* References sit in Quick, ABOVE Add More Details (screen 1 discrepancy note) */}
      <div className="co-confirm-block">
        <h3 className="co-subhead text-label-base-medium">References</h3>
        <Controller
          name="general.references"
          control={control}
          render={({ field }) => (
            <RepeatableRows
              columns={[
                { key: 'type', header: 'Reference Type', placeholder: 'Enter Reference Type' },
                { key: 'value', header: 'Reference Value', placeholder: 'Enter Reference Value' },
              ]}
              rows={field.value}
              lockedCell={(row, colKey) => row.guided && colKey === 'type'} // Q21 guided rows
              rowPlaceholder={(row, colKey) =>
                row.guided && colKey === 'value' ? `Enter a ${row.type}` : undefined}
              onCellChange={updateRows('general.references')}
              onDeleteRow={deleteRow('general.references')}
              onAddRow={() =>
                field.onChange([...field.value, { id: newRowId(), guided: false, type: '', value: '' }])}
              addLabel="Add New Reference Code"
            />
          )}
        />
      </div>

      <div className="co-link-row">
        <Button
          variant="link"
          iconRight={isLongMode ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          onClick={() => setIsLongMode(v => !v)}
        >
          Add More Details
        </Button>
      </div>

      {isLongMode && (
        <>
          <div className="co-confirm-block">
            <h3 className="co-subhead text-label-base-medium">Additional Information</h3>
            <div className="co-grid-2">
              <Controller
                name="general.carrierScac"
                control={control}
                render={({ field }) => (
                  <TypeaheadSelect
                    id="co-general-carrierScac"
                    label="Customer Required Carrier"
                    placeholder="Select a Carrier"
                    lookupType="carrier"
                    allowFreeText
                    selected={field.value ? { value: field.value, label: field.value } : null}
                    onSelect={(opt) => field.onChange(opt?.value ?? '')}
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
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
            </div>
          </div>

          <div className="co-confirm-block">
            <h3 className="co-subhead text-label-base-medium">Add Instructions</h3>
            <Controller
              name="general.instructions"
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <RepeatableRows
                    numbered
                    columns={[{
                      key: 'description',
                      header: 'Instruction Description',
                      placeholder: 'Provide instruction details',
                      maxLength: 2000, // Q19: description-only, ≤2,000 chars
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
