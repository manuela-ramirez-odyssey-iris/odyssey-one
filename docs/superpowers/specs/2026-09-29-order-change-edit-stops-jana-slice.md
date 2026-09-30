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

## F2 — KPI strip: five fields, nothing repeated (REVISED ×2, user 2026-09-29)
History: `c18ece0` put all the costs in the strip and deleted the All Stops metrics. `8711828` then made the strip Distance/Weight/Volume only and restored the All Stops metrics, which left the values repeated. Final ruling (user): *"if we have fields in the strip we don't need them repeated in all stops row"*; the strip is the agreed **five fields**, New Consolidated Cost is not one of them, *"yes no repeated"*.

| Edit Stops strip (sticky, live) | All Stops header row, lead side of View Planning Dates |
|---|---|
| Distance | New Consolidated Cost |
| Gross Weight | Accepted Carrier |
| Volume | Seed Equipment |
| Prior Cost | Utilization |
| New Direct Cost | |

- **Strip, Prior collapsed:** the current (new) values; Distance, Gross Weight and Volume are live with the changed signal (`DiffValue` + `TriangleAlert`). **Prior expanded:** Distance, Gross Weight and Volume show the Prior / New pairs when changed (today's `cell`). The two costs render the same in both states.
- **All Stops header:** only the four fields above, as `TitleSubtitle`s in `.edit-stops__metrics`, then View Planning Dates on the trail. **No field appears in both places.**
- `StopsTab`'s strip is unchanged: today's six cells, with the optional props absent.
- LINX-15435's pairs are one click away (expand Prior).

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

## F7 — Visual pass after the first look (user 2026-09-29, confirmed "Yes")
1. **Spacing:** add a gap between the Edit Stops strip and the All Stops SubAccordion (spacing token; match the page's section rhythm, e.g. `--spacing-6`).
2. **Info icon off the line:** the F3 `Info` icon moves to the **left side** of the rail (not on it; user 2026-09-29: "place icons left side of the line"), vertically centred on its segment. It is **16px** (`--icon-size-md`), **lighter** (`--text-placeholder`), and **close to the line** (about a `--spacing-1` gap) (user 2026-09-29). The rail line runs unbroken and is centred in its marker column. This applies to New, expanded Prior and collapsed Prior. The hover tooltip mechanics stay as they are (F3).
3. **Collapse/expand motion = Orders Pending To Assign's** (`.edit-stops__pending-slot`, `edit-stops.css:283-312`): the width animates via `--transition-panel`, and the content fades and slides (opacity + translateX, from the left for Prior). Reduced motion turns it off. Replace F1's `flex-basis`/`padding` transition with this pattern.
4. **Collapsed Prior is a floating card:**
   - **Header:** "Prior" keeps the **same header font as expanded** (`text-label-base-semibold edit-stops__plan-title`), not the smaller label.
   - **Expand button:** icon is lucide **`Maximize2`** (was `ChevronsRight`); `aria-label="Show prior plan"`, `aria-expanded="false"`. The collapse button in expanded Prior is unchanged.
   - **Card:** it floats like the pending panel: `position: sticky`, the same `top` calculation (`--edit-stops-strip-h`), `--bg-primary`, 1px `--border-subtle`, `--radius-2xl`, no shadow.
   - **Height:** it stretches down to the `StepperButtonsFooter`. Size its height to the viewport space between the sticky strip and the sticky footer; measure the footer's height the way `--edit-stops-strip-h` is measured, if needed.
   - **Rail:** the P/D markers spread along the full height (flex column, `justify-content: space-between`), with a longer line between them.
   - **Distance on the collapsed rail:** it now shows the `Info` icon beside each segment, and hovering a segment shows the same leg-distance tooltip (*"Distance from P1 to P2"*, `x.xx mi`) from Prior's `legTips`. Use the existing tooltip mechanism, and add no new tooltip type. This supersedes F3's "collapsed Prior shows no icons".
- **Tests:**
  - a gap class or structure between strip and All Stops;
  - the icon is outside the rail line element;
  - the expand button uses `Maximize2` (`data-testid` or the lucide class `lucide-maximize-2`);
  - the collapsed header has `text-label-base-semibold`;
  - collapsed Prior renders one info icon per segment and shows the leg tooltip on hover;
  - reduced-motion CSS exists (a smoke test is enough).
  - Layout (height, float) is jsdom-invisible, so report it for a browser check.

## F8 — Collapsed Prior revised (user 2026-09-29, after F7)
- **Icons:** the expand button (collapsed Prior) uses lucide **`UnfoldHorizontal`**, and the collapse button (expanded Prior, edit mode) uses **`FoldHorizontal`**. Aria labels and `aria-expanded` are unchanged. This supersedes F7's `Maximize2` and F1's `ChevronsLeft`.
- **No float:** collapsed Prior is **not** sticky and gets no viewport/footer-derived height. Remove `--edit-stops-footer-h` / `--edit-stops-scroll-h` if nothing else uses them. It sits in normal flow in the plans row, as expanded Prior does. It keeps the F7 outline (bg, border, radius); the user asked only that it stop floating.
- **Line length (corrected by the user: maximum, not minimum):** the collapsed rail's **maximum length = the expanded Prior's rail length**. Measure the expanded Prior timeline's height into a CSS var and give the collapsed rail `max-height` from it. The collapsed rail is never longer than expanded, and doesn't stretch with the row past it. The markers keep F7's spread within that height.
- **Info icon colour:** one tone lighter, `--deep-sea-neutral-300` (primitive: no semantic icon token exists at 300; user 2026-09-29).
- F7's info icons (left of the line), the leg tooltips and the slot motion all stay.
- **Tests:**
  - icons (`.lucide-unfold-horizontal` on expand, `.lucide-fold-horizontal` on collapse);
  - no `position: sticky` on the collapsed card (CSS read);
  - the collapsed rail gets a `max-height` from the measured var (mock the measurement in jsdom).
  - The visual length is for a browser check.

## Tests (vitest)
- **F1:** Edit collapses Prior. The collapsed rail shows markers only, with no order ids or addresses. The chevron expands and collapses it, with the right aria-expanded. Save, Discard and Reset re-expand it. The Moved/Removed signals render.
- **F2 (revised ×2):** the strip has exactly Distance, Gross Weight, Volume, Prior Cost and New Direct Cost (new values while collapsed; pairs for the first three when expanded). The All Stops header has exactly New Consolidated Cost, Accepted Carrier, Seed Equipment and Utilization, then View Planning Dates. No label appears in both. The StopsTab strip is unchanged.
- **F3:** one decorative info icon between each pair of stops in New (none in collapsed Prior), and the existing leg-tooltip tests still pass unchanged.
- **F4:** arrows render without hover in edit mode.
- **F5:** the helper returns each order's pickup/delivery stop dates from New, and `--` for a pending order. The modal renders both columns, and a move changes the value.
- **F6:** the title carries the number; there's no "Order Number:" text. The tabs are Order + one per line with changed counts. It opens on the first changed tab, switching tabs swaps the table, and there are no HeaderStrips in the line tabs.

## Split for implementers (disjoint files)
- **Agent 1:** `EditStopsView.jsx`, `edit-stops.css`, `OrderChangeEditStopsRoute.jsx`, `stopsSandbox.js` (F5 helper), `PlanningDatesModal.jsx`, and their tests (F1–F5).
- **Agent 2:** `OrderCompareModal.jsx` and its test (F6). If it needs `order-change.css`, it owns that file.

After build: DEC-225 (F1+F2, the Prior collapse and strip), DEC-226 (F3+F4), DEC-227 (F5), DEC-196 amendment → DEC-228 (F6). Canon: `order-change.md` §10e gets "built" markers.
