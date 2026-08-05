# Saved Filters — profile-editing flow (S110 rev 1)

**Status:** spec, awaiting approval · **Date:** 2026-08-05 · **Supersedes:** parts of
`2026-08-04-save-filters-design.md` behaviour 2/3/6 · **Source:** user direction 2026-08-05

## What changes and why

The shipped Phase 1 Saved tab treats a saved filter as a thing you *select and apply*.
The user's correction: a saved filter is a **search profile you edit**. That reframes
the panel from "two independent tabs" into "a list and its editor".

The previous spec recorded an **accepted delta** — that `MenuRowRadio`'s nav zone
(label + chevron) would *expand* a row rather than select it, because only the radio
selects. The user has now ruled that this was not a delta to accept but the
component's actual intent, and the same one `ColumnPanel` already uses:

> *"MenuRowRadio component has two clicks, inside the radio button is the click for
> selecting the profile and selecting the row itself is for editing the profile,
> exact same idea as column arrangement."* — user, 2026-08-05

So the two zones become: **radio = select the profile**, **row body = edit it**.

## 1. Tab order and naming

- Tab order becomes **Saved · All** — `All` moves to the **right**. (Today: All · Saved.)
- With **no profile being edited**, the right tab reads **All**.
- With a profile open for editing, the right tab is **renamed to that profile's name**.
  It is the editor for that profile, so it stops being a generic "All".

## 2. Navigation between the two

| Gesture | Result |
|---|---|
| Click the **radio** on a saved row | Selection changes only. Stays on Saved. No navigation. |
| Click the **row body** (label/chevron) | Opens the right tab loaded with that profile's filter values, renamed to the profile. |
| Click the right tab directly | The filter editor, in whatever state it is already in. |

**Consequence — the chevron-expand preview is DELETED, not migrated.** Phase 1's row
body expanded inline to show read-only `SearchChip`s. That behaviour has no reason to
exist once the right tab holds the profile open and editable: an inline preview would
show the same values a second time, in a worse form (static, unremovable, duplicated).
The user's framing, 2026-08-05: *"we don't need to expand below the row anything since
now we have it expanded and editable in the other tab."* Remove the expand state, its
chip rendering, and its tests outright.

## 3. Footer links — create vs update

The footer's `Save Filters +` link is state-dependent:

| State | Link(s) |
|---|---|
| No profile being edited | **`Save Filters +`** (unchanged) |
| A profile is open/selected | **`Create New Filter`** — the same "save what's in the bar as something new" action, renamed so it can't be mistaken for saving over the open profile |
| A profile is open **and has unsaved edits** | `Create New Filter` **plus** a second link **`Update Filter`** beside it |

**`Update Filter`** writes the current editor values back onto the open profile.

**RULE — updating is panel-only.** A profile can be updated **only** from inside the
panel, never from the search bar. Editing chips in the bar changes the live search; it
must never silently rewrite a saved profile. This is the constraint that keeps "the bar
is the reflection of the current search" and "a profile is a saved thing" from
collapsing into each other.

**Dirty-tracking** is a comparison of the editor's current filter values against the
open profile's stored chips. `Update Filter` appears only when they differ, and
disappears again when they match (including after an update).

## 4. Odyssey defaults stay uneditable

Opening an Odyssey default in the editor is allowed (you can look at it, and use it as
a starting point for `Create New Filter`), but `Update Filter` must **never** appear
for one — they are shipped constants owned by nobody. Same rule as the existing "no ⋮,
no grip, not deletable".

## Decisions taken by default (flagged, reversible on a word)

1. **`Update Filter` persists only — it does NOT re-apply to the bar/table.** Applying
   stays the `Show N results` button's job, so saving a profile never changes the table
   underneath you as a side effect.
2. **Selecting a radio while a different profile is open leaves the editor where it is.**
   The two gestures were just made deliberately distinct; having the radio also yank the
   editor would re-merge them.
3. **Unsaved edits are discarded silently on navigate-away**, matching how the All tab
   behaves today. A confirm dialog is a larger ask and nobody has asked for it.

## Not in scope

Sharing (Phase 3, still blocked on the migration) · reordering changes · anything that
touches the bar's own behaviour beyond the panel-only update rule.
