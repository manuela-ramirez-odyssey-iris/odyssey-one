# Jira Stories Inventory — Orders Domain

**Fetched:** 2026-06-10  
**Project:** LINX (OdysseyONE)  
**Total stories/tasks across all epics:** 852

| Epic Key | Title | Story Count | Fetch Method | Notes |
| --- | --- | --- | --- | --- |
| [LINX-7552](https://odysseylogistics.atlassian.net/browse/LINX-7552) | Integrated Order Creation & Validation | 381 | parent (4 pages) | 4 pages fetched; large mix of BE/UI stories |
| [LINX-7553](https://odysseylogistics.atlassian.net/browse/LINX-7553) | Manual Order Creation (Quick Orders) | 319 | parent (4 pages) | 4 pages fetched; large mix of BE/UI stories |
| [LINX-8026](https://odysseylogistics.atlassian.net/browse/LINX-8026) | Manual Order Creation (Long Orders) | 51 | parent |  |
| [LINX-7554](https://odysseylogistics.atlassian.net/browse/LINX-7554) | Order Copy Functionality | 1 | parent |  |
| [LINX-7555](https://odysseylogistics.atlassian.net/browse/LINX-7555) | Order Life Cycle | 42 | parent |  |
| [LINX-7556](https://odysseylogistics.atlassian.net/browse/LINX-7556) | Manual Order - Edit, Cancel and Delete Order | 5 | parent |  |
| [LINX-7557](https://odysseylogistics.atlassian.net/browse/LINX-7557) | Order Overview and Actions | 31 | parent |  |
| [LINX-7939](https://odysseylogistics.atlassian.net/browse/LINX-7939) | Order Audit Trail | 0 | parent + Epic Link fallback — both empty | empty epic — no children in Jira |
| [LINX-7958](https://odysseylogistics.atlassian.net/browse/LINX-7958) | Audit Trail for Orders Capability | 14 | parent |  |
| [LINX-448](https://odysseylogistics.atlassian.net/browse/LINX-448) | View Order – Shipment Reaching Cut-Off and Update History UI | 0 | parent + Epic Link fallback — both empty | empty epic — no children in Jira |
| [LINX-5943](https://odysseylogistics.atlassian.net/browse/LINX-5943) | Orders Capability | 0 | parent + Epic Link fallback — both empty | empty epic — no children in Jira |
| [LINX-5415](https://odysseylogistics.atlassian.net/browse/LINX-5415) | Order Management TMS Phase 2 | 8 | parent |  |

## Notes on empty epics

- **LINX-7939 (Order Audit Trail)** — zero children via both `parent =` and `"Epic Link" =`. The epic has a description but no sub-stories have been created under it yet. Related work lives in LINX-7958.
- **LINX-448 (View Order – Shipment Reaching Cut-Off and Update History UI)** — zero children via both methods. Low key number (likely 2021 vintage), single-sentence description. Possibly pre-dates the new epic structure.
- **LINX-5943 (Orders Capability)** — zero children via both methods. Pure umbrella epic — all child work appears to live under the more specific LINX-755x epics. Rich description enumerates all sub-capabilities.

## Notes on content quality

- **LINX-7552** is the largest epic at 381 stories across 4 pages. High volume of BE/integration stories (address validation, data mapping, Boomi integration) alongside the UI fallout-queue stories.
- **LINX-7553** is the second largest at 319 stories across 4 pages. Contains the full Quick Order creation flow: UI stories, BE APIs, master data lookups, field validations.
- **LINX-8026** (Long Orders) has 51 stories — notably fewer than Quick Orders, suggesting Long Orders is less groomed or still earlier in spec.
- **LINX-7555** (Order Life Cycle) has 42 stories — mix of status-transition logic and downstream notifications.
- **LINX-7557** (Order Overview) has 31 stories — the order list/grid page, filtering, search, and column definitions.
- **LINX-7958** (Audit Trail Capability) has 14 stories and is the only audit epic with Approved status — more mature than LINX-7939.
- **LINX-5415** children are all Tasks (analysis/workspace setup), no Stories — purely Phase 2 kickoff housekeeping.
- **LINX-7556** (Edit/Cancel/Delete) has 5 children, two of which are pure BE API stories (Closed) — very lean on UI spec.
- **LINX-7554** (Copy) has 1 story — copy action stub on the order overview page.