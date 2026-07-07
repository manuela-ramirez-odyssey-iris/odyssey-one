import { Badge, SubAccordion, TitleSubtitle } from '@odyssey/ui'

// Shared order-section cards (S82) — the four SubAccordion cards extracted
// VERBATIM from the Shipments Orders tab pane (components/detail/OrderTab.jsx,
// restyled S79 to the 4292 mocks) so the Order Summary page (Figma 4317:20483)
// can render the exact same content presentation. Both consumers keep their
// own open-state + data adapters; the DOM these emit is byte-identical to the
// pre-extraction OrderTab output. Styling: `.order-pane__*` in
// styles/components.css (loaded globally).

export const DASH = '--'

export function Field({ label, value }) {
  return (
    <div className="order-pane__field">
      <div className="order-pane__field-label">{label}</div>
      <div className="order-pane__field-value">{value || DASH}</div>
    </div>
  )
}

export function SubHeading({ children }) {
  return <h3 className="order-pane__subheading text-label-base-semibold">{children}</h3>
}

// The mapper's fmtLocation joins "postal, city, region, country".
// ponytail: string re-split of a formatted field; upgrade path = structured
// postal/city/region/country on AddressVM when the mapper grows them.
export function parseLocation(loc) {
  const parts = (loc || '').split(', ')
  if (parts.length !== 4) return {}
  const [postal, city, region, country] = parts
  return { postal, city, region, country }
}

// Consignor/Consignee 50% column — static header (Figma 4292:17725 renders the
// chevron at opacity 0 → not collapsible anymore, DetailsCollapsible retired),
// TitleSubtitle pairs two-up, then a ruled contact block ("Extra Fields").
export function PartyColumn({ title, party, contact }) {
  const loc = parseLocation(party?.location)
  return (
    <div className="order-pane__party">
      <SubHeading>{title}</SubHeading>
      <div className="order-pane__party-fields">
        <TitleSubtitle title={party?.siteId || DASH} subtitle="ID/Org Name" />
        <TitleSubtitle title={party?.company || DASH} subtitle="Long Name" />
        <TitleSubtitle title={party?.address1 || DASH} subtitle="Address 1" />
        <TitleSubtitle title={party?.address2 || DASH} subtitle="Address 2" />
        <TitleSubtitle title={loc.city || DASH} subtitle="City" />
        <TitleSubtitle title={loc.region || DASH} subtitle="State" />
        <TitleSubtitle title={loc.postal || DASH} subtitle="Postal Code" />
        <TitleSubtitle title={loc.country || DASH} subtitle="Country" />
      </div>
      <div className="order-pane__party-extra">
        <div className="order-pane__party-fields">
          <TitleSubtitle title={contact?.name || DASH} subtitle="Contact Name (Alternate City)" />
          <TitleSubtitle title={contact?.phone || DASH} subtitle="Phone" />
          <TitleSubtitle title={contact?.email || DASH} subtitle="Email Address" />
        </div>
      </div>
    </div>
  )
}

// ── Card 1: General Information ─────────────────────────────────────────────
// `references` = [type, value] pairs (already filtered to populated rows);
// `instructions` = [{ seq, text }].
export function GeneralInfoCard({ d, references, instructions, expanded, onToggle }) {
  return (
    <SubAccordion
      title="General Information"
      showIcon={false}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="order-pane__section order-pane__section--divided">
        <div className="order-pane__block">
          <SubHeading>General</SubHeading>
          <div className="order-pane__fields-grid">
            <TitleSubtitle title={d.owningOrganization || DASH} subtitle="Owning Organization" />
            <TitleSubtitle title={d.paymentTerms || DASH} subtitle="Freight Term" />
            <TitleSubtitle title={d.shipDirection || DASH} subtitle="Ship Direction" />
            <TitleSubtitle title={d.consolidatable || DASH} subtitle="Consolidatable" />
          </div>
        </div>

        <div className="order-pane__block">
          <SubHeading>Requested Transportation</SubHeading>
          {/* 3 fields on the same 4-col rhythm as General (the mock keeps a
              blank fourth column via an invisible TitleSubtitle) */}
          <div className="order-pane__fields-grid">
            <TitleSubtitle title={d.equipment || DASH} subtitle="Equipment" />
            <TitleSubtitle title={d.equipmentReferenceNumber || DASH} subtitle="Equipment Reference Number" />
            <TitleSubtitle title={d.carrier || DASH} subtitle="Customer Required Carrier" />
          </div>
        </div>

        <div className="order-pane__block">
          <SubHeading>References</SubHeading>
          {/* type/value each ~⅓ + an empty filler column, per the mock's
              three Reference Columns (4292:17687/17691/17695) */}
          <table className="odyssey-table">
            <thead>
              <tr>
                <th className="text-label-sm-semibold order-pane__col-third">Reference Type</th>
                <th className="text-label-sm-semibold order-pane__col-third">Reference Value</th>
                <th aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {references.length === 0 && (
                <tr>
                  <td className="text-label-sm-regular">{DASH}</td>
                  <td className="text-label-sm-regular">{DASH}</td>
                  <td aria-hidden="true" />
                </tr>
              )}
              {references.map(([type, value]) => (
                <tr key={type}>
                  <td className="text-label-sm-medium odyssey-table__cell--title">{type}</td>
                  <td className="text-label-sm-regular">{value}</td>
                  <td aria-hidden="true" />
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
  )
}

// ── Card 2: Pickup and Delivery ──────────────────────────────────────────────
export function PickupDeliveryCard({ d, expanded, onToggle }) {
  return (
    <SubAccordion
      title="Pickup and Delivery"
      showIcon={false}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="order-pane__section order-pane__section--divided">
        <div className="order-pane__block">
          <div className="order-pane__cols">
            <PartyColumn
              title="Consignor details"
              party={d.shipFrom}
              contact={{ name: d.contactName, phone: d.contactPhone, email: d.contactEmail }}
            />
            <PartyColumn
              title="Consignee details"
              party={d.shipTo}
              contact={{ name: d.destContactName, phone: d.destContactPhone, email: d.destContactEmail }}
            />
          </div>
        </div>

        <div className="order-pane__block order-pane__block--loose">
          <SubHeading>Planning Date/Time</SubHeading>
          <div className="order-pane__fields-grid">
            <TitleSubtitle title={d.latestPickup || DASH} subtitle="Late Pickup Date and Time" />
          </div>
        </div>
      </div>
    </SubAccordion>
  )
}

// ── Card 3: Product Information (🚧 dimmed) ──────────────────────────────────
export function ProductInfoCard({ d, productLines, expanded, onToggle }) {
  return (
    <SubAccordion
      title="Product Information - 🚧 Under Construction"
      showIcon={false}
      expanded={expanded}
      onToggle={onToggle}
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
  )
}

// ── Card 4: Special Services ─────────────────────────────────────────────────
// `services` = [{ code, desc }].
export function SpecialServicesCard({ services, expanded, onToggle }) {
  return (
    <SubAccordion
      title="Special Services (Optional)"
      showIcon={false}
      expanded={expanded}
      onToggle={onToggle}
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
            // both columns render gray Badges per the mock (4292:17957–17964)
            <tr key={svc.code}>
              <td><Badge variant="gray">{svc.code}</Badge></td>
              <td><Badge variant="gray">{svc.desc}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </SubAccordion>
  )
}
