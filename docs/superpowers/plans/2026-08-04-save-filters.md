# Save Filters — implementation plan (S108)

Spec: `docs/superpowers/specs/2026-08-04-save-filters-design.md` (rev 4).
Model policy: **Sonnet subagents implement all code**; each phase reviewed before
the next. Nothing commits, deploys, or touches Neon without user approval.

**Figma gates 2 + 3 are CLOSED** (done 2026-08-04, verified by screenshot):
- `MenuRowRadio` set `3447:6593` → `Show Badge#4930:0` BOOLEAN (default false)
  driving an `Author Badge` (Badge `Shape=Pill, Variant=gray`, `isExposedInstance`,
  placeholder text `by: username`) inserted **before** the chevron in all 5 variants.
- `GlobalSearch` set `658:18` → `Copy Search Icon` (lucide `copy`, 16px, paint
  matched to the clear icon) inserted **before** `Clear Search Icon` inside
  `Searchbar-Main`, in `State=Default` + `State=Focused`. `State=Title` has no
  search input — deliberately skipped.
- Known cosmetic: at the master's fixed 240px, a MenuRowRadio label truncates
  when the badge is on. Real rows are ~672px (mock `1079:31240`). Faithful
  constraint demo, not a defect.

**Gate 1 (migration) remains OPEN** — Phase 3 does not run until the user
approves it explicitly.

---

## Phase 0 — Library components (unblocks everything)

**0a. `MenuRowRadio` author badge.**
- Prop `badge` (ReactNode or string; renders our `Badge` when a string) placed
  **before** the chevron inside the nav zone, mirroring the Figma order.
  Cite `Show Badge#4930:0` on set `3447:6593` in the header comment.
- Code Connect: `badge: figma.boolean('Show Badge', { true: …, false: undefined })`
  — check `MenuRowCheckbox.figma.tsx` for the idiom; **no ternaries** (parser trap).
- Tests: absent by default; rendered before the chevron when passed; existing
  select/navigate zones unaffected.
- DSM demo: add to props doc + the ONE Playground. `dsm-flags MenuRowRadio
  --demote --react-only` (already NORMALIZING from `draggable` — confirm, don't
  double-demote), patch version bump, tracker line (Angular catch-up owed).

**0b. `GlobalSearch` copy button.**
- Ghost button immediately **before** the `CircleX` clear
  (`GlobalSearch.jsx:377-385`): lucide `Copy`, `ICON_MD`, `color: accent`,
  `aria-label="Copy search"`, `onMouseDown` preventDefault like its neighbour.
- New prop `onCopy` (optional). Renders only when provided — no dead control in
  consumers that don't wire it. No-op/disabled when `!value && !chips.length`.
- Transient "Copied" feedback: swap the icon to `Check` for ~1.5s. No toast
  system, no new dependency.
- Code Connect + tests + DSM demo + `--demote` + version bump + tracker, same as 0a.

**0c. Shared preset chrome (pure move, no behaviour change).**
- Extract `GroupLabel` + `PresetActionsMenu` from `ColumnPanel.jsx` (`:116`, `:149`)
  into `apps/odyssey-one/src/components/common/presetChrome.jsx`.
- Repoint `ColumnPanel.jsx` and `TabArrangementPanel.jsx` imports.
- Verification is that both existing suites stay green with **zero** other edits.

---

## Phase 1 — Personal filters (Custom group), no DB work

**1a. Hosting move.** Lift saved-filter state + the modal into
`ShipmentsGlobalSearch`; `ShipmentsFiltersView` takes list + callbacks as props.
- `useUserPreference('shipments.savedFilters')` lives in the host; `save()` pairs
  with `setQueryData` (the hook is `staleTime: Infinity` + fire-and-forget, so an
  unseeded cache loses the write on remount).
- Modal renders as a **sibling** of `.shipments-results-panel`, inside
  `.shipments-global-search` (the panel's `translateX(-50%)` would otherwise trap
  a `position: fixed` overlay).
- `handleKeyDown` early-returns while the modal or an inline rename is active
  (Enter in any INPUT currently commits the search; Escape closes the panel).

**1b. Save modal.** `ModalMedium` + `FormField` (`showInfo` off) + read-only
`SearchChip`s (**pass `label` as a string for every chip** — passing `codes`/date
fields drags a CalendarPicker + document listener into the modal) + Cancel/Save.
Prefill from bar chips **including `textChip`**; default title
`"<attrLabel>: <value>"`; Save disabled on blank title / no chips; chip removal
affects the save only.

**1c. Persistence shape.** `{ v: 1, custom: [{ id, name, chips }] }`;
strip `open`/`monthHint` (`chipsSearchKey`'s exact line), drop `invalid` chips,
`crypto.randomUUID()` ids, array position = order, drop unknown-key chips on hydrate.

**1d. Saved tab — Custom group only for now.** `GroupLabel` + ⋮ +
`MenuRowRadio draggable` rows, single select, drag reorder (wrapper div, per
`ColumnPanel.jsx:690-717`). ⋮ → **Edit Name** (inline input on the selected row,
cursor in it, text selected; Enter commits, Escape cancels, blur commits) and
**Delete Filters** (batch mode: radio → bordered `MenuRowCheckbox`, footer
Cancel / "Delete (n)", `ModalMedium` confirm).

**1e. Select → count → apply.**
- Selecting counts via `searchShipments(chips, query, customerIds)` on the
  **customer-scoped** adapter passed from the host (the view's unscoped import
  would disagree with the table). Debounce/cancel; feed `loading` to
  `GlobalSearchPanel`.
- New `onApplySaved(chips)` → `applyChips` wholesale + commit + close. **Not**
  `{commit, replace}` (that path flattens set chips through `chipsToFilters` →
  `mergeFiltersIntoChips`).
- Suppress the results panel via S107's `dismissRef`; the specific re-open is
  `chips.length > prev.chipCount`. **This also fixes the existing All-tab bug.**
- Nothing selected → footer button disabled.

**1f. Copy button wiring.** `onCopy` → `navigator.clipboard.writeText` of the
readable summary (`Label: value · Label: value`, plus free text). Guard for
absent `navigator.clipboard` (non-secure contexts).

**1g. Deletions.** `queryStringToFilters` + its test · `INITIAL_SAVED` ·
`.shipments-filters__saved*` CSS · `FilterPanel.jsx` (dead, zero importers).

---

## Phase 2 — Odyssey defaults (constants, still no DB)

- 2–3 shipped filters as code constants, built **only** from attributes the
  search actually projects. **INVENTED** → decision-log entry + raise with Jana.
- Second `GroupLabel` group, no ⋮, rows without grip, **fixed order**, not
  editable/deletable by anyone.

---

## Phase 3 — Sharing ⛔ BLOCKED on user approval of the migration

**3a. Migration** `packages/db/migrations/006_shared_filters.sql` — the table per
spec. Run against Neon **only** with explicit user go-ahead. No reseed.

**3b. API** `apps/odyssey-one/api/_lib/sharedFilters.mjs` + router registration,
following `preferences.mjs` conventions (pure `{text, values}` builders,
`$N` params only, `sharedFilters.test.mjs`). Routes: `GET` (list + author
username via `users` join), `POST`, `PATCH /:id`, `DELETE /:id`, the last two
author-checked. `ponytail:` comment naming the spoofable-userId ceiling until SSO.

**3c. Mock equivalent** so both modes behave identically.

**3d. UI.** Shared rows join the Odyssey group with `by: <username>` badges;
drag Custom → Odyssey shares, Odyssey → Custom un-shares (author only, drag
doesn't start for rows you don't own); delete mode checkboxes only on your own
shared rows; defaults and others' rows render disabled.

---

## Verification per phase

`npx vitest run apps/odyssey-one packages/ui` green at every phase boundary,
plus `node --test apps/odyssey-one/api/_lib/` for Phase 3. Phase 0c must show
zero behavioural diff. Browser pass owed at the end of Phase 1 (modal position,
Enter/Escape, inline rename cursor, drag reorder, no results panel on apply) —
jsdom cannot prove any of those.

## Decision-log entries owed

**GS-24** (supersedes GS-09 + GS-10) · the INVENTED Odyssey defaults ·
`MenuRowRadio` badge + `GlobalSearch` copy (both Figma-first, Angular catch-up
owed) · the shared-filter authorization ceiling.
