---
domain: orders
type: research
tags: [orders, research, jira, create-order, validation, confirmation]
date: 2026-07-26
status: active
source: "LINX Jira via Atlassian MCP (Odyssey account), session S94"
---

# Create Manual Order + Confirmation Pages — Jira Research (2026-07-26)

Purpose: full Jira spec extraction for the Quick/Long Order Creation flow (General Information, Pickup and Delivery, Product Information, Special Services), its validation-error model, and the Confirmation pages — for contrast against Efrain's Figma and our React implementation. Method: all specs pulled from customfield_10032 ("Acceptance Criteria"); strikethrough marks = superseded content.

## 1. General Information (LINX-8118, Done)
- Owning Organization* — searchable dropdown; search at 2–3 chars, case-insensitive; 25–30 results, infinite scroll; "No results found" empty state. Error: "Please select Owning Organization"
- Ship Direction* — dropdown, defaults "Outbound" (no error needed — always has value)
- Freight Term* — dropdown; default "Pre-Paid" if Outbound, "COL" if Inbound
- Equipment* — searchable dropdown, same search behavior. Error: "Please select Equipment"
- Consolidatable (opt) — checkbox, checked by default
- Order Number (opt) — free text, max 150 chars excl. space; system-generated if blank. Duplicate check scoped to Order Number + Owning Organization PAIR. Errors: "The Order Number for the selected Owning Organization already exists. Please enter another value" and "Order Number can have only 150 characters (excluding space). Please check the order number."
- Section header: grey→green tick once mandatory fields validate.
- LINX-12102 (Blocked): order-level Hazardous checkbox — unchecked by default, auto-checks when ≥1 product line hazardous (UN Number entered), cannot be manually unchecked while a hazardous line exists (test case LINX-13660); auto-unchecks only when zero hazardous lines remain. Role-permission gating LINX-13658/13659.

## 2. Pickup and Delivery (LINX-8119 Done, LINX-8120 Done, LINX-12095 Blocked, LINX-13845 Closed, LINX-8042 Long)
- Location ID* per party — searchable dropdown (contains-match in typed sequence); pick defaults address elements from TMS master; Location ID non-editable while editing address; manual entries order-scoped, never appended to master. Errors: "Invalid location ID entered. Please check the value and enter the correct location ID." / "No matching locations found. Please manually enter the Org Name/Long Name / Address fields"
- Old multi-field address SEARCH struck/dead — search by Location ID alone (Ramesh comment 2026-06-12; bugs LINX-11155/11156 cancelled).
- Cross-party rule: Consignor & Consignee addresses must NOT be identical — all address boxes red-outlined, error: "Consignor & Consignee addresses can not be the same. Please check the addresses"
- Dates (LINX-8120): radio Ship Date (default) | Delivery Date; selected one makes its Latest date+time mandatory. Errors: "Please select Latest Pickup Date & Time" / "Please select Latest Delivery Date & Time". Fields: Earliest/Latest Pickup (Consignor), Earliest/Latest Delivery (Consignee). Format MM/DD/YYYY + 24h HH:MM; time defaults 00:00 once date set. Past/current date = non-blocking warning "Past or current date selected. Please check and modify as needed".
- Cross-field date rules (calendar UI should block invalid picks): Earliest Pickup ≤ Latest Pickup; Earliest Pickup < Latest Delivery; Earliest Delivery ≤ Latest Delivery; Pickup (either) before Delivery (either) — each with its own error string, e.g. "Early Pickup Date & Time should be on or before Late Pickup Date & Time...", "Pickup (Earliest or Latest) Date & Time should be before Delivery (Earliest or Latest) Date & Time..."
- Timezone: 3-letter code w/ DST, auto-derived from party address; if underivable → user picks from dropdown and field becomes required; mismatch warning "Time zone selected is not aligned with the selected address"; inconsistent early/late tz → unset dropdown restricted to the other's value.
- Appointment flag (LINX-12095 Blocked + LINX-13845 Closed): two independent "Appointment" checkboxes top-right of pickup/delivery date groups; unchecked by default; each enabled ONLY when its Latest date&time is filled; auto-clears on change; surfaces an "Appointment" tag on Shipments (per-leg). Story blocked on VD; Efrain completed Figma 2026-07-24. Open question (Ramesh 2026-07-23): whether the flag exists in Shipments-side stories.
- LINX-13548 (Final Review): timezone hard-fail applies to INTEGRATED orders only (Order.SourceSystem = O2) — reject on submit with "Shipper Time-Zone missing. Please re-submit the order with the correct Shipper Time-Zone" / "Consignee Time-Zone missing..." / "Shipper & Consignee Time-Zones missing..." Don't conflate with manual-flow inline warnings.
- Long order (LINX-8042): "Consignor" struck → "Shipper" (Consignee unchanged; also renames in flight LINX-12255 Consignor→Shipper, LINX-13899 Consignee→Destination). Bidirectional cascading auto-population across ID/Org Name, Long Name, Address 1, City, State/Region, Postal, Country. Two-tier error scheme (replaces old "<Field> not found in master data..." text, struck): missing value → "Please Enter <Field>" + red outline; searched-no-match → "No match found. Please search for/select an applicable value from the dropdown". Address 2 optional (1–500 chars). Contact Name optional; Contact Number dynamic country formats (NANP "+1 (123) 456-7890" etc), stored E.164, max 15 digits, error "Enter a valid phone number"; Email basic validation, error "Enter a valid email address". Geo-validation function from Dave Schultz shared between Integrated and Manual (resolves the LINX-8066 contradiction, Ramesh 2026-07-08). Contact-number component dependency gap: LINX-12286 (User Management component unavailable; dev aligned with User Management per Pavithra 2026-07-15).

## 3. Product Information (LINX-8121 Blocked-VD, LINX-13893 Final Review, LINX-9874/9875/9877/9879 Todo, LINX-8131/8134/8135 Blocked-VD)
- Submission gate: ≥1 product required — "System should not allow the submission of the order without atleast 1 product added into the order." (no error string specified)
- Repeating rows: auto Line # from 1, no row limit, not removable via Manage Column. Pencil-edit → popup Confirm & Save Changes / Discard. Delete → popup Delete / Cancel.
- Quick grid columns (LINX-9874): Line #, Product ID, Product Description, Shipping Class, Shipping Class ID, Gross Weight, UoM (Weight), Volume, UoM (Volume), Handling Unit.
- Field rules: Hazardous? checkbox auto-checks when UN Number entered on the line; "If atleast 1 product in the order is hazardous, the entire order is considered as hazardous." Product ID opt (TMS-validated; frequency-sorted per LINX-9875 — see conflict flag). Product Description* auto-filled from ID, 1–150 chars, error "Please enter product description". Gross Weight* value ≤2 decimals + UoM (frequency-sorted), errors "Please enter gross weight value" / "Please select gross weight UoM" (+ swapped-pair variants); WARNING if Equipment TL and >19,000 lb: "Gross weight is more than what is usually permissible for the Equipment selected. Please re-check and update as needed." Volume opt (same pattern). Product Class opt. Harmonized Code opt (lookup; format rule struck with NO replacement — gap). NMFC opt, error "Please check NMFC". Handling Unit value+UoM opt (= legacy "Packaging ID"). Shipping Class dropdown fixed 4 options: Product Class / Commodity / Harmonized / NMFC → makes Shipping Class ID mandatory (dependent dropdown, disabled until parent, category-filtered, cleared with parent; option SOURCE never stated — gap).
- Cross-rule: "Either Product ID & Product Description (or) Shipping Class & Shipping Class ID should be entered for product to be added to the order." Help text (not error): "Please select either Product ID or Shipping Class, to proceed with adding Product to the order". No "both filled" error string exists anywhere — gap.
- KILLED: US/Metric toggle (AC text stale; Ramesh comment 2026-06-25 removes it — TMS normalizes UoM in background; master data can't differentiate US/Metric). Commodity (STCC) struck from base grid (David Johns recommendation, Ramesh 2026-07-08) — but live for Rail per LINX-13893 Case 4 (unreconciled).
- Equipment applicability matrix (LINX-13893, "Lauren's feedback", verbatim cases):
  - Case 1 LTL/LTR/LTH: Line #, Hazardous?, Product ID, Product Description, Gross Weight (V&UoM), Volume (V&UoM), Product Class, Handling Unit Name & Description, Handling Unit Count, Length/Width/Height (V&UoM). (1–7 → LINX-8121; 8–12 → LINX-8135)
  - Case 2 TL/TLR/TLH/TT: same minus Product Class. (1–6 → 8121; 7–11 → 8135)
  - Case 3 LCL/FCL (Ocean): Line #, Hazardous?, Product ID, Product Description, Gross Weight, Volume, Product Class, Harmonized Code, Declared Value, Declared Value Currency, Manufacturing Country Code. (1–8 → 8121; 9–10 → 8131; 11 ≈ "Country of Origin" LINX-8134)
  - Case 4 RR (Rail): Line #, Hazardous?, Product ID, Product Description, Gross Weight, Volume, Product Class, STCC Code — STCC non-mandatory, TMS-validated, error "Incorrect STCC Code. Please check the value & re-enter"
- Long-order sub-sections:
  - Packaging (LINX-8135, all optional): Handling Unit + HU Description (auto-populated, editable, 1–150 chars) + HU Count (non-zero whole number, error "Please enter a non-zero whole number"; decimal entry triggers it); parallel Package ID / Package Description / Package Count trio (same rules, same error); orphaned description/count without parent field is ignored ("If HU Description is added without HU and HU Count, it will be ignored"); Volume dual-mode — "Enter Total Volume" (default, syncs with product table) vs "Calculate Total Volume" (clears prior; derives from Length × Width × Height; one UoM governs all three dims; Volume UoM auto-derives e.g. ft → cubic feet); Order Line Girth = "Length + ((Width + Height) x 2)" — derived, editable only when Total-Volume-only path used, then must be whole number > 0.
  - Product Details (LINX-8131): Product Class/NMFC inherit 8121 BRs, bidirectional Quick↔Long sync. Net Weight + Tare Weight opt (value+UoM, same rule as Gross Weight). Declared Value opt (numeric ≤2 decimals, separators auto-added) + Declared Value Currency (ISO 3-letter alphabetic codes, listed alphabetically; enabled only once Declared Value entered) — each mandatory-if-other-filled: "Please enter declared value" / "Please enter declared value currency". STCC struck entirely. UNRESOLVED pushback: Steve O'Hara 2026-07-09 "this now looks like we are creating Product master data via the UI? ... Not sure how this fits into Manual Order entry" — never answered in-thread.
  - General (LINX-8134): Country of Origin opt — "<ISO Code> - <Country Name>", searchable by code OR name, alphabetical, GLOBAL list from attached "Countries List.xlsx". Shipping Class/ID bullets struck in this ticket (live spec is LINX-9877).
- DROPDOWN-SORT SPEC CONFLICT (flag for Ramesh/Efrain): frequency-of-use sort struck through in Long tickets (8131 Currency, 8134 Country, 8135 HU/Package/UoM — replaced by alphabetical or nothing) but still LIVE unstruck in Quick siblings (LINX-9875 Product ID, LINX-9879 Handling Unit).

## 4. Special Services (LINX-8125 + LINX-8124, both Done)
- Order-level, NOT per-stop/per-line ("at an order level (not at line level)" — Ramesh 2026-05-19 per meeting with David & Dave). Entirely optional (LINX-12404).
- Quick-selection: dropdown of ALL TMS charge codes (original hardcoded 8-chip list struck: Pallet Jack, Lumper, Lift Gate At Delivery/Pickup, Detention Loading/Unloading, Trailer Drop, Drop Container), EXCLUDING Lumper / Detention Loading / Detention Unloading ("not known at the time of order"); only codes with master-data "Display on Order" = "Yes" appear (LINX-12399/12408/12409, both Quick and Long); format "Code - Description" (LINX-12402); frequency-sorted; selections land in Service Category table (code + auto-populated description) with trash-remove.
- Manage Special Services modal (LINX-8124): full searchable tabular list, Service Category + Description + "Add to order" checkboxes (unchecked default), no selection limit, frequency-sorted, search by category or description, per-row remove.
- Known live defect: LINX-13823 "Special Services values are not displayed in UI dropdown on Order Creation page" (Analysis).

## 5. Save / Save for Later / Discard (LINX-9010, Done)
- Save: persists without closing; status Draft. Cancel button → Save For Later (persists + closes; Draft; retrievable from Overview) or Discard (terminates, explicit confirmation screen, unrecoverable).
- Expand All (default) / Collapse All. Create Order → confirmation page (LINX-9002) + order appears in Overview (LINX-9896).
- Save gate: Order Number AND Owning Organization both required. Errors (red text, red-outlined fields, positioned top-left before General Information header): "Order Number and Owning Organization are required, to save an order. Please ensure both these values are available" / "...to save an order, for later. ..."
- Historical bug LINX-10739 (fixed): ship date/time missing from staging payload on save — verify our implementation replicates the FIX.

## 6. Validation-error model (cross-section synthesis)
- Pattern: INLINE, PER-FIELD only — direct-instruction messages on blur/submit-attempt, clearing when fixed. Warnings (non-blocking) distinct from errors (e.g. past-date, TL >19,000 lb). Compound value+UoM pairs: distinct message per missing half. Cross-field rules enforced via help text (product either/or) or red-outline + message (address identity, date ordering).
- NO Jira ticket specifies section-level error counts or a post-submit validation summary for the create flow. The "Validation Errors" TAB is a separate feature for INTEGRATED orders only (OIF). Implication: our parked S90 error-state design (per-section errorCount Accordions + docked Alert + onErrorNav) is richer than Jira mandates — a design-side decision to confirm with Efrain, not a Jira requirement.

## 7. Confirmation pages
- Quick (LINX-9002, Done): shows order number + all mandatory fields entered, per section. Dual message states: order number provided → "Your order was created successfully."; not provided → field blank + "Your order has been submitted successfully. An order number is being assigned and will be available shortly" → async generation populates the field and flips the message. Currently synchronous; becomes ASYNC once Product Information ships (multiple validations) — story closed with explicit re-open note (Ramesh 2026-06-15, per Venkat). QA detail tickets (LINX-10987–10993): breadcrumb back to Orders list; sidebar "Order" active; Payment Terms in page header must equal the General Info Freight Term; References placeholder when empty; chevron expand/collapse; user details + branding in header. Ramesh 2026-06-18 comment links OUR stage URL (odyssey-one-stage.vercel.app/orders/create) as "the UI for this story".
- Long (LINX-9004, BLOCKED pending Product Information, Ramesh 2026-07-10): same AC pattern + same sync/async note verbatim. References section must use the LINX-8128 format (Reference Type/Value pairs), NOT old Pickup/PO/PO-Date layout (Ramesh 2026-06-23). Must render Instructions + Additional Information sub-sections (bug LINX-11811, Closed). Venkat 2026-05-14: order saving is asynchronous; order number only available in LINX if user provided it. Efrain Figma links: node-id=2678-11755 (2026-04-30), node-id=1910-18921 revised (2026-06-22). BE: LINX-9742 order-number auto-generation (Closed).

## 8. Long Order General Information sub-sections
- Additional Information (LINX-8126, Done): Customer Required Carrier — searchable single-select of ALL carriers, "<SCAC ID> - <Carrier Name>", alphabetical (special chars → numbers 1–9 → A–Z); manual entry allowed; if set, "planner must be intimated (through an alert mechanism), post order creation, to use the same carrier requested by the customer." Equipment Reference Number — alphanumeric+special incl. space, min 1 excl. space, no cap; error "Please enter atleast one character (excluding space)". STRUCK: old preferred-carrier view-only logic, Contact Name/Number (live under 8042 instead), Mode dropdown.
- Add Instructions (LINX-8127, Done): Instruction # auto-serial; Description free text ≤2000 chars, expand-on-click/collapse-outside textarea, vertical scroll only; trash per row. Instruction Type REMOVED from UI, kept in DB, defaults '0012' (Arlena/Lauren request via David Johns).
- References (LINX-8128, Done): Reference Type / Reference Value free-text pairs; PO Number + Pickup Number pre-seeded; "Add New Reference" unlimited; trash per row; only-1-of-each by definition but NO validation enforcing. STRUCK: detailed Pickup Number/PO Number/PO Date(+Time/TZ) fields (David Johns pushback 2026-04-08; Ramesh resolution 2026-04-14: "We'll just need 2 columns - 'Reference Type' & 'Reference Number'"). Wire mapping: userFieldList [{userfieldType: "Reference", name, value}] at Order and OrderLine level (Venkat question 2026-05-12, Dave Schultz confirmed).

## 9. Gaps with no spec anywhere (carry to Figma/Ramesh)
1. Shipping Class / Shipping Class ID dropdown option source system.
2. "Both Product ID and Shipping Class filled" error message.
3. Harmonized Code live format rule (struck, no replacement).
4. Dropdown sort-order conflict (frequency vs alphabetical, Quick vs Long tickets).
5. ≥1-product submission-gate error string.
6. STCC: struck from base grid (8121/8131) vs live for Rail (13893 Case 4) — unreconciled.

## 10. Gap table vs our React implementation (as of 2026-07-26)
| Area | Jira | Our code |
|---|---|---|
| Gen Info | +Hazardous order flag; dup-check errors; Inbound→COL default | Q20 dynamic freight default ✓, org-scoped Equipment ✓; no Hazardous, no dup check |
| Order # | 150-char limit + error | No length validation |
| Address rule | Consignor ≠ Consignee (red outline + message) | Not validated (canon documents it, schema.ts lacks it) |
| Dates | 00:00 default visible in field; calendar blocks invalid cross-picks | 00:00 applied silently at wire; cross-rules validate but don't block picks |
| Appointment flag | Two latest-date-gated checkboxes | Absent (only provisional wire-field names pickupAppointment/deliveryAppointment) |
| Product grid | Full field set incl. Hazmat/UN, NMFC, Harmonized, Handling Unit, Shipping Class+ID pair, equipment-conditional columns, row delete + edit confirms | Lean 5-field row (ID/Desc/Weight/Volume/ShipClass), no delete, inert expand/columns icons, no hazmat, US/Metric toggle present (Jira KILLED it) |
| ≥1 product gate | Required to submit | Not enforced |
| Special Services | Exclusion list, "Display on Order" filter, Manage modal | Typeahead + badge list ✓; no exclusions/filter, no Manage modal |
| Save gating | Order # + Owning Org, exact strings, top-left red message | Same gate ✓ (saveGateSchema + Alert) — message text differs |
| Draft reopen | — | getDraft live mode throws (mock-only stub, known S93 gap) |
| Confirmation | Dual sync/async message states; Payment Terms = Freight Term in header; References placeholder | ConfirmationView exists + ?confirm=async variant anticipates async ✓ — verify strings/details |

---

Provenance: researched 2026-07-26 via Atlassian MCP (Odyssey account), session S94; specs from customfield_10032 Acceptance Criteria; compiled by Claude; AI-generated — validate with Ramesh/Efrain before implementation.
