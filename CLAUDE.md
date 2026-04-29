# Odyssey-One Monorepo — Project Instructions

Multi-domain platform prototype. Single React app `apps/odyssey-one/` serving 6 routes via React Router: home, orders, carriers, shipments, tracking (sidebar) plus users (avatar dropdown). Shipments is the only route with real content today; the other four are placeholder stubs that get filled in incrementally. All routes share the same chrome (sidebar + navbar via `AppShell`). Future Supabase access will be shared across all routes via `@odyssey/db`.

> **Live URLs (both serve the same deploy):** `odyssey-one-stage.vercel.app` (primary), `odyssey-shipments.vercel.app` (alias preserved for legacy bookmarks). The `.vercel.app` name `odyssey-one` is owned by another team — `-stage` is a deliberate suffix to signal this is a prototype URL, not the eventual production URL.

## Directory map

```
odyssey-one/                            (repo; GitHub: manuela-ramirez-odyssey-iris/odyssey-one)
├── apps/
│   └── odyssey-one/                    (the umbrella app — single Vite build, 6 routes)
│       ├── src/
│       │   ├── App.jsx                 (Router shell — 6 routes)
│       │   ├── routes/                 (Home, Orders, Carriers, Tracking, Users stubs)
│       │   │   └── shipments/          (ShipmentsRoute — owns AppShell + filterPanel)
│       │   ├── components/layout/      (AppShell, Sidebar, Navbar — umbrella chrome)
│       │   └── components/             (shipments-specific components — co-located until normalized)
│       ├── public/details/             (1200 generated JSONs, gitignored)
│       ├── tools/generate.mjs          (data generator, node runtime)
│       ├── vercel.json                 (SPA rewrite — all paths → /index.html)
│       └── package.json                (name: odyssey-one-app)
├── packages/
│   ├── ui/src/                         (shared React components — see "Normalization policy")
│   ├── tokens/tokens.css               (shared design tokens)
│   └── db/                             (placeholder — Supabase client goes here)
├── playground/                         (design-system visualization, tracker, name migration tracker)
├── shipments-documentation/            (domain analysis, grooming transcripts, backlog)
├── docs/superpowers/plans/             (implementation plans)
├── tools/convert-docs.sh               (cross-cutting: .docx/.pptx → Markdown)
├── .claude/skills/                     (/normalize, /wrap)
├── progress.md                         (session log)
├── CLAUDE.md                           (this file)
├── turbo.json
└── package.json                        (workspace root, name: odyssey-monorepo)
```

## Key commands

From repo root:

- `npm run dev:odyssey-one` — start dev server (preferred)
- `npm run build:odyssey-one` — build the umbrella app
- `cd apps/odyssey-one && node tools/generate.mjs` — regenerate the 1200 shipment JSONs (seed 42, reproducible)

## Deploys

**CLI only.** Deploy with `npx vercel --prod` from the **repo root** (Vercel project's Root Directory is set to `apps/odyssey-one`, so the CLI handles the build context). Do not enable GitHub auto-deploy. Do not `git push` expecting a deploy to fire.

## Shared packages

Shared code lives under `packages/`:

- `@odyssey/ui` — React components shared across all domain apps.
- `@odyssey/tokens` — CSS custom properties for the design system.
- `@odyssey/db` — Supabase client + schema types (placeholder, populated when SHP-55 starts).

Consumers import via the workspace name: `import { Badge } from '@odyssey/ui'`. Never use relative paths to reach into a shared package.

## Normalization policy

Only **normalized** components belong in `@odyssey/ui`. Un-normalized components stay app-local in `apps/<app>/src/components/`.

A component is "normalized" when it has been run through the `/normalize` routine: tokens bound, no hardcoded values, documented in `playground/normalization-tracker.md`.

Do not bulk-move un-normalized components into `@odyssey/ui` — they will be rewritten during normalization and the move would become churn.

## Where context lives

- `progress.md` — session-by-session project log; read the latest session to understand current state.
- `shipments-documentation/Documentation/shipments-domain-analysis.md` — source of truth for the Shipments domain.
- `shipments-documentation/Documentation/decision-log.md` — every implemented decision traced to source + previous state.
- `shipments-documentation/Documentation/backlog.html` — current backlog with statuses.
- `playground/normalization-tracker.md` — design system sync state (what's normalized, what's ad-hoc, what's pending Figma push).
- `docs/superpowers/plans/` — implementation plans for multi-step work.

## Skills

Located in `.claude/skills/`:

- `/normalize <figma-url>` — intake a Figma component, align against design tokens, classify, update playground, implement after approval.
- `/wrap` — end-of-session routine. Summarize, update `progress.md`, commit, push.

## Reading `.docx` and `.pptx` files

Before analyzing any `.docx` or `.pptx` file, run the conversion script first:

```bash
bash tools/convert-docs.sh
```

This converts all documents in `shipments-documentation/` to readable Markdown in `shipments-documentation/Documentation/converted/`:

- `.pptx` → Markdown (text + tables)
- `.docx` → Markdown (text + tables + extracted images in `<name>_images/`)

Then read the `.md` files instead of the originals. For docx images, read the extracted `.png` files from the `<name>_images/` folder.

The script skips files already converted (checks timestamps), so re-running is fast.

**Dependencies:** python-pptx + python-docx (venv auto-created at `/tmp/pptx_env` if missing).

## Stakeholders

- **Janardhana (Jana)** — domain expert, source of truth for Shipments.
- **David Johns** — operational feedback (TL/LTL, PGI, cost allocation).
- **Manuela, Efrain** — designers.
