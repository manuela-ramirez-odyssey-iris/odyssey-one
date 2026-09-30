---
title: Order change — Edit Stops, Jana 09-29 layout slice (F1–F6)
date: 2026-09-29
session: S164
status: approved (user 2026-09-29: "OK")
---

# Order change — Edit Stops, Jana 09-29 layout slice

Source: `vault/00-inbox/Order Change Sync.vtt` (Jana ↔ Manuela, 2026-09-29, `@mm:ss`), ruled item by item by the user in S164. Its sibling is `2026-09-29-order-change-jana-sync-slice.md` (non-design, built in `cb00b9f`). **No seed change and no API change**: client only. Paths are under `apps/odyssey-one/src/`. Main files: `components/detail/order-change/EditStopsView.jsx`, `edit-stops.css`, `ReviewKpiStrip.jsx`, `PlanningDatesModal.jsx`, `OrderCompareModal.jsx`, and `routes/shipments/OrderChangeEditStopsRoute.jsx`.

## F1 — Prior collapses on Edit (Jana `@03:30`, `@04:08`)
Jana: *"once they click on the edit… collapse the prior… put it as an arrow mark… they can open and see what was prior later on"*; *"we need to give a better space for them to work."*
- **State:** `priorCollapsed`, set to **true** by `startEditing` and to **false** by leaving edit mode (Save, Discard, Reset). Outside edit mode Prior is always expanded, as today.
- **Collapsed Prior** is a rail about 56px wide. Take the width from a spacing token if one fits, otherwise a component-internal px value with a `ponytail:`/token comment.
  - **Header:** a "Prior" label (text-label-sm) with an expand chevron button under it (`ChevronsRight`, `Button variant="icon"`, `aria-label="Show prior plan"`, `aria-expanded="false"`).
  - **Body:** only the prior P/D markers, stacked in sequence (`Timeline` with no `content`, or a marker-only render of the same labels and green `completed` status). Leave out the addresses, the order lists, dates, the Moved/Removed badge text and the leg-distance tooltips.
  - **Change signal:**
    - Moved: a small gray dot beside the marker.
    - Removed: the marker dimmed with a strike line.
    - Both come from the same `diff.movedStopKeys` / `diff.removedStopKeys` today's badges read.
  - **Marker tooltip** on hover or focus: the stop's location, date and Moved/Removed state (existing `TooltipTrigger`).
- **Expanded Prior in edit mode:** the header's chevron flips to collapse (`ChevronsLeft`, `aria-label="Hide prior plan"`, `aria-expanded="true"`).
- **Motion:** the width change animates the way the pending column's slot already does (`edit-stops__pending-slot--open`). Honour `prefers-reduced-motion`.
- The collapsed rail is `inert`-free: it is a real, focusable control.

## F2 — One KPI strip: the 5 New values, plus Prior's when Prior is open (Jana `@16:01`–`@18:53`; user 2026-09-29)
Jana's list for **New**: *"all stops, prior, new, direct cost, new consol, distance, gross weight, volume, view planning dates"* (`@18:27`; also `@17:20`, `@17:50`). For **Prior**: *"distance prior and new, gross weight prior and new, volume prior and new, accepted carrier, seed equipment, utilization."* The user's ruling: the strip shows the New set while Prior is collapsed, and adds Prior's when Prior is expanded.

| Prior collapsed (edit mode) | Prior expanded (edit mode, or not editing) |
|---|---|
| 1. Gross Weight: current value, **live** | Gross Weight: Prior / New pair when changed (today's `cell`), else the current value |
| 2. Volume: current, live | Volume: pair when changed |
| 3. Distance: current, live | Distance: pair when changed |
| 4. Prior Cost · New Direct Cost · New Consolidated Cost | the same three costs |
| — | + Accepted Carrier · Seed Equipment · Utilization |

- **Live values.** Weight, volume and distance come from the sandbox (`curTotals`, `newLegs.total`, `EditStopsView.jsx:158,362`), and the pair's New half is live too. The changed flag uses today's `weightChanged` / `volumeChanged` / `distanceChanged`, so a collapsed changed value keeps a signal: the `DiffValue` changed styling with the `TriangleAlert`, as in the All Stops row today.
- **The strip holds values only.** The **View Planning Dates** link (calendar icon, `EditStopsView.jsx:560`) is an action, so it **stays exactly where it is** in the All Stops header, unchanged (user 2026-09-29).
- **No duplicate numbers.** The All Stops metrics values (`EditStopsView.jsx:545-551`: the three costs, Distance, Gross Weight, Volume) now live in the strip, so they're removed from the All Stops header. The header keeps the View Planning Dates link; the Alert and the plans stay.
- **Where it renders.** The strip moves into `EditStopsView`, at the top, still `sticky`, because the live values and `priorCollapsed` live there. The route stops rendering `ReviewKpiStrip` (`OrderChangeEditStopsRoute.jsx:126`) and passes `detail.stopsData.summary` + `c.summaryChanges` down instead (`summary` is already a prop).
- **Component.** Give `ReviewKpiStrip` the props it needs: `live` ({ grossWeight, volume, distance, changed flags }), `costs` and `priorCollapsed`. It builds the item list from them. `SummaryStrip` items are `{ label, value }` with node values; there's no action slot, and none is needed. **Do not modify `packages/ui`.**
- **`StopsTab` stays exactly as today**: it calls the strip without the new props and gets today's 6 cells. Make the new props optional so that path is byte-for-byte unchanged.
- **LINX-15435** (*"Prior and New values when changed"*) holds: the pairs are one click away, never removed.
- **Utilization** stays static (seeded) and Prior-side; making it live is a later ask.

## F3 — Distance info icon between stops (Jana `@04:54`)
Jana: *"put an indicator… information symbol in between P1 and P2… user hovers on top, it shows the distance."* The leg-distance tooltip already exists (hover the rail near a marker: `showRailTip`, `legTips`, `EditStopsView.jsx:224-230,397`). He just didn't know it was there.
- **Add a visual cue only**: an `Info` icon (lucide, ICON_MD, `--text-tertiary`, `aria-hidden="true"`) on the rail segment between each consecutive pair of stops, **in New and in expanded Prior**, placed inside the area that already triggers the leg tooltip.
- **Leave the hover mechanics exactly as they are** (user, 2026-09-29: *"leave hover alone how it is now"*): `showRailTip`, the `tip` state, the tooltip content and the leg-bolding stay untouched. The icon adds no handler and no second tooltip.
- If the icon sits over the rail line, give it the surface background so the line doesn't cross it. It must not shift the stop rows' layout.
- Collapsed Prior shows no icons (F1).

## F4 — Move buttons always visible in edit mode (Jana `@05:33`)
`edit-stops.css:210-216` shows the stop arrows only on hover or focus. In edit mode, show them always (`display: inline-flex`). Disabled arrows stay visible and disabled, via the existing `canMoveStop`. Delete the now-dead hover rules and the `@media (hover: none)` override, and update the comment.

## F5 — Planning Dates shows where each order sits now (Jana `@10:36`–`@12:16`)
The modal shows the order's window but not the stop date it's compared against, so the planner had to leave the modal to read 01/14.
- **New columns:**
  - **Planned Pickup** after Latest Ship.
  - **Planned Delivery** after Latest Delivery.
- **Value:** the `date` of the **current New** stop (`sb.stops`) of that type whose `orderIds` holds the order. This is the same `s.date` that `windowViolations` compares (`stopsSandbox.js:460-479`), so the badge and the column can't disagree.
  - It is live: a move or a date edit shows on reopening the modal.
  - A pending order (on no stop) shows `--`.
- **Plumbing:** pass the rows' planned dates in from `EditStopsView`, with a small helper beside `windowViolations` in `stopsSandbox.js`, plus a unit test.
- The DEC-199 missed-bound badge is unchanged.
- The order window stays the order's current values (Jana `@02:53`: no prior/new tracking on planning dates).

## F6 — Order Changes modal: number in the title, lines in tabs, no HeaderStrips (Jana `@00:20`, `@01:16`; DEC-196)
Today (`OrderCompareModal.jsx`) the modal stacks an "Order Number: …" HeaderStrip, the order-level bands, and one HeaderStrip + a 12-row table per line.
- **Title:** `Order Changes ${orderId}`, which also serves as the `ariaLabel`. Drop the Order Number HeaderStrip.
- **Tabs:**
  - A `Tab` row (`@odyssey/ui` `Tab`, in a `.tab-group`) with an **Order** tab first, holding today's `OrderChangeTenderDetails bare` content, then one **Line {lineNumber}** tab per line.
  - Each tab's `count` is its number of changed fields, omitted when 0.
  - `role="tablist"` / `role="tab"` / `aria-selected` / `role="tabpanel"` with arrow-key navigation. If `Tab` lacks these, add them in the consumer, and **do not modify `packages/ui`** (normalization rule).
- **Initial tab:** the first tab with a change, else Order.
- **Line tab:** today's Field | Prior | New table **without** its HeaderStrip and "Changed" badge (the tab count replaces them).
- **Bands:** check `OrderChangeTenderDetails bare` for its Changed/Unchanged bands. If they render as HeaderStrips, leave them as they are (they're shared with the Direct review) and note it in the report.
- **Decision log:** DEC-196 amended (layout only: per line is kept, blocks become tabs).

## Tests (vitest)
- **F1:** Edit collapses Prior. The collapsed rail shows markers only, with no order ids or addresses. The chevron expands and collapses it, with the right aria-expanded. Save, Discard and Reset re-expand it. The Moved/Removed signals render.
- **F2:** collapsed, the strip has exactly Gross Weight, Volume, Distance (current, live: adding or removing an order changes weight), and the three costs; the View Planning Dates link is still in the All Stops header and opens the modal. Expanded, it adds the pairs and Accepted Carrier / Seed Equipment / Utilization. The All Stops header no longer repeats the numbers. The StopsTab strip is unchanged.
- **F3:** one decorative info icon between each pair of stops in New (none in collapsed Prior), and the existing leg-tooltip tests still pass unchanged.
- **F4:** arrows render without hover in edit mode.
- **F5:** the helper returns each order's pickup/delivery stop dates from New, and `--` for a pending order. The modal renders both columns, and a move changes the value.
- **F6:** the title carries the number; there's no "Order Number:" text. The tabs are Order + one per line with changed counts. It opens on the first changed tab, switching tabs swaps the table, and there are no HeaderStrips in the line tabs.

## Split for implementers (disjoint files)
- **Agent 1:** `EditStopsView.jsx`, `edit-stops.css`, `OrderChangeEditStopsRoute.jsx`, `stopsSandbox.js` (F5 helper), `PlanningDatesModal.jsx`, and their tests (F1–F5).
- **Agent 2:** `OrderCompareModal.jsx` and its test (F6). If it needs `order-change.css`, it owns that file.

After build: DEC-225 (F1+F2, the Prior collapse and strip), DEC-226 (F3+F4), DEC-227 (F5), DEC-196 amendment → DEC-228 (F6). Canon: `order-change.md` §10e gets "built" markers.
