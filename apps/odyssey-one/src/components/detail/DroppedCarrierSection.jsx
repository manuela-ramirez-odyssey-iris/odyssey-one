import { Check, CircleX } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Button, GroupTable, SubAccordion } from '@odyssey/ui'

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
 * ── THE INNER TABLE FOLLOWS THE TENDER SUB-TAB (2026-08-25) ────────────────
 * 13953 specifies 23 fields and no layout. The first attempt put 8 on the row
 * and 15 in ONE fixed inner table behind a closed chevron, which Jana read as
 * "not all fields are displayed. Also, volume commitment fields are missing" —
 * nine routing fields and five of the six commitment fields were real,
 * populated, and invisible.
 *
 * Two things changed, and only two. The band is always open, and the inner
 * table's columns now rotate with the active tender sub-tab instead of being a
 * fixed run of 14. The carrier row is untouched — it was never the problem.
 *
 * The tab structure is borrowed from the table directly above rather than
 * invented, so `View Volume Commitment` swaps the columns on BOTH tables and the
 * heading Jana looks for finally covers this section too.
 *
 * A sub-tab is not the same kind of hiding as the old chevron: it is labelled,
 * top-level, always on screen, and already how a reviewer reads the tender list.
 * The chevron gave no signal that anything was behind it — which is precisely
 * how the complaint happened.
 *
 * Jana's scoping trap still holds: commitment is keyed on (carrier, equipment,
 * week) — "here you would see it as if like it is applicable for the entire drop
 * carrier list, but it is actually applicable for each and every option" — and
 * every commitment value renders inside its own carrier's band.
 *
 * Still not through Figma. The field-to-tab assignment is derived from the
 * tender list's own (see TAB_COLUMNS) rather than drawn, so it is defensible but
 * not designed.
 */

// The carrier row — identical on every sub-tab. Identity, why it was dropped,
// the dates, and Commitment. Unchanged from the original 8: the row was never
// the problem, so it does not move.
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
  { key: 'commitment', label: 'Commitment', align: 'right', width: 120 },
]

// The INNER table's columns, now driven by the active tender sub-tab instead of
// being one fixed run of 14 (Jana, 2026-08-25: "not all fields are displayed…
// volume commitment fields are missing"). Same five tabs as the tender list
// above, so `View Volume Commitment` swaps the columns on BOTH tables and the
// heading Jana looks for finally covers this section too.
//
// The assignment is not ours to invent: each field goes to the tab where the
// tender list already keeps the field of that name (routeGroup lives under
// Notify & Response, transitTimeSource/transitTimeId under Additional Info,
// indirectPoint/orderEquip under Others). Start Date and Stop Date have no
// tender counterpart and sit with the other RPC lookups they share a key with
// (13397 §7/§8 both read `where rpc_id = :rpc_id`).
//
// Commitment itself stays UP on the carrier row — it is the one commitment field
// that was always visible and it keeps that spot; the tab carries the five that
// qualify it.
//
// The band is always open (see defaultExpanded), so these are on screen the
// moment the section is — the 14-column run behind a closed chevron is what
// produced the complaint.
const TAB_COLUMNS = {
  'routing-options': [
    { key: 'transitTime', label: 'Transit Time', width: 116 },
    { key: 'transitSource', label: 'Transit Source', width: 130 },
  ],
  'notify-response': [
    { key: 'routeGroup', label: 'Route Group', width: 124 },
  ],
  'volume-commitment': [
    { key: 'uom', label: 'UoM', width: 116 },
    { key: 'accepted', label: 'Accepted', align: 'right', width: 104 },
    { key: 'open', label: 'Open', align: 'right', width: 92 },
    { key: 'cvcId', label: 'CVC ID', width: 116 },
    { key: 'comment', label: 'Comment', width: 240 },
  ],
  'additional-info': [
    { key: 'startDate', label: 'Start Date', width: 110 },
    { key: 'stopDate', label: 'Stop Date', width: 110 },
    { key: 'rpcId', label: 'RPC-ID', width: 110 },
    { key: 'ttId', label: 'TT ID', width: 116 },
  ],
  others: [
    { key: 'orderEquipment', label: 'Order Equipment', align: 'center', width: 140 },
    { key: 'indirectPoint', label: 'Indirect Point', align: 'center', width: 124 },
  ],
}

const CHECKBOX_LABELS = {
  orderEquipment: 'Order equipment',
  indirectPoint: 'Indirect point',
}

// The AC's one deliberate asymmetry: every absent field displays '--', EXCEPT
// these two, which fall back to unchecked. "If not returned, then unchecked" —
// so a dash here would be wrong, not merely ugly.
//
// Rendered as check / circle-x, NOT as a checkbox (user, 2026-08-18). The
// AC's word is "Checkbox", but these are READ-ONLY routing output: a checkbox
// glyph advertises an affordance that does not exist and invites the click.
// Same two states, stated as status rather than control.
function CheckCell({ field, on }) {
  const Icon = on ? Check : CircleX
  return <Icon {...ICON_MD} aria-label={`${CHECKBOX_LABELS[field]}: ${on ? 'yes' : 'no'}`} />
}

export default function DroppedCarrierSection({
  carriers = [],
  defaultOpen = true,
  onProcess,
  processingScac = null,
  subTab = 'routing-options',
}) {
  // An unknown sub-tab falls back to the default view rather than rendering an
  // inner table with no columns in it.
  const detailColumns = TAB_COLUMNS[subTab] ?? TAB_COLUMNS['routing-options']

  // Two disclosure levels, now BOTH open by default:
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
          detailColumns={detailColumns}
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
