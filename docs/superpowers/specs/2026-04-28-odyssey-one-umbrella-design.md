# Odyssey-One Umbrella + Vercel Rename — Design

**Date:** 2026-04-28
**Status:** Spec — pending implementation plan
**Supersedes:** Session 14 plan ("multi-app + rewrites" architecture in `playground/name-migration-tracker.md`) and the "do not rename Vercel project" decision in the same tracker.

---

## Context

The repo started as `odyssey-shipments` — a single-domain Shipments prototype. It is becoming a multi-domain platform: Home, Orders, Carriers, Shipments, Tracking (sidebar) plus User Management (separate entry). The Vercel project name and live URL still carry the old single-domain name and need to be migrated to `odyssey-one`.

Two threads, executed together as a single piece of work because they touch overlapping concerns (Vercel project root directory, package layout, deploy command):

1. **Architecture refactor:** collapse `apps/shipments/` into a single umbrella app `apps/odyssey-one/` that serves all six domain routes (5 sidebar + 1 user-management) under one Vite build, one Vercel deploy.
2. **Vercel rename:** rename the existing Vercel project `odyssey-shipments` → `odyssey-one`, preserving the live `odyssey-shipments.vercel.app` URL via custom-domain pinning.

## Goals

- One Vercel project. One build. One deploy. One canonical URL: `odyssey-one.vercel.app`.
- All five sidebar domains exist as routes from day one — even if four are placeholders. ("Once and for all.")
- The existing shipments app continues to work without functional regression at `/shipments`.
- The old `odyssey-shipments.vercel.app` URL remains alive indefinitely for users with bookmarks.
- Solo-dev workflow preserved: manual deploys via Vercel CLI, no auto-deploy on `git push`.

## Non-goals

- Building real content for Home / Orders / Carriers / Tracking / Users — stubs only this round.
- Supabase wiring (deferred — `@odyssey/db` already exists as a placeholder package; consumed by all routes when ready).
- Sidebar visual normalization through Figma — the existing shipments sidebar gets reused as-is.
- Splitting into multiple Vite apps — single-app is sufficient for prototype scale.
- Per-domain branches, per-domain deploys, or build-step skipping — premature for solo dev.

---

## Architecture (Pattern 1 — single app, single deploy)

### Directory rename

```
apps/shipments/  →  apps/odyssey-one/
```

The existing app's chrome (`AppShell`, `Sidebar`, `Navbar`) becomes the umbrella chrome. The current `App.jsx` body becomes the `/shipments` route. Four new stub routes plus a Users route are added.

### Target structure

```
apps/odyssey-one/
├── index.html
├── package.json                     (name: odyssey-one-app)
├── vite.config.js
├── tools/                           (existing data generator, unchanged)
├── public/                          (existing assets + 1200 details JSONs, unchanged)
├── src/
│   ├── main.jsx
│   ├── App.jsx                      (Router + AppShell)
│   ├── routes/
│   │   ├── Home.jsx                 (stub)
│   │   ├── Orders.jsx               (stub)
│   │   ├── Carriers.jsx             (stub)
│   │   ├── Tracking.jsx             (stub)
│   │   ├── Users.jsx                (stub — accessed via avatar dropdown)
│   │   └── shipments/
│   │       ├── ShipmentsRoute.jsx   (← old App.jsx body)
│   │       ├── components/          (existing shipments-specific components, moved)
│   │       └── data/                (existing data layer, moved)
│   └── components/
│       └── layout/                  (AppShell, Sidebar, Navbar — promoted to umbrella chrome)
└── ...
```

### Routing

Use **React Router v6** (`react-router-dom`). Layout wraps all routes; routes render inside the layout's content area.

```
/                  → Home.jsx
/orders            → Orders.jsx
/carriers          → Carriers.jsx
/shipments         → ShipmentsRoute.jsx
/shipments/*       → ShipmentsRoute.jsx (existing internal panel/detail state — see note below)
/tracking          → Tracking.jsx
/users             → Users.jsx
```

**Shipments internal navigation:** today the shipments app uses internal state (`selectedShipmentId`, `activePanel`, etc.) — no URL routing. We preserve that for now; URL stays `/shipments` regardless of which shipment / panel / tab is selected. Migrating shipments-internal state to URL params is a separate normalization task.

### Sidebar

The existing `Sidebar.jsx` is updated to list five items (Home / Orders / Carriers / Shipments / Tracking) instead of shipments-only links. Each item is a `NavLink` from React Router; active styling driven by route match. Sidebar order matches the agreed domain list in `project_domains_list.md`.

User Management is **not** in the sidebar.

### User-management entry point

Top-right of the Navbar gets a user avatar dropdown (placeholder). Dropdown items minimum:

- Account / Profile (placeholder)
- **Manage Users** → navigates to `/users`
- Sign out (placeholder)

Visual: keep simple — initials in a circle, click opens dropdown. No real auth wiring this round.

### Stub view contents

Each placeholder route renders the same minimal scaffold so they look consistent and clearly under-construction:

```jsx
// e.g., Home.jsx
export default function Home() {
  return (
    <div className="route-stub">
      <h1>Home</h1>
      <p>Coming soon.</p>
    </div>
  );
}
```

One shared CSS class (`.route-stub`) for the empty state. No design effort spent on stubs — they exist to prove the route works.

---

## Vercel rename mechanic

Existing project: `prj_d7bHwlscJ9ZfgcUiEBEv2LbvuGXf` (team `team_A2F22JK5K8GXKHAih4WQMneq`, currently named `odyssey-shipments`).

Goal: rename to `odyssey-one`, preserve old URL, no race window.

### Sequence

| # | Action | Dashboard location | Verification |
|---|---|---|---|
| 1 | Add `odyssey-one.vercel.app` as a custom domain | Settings → Domains → Add | Open both URLs in browser; both serve same deploy. |
| 2 | Add `odyssey-shipments.vercel.app` as an explicit custom domain | Settings → Domains → Add | Listed twice in Domains panel: once auto, once custom. |
| 3 | Rename the project `odyssey-shipments` → `odyssey-one` | Settings → General → Project Name | Auto-domain swings; old URL still listed as custom. |
| 4 | Set `odyssey-one.vercel.app` as primary domain | Settings → Domains → ⋯ → Set as primary | OG / canonical now use new URL. |
| 5 | Update Root Directory setting to `apps/odyssey-one` | Settings → General → Root Directory | After directory rename in code is committed. |
| 6 | Trigger a fresh `npx vercel --prod` from `apps/odyssey-one/` | CLI | Confirm both URLs serve the new umbrella build. |

### Verification point — step 2

Step 2 (pinning the auto-domain as a custom domain in addition to its auto status) needs live confirmation in the dashboard. If Vercel rejects it as duplicate, fallback:

1. Skip step 2.
2. Do step 3 (rename) — `odyssey-shipments.vercel.app` becomes available for ~seconds.
3. Immediately add it back as custom domain.

Race-window risk acknowledged by user; very small (`.vercel.app` namespace, `odyssey-shipments` is project-specific, solo timing).

### Rollback

If anything goes wrong before step 6:

- The original deploy is untouched until step 6.
- Vercel projects can be renamed back (Settings → General).
- Custom domains can be removed and re-added.

If step 6 produces a broken build, revert the directory-rename commit and redeploy from `apps/shipments/`. The old URL was preserved via step 2, so users continue to see the last good deploy until prod is updated.

---

## Migration tracker update

`playground/name-migration-tracker.md` currently records "Vercel project name — stays `odyssey-shipments`" under "Intentionally NOT changing." That decision is reversed by this spec. The tracker will be updated to:

- Flip step 9 from "Build `apps/home/` skeleton" to "Refactor `apps/shipments/` → `apps/odyssey-one/` with all 6 routes."
- Flip step 10 from "Create new Vercel project" to "Rename existing Vercel project (in-place, custom-domain pinned)."
- Drop steps 11–12 (rewrites configuration) — single-app architecture removes the need.
- Add a new section recording the architecture change rationale (link to this spec).

`reference_vercel_deployment.md` memory will likewise be updated: the dual-URL plan stays, but the mechanic is "in-place rename" not "new umbrella project."

---

## Deploy workflow (after migration)

| Scenario | Command |
|---|---|
| Dev | `npm run dev:odyssey-one` (renamed from `dev:shipments`) |
| Preview | `cd apps/odyssey-one && npx vercel` |
| Production | `cd apps/odyssey-one && npx vercel --prod` |
| Regenerate shipment data | `cd apps/odyssey-one && node tools/generate.mjs` |

Auto-deploy on `git push` stays OFF.

---

## Out of scope (this spec)

- Real content for Home / Orders / Carriers / Tracking / Users.
- URL-driven shipments-internal navigation (currently state-driven; deferred).
- Sidebar normalization through Figma.
- Supabase client wiring in `@odyssey/db`.
- Auth on the user-management dropdown.
- Per-domain build skipping or branch strategy.

## Future reassessment trigger

Single-app, single-build is the right shape for prototype scale and solo dev today. Re-evaluate the architecture once **2–3 domains have real content** (not stubs). At that point:

- Measure build time, bundle size, time-to-interactive on each route.
- If `npm run build` exceeds ~60s or any single route's bundle is bloated by neighbor domains' code, consider:
  - Splitting into multiple Vite apps under `apps/` (one per domain), with a thin shell that uses Vercel rewrites between them — i.e. the original Session 14 multi-deploy plan we deferred.
  - Or staying single-app and adding route-level code splitting (`React.lazy` per route).
- This is a deliberate "build first, optimize when measured" call, not technical debt — recorded here so future-Claude doesn't treat it as a missed concern.

## Definition of done

1. `apps/odyssey-one/` exists; `apps/shipments/` deleted from the repo.
2. `npm run dev:odyssey-one` boots with sidebar showing all 5 domain links + avatar dropdown with Users entry.
3. All 5 sidebar routes navigable; 4 stubs show "Coming soon," `/shipments` shows the existing app working with no regressions.
4. `/users` route reachable via avatar dropdown and direct URL.
5. Vercel project renamed; both `odyssey-one.vercel.app` and `odyssey-shipments.vercel.app` serve the new umbrella build.
6. `playground/name-migration-tracker.md` and `reference_vercel_deployment.md` updated.
7. `progress.md` Session 15 entry written.

---

## Open questions / assumptions

1. **Verified at execution time:** does Vercel's "Add Domain" dashboard accept `odyssey-shipments.vercel.app` while the project is still named `odyssey-shipments`? (Spec assumes yes; fallback documented.)
2. **Sidebar component as currently designed is reusable as-is.** No design pass on it this round — full normalization deferred.
3. **No active production users beyond Manuela + Efra.** Brief disruption windows during Vercel reconfiguration (seconds) are acceptable.
4. **Solo dev. No concurrent merge concerns.** Branching strategy stays informal.
