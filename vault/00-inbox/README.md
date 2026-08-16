---
title: Inbox
type: meta
status: active
---

# 00 — Inbox

Ephemeral drop zone for new artifacts (screenshots, transcripts, PDFs, DOCX, XLSX, CSV, MD, images, audio). Stays empty between intakes.

## Workflow — use `/analyze`

1. **Drop** — drag artifacts here. Multiple files for one topic land together; multi-file intakes are normal.
2. **Run `/analyze [topic-name]`** — Claude invokes the analyze skill (see `~/.claude/skills/analyze/SKILL.md`).
3. **Confirm classification** — Claude proposes destination folder (`10-domains/<domain>/` or `20-cross-cutting/<topic>/` etc.); approve or redirect.
4. **Synthesis** — a subagent reads all artifacts and produces structured vault markdown (canon + decision-log + schema if applicable). Main thread stays clean of image/transcript token bloat.
5. **Review & archive** — confirm the synthesis; Claude archives raw artifacts to `vault-sources/<mirror-path>/` (outside Obsidian) and empties the inbox.

## The one-topic rule

**The inbox holds one intake at a time.** It is empty (this README only) between cycles.

Never drop new material on top of an unfinished intake. If artifacts are already sitting here, that cycle owes step 5 (archive) — finish it before dropping anything else. `/analyze` step 0 enforces this and will refuse to start on a mixed inbox.

Why: every step of the intake globs this folder. A SpotBoard image left here in August 2026 was still sitting alongside two unrelated tender transcripts four days and three sessions later — each session recording the debt in `progress.md` instead of running the four `mv` commands that would have cleared it. Mixed material means one topic's synthesis silently absorbs another's sources.

## Architecture

- **`vault/`** — synthesized markdown only. RAG-friendly. What we know.
- **`vault-sources/`** (sibling of `vault/`, at repo root) — raw artifacts. Outside Obsidian's index. What we learned from.
- **Inbox** — drop zone only. Never the destination.

## Frontmatter standard

Every synthesized vault `.md` carries:

```yaml
---
title: <human-readable>
domain: <home | shipments | tracking | orders | carriers | users | cross-cutting | meta>
type: <info | canon | decision-log | spec | source | idea | task | moc>
tags: [<topic>, <topic>]
date: <YYYY-MM-DD>
status: <active | draft | archived | superseded>
---
```

Raw binaries (PDF, PPTX, DOCX, images, VTT) in `vault-sources/` don't get frontmatter — they're referenced from synthesized vault MD by file name.
