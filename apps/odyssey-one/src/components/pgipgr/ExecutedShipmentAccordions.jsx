import { Accordion, SubAccordion } from '@odyssey/ui'
import FieldRow from './FieldRow'
import {
  HEADER_NUMBER, SHIPMENT_INFO_ROWS, HEADER_ROWS, SHIPPER, DESTINATION, READONLY_SHIPPER, REFERENCE_ROW,
  LINE_GENERAL_ROWS, LINE_PACKAGING_ROWS, LINE_PRODUCT_ROWS,
} from './executedShipmentData'

const SECTION_KEYS = ['shipmentInfo', 'header', 'pickupDelivery', 'reference', 'line']

// READ-ONLY contact labels (Figma node 2701:9930) differ from EDIT's own
// ("Contact Name" / "Phone Number" / "Email Address") — read verbatim,
// including the odd "(Alternate City)" qualifier.
const READONLY_CONTACT_LABELS = ['Contact Name (Alternate City)', 'Phone', 'Email Address']

function errorCountOf(rows) {
  return rows.flat().filter((f) => f.error).length
}

// AddressColumn — EDIT (Figma 2659:14274) and READ-ONLY (2701:9946) lay the
// same 8 address fields into DIFFERENT row groupings, confirmed against both
// nodes' own Input group frames: EDIT is 2/1/1/2/2 (Address 1 and Address 2
// each get their own full-width row); READ-ONLY is a flat 2/2/2/2 (Address 1
// and Address 2 side by side, per the task's own instruction). Contact block
// also differs: EDIT has a "Contact Information" divider label, READ-ONLY
// has none (Figma) and swaps in READONLY_CONTACT_LABELS.
function AddressColumn({ title, group, values, onChange, readOnly }) {
  const [idOrg, longName, addr1, addr2, city, state, postal, country] = group.address
  const addressRows = readOnly
    ? [[idOrg, longName], [addr1, addr2], [city, state], [postal, country]]
    : [[idOrg, longName], [addr1], [addr2], [city, state], [postal, country]]
  const contactFields = readOnly
    ? group.contact.map((f, i) => ({ ...f, label: READONLY_CONTACT_LABELS[i] }))
    : group.contact

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="text-label-sm-semibold" style={{ marginBottom: 'var(--spacing-3)' }}>{title}</div>
      <div className="flex flex-col" style={{ gap: 'var(--spacing-4)' }}>
        {addressRows.map((row) => (
          <FieldRow key={row[0].id} fields={row} values={values} onChange={onChange} readOnly={readOnly} />
        ))}
        {!readOnly && (
          <div
            className="text-label-xs-semibold"
            style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: 'var(--spacing-3)', color: 'var(--text-tertiary)' }}
          >
            Contact Information
          </div>
        )}
        <FieldRow fields={contactFields} values={values} onChange={onChange} readOnly={readOnly} />
      </div>
    </div>
  )
}

// ExecutedShipmentAccordions — the 5 sections of the Executed Shipment
// Details page (S159 spec #5, Figma node 2577:77880 EDIT / 2701:9930
// READ-ONLY). `expanded`/`onToggle` are controlled per section (keyed by
// SECTION_KEYS) so the page's Expand All control can drive every Accordion
// at once — Accordion has no built-in expand-all (that only exists on
// SubAccordion), so this page owns it.
//
// `readOnly` (READ-ONLY mode): fields render as TitleSubtitle (no inputs, no
// error states — the whole mode has none), Pickup/Delivery columns become
// "Shipper details" / "Consignee details" with READONLY_SHIPPER's own sample
// values, and the Line accordion is titled "Packaging" instead of "Line
// section" (same sub-accordions inside either way).
export default function ExecutedShipmentAccordions({ expandedMap, onToggleSection, values, onChange, readOnly = false }) {
  const propsFor = (key, position) => ({
    position,
    expanded: expandedMap[key],
    onToggle: () => onToggleSection(key),
  })

  return (
    <div className="flex flex-col" style={{ gap: 'var(--spacing-4)' }}>
      <Accordion
        {...propsFor('shipmentInfo', 'start')}
        title="Shipment Information"
        status={!readOnly && errorCountOf(SHIPMENT_INFO_ROWS) ? 'error' : 'off'}
        errorCount={!readOnly ? errorCountOf(SHIPMENT_INFO_ROWS) : 0}
      >
        <div className="flex flex-col" style={{ gap: 'var(--spacing-4)' }}>
          {SHIPMENT_INFO_ROWS.map((row) => (
            <FieldRow key={row[0].id} fields={row} values={values} onChange={onChange} readOnly={readOnly} />
          ))}
        </div>
      </Accordion>

      <Accordion
        {...propsFor('header', 'mid')}
        title={`Header - ${HEADER_NUMBER}`}
        status={!readOnly && errorCountOf(HEADER_ROWS) ? 'error' : 'off'}
        errorCount={!readOnly ? errorCountOf(HEADER_ROWS) : 0}
      >
        <div className="flex flex-col" style={{ gap: 'var(--spacing-4)' }}>
          {HEADER_ROWS.map((row) => (
            <FieldRow key={row[0].id} fields={row} values={values} onChange={onChange} readOnly={readOnly} />
          ))}
        </div>
      </Accordion>

      <Accordion {...propsFor('pickupDelivery', 'mid')} title="Pickup/Delivery">
        <div className="flex" style={{ gap: 'var(--spacing-6)' }}>
          <AddressColumn
            title={readOnly ? 'Shipper details' : 'Shipper'}
            group={readOnly ? READONLY_SHIPPER : SHIPPER}
            values={values}
            onChange={onChange}
            readOnly={readOnly}
          />
          <AddressColumn
            title={readOnly ? 'Consignee details' : 'Destination'}
            group={DESTINATION}
            values={values}
            onChange={onChange}
            readOnly={readOnly}
          />
        </div>
      </Accordion>

      <Accordion {...propsFor('reference', 'mid')} title="Reference">
        <FieldRow fields={REFERENCE_ROW} values={values} onChange={onChange} readOnly={readOnly} />
      </Accordion>

      <Accordion
        {...propsFor('line', 'end')}
        title={readOnly ? 'Packaging' : 'Line section'}
        status={!readOnly && errorCountOf(LINE_PRODUCT_ROWS) ? 'error' : 'off'}
        errorCount={!readOnly ? errorCountOf(LINE_PRODUCT_ROWS) : 0}
      >
        <div className="flex flex-col" style={{ gap: 'var(--spacing-3)' }}>
          <SubAccordion title="General" defaultExpanded>
            <div className="flex flex-col" style={{ gap: 'var(--spacing-4)' }}>
              {LINE_GENERAL_ROWS.map((row) => (
                <FieldRow key={row[0].id} fields={row} values={values} onChange={onChange} readOnly={readOnly} />
              ))}
            </div>
          </SubAccordion>
          <SubAccordion title="Packaging">
            <div className="flex flex-col" style={{ gap: 'var(--spacing-4)' }}>
              {LINE_PACKAGING_ROWS.map((row) => (
                <FieldRow key={row[0].id} fields={row} values={values} onChange={onChange} readOnly={readOnly} />
              ))}
            </div>
          </SubAccordion>
          <SubAccordion title="Product Details">
            <div className="flex flex-col" style={{ gap: 'var(--spacing-4)' }}>
              {LINE_PRODUCT_ROWS.map((row) => (
                <FieldRow key={row[0].id} fields={row} values={values} onChange={onChange} readOnly={readOnly} />
              ))}
            </div>
          </SubAccordion>
        </div>
      </Accordion>
    </div>
  )
}

export { SECTION_KEYS }
