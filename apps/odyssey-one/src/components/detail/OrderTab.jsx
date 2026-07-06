import React, { useId, useState } from 'react'
import { ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Badge, Button, SubAccordion, Tab } from '@odyssey/ui'
import { ICON_MD } from '@odyssey/tokens'

// Orders tab pane — mirrors Order Creation (Figma wireframe 1210:36974,
// vault/00-inbox/OrdersTab.png): order-number Tabs + Expand/Collapse All over
// four SubAccordion cards (General Information, Pickup and Delivery, Product
// Information 🚧, Special Services). Replaced the old 4-column grid (S79).

const DASH = '--'
const SECTIONS = ['general', 'pickup', 'product', 'services']

function Field({ label, value }) {
  return (
    <div className="order-pane__field">
      <div className="order-pane__field-label">{label}</div>
      <div className="order-pane__field-value">{value || DASH}</div>
    </div>
  )
}

function SubHeading({ children }) {
  return <h3 className="order-pane__subheading text-label-base-semibold">{children}</h3>
}

// Light app-local collapsible for the Consignor/Consignee sub-headers (plan
// decision #4 — a button + conditional reveal, NOT a library component).
// ponytail: no height animation like SubAccordion's grid reveal — plain
// mount/unmount; upgrade path = reuse the 0fr→1fr grid pattern if motion is asked for.
function DetailsCollapsible({ title, children }) {
  const [open, setOpen] = useState(true)
  const contentId = useId()
  return (
    <div className="order-pane__details">
      <button
        type="button"
        className="order-pane__details-toggle"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-label-base-semibold">{title}</span>
        <ChevronDown
          {...ICON_MD}
          className={`order-pane__details-chevron${open ? ' order-pane__details-chevron--open' : ''}`}
          aria-hidden="true"
        />
      </button>
      <div id={contentId}>{open && children}</div>
    </div>
  )
}

// The mapper's fmtLocation joins "postal, city, region, country".
// ponytail: string re-split of a formatted field; upgrade path = structured
// postal/city/region/country on AddressVM when the mapper grows them.
function parseLocation(loc) {
  const parts = (loc || '').split(', ')
  if (parts.length !== 4) return {}
  const [postal, city, region, country] = parts
  return { postal, city, region, country }
}

// Consignor/Consignee 50% column — paired label/value fields per the wireframe.
function PartyColumn({ title, party, contact }) {
  const loc = parseLocation(party?.location)
  return (
    <DetailsCollapsible title={title}>
      <div className="order-pane__party-fields">
        <Field label="ID/Org Name" value={party?.siteId} />
        <Field label="Long Name" value={party?.company} />
        <Field label="Address 1" value={party?.address} />
        <Field label="Address 2" value="" />
        <Field label="City" value={loc.city} />
        <Field label="State" value={loc.region} />
        <Field label="Postal Code" value={loc.postal} />
        <Field label="Country" value={loc.country} />
        <Field label="Contact Name (Alternate City)" value={contact?.name} />
        <Field label="Phone" value={contact?.phone} />
        <Field label="Email Address" value={contact?.email} />
      </div>
    </DetailsCollapsible>
  )
}

const OrderTab = React.memo(function OrderTab({
  data,
  orders = [],
  selectedOrderIndex = 0,
  onSelectOrder,
  instructions = [],
  productLines = [],
}) {
  // All four cards open by default (the wireframe renders the pane expanded).
  const [open, setOpen] = useState(() => Object.fromEntries(SECTIONS.map((k) => [k, true])))
  const allOpen = SECTIONS.every((k) => open[k])
  const setSection = (key) => (next) => setOpen((o) => ({ ...o, [key]: next }))
  const toggleAll = () => setOpen(Object.fromEntries(SECTIONS.map((k) => [k, !allOpen])))

  if (!data)
    return (
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-placeholder)' }}>
        No order data available.
      </div>
    )

  const d = data

  // Wireframe References table ← the order's reference fields; only populated
  // rows render (all-dash reference lists collapse to a single placeholder row).
  const references = [
    ['Sales Order Number', d.salesOrder],
    ['Delivery Number', d.deliveryNumber],
    ['PO Number', d.poNumber],
    ['Pro/Booking Number', d.proBooking],
    ['Pickup Number', d.pickupNumber],
    ['Confirmation Number', d.confirmationNumber],
  ].filter(([, v]) => v && v !== DASH)

  // specialServices is a single mapper string today ('--' or comma-joined codes).
  const services = (d.specialServices || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== DASH)

  return (
    <div className="order-pane">
      {/* Tab exposes aria-pressed (filter-tab convention) — no tablist role,
          matching the other .tab-group rows in the app */}
      {orders.length > 0 && (
        <div className="tab-group" aria-label="Orders on this shipment">
          {orders.map((ord, i) => (
            <Tab
              key={ord}
              label={ord}
              current={i === selectedOrderIndex}
              onClick={() => onSelectOrder?.(i)}
            />
          ))}
        </div>
      )}

      <div className="order-pane__expand-row">
        <Button variant="link" iconRight={<ChevronsUpDown {...ICON_MD} />} onClick={toggleAll}>
          {allOpen ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>

      <SubAccordion
        title="General Information"
        showIcon={false}
        expanded={open.general}
        onToggle={setSection('general')}
      >
        <div className="order-pane__section">
          <div className="order-pane__block">
            <SubHeading>General</SubHeading>
            <div className="order-pane__fields">
              <Field label="Owning Organization" value="" />
              <Field label="Freight Term" value={d.paymentTerms} />
              <Field label="Ship Direction" value={d.shipDirection} />
              <Field label="Consolidatable" value={d.consolidatable} />
            </div>
          </div>

          <div className="order-pane__block">
            <SubHeading>Requested Transportation</SubHeading>
            <div className="order-pane__fields">
              <Field label="Equipment" value={d.equipment} />
              <Field label="Equipment Reference Number" value="" />
              <Field label="Customer Required Carrier" value={d.carrier} />
            </div>
          </div>

          <div className="order-pane__block">
            <SubHeading>References</SubHeading>
            <table className="odyssey-table">
              <thead>
                <tr>
                  <th className="text-label-sm-semibold">Reference Type</th>
                  <th className="text-label-sm-semibold">Reference Value</th>
                </tr>
              </thead>
              <tbody>
                {references.length === 0 && (
                  <tr>
                    <td className="text-label-sm-regular">{DASH}</td>
                    <td className="text-label-sm-regular">{DASH}</td>
                  </tr>
                )}
                {references.map(([type, value]) => (
                  <tr key={type}>
                    <td className="text-label-sm-regular">{type}</td>
                    {/* link-blue value per the wireframe; no nav target yet so a
                        tinted span, not an anchor (ponytail: upgrade = real link
                        once references resolve to entities) */}
                    <td className="text-label-sm-regular">
                      <span className="order-pane__link">{value}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="order-pane__block">
            <SubHeading>Instructions</SubHeading>
            <table className="odyssey-table">
              <thead>
                <tr>
                  <th className="text-label-sm-semibold order-pane__col-seq">#</th>
                  <th className="text-label-sm-semibold">Instruction Description</th>
                </tr>
              </thead>
              <tbody>
                {instructions.length === 0 && (
                  <tr>
                    <td className="text-label-sm-regular">{DASH}</td>
                    <td className="text-label-sm-regular">{DASH}</td>
                  </tr>
                )}
                {instructions.map((ins) => (
                  <tr key={ins.seq}>
                    <td className="text-label-sm-regular">{ins.seq}</td>
                    <td className="text-label-sm-regular order-pane__cell-wrap">{ins.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SubAccordion>

      <SubAccordion
        title="Pickup and Delivery"
        showIcon={false}
        expanded={open.pickup}
        onToggle={setSection('pickup')}
      >
        <div className="order-pane__section">
          <div className="order-pane__cols">
            <PartyColumn
              title="Consignor details"
              party={d.shipFrom}
              contact={{ name: d.contactName, phone: d.contactPhone, email: d.contactEmail }}
            />
            {/* order-level contact is sourced from the origin — no consignee contact in the VM */}
            <PartyColumn title="Consignee details" party={d.shipTo} contact={null} />
          </div>

          <div className="order-pane__block">
            <SubHeading>Planning Date/Time</SubHeading>
            <div className="order-pane__fields">
              <Field label="Late Pickup Date and Time" value={d.latestPickup} />
            </div>
          </div>
        </div>
      </SubAccordion>

      <SubAccordion
        title="Product Information - 🚧 Under Construction"
        showIcon={false}
        expanded={open.product}
        onToggle={setSection('product')}
      >
        {/* Dimmed + non-interactive per plan decision #1 (ship-state pending
            Efrain); inert keeps it out of the tab order. */}
        <div className="order-pane__section order-pane__under-construction" inert>
          <div className="order-pane__block">
            <SubHeading>Product Details</SubHeading>
            <div className="order-pane__fields">
              <Field label="Number of Products" value={d.numProducts} />
              <Field label="Total Product Weight" value={d.totalWeight} />
              <Field label="Total Volume" value={d.totalVolume} />
              <Field label="Hazmat" value={d.hazmat} />
              <Field label="Earliest Pickup" value={d.earliestPickup} />
              <Field label="Last Pickup" value={d.latestPickup} />
            </div>
          </div>

          <div className="order-pane__block">
            <SubHeading>Product List</SubHeading>
            <div className="order-pane__product-toolbar">
              {/* static US/Metric segmented visual (non-interactive by design) */}
              <span className="order-pane__uom-toggle" aria-hidden="true">
                <span className="order-pane__uom-seg order-pane__uom-seg--active text-label-sm-medium">US</span>
                <span className="order-pane__uom-seg text-label-sm-medium">Metric</span>
              </span>
              <span className="order-pane__product-count text-label-sm-regular">
                {productLines.length} products added
              </span>
            </div>
            <table className="odyssey-table">
              <thead>
                <tr>
                  <th className="text-label-sm-semibold">Product ID</th>
                  <th className="text-label-sm-semibold">Description</th>
                  <th className="text-label-sm-semibold">Gross Weight</th>
                  <th className="text-label-sm-semibold">Volume</th>
                  <th className="text-label-sm-semibold">Ship Class</th>
                  <th className="text-label-sm-semibold">Shipping Class ID</th>
                </tr>
              </thead>
              <tbody>
                {productLines.length === 0 && (
                  <tr>
                    {Array.from({ length: 6 }, (_, i) => (
                      <td key={i} className="text-label-sm-regular">{DASH}</td>
                    ))}
                  </tr>
                )}
                {productLines.map((line) => (
                  <tr key={line.lineNumber}>
                    <td className="text-label-sm-regular">
                      <span className="order-pane__link">{line.shipItem}</span>
                    </td>
                    <td className="text-label-sm-regular">{line.description}</td>
                    <td className="text-label-sm-regular">{line.grossWeight}</td>
                    <td className="text-label-sm-regular">{line.volume}</td>
                    <td className="text-label-sm-regular">{line.productClass}</td>
                    <td className="text-label-sm-regular">{line.shippingClass}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SubAccordion>

      <SubAccordion
        title="Special Services (Optional)"
        showIcon={false}
        expanded={open.services}
        onToggle={setSection('services')}
      >
        <table className="odyssey-table">
          <thead>
            <tr>
              <th className="text-label-sm-semibold">Service Category</th>
              <th className="text-label-sm-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 && (
              <tr>
                <td className="text-label-sm-regular">{DASH}</td>
                <td className="text-label-sm-regular">{DASH}</td>
              </tr>
            )}
            {services.map((svc) => (
              <tr key={svc}>
                <td><Badge variant="gray">{svc}</Badge></td>
                {/* the VM carries no per-service description */}
                <td className="text-label-sm-regular">{DASH}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SubAccordion>
    </div>
  )
})
export default OrderTab
