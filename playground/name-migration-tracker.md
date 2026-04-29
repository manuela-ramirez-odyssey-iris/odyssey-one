# Project Name Migration Tracker

> Migration: `odyssey-shipments` → `odyssey-one` (concept) / `odyssey-one-stage` (Vercel URL)
> Started: 2026-04-28
> Status: **COMPLETE** (Session 15, 2026-04-28)
> Architecture: Single Vite app `apps/odyssey-one/` serving 6 routes via React Router. Single Vercel project `odyssey-one-stage` (the `.vercel.app` name `odyssey-one` is owned by another team).
> Spec: [`docs/superpowers/specs/2026-04-28-odyssey-one-umbrella-design.md`](../docs/superpowers/specs/2026-04-28-odyssey-one-umbrella-design.md)

---

## Final state

**Live URLs (both serve the same deploy):**
- `odyssey-one-stage.vercel.app` — primary
- `odyssey-shipments.vercel.app` — alias preserved for legacy bookmarks

**GitHub repo:** `https://github.com/manuela-ramirez-odyssey-iris/odyssey-one`

**Vercel project:** `odyssey-one-stage` (renamed in-place from `odyssey-shipments` on 2026-04-28).

**Local directory:** `apps/odyssey-one/` (renamed from `apps/shipments/` on 2026-04-28; see commit `35e6fc8`).

**Deploy command:** `npx vercel --prod` from repo root (Vercel project's Root Directory is `apps/odyssey-one`).

---

## Why we renamed

The project started as a single-domain Shipments prototype, hence the name. It is now a multi-domain monorepo with sidebar routes for Home / Orders / Carriers / Shipments / Tracking and a separate user-management entry point. The umbrella name `odyssey-shipments` was misleading — `odyssey-one` reflects the actual scope.

---

## Architecture revision (vs. earlier draft of this tracker)

The original draft of this tracker (Session 14) planned a multi-app + Vercel-rewrites architecture: a separate `apps/home/` umbrella deployed as a new Vercel project, with `/shipments/*` rewrites to the existing shipments deploy. **That plan was reversed.** Reasons captured in the spec:

- A single Vite build is sufficient at prototype scale; multiple deploys add infra without paying off until 2–3 domains have real content.
- A single project simplifies deploys, env-var config, and (eventually) Supabase wiring.
- The original target URL `odyssey-one.vercel.app` was already owned by another Vercel team — couldn't claim it. The fallback name `odyssey-one-stage.vercel.app` was used; the "stage" suffix accurately signals "prototype URL, not eventual production."

The earlier "do not rename Vercel project" decision was also reversed — see the rename below.

---

## What happened in Session 15

Legend:  ✅ done · 🚫 not changing (intentional) · ⏸ deferred

### Code refactor (Claude)

| # | Action | Status | Commit |
|---|---|---|---|
| 1 | Add `react-router-dom@6` dependency | ✅ | `a24e2f8` |
| 2 | Create 5 stub routes (`Home`, `Orders`, `Carriers`, `Tracking`, `Users`) + shared `route-stub.css` | ✅ | `efff2b5` |
| 3 | Extract App body into `routes/shipments/ShipmentsRoute.jsx` (preserves AppShell + filterPanel) | ✅ | `26e3096` |
| 4 | Wire React Router with 6 routes; each stub wraps content in `<AppShell>` | ✅ | `883ac7a` |
| 5 | Sidebar uses `NavLink` for the 5 sidebar domains (active state URL-driven) | ✅ | `938f874` |
| 6 | Navbar avatar opens dropdown with `Manage Users` → `/users` | ✅ | `f4d0b76` |
| 7 | Browser tab title → `Odyssey-One` | ✅ | `d20afe1` |
| 8 | Add SPA rewrite to `vercel.json` (was 404'ing on direct URLs to non-`/` routes) | ✅ | `92bfaa9` |
| 9 | Rename `apps/shipments/` → `apps/odyssey-one/`; package name → `odyssey-one-app`; root scripts → `dev:odyssey-one` / `build:odyssey-one` | ✅ | `35e6fc8` |

### Vercel ops (User)

| # | Action | Status | Notes |
|---|---|---|---|
| A | Add `odyssey-one-stage.vercel.app` as custom domain on existing project | ✅ | Replaced an earlier `odyssey-one-platform.vercel.app` workaround. |
| B | Confirm `odyssey-one.vercel.app` is owned by another team — unavailable | ✅ | Path forward: use `odyssey-one-stage.vercel.app`. |
| C | Verification deploy from old `apps/shipments/` location | ✅ | Confirmed both URLs serve refactored umbrella with all 6 routes 200 OK. |
| D | Rename Vercel project `odyssey-shipments` → `odyssey-one-stage` | ✅ | Both URLs survived rename intact (Vercel auto-pinned the old auto-domain as custom). |
| E | Update Vercel project Root Directory `apps/shipments` → `apps/odyssey-one` | ✅ | After directory rename in code. |
| F | Final production deploy from new directory | ✅ | Build succeeded; both URLs verified. |
| G | Delete accidentally-created `shipments` project from earlier failed deploy | ✅ | Cleanup. |

### Documentation updates

| # | Action | Status |
|---|---|---|
| 10 | Update `CLAUDE.md` directory map, key commands, deploy section | ✅ |
| 11 | Update this migration tracker | ✅ (this file) |
| 12 | Update `reference_vercel_deployment.md` memory | ✅ |

### GitHub repo (already done in Session 14)

| # | Action | Status |
|---|---|---|
| Old #6 | Rename GitHub repo `odyssey-shipments` → `odyssey-one` | ✅ (2026-04-28, Session 14) |
| Old #7 | Update local git remote URL | ✅ (2026-04-28, Session 14) |

---

## Intentionally NOT changing 🚫

- Root `package.json` `"name"` — already `odyssey-monorepo` (generic, accurate).
- `@odyssey/ui`, `@odyssey/tokens`, `@odyssey/db` workspace package names — cross-domain, stay.
- The component subdirectory `apps/odyssey-one/src/components/shipments/` — those are shipments-specific components currently shared with `routes/shipments/ShipmentsRoute.jsx`. They stay where they are until the next normalization pass; co-locating them under `routes/shipments/` would be churn.
- `tools/package.json` `"name": "odyssey-shipments-data"` — internal-only, no external references.
- Historical artifacts: older `progress.md` sessions, `docs/superpowers/plans/*` (frozen completed plans), `shipments-documentation/Documentation/backlog.html` (historical record), older memory entries.

---

## Future reassessment trigger

Per the spec, re-evaluate the single-app architecture once **2–3 domains have real content** (not stubs). At that point: measure build time, bundle size, time-to-interactive on each route. If the single Vite build becomes painful, candidates are (a) per-domain Vite apps with Vercel rewrites between them, or (b) staying single-app with `React.lazy` per route. Don't pre-optimize.
