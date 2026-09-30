---
domain: consolidation
type: spec
tags: [consolidation, history, lineage, audit-trail]
date: 2026-09-30
status: approved
---

# Consolidation lineage in the History tab (S164)

## Sources

- **The 2026-09-23 call** (`vault/00-inbox/Consoloidation Questions 2.vtt`, Doug / Thomas / Jana / Steve / Soni / Manuela). The solved idea is at the end of the call (cleaned transcript lines ~1755–1919):
  - The new C has a **link** to each hidden source. The sources are "not in the list anymore… empty, hidden, but this one still has a link" (Manuela; Thomas: "Correct").
  - A load pulled out of a C gets a new O that "has a link to both of the consolidated and the original ship one" (Thomas).
  - Each shipment keeps its own timeline. To see a hidden shipment's history "you're gonna have to go through that link" (Manuela; Thomas: "I agree with you. That's how it should be").
  - Why it's worth building: Doug — "You need the audit… you have to be able to get to it… Melody's not gonna write SQL". Steve — tender-reject history must stay reportable. Jana held that it was not MVP and was outvoted on the call; Thomas: "The question is whether you can search and find it in the UI."
  - Soft delete, not delete: Jana/Saikat say LINX already soft-deletes. Thomas: "We're not deleting anything."
- **VDs** (Figma `x38TOJGsNryYl3LsKhCtSc`), History Subaccordion layer: 2671:81594 (Shipment History), 3113:19333 (tree collapsed), 3121:60581 (root expanded), 3126:19659 (nested expanded), 3127:20032 (preview tabs open).
- **User rulings, 2026-09-30:** seed + live; Merged from = ancestry path; keep our trail rows; closable tab built app-local and logged ad-hoc.
- **The VDs set the LOOK only** (user, 2026-09-30: "figma is just so you can know how it should look, might have typos and wrong data"). Take anatomy, spacing and tokens from Figma. Ids, counts, labels and sample events come from our model, and the copy is written in this spec.

Status: approved 2026-09-30.

## 1. Data: `detail.lineage` (the link)

The contract that slices A and B share. It lives on every shipment's detail blob (the SellShipmentOut jsonb):

```js
detail.lineage = { sources: LineageNode[] }   // absent = no lineage (today's shipments)
LineageNode = {
  sellShipment, odysseyShipmentIdentifier,     // ids of the source
  origin, destination,                         // its list columns when it went dormant
  orders: string[],                            // order numbers it held when it went dormant
  hidden: boolean,                             // true = soft-deleted shell → "Preview only"
  sources: LineageNode[],                      // ITS lineage, copied from its detail at merge time
}
```

- **A snapshot, not a pointer graph.** History is immutable, so each child copies its sources' subtrees when it is written. The tree then renders from ONE detail with no extra fetches, and mock and live read it the same way.
- **The tradeoff:** we can't query "where did X go" across shipments; the hidden shipment's own trail says it in text (§2). A link table plus migration is the upgrade if a forward query is ever needed. Mark it with `ponytail:`.
- **Mapper:** `mapSellShipmentOutToDetail.ts` passes it through as `vm.lineage` (null when absent). Add the type to `shipmentDetail.ts`.

## 2. Soft delete (live + mock)

A hidden shipment **is** a C5 emptied shell: `orders = '{}'`, `order_count = '0'`.
- `NOT_EMPTIED` already hides such a shell from the list, the counts and search (DEC-202), and `sellShipmentDetail` still reads it by id. We add no new hiding rule.
- Its `detail` stays **untouched**, so its orderList, stops and trail are a frozen snapshot, and the row keeps origin/destination.
- One event is appended to its `historyList`, reusing the existing action name, so the event vocabulary is not extended (DEC-80):
  `{ action: 'Consolidation Completed', outcome: 'update', author: { name: 'OdysseyONE', kind: 'system' }, source: 'OdysseyONE', user: 'OdysseyONE', category: 'update', timestamp: now, details: 'Orders {list} moved to consolidated shipment {C id}. This shipment is no longer active.' }`

**Live Apply** (`api/_lib/consolidations.mjs`):
- Replace `DELETE FROM shipments WHERE sell_shipment = ANY(gone)` with an UPDATE that empties those rows and appends the event (`jsonb_set` on `{historyList}`). Keep their `search_index` rows deleted (already done).
- The CNS-09 id-reuse branch (a C source re-applied under its own id) is unchanged. That C is the result, not a hidden source.

**Builder** (`api/_lib/consolidateShipments.mjs`, shared by live and mock): set `built.detail.lineage.sources`, one node per consumed source (`removedSellShipments`), `hidden: true`, each carrying `source.detail.lineage?.sources ?? []`.
- An external contributor emptied by `writeSourceUpdates` gets a node too (`hidden: true`).
- A partial contributor that stays live is **not** a source. The order's own trail covers that move (Jana/Soni on the call).
- Id reuse: when the result id equals a source id, that source is not added as a node; its existing `lineage.sources` carry over first.

**Split → new O** (`buildSplitShipment` in `api/_lib/shipments.mjs`): the new O gets `lineage.sources = [sourceNode, originalNode?]`.
- `sourceNode` is the shipment the order left: `hidden: false` if it still holds orders, else `true`.
- `originalNode` is the leaf in `source.detail.lineage` whose `orders` contains this order, when one exists. This is Thomas's "links to both".
- The caller knows whether the source empties. Pass `sourceHidden` in.

**`writeSplits` guard:** it currently DELETEs an `order_count '0'` row that holds the re-minted split id. That row may now be a lineage shell, which other shipments point to.
- The collision only happens when `idsFor(orders.id)` re-mints the id of a hidden shell. Skip the DELETE when the shell's trail carries the §2 dormancy event. The INSERT then PK-fails loudly and rolls back instead of erasing history.
- `ponytail:` this only bites on a second pull-out of the same order (rare). Upgrade path: a split sequence.

**Mock** (`consolidationService.ts`): `removeShipments` already tombstones rows only; overlay and `/details` blobs stay readable. The one change is to apply the same dormancy event to a tombstoned source's overlay/raw blob, so its preview trail ends correctly.

## 3. Seed (`tools/generate.mjs` + `tools/seed.mjs`)

Every seeded **C with ≥ 2 orders** gets a lineage and its hidden source shipments.
- **Zero faker draws.** Use an own-salt id-keyed PRNG (`':lineage'`), run after the main loop, so `shipments.json` and `order-details.json` stay byte-identical for existing rows. Test that.
- **Partition:** split the C's orders into 2…min(n, 4) groups. A 1-order group becomes a hidden **O** leaf.
  - A group of ≥ 2 orders becomes a hidden **C**, recursing to depth ≤ 3 (like the VD).
  - A 1-order group, depth 1, at ~20%: a hidden O that came **out** of an older hidden C. Its sources are [that C (hidden, sources = this order's original O + one sibling order's original O), the original O]. This is the VD's "O… 2 sources" row; the sibling order must be another order of the same live C.
- **Hidden shipment blob:** `orderList` and `shipmentStopList` are filtered from the C's to the group's orders. Origin/destination come from those stops (`rowFromStops` logic).
  - Trail: Shipment Created → Optimization Evaluation (Consolidation) → the §2 dormancy event, all timestamped before the C's own first event. Reuse the generator's `pushHistory` catalog.
  - `shippingOptionList: []`. There is no tender history; adding it would touch tender invariants.
- **Ids** use deterministic, non-faker bands:
  - odyssey ids continue `odysseySeq` after the main loop (O/C prefix by order count);
  - sell `24_000_000 + n`;
  - buy from a band verified free against `genUniqueBuyShipment` / `idsFor` / the consolidation and split bands.
  - `ponytail:` a source's id is higher than its C's (autoincrement would make it lower). That's the price of not renumbering.
- **Output:** each hidden blob goes to `public/details/{sell}.json`, but its row is **not** in `shipments.json` (mock never lists it).
  - The generator also emits `hiddenShipments` rows (order_count '0', orders []). `seed.mjs` inserts them into `shipments` together with their events, and adds no `orders`, `tenders` or `search_index` rows.
- **Invariants test** (`generate.test.mjs`):
  - every node's `orders` ⊆ its parent's (the root's = the C's orders);
  - leaves partition the C's orders exactly (the pull-out shape counts once via its original O);
  - every hidden node has a details file and a `hiddenShipments` row;
  - no hidden id collides with a listed id;
  - existing rows are byte-identical.

## 4. UI: History tab (`src/components/detail/HistoryTab.jsx` + new `LineageTree.jsx`)

**No lineage** (`!vm.lineage?.sources?.length`, i.e. every Direct and every unseeded C): exactly today's static SubAccordion. No tabs, no summary.

**With lineage**, per the VD:
- **Card:** the white History card (radius 2xl, 16/24/20 padding, shadow sm). Its header is a `tab-group` row of `@odyssey/ui` `Tab`: **Shipment History · Lineage Tree · one closable tab per opened preview**. There is a bottom border-subtle under the row and 24px to the content. If `SubAccordion` can't take a tab row as its header, use its surface classes directly.
- **Closable tab (app-local, `LineageTab` in the same file or `LineageTree.jsx`):** Tab anatomy plus a 16px lucide `x` button (`aria-label="Close {id}"`) after the label.
  - Selecting a tree row focuses its already-open tab rather than duplicating it.
  - Closing the current tab falls back to the tab on its left.
  - Tab state resets when the shipment changes.
  - Log it ad-hoc in `playground/normalization-tracker.md`.
- **Shipment History tab:**
  - **Summary card:** border-subtle, radius 8. It holds a kicker (`CONSOLIDATED SHIPMENT` for C, `SHIPMENT` for O, label/xs medium uppercase tertiary), the id (heading), and three TitleSubtitle cells on the right: Customer, Origin, Destination.
  - **Band** (bg neutral-50): `Merged from:` followed by chips. On the live shipment the chips are its **direct sources**, `·` separated. Each chip is a depth dot plus a link-coloured semibold id; clicking one opens its preview tab.
  - **Event History:** the heading `EVENT HISTORY` plus `N events` on the right, then **our existing trail rows unchanged** (renderer extracted so the preview reuses it).
- **Lineage Tree tab:**
  - **Header band** (bg neutral-50): `Consolidation Lineage`, the root id (xs tertiary), a Badge blue `{N} shipments` (unique nodes, root included), and on the right a ButtonLink sm `Expand All` / `Collapse All` with lucide `list-chevrons-up-down`.
  - **Root row:** chevron (20), depth dot, id (link, semibold), `origin → destination` (xs tertiary, max 180px, ellipsis), Badge blue `{k} sources`. No Preview-only badge, since the root is live.
  - **Expanded node:** a section strip (bg neutral-50, lucide `merge` 16, `SOURCES OF {node id}`, xs medium uppercase tracking 0.6px tertiary; the VD repeats the parent's id there, which is a typo), then one row per source.
  - Indent: 16px root, then +16 per level. Rows are 41px with border-bottom subtle; a leaf has no chevron and keeps the dot's alignment.
  - Hidden rows carry Badge gray `Preview only` with lucide `lock` leftIcon, plus Badge blue `{k} sources` when k > 0.
  - Chevron toggles; clicking the id opens the preview tab (root id → Shipment History tab). The root starts collapsed (3113).
  - Keyboard: chevron and id are buttons.
- **Preview tab** (a hidden shipment): the same layout as Shipment History, fed by `useShipmentDetail(sellShipment)`, which works for hidden ids in both modes.
  - `Merged from:` shows the **ancestry path** root → … → this node, `→` separated (lucide `arrow-right` 16, tertiary). Chips are clickable; the root chip goes to Shipment History.
  - The events are that shipment's own trail. It shows a loading and an error state (PaneEmpty).
- **Depth dot (6px)**, same colours in the tree and the chips: depth 0 `--badge-blue-text`, 1 `--badge-green-text`, ≥ 2 `--badge-yellow-text`. It is decorative (`aria-hidden`).
- Every value goes through a token. New CSS goes in the file that owns `.history-*` today.

## 5. Tests

- `HistoryTab.test.jsx`:
  - no lineage → unchanged;
  - lineage → both tabs and the summary with direct-source chips;
  - tree root collapsed; expand shows `Sources of`;
  - Expand All / Collapse All;
  - `Preview only` only on hidden rows;
  - id click opens a closable tab (focus, no dupes, close falls back);
  - preview shows the ancestry path and that shipment's trail (mocked `getSellShipmentDetail`).
- Builder and split tests for the lineage nodes and `hidden` flags; `consolidations.test.mjs` asserts **no `DELETE FROM shipments`** for the sources, only the empty-and-append UPDATE.
- Generator invariants as in §3.

## 6. Canon (same commit as the build)

- `vault/10-domains/consolidation/decisions/decision-log.md`:
  - **CNS-21** — sources are soft-deleted shells linked from the C, and a pulled-out load's new O links to the C and its original. Source: the 09-23 call; previous state: CNS-11 / S155 hard DELETE.
  - **CNS-22** — History tab lineage UI. Source: the VDs and this spec.
- `consolidation.md` §11: the 09-23 lineage model. The §10 tension table closes on "soft-deleted + linked".
- The 09-23 transcript can then be filed to `vault-sources/` (`/analyze` if the user wants the full intake).

## Slices

Two `implementer` agents on disjoint files, then ONE reseed and ONE deploy, each on the user's go:
- **A — data:** `consolidateShipments.mjs`, `consolidations.mjs`, `shipments.mjs` (split and writeSplits), `consolidationService.ts`, `generate.mjs`, `seed.mjs`, and their tests.
- **B — UI:** `HistoryTab.jsx`, `LineageTree.jsx`, CSS, mapper and type, and their tests. It develops against a fixture lineage until A lands.

## Out of scope

- The Order-domain trail of shipment moves (Jana/Soni).
- Tender history on hidden sources.
- The one-load-C rule (DEC-216 vs the 09-23 call).
- Search or navigation to hidden shipments outside the tree.
- A forward "merged into" query.
