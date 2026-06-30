# User Story — Column Arrangement (Shipments grid)

**Status:** Draft for Cognizant handoff · **Domain:** Shipments · **Surface:** the data grid's "Column Arrangement" panel
**Shell component:** `RightPanel` (`@oneodyssey/ui`) — the right-side drawer this feature lives in. The shell's own contract (slide-in, editable header, slots) is documented separately in the RightPanel component spec; this story covers the **feature** that composes it.

---

## Overview

From the Shipments grid, the user opens a **Column Arrangement** panel that slides in from the right. The panel lets the user pick a saved **preset** (a named set + order of columns), drill into a preset to **arrange its columns** (show/hide + reorder), and **rename** a preset in place. Pending edits are confirmed via a footer (Cancel / Save) before they apply to the grid.

The panel is a `RightPanel` with two views:
- **Presets view** — the list of presets (Custom + Odyssey groups).
- **Arrangement view** — editing the columns of the opened preset.

**Components used (all from `@oneodyssey/ui`):** `RightPanel` (shell), `MenuRowRadio` (preset rows), `MenuRowCheckbox` (column rows, draggable for reorder), `SearchField` (filter available columns), `Button` (footer Cancel/Save), `IconButtonGhost` + `DropdownMenu` + `MenuRow` (the ⋮ preset-actions menu).

**Actors:** any grid user.

---

## Use cases

> Use cases 1–3 are fully defined below. Use cases 4 (New Preset) and 5 (Delete Presets) are stubbed in the UI (the ⋮ menu in the Custom Presets header) and will be specified next session.

### UC-1 — Column Arrangement (show/hide + reorder)
**As a** grid user, **I want** to choose which columns are visible and in what order, **so that** the grid shows the data I care about in my preferred layout.

**Behaviour / acceptance criteria**
- Entering a preset opens the **Arrangement view** for that preset.
- Two groups:
  - **Selected columns (N)** — the currently-visible columns, in order. Each row is a `MenuRowCheckbox` (checked). The user can:
    - **Reorder** by dragging a row (grip handle) to a new position.
    - **Remove** a column by unchecking it (moves it out of Selected).
  - **Available columns** — every column not currently selected, filterable via a `SearchField` ("Search columns"). Checking a row **adds** it to the end of Selected.
- Edits are **staged** (a draft) — they do **not** apply to the grid until **Save**.
- Any pending change (toggle or reorder) raises the **footer (Cancel / Save)**:
  - **Save** applies the draft to the grid and dismisses the footer.
  - **Cancel** discards the draft, reverting to the last-saved column set.
- The **back** affordance (header chevron) returns to the Presets view.

### UC-2 — Preset selection
**As a** grid user, **I want** to pick a saved preset, **so that** the grid instantly adopts that preset's columns + order.

**Behaviour / acceptance criteria**
- The Presets view lists presets in two groups: **Custom Presets** and **Odyssey Presets** (system-provided).
- Each preset is a `MenuRowRadio`: the **radio** selects/applies the preset (the grid adopts its columns immediately); the **row body / chevron** opens the preset for editing (→ UC-1).
- **Hard rule: a preset is ALWAYS selected** — there is no "no selection" state. The currently-active preset stays selected even after its columns are edited/diverged, or if it has been emptied. (Selection tracks the active preset, not an exact column match.)
- Re-opening the panel returns to the **Presets view** with the active preset still selected.

### UC-3 — Preset renaming
**As a** grid user, **I want** to rename a preset, **so that** it reflects how I use it.

**Behaviour / acceptance criteria**
- Opening a preset (UC-1) puts the panel into edit context: the header **title becomes the preset name**, with a **pencil** affordance and the subtitle "Column Arrangement".
- Clicking the pencil makes the **title itself editable in place** (the name text becomes an input with the caret right after it — no separate field).
- The title stays focused while the user also rearranges columns (focus is not stolen by column interactions).
- Editing the name raises the **footer (Cancel / Save)**:
  - **Save** commits the new name.
  - **Cancel** reverts to the previous name.
- **Closing the panel while editing the name** is equivalent to cancelling that edit first (the name reverts; nothing is persisted).
- (Persistence note: in the current prototype, names are stored client-side. The backing store / API is out of scope for this story.)

### UC-4 — New Preset *(to be specified next session)*
The **Custom Presets** group header has a ⋮ (`IconButtonGhost`) that opens a `DropdownMenu` with **New Preset**. Behaviour TBD.

### UC-5 — Delete Presets *(to be specified next session)*
The same ⋮ `DropdownMenu` offers **Delete Presets**. Behaviour TBD.

---

## Notes for implementation
- The grid consumes two values from this feature: the **visible column set + order** (applied on Save) and the **active preset** (always one selected).
- The slide-in animation, the editable header, and the **footer (a `Footer` boolean that shows a baked Cancel/Save — not a content slot)** are **shell (`RightPanel`) capabilities** — see the RightPanel component spec for the exact props/contract. The content (presets, columns, group headers, the ⋮ menu, search) is consumer-provided via the **Slot** (children).
- Odyssey Presets are read-only system presets (no ⋮ actions); Custom Presets are user-managed (UC-4/UC-5).
