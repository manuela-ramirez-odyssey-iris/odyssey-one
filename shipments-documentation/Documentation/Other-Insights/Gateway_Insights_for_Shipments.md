# Gateway Insights Relevant to Shipments

**Source:** `Gateway_Project_Overview.md` (Manuela Ramirez, Apr 2026)
**Last updated:** 2026-04-17
**Status:** Backend reference only — nothing here is confirmed as user-facing unless explicitly noted

> This file extracts what we can learn from the Gateway engineering project to deepen our mental model of the Odyssey system. It lives separately from `shipments-domain-analysis.md` (our source of truth for UI decisions) because Gateway knowledge is evolving and most of it is backend-only. If a grooming session confirms something here as UI-relevant, promote it to the domain analysis.

---

## 1. The Four Integration Flows

The Gateway handles 4 data exchanges between each customer's ERP and Odyssey's TMS. These map to stages in our shipment lifecycle:

| # | Flow | Direction | What happens | Maps to |
|---|---|---|---|---|
| 1 | **Order** | Customer -> Odyssey | Customer sends purchase/delivery orders. Odyssey creates orders in TMS. | Order entity creation |
| 2 | **Shipment** | Odyssey -> Customer | After tendering, Odyssey sends shipment details back (carrier, pickup date). | Post-tender step in lifecycle |
| 3 | **PGI** | Customer -> Odyssey | Customer confirms actual pick/pack/load data (quantities, weights, dates may differ from plan). | PGI/PGR panel |
| 4 | **Freight Accrual** | Odyssey -> Customer | After PGI, Odyssey re-rates and sends updated freight cost for customer's accounting. | Post-PGI, triggers Completed Cost |

**Mental model takeaway:** Our three panels (Exceptions, Monitoring, PGI/PGR) sit in the middle of a larger data exchange loop. Orders flow in, shipments flow out, PGI flows back in, accruals flow back out. The Shipments UI is the operational cockpit for stages 2-4.

---

## 2. Why PGI Is the Hardest Part

Each customer sends PGI in their own format — **~100+ variants** collapse into one Odyssey format. This is entirely infrastructure-level complexity, but it explains why PGI Errors are a dedicated sub-category in our panel model: validation failures are structurally common, not edge cases.

**Mental model takeaway:** When we eventually design the PGI/PGR panel beyond the current placeholder (SHP-17), we should expect error states to be the primary UX, not the happy path.

---

## 3. Customer Format Diversity

47 customers send data in at least 8 different wire formats:

- SAP IDoc (DELVRY03, SHPMNT04)
- Odyssey XML (native)
- EDIFACT (European EDI)
- CIDX (Chemical industry XML)
- SAP HANA XML / SAP R/3 XML
- X12 EDI (North American)
- Flat files (CSV/fixed-width)

The Gateway normalizes everything before it reaches the TMS — so by the time data hits our UI, it's in a single Odyssey format. But the bespoke nature of each customer's translation explains why data quality can vary.

**Mental model takeaway:** Data inconsistencies users see aren't bugs in the TMS — they originate from 47 different translation pipelines. This is backend-only context but useful for understanding user complaints.

---

## 4. Customer Scale

- **47 active customer gateways** across 9 platform versions
- Complexity ranges from 170 XSL files (simplest) to 359 (most complex)
- **12 of 47** have additional D365 (Microsoft Dynamics) integration
- Some customers (GRACE, GCP) share gateways rather than having dedicated ones
- **1 person (Ronald)** currently carries all 47 integrations — the two original engineers are gone

---

## 5. What's Already Confirmed in Our Domain Analysis

These Gateway details have been independently validated through grooming sessions and are already in `shipments-domain-analysis.md`:

| Fact | Confirmed by | Domain analysis section |
|---|---|---|
| 5 transport modes: TL, LTL, RR, IMD, AIR | Jana/David | Section 13 |
| Freight accrual is automated, no UI | David | Section 7 |
| Billing is a separate system | David | Section 7 |
| Buy + Sell shipments created simultaneously | Jana | Section 5 |
| Three operational panels as separate shipment pools | Jana | Section 8 |
| PGI triggers Completed Cost | Jana | Section 7 |

---

## 6. Parked Details (No Confirmed UI Relevance)

These are documented here so we don't lose the knowledge, but have no confirmed connection to anything we're designing:

- **DOCTYPE numeric codes** (124-169) — internal message type identifiers used in routing rules
- **JMS queue routing** — how messages flow between Gateway services
- **XSLT transformation chains** — per-customer translation pipelines
- **SysConfig.xml structure** — defines services, translators, routing rules per customer
- **GtwUtils Java utility calls** — database lookups from within XSLTs
- **SCAC assignment logic** — carrier code derivation (e.g., Heubach has 13+ priority rules)
- **VSBED transport mode derivation** — SAP shipping condition codes (~30 mappings)
- **Platform version groupings** (NNCode) — 9 different platform versions across 47 customers

---

## Changelog

| Date | What changed |
|---|---|
| 2026-04-17 | Initial analysis from Gateway_Project_Overview.md |
