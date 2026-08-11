---
title: History Event Catalog — MVP Spec (Pappu, 2026-08-06)
domain: shipments
type: spec
tags: [history, shipment-trail, audit, event-catalog, mvp, pappu]
date: 2026-08-10
status: active
---

# History Event Catalog — MVP Spec

Schema/contract document for the [[shipment-trail|Shipment Trail]] event vocabulary as specified
by Pappu. Source: `vault/00-inbox/MVP - History Screen.md` (MarkItDown conversion of
`MVP - History Screen.xlsx`, dated 2026-08-06), 3 sheets. This is a **verbatim transcription** of
the spec — see [[shipment-trail]] for how it compares against what we've built.

**This is NOT the same list as our implemented `HISTORY_ACTIONS`** (`apps/odyssey-one/tools/generate.mjs`
~line 979). See [[shipment-trail#Gap analysis]] for the comparison.

## Reading this table

- **Event** = the named row in the source. Merged/blank cells (`NaN` in the MarkItDown render) are
  **not unnamed events** — each is an additional outcome **variant** of the event named above it
  (success / failure / branch). This structure is stated explicitly in the intake instructions and
  verified row-by-row below.
- **`<Placeholder>` tokens are preserved verbatim** — they are the implementation contract. Do not
  rename, reformat, or resolve them here.
- **Sheet** column traces provenance — Sheet2 repeats `Shipment Update Notification` verbatim from
  Sheet1 (flagged, not deduplicated away, since the catalog must stay lossless against the source).

## Event count reconciliation

- **Sheet1**: 14 distinct events, 23 detail-message variants.
- **Sheet2**: 1 new event (`Shipment Updated`, 2 variants) + 1 repeated event (`Shipment Update
  Notification`, 2 variants, identical text to Sheet1's).
- **Distinct events across both sheets: 15.** Distinct variants: 25 (23 + 2 new; the repeat is not
  double-counted as new content, but both occurrences are shown below for losslessness).
- **Sheet3** contributes no events — it is a scope-exclusion list (see below).

## Catalog

### 1. Shipment Created — Sheet1

| Variant | Detail Template | Example | Remark |
|---|---|---|---|
| Success | Buy Shipment `<Buy Shipment Number>` and Sell Shipment `<Sell Shipment Number>` created successfully for Order `<Order Number>`. | Buy Shipment 10027 and Sell Shipment 23002 created successfully for Order O10001. | "In case of successful creation of shipment, this message should be shown as the 'Details' of the event 'Shipment Created'." |
| Failure | Shipment creation failed for Order `<Order Number>`. | Shipment creation failed for Order O10001. | "In case of failure of creation of shipment, this message should be shown as the 'Details' of the event 'Shipment Created'." |

### 2. Routing Completed — Sheet1

| Variant | Detail Template | Example | Remark |
|---|---|---|---|
| Success | Routing completed successfully. Direct cost calculated: `<Direct Cost Value>`. Eligible carriers and route details identified. | Routing completed successfully. Direct cost calculated: `<$125.00>`. Eligible carriers and route details identified. | "When routing call happens successfully, this message should be shown as the 'Details' of the event 'Routing Completed'." |
| Failure | Routing call failed. Shipment moved to Review. | Routing call failed. Shipment moved to Review. | "When routing call fails, this message should be shown as the 'Details' of the event 'Routing Completed'." |

**⚠ Flagged, not silently normalized:** the success example renders `<$125.00>` — angle brackets
around an *already-filled* value. Every other example in the sheet fills the placeholder and drops
the brackets. This is almost certainly a copy-paste artifact in the source spreadsheet (the
template's `<Direct Cost Value>` bracket carried over when the author typed the example). Recorded
verbatim per instruction; do not silently "fix" it into `$125.00` without confirming with Pappu —
it is possible (if unlikely) the brackets are intentional emphasis.

### 3. Optimization Evaluation — Sheet1

| Variant | Detail Template | Example | Remark |
|---|---|---|---|
| Consolidation branch | Optimization evaluation completed. Shipment moved to Consolidation. | Optimization evaluation completed. Shipment moved to Consolidation. | "If optimization Evaluation is yes and optimization rules support Consolidation, then this message should be shown for the event 'Optimization Evaluation'." [sic — "Eveluation" in source] |
| Hold branch | Optimization evaluation completed. Shipment moved to Hold. | Optimization evaluation completed. Shipment moved to Hold. | "If optimization Evaluation is yes and optimization rules support Hold, then this message should be shown for the event 'Optimization Evaluation'." |
| Failure | Optimization evaluation failed. Shipment status updated to Review. | Optimization evaluation failed. Shipment status updated to Review. | "This message is shown when 'Optimization Evaluation' is No." |

### 4. Consolidation Completed — Sheet1

| Variant | Detail Template | Example | Remark |
|---|---|---|---|
| (single) | Consolidation completed. Final Shipment `<Shipment Number>` contains Orders `<Order Number 1>`, `<Order Number 2>`, and `<Order Number 3>`. | Consolidation completed. Final Shipment S2 contains Orders O1, O2, and O3. | "Once consolidation gets completed, this message should be shown." |

**Note (inferred, not stated):** the template hardcodes exactly 3 order-number placeholders. Whether
a consolidation of 2 or 4+ orders should list all of them or truncate is not addressed by the spec —
flagged as an open item below, not resolved here.

### 5. Routing & Rating Completed — Sheet1

| Variant | Detail Template | Example | Remark |
|---|---|---|---|
| (single) | Consolidated shipment routed and rated successfully. AP: `<Account Payable Value>`; AR: `<Account Receivable Value>`. Carrier and route details refreshed. | Consolidated shipment routed and rated successfully. AP: $125.00; AR: $150.00. Carrier and route details refreshed. | (blank in source) |

### 6. Ready for Tender — Sheet1

| Variant | Detail Template | Example | Remark |
|---|---|---|---|
| (single) | Time-to-Tender reached. Shipment is eligible for tendering and moved to auto tender evaluation. | Time-to-Tender reached. Shipment is eligible for tendering and moved to auto tender evaluation. | (blank in source) |

### 7. Auto Tender Validation — Sheet1

| Variant | Detail Template | Example | Remark |
|---|---|---|---|
| Pass | Auto tender validation passed. Tender initiated. | Auto tender validation passed. Tender initiated. | "Success Scenario" |
| Fail | Auto tender validation failed. Shipment moved for User Review. | Auto tender validation failed. Shipment moved for User Review. | "Failure Scenario" |

### 8. Tender Sent — Sheet1

| Variant | Detail Template | Example | Remark |
|---|---|---|---|
| (single) | Tender status updated to Sent. Tender sent to carrier `<Carrier Name>` via `<Communication Method>`. | Tender status updated to Sent. Tender sent to carrier SAIA via API (SMC3). | (blank in source) |

### 9. Tender Response Received — Sheet1

**Structural note:** this is ONE event with THREE outcome variants — our implementation instead
models the accept/decline as two separate top-level events (`Tender Accepted`, `Tender Declined`).
See [[shipment-trail#Gap analysis]].

| Variant | Detail Template | Example | Remark |
|---|---|---|---|
| Declined | Tender response received from carrier `<Carrier Name>` via `<Response Method>`. Tender status updated to Declined. | Tender response received from carrier SAIA via API. Tender status updated to Declined. | (blank in source) |
| Accepted | Tender response received from carrier `<Carrier Name>` via `<Response Method>`. Tender status updated to Accepted. | Tender response received from carrier SAIA via API. Tender status updated to Accepted. | (blank in source) |
| Timeout (no response) | No carrier response received. Tender timed out and was automatically declined. | No carrier response received. Tender timed out and was automatically declined. | (blank in source) |

### 10. Shipment Planning Completed — Sheet1

| Variant | Detail Template | Example | Remark |
|---|---|---|---|
| (single) | Shipment status updated to Done. | Shipment status updated to Done. | (blank in source) |

### 11. Planned Shipment Sent — Sheet1

| Variant | Detail Template | Example | Remark |
|---|---|---|---|
| (single) | Planned shipment details sent to customer. | Planned shipment details sent to customer. | (blank in source) |

### 12. PGI Response Received — Sheet1

| Variant | Detail Template | Example | Remark |
|---|---|---|---|
| Success | PGI received and execution updates applied to orders and shipment. | PGI received and execution updates applied to orders and shipment. | (blank in source) |
| Validation error | PGI response received with validation errors. Moved to user review for correction. | PGI response received with validation errors. Moved to user review for correction. | (blank in source) |

### 13. Post PGI Rating Completed — Sheet1

| Variant | Detail Template | Example | Remark |
|---|---|---|---|
| (single) | Buy and Sell shipments rated successfully following PGI update. Planned Cost: $120.00, Actual Cost (AP): $125.00, Variance: +$5.00. Sell Rate (AR): $150.00. | (same as template — fully-filled example given, no separate placeholder form provided in source) | (blank in source) |

**Note:** unlike every other row, the source gives no `<Placeholder>` form for this template — the
"Details Format" and "Details Example" columns are identical fully-filled text. Recorded as-is;
do not invent placeholder names that aren't in the source.

### 14. Shipment Update Notification — Sheet1 (repeated verbatim in Sheet2)

| Variant | Detail Template | Example | Remark | Sheet |
|---|---|---|---|---|
| Success | Buy Shipment Out and Sell Shipment Out message successfully sent. | Buy Shipment Out and Sell Shipment Out message successfully sent. | (blank) | Sheet1 |
| Failure | Buy Shipment Out and Sell Shipment Out message delivery failed. | Buy Shipment Out and Sell Shipment Out message delivery failed. | (blank) | Sheet1 |
| Success (repeat) | Buy Shipment Out and Sell Shipment Out message successfully sent. | (same) | "Success" | Sheet2 |
| Failure (repeat) | Buy Shipment Out and Sell Shipment Out message delivery failed. | (same) | "Failure" | Sheet2 |

Sheet2's own remark on this pairing: *"Whenever any updates happen, these two events (Shipment
Updated and Shipment Update Notification) must be captured in the History screen."*

### 15. Shipment Updated — Sheet2 (new, not in Sheet1)

| Variant | Detail Template | Example | Remark |
|---|---|---|---|
| Transportation-Relevant | Shipment updated (Transportation Relevant). AP Cost: $125.00; AR Rate: $150.00. Routing and rating recalculated successfully. | (same as template) | "Transportation-Relevant Update" |
| Non-Transportation-Relevant | Shipment updated (Non-Transportation Relevant). AP Cost: $125.00; AR Rate: $150.00. Rating recalculated successfully. | (same as template) | "Non-Transportation-Relevant Update" |

**Note:** like #13, no bracketed-placeholder form is given — the "Details" column is already a
filled example. The $125.00 / $150.00 values read as illustrative rather than literal placeholders,
but the source does not mark them as such.

## MVP scope boundary — Sheet3

Sheet3 is not an event list — it is a scope-exclusion list, verbatim:

| Topic | Status |
|---|---|
| User Action | Not part of MVP |
| Manual tendering | Not part of MVP |

Both are named as topics "for which analysis is required and event should be finalized" — i.e. they
are acknowledged as real, future work, not rejected. See [[shipment-trail#Open / TBD]] for the
tension this creates against the email's actor taxonomy.

## Open items specific to this catalog

- **A visual pass over the original `.xlsx` is owed.** MarkItDown is known in this project to
  silently drop rich formatting (Session 108: flattened strikethrough presented dead questions as
  live). If `MVP - History Screen.xlsx` used color or strikethrough to convey scope, priority, or
  status on any row, that signal is invisible in this transcription. Not yet done.
- The `<$125.00>` bracket-around-a-filled-value in Routing Completed's example (see event #2) —
  flagged, not normalized.
- Events #13 and #15 give no bracketed placeholder form, unlike every other row — inconsistent
  authoring in the source, not resolved here.
- Consolidation Completed's template hardcodes exactly 3 order placeholders — behavior for 2 or 4+
  orders is unaddressed.

## Related

- [[shipment-trail]] — canon: what the Shipment Trail is, actor model, gap analysis
- [[decisions/decision-log|Decision Log]] — DEC-77 through DEC-79
- [[domain-analysis]] §9 — prior History canon (Shipment History vs Tender History)
