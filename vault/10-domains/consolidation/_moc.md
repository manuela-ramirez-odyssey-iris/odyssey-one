---
domain: consolidation
type: moc
tags: [consolidation, moc]
date: 2026-09-15
status: active
---

# Consolidation — Map of Content

Combining single-order shipments into one multi-order shipment for trailer utilization.
A consolidation is a **new** shipment that loads are moved into — never orders added to an
existing one ([[decisions/decision-log|CNS-01]]).

## Canon
- [[consolidation|Consolidation domain canon]] — the Oct MVP surfaces, the flow, the audit vocabulary, the build delta

## Decisions
- [[decisions/decision-log|Consolidation decision log]] — CNS-01 … CNS-06

## Oct MVP stories
| Story | Surface |
|---|---|
| LINX-15786 | Consolidation Candidate Workbench |
| LINX-15787 | Review & Apply Manual Consolidation |
| LINX-15788 | Consolidation Audit Trail |

Descoped for Oct ([[decisions/decision-log|CNS-06]]): LINX-14633, 13292, 13291, 14687, 13472 (Optimizer).

## Neighbours
- [[../shipments/order-change|Shipments — Order Change]] — the surfaces slide 15 integrates with
- [[../shipments/domain-analysis|Shipments domain analysis]] — the loads-hidden rule this contradicts
- [[../shipments/decisions/decision-log|Shipments decisions]] — DEC-144…151, the identifier work CNS-04 collides with

## Raw
`vault-sources/10-domains/consolidation/` — deck + four transcribed screens.
