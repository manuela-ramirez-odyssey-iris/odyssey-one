# Vault Migration Plan

**Goal.** Replace the misnamed `shipments-documentation/` folder with a domain-aware Obsidian vault at `vault/`. The new structure separates ideas from information, gives multi-domain content a clean home, supports backlog tracking, and is RAG-ready for future ingestion.

**Status.** Drafted 2026-05-27. Awaiting user sign-off before any `git mv`.

**Approach.** Single-batch migration: scaffold vault skeleton + `git mv` every existing file to its destination + delete OS noise + update references in `CLAUDE.md` and `tools/convert-docs.sh`. One commit, reviewable as a single diff.

---

## 1. Target structure

```
vault/
├── 00-inbox/                  drop zone (drop files, ping Claude, validate, file)
│   └── README.md              workflow explainer
├── 10-domains/                Odyssey-One product domains (match code structure)
│   ├── home/                  _moc + domain-analysis (lightweight — Home is cross-domain dashboard)
│   ├── shipments/             _moc + domain-analysis + decisions/ + grooming/ + powerpoints/ + data/ + screenshots/
│   ├── tracking/              _moc only (empty for now)
│   ├── orders/                _moc only (empty for now)
│   ├── carriers/              _moc only (empty for now)
│   └── users/                 _moc only (empty for now)
├── 20-cross-cutting/          spans multiple domains
│   ├── design-system/         (placeholder — design-system content stays in playground/ for now)
│   ├── brand-marketing/       OdysseyGuidelines.pdf + .md
│   ├── gateway/               Gateway project insights (separate Odyssey initiative)
│   ├── operations/            (placeholder — TL/LTL, PGI, freight terms)
│   └── stakeholders/          (placeholder — per-person notes: Jana, David, Kathleen…)
├── 30-ideas/                  ideas / brainstorms / drafts (your speculative thinking)
│   └── (empty — populates as you have ideas to capture)
├── 40-decisions/              canonical cross-domain decisions
│   └── (placeholder — domain-specific decisions stay in 10-domains/<domain>/decisions/)
├── 50-sources/                external raw inputs that aren't domain-attached
│   └── (placeholder — most current sources are Shipments-attached, live in 10-domains/shipments/)
├── 60-backlog/                THE backlog — domain-agnostic. Single prioritized list of work items across all domains. Each item tagged with its domain in frontmatter / inline. Future Jira mirror.
│   ├── README.md              backlog workflow
│   └── backlog.html           migrated; items currently 100% Shipments but will receive Home / Tracking / etc. as work expands
└── 99-archive/                parked / superseded / deferred
    ├── first-prototype/       pre-React prototype (without node_modules)
    ├── code-reference/        login.html (from old code-reference/)
    └── screenshots-unsorted/  generic error*.png / issue.png that need context to triage
```

---

## 2. File mapping

### 2.1 Shipments domain → `vault/10-domains/shipments/`

| Source (under `shipments-documentation/Documentation/`) | Destination (under `vault/10-domains/shipments/`) | Notes |
|---|---|---|
| `shipments-domain-analysis.md` | `domain-analysis.md` | Frontmatter: `domain: shipments`, `type: info` |
| `decision-log.md` | `decisions/decision-log.md` | Domain-scoped (header says "Shipments Domain") |
| `Attributes (Progression Grouping).csv` | `data/attributes-progression-grouping.csv` | rename: lowercase-kebab |
| `Grooming-sessions/0217-Shipment-grooming-Jana.vtt` | `grooming/0217-jana.vtt` | rename |
| `Grooming-sessions/0323-Shipment-grooming-Jana.vtt` | `grooming/0323-jana.vtt` | rename |
| `Grooming-sessions/0325-Shipment-grooming-David.vtt` | `grooming/0325-david.vtt` | rename |
| `Grooming-sessions/0325-Shipment-grooming-Jana.vtt` | `grooming/0325-jana.vtt` | rename |
| `Grooming-sessions/0330-Shipment-grooming-Jana.vtt` | `grooming/0330-jana.vtt` | rename |
| `Grooming-sessions/0401-Shipment-grooming-Jana.vtt` | `grooming/0401-jana.vtt` | rename |
| `Grooming-sessions/0406-Shipment-grooming-Jana.vtt` | `grooming/0406-jana.vtt` | rename |
| `Grooming-sessions/0429-Domains-grooming-David.vtt` | `grooming/0429-david-domains.vtt` | rename — covers multiple domains, keep with Shipments grooming for now |
| `Feedback-Grooming-sessions/0409-Shipment-grooming-JanaDavid.vtt` | `grooming/feedback/0409-jana-david.vtt` | rename |
| `Feedback-Grooming-sessions/Review-David1.docx` | `grooming/feedback/review-david1.docx` | rename: lowercase |
| `converted/Review-David1.md` | `grooming/feedback/review-david1.md` | converted .md next to source |
| `converted/Review-David1_images/*` (4 PNG) | `grooming/feedback/review-david1-images/*` | |
| `Powerpoints /Shipments-Exceptions.pptx` | `powerpoints/shipments-exceptions.pptx` | trailing-space-in-source-folder dropped |
| `Powerpoints /Shipments-Monitoring.pptx` | `powerpoints/shipments-monitoring.pptx` | |
| `converted/Shipments-Exceptions.md` | `powerpoints/shipments-exceptions.md` | converted .md next to source |
| `converted/Shipments-Monitoring.md` | `powerpoints/shipments-monitoring.md` | |
| `screenshots reference/` (Shipments-related, see §2.6) | `screenshots/` | |

### 2.2 Home domain → `vault/10-domains/home/`

| Source | Destination | Notes |
|---|---|---|
| `Documentation/home-domain-analysis.md` | `domain-analysis.md` | Already self-acknowledges as Home-domain doc waiting for vault migration |
| `screenshots reference/` (Home-related, see §2.6) | `screenshots/` | |

### 2.3 Cross-cutting → `vault/20-cross-cutting/`

| Source | Destination | Notes |
|---|---|---|
| `Documentation/OdysseyGuidelines 2026.pdf` | `brand-marketing/odyssey-guidelines-2026.pdf` | rename: lowercase-kebab + no space |
| `Documentation/converted/OdysseyGuidelines 2026.md` | `brand-marketing/odyssey-guidelines-2026.md` | converted .md next to source |
| `Documentation/Other-Insights/Gateway_Insights_for_Shipments.md` | `gateway/insights-for-shipments.md` | rename: lowercase-kebab |
| `Documentation/Other-Insights/Gateway_Project_Overview.md` | `gateway/project-overview.md` | rename |

### 2.4 Archive → `vault/99-archive/`

| Source | Destination | Notes |
|---|---|---|
| `First prototype/` (all files except `data/node_modules/`) | `first-prototype/` | Snapshot of pre-React baseline; keep for historical reference. **`node_modules/` is NOT migrated (deleted; reproducible from package.json).** |
| `Documentation/code-reference/login.html` | `code-reference/login.html` | Was reference HTML, no longer canonical |
| `screenshots reference/error.png`, `error2.png`-`error5.png`, `issue.png` | `screenshots-unsorted/` | Generic filenames — context lost. User re-tags when needed |

### 2.5 Backlog → `vault/60-backlog/`

The backlog is **domain-agnostic** — single canonical list of work items across every Odyssey-One domain, future Jira mirror. We will be working in multiple domains simultaneously, so per-domain backlogs would fragment the prioritization view.

| Source | Destination | Notes |
|---|---|---|
| `Documentation/backlog.html` | `vault/60-backlog/backlog.html` | Currently 100% Shipments items (SHP-19, SHP-21 etc.) — that's incidental, not structural. As Home/Tracking/Orders work picks up, new items land in the same file, tagged by domain. |

### 2.6 Inbox + MOC scaffolding → fresh placeholder content

| Destination | Content |
|---|---|
| `vault/00-inbox/README.md` | Workflow explainer: drag file here → ping Claude → I propose destination + frontmatter → user approves → I move it |
| `vault/60-backlog/README.md` | Backlog workflow explainer: items tagged by domain, prioritized across domains, will mirror to Jira when access is provisioned |
| `vault/10-domains/<each>/_moc.md` | Empty Map-of-Content with frontmatter, links populate over time |

### 2.7 Screenshots triage

40 PNGs total. Triaged below by visible context. Ambiguous ones go to `99-archive/screenshots-unsorted/` until you confirm.

**→ `vault/10-domains/shipments/screenshots/`** (29 files)
- `Design-Documents.png` — Documents tab design
- `Design-RoutingGuide.png` — Routing Guide tab design
- `LastShipmentsTableColumn.png` — table column rendering
- `Search-Filters-panel.png` — Filter panel design
- `Selected shipment table trail.png` — selected-row visual trail
- `Slide3-Shipmets-Monitoring.png` — slide ref for Monitoring panel
- `Slide4-Shipmets-Monitoring.png` — slide ref for Monitoring panel
- `collapse_issue.png` — likely Shipments table issue
- `column-arrengement.png` — column arrangement panel
- `column-presets.png` — column presets panel
- `error-react-window.png` — react-window virtualization issue
- `error-shipments-table.png` — Shipments table error
- `export-tooltp.png` — export button tooltip
- `filterpanel-header.png` — filter panel header
- `order_dropdown.png` — order dropdown in Shipments BottomBar
- `order_dropdown_implementation.png` — implementation ref
- `orders-tooltip.png` — orders tooltip in Shipments table
- `searchbar.png` — TableControls search bar
- `selected shipment table disabled.png` — disabled state
- `selected shipment table enabled.png` — enabled state
- `shipmentsLastColumn.png` — last column rendering
- `tender tab.png` — Tender tab in BottomBar

**→ `vault/10-domains/home/screenshots/`** (6 files)
- `Home Edit Mode.png`
- `Home_with_background.png`
- `Widgets.jpg`
- `WidgetsDragIssue.png`
- `demodefaultwidgets.png`
- `edit_mode.png`

**→ `vault/10-domains/tracking/screenshots/`** (1 file)
- `Tracking-line-UI.png`

**→ `vault/10-domains/orders/screenshots/`** (2 files)
- `nochangesordersbadge.png`
- `old-quote-form.png`

**→ `vault/20-cross-cutting/design-system/screenshots/`** (3 files)
- `issuePropertiesFigma.png` — Figma instance properties issue
- `no_btn-primarySafariMac.png` — Button rendering issue across browsers
- `logo.svg` — brand logo asset (could also go to brand-marketing/)

**→ `vault/99-archive/screenshots-unsorted/`** (6 files)
- `error.png`, `error2.png`, `error3.png`, `error4.png`, `error5.png`, `issue.png` — generic filenames, no scannable context

---

## 3. Deletions

| Pattern | Reason |
|---|---|
| `.DS_Store` (all) | macOS noise |
| `~$*.docx` (Word lock files) | Editor lock files |
| `First prototype/data/node_modules/` | Reproducible from package.json; ~MB of vendor code in git history is undesirable |
| `First prototype/.claude/settings.local.json` | Local-only Claude settings from prior session, not portable |

All deletions happen during the migration (one commit). No file with current meaningful information is deleted.

---

## 4. Frontmatter standard

Every migrated `.md` file gets minimum frontmatter:

```yaml
---
title: <human-readable title>
domain: <home | shipments | tracking | orders | carriers | users | cross-cutting | meta>
type: <info | idea | decision | source | task>
tags: [<topic-tag>, <topic-tag>]
date: <YYYY-MM-DD>
status: <active | archived | superseded>
---
```

**Examples:**

```yaml
# vault/10-domains/shipments/domain-analysis.md
---
title: Shipments Domain Analysis
domain: shipments
type: info
tags: [domain-analysis, source-of-truth]
date: 2026-04-01
status: active
sources: [jana, david, grooming-sessions]
---
```

```yaml
# vault/20-cross-cutting/brand-marketing/odyssey-guidelines-2026.md
---
title: Odyssey Marketing Guidelines 2026
domain: cross-cutting
type: source
tags: [brand, marketing, visual-identity]
date: 2026
status: active
source-pdf: odyssey-guidelines-2026.pdf
---
```

Binary files (PDF, PPTX, DOCX, PNG, SVG, VTT) don't get frontmatter — they're referenced by their converted .md or by tagged markdown notes elsewhere.

---

## 5. Post-migration updates

After all `git mv` operations land:

### `CLAUDE.md`
- Replace "Reading `.pdf`, `.docx`, ..." section's input path: `shipments-documentation/` → `vault/00-inbox/` (default for drag-and-drop) + `vault/` for ad-hoc convert
- Update "Where context lives" section to reference vault paths:
  - `shipments-documentation/Documentation/shipments-domain-analysis.md` → `vault/10-domains/shipments/domain-analysis.md`
  - `shipments-documentation/Documentation/decision-log.md` → `vault/10-domains/shipments/decisions/decision-log.md`
  - `shipments-documentation/Documentation/backlog.html` → `vault/10-domains/shipments/backlog.html`

### `tools/convert-docs.sh`
- Change `DOCS_DIR` default from `shipments-documentation` to `vault/00-inbox` (so dragging into the inbox triggers conversion on the right scope)
- Change `CONVERTED_DIR` default from `shipments-documentation/Documentation/converted` to keep converted files next to source under `vault/00-inbox/` (user then approves placement)

### Memory updates
- Remove or supersede `project_vault_migration_parked.md` (migration is no longer parked)
- New `project_vault_structure.md` documenting the 7-folder taxonomy + the inbox workflow

---

## 6. Execution sequence (for the implementation pass)

1. Scaffold all vault folders + placeholder `_moc.md` + READMEs
2. `git mv` each Shipments-domain file per §2.1
3. `git mv` each Home-domain file per §2.2
4. `git mv` each cross-cutting file per §2.3
5. `git mv` each archive file per §2.4 (handling `First prototype/` with `node_modules` exclusion)
6. `git mv` the backlog file per §2.5
7. `git mv` screenshots per §2.7 (split across domain folders + unsorted archive)
8. `git rm` the deletions per §3
9. Update `CLAUDE.md` and `tools/convert-docs.sh` per §5
10. Update memory entries per §5
11. Single commit with body listing the structural change
12. Open vault/ in Obsidian, verify graph + wikilinks (Task #6)

---

## 7. What this plan does NOT do (deferred)

- **Convert VTT transcripts to narrative summaries.** The .vtt files migrate as-is; turning them into readable grooming notes is a separate downstream operation, one session at a time.
- **Split `decision-log.md` into atomic-per-decision files.** Stays as one file for now; atomic split is a follow-up if it becomes useful for RAG.
- **Migrate `playground/` content into vault.** Design-system / DSM tooling stays in `playground/` — that's code-adjacent, not knowledge-base.
- **Set up RAG embeddings.** Vault structure is RAG-ready; embedding pipeline is its own future workstream.
- **Convert `backlog.html` to Markdown.** Stays as .html for now to avoid losing structured table rendering; convert in a session where we re-spec backlog format.
- **Connect to Jira.** `60-tasks/` is the future Jira mirror, but no integration is built yet.

---

## 8. Decisions still open

If user approves the plan as-is, none. If user wants to adjust:

1. Should the OdysseyGuidelines.pdf live in `20-cross-cutting/brand-marketing/` or `50-sources/pdfs/`? Plan picks brand-marketing (binary + readable .md kept together; brand-marketing is the topic, sources is the storage type).
2. Should logo.svg live in `20-cross-cutting/design-system/screenshots/` or `20-cross-cutting/brand-marketing/`? Plan picks design-system; could be brand.
3. Should generic error*.png screenshots be deleted instead of archived? They're cheap to keep and might be useful for tracing past bugs.

---

## Sign-off line

Approve this plan with "go on migration" or send corrections (folder changes, specific file remapping, screenshot re-triage).
