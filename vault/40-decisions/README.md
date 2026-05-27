---
title: Cross-domain Decisions
type: meta
status: active
---

# 40 — Cross-domain Decisions

Decisions that span multiple Odyssey-One domains. Domain-specific decisions live in `10-domains/<domain>/decisions/`.

## Examples that belong here

- "We dropped NotebookLM and built our own RAG"
- "Backlog is unified, not per-domain"
- "Vault structure decisions" (this very migration)

## Examples that DON'T belong here

- "We changed SHP-19 filter options" → `10-domains/shipments/decisions/`
- "Home widget profile model" → `10-domains/home/decisions/` (when it exists)
