import { Square, SquareCheck } from 'lucide-react'
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
 * ── EXPECT DASHES ──────────────────────────────────────────────────────────
 * Routing returns only five attributes for a dropped carrier (scac, service,
 * drop-code, drop-reason, seq), so most columns below legitimately render '--'
 * today. That is the ticket's own Null Handling rule, not a data bug.
 *
 * COLUMN SPLIT IS PROVISIONAL. 13953 specifies 23 fields and no layout. The
 * division between the always-visible row and the disclosure is ours, not the
 * ticket's, and has not been through Figma. What is NOT negotiable is that the
 * commitment block stays on the CARRIER row: commitment is keyed on (carrier,
 * equipment, week), and Jana called out the trap directly — "here you would see
 * it as if like it is applicable for the entire drop carrier list, but it is
 * actually applicable for each and every option".
 */

// The always-visible row: who, what, and why it was dropped. GroupTable's
// nested flavor renders column 0 as the disclosure LABEL (not a `values`
// lookup — see groupHeaderValue), so `scac` leads and doubles as the row's
// accessible name; every column after it comes from `group.values`.
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

// Behind the per-carrier disclosure: routing provenance, then the commitment
// block. Reason Description is NOT here — it is the one long free-text field, and
// as a column it cost 360px and pushed the rest off the scroll extent. It renders
// as GroupTable's full-width `detailNote` row BELOW these values instead (user,
// 2026-08-17), which is what buys the horizontal room back.
const DETAIL_COLUMNS = [
  { key: 'startDate', label: 'Start Date', width: 110 },
  { key: 'stopDate', label: 'Stop Date', width: 110 },
  { key: 'transitTime', label: 'Transit Time', width: 116 },
  { key: 'transitSource', label: 'Transit Source', width: 130 },
  { key: 'routeGroup', label: 'Route Group', width: 124 },
  { key: 'rpcId', label: 'RPC-ID', width: 110 },
  { key: 'ttId', label: 'TT ID', width: 116 },
  { key: 'orderEquipment', label: 'Order Equipment', align: 'center', width: 140 },
  { key: 'indirectPoint', label: 'Indirect Point', align: 'center', width: 124 },
  { key: 'uom', label: 'UoM', width: 116 },
  { key: 'accepted', label: 'Accepted', align: 'right', width: 104 },
  { key: 'open', label: 'Open', align: 'right', width: 92 },
  { key: 'cvcId', label: 'CVC ID', width: 116 },
  { key: 'comment', label: 'Comment', width: 240 },
]

const CHECKBOX_LABELS = {
  orderEquipment: 'Order equipment',
  indirectPoint: 'Indirect point',
}

// The AC's one deliberate asymmetry: every absent field displays '--', EXCEPT
// these two, which fall back to unchecked. "If not returned, then unchecked" —
// so a dash here would be wrong, not merely ugly.
function CheckCell({ field, on }) {
  const Icon = on ? SquareCheck : Square
  return <Icon {...ICON_MD} aria-label={`${CHECKBOX_LABELS[field]}: ${on ? 'yes' : 'no'}`} />
}

export default function DroppedCarrierSection({
  carriers = [],
  defaultOpen = true,
  onProcess,
  processingScac = null,
}) {
  // Two independent disclosure levels, deliberately different defaults:
  //   • the SECTION opens by default (user ruling, 2026-08-17)
  //   • each CARRIER's detail table stays closed until asked for
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
    // reason given" rather than "routing returned none".
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
          detailColumns={DETAIL_COLUMNS}
          // 14 detail columns: give them their natural widths with the band's
          // own scrollbar instead of compressing to the outer table (user,
          // 2026-08-17).
          detailScroll
          groups={groups}
          defaultExpanded={false}
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
