# Project Name Migration Tracker

> Migration: `odyssey-shipments` → `odyssey-one`
> Started: 2026-04-28
> Status: in progress (internal pass complete; external + future actions pending)

---

## Why we're renaming

The project started as a single-domain Shipments prototype, hence the name. It's now a multi-domain monorepo (Shipments live; Home, Orders, Carriers, Tracking planned; User Management separate). The umbrella name `odyssey-shipments` is misleading — `odyssey-one` reflects the actual scope.

**URL structure target (Q1 = Option A):**
- `odyssey-one.vercel.app/` → home/portal
- `odyssey-one.vercel.app/shipments` → existing shipments app (via Vercel rewrites to its own deploy)
- `odyssey-one.vercel.app/orders`, `/carriers`, `/tracking` → as built

**Migration safety stance:** existing `odyssey-shipments.vercel.app` URL stays alive indefinitely. New umbrella deploys as a separate Vercel project; rewrites preserve the old URL.

---

## Step status

Legend:  ✅ done · 🟡 in progress · ⏳ pending (you) · ⏸ deferred · 🚫 not changing (intentional)

### Internal pass (Claude — this session, 2026-04-28)

| # | Step | Owner | Status |
|---|---|---|---|
| 1 | Create this migration tracker | Claude | ✅ |
| 2 | Update `CLAUDE.md` directory map header | Claude | ✅ |
| 3 | Update `apps/shipments/index.html` `<title>` | Claude | ✅ |
| 4 | Update `reference_vercel_deployment.md` memory (reflect dual-URL plan) | Claude | ✅ |
| 5 | Commit + push internal pass | Claude | ✅ (commit `de926a0`) |

### External pass (user — at your own pace, browser/CLI)

| # | Step | Owner | Status | Notes |
|---|---|---|---|---|
| 6 | Rename GitHub repo `odyssey-shipments` → `odyssey-one` | User | ⏳ | GitHub Settings → General → Rename. GitHub auto-redirects old URL for ~6 months. |
| 7 | Update local git remote URL after #6 | User | ⏳ | `git remote set-url origin git@github.com-odyssey:manuela-ramirez-odyssey-iris/odyssey-one.git` |
| 8 | Verify `git fetch / push` still works | User | ⏳ | After #7. |

### Vercel pass (deferred — when `apps/home` exists)

| # | Step | Owner | Status | Notes |
|---|---|---|---|---|
| 9 | Build `apps/home/` with sidebar nav | Claude | ⏸ | Future session. |
| 10 | Create new Vercel project `odyssey-one` for the umbrella | User | ⏸ | Vercel dashboard → Add New → Project. Connect to renamed repo. Root: `apps/home`. |
| 11 | Configure Vercel rewrites: `/shipments/*` → existing shipments deploy | Claude+User | ⏸ | Set up via `vercel.json` in `apps/home/` or via project settings. |
| 12 | Add similar rewrites for orders/carriers/tracking once those exist | Claude+User | ⏸ | One per new domain app. |
| 13 | Communicate new URL to users | User | ⏸ | When ready. |

### Local pass (deferred per Q2)

| # | Step | Owner | Status | Notes |
|---|---|---|---|---|
| 14 | Rename local directory `odyssey-shipments` → `odyssey-one` | User | ⏸ | Mid-session would break Claude's CWD; do it between sessions. |
| 15 | Restart Claude in renamed directory | User | ⏸ | After #14. |
| 16 | Settings.local.json contains absolute paths to the old directory; will be regenerated as Claude uses tools | Auto | ⏸ | No manual action needed. |

### Intentionally NOT changing 🚫

- Root `package.json` `"name"` — already `odyssey-monorepo` (generic).
- `apps/shipments/` directory or its `package.json` — that IS the shipments domain, name is correct.
- `@odyssey/ui`, `@odyssey/tokens`, `@odyssey/db` workspace package names — cross-domain, stay.
- Existing Vercel project named `odyssey-shipments` — kept alive for users currently bookmarked there.
- `apps/shipments/index.html` favicon and other assets — only the `<title>` text changes.
- `tools/package.json` `"name": "odyssey-shipments-data"` — internal-only, no external references, leaving as-is.
- Historical artifacts: `progress.md` old sessions, `docs/superpowers/plans/*` (frozen completed plans), `shipments-documentation/Documentation/backlog.html` (historical record), older memory entries that reference past state. These are time-stamped and accurate as written.

---

## What breaks at each step?

| Step | What breaks | Mitigation |
|---|---|---|
| 6 — GitHub rename | Old clones may need URL update | GitHub auto-redirects URLs for ~6 months; updating local remote (#7) takes 10 seconds |
| 10 — New Vercel project | Nothing | Net-new project; old shipments project untouched |
| 11 — Vercel rewrites | Misconfigured rewrites could break new umbrella URL | Verify in Vercel preview deploys before promoting to production |
| 14 — Local directory rename | Claude's session CWD breaks | Do it between sessions; trivial recovery |

---

## Rollback plan

If anything goes sideways:

1. **Internal pass alone** — revert via `git revert <commit-sha>` once the commit is on `origin/main`. Touches text files only; no infrastructure impact.
2. **GitHub rename** — GitHub allows you to rename back to `odyssey-shipments`. Settings → General → Rename. Auto-redirect handles the bounce.
3. **Vercel changes (when applicable)** — keep the existing `odyssey-shipments` project untouched per the recommendation. The new umbrella project can be deleted or its rewrites disabled without affecting the original.

The current commit at `852637d` is the pre-rename checkpoint.

---

## Future-Claude pickup

If you (next-session Claude) find this tracker and need to continue:

1. Read `MEMORY.md` index for relevant memories (search "rename", "domain", "Vercel").
2. Check this tracker's status — pick up the first 🟡 or ⏳ row that's actionable.
3. Do not change rows marked 🚫.
4. Update step status as you complete work; commit changes with a session-tagged message.
