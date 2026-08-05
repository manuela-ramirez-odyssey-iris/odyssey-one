# Filters panel — two modes (S110 rev 2)

**Status:** APPROVED (decisions answered 2026-08-05) · **Date:** 2026-08-05 · **Source:** user direction 2026-08-05
**Supersedes:** `2026-08-05-filters-profile-flow.md` (rev 1) in the parts noted below.

## The model

The All-filters panel has **two modes**:

| Mode | Fields are… | Bar coupling |
|---|---|---|
| **Free mode** (default) | the live search's own criteria | **two-way** — bar ⇄ panel, edit from either side |
| **Edit-filter mode** (profile editing) | a saved profile's criteria | **decoupled** — nothing reaches the bar until the profile is updated |

Free mode is what exists today. Edit-filter mode is new, and the decoupling is
its defining property: editing a saved profile must not disturb the search the
user is currently looking at.

## 1. Tabs

- Order returns to **All · Saved** — All moves back to the **left**.
  (Reverses rev 1, which put Saved first.)
- The All tab is **always labelled "All"**. It is never renamed to the profile.
  (Reverses rev 1, which renamed the tab.)
- **Its count changes by mode:** free mode counts the live filter fields in use;
  edit-filter mode counts **the fields belonging to the profile being edited**.

## 2. Selecting a row

Both zones of a saved row now **select**:
- the **radio** selects (unchanged)
- the **row body** also selects, turning the radio on — mirroring column presets

**The row body no longer navigates.** (Reverses rev 1.) Selection is the only
thing a click does; entering the editor is an explicit ⋮ action.

## 3. The ⋮ menu — three options, all acting on the SELECTED row

| Option | Effect |
|---|---|
| **Edit Filters** | enters edit-filter mode on that profile → All panel, header becomes `Edit <profile name>` |
| **Edit Name** | inline rename — Custom rows **and the author's own shared rows** (decision 2) |
| **Delete Filters** | batch delete mode, as today |

All three require a selection; disabled otherwise.

## 4. Edit-filter mode

Entered only via ⋮ → **Edit Filters**.

- **Panel header** reads `Edit <profile name>`.
- **The "Save Filters +" link is HIDDEN** — you are editing an existing profile,
  not creating one.
- **Primary button is `Update Filter`**, and is **inactive until at least one
  field changes**. (In rev 1 this was a secondary link; it is now the primary.)
- **No bar coupling.** Every change stays inside the panel. The search bar and
  the table are untouched until the profile is updated — the whole point of the
  mode.
- **On `Update Filter`:** persist, **apply to the bar + table**, then **switch
  to the Saved tab with that profile still selected** (decision 1).
- **Leaving without updating warns first** (decision 4).

## 5. Free mode

- Fields are wired to the bar **both ways** — edit in the bar or the panel.
- The **`Save Filters +` link is visible**, and **disabled when no field is
  filled** (nothing to save).
- Primary stays `Show N results`, as today.

## 6. Saved tab structure

- **Custom Filters** group — the user's own profiles.
- **Odyssey Filters** group — contains **shared user profiles** and **shipped
  defaults**, with a **line separator between the two sub-sets** so it reads as
  "shared by people" above "shipped by Odyssey".
- **Drag Custom → Odyssey shares** the profile; the dragged row gains a badge
  with **its author**.

## 7. Per-row copy icon — ⚠ reverses GS-26

Every saved row gets a **clickable copy icon** that copies that profile's
filters **without applying it first**, so the user need not apply-then-copy from
the bar.

**This contradicts [[../../vault/20-cross-cutting/global-search/decisions/decision-log|GS-26]]**
(2026-08-05), which recorded — from the user's own words — that copy is a *bar*
affordance and deliberately **not** a per-row action, because a per-row copy
*"would mean an exclusivity feature."* The user has now asked for exactly that.
Logging as a superseding decision (**GS-28**) rather than quietly editing GS-26,
per the project's traceability rule. The bar copy button **stays** — the two
coexist.

## Decisions (answered by the user, 2026-08-05)

1. **`Update Filter` PERSISTS AND APPLIES.** It saves the profile, replaces the
   bar with that profile's chips, re-filters the table, and returns to the Saved
   tab with the row still selected. You immediately see the results of what you
   just edited. (This overrides rev 1's persist-only rule, and it is the one
   moment edit-mode's decoupling ends — deliberately, because the update is the
   user's explicit commit.)
2. **`Edit Name` covers Custom rows AND the author's own shared rows.** Someone
   else's shared row and every Odyssey default stay disabled. This **revises the
   earlier same-day ruling** ("only the selected custom rows"), which was aimed
   at the *open-profile fallback* rather than at shared ownership; with an
   explicit three-option menu the author case is wanted. Uses the existing
   `PATCH /shared-filters/:id` route.
3. **Copy puts the SAME string on the clipboard as the bar's copy button** —
   `Label: value · Label: value`, human-readable, optimised for pasting into
   chat. Both paths must agree, so they share one formatter.
4. **Leaving edit-filter mode with unsaved changes WARNS first** — a confirm
   ("Discard changes to <profile>?" · Cancel / Discard) on any exit that would
   lose them (tab switch, panel close, selecting another profile). This is the
   one interruption the panel has; it exists because edit-mode changes are
   invisible everywhere else until updated, so silent loss would be undetectable.

## What this reverses from rev 1 (implemented earlier today)

- Tab order Saved·All → **All·Saved**
- Tab renamed to the profile → **header** renamed instead; tab stays "All"
- Row body navigates → row body **selects**
- `Save Filters +` renamed to `Create New Filter` → **stays `Save Filters +`**,
  disabled when empty
- `Update Filter` as a secondary link → **primary button**, edit-mode only
- Chevron-expand deletion **stands** (unchanged)
- `Update Filter` persist-only → **persist AND apply** (decision 1)
- Edit Name Custom-only → **Custom + own shared** (decision 2)

## Drag — rebuilt, not debugged

The cross-group drag has never worked in the browser and has survived two
code-reading passes. Per user direction it is **rewritten as part of this rev**
rather than diagnosed further: drop targets defined per GROUP, explicit
`dragover` handling on every path a drag can cross, and a visible drop
affordance so the target is unambiguous. Dragging Custom → Odyssey shares the
profile and the row gains its author badge.

⚠ Still unverifiable in jsdom — the rewrite may fix it incidentally, but nothing
here proves it works in a real browser. A browser pass remains owed.

## Not in scope

Progression/registry changes ·
anything touching the bar's own behaviour beyond the free-mode two-way wiring.
