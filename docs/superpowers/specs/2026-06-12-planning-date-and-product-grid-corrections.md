# Create Order — Planning Date/Time + Product Grid corrections

**Date:** 2026-06-12 · **Author:** Fable (image analysis requested by Manuela — "write the specs with fable")
**Sources (Efrain captures):** `vault/00-inbox/PlanningDate issue.png` (our defect), `vault/00-inbox/PlanningDate fix.png` (target), `vault/00-inbox/4. Create New Order - Product Information{1,2,3}.png`
**Supersedes:** the Planning Date/Time layout in spec §3.2 (2026-06-11) and the Product grid ⋮ menu behavior in §3.3.

## A. Planning Date/Time (PickupDeliverySection)

**Defect (issue capture):** the four date groups render as two horizontal rows
(pickup pair, delivery pair) — six field columns side-by-side that clip past the
section's right edge; labels are composites ("Early Pickup Date"); no column
separator.

**Target layout (fix capture), top to bottom:**

1. Heading `Planning Date/Time` — unchanged.
2. Blue info Alert — text unchanged, **dismissible** (shows ✕; was `showClose={false}`).
3. Radio row `Ship Date & Time | Delivery Date & Time` — unchanged.
   **Overflow fix (verified in-browser 2026-06-12):** the triad columns and the
   planning columns are CSS grid items; `min-width: auto` (the default) refuses to
   shrink below the fields' intrinsic width, so the right (Delivery) column
   overflowed the viewport by ~390px. Fix: `min-width: 0` on `.co-planning-col`
   and `.co-triad > *` lets the `1fr` columns share width and the inputs truncate
   their placeholders ("Select Timezon…") instead of clipping. No scrollbar.
4. **Two-column grid** (`.co-planning-grid`): left column = pickup, right = delivery.
   **Vertical separator** between the columns: same mechanism as `.co-party-grid`
   (first column `border-right: 1px solid var(--border-subtle)`, the gutter split
   into `padding-right`/`padding-left: var(--spacing-8)`; columns stretch equal
   height so the rule spans the block).
5. Each column stacks **two groups** (`gap: var(--spacing-6)`):
   - Left: `Earliest Pickup Date and Time`, `Latest Pickup Date and Time`
   - Right: `Earliest Delivery Date and Time`, `Latest Delivery Date and Time`
6. **Group structure:** a heading line (`text-label-sm-medium`, `--text-primary`)
   followed by a **three-equal-column triad** (`1fr 1fr 1fr`, `gap: var(--spacing-3)`)
   of Date / Time / Time Zone.
7. **Labels:** field labels are exactly `Date`, `Time`, `Time Zone` — the
   Earliest/Latest wording lives only in the group heading. The composite
   "Early Pickup Date" labels are retired.
8. **Required marking (Q22 unchanged):** the conditionally-required group
   (Ship → Latest Pickup; Delivery → Latest Delivery) carries ` *` on its
   **group heading and on all three field labels**. (The fix capture stars the
   Latest-Delivery heading while Ship is selected — treated as a capture
   inconsistency; the earlier P&D Long capture confirms stars follow the radio.)
9. **Placeholders:** Date `Select Date` (was `MM/DD/YYYY`), Time `Select Time`
   (was value `00:00`), Time Zone `Select Timezone` (was `Select`).
10. **Time default becomes empty** so the placeholder shows:
    `makeEmptyTriad().time` `'00:00'` → `''`. Safe because (a) `optionalTime`
    schema already accepts `''`, (b) the mapper already defaults
    `triad.time || '00:00'` at the wire (LINX-7634), (c) `toComparableDateTime`
    already falls back `'00:00'` for warnings.

## B. Product Information grid (ProductGrid)

1. **No outer frame** (CORRECTED 2026-06-12 — captures 4.1/4.3 show no bordered
   card; an earlier reading added one, which Manuela flagged as wrong). The table
   reads as **header underline + row separators only** (the `.odyssey-table` cell
   contract), exactly like the References table — `.co-product-table-wrap` carries
   no border/radius/padding, only `overflow-x: auto` for narrow viewports.
   Read-row VALUES keep their input-style boxes (`.co-product-readbox`, captures
   4.3); that is a per-cell box, not a table frame.
2. **⋮ is a direct edit trigger, not a popover menu.** Clicking a read row's ⋮
   flips that row into the inline editor whose controls are
   `Cancel · Save · ⤢` — "the three dots expand into save/cancel/icon"
   (captures 2/3). `OrderRowActionMenu` (Edit/Delete popover) is removed from
   ProductGrid. The ⋮ button: `aria-label="Edit product"`,
   `aria-expanded={editing === row.id}`.
   - **Flagged residual (Efrain/Jana):** row **Delete** loses its entry point in
     this design — confirm where deletion lives (expanded row modal? grid menu
     later?). `deleteRow` code removed until designed.
3. Unchanged (already conform): header-column manage icon + vertical separator,
   count line between toolbar and table, boxed read-row values, header
   asterisks, filtered-no-matches row.

> AI-written spec from Efrain's captures; behavior decisions (Q22 stars,
> time-default wire fallback) trace to the 2026-06-11 build spec. Validate the
> Delete residual before demo.
