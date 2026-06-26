# Shipments legacy snapshot — design

**Date:** 2026-06-26 (Session 69)
**Status:** implemented
**Type:** structural fork (no new product behavior)

## Goal

The Shipments domain is being redesigned **from scratch** — table first, then everything else (tabs, detail panel, search). Before that begins, freeze the **current** Shipments as a disposable, unchanging snapshot to A/B against the new design in front of stakeholders. After approval, the snapshot is deleted.

Hard requirement: the snapshot must stay **visually identical to today**, even as the redesign edits shared things (design **tokens**, components).

## Decision — separate frozen project (chosen)

Considered an **in-repo fork** (copy the view tree into `shipments-legacy/` + a scoped frozen-token block + a `/shipments-legacy` route). Rejected in favor of a **separate project**, because:

| | in-repo fork | separate project (chosen) |
|---|---|---|
| Isolation | partial — shares `@odyssey/ui`, tokens, api/data; needs a frozen-token trick + tag to backstop | **total** — different codebase, shares nothing; cannot be corrupted by main |
| Surgery | rewrite imports across ~25 files + hand-build a frozen-token block | **none** — verbatim snapshot |
| Main repo | a `shipments-legacy/` dir sits beside the redesign | **main stays pristine** — zero legacy code |
| Cost | light | a second repo + its own Vercel deploy; full app copy on disk |

The separate project gives a **guarantee** (not a mitigation) that the old design never moves, and keeps `main` free of legacy baggage while it's torn apart.

## What was built

A new sibling repo **`odyssey-shipments-legacy/`** (sits beside `odyssey-one`, matching the existing sibling-repo pattern):

- **Source:** `git archive` of `odyssey-one` @ `85fda1e` — the pristine pre-redesign tree. Because the S69 DataTable migration was uncommitted, the snapshot's `ShipmentTable` is the original **react-window two-panel** table (the migration stays in `main` as the seed of the new design).
- **Slimmed:** dropped `vault/`, `vault-sources/`, `docs/`, `playground/`, and main-repo docs (77M → 9M). Kept the buildable monorepo: `apps/odyssey-one` + `packages/{ui,tokens,db}` + configs. `@odyssey/ui` + tokens are **vendored** by virtue of being the copied workspace packages → truly frozen, no shared coupling.
- **Trimmed to Shipments only:** `App.jsx` routes `/shipments/*` → `ShipmentsRoute`, everything else `Navigate → /shipments` (login/Home/Orders/etc. removed). `Sidebar.jsx` shows only the Shipments item.
- **Independent git repo:** `git init` + initial commit `07afbf0` (no link to `odyssey-one`'s remote — can't accidentally push to main).
- **Verified:** `npm install` + `node tools/generate.mjs` (1200 rows) + `build:odyssey-one` clean (1885 modules); dev server renders the old design at `/shipments`.

## Main repo

- The DataTable migration stays uncommitted in `components/shipments/ShipmentTable.jsx` as the redesign seed.
- Milestone tag **`shipments-design-v1`** on `85fda1e` marks the frozen point (matches the snapshot source).
- No legacy code added to `main`.

## Disposal

Delete the `odyssey-shipments-legacy/` repo (+ its Vercel project, if deployed) once the redesign is approved. Zero residue in `main`.

## Deferred

- **Push to GitHub + deploy to its own Vercel project** — only when a stable stakeholder URL is needed ("later if necessary").
- The new-design work itself (begins now in `main`/`/shipments`).
