import { ArrowDownWideNarrow, Columns3Cog, TriangleAlert } from 'lucide-react'
import { Badge, SubAccordion, TitleSubtitle } from '@odyssey/ui'

// Shared order-section cards (S82) — the four SubAccordion cards extracted
// VERBATIM from the Shipments Orders tab pane (components/detail/OrderTab.jsx,
// restyled S79 to the 4292 mocks) so the Order Summary page (Figma 4317:20483)
// can render the exact same content presentation. Both consumers keep their
// own open-state + data adapters; the DOM these emit is byte-identical to the
// pre-extraction OrderTab output. Styling: `.order-pane__*` in
// styles/components.css (loaded globally).

export const DASH = '--'

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
      {/* Long-only block (Figma 4465:12225) — quick confirmations that never
          captured contacts hide the ruled block entirely (4139:11389). */}
      {(contact?.name || contact?.phone || contact?.email) && (
        <div className="order-pane__party-extra">
          <div className="order-pane__party-fields">
            {/* mock label "Contact Name (Alternate City)" — parenthetical is
                Efrain copy-junk, dropped (flagged in ORD-09) */}
            <TitleSubtitle title={contact?.name || DASH} subtitle="Contact Name" />
            <TitleSubtitle title={contact?.phone || DASH} subtitle="Phone" />
            <TitleSubtitle title={contact?.email || DASH} subtitle="Email Address" />
          </div>
        </div>
      )}
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
          {/* Quick/Long is data-driven (Figma 4139:11389 vs 4465:12225):
              Equipment always renders; the long-only pair appears only when
              captured. Field order per the Long mock. */}
          <div className="order-pane__fields-grid">
            <TitleSubtitle title={d.equipment || DASH} subtitle="Equipment" />
            {d.carrier && <TitleSubtitle title={d.carrier} subtitle="Customer Required Carrier" />}
            {d.equipmentReferenceNumber && (
              <TitleSubtitle title={d.equipmentReferenceNumber} subtitle="Equipment Reference Number" />
            )}
          </div>
        </div>

        {references.length > 0 && (
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
        )}

        {instructions.length > 0 && (
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
              {instructions.map((ins) => (
                <tr key={ins.seq}>
                  <td className="text-label-sm-regular">{ins.seq}</td>
                  <td className="text-label-sm-regular order-pane__cell-wrap">{ins.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
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
            {/* LINX-12255 Shipper + LINX-13899 Destination renames (13899 is
                ahead of these mocks, which still say "Consignee details") */}
            <PartyColumn
              title="Shipper details"
              party={d.shipFrom}
              contact={{ name: d.contactName, phone: d.contactPhone, email: d.contactEmail }}
            />
            <PartyColumn
              title="Destination details"
              party={d.shipTo}
              contact={{ name: d.destContactName, phone: d.destContactPhone, email: d.destContactEmail }}
            />
          </div>
        </div>

        <div className="order-pane__block order-pane__block--loose">
          <SubHeading>Planning Date/Time</SubHeading>
          <div className="order-pane__fields-grid">
            <TitleSubtitle title={d.latestPickup || DASH} subtitle="Late Pickup Date and Time" />
            {/* R2-7: Appointment flags were captured by the create form but
                never rendered on this read-only pane — same Yes/No idiom as
                Consolidatable in GeneralInfoCard above. */}
            <TitleSubtitle title={d.pickupAppointment || DASH} subtitle="Pickup Appointment" />
            <TitleSubtitle title={d.deliveryAppointment || DASH} subtitle="Delivery Appointment" />
          </div>
        </div>
      </div>
    </SubAccordion>
  )
}

// ── Card 3: Product Information ──────────────────────────────────────────────
// Rebuilt to the confirmation mocks (Figma 4139:11389 §Product Information):
// 8-field rollup grid → "N products added" + static sort affordance → 6-col
// read-only table with a static column-cog header. The mocks' header asterisks
// (Line # * / Product Description * / Gross Weight *) are edit-grid template
// junk on a read-only view — dropped, per the S96/S97 clean-subset convention.
export function ProductInfoCard({ d, productLines, expanded, onToggle }) {
  return (
    <SubAccordion
      title="Product Information"
      showIcon={false}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="order-pane__section">
        <div className="order-pane__block">
          <div className="order-pane__fields-grid">
            <TitleSubtitle title={d.totalProductWeight || DASH} subtitle="Total Product Weight" />
            <TitleSubtitle title={d.totalVolume || DASH} subtitle="Total Product Volume" />
            {/* `|| d.totalWeight`: the Shipments OrderTab mapper predates the
                rollup rename and only carries totalWeight */}
            <TitleSubtitle title={d.totalGrossWeight || d.totalWeight || DASH} subtitle="Total Gross Weight" />
            <TitleSubtitle title={d.totalTareWeight || DASH} subtitle="Total Tare Weight" />
            <TitleSubtitle title={d.packageCount || DASH} subtitle="Package Count" />
            <TitleSubtitle title={d.declaredValue || DASH} subtitle="Declared Value" />
            <TitleSubtitle title={d.countryOfOrigin || DASH} subtitle="Country of Origin" />
            <TitleSubtitle
              title={
                d.hazmat === 'Yes' ? (
                  <Badge variant="amber" leftIcon={<TriangleAlert size={12} aria-hidden="true" />}>
                    Hazmat
                  </Badge>
                ) : (
                  DASH
                )
              }
              subtitle="Hazmat"
            />
          </div>
        </div>

        <div className="order-pane__block">
          <div className="order-pane__product-toolbar">
            <span className="order-pane__product-count text-label-sm-regular">
              {productLines.length} products added
            </span>
            {/* static sort affordance per mock — the summary isn't sortable */}
            <span className="order-pane__table-icon" aria-hidden="true">
              <ArrowDownWideNarrow size={16} />
            </span>
          </div>
          <table className="odyssey-table">
            <thead>
              <tr>
                <th className="text-label-sm-semibold">Line #</th>
                <th className="text-label-sm-semibold">Product ID</th>
                <th className="text-label-sm-semibold">Product Description</th>
                <th className="text-label-sm-semibold">Gross Weight</th>
                <th className="text-label-sm-semibold">Volume</th>
                <th className="text-label-sm-semibold">Hazardous</th>
                <th className="text-label-sm-semibold">Product Class</th>
                <th className="order-pane__col-icon" aria-hidden="true">
                  <span className="order-pane__table-icon">
                    <Columns3Cog size={16} />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {productLines.length === 0 && (
                <tr>
                  {Array.from({ length: 7 }, (_, i) => (
                    <td key={i} className="text-label-sm-regular">{DASH}</td>
                  ))}
                  <td aria-hidden="true" />
                </tr>
              )}
              {productLines.map((line) => (
                <tr key={line.lineNumber}>
                  <td className="text-label-sm-regular">{line.lineNumber}</td>
                  <td className="text-label-sm-regular">{line.shipItem}</td>
                  <td className="text-label-sm-regular">{line.description}</td>
                  <td className="text-label-sm-regular">{line.grossWeight}</td>
                  <td className="text-label-sm-regular">{line.volume}</td>
                  <td className="text-label-sm-regular">
                    {/* per-line hazmat (LINX-8121) — same amber-Badge idiom as
                        the order-level rollup above, not a new convention */}
                    {line.hazmat ? (
                      <Badge variant="amber" leftIcon={<TriangleAlert size={12} aria-hidden="true" />}>
                        Hazmat
                      </Badge>
                    ) : (
                      DASH
                    )}
                  </td>
                  <td className="text-label-sm-regular">{line.productClass}</td>
                  <td aria-hidden="true" />
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
