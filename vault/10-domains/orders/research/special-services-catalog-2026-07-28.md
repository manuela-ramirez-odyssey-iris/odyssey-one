---
domain: orders
type: research
tags: [special-services, charge-codes, master-data, lookup]
date: 2026-07-28
status: active
---

# Special Services — real catalog evidence (old-TMS screenshot)

Source: user-dropped screenshot of the OLD TMS "Special Services" screen (raw:
`vault-sources/10-domains/orders/SpecialServices old system screenshot.png`,
2026-07-28). Processed in S97 while building the §Special Services MultiSelect.

## What the screenshot shows (verbatim, top → cut-off)

Header "Special Services" · "+ Add Special Service" link · table with a
checkbox column, **Service Name**, and **Value** columns. Alphabetical order.
19 services visible before the list is cut at the viewport:

Advance Loading · After Hours Delivery · Air · Appointment at Delivery ·
Blind Shipment Delivery · Blind Shipment Pick Up · Cleaning · Cross Border Fee ·
DoNotFreeze · Double Rush · Driver Assist · Drop Trailer · Expedited Same Day ·
Frozen · Hazmat · High Density · Holiday Pick Up · Hose · Inbond Freight (…list continues)

## What this adds vs what we already had

Already held (Jira research 2026-07-26, LINX-8124/8125): dropdown = ALL TMS
charge codes filtered to master-data "Display on Order" = Yes, excluding
Lumper/Detention Loading/Unloading; format "Code - Description"; frequency-
sorted; Manage modal = searchable tabular list w/ checkboxes. Endpoint family
hint (LLD research 2026-07-28): Special Services lookup lives under the
`product-service` sub-domain with the standard `{lookup, pageNumber, pageSize}`
→ `{data, totalCount}` convention.

NEW from this screenshot:
1. **Scale** — the real catalog is far larger than our 5-item mock (19 visible
   A→I only; plausibly 40+ total). Alphabetical here; order creation re-sorts
   by frequency per LINX-8125.
2. **A `Value` column exists** — some special services are PARAMETERIZED (carry
   a per-order value), not just flags. Our form shape `[{code, description}]`
   has no value slot; the OdysseyONE Jira specs never mention it either —
   open question whether the new system carries it (ask Ramesh/Jana).
3. **Display names only** — the old screen shows names (e.g. "DoNotFreeze",
   "Drop Trailer"), NOT the charge codes (PALEXG/PJC/LFT style). Name↔code
   mapping still unverified.

## Gaps / next captures

- Real code list + descriptions: one dev network-tab capture of the
  special-services lookup (same replay method as the 2026-07-28 product-data
  captures) would ground-truth codes, "Display on Order" filtering, and
  whether `value` rides the wire.
- Whether OdysseyONE order creation needs the Value column at all (LINX-13823
  defect suggests the dropdown data path is still unsettled live).

## Applied to the mock (2026-07-28, same session)

`SPECIAL_SERVICES` in `master-data.js` extended 5 → 24 entries: the 19
screenshot names added verbatim as descriptions. **Codes are INVENTED
mnemonics** (ADVLD, AHDEL, …) and frequencies invented for sort order — swap
both when a dev lookup capture lands. Value column ruled out of scope by
Manuela (2026-07-28). LUMP/Detention stay excluded per LINX-8125.

Provenance: screenshot supplied by Manuela 2026-07-28; synthesis by Claude
(S97). Names transcribed verbatim from the image; scale/mapping claims are
inference — validate against a live capture.
