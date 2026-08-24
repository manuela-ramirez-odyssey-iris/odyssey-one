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
│       ├── public/details/             (2,200 generated JSONs, gitignored)
│       ├── tools/generate.mjs          (data generator, node runtime)
│       ├── vercel.json                 (SPA rewrite — all paths → /index.html)
│       └── package.json                (name: odyssey-one-app)
├── packages/
│   ├── ui/src/                         (shared React components — see "Normalization policy")
│   ├── tokens/tokens.css               (shared design tokens)
│   └── db/                             (placeholder — Supabase client goes here)
├── playground/                         (design-system visualization, tracker, name migration tracker)
├── vault/                              (Obsidian knowledge base — see "Vault" section below)
├── docs/superpowers/plans/             (implementation plans)
├── tools/convert-docs.sh               (cross-cutting: PDF/DOCX/PPTX/XLSX → Markdown via MarkItDown)
├── .claude/skills/                     (/normalize, /wrap)
├── progress.md                         (session log)
├── CLAUDE.md                           (this file)
├── turbo.json
└── package.json                        (workspace root, name: odyssey-monorepo)
```

## Key commands

From repo root:

- `npm run dev:odyssey-one` — start dev server (preferred). By default `/api` proxies to the **deployed** function, so changes under `apps/odyssey-one/api/` are invisible.
- `cd apps/odyssey-one && npm run dev:api` — the API served **locally** (`tools/local-api.mjs`, same Neon DB) on :3001. Start it in a second terminal whenever a change touches `api/`; any dev server started after it auto-detects it — no deploy, no special dev command. Vite prints which API it resolved (`[api proxy] /api → …`) at startup; `dev:local` forces the local one.
- `npm run build:odyssey-one` — build the umbrella app
- `cd apps/odyssey-one && node tools/generate.mjs` — regenerate the 2,200 shipment JSONs (seed 42, reproducible)
- `npm run tokens:audit` — diff `tokens.css` against the committed Figma variable snapshot (`packages/tokens/figma-tokens.snapshot.json`); reports gaps/drift, exits 1 on mismatch. Run after Efrain's token passes; refresh the snapshot by asking Claude to re-run the `use_figma` dump when Figma changes.

## Deploys

**CLI only.** Deploy with `vercel --prod` from the **repo root** (the Vercel project's Root Directory is set to `apps/odyssey-one`, so the CLI handles the build context).

Use the **Homebrew binary** (`/opt/homebrew/bin/vercel`, 52.0.0) — **never `npx vercel`**: `npx` pulls an unauthenticated 58.x CLI that **exits 0 while reporting `"Not authorized"` in its JSON payload**, so trusting the exit code reports a ship that never happened (S115). The CLI can also print `"ready"` and suggest "Promote to production" in the same breath (S116), so its own output is not proof either.

**Verify every deploy by grepping the LIVE bundle** for strings unique to the session's work — never by comparing asset hashes (Vercel builds from source, so hashes shift for unrelated reasons).

Do not enable GitHub auto-deploy. Do not `git push` expecting a deploy to fire.

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
- `vault/10-domains/shipments/domain-analysis.md` — source of truth for the Shipments domain.
- `vault/10-domains/shipments/decisions/decision-log.md` — every implemented Shipments decision traced to source + previous state.
- `vault/10-domains/home/domain-analysis.md` — Home domain shape (cross-domain dashboard, widget model).
- `vault/60-backlog/backlog.html` — unified domain-agnostic backlog (Shipments items tagged SHP-, Home tagged HOM-, etc.).
- `playground/normalization-tracker.md` — design system sync state (what's normalized, what's ad-hoc, what's pending Figma push).
- `docs/superpowers/plans/` — implementation plans for multi-step work.

## Vault

`vault/` is the Obsidian knowledge base — a 7-folder taxonomy designed for multi-domain work + future RAG ingestion:

- `00-inbox/` — drop zone; drag a file, ping Claude, validate, file it
- `10-domains/` — per-product-domain canon (home, shipments, tracking, orders, carriers, users)
- `20-cross-cutting/` — brand-marketing, gateway, design-system, operations, stakeholders
- `30-ideas/` — speculative content (your commentary, brainstorms — NOT facts)
- `40-decisions/` — canonical cross-domain decisions (per-domain decisions live in `10-domains/<domain>/decisions/`)
- `50-sources/` — external raw inputs not domain-attached
- `60-backlog/` — unified domain-agnostic backlog; future Jira mirror
- `99-archive/` — parked, superseded, deferred (includes `first-prototype/` and unsorted screenshots)

Every `.md` carries YAML frontmatter (`domain`, `type`, `tags`, `date`, `status`) for RAG-readiness. Open `vault/` (not the repo root) in Obsidian to use it as a vault.

## Skills

Located in `.claude/skills/`:

- `/normalize <figma-url>` — intake a Figma component, align against design tokens, classify, update playground, implement after approval.
- `/wrap` — end-of-session routine. Summarize, update `progress.md`, commit, push.

## Reading `.pdf`, `.docx`, `.pptx`, and `.xlsx` files

Before analyzing any binary document, run the conversion script first:

```bash
bash tools/convert-docs.sh                # convert everything in vault/00-inbox/
bash tools/convert-docs.sh <file-or-dir>  # one-off (path can be anywhere in vault/)
```

This converts all supported documents to Markdown next to the source. Then read the `.md` files instead of the originals.

The script skips files whose `.md` output is newer than the source, so re-running is fast.

**Powered by Microsoft MarkItDown** ([github.com/microsoft/markitdown](https://github.com/microsoft/markitdown)) — single tool covering `.pdf`, `.docx`, `.pptx`, `.xlsx`, `.html`, images, audio (with transcription), and more. Venv auto-bootstraps at `/tmp/pptx_env` (name kept for backwards compat) using Homebrew `python3.13`. **Always use this for PDF reads** — never `Read` a PDF directly when MarkItDown can produce a Markdown view of it.

## Stakeholders

- **Janardhana (Jana)** — domain expert, source of truth for Shipments.
- **David Johns** — operational feedback (TL/LTL, PGI, cost allocation).
- **Manuela, Efrain** — designers.

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->