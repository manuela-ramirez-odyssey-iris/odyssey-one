# Manual consolidation — Efrain design pass (2026-09-25)

Source: user message 2026-09-25 + Efrain's Figma (file `x38TOJGsNryYl3LsKhCtSc`):
- Review & Apply: `2796:19146`
- Tendered Shipment Detected, ≥3 selected: `2808:53668`
- Tendered Shipment Detected, 2 selected: `2808:58194`
- Applied (success): `2808:49810`

Efrain's mock TEXT is not canonical: fix his typos ("Costumer Name" → **Customer Name**; no duplicated tile labels like two "Total Volume"); keep our existing labels unless this spec gives new copy.

## Slice A — Shipments list, consolidate mode (`routes/shipments/ShipmentsRoute.jsx`, `components/shipments/TableControls.jsx`, `consolidation/eligibility.js`, `styles/components.css`)

A1. **No pulse on select.** In consolidate mode, checking a row no longer highlights/pulses it (`highlightId` is null in mode; drop `lastCheckedId` if nothing else uses it).

A2. **"Selected on top" checkbox** next to the item counter ("N items" in TableControls), shown only in consolidate mode, **unchecked by default**. Unchecked → rows stay in place (plain `pageRows`, no float). Checked → today's float (selected rows first on page 1, `tableRows` logic). Label: `Show selected on top`. Resets to unchecked when the mode exits. Why: floating all selected rows fights pagination.

A3. **Remove the subtitle** "Select to consolidate. Only direct shipments are consolidatable". Keep the row's slot (same height) before an anchor exists so the tabs don't jump (S155 §1.4) — just render it empty.

A4. ~~Tendered directs become selectable~~ — **dropped (user, 2026-09-25): tendered shipments stay unselectable.** Eligibility is unchanged.

A5. **StepperButtonsFooter always on top.** `.stepper-footer` z-index 1 → above every in-page layer (the DataTable sticky head/columns go up to 4) but below side panels/bars (39+) and modals: use `z-index: 30`. It overlapped the table's sticky checkbox column in the manual consolidation view.

## Slice B — Review & Apply (`routes/shipments/ConsolidationReviewRoute.jsx`, `consolidation-review.css`, `consolidation/proposal.js`, `api/_lib/consolidateShipments.mjs` + the mock apply path)

B1. **No checkboxes** in "Selected shipments to consolidate". Remove the select column, include/exclude state, and the *Minimum Two Shipments* uncheck dialog. The rows ARE the consolidation. Changing the set = **Edit Consolidation** (back to the mode with the selection).

B2. **Draggable planned stops.** Under "Planned Stops": **Discard** + **Save Changes** buttons (secondary, side by side, full width of the card) and a grip (`lucide/grip-vertical`, right side) on each stop row; drag to reorder. Reuse the drag pattern already in the repo (`components/detail/TabArrangementPanel.jsx` / `ColumnPanel.jsx`) — no new dependency. Labels re-number live (P1…/D1… by type and position). Discard/Save disabled until the order differs from the saved one; Discard restores the saved order; Save commits it. Save validates: every order's pickup stop precedes its delivery stop (fallback when the stop↔order link is absent: no delivery above the first pickup) — on failure an inline error Alert, not saved. Apply is disabled while there are unsaved stop changes. **The saved order is what Apply builds**: pass the stop order to the builder in BOTH runtimes (optional `stopOrder` on the POST body / mock call; `consolidateShipments.mjs` keeps its current pickups-then-deliveries default when absent). API change → verify with `npm run dev:api`.

B3. **Tendered check at Apply** (before the existing Apply confirmation). Why it exists (user, 2026-09-25): a tender can be accepted WHILE the planner is consolidating. The prototype has no such event, so it is **simulated**: on the first Apply of a review, 50% of the time one random selected row is tendered for real (Accepted on its first-ranked option, same save path as the Tender tab) — `ponytail:` prototype-only. If any row has an active tender (`Sent`/`Accepted`, same set eligibility used), open **ModalMedium "Tendered Shipment Detected"**:
- `Alert` error: `N Error(s): Shipment <id> has already been tendered and cannot be consolidated.` (one sentence per tendered shipment; plural "Shipments … have" when several).
- A table of ALL selected rows: **Shipment Status** (`Tendered` red badge on tendered rows, blank otherwise), **Odyssey Shipment ID**, **Customer ID(s)**, **Order Number** (amber chip), **Pickup Date**.
- Two radio cards (bordered, full width, radio + icon + text; selected card = darker border + subtle fill; first option preselected):
  - if remaining untendered ≥ 2: (Trash2) `Remove tendered shipment(s) and proceed with the remaining N.` / (Replace-style icon) `Cancel tendered shipment(s) and continue consolidation.`
  - if remaining < 2: (Trash2) `Discard and select different shipments. Consolidation requires at least 2 shipments.` / (same) `Cancel tendered shipment and continue consolidation.`
- Footer: **Nevermind** (secondary, closes, nothing changes) / **Apply Solution** (primary).
- Outcomes: *Remove* → drop the tendered rows from the review (stops/summary recompute) and continue to the Apply confirmation. *Discard* → back to consolidate mode with the tendered rows unselected (same exit as Edit Consolidation, minus those rows). *Cancel tender* → **reuse the Tender tab's Cancel mechanism as-is** (user, 2026-09-25) for each tendered row, then continue to the Apply confirmation with all rows.
- The live apply endpoint must accept a source whose tender is now Cancelled; if it re-checks tender server-side, keep that check (it's the backstop).
- The radio-card is local markup for now (Figma's cards are detached frames). Logged in `playground/normalization-tracker.md` › Ad-hoc Implementations for a D session; don't add it to `@odyssey/ui` here.

B4. **Applied state** (after a successful Apply):
- Green success banner at the top (keep our copy + View Shipment unless nothing else changes: `Consolidation Successfully Applied! …`).
- Summary top band: **Customer Name**, **Odyssey Shipment ID** (the new C id), **Orders** (blue order chips) — replaces "Selected Shipments".
- **The table shows the new consolidated shipment** — ONE row, the created C row VM, with the Shipments list's default columns (reuse the list's column config, read-only, no selection). Not the source rows.
- Stops read-only: no grips, no Discard/Save.
- Footer unchanged (Back to Shipments / Edit Consolidated Shipment).

## Tests
Each slice: update the existing suites (`consolidateMode.test.jsx`, `ConsolidationReviewRoute.test.jsx`, `eligibility.test.js`, `proposal.test.js`, `consolidateShipments.test.mjs`) and add one test per new behaviour. jsdom can't drag — test the reorder through the handler/keyboard or a pure reorder helper.
