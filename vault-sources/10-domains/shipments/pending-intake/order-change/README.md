# Order Change — PENDING INTAKE (not yet synthesized)

**Status: owes a full `/analyze` cycle.** These artifacts have NOT been read into vault canon.
They were parked here on 2026-08-17 (S122) so the Dropped Carrier intake could run against a
clean inbox — see `vault/00-inbox/README.md`, the one-topic rule.

**This is not an archive.** Everything else under `vault-sources/` is post-synthesis raw material.
This folder is pre-synthesis. To run the intake, move these three files back into
`vault/00-inbox/` and run `/analyze order-change` — the inbox must be empty first.

## Contents

| File | Role |
|---|---|
| `Order change screen - discussion.vtt` | Jana's Order Change call. Per S120: covers OC Direct + OC Consolidation, the Edit Shipment & Stops 3-panel editor (~22%, largest single piece of work), Planning Date Type + Anchor Date on the stop, and Manual Add Carrier + SCAC into the tender list. |
| `Order changes - Direct and Consolidation - Mock design - 8-12-2026.pptx` | Jana's mock deck. **Slides 8–13 are pasted LLM output, not designs** (S120) — "Show less" chrome and *"Recommended Final UX — If I were building this for Odyssey, I would use:"* still visible. That is the entire Consolidation half. |
| `… 8-12-2026.md` | MarkItDown conversion. **Lossy — all 22 screenshots dropped.** S120 read the images straight out of the `.pptx` instead; do the same. A flat text read also merges `ROUTE RANK` and `RANK` into one column and mis-assigns AP Cost. |

## Known context before intake starts

- All eight Order Change Jira tickets are **Manuela's**, all `Initial UX/UI Design`, High, label `Functional` only — no `Approved`, no `Refinement_done`, **zero comments** (S120).
- `issuelinks` is empty on all of them; every dependency lives in AC prose as an inline card.
- **Order Change – Consolidation has no Jira tickets at all.** Jana: *"I don't have the stories, but I have the design"* — and the design he means is the LLM-written half of this deck.
- Jana's priority order: Quote → Drop Carrier → OC Direct → OC Consolidation.
- The user's feasibility escalation (*"It's not going to be an improvement. It's going to be a restructure later."*) is on the record, conceded by Jana, and routed to Laurie. Unactioned.
