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

1. **Outer frame:** the table is enclosed in a visible border —
   `.co-product-table-wrap` gets `border: 1px solid var(--border-subtle)`,
   `border-radius: var(--radius-lg)`, `overflow: hidden` (corners clip the inner
   cell borders). The count line above and `+ Add Product` below stay **outside**
   the frame. The last body row drops its bottom border inside the frame
   (no double line with the frame edge).
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
