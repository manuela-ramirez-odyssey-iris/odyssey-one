---
title: Backlog
type: meta
status: active
---

# 60 — Backlog

**Single domain-agnostic backlog** for all Odyssey-One work. Items span every domain (Home, Shipments, Tracking, Orders, Carriers, Users) and are tagged with their domain inline or in item frontmatter.

## Why one backlog, not one per domain

We work in multiple domains simultaneously, not sequentially. A unified backlog gives a single prioritization view across all in-flight work; per-domain backlogs would fragment that view and make cross-domain dependencies invisible.

## Filtering by domain

Items carry a `domain:` tag (Shipments items prefix SHP-, Home items prefix HOM-, etc.). Use Obsidian search `tag:#shipments` or a Dataview query (future) to scope the view to one domain when needed.

## Future Jira mirror

When Jira access is provisioned, this backlog mirrors to one unified Jira project (not one per domain). The item ID prefix (`SHP-`, `HOM-`, …) keeps domain visibility within a single tracker.

## Current state

`backlog.html` currently contains 100% Shipments items (SHP-19, SHP-21, etc.) — that's incidental, not structural. As Home / Tracking / Orders work activates, new items land in the same file tagged with their domain.
