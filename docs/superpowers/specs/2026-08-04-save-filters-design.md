# Save Filters — design (S108)

**Status:** spec, rev 4 (post Opus review + preset-groups + sharing) · **Date:** 2026-08-04 · **Domain:** cross-cutting / global-search (Shipments host)

## Sources

- **Figma (Global Search — Odyssey One, `HwShG7mKfaX2Ef6x4sKWfz`):**
  `1079:31179` "New Saved Filter Confirmation" (save modal) · `1079:31240`
  "Saved Filter Selection" (Saved tab rows).
- **User description (2026-08-04):** Save Filters opens a medium modal with an
  editable name and the filters confirmed as chips; **what gets saved is the
  reflection of what is in the search bar**. Selecting a saved row updates the
  primary button with **the full results of that filter**; "Show N results"
  **applies directly — no preview results panel**.
- **User rulings (2026-08-04):** user-preference API for personal filters ·
  **single** select · chevron **expands** the row to show its chips · **drag
  reorder in scope** · mocks don't use our components (mapping is our job) ·
  **no info icon** · **preset groups mirroring column arrangement**, ⋮ for
  delete + rename, rename **puts the cursor in the selected row** · groups
  **Custom Filters** / **Odyssey Filters**, Odyssey defaults undeletable ·
  **Odyssey is also the SHARED group** — users drag their custom filters in to
  share; a shared filter is deletable/editable/movable **only by its author**,
  and shows **`by: <username>`** in a badge on the row's trailing side ·
  **un-share allowed (author only)** · **shared-group order is fixed** (nobody
  drags inside it) · copying someone else's filter is handled by **a copy icon
  in the search bar, left of the X**.
- **Review:** Opus adversarial review, 2026-08-04 — 5 blockers, folded in.

## Supersedes (traceability)

Superseded here as **GS-24** (GS-23 = the empty-bar reversal):
- **GS-09** — "an applied saved filter appears as ONE chip using the saved
  title." **Superseded:** applying restores the **actual chip set**; one opaque
  chip can't be edited or partially removed, and the bar would stop being "the
  reflection" the user's description requires.
- **GS-10** — storage as `{ id, title, conditions[] }`. **Superseded:** can't
  express a GS-21 **set** chip or a GS-22 **date-range** chip.

## ⚠ Three gates before implementation

1. **DB migration (needs explicit user go-ahead — DB rule).** Sharing means user
   B reads what user A wrote. `user_preferences` is `PK (user_id, key)` and every
   read is hard-scoped to the caller (`api/_lib/preferences.mjs:7-11, 27`), so
   shared filters cannot live there. **New table required.** No reseed — a new
   empty table, existing data untouched.
2. **Figma-first: `MenuRowRadio` needs a trailing badge slot.** The chevron owns
   the trailing slot today (`MenuRowRadio.jsx:69-72`); there is nowhere for
   `by: <username>`. Same treatment as the grip: Figma property first
   (a `Show Badge` BOOLEAN + text, sitting before the chevron in the nav zone),
   then code, then NORMALIZING both DSMs + version bump + Angular catch-up.
3. **Figma-first: `GlobalSearch` needs the copy button** (Figma `658:18`) — see
   behaviour 10. This component is fully normalized and Angular-ported; the
   GlobalSearch v1 no-normalize exemption does NOT cover it.

## Data model

**Personal (Custom group)** — `user_preferences`, key `shipments.savedFilters`:
```js
{ v: 1, custom: [ { id, name, chips: [...] } ] }   // array position IS the order
```

**Shared (Odyssey group)** — new table, migration `006_shared_filters.sql`:
```sql
CREATE TABLE shared_filters (
  id             text PRIMARY KEY,
  owner_user_id  text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           text NOT NULL,
  chips          jsonb NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
```
No `position` column — shared order is fixed (below). Author username resolves
through `users.username` (already exists, migration `004`, INVENTED per S105).

**Odyssey DEFAULTS** ship as code constants (mirroring `PRESETS.odyssey`) — not
in either store, never editable, no author badge.

Chip rules (both stores):
- **Strip transient UI state:** `chips.map(({ open, monthHint, ...rest }) => rest)`
  — the exact line `chipsSearchKey` uses. A saved date chip carries `open: true`;
  re-hydrated it would reopen a CalendarPicker under the bar and flip
  `pendingDateChip`.
- **Drop `invalid` chips** at save time. `v: 1` for future shape changes.
- **On hydrate, drop chips whose `key` no longer exists** in
  `SHIPMENTS_PROGRESSION`, or a stale filter silently applies as 0 results.
- `id` = `crypto.randomUUID()`.

### ⚠ Odyssey default filters are INVENTED

No canon defines them. Seed 2–3 built **only** from attributes the search
actually projects (e.g. Mode, Tender Status, Hazmat), each flagged INVENTED in
the decision log and **raised with Jana** before this reaches a demo.

## API (new)

`api/_lib/sharedFilters.mjs` + router registration, following the
`preferences.mjs` conventions (pure `{ text, values }` builders, all user input
via `$N` params, `_lib/*.test.mjs` coverage):

| Route | Purpose |
|---|---|
| `GET /filter-service/v1/shared-filters` | list all + author username (join `users`) |
| `POST /filter-service/v1/shared-filters` | share (create) |
| `PATCH /filter-service/v1/shared-filters/:id` | rename — author only |
| `DELETE /filter-service/v1/shared-filters/:id` | delete/un-share — author only |

**Authorization ceiling, stated plainly:** nothing authenticates today — the
client sends its mock-SSO `userId` (`preferences.mjs:5`). Author checks compare
`owner_user_id` to that value, which is **spoofable**; real enforcement lands
with SSO (Soni). Mark with a `ponytail:` comment naming the ceiling. Mock mode
gets an in-memory equivalent so the two modes stay behaviourally identical.

## Component mapping (ours, from the mock's look + function)

| Mock element | Our component | Note |
|---|---|---|
| Modal shell/header/footer | `ModalMedium` | Hosted in `ShipmentsGlobalSearch` — see Hosting. |
| Title field | `FormField` | `showInfo` **off**. |
| `Label: value ×` chips | `SearchChip` | **Pass `label` (a string) for EVERY chip**, incl. set/date — then it renders a plain span + X, no chevron/panel/listeners. Passing `codes`/date fields would drag a CalendarPicker + a document mousedown listener into the modal. |
| Group headers + ⋮ | `GroupLabel` + `PresetActionsMenu` | **Reused from ColumnPanel** — see below. |
| Saved row | `MenuRowRadio draggable` + **new badge slot** | `draggable` shipped 2026-08-04; badge slot is gate 2. |
| Delete-mode row | `MenuRowCheckbox` (bordered) | Mirrors ColumnPanel's delete mode. |
| `by: username` | `Badge` | Inside MenuRowRadio's new trailing slot. |
| Tabs / panel / footer | `PillTab` / `GlobalSearchPanel` | already present |

**Preset-group chrome — reuse, don't re-draw.** `GroupLabel`
(`ColumnPanel.jsx:116`) is already exported for sibling panels;
`PresetActionsMenu` (`:149`) is local. Extract both to
`apps/odyssey-one/src/components/common/presetChrome.jsx` and repoint the three
consumers (ColumnPanel, TabArrangementPanel, the new Saved tab). Pure move, no
visual change to the existing two.

Drag: HTML5 DnD on a **wrapper div** per row (the `draggable` prop is
destructured, not forwarded to the DOM), copying `ColumnPanel.jsx:690-717`.

## Hosting — one structural decision (resolves 4 defects)

**The modal AND all saved-filter state live in `ShipmentsGlobalSearch`**, not in
`ShipmentsFiltersView` (which takes list + callbacks as props):

1. `.shipments-results-panel` has `transform: translateX(-50%)`, making it the
   containing block for `position: fixed` — `ModalMedium`'s overlay would size to
   the panel, not the viewport, inside a `z-index: 49` trap. The modal renders as
   a **sibling** of the panel inside `.shipments-global-search` (relative, no
   transform), keeping it inside `wrapperRef` so outside-click doesn't fire on it.
2. The wrapper's `onKeyDown` commits the search on **Enter in any INPUT** and
   closes on **Escape** — both fire while typing a filter name or inline-renaming.
   A modal/rename-active flag must **early-return from `handleKeyDown`**.
3. `ShipmentsFiltersView` unmounts on every panel close, and `useUserPreference`
   is `staleTime: Infinity` with a fire-and-forget `save()` that never seeds the
   cache — a just-saved filter would **vanish on reopen**. The always-mounted host
   holds the hook; `save()` pairs with `setQueryData`.
4. `ValueComboBox.test.jsx` renders `ShipmentsFiltersView` bare with no
   `QueryClientProvider`; putting `useQuery` inside the view breaks it.

## Behaviour

1. **Save modal** — prefilled from the current bar chips **including `textChip`**
   (excluding it would silently save nothing for a pasted 40-order-number
   search). Title defaults to the first chip's `"<attrLabel>: <value>"`.
   Save disabled on blank title / no chips. Chip removal affects the save only.
   Save → persist to **Custom** → switch to the Saved tab → close.
2. **Saved tab = two groups.**
   - **CUSTOM FILTERS** — `GroupLabel` + ⋮. Rows: single-select, **reorderable**.
   - **ODYSSEY FILTERS** — `GroupLabel`, no ⋮. Contains the shipped defaults
     **and** shared user filters. **Fixed order** (defaults first, then shared by
     `created_at`) — nobody drags inside it, so no one's panel rearranges under
     them.
3. **⋮ (Custom group only):**
   - **Edit Name** — acts on the **selected** filter: its label becomes an inline
     input with the **cursor in it** (text selected); Enter commits, Escape
     cancels, blur commits. Enabled only when the selection is one the current
     user owns.
   - **Delete Filters** — batch mode mirroring ColumnPanel (`4301:19405`): Custom
     rows swap radio → bordered `MenuRowCheckbox`, footer becomes Cancel /
     **"Delete (n)"** + `ModalMedium` confirm. In the Odyssey group only the
     **current user's own shared** rows get checkboxes; defaults and other
     people's shared filters render **disabled**.
4. **Sharing = drag between groups.**
   - Custom → Odyssey: shares it (POST; `owner_user_id` = current user). The row
     gains its `by: <username>` badge.
   - Odyssey → Custom: **un-shares** (DELETE + restore to Custom) — **author
     only**; the drag doesn't start for rows you don't own.
   - Reorder-by-drag remains a **Custom-group** behaviour; dropping into Odyssey
     is a move-between-groups gesture, not a reposition.
5. **Ownership rules (one sentence):** *the author edits, everyone applies.*
   Shipped defaults have no author and are never editable.
6. **Chevron expands** a row to show its chips as read-only `SearchChip`s (no
   `onRemove` → no X). **Accepted delta:** `MenuRowRadio`'s nav zone is the label
   **and** chevron, so clicking the name expands rather than selects; only the
   radio selects. Documented, not hand-rolled around.
7. **Selecting** does NOT apply; it counts, via
   `searchShipments(chips, query, customerIds)` (returns a full `total` without
   touching the bar) using the **customer-scoped** adapter passed from the host —
   the unscoped module import the Filters view uses today would show a total that
   disagrees with the table it lands on. Debounce/cancel on rapid selection; feed
   `loading` to `GlobalSearchPanel` (not passed today).
8. **"Show N results"** with a row selected → **`onApplySaved(chips)`**, a
   dedicated prop calling `applyChips(chips)` wholesale + commit + close.
   **NOT** `{ commit, replace }`: that path runs `chipsToFilters` →
   `mergeFiltersIntoChips`, which only emits `attribute`/`date-range` chips, so a
   set chip round-trips back flattened with `codes`/`typeLabel` lost — exactly the
   loss this spec exists to prevent. **Nothing selected → button disabled.**
9. **No preview panel on apply.** The specific re-open to suppress is
   `chips.length > prev.chipCount` in the panel effect; reuse S107's `dismissRef`
   (consumed unconditionally at the effect top; `applyChips` always sets a fresh
   array, so the flag can't strand). **Also fixes an existing bug** on the All
   tab's `{commit:true}` path, which re-opens the glimpse today whenever filters
   add a chip.
10. **Copy-to-clipboard icon in the search bar**, left of the clear (X).
    Copies **the current applied query** — a general bar affordance, deliberately
    NOT a per-saved-row action: *"that would mean an exclusivity feature"*
    (user). It is also the answer to "how do I take someone else's shared
    filter": apply it, then copy the query.
    - **Where:** `packages/ui/src/GlobalSearch.jsx:377-385`, immediately before
      the `CircleX` clear button. Same ghost-button idiom, `ICON_MD`, `accent`
      colour; `aria-label="Copy search"`; disabled/no-op when the bar is empty.
      Confirmation is a transient "Copied" affordance, not a toast system.
    - **What:** a human-readable rendering of the committed search —
      chips as `Label: value` joined by ` · `, plus any free text. Optimised for
      pasting into chat, not for machine round-trip.
    - **Not in scope:** pasting that string back into the bar to rebuild chips
      (no parser exists). Natural follow-up if users start doing it.
    - **Lifecycle: Figma-first, no exemption.** The GlobalSearch v1 no-normalize
      exception covers only the NEW search-experience atoms — it explicitly does
      **not** cover `packages/ui/src/GlobalSearch.jsx` (Figma `658:18`), which is
      fully normalized, Code Connect mapped, and already ported to Angular. So
      the copy button is a third Figma-first gate: Figma → code → Code Connect →
      NORMALIZING both DSMs → version bump → Angular catch-up.

## Deletions this feature should claim

`queryStringToFilters` + its test · `INITIAL_SAVED` ·
`.shipments-filters__saved*` CSS · `FilterPanel.jsx` (dead code, zero importers,
carries the ancestor `SAVED_QUERIES`).

## Testing

- Modal: prefills incl. `textChip` · removal affects save only · Save disabled on
  blank title/no chips · **Enter in the title field does NOT commit the search** ·
  Escape closes the modal only.
- Persistence: `preferenceService` round-trip of a **set** chip and a
  **date-range** chip; rehydration seeding the query cache. **Mock mode is an
  in-memory `Map`** — session-scoped by design, so assert the round-trip, not a
  literal reload.
- Strip: no `open`/`monthHint`, no `invalid` chips in the payload.
- API builders (`sharedFilters.test.mjs`): parameterized SQL, author check
  rejects a non-author PATCH/DELETE.
- Groups: defaults have no badge/⋮ and never delete; another user's shared row is
  applicable but not editable/deletable/draggable; my own shared row is all three.
- Sharing: Custom → Odyssey creates + badges; Odyssey → Custom un-shares
  (author only); shared order stays fixed.
- Rename: ⋮ → Edit Name focuses the selected row with the cursor in it; Enter
  commits + persists; Escape cancels; Enter does not commit the search.
- Delete: batch → "Delete (n)" → confirm → persists; Cancel restores.
- Apply: bar replaced with real chips (set chip keeps `codes`/`typeLabel`), table
  filtered, **results panel never opens**. Nothing selected → button disabled.
- Reorder persists, Custom-only. Unknown-key chips dropped on hydrate.
- Extraction is a pure move: ColumnPanel + TabArrangementPanel suites stay green.

## Out of scope

Renaming Odyssey defaults · per-user ordering of the shared group · real
authorization (lands with SSO) · saving from anywhere but the Filters panel.

**Known gaps (acknowledged, match precedent):** drag reorder is mouse-only HTML5
DnD with an `aria-hidden` grip (same as `ColumnPanel`); author checks are
spoofable until SSO.

## Reseed / migration

**Reseed: NO.** **Migration: YES** — `006_shared_filters.sql`, a new empty table.
Existing data untouched; personal filters remain a `user_preferences` key
(`001_schema.sql:104`), which needs nothing. Requires explicit user go-ahead
before running against Neon.
