import { useMemo } from 'react'
import { Badge, GroupTable, SubAccordion } from '@odyssey/ui'
import PaneEmpty from './PaneEmpty'
import DroppedCarrierSection from './DroppedCarrierSection'
import { LOCKED_COLUMNS, TAB_COLUMNS } from './tenderColumns.js'
import { deriveRoutingHistory } from '../../data/routingHistory.js'
import { formatDateTimeMDYHM } from '../../lib/dates.js'

/**
 * LINX-15895 — Routing History.
 *
 * Every PRIOR routing version for the shipment, newest first, read-only. The
 * Tender tab keeps showing the CURRENT active version only; nothing here can be
 * acted on, because a past routing execution is a record, not a workspace.
 *
 * VD: collapsed 2257:68313 · expanded 2259:70116. One SubAccordion per version,
 * its header built from the molecule's own `badge` / `meta` / `trail` slots —
 * added in this cycle precisely because this card had to detach the master to
 * draw them (D15). Title · "Most recent historical" on the newest · the run's
 * timestamp · the orders on the shipment at the time · "Read-only", revealing the
 * AC's six sections — Routing Options, Response Comments, View Volume
 * Commitment, Additional Info, Others, Dropped Carriers — each itself collapsed
 * until opened, "so users can expand and review each routing version
 * independently".
 *
 * ── WHERE THE DATA COMES FROM ──────────────────────────────────────────────
 * It is DERIVED from the shipment's current detail (src/data/routingHistory.js),
 * not stored. The real backend has no write path for a routing version yet — it
 * clears the previous run's rows before writing the new ones — so there is
 * nothing to read even in live mode. Deriving keeps mock and live identical and
 * costs no API work; every rule in it is ours and provisional (decision log).
 *
 * ── WHY THE COLUMNS ARE THE TENDER TAB'S ───────────────────────────────────
 * "The information displayed within each section shall represent the snapshot of
 * the data captured during that routing execution" — the snapshot of WHAT the
 * Tender screen shows, so the section column groups are imported from
 * `tenderColumns.js` rather than restated here. Only Response Comments is ours:
 * the AC names carrier responses and response comments as their own category,
 * and the real ShippingOption carries `responseComments`/`responseReason`, while
 * the Tender tab's second sub-tab (Notify & Response Method) is Pro # /
 * Transporting Carrier / Equip # / Route Group. User ruling 2026-09-18.
 */

const DASH = '--' // LINX-13590 — empty optional values read '--'

/**
 * The ONE column that anchors a carrier row in the secondary sections.
 *
 * Was `LOCKED_COLUMNS.slice(0, 4)` — Route Rank · Rank · SCAC · Carrier Name —
 * repeated at the head of all five sections. Measured on a real version: 64
 * columns across the five tables, 20 of them identity, 16 of those pure repeats,
 * and the same four carrier rows restated five times.
 *
 * That repetition was inherited, not designed. Those five column groups are
 * SUB-TABS of one table on the Tender screen, which is what `LOCKED_COLUMNS`
 * means — locked WHILE THE TAB CHANGES. Stacking the groups as accordions
 * duplicates the locked columns instead of holding them still, which throws away
 * the reason they were locked.
 *
 * Nothing in LINX-15895 asked for it: the AC names the five sections and defers
 * everything else — *"Refer to the View Design for layout, expand/collapse
 * behavior, section organization, and version presentation details"*.
 *
 * SCAC alone survives (user ruling, 2026-09-18: drop Route Rank / Rank / SCAC /
 * Carrier Name, show only what is relevant per section). It is kept because a
 * row still has to be attributable to a carrier and SCAC is this domain's
 * canonical carrier id — and because GroupTable's flat mode only falls back to
 * `group.label` when the LEAD COLUMN is empty, so dropping it entirely would
 * leave the rows anonymous rather than labelled. Rank ordering is not lost: the
 * rows keep Routing Options' order, and Routing Options itself still carries the
 * full locked set, being the identity + outcome view.
 */
const IDENTITY_COLUMNS = [{ ...LOCKED_COLUMNS[2], primary: true }]

/** LINX-15895 AC — the section list, in the AC's own order. Dropped Carriers is
 *  NOT here: it follows 13953/13954 and already exists as its own component. */
/** The response fields the Tender screen hangs off its Routing Options sub-tab.
 *  Here they have a section of their own, so carrying them in BOTH is the same
 *  duplication the identity columns were (user ruling, 2026-09-18: show only what
 *  is relevant per section). Subtracted for THIS surface only — `tenderColumns.js`
 *  is shared with the live Tender tab, where the grouping is correct. */
const RESPONSE_KEYS = new Set(['responseMethod', 'responseDateTime', 'responseUser'])

const SECTIONS = [
  {
    key: 'routing-options',
    label: 'Routing Options',
    columns: [
      ...LOCKED_COLUMNS,
      ...TAB_COLUMNS['routing-options'].filter((c) => !RESPONSE_KEYS.has(c.key)),
    ],
  },
  {
    key: 'response-comments',
    label: 'Response Comments',
    columns: [
      ...IDENTITY_COLUMNS,
      { key: 'status', label: 'Tender Status' },
      { key: 'responseMethod', label: 'Response Method' },
      { key: 'responseDateTime', label: 'Response Date' },
      { key: 'responseUser', label: 'Response User' },
      { key: 'responseComments', label: 'Comments', width: 320 },
    ],
  },
  { key: 'volume-commitment', label: 'View Volume Commitment', columns: [...IDENTITY_COLUMNS, ...TAB_COLUMNS['volume-commitment']] },
  { key: 'additional-info', label: 'Additional Info', columns: [...IDENTITY_COLUMNS, ...TAB_COLUMNS['additional-info']] },
  { key: 'others', label: 'Others', columns: [...IDENTITY_COLUMNS, ...TAB_COLUMNS.others] },
]

/** AC, verbatim. */
const NO_DROPPED_CARRIERS = 'This routing version does not contain any dropped carriers.'

const STATUS_VARIANT = { Accepted: 'green', Sent: 'blue', Declined: 'red', Cancelled: 'gray' }

/** The tender outcome as the normalized Badge, not the Tender tab's inline-styled
 *  local StatusBadge — a new surface has no reason to inherit that drift. */
function statusCell(status) {
  if (!status) return DASH
  return <Badge variant={STATUS_VARIANT[status] || 'gray'}>{status}</Badge>
}

/** One carrier row, as GroupTable flat-mode `values` (keyed by column). Built per
 *  section so a section only pays for the columns it shows. */
function rowValues(option, columns) {
  const values = {}
  for (const col of columns) {
    const raw = option[col.key]
    values[col.key] = col.key === 'status'
      ? statusCell(raw)
      : (raw === null || raw === undefined || raw === '' ? DASH : raw)
  }
  return values
}

function VersionSection({ section, options }) {
  return (
    <SubAccordion title={section.label}>
      <GroupTable
        flat
        columns={section.columns}
        groups={options.map((o, i) => ({
          id: `${o.scac}-${o.rank}-${i}`,
          label: o.scac,
          values: rowValues(o, section.columns),
        }))}
      />
    </SubAccordion>
  )
}

function VersionCard({ version, newest }) {
  return (
    <SubAccordion
      className="routing-version"
      // The newest historical version opens on arrival — it is the one directly
      // behind what the Tender tab is showing, so it is what a planner came to
      // read. The rest stay collapsed, which is what makes "expand and review
      // each routing version independently" (AC) a usable list rather than a
      // wall. User ruling, 2026-09-18.
      defaultExpanded={newest}
      title={`Version ${version.version}`}
      // Only the newest carries it — "most recent HISTORICAL", the one directly
      // behind what the Tender tab is showing.
      badge={newest ? <Badge variant="purple">Most recent historical</Badge> : undefined}
      // "Historical routing versions shall be available in read-only mode" —
      // said on the card rather than implied by the absence of controls.
      trail="Read-only"
      meta={
        <>
          <span className="text-label-sm-regular routing-version__time">
            {formatDateTimeMDYHM(new Date(version.routedAt), { utc: true })} UTC
          </span>
          <span className="routing-version__orders">
            <span className="text-label-sm-regular routing-version__orders-label">Orders</span>
            {version.orders.map((order) => (
              <Badge key={order} variant="gray">{order}</Badge>
            ))}
          </span>
        </>
      }
    >
      <div className="routing-version__body">
        <div className="routing-version__body-head">
          <div className="text-heading-lg-semibold">Routing details</div>
          <div className="text-label-sm-regular routing-version__subtitle">
            Historical information captured for this routing version.
          </div>
        </div>
        {SECTIONS.map((section) => (
          <VersionSection key={section.key} section={section} options={version.options} />
        ))}
        {/* 13953/13954's own section, per the AC's "shall follow" — read-only here
            (no `onProcess`: reinstating a carrier from a past run is not a thing),
            and carrying the AC's verbatim empty line instead of the live tab's. */}
        <DroppedCarrierSection
          carriers={version.droppedCarriers}
          defaultOpen={false}
          emptyMessage={NO_DROPPED_CARRIERS}
        />
      </div>
    </SubAccordion>
  )
}

export default function RoutingHistoryTab({ details, shipment }) {
  const key = details?.odysseyShipmentIdentifier || shipment?.buyShipment || shipment?.sellShipment || ''
  const versions = useMemo(() => deriveRoutingHistory(details, String(key)), [details, key])

  if (versions.length === 0) {
    return (
      <PaneEmpty
        message="No previous routing versions for this shipment."
        hint="Routing has run once — the current version is on the Tender tab."
      />
    )
  }

  return (
    <div className="pane-canvas">
      <div className="pane-col pane-col--wide">
        {versions.map((version, i) => (
          <VersionCard key={version.version} version={version} newest={i === 0} />
        ))}
      </div>
    </div>
  )
}
