import { Check, CircleX } from 'lucide-react'
import { Badge, Button, GroupTable, SubAccordion } from '@odyssey/ui'

/**
 * LINX-13953 — Dropped Carrier.
 *
 * The carriers routing evaluated and EXCLUDED, with the reason for each. Sits
 * inline below the Tender List, deliberately not behind a button on its own
 * screen the way TMS does it: "You want to just provide it below the screen
 * itself" (Jana, 2026-08-11). Canon: vault/10-domains/shipments/dropped-carrier.md
 *
 * LINX-13954 adds the per-row Process SCAC action, landing in GroupTable's
 * existing `stickyActions` / `group.action` slot — no structural change to
 * this file was needed to add it. The section stays presentational: it
 * reports the press via `onProcess` and renders the disabled state it is
 * told about via `processingScac`; it validates nothing and knows nothing
 * about routing (that lives in the parent). Omitting `onProcess` renders no
 * action column at all, so the section stays usable read-only (13953).
 *
 * ── DASHES ARE STILL LEGAL, BUT THE SEED NO LONGER FORCES THEM ─────────────
 * Routing returns only five attributes for a dropped carrier (scac, service,
 * drop-code, drop-reason, seq), and the seed used to mirror that exactly — so
 * every column here rendered '--' and the feature could not be reviewed. As of
 * 2026-08-18 the seed invents the rest (user ruling: stakeholders have to SEE
 * it to groom it), with the AC's own dependency chains kept intact.
 *
 * So a dash here is still correct and still reachable — it is the ticket's Null
 * Handling rule, not a data bug — but it is now the minority case. Route Rank
 * in particular may legitimately be blank: "Route Rank can be empty but Rank
 * will not be empty" (Jana, 2026-08-18).
 *
 * ── TWO SIBLING TABLES, MIRRORING THE AC'S OWN TWO (2026-08-26) ───────────
 * 13953 does not specify a layout, but it does specify a SHAPE: the fields
 * arrive as two named tables, "Dropped Carrier Fields" (17) and "Volume
 * Commitment Information" (6). This section renders exactly that — the carrier
 * row, then Routing Details and Volume Commitment as sibling nested tables
 * (GroupTable `detailSections`, 0.15.0), separated by a hairline, both open.
 *
 * Two earlier attempts are worth recording, because each was wrong in a way that
 * is easy to repeat:
 *   1. 8 fields on the row, 15 behind a per-carrier chevron. Jana: "not all
 *      fields are displayed. Also, volume commitment fields are missing" — nine
 *      routing fields and five of six commitment fields were real, populated and
 *      invisible.
 *   2. The remaining fields distributed across the tender list's five sub-tabs.
 *      Tidier per view, but it invents a structure 13954 attaches to the TENDER
 *      screen, not to this section, and it still showed a subset at a time —
 *      the very thing that produced the complaint. Dropped 2026-08-26.
 *
 * Nothing is behind a disclosure now: every one of the 23 fields is on screen the
 * moment the section opens.
 *
 * Jana's scoping trap is respected structurally: commitment is keyed on (carrier,
 * equipment, week) — "here you would see it as if like it is applicable for the
 * entire drop carrier list, but it is actually applicable for each and every
 * option" — and each carrier owns its own Volume Commitment table.
 *
 * KNOWN GAP: GroupTable draws no section HEADING, so the two tables are divided
 * by a hairline rather than named the way the AC names them. The columns carry
 * their own meaning (UoM / Accepted / Open / CVC ID read as commitment on sight),
 * but "Volume Commitment" as a visible label needs a component change and its own
 * normalize cycle. Flagged, not smuggled in.
 */

// The carrier row: who, what, and why it was dropped. Identity plus the reason,
// which is the section's whole purpose, plus the dates every reviewer scans for.
//
// Commitment MOVED OFF this row (2026-08-26). It used to sit here while its UoM
// lived nine columns away — "19" on screen with no unit, the exact ambiguity the
// AC's own Accepted/Open gate exists to prevent. All six of the AC's Volume
// Commitment fields now travel together in their own table. One line to revert if
// a reviewer wants the headline number back on the row.
//
// GroupTable's nested flavor renders column 0 as the disclosure LABEL (not a
// `values` lookup — see groupHeaderValue), so `scac` must lead; it doubles as
// the row's accessible name. Every column after it comes from `group.values`.
const COLUMNS = [
  { key: 'scac', label: 'SCAC', width: 96 },
  { key: 'carrierName', label: 'Carrier Name', width: 220 },
  { key: 'equipment', label: 'Equipment', width: 110 },
  { key: 'reason', label: 'Reason', width: 200 },
  { key: 'routeRank', label: 'Route Rank', align: 'center', width: 110 },
  { key: 'pickup', label: 'Pickup Date/Time', width: 210 },
  { key: 'delivery', label: 'Delivery Date/Time', width: 210 },
]

// The AC's two tables, as two sibling nested tables. Field order follows the
// ticket's own listing rather than being re-sorted, so a reviewer can read the AC
// and the screen top-to-bottom together.
//
// No widths: unsized columns collapse to their content and the trailing filler
// takes the slack (GroupTable 0.15.0), so both tables start at the same left edge
// and neither spreads its values across a stretched row.
const DETAIL_SECTIONS = [
  {
    key: 'routing',
    // Reason Description lands here — the long free-text field belongs with the
    // routing facts that explain the drop, not under the commitment numbers.
    note: true,
    columns: [
      { key: 'startDate', label: 'Start Date' },
      { key: 'stopDate', label: 'Stop Date' },
      { key: 'transitTime', label: 'Transit Time' },
      { key: 'transitSource', label: 'Transit Source' },
      { key: 'routeGroup', label: 'Route Group' },
      { key: 'rpcId', label: 'RPC-ID' },
      { key: 'ttId', label: 'TT ID' },
      { key: 'orderEquipment', label: 'Order Equipment', align: 'center' },
      { key: 'indirectPoint', label: 'Indirect Point', align: 'center' },
    ],
  },
  {
    key: 'commitment',
    columns: [
      { key: 'commitment', label: 'Commitment' },
      { key: 'uom', label: 'UoM' },
      { key: 'accepted', label: 'Accepted' },
      { key: 'open', label: 'Open' },
      { key: 'comment', label: 'Comment' },
      { key: 'cvcId', label: 'CVC ID' },
    ],
  },
]

const CHECKBOX_LABELS = {
  orderEquipment: 'Order equipment',
  indirectPoint: 'Indirect point',
}

// The AC's one deliberate asymmetry: every absent field displays '--', EXCEPT
// these two, which fall back to unchecked. "If not returned, then unchecked" —
// so a dash here would be wrong, not merely ugly.
//
// Rendered as a gray Badge, NOT as a checkbox (user, 2026-08-18) and no longer as
// a bare glyph (user, 2026-08-26: "iconos alone look too small"). The AC's word
// is "Checkbox", but these are READ-ONLY routing output: a checkbox advertises an
// affordance that does not exist and invites the click. A lone 16px icon in a
// wide cell had the opposite problem — too little presence to read as a value at
// all, next to neighbours carrying real text.
//
// GRAY for both states, on purpose. Green/red would rank one outcome above the
// other, and neither is good or bad news: they are attributes of the carrier
// routing returned, not a pass/fail. The glyph carries the state, the badge only
// gives it weight.
//
// size={12} raw, not ICON_MD: there is no badge-icon token and every other
// Badge in the app already hardcodes 12 (ProductTab, ordersColumns). Worth a
// token if a third case appears; not worth inventing one here alone.
//
// Yes / No spelled out, because the badge has room for it and a checkmark alone
// leaves "Order Equipment ✓" to be read as either "yes, it matches" or "checked
// this field". aria-label stays on the badge for the same reason it always did:
// the AC's fallback here is "unchecked", never '--'.
function CheckCell({ field, on }) {
  const Icon = on ? Check : CircleX
  return (
    <Badge variant="gray" leftIcon={<Icon size={12} aria-hidden="true" />}>
      <span aria-label={`${CHECKBOX_LABELS[field]}: ${on ? 'yes' : 'no'}`}>{on ? 'Yes' : 'No'}</span>
    </Badge>
  )
}

export default function DroppedCarrierSection({
  carriers = [],
  defaultOpen = true,
  onProcess,
  processingScac = null,
}) {

  // Two disclosure levels, both open by default:
  //   • the SECTION opens by default (user ruling, 2026-08-17)
  //   • each CARRIER's detail band also opens (Jana, 2026-08-25)
  //
  // The band used to start closed while holding all 15 non-row fields, which is
  // how 5 of the 6 Volume Commitment fields ended up invisible. It is open now,
  // so nothing in this section is behind a chevron.
  const groups = carriers.map((c, i) => ({
    // RPC-ID would be the natural key but routing does not return it for a
    // dropped carrier. SCAC + equipment is the same compound key 13954's
    // duplicate rule uses; the index disambiguates the rest.
    id: `${c.scac}-${c.equipment}-${i}`,
    label: c.scac,
    values: c,
    // Nested-flavor GroupTable reads `group.detailRows`, not `group.rows`
    // (`group.rows` is the non-nested flavor's child-row list) — verified
    // against GroupTable.jsx before wiring this.
    detailRows: [c],
    // Always rendered, dash included: absent optional values read '--' per the
    // AC's Null Handling rule, and a silently missing row would read as "no
    // reason given" rather than "routing returned none". Survives every sub-tab
    // switch — it is the section's whole purpose, so it never rotates away.
    detailNote: { label: 'Reason Description', value: c.reasonDescription ?? '--' },
    // LINX-13954. The slot GroupTable has always had — `stickyActions` pins the
    // lane, `group.action` fills it. The section stays presentational: it
    // reports the press and renders the disabled state it is told about; it
    // validates nothing and knows nothing about routing.
    action: onProcess ? (
      <Button size="sm" variant="secondary" disabled={processingScac != null} onClick={() => onProcess(c)}>
        Process SCAC
      </Button>
    ) : undefined,
  }))

  return (
    <SubAccordion
      title={`Dropped Carrier (${carriers.length})`}
      defaultExpanded={defaultOpen}
      showIcon={false}
    >
      {carriers.length === 0 ? (
        <p className="dropped-carrier__empty text-label-sm-regular">
          Routing did not drop any carriers for this shipment.
        </p>
      ) : (
        <GroupTable
          columns={COLUMNS}
          detailSections={DETAIL_SECTIONS}
          groups={groups}
          defaultExpanded
          renderDetailCell={(row, col) =>
            col.key in CHECKBOX_LABELS
              ? <CheckCell field={col.key} on={row[col.key]} />
              : (row[col.key] ?? '--')
          }
          stickyActions={Boolean(onProcess)}
          actionsHeader="Action"
          data-dropped-carrier-table
        />
      )}
    </SubAccordion>
  )
}
